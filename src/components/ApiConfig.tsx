import { useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';

interface ApiConfigProps {
  currentEndpoint: string;
  onEndpointChange: (endpoint: string) => void;
}

export default function ApiConfig({ currentEndpoint, onEndpointChange }: ApiConfigProps) {
  const [endpoint, setEndpoint] = useState(currentEndpoint);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onEndpointChange(endpoint);
    setIsEditing(false);
  };

  const handleReset = () => {
    setEndpoint("https://sgcrguktsklm.org.in/phpmail-vishnu/public/api/send-email-html.php");
  };

  if (!isEditing) {
    return (
      <div className="bg-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-blue-400" />
          <h4 className="text-white font-medium">Email API Configuration</h4>
          <button
            onClick={() => setIsEditing(true)}
            className="ml-auto text-blue-400 hover:text-blue-300 text-sm"
          >
            Edit
          </button>
        </div>
        <p className="text-slate-300 text-sm break-all">{currentEndpoint}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-blue-400" />
        <h4 className="text-white font-medium">Email API Configuration</h4>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-white text-sm font-medium mb-1 block">API Endpoint URL</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://sgcrguktsklm.org.in/phpmail-vishnu/public/api/send-email-html.php"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-slate-600 text-slate-300 text-sm rounded hover:bg-slate-500 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-2 bg-slate-600 text-slate-300 text-sm rounded hover:bg-slate-500 transition-colors"
          >
            Cancel
          </button>
        </div>
        
        <div className="flex items-start gap-2 text-amber-400 text-xs">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <p>Make sure your email API server is running and accessible at this URL</p>
        </div>
      </div>
    </div>
  );
}