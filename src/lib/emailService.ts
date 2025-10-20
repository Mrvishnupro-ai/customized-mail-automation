import { logger } from './logger';

interface EmailData {
  sender_gmail: string;
  app_password: string;
  gmail_name: string;
  to_email: string;
  subject: string;
  mainrow_html: string;
  variables: Record<string, any>;
}

interface ConcurrentSendOptions {
  concurrency?: number;
  onProgress?: (progress: { sent: number; failed: number; current: string; total: number }) => void;
  delay?: number;
}

interface SendResult {
  success: boolean;
  error?: string;
  email?: string;
  requestId?: string;
  duration?: number;
}

export class EmailService {
  private apiEndpoint = import.meta.env.DEV 
    ? "/api/send-email-html.php" // Use proxy in development
    : "https://sgcrguktsklm.org.in/phpmail-vishnu/public/api/send-email-html.php"; // Direct URL in production

  setApiEndpoint(endpoint: string) {
    this.apiEndpoint = endpoint;
  }

  getApiEndpoint() {
    return this.apiEndpoint;
  }

  async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string; requestId?: string; duration?: number }> {
    const requestId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // Log email send start
      logger.emailSendStart(emailData, requestId);
      logger.apiCall(this.apiEndpoint, 'POST', { 
        to: emailData.to_email, 
        subject: emailData.subject,
        sender: emailData.sender_gmail,
        hasVariables: Object.keys(emailData.variables).length > 0
      }, requestId);
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': requestId, // Add request ID to headers
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify(emailData),
      });

      const duration = Date.now() - startTime;
      logger.apiResponse(this.apiEndpoint, response.status, undefined, requestId, duration);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`HTTP ${response.status} error`, { 
          endpoint: this.apiEndpoint,
          responseText: errorText 
        }, { requestId });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.debug('API Response received', result, { requestId });
      
      // Check if the API returned success/error information
      if (result.status === 'error' || result.error) {
        const errorMsg = result.message || result.error || 'Email sending failed';
        logger.emailSendError(emailData, errorMsg, requestId);
        throw new Error(errorMsg);
      }

      logger.emailSendSuccess(emailData, result.messageId, requestId);
      logger.info(`Email sent successfully in ${duration}ms`, {
        to: emailData.to_email,
        messageId: result.messageId,
        duration
      }, { requestId });
      
      return { 
        success: true, 
        requestId,
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.emailSendError(emailData, error.message, requestId);
      logger.error('Email service error', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        duration,
        endpoint: this.apiEndpoint
      }, { requestId });
      
      // Handle specific fetch errors
      if (error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        const corsError = `Cannot connect to email API. This is likely a CORS issue. API endpoint: ${this.apiEndpoint}. Error: ${error.message}`;
        return { 
          success: false, 
          error: corsError,
          requestId,
          duration
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to send email',
        requestId,
        duration
      };
    }
  }

  async testConnection(senderEmail: string, appPassword: string, senderName: string): Promise<{ success: boolean; error?: string }> {
    // Test by sending a simple email to the sender themselves
    const testEmailData: EmailData = {
      sender_gmail: senderEmail,
      app_password: appPassword,
      gmail_name: senderName,
      to_email: senderEmail,
      subject: "Test Email Connection",
      mainrow_html: "<h1>Connection Test Successful</h1><p>Your email configuration is working correctly!</p>",
      variables: {}
    };

    return await this.sendEmail(testEmailData);
  }

  /**
   * Send multiple emails concurrently with configurable concurrency level
   * @param emailDataArray Array of email data to send
   * @param options Options for concurrent sending including concurrency level and progress callback
   * @returns Array of send results
   */
  async sendEmailsConcurrently(
    emailDataArray: EmailData[], 
    options: ConcurrentSendOptions = {}
  ): Promise<SendResult[]> {
    const { 
      concurrency = 3, 
      onProgress, 
      delay = 0 
    } = options;

    const results: SendResult[] = [];
    let completed = 0;
    let sent = 0;
    let failed = 0;

    // Process emails in batches with specified concurrency
    for (let i = 0; i < emailDataArray.length; i += concurrency) {
      const batch = emailDataArray.slice(i, i + concurrency);
      
      // Create promises for the current batch
      const batchPromises = batch.map(async (emailData, batchIndex) => {
        const currentIndex = i + batchIndex;
        
        // Update progress with current email being processed
        if (onProgress) {
          onProgress({
            sent,
            failed,
            current: emailData.to_email,
            total: emailDataArray.length
          });
        }

        try {
          // Add delay if specified (to prevent overwhelming the server)
          if (delay > 0 && currentIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const result = await this.sendEmail(emailData);
          return {
            ...result,
            email: emailData.to_email
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to send email',
            email: emailData.to_email
          };
        }
      });

      // Wait for the current batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            sent++;
          } else {
            failed++;
          }
        } else {
          // This should rarely happen since we handle errors in the promise
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error',
            email: 'unknown'
          });
          failed++;
        }
        completed++;
      });

      // Update progress after batch completion
      if (onProgress) {
        onProgress({
          sent,
          failed,
          current: completed < emailDataArray.length ? 'Processing next batch...' : 'Completed',
          total: emailDataArray.length
        });
      }
    }

    return results;
  }

  /**
   * Create batches of email data for processing
   * @param emailDataArray Array of email data
   * @param batchSize Size of each batch
   * @returns Array of batches
   */
  private createBatches<T>(emailDataArray: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < emailDataArray.length; i += batchSize) {
      batches.push(emailDataArray.slice(i, i + batchSize));
    }
    return batches;
  }
}

export const emailService = new EmailService();