import { useState, useEffect } from 'react';
import { Send, Download, CheckCircle, XCircle, Clock, AlertCircle, FileText, Zap, Settings } from 'lucide-react';
import { useStepContext } from '../../context/StepContext';
import { supabase } from '../../lib/supabase';
import { emailService } from '../../lib/emailService';

interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  current: string;
}

export default function SendConfig() {
  const { campaignData } = useStepContext();
  const [isSending, setIsSending] = useState(false);
  const [useConcurrent, setUseConcurrent] = useState(false);
  const [concurrencyLevel, setConcurrencyLevel] = useState(3);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(500);
  const [progress, setProgress] = useState<SendProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    current: '',
  });
  const [failedRecipients, setFailedRecipients] = useState<Array<{ email: string; error: string }>>([]);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    setProgress({
      total: campaignData.csvData.length,
      sent: 0,
      failed: 0,
      current: '',
    });
  }, [campaignData.csvData]);

  const createCampaign = async () => {
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        sender_email: campaignData.senderEmail,
        sender_name: campaignData.senderName,
        subject: campaignData.subject,
        html_template: campaignData.htmlTemplate,
        total_recipients: campaignData.csvData.length,
        status: 'sending',
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data.id;
  };

  const addRecipients = async (cid: string) => {
    if (!campaignData.emailColumn) {
      throw new Error('Please select an email column in the data upload step');
    }

    const recipients = campaignData.csvData.map(row => ({
      campaign_id: cid,
      email: row[campaignData.emailColumn] || '',
      variables: row,
    }));

    const { error } = await supabase.from('email_recipients').insert(recipients);
    if (error) throw error;
  };

  const sendEmail = async (recipient: any, cid: string) => {
    try {
      let renderedHtml = campaignData.htmlTemplate;
      Object.keys(recipient.variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        renderedHtml = renderedHtml.replace(regex, recipient.variables[key] || '');
      });

      // Use the new email service API
      const result = await emailService.sendEmail({
        sender_gmail: campaignData.senderEmail,
        app_password: campaignData.appPassword,
        gmail_name: campaignData.senderName,
        to_email: recipient.email,
        subject: campaignData.subject,
        mainrow_html: renderedHtml,
        variables: recipient.variables,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      await supabase
        .from('email_recipients')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', recipient.id);

      await supabase.from('email_logs').insert({
        campaign_id: cid,
        recipient_id: recipient.id,
        status: 'success',
        message: 'Email sent successfully',
      });

      return { success: true };
    } catch (error: any) {
      await supabase
        .from('email_recipients')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', recipient.id);

      await supabase.from('email_logs').insert({
        campaign_id: cid,
        recipient_id: recipient.id,
        status: 'error',
        message: error.message,
      });

      return { success: false, error: error.message };
    }
  };

  const handleSendEmails = async () => {
    if (!campaignData.senderEmail || !campaignData.appPassword) {
      alert('Please configure sender settings first');
      return;
    }

    if (campaignData.csvData.length === 0) {
      alert('Please upload recipient data first');
      return;
    }

    if (!campaignData.emailColumn) {
      alert('Please select which column contains email addresses in the data upload step');
      return;
    }

    setIsSending(true);
    setFailedRecipients([]);

    try {
      const cid = await createCampaign();
      setCampaignId(cid);
      await addRecipients(cid);

      const { data: recipients } = await supabase
        .from('email_recipients')
        .select('*')
        .eq('campaign_id', cid);

      if (!recipients || recipients.length === 0) {
        throw new Error('No recipients found');
      }

      const failed: Array<{ email: string; error: string }> = [];

      if (useConcurrent) {
        // Use concurrent sending
        const emailDataArray = recipients.map(recipient => {
          let renderedHtml = campaignData.htmlTemplate;
          Object.keys(recipient.variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            renderedHtml = renderedHtml.replace(regex, recipient.variables[key] || '');
          });

          return {
            sender_gmail: campaignData.senderEmail,
            app_password: campaignData.appPassword,
            gmail_name: campaignData.senderName,
            to_email: recipient.email,
            subject: campaignData.subject,
            mainrow_html: renderedHtml,
            variables: recipient.variables,
          };
        });

        const results = await emailService.sendEmailsConcurrently(emailDataArray, {
          concurrency: concurrencyLevel,
          delay: delayBetweenBatches,
          onProgress: (progressData) => {
            setProgress(progressData);
          }
        });

        // Process results and update database
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const recipient = recipients[i];

          if (result.success) {
            await supabase
              .from('email_recipients')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', recipient.id);

            await supabase.from('email_logs').insert({
              campaign_id: cid,
              recipient_id: recipient.id,
              status: 'success',
              message: 'Email sent successfully',
            });
          } else {
            failed.push({ email: result.email || recipient.email, error: result.error || 'Unknown error' });

            await supabase
              .from('email_recipients')
              .update({ status: 'failed', error_message: result.error })
              .eq('id', recipient.id);

            await supabase.from('email_logs').insert({
              campaign_id: cid,
              recipient_id: recipient.id,
              status: 'error',
              message: result.error || 'Failed to send email',
            });
          }
        }
      } else {
        // Use sequential sending (original method)
        let sentCount = 0;
        let failedCount = 0;

        for (const recipient of recipients) {
          setProgress(prev => ({
            ...prev,
            current: recipient.email,
          }));

          const result = await sendEmail(recipient, cid);

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
            failed.push({ email: recipient.email, error: result.error || 'Unknown error' });
          }

          setProgress(prev => ({
            ...prev,
            sent: sentCount,
            failed: failedCount,
          }));

          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setFailedRecipients(failed);

      const finalProgress = progress;
      await supabase
        .from('email_campaigns')
        .update({
          status: finalProgress.failed === 0 ? 'completed' : 'failed',
          sent_count: finalProgress.sent,
          failed_count: finalProgress.failed,
        })
        .eq('id', cid);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const downloadLogFile = async () => {
    if (!campaignId) return;

    const { data: logs } = await supabase
      .from('email_logs')
      .select('*, email_recipients(email)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    const csvContent = [
      ['Email', 'Status', 'Message', 'Timestamp'].join(','),
      ...(logs || []).map(log =>
        [
          log.email_recipients?.email || '',
          log.status,
          log.message || '',
          new Date(log.created_at).toLocaleString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-log-${campaignId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const percentage = progress.total > 0 ? Math.round((progress.sent + progress.failed) / progress.total * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Step 4: Review & Send</h2>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-medium">Recipients</h3>
            </div>
            <p className="text-3xl font-bold text-white">{campaignData.csvData.length}</p>
          </div>

          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-medium">Sender</h3>
            </div>
            <p className="text-sm text-slate-300 truncate">{campaignData.senderEmail || 'Not configured'}</p>
          </div>

          <div className="bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-white font-medium">Status</h3>
            </div>
            <p className="text-sm text-slate-300">
              {isSending ? 'Sending...' : 'Ready'}
            </p>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Campaign Configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="text-slate-400 w-32">Subject:</span>
              <span className="text-white">{campaignData.subject || 'No subject'}</span>
            </div>
            <div className="flex">
              <span className="text-slate-400 w-32">From:</span>
              <span className="text-white">
                {campaignData.senderName} &lt;{campaignData.senderEmail}&gt;
              </span>
            </div>
            <div className="flex">
              <span className="text-slate-400 w-32">Email Column:</span>
              <span className={campaignData.emailColumn ? "text-white" : "text-red-400"}>
                {campaignData.emailColumn || 'Not selected'}
              </span>
            </div>
          </div>
        </div>

        {/* Sending Mode Selection */}
        {!isSending && progress.sent === 0 && (
          <div className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-medium">Sending Configuration</h3>
              </div>
              
              <div className="space-y-4">
                {/* Sequential vs Concurrent Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Concurrent Sending
                    </label>
                    <p className="text-sm text-slate-300 mt-1">
                      Send multiple emails simultaneously for faster processing
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useConcurrent}
                      onChange={(e) => setUseConcurrent(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Concurrent Settings */}
                {useConcurrent && (
                  <div className="border-l-2 border-amber-400 pl-4 space-y-4">
                    <div>
                      <label className="block text-white font-medium mb-2">
                        Concurrency Level: {concurrencyLevel}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={concurrencyLevel}
                        onChange={(e) => setConcurrencyLevel(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>1 (Sequential)</span>
                        <span>5 (Balanced)</span>
                        <span>10 (Fast)</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Higher values = faster sending, but may overwhelm your server
                      </p>
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">
                        Delay Between Batches: {delayBetweenBatches}ms
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="100"
                        value={delayBetweenBatches}
                        onChange={(e) => setDelayBetweenBatches(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>0ms (No delay)</span>
                        <span>1000ms (1 sec)</span>
                        <span>2000ms (2 sec)</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Add delay to prevent SMTP server rate limiting
                      </p>
                    </div>
                  </div>
                )}

                {/* Performance Estimate */}
                <div className="bg-slate-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">Estimated Time</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {useConcurrent ? (
                      <>
                        Concurrent: ~{Math.ceil((campaignData.csvData.length / concurrencyLevel) * 5)} seconds
                        <br />
                        <span className="text-xs text-slate-400">
                          ({concurrencyLevel} emails per batch, ~5s per email including SMTP time)
                        </span>
                      </>
                    ) : (
                      <>
                        Sequential: ~{campaignData.csvData.length * 6} seconds
                        <br />
                        <span className="text-xs text-slate-400">
                          (1 email at a time, ~6s per email including 1s delay)
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSendEmails}
              disabled={campaignData.csvData.length === 0 || !campaignData.emailColumn}
              className="w-full px-6 py-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg flex items-center justify-center gap-3"
            >
              {useConcurrent ? <Zap className="w-6 h-6" /> : <Send className="w-6 h-6" />}
              {useConcurrent 
                ? `Start Concurrent Sending (${concurrencyLevel} at a time)`
                : 'Start Sequential Sending (One by One)'
              }
            </button>
          </div>
        )}

        {isSending && (
          <div className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center text-sm text-slate-300 mb-2">
                <div className="flex items-center gap-2">
                  <span>Sending Progress</span>
                  {useConcurrent && (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {concurrencyLevel}x Concurrent
                    </span>
                  )}
                </div>
                <span>{percentage}%</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${useConcurrent ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="mt-3 text-sm text-slate-300">
                <p>
                  {useConcurrent ? 'Processing batch - Current: ' : 'Currently sending to: '}
                  <span className="text-white font-mono">{progress.current}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3">
                <p className="text-blue-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{progress.total}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500 rounded-lg p-3">
                <p className="text-emerald-400 text-sm">Sent</p>
                <p className="text-2xl font-bold text-white">{progress.sent}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm">Failed</p>
                <p className="text-2xl font-bold text-white">{progress.failed}</p>
              </div>
            </div>
          </div>
        )}

        {!isSending && progress.sent > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-medium">Campaign Completed</p>
                <p className="text-emerald-300 text-sm mt-1">
                  Successfully sent {progress.sent} emails. {progress.failed} failed.
                </p>
              </div>
            </div>

            <button
              onClick={downloadLogFile}
              className="w-full px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Log File
            </button>
          </div>
        )}
      </div>

      {failedRecipients.length > 0 && (
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-bold text-white">Failed Recipients</h3>
          </div>

          <div className="space-y-2">
            {failedRecipients.map((recipient, index) => (
              <div key={index} className="bg-slate-700 rounded-lg p-3 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-mono text-sm">{recipient.email}</p>
                  <p className="text-red-300 text-sm mt-1">{recipient.error}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
