import React from 'react'
import { useQueueStore }    from '../stores/queueStore'
import { useSettingsStore } from '../stores/settingsStore'
import { invoke }           from '../hooks/useIpc'

export default function Toolbar({ onHistoryClick }) {
  const { mode, setMode, addFiles, clearDone, paused, pause, resume } = useQueueStore()
  const { settings, save } = useSettingsStore()

  async function handleAddFiles() {
    const paths = await invoke('dialog:openFiles')
    if (paths.length > 0) addFiles(paths)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-[#0d1f33] border-b border-slate-200 dark:border-slate-800 flex-shrink-0">

      <button onClick={handleAddFiles}
        className="flex items-center gap-1.5 h-8 px-3 bg-brand-blue text-white text-xs font-semibold rounded-md hover:bg-[#1e99ce] transition-colors cursor-pointer">
        <PlusIcon /> Add SWF Files
      </button>

      <button onClick={clearDone}
        className="flex items-center gap-1.5 h-8 px-3 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer">
        <TrashIcon /> Clear Done
      </button>

      <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />

      {/* Batch / Merge toggle */}
      <div className="flex bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md overflow-hidden h-8">
        {['batch', 'merge'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 text-xs capitalize flex items-center gap-1 cursor-pointer transition-colors ${
              mode === m
                ? 'bg-brand-blue text-white font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            {m === 'batch' ? <GridIcon /> : <ListIcon />}
            {m}
          </button>
        ))}
      </div>

      <button onClick={paused ? resume : pause}
        className="flex items-center gap-1.5 h-8 px-3 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer">
        {paused ? <PlayIcon /> : <PauseIcon />}
        {paused ? 'Resume' : 'Pause'}
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={onHistoryClick}
          className="flex items-center gap-1.5 h-8 px-3 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer">
          <HistoryIcon /> History
        </button>

        <button
          onClick={() => save({ theme: settings?.theme === 'dark' ? 'light' : 'dark' })}
          className="flex items-center gap-1.5 h-8 px-3 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Toggle light/dark theme">
          {settings?.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  )
}

// SVG icon factory (13x13 rendering of 24x24 viewBox)
const icon = (d) => function Icon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: d }} />
  )
}
const PlusIcon    = icon('<path d="M12 5v14M5 12h14"/>')
const TrashIcon   = icon('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>')
const GridIcon    = icon('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>')
const ListIcon    = icon('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>')
const PauseIcon   = icon('<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>')
const PlayIcon    = icon('<polygon points="5 3 19 12 5 21 5 3"/>')
const HistoryIcon = icon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')
const SunIcon     = icon('<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>')
const MoonIcon    = icon('<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>')
