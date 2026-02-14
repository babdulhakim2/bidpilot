'use client';

import { useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState, useEffect } from 'react';
import { 
  RefreshCw, Activity, CheckCircle2, XCircle, AlertTriangle, 
  Clock, Database, Loader2, Play, ChevronDown, ChevronRight
} from 'lucide-react';

type LogEntry = {
  _id: string;
  source: string;
  action: string;
  message: string;
  metadata?: {
    tenderId?: string;
    tenderTitle?: string;
    count?: number;
    added?: number;
    skipped?: number;
    error?: string;
    url?: string;
  };
  timestamp: number;
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  start: <Play className="w-4 h-4 text-blue-500" />,
  fetch: <RefreshCw className="w-4 h-4 text-blue-500" />,
  parse: <Database className="w-4 h-4 text-purple-500" />,
  insert: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  skip: <Clock className="w-4 h-4 text-gray-400" />,
  complete: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
};

const SOURCE_COLORS: Record<string, string> = {
  'scheduler': 'bg-gray-100 text-gray-700',
  'publicprocurement.ng': 'bg-blue-100 text-blue-700',
  'etenders.com.ng': 'bg-emerald-100 text-emerald-700',
  'nocopo.gov.ng': 'bg-purple-100 text-purple-700',
  'tendersnigeria.com': 'bg-amber-100 text-amber-700',
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function LogsPage() {
  const logs = useQuery(api.scraperLogs.getRecent, { limit: 200 });
  const stats = useQuery(api.scraperLogs.getStats);
  const runScrapers = useAction(api.scrapers.scheduler.runScraper);
  
  const [isRunning, setIsRunning] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set(['scheduler']));
  const [filterSource, setFilterSource] = useState<string | null>(null);

  const handleRunScrapers = async () => {
    setIsRunning(true);
    try {
      await runScrapers();
    } catch (e) {
      console.error('Failed to run scrapers:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleSource = (source: string) => {
    const next = new Set(expandedSources);
    if (next.has(source)) {
      next.delete(source);
    } else {
      next.add(source);
    }
    setExpandedSources(next);
  };

  // Group logs by source
  const groupedLogs = (logs || []).reduce((acc, log) => {
    if (!acc[log.source]) acc[log.source] = [];
    acc[log.source].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);

  const filteredLogs = filterSource 
    ? logs?.filter(l => l.source === filterSource) 
    : logs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Scraper Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time tender scraping activity</p>
        </div>
        <button
          onClick={handleRunScrapers}
          disabled={isRunning}
          className="px-4 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition flex items-center gap-2 disabled:opacity-50"
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Run All Scrapers
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(stats).map(([source, data]) => (
            <div 
              key={source} 
              className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-primary-300 transition"
              onClick={() => setFilterSource(filterSource === source ? null : source)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[source] || 'bg-gray-100 text-gray-700'}`}>
                  {source}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-600 font-medium">+{data.added}</span>
                <span className="text-gray-400">{data.skipped} skipped</span>
              </div>
              {data.errors > 0 && (
                <div className="text-red-500 text-xs mt-1">{data.errors} errors</div>
              )}
              {data.lastRun > 0 && (
                <div className="text-gray-400 text-xs mt-1">
                  Last: {formatTimeAgo(data.lastRun)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {filterSource && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtered by:</span>
          <span className={`px-2 py-1 rounded text-sm font-medium ${SOURCE_COLORS[filterSource] || 'bg-gray-100'}`}>
            {filterSource}
          </span>
          <button 
            onClick={() => setFilterSource(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs?.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[log.source] || 'bg-gray-100 text-gray-700'}`}>
                      {log.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {ACTION_ICONS[log.action] || <Activity className="w-4 h-4 text-gray-400" />}
                      <span className="text-sm text-gray-600 capitalize">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate">
                    {log.message}
                    {log.metadata?.added !== undefined && (
                      <span className="ml-2 text-emerald-600">+{log.metadata.added}</span>
                    )}
                    {log.metadata?.skipped !== undefined && log.metadata.skipped > 0 && (
                      <span className="ml-1 text-gray-400">({log.metadata.skipped} skipped)</span>
                    )}
                    {log.metadata?.error && (
                      <span className="ml-2 text-red-500 text-xs">{log.metadata.error}</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!filteredLogs || filteredLogs.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No logs yet. Run the scrapers to see activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <Activity className="w-4 h-4 animate-pulse" />
        Live updates enabled
      </div>
    </div>
  );
}
