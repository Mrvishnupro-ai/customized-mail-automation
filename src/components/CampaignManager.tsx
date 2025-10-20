import { useState } from 'react';
import { useStepContext } from '../context/StepContext';
import { logger } from '../lib/logger';

interface CampaignManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CampaignManager({ isOpen, onClose }: CampaignManagerProps) {
  const { campaignData, saveCampaign, loadCampaign, clearCampaign, getCampaignsList } = useStepContext();
  const [campaignName, setCampaignName] = useState(campaignData.subject || '');
  const [savedCampaigns, setSavedCampaigns] = useState(getCampaignsList());

  const handleSave = () => {
    if (campaignName.trim()) {
      // Update campaign data with the name
      saveCampaign();
      setSavedCampaigns(getCampaignsList());
      logger.info('Campaign saved from manager', { name: campaignName });
    }
  };

  const handleLoad = (campaignId: string) => {
    if (loadCampaign(campaignId)) {
      onClose();
      logger.info('Campaign loaded from manager', { campaignId });
    }
  };

  const handleDelete = (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        const campaigns = JSON.parse(localStorage.getItem('emailCampaign_savedCampaigns') || '{}');
        delete campaigns[campaignId];
        localStorage.setItem('emailCampaign_savedCampaigns', JSON.stringify(campaigns));
        setSavedCampaigns(getCampaignsList());
        logger.info('Campaign deleted', { campaignId });
      } catch (error) {
        logger.error('Failed to delete campaign', error);
      }
    }
  };

  const handleExport = (campaignId: string) => {
    try {
      const campaigns = JSON.parse(localStorage.getItem('emailCampaign_savedCampaigns') || '{}');
      const campaign = campaigns[campaignId];
      
      if (campaign) {
        const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign-${campaign.name || campaignId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logger.info('Campaign exported', { campaignId });
      }
    } catch (error) {
      logger.error('Failed to export campaign', error);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const campaignData = JSON.parse(e.target?.result as string);
        const campaignId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const campaigns = JSON.parse(localStorage.getItem('emailCampaign_savedCampaigns') || '{}');
        campaigns[campaignId] = {
          ...campaignData,
          campaignId,
          savedAt: new Date().toISOString(),
          name: campaignData.name || campaignData.subject || `Imported Campaign`,
        };
        
        localStorage.setItem('emailCampaign_savedCampaigns', JSON.stringify(campaigns));
        setSavedCampaigns(getCampaignsList());
        logger.info('Campaign imported', { campaignId, fileName: file.name });
      } catch (error) {
        logger.error('Failed to import campaign', error);
        alert('Failed to import campaign. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Campaign Manager</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Current Campaign */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Campaign</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-blue-900">
                    {campaignData.subject || 'Untitled Campaign'}
                  </h4>
                  <p className="text-sm text-blue-600">
                    {campaignData.csvData.length} contacts • {campaignData.columns.length} columns
                    {campaignData.lastSaved && (
                      <span className="ml-2">
                        • Last saved: {new Date(campaignData.lastSaved).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Save Campaign
                  </button>
                  <button
                    onClick={clearCampaign}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-900">Sender:</span>
                  <p className="text-blue-700">{campaignData.senderEmail || 'Not set'}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Email Column:</span>
                  <p className="text-blue-700">{campaignData.emailColumn || 'Not selected'}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Template:</span>
                  <p className="text-blue-700">
                    {campaignData.htmlTemplate.length > 50 
                      ? `${campaignData.htmlTemplate.substring(0, 50)}...`
                      : campaignData.htmlTemplate
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Auto-save:</span>
                  <p className="text-blue-700">{campaignData.autoSave ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Import/Export */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import/Export</h3>
            <div className="flex space-x-4">
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Import Campaign
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              
              {campaignData.campaignId && (
                <button
                  onClick={() => handleExport(campaignData.campaignId!)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Export Current
                </button>
              )}
            </div>
          </div>

          {/* Saved Campaigns */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Campaigns</h3>
            {savedCampaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No saved campaigns found. Save your current campaign to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {savedCampaigns.map((campaign: any) => (
                  <div
                    key={campaign.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                        <p className="text-sm text-gray-500">
                          Saved: {new Date(campaign.savedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleLoad(campaign.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleExport(campaign.id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}