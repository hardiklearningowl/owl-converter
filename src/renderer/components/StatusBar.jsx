import React from 'react'
import { useQueueStore } from '../stores/queueStore'

export default function StatusBar() {
  const jobs = useQueueStore(s => s.jobs)

  const active = jobs.find(j => j.status === 'converting')
  const done   = jobs.filter(j => j.status === 'done').length
  const total  = jobs.length

  return (
    <div className="flex items-center gap-3 px-4 h-7 bg-slate-50 dark:bg-[#071220] border-t border-slate-100 dark:border-brand-blue/10 flex-shrink-0 text-[10px]">

      {active ? (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse" />
          <span className="text-slate-500 dark:text-slate-400">
            Converting <strong className="text-brand-blue">{active.filePath.split(/[\\/]/).pop()}</strong> — {active.progress ?? 0}%
          </span>
        </>
      ) : (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="text-slate-400">{total === 0 ? 'Ready — add SWF files to begin' : 'Queue ready'}</span>
        </>
      )}

      {total > 0 && (
        <div className="ml-auto flex items-center gap-3">
          <span className="text-slate-400">{done} of {total} done</span>
          <div className="w-20 h-[3px] bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-blue to-brand-amber rounded transition-all"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
