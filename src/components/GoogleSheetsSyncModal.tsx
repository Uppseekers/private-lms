import React, { useState, useEffect } from 'react';
import { useDatabase } from '@/context/DatabaseContext';
import { 
  formatStudentsForSheet, 
  formatTasksForSheet, 
  formatEventsForSheet, 
  exportToCSV,
  SHEETS_STORAGE_KEY,
  AUTO_SYNC_STORAGE_KEY,
  LAST_SYNC_STORAGE_KEY 
} from '@/lib/googleSheetsSync';
import { FileSpreadsheet, RefreshCw, CheckCircle2, ExternalLink, Download, ShieldCheck, AlertCircle, Sparkles, X, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { students, staff, events } = useDatabase();
  
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => localStorage.getItem(SHEETS_STORAGE_KEY) || '');
  const [autoSync, setAutoSync] = useState<boolean>(() => localStorage.getItem(AUTO_SYNC_STORAGE_KEY) !== 'false');
  const [lastSync, setLastSync] = useState<string>(() => localStorage.getItem(LAST_SYNC_STORAGE_KEY) || '');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [sheetUrl, setSheetUrl] = useState<string>(() => spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : '');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (spreadsheetId) {
      localStorage.setItem(SHEETS_STORAGE_KEY, spreadsheetId);
      setSheetUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
    }
  }, [spreadsheetId]);

  useEffect(() => {
    localStorage.setItem(AUTO_SYNC_STORAGE_KEY, String(autoSync));
  }, [autoSync]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    setErrorMessage('');

    try {
      const response = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: spreadsheetId || undefined,
          students,
          staff,
          events
        })
      });

      const resData = await response.json();

      if (resData.success) {
        if (resData.spreadsheetId) {
          setSpreadsheetId(resData.spreadsheetId);
        }
        if (resData.spreadsheetUrl) {
          setSheetUrl(resData.spreadsheetUrl);
        }
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSync(now);
        localStorage.setItem(LAST_SYNC_STORAGE_KEY, now);
        setSyncSuccess(true);
      } else {
        setErrorMessage(resData.error || 'Failed to sync data to Google Sheets.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with Google Sheets server service.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = (type: 'students' | 'tasks' | 'events' | 'all') => {
    if (type === 'students' || type === 'all') {
      const rows = formatStudentsForSheet(students);
      exportToCSV('Uppseekers_Students_Database', rows);
    }
    if (type === 'tasks' || type === 'all') {
      const rows = formatTasksForSheet(students);
      exportToCSV('Uppseekers_Tasks_Database', rows);
    }
    if (type === 'events' || type === 'all') {
      const rows = formatEventsForSheet(events);
      exportToCSV('Uppseekers_Meetings_Database', rows);
    }
  };

  if (!isOpen) return null;

  const totalTasksCount = students.reduce((acc, s) => acc + (s.tasks || []).length, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                Google Sheets Live Sync & Backup
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Active
                </span>
              </h2>
              <p className="text-xs text-emerald-100/80">Real-time offsite data mirroring & instant CSV backup</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Quick Database Backup Recommendation Callout */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Do I need 2 databases for backup?
            </div>
            <p className="text-slate-600 leading-relaxed">
              Your primary database in <strong>Firebase Firestore</strong> already has enterprise multi-region replication and fault tolerance. However, keeping live copies in <strong>Google Sheets</strong> provides a real-time offsite backup and allows your staff to view/audit records in a familiar spreadsheet format.
            </p>
          </div>

          {/* Sync Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
              <span className="block text-lg font-bold text-emerald-900">{students.length}</span>
              <span className="text-[11px] font-medium text-emerald-700">Students</span>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
              <span className="block text-lg font-bold text-blue-900">{totalTasksCount}</span>
              <span className="text-[11px] font-medium text-blue-700">Tasks</span>
            </div>
            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-center">
              <span className="block text-lg font-bold text-purple-900">{events.length}</span>
              <span className="text-[11px] font-medium text-purple-700">Meetings</span>
            </div>
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
              <span className="block text-lg font-bold text-amber-900">{staff.length}</span>
              <span className="text-[11px] font-medium text-amber-700">Staff</span>
            </div>
          </div>

          {/* Input Spreadsheet ID or link */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Connected Google Sheet ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value.trim())}
                placeholder="Paste Spreadsheet ID (or leave blank to create new sheet)"
                className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs rounded-xl border border-slate-300 inline-flex items-center gap-1.5 transition-colors"
                >
                  Open Sheet
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Auto-Sync Toggle & Last Sync Banner */}
          <div className="flex items-center justify-between p-4 bg-emerald-50/40 border border-emerald-200/60 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Automatic Database Backup</p>
                <p className="text-[11px] text-slate-500">
                  {lastSync ? `Last synced at ${lastSync}` : 'Ready for first sync'}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {/* Success / Error Messages */}
          {syncSuccess && (
            <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Successfully synced all database collections to Google Sheets!
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* Instant CSV Offline Backup Options */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Instant Offline CSV Backup
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCSV('students')}
                className="text-xs rounded-lg"
              >
                Students CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCSV('tasks')}
                className="text-xs rounded-lg"
              >
                Tasks CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCSV('events')}
                className="text-xs rounded-lg"
              >
                Meetings CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCSV('all')}
                className="text-xs rounded-lg font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              >
                Download All Backup CSVs
              </Button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-slate-600"
          >
            Close
          </Button>

          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing Data...' : 'Sync to Google Sheets Now'}
          </Button>
        </div>

      </div>
    </div>
  );
};
