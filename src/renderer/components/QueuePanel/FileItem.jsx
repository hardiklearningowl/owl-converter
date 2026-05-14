import React from 'react'
import path from 'path-browserify'

const STATUS_COLORS = {
  done:       'border-green-500',
  converting: 'border-brand-blue',
  queued:     'border-slate-200 dark:border-slate-700',
  error:      'border-brand-orange',
}

const STATUS_ICON_COLOR = {
  done:       'text-green-500',
  converting: 'text-brand-blue',
  queued:     'text-slate-300 dark:text-slate-600',
  error:      'text-brand-orange',
}

export default function FileItem({ job, onRemove }) {
  const name    = job.filePath.split(/[\\/]/).pop()
  const status  = job.status

  return (
    <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-[3px] border border-r-slate-200/50 dark:border-r-slate-700/50 border-t-slate-200/50 dark:border-t-slate-700/50 border-b-slate-200/50 dark:border-b-slate-700/50 ${STATUS_COLORS[status]} bg-white dark:bg-[#0d2137] overflow-hidden transition-all`}>

      {/* Progress fill for active job */}
      {status === 'converting' && (
        <div className="absolute inset-0 bg-brand-blue/5 dark:bg-brand-blue/8 pointer-events-none"
          style={{ width: `${job.progress ?? 0}%` }} />
      )}

      {/* File type badge */}
      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
        status === 'done'       ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
        status === 'converting' ? 'bg-brand-blue/10 text-brand-blue' :
        status === 'error'      ? 'bg-red-100 dark:bg-red-900/30 text-brand-orange' :
        'bg-slate-100 dark:bg-slate-800 text-slate-400'
      }`}>SWF</div>

      {/* File info */}
      <div className="flex-1 min-w-0 z-10">
        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{name}</div>
        <div className={`text-[10px] mt-0.5 ${status === 'converting' ? 'text-brand-blue' : 'text-slate-400'}`}>
          {status === 'done'       && 'Converted successfully'}
          {status === 'converting' && `Converting… ${job.progress ?? 0}%`}
          {status === 'queued'     && 'Waiting in queue'}
          {status === 'error'      && (job.error ?? 'Conversion failed')}
        </div>
      </div>

      {/* Status indicator */}
      <div className={`flex-shrink-0 z-10 ${STATUS_ICON_COLOR[status]}`}>
        {status === 'done'       && <CheckIcon />}
        {status === 'converting' && <ProgressRing progress={job.progress ?? 0} />}
        {status === 'queued'     && <ClockIcon />}
        {status === 'error'      && <RetryIcon onClick={() => {}} />}
      </div>

      {/* Remove button */}
      {status !== 'converting' && (
        <button onClick={() => onRemove(job.id)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-brand-orange cursor-pointer transition-colors z-10 ml-1">
          ✕
        </button>
      )}
    </div>
  )
}

function ProgressRing({ progress }) {
  const r = 14; const c = 2 * Math.PI * r
  return (
    <svg width="34" height="34" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="17" cy="17" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3"/>
      <circle cx="17" cy="17" r={r} fill="none" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * progress) / 100}/>
    </svg>
  )
}

const CheckIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
const ClockIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const RetryIcon  = ({ onClick }) => <button onClick={onClick} className="cursor-pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.42"/></svg></button>
