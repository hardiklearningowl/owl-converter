import React, { useEffect, useState } from 'react'
import { invoke }   from '../hooks/useIpc'
import { useQueueStore } from '../stores/queueStore'

export default function HistoryPanel({ onClose }) {
  const [records, setRecords] = useState([])
  const addFiles = useQueueStore(s => s.addFiles)

  useEffect(() => {
    invoke('history:get').then(setRecords)
  }, [])

  async function handleRemove(id) {
    await invoke('history:remove', id)
    setRecords(r => r.filter(rec => rec.id !== id))
  }

  async function handleClear() {
    await invoke('history:clear')
    setRecords([])
  }

  return (
    <div className="absolute inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="w-[600px] max-h-[70vh] bg-white dark:bg-[#0a1929] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Conversion History</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleClear}
              className="text-[11px] text-slate-400 hover:text-brand-orange cursor-pointer transition-colors">
              Clear all
            </button>
            <button onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer text-lg leading-none">
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {records.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-8">No conversions yet</p>
          )}
          {records.map(rec => (
            <div key={rec.id}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#0d2137] rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">MP4</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{rec.filename}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(rec.date).toLocaleDateString()} · {formatBytes(rec.outputSize)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => invoke('shell:openPath', rec.outPath)}
                  className="text-[10px] text-brand-blue hover:underline cursor-pointer">Open</button>
                <button onClick={() => { addFiles([rec.filePath]); onClose() }}
                  className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">Re-add</button>
                <button onClick={() => handleRemove(rec.id)}
                  className="text-[10px] text-slate-300 dark:text-slate-600 hover:text-brand-orange cursor-pointer">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
