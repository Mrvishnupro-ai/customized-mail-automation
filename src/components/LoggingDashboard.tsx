import { useState, useEffect } from 'react';
import { logger, LogLevel, LogEntry } from '../lib/logger';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface LoggingDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoggingDashboard({ isOpen, onClose }: LoggingDashboardProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>(LogLevel.INFO);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  // Get all unique components from logs
  const components = Array.from(new Set(logs.map(log => log.component).filter(Boolean)));

  useEffect(() => {
    if (isOpen && autoRefresh) {
      const interval = setInterval(() => {
        setLogs(logger.getLogs());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, autoRefresh]);

  useEffect(() => {
    setLogs(logger.getLogs());
  }, [isOpen]);

  useEffect(() => {
    let filtered = logs.filter(log => log.level >= selectedLevel);

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.data || {}).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedComponent !== 'all') {
      filtered = filtered.filter(log => log.component === selectedComponent);
    }

    setFilteredLogs(filtered.reverse()); // Show newest first
  }, [logs, selectedLevel, searchTerm, selectedComponent]);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEntries(newExpanded);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'text-gray-500';
      case LogLevel.INFO: return 'text-blue-500';
      case LogLevel.WARN: return 'text-yellow-500';
      case LogLevel.ERROR: return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getLevelBg = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'bg-gray-100';
      case LogLevel.INFO: return 'bg-blue-100';
      case LogLevel.WARN: return 'bg-yellow-100';
      case LogLevel.ERROR: return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
    setFilteredLogs([]);
  };

  const exportLogs = () => {
    const logData = logger.exportLogs();
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const metrics = logger.getMetrics();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Logging Dashboard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Metrics */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalLogs}</div>
              <div className="text-sm text-blue-600">Total Logs</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{metrics.errorCount}</div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-2xl font-bold text-yellow-600">{metrics.warnCount}</div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{metrics.apiCalls}</div>
              <div className="text-sm text-green-600">API Calls</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(metrics.sessionDuration / 1000 / 60)}m
              </div>
              <div className="text-sm text-purple-600">Session</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(Number(e.target.value) as LogLevel)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value={LogLevel.DEBUG}>Debug & Above</option>
                <option value={LogLevel.INFO}>Info & Above</option>
                <option value={LogLevel.WARN}>Warnings & Errors</option>
                <option value={LogLevel.ERROR}>Errors Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Component</label>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Components</option>
                {components.map(component => (
                  <option key={component} value={component}>{component}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
              </label>
            </div>

            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Clear
            </button>

            <button
              onClick={exportLogs}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Export
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No logs match your current filters
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`border border-gray-200 rounded-lg ${getLevelBg(log.level)}`}
                >
                  <div
                    className="p-3 cursor-pointer hover:bg-opacity-80"
                    onClick={() => toggleExpanded(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <span className={`text-xs font-mono ${getLevelColor(log.level)}`}>
                          {LogLevel[log.level]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(log.timestamp)}
                        </span>
                        {log.component && (
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                            {log.component}
                          </span>
                        )}
                        {log.action && (
                          <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                            {log.action}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {log.message}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {log.requestId && (
                          <span className="text-xs text-gray-400 mr-2">
                            {log.requestId}
                          </span>
                        )}
                        {expandedEntries.has(index) ? (
                          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedEntries.has(index) && log.data && (
                    <div className="px-3 pb-3 border-t border-gray-200 bg-gray-50">
                      <pre className="text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}