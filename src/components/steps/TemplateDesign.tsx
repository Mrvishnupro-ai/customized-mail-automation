import { useState, useEffect } from 'react';
import { Code, Eye, Variable } from 'lucide-react';
import { useStepContext } from '../../context/StepContext';

export default function TemplateDesign() {
  const { campaignData, updateCampaignData } = useStepContext();
  const [htmlCode, setHtmlCode] = useState(campaignData.htmlTemplate);
  const [subject, setSubject] = useState(campaignData.subject);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    const sampleData: any = {};
    campaignData.columns.forEach(col => {
      sampleData[col] = `Sample ${col}`;
    });

    let rendered = htmlCode;
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, sampleData[key]);
    });

    setPreviewHtml(rendered);
  }, [htmlCode, campaignData.columns]);

  const handleSave = () => {
    updateCampaignData({ htmlTemplate: htmlCode, subject });
  };

  useEffect(() => {
    const timer = setTimeout(handleSave, 500);
    return () => clearTimeout(timer);
  }, [htmlCode, subject]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Step 2: Email Template Design</h2>

        <div className="mb-6">
          <label className="block text-white font-medium mb-2">Email Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject line..."
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {campaignData.columns.length > 0 && (
          <div className="mb-6 p-4 bg-slate-700 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Variable className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-medium">Available Variables</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {campaignData.columns.map((col, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const variable = `{{${col}}}`;
                    setHtmlCode(prev => prev + variable);
                  }}
                  className="px-3 py-1 bg-slate-600 text-emerald-400 rounded text-sm hover:bg-slate-500 transition-colors font-mono"
                >
                  {`{{${col}}}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-medium">HTML CODE EDITOR</h3>
            </div>
            <textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              className="w-full h-[500px] px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-emerald-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Enter your HTML template here..."
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-medium">HTML CODE PREVIEW</h3>
            </div>
            <div className="w-full h-[500px] px-4 py-3 bg-white border border-slate-600 rounded-lg overflow-auto">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
          <p className="text-blue-400 text-sm">
            Use <code className="px-2 py-1 bg-slate-900 rounded text-emerald-400 font-mono">
              {`{{variable_name}}`}
            </code> syntax to insert dynamic content from your CSV data.
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Quick HTML Templates</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setHtmlCode(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hello {{name}}</h1>
    </div>
    <div class="content">
      <p>This is your personalized email content.</p>
    </div>
  </div>
</body>
</html>`)}
            className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            Professional
          </button>
          <button
            onClick={() => setHtmlCode(`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #059669;">Hi {{name}},</h2>
  <p>Thank you for your interest in our services.</p>
  <p>Best regards,<br>The Team</p>
</div>`)}
            className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            Simple
          </button>
          <button
            onClick={() => setHtmlCode(`<h1>Hello {{name}}</h1>
<p>This is your personalized email.</p>
<p>Email: {{email}}</p>`)}
            className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            Basic
          </button>
        </div>
      </div>
    </div>
  );
}
