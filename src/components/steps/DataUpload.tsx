import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet, Mail, Plus, Trash2, Edit3, Save, X, Download, Users } from 'lucide-react';
import { useStepContext } from '../../context/StepContext';

export default function DataUpload() {
  const { campaignData, updateCampaignData } = useStepContext();
  const [dragActive, setDragActive] = useState(false);
  const [columnInput, setColumnInput] = useState('');
  const [failedRows, setFailedRows] = useState<number[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [newRow, setNewRow] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    const failed: number[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length && values.some(v => v)) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      } else if (values.some(v => v)) {
        failed.push(i);
      }
    }

    return { headers, data, failed };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, data, failed } = parseCSV(text);
      
      // Auto-detect email column
      const emailColumns = headers.filter(header => 
        header.toLowerCase().includes('email') || 
        header.toLowerCase().includes('mail') ||
        header.toLowerCase() === 'college_mail'
      );
      
      const autoSelectedEmailColumn = emailColumns.length > 0 ? emailColumns[0] : '';
      
      updateCampaignData({ 
        csvData: data, 
        columns: headers,
        emailColumn: autoSelectedEmailColumn 
      });
      setFailedRows(failed);
    };
    reader.readAsText(file);
  };

  const handleManualColumns = () => {
    if (columnInput.trim()) {
      const columns = columnInput.split(',').map(c => c.trim()).filter(c => c);
      updateCampaignData({ columns });
      setColumnInput('');
    }
  };

  const handleAddRow = () => {
    if (campaignData.columns.length === 0) return;
    
    const emptyRow: Record<string, string> = {};
    campaignData.columns.forEach(col => {
      emptyRow[col] = '';
    });
    setNewRow(emptyRow);
    setShowAddForm(true);
  };

  const handleSaveNewRow = () => {
    if (Object.values(newRow).some(value => value.trim())) {
      const updatedData = [...campaignData.csvData, newRow];
      updateCampaignData({ csvData: updatedData });
      setNewRow({});
      setShowAddForm(false);
    }
  };

  const handleCancelAddRow = () => {
    setNewRow({});
    setShowAddForm(false);
  };

  const handleDeleteRow = (index: number) => {
    const updatedData = campaignData.csvData.filter((_, i) => i !== index);
    updateCampaignData({ csvData: updatedData });
  };

  const handleEditRow = (index: number) => {
    setEditingRow(index);
    setEditingValues({ ...campaignData.csvData[index] });
  };

  const handleSaveEdit = () => {
    if (editingRow !== null) {
      const updatedData = [...campaignData.csvData];
      updatedData[editingRow] = editingValues;
      updateCampaignData({ csvData: updatedData });
      setEditingRow(null);
      setEditingValues({});
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditingValues({});
  };

  const exportToCSV = () => {
    if (campaignData.csvData.length === 0) return;
    
    const headers = campaignData.columns.join(',');
    const rows = campaignData.csvData.map(row => 
      campaignData.columns.map(col => `"${row[col] || ''}"`).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'email_data.csv';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header Section with Stats */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-700 rounded-xl shadow-2xl border border-slate-600 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-lg">
              <Upload className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Data Upload & Management</h2>
              <p className="text-slate-300">Import your contact list and manage your email data</p>
            </div>
          </div>
          {campaignData.csvData.length > 0 && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{campaignData.csvData.length}</div>
                <div className="text-sm text-slate-400">Total Records</div>
              </div>
              {campaignData.emailColumn && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {campaignData.csvData.filter(row => row[campaignData.emailColumn]?.trim()).length}
                  </div>
                  <div className="text-sm text-slate-400">Valid Emails</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive
              ? 'border-emerald-400 bg-emerald-500/10 scale-105'
              : 'border-slate-500 hover:border-emerald-400/50 hover:bg-emerald-500/5'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="max-w-lg mx-auto">
            <Upload className="w-20 h-20 text-slate-400 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">Drop your CSV/Excel file here</h3>
            <p className="text-slate-400 mb-6">Support for .csv, .xlsx, and .xls files up to 10MB</p>
            <label className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-emerald-500/25">
              <FileSpreadsheet className="w-5 h-5" />
              Browse Files
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Manual Column Setup */}
        <div className="mt-8 p-6 bg-slate-700/50 rounded-lg border border-slate-600">
          <label className="block text-white font-semibold mb-3 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            Manual Column Setup
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={columnInput}
              onChange={(e) => setColumnInput(e.target.value)}
              placeholder="e.g., name, email, company, position"
              className="flex-1 px-4 py-3 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            <button
              onClick={handleManualColumns}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-all duration-200 font-medium"
            >
              Set Columns
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-2">Separate column names with commas</p>
        </div>

        {/* Status Messages */}
        {failedRows.length > 0 && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold mb-1">Data Import Issues Detected</p>
              <p className="text-red-300 text-sm">
                {failedRows.length} row(s) had formatting issues on lines: {failedRows.slice(0, 5).join(', ')}
                {failedRows.length > 5 && ` and ${failedRows.length - 5} more...`}
              </p>
            </div>
          </div>
        )}

        {campaignData.csvData.length > 0 && (
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-emerald-400 font-semibold">Data Successfully Loaded</p>
                <p className="text-emerald-300 text-sm">
                  {campaignData.csvData.length} records imported and ready for processing
                </p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Data Configuration and Preview */}
      {campaignData.columns.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-slate-600 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Data Management</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-5 h-5" />
                <span>{campaignData.csvData.length} Records</span>
              </div>
              {campaignData.columns.length > 0 && (
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-200 font-medium shadow-lg hover:shadow-emerald-500/25"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
              )}
            </div>
          </div>

          {/* Email Column Selector */}
          <div className="mb-8 p-6 bg-slate-700/30 rounded-lg border border-slate-600/50">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-emerald-400" />
              <label className="text-white font-semibold text-lg">Email Column Configuration</label>
            </div>
            <select
              value={campaignData.emailColumn}
              onChange={(e) => updateCampaignData({ emailColumn: e.target.value })}
              className="w-full px-4 py-3 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            >
              <option value="">-- Select which column contains email addresses --</option>
              {campaignData.columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
            {campaignData.emailColumn && (
              <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">
                  Using "{campaignData.emailColumn}" for email addresses
                </span>
              </div>
            )}
          </div>

          {/* Data Table */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-600 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600">
                    <th className="px-4 py-4 text-left text-slate-300 font-medium w-20">Actions</th>
                    {campaignData.columns.map((col, index) => (
                      <th key={index} className="px-4 py-4 text-left text-emerald-400 font-semibold">
                        {col}
                        {col === campaignData.emailColumn && (
                          <Mail className="w-4 h-4 inline ml-2 text-emerald-300" />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Add Row Form */}
                  {showAddForm && (
                    <tr className="bg-emerald-500/5 border-b border-emerald-500/20">
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveNewRow}
                            className="p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelAddRow}
                            className="p-2 bg-slate-500 text-white rounded hover:bg-slate-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      {campaignData.columns.map((col, colIndex) => (
                        <td key={colIndex} className="px-4 py-3">
                          <input
                            type="text"
                            value={newRow[col] || ''}
                            onChange={(e) => setNewRow(prev => ({ ...prev, [col]: e.target.value }))}
                            placeholder={`Enter ${col}`}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Data Rows */}
                  {campaignData.csvData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        {editingRow === rowIndex ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="p-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 bg-slate-500 text-white rounded hover:bg-slate-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditRow(rowIndex)}
                              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(rowIndex)}
                              className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      {campaignData.columns.map((col, colIndex) => (
                        <td key={colIndex} className="px-4 py-3">
                          {editingRow === rowIndex ? (
                            <input
                              type="text"
                              value={editingValues[col] || ''}
                              onChange={(e) => setEditingValues(prev => ({ ...prev, [col]: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          ) : (
                            <span className={`${row[col] ? 'text-slate-200' : 'text-slate-500'}`}>
                              {row[col] || '—'}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {campaignData.csvData.length === 0 && campaignData.columns.length > 0 && (
              <div className="p-12 text-center text-slate-400">
                <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No data rows yet</p>
                <p className="text-sm mt-2">Click "Add Row" to start adding your email contacts</p>
              </div>
            )}
          </div>

          {campaignData.csvData.length > 0 && (
            <div className="mt-6 flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
              <p className="text-slate-300">
                Showing all {campaignData.csvData.length} records
              </p>
              <div className="flex gap-3">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
