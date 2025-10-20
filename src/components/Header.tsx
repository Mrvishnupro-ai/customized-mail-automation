import { useState } from 'react';
import { Mail, Zap, Shield, Settings, FileText, Activity } from 'lucide-react';
import LoggingDashboard from './LoggingDashboard';
import CampaignManager from './CampaignManager';
import { useStepContext } from '../context/StepContext';
import { logger } from '../lib/logger';

export default function Header() {
  const [showLoggingDashboard, setShowLoggingDashboard] = useState(false);
  const [showCampaignManager, setShowCampaignManager] = useState(false);
  const { campaignData } = useStepContext();

  return (
    <>
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-600 shadow-2xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <Mail className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="absolute -top-1 -right-1 p-1 bg-emerald-500 rounded-full">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  Email Campaign Manager
                </h1>
                <p className="text-emerald-300 font-medium text-lg mt-1">
                  Professional Bulk Email Marketing Platform
                </p>
                {campaignData.lastSaved && (
                  <p className="text-xs text-slate-400 mt-1">
                    Last saved: {new Date(campaignData.lastSaved).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Campaign Management */}
              <button
                onClick={() => setShowCampaignManager(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-600 hover:bg-slate-700/50 transition-colors group"
                title="Manage Campaigns"
              >
                <FileText className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                <span className="text-slate-300 font-medium hidden lg:inline">Campaigns</span>
                {campaignData.csvData.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {campaignData.csvData.length}
                  </span>
                )}
              </button>

              {/* Logging Dashboard */}
              <button
                onClick={() => setShowLoggingDashboard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-600 hover:bg-slate-700/50 transition-colors group"
                title="View Logs & Analytics"
              >
                <Activity className="w-5 h-5 text-green-400 group-hover:text-green-300" />
                <span className="text-slate-300 font-medium hidden lg:inline">Logs</span>
              </button>

              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-600">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-slate-300 font-medium">Secure & Reliable</span>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-slate-400">Version</div>
                <div className="text-emerald-400 font-semibold">2.1.0</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <LoggingDashboard 
        isOpen={showLoggingDashboard} 
        onClose={() => setShowLoggingDashboard(false)} 
      />
      
      <CampaignManager 
        isOpen={showCampaignManager} 
        onClose={() => setShowCampaignManager(false)} 
      />
    </>
  );
}
