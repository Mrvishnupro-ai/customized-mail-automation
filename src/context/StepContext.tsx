import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { logger } from '../lib/logger';

interface CampaignData {
  csvData: any[];
  columns: string[];
  emailColumn: string;
  senderEmail: string;
  senderName: string;
  appPassword: string;
  subject: string;
  htmlTemplate: string;
  campaignId?: string;
  lastSaved?: string;
  autoSave?: boolean;
}

interface StepContextType {
  campaignData: CampaignData;
  updateCampaignData: (data: Partial<CampaignData>) => void;
  saveCampaign: () => void;
  loadCampaign: (campaignId: string) => boolean;
  clearCampaign: () => void;
  getCampaignsList: () => string[];
}

const StepContext = createContext<StepContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CAMPAIGN_DATA: 'emailCampaign_currentData',
  CAMPAIGNS_LIST: 'emailCampaign_savedCampaigns',
};

const defaultCampaignData: CampaignData = {
  csvData: [],
  columns: [],
  emailColumn: '',
  senderEmail: '',
  senderName: '',
  appPassword: '',
  subject: '',
  htmlTemplate: '<h1>Hello {{name}}</h1>\n<p>This is your personalized email.</p>',
  autoSave: true,
};

export function StepProvider({ children }: { children: ReactNode }) {
  const [campaignData, setCampaignData] = useState<CampaignData>(defaultCampaignData);

  // Load saved data on mount
  useEffect(() => {
    loadFromStorage();
    logger.info('StepProvider initialized', { sessionId: logger.getSessionId() });
  }, []);

  // Auto-save when data changes (debounced)
  useEffect(() => {
    if (campaignData.autoSave) {
      const timeoutId = setTimeout(() => {
        saveToStorage();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [campaignData]);

  const loadFromStorage = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEYS.CAMPAIGN_DATA);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setCampaignData({ ...defaultCampaignData, ...parsedData });
        logger.info('Campaign data loaded from storage', { 
          hasData: Object.keys(parsedData).length > 0,
          lastSaved: parsedData.lastSaved 
        });
      }
    } catch (error) {
      logger.error('Failed to load campaign data from storage', error);
    }
  };

  const saveToStorage = () => {
    try {
      const dataToSave = {
        ...campaignData,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.CAMPAIGN_DATA, JSON.stringify(dataToSave));
      logger.debug('Campaign data auto-saved to storage');
    } catch (error) {
      logger.error('Failed to save campaign data to storage', error);
    }
  };

  const updateCampaignData = (data: Partial<CampaignData>) => {
    setCampaignData(prev => ({ 
      ...prev, 
      ...data,
      lastSaved: new Date().toISOString()
    }));
    logger.debug('Campaign data updated', { updatedFields: Object.keys(data) });
  };

  const saveCampaign = () => {
    try {
      if (!campaignData.campaignId) {
        campaignData.campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Get existing campaigns
      const existingCampaigns = getCampaignsList();
      const campaigns = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAMPAIGNS_LIST) || '{}');
      
      // Save current campaign
      campaigns[campaignData.campaignId] = {
        ...campaignData,
        savedAt: new Date().toISOString(),
        name: campaignData.subject || `Campaign ${campaignData.campaignId}`,
      };
      
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS_LIST, JSON.stringify(campaigns));
      
      // Update current campaign data
      setCampaignData(prev => ({ 
        ...prev, 
        lastSaved: new Date().toISOString() 
      }));
      
      logger.info('Campaign saved successfully', { 
        campaignId: campaignData.campaignId,
        name: campaignData.subject 
      });
      
    } catch (error) {
      logger.error('Failed to save campaign', error);
    }
  };

  const loadCampaign = (campaignId: string): boolean => {
    try {
      const campaigns = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAMPAIGNS_LIST) || '{}');
      const campaign = campaigns[campaignId];
      
      if (campaign) {
        setCampaignData({ ...defaultCampaignData, ...campaign });
        logger.info('Campaign loaded successfully', { 
          campaignId,
          name: campaign.name 
        });
        return true;
      } else {
        logger.warn('Campaign not found', { campaignId });
        return false;
      }
    } catch (error) {
      logger.error('Failed to load campaign', error);
      return false;
    }
  };

  const clearCampaign = () => {
    setCampaignData(defaultCampaignData);
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGN_DATA);
    logger.info('Campaign data cleared');
  };

  const getCampaignsList = (): string[] => {
    try {
      const campaigns = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAMPAIGNS_LIST) || '{}');
      return Object.keys(campaigns).map(id => ({
        id,
        name: campaigns[id].name || campaigns[id].subject || `Campaign ${id}`,
        savedAt: campaigns[id].savedAt,
      }));
    } catch (error) {
      logger.error('Failed to get campaigns list', error);
      return [];
    }
  };

  return (
    <StepContext.Provider value={{ 
      campaignData, 
      updateCampaignData,
      saveCampaign,
      loadCampaign,
      clearCampaign,
      getCampaignsList
    }}>
      {children}
    </StepContext.Provider>
  );
}

export function useStepContext() {
  const context = useContext(StepContext);
  if (!context) {
    throw new Error('useStepContext must be used within StepProvider');
  }
  return context;
}
