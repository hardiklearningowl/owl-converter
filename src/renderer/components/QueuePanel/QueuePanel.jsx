import React  from 'react'
import { useQueueStore } from '../../stores/queueStore'
import DropZone from './DropZone'
import FileItem from './FileItem'

export default function QueuePanel() {
  const { jobs, removeJob } = useQueueStore()

  return (
    <div className="flex-[1.55] flex flex-col border-r border-slate-100 dark:border-slate-800 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
          <QueueIcon />
          Conversion Queue
        </span>
        {jobs.length > 0 && (
          <span className="bg-brand-blue/10 text-brand-blue text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {jobs.length} file{jobs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <DropZone />

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-4 pb-3 flex flex-col gap-1.5">
        {jobs.length === 0 && (
          <p className="text-xs text-slate-300 dark:text-slate-600 text-center mt-8">
            No files yet — add some SWF files above
          </p>
        )}
        {jobs.map(job => (
          <FileItem key={job.id} job={job} onRemove={removeJob} />
        ))}
      </div>
    </div>
  )
}

const QueueIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
  </svg>
)
