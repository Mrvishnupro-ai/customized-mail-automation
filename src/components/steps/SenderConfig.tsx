import { useState } from 'react';
import { Mail, Lock, User, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useStepContext } from '../../context/StepContext';
import { emailService } from '../../lib/emailService';
import ApiConfig from '../ApiConfig';

export default function SenderConfig() {
  const { campaignData, updateCampaignData } = useStepContext();
  const [senderEmail, setSenderEmail] = useState(campaignData.senderEmail);
  const [senderName, setSenderName] = useState(campaignData.senderName);
  const [appPassword, setAppPassword] = useState(campaignData.appPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState(emailService.getApiEndpoint());

  const handleSave = () => {
    updateCampaignData({ senderEmail, senderName, appPassword });
  };

  const handleApiEndpointChange = (newEndpoint: string) => {
    setApiEndpoint(newEndpoint);
    emailService.setApiEndpoint(newEndpoint);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleTestConnection = async () => {
    if (!senderEmail || !appPassword || !senderName) {
      setTestStatus('error');
      setTestMessage('Please fill in all fields');
      return;
    }

    if (!validateEmail(senderEmail)) {
      setTestStatus('error');
      setTestMessage('Invalid email format');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection by sending a test email...');

    try {
      const result = await emailService.testConnection(senderEmail, appPassword, senderName);
      
      if (result.success) {
        setTestStatus('success');
        setTestMessage('Connection successful! Test email sent to your address. Your Gmail credentials are valid.');
        handleSave();
      } else {
        setTestStatus('error');
        setTestMessage(result.error || 'Failed to send test email. Please check your credentials.');
      }
    } catch (error: any) {
      setTestStatus('error');
      if (error.message && error.message.includes('Cannot connect to email API')) {
        setTestMessage('Email API server is not accessible. Please ensure the email service is running at https://sgcrguktsklm.org.in/phpmail-vishnu/public/api/send-email-html.php or skip the test and proceed to send emails.');
      } else {
        setTestMessage(error.message || 'Connection failed. Please check your credentials and internet connection.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Step 3: Sender Configuration</h2>

        <div className="mb-6">
          <ApiConfig 
            currentEndpoint={apiEndpoint}
            onEndpointChange={handleApiEndpointChange}
          />
        </div>

        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="flex items-center gap-2 text-white font-medium mb-2">
              <User className="w-4 h-4 text-emerald-400" />
              Gmail Name (Display Name)
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              onBlur={handleSave}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-slate-400 text-sm mt-1">
              This name will appear as the sender in recipient inboxes
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-white font-medium mb-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              Sender Gmail
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              onBlur={handleSave}
              placeholder="your.email@gmail.com"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-slate-400 text-sm mt-1">
              Your Gmail address that will send the emails
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-white font-medium mb-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              App Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                onBlur={handleSave}
                placeholder="Enter your Gmail App Password"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Generate an App Password from your Google Account settings
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="w-full px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {testStatus === 'testing' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Test Connection (Optional)
                </>
              )}
            </button>
            
            <button
              onClick={handleSave}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Save Configuration
            </button>
            
            <p className="text-slate-400 text-xs text-center">
              Connection test requires the email API server to be running locally. You can skip the test and proceed with sending emails.
            </p>
          </div>

          {testStatus === 'success' && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-medium">Connection Successful</p>
                <p className="text-emerald-300 text-sm mt-1">{testMessage}</p>
              </div>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Connection Failed</p>
                <p className="text-red-300 text-sm mt-1">{testMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <h3 className="text-lg font-bold text-white mb-4">How to Generate Gmail App Password</h3>
        <div className="space-y-3 text-slate-300">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </span>
            <p>Go to your Google Account settings at myaccount.google.com</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </span>
            <p>Navigate to Security and enable 2-Step Verification</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              3
            </span>
            <p>Search for "App passwords" and create a new one for "Mail"</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              4
            </span>
            <p>Copy the 16-character password and paste it above</p>
          </div>
        </div>
      </div>
    </div>
  );
}
