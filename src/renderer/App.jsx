import React, { useEffect, useState } from 'react'
import { useSettingsStore } from './stores/settingsStore'
import { useQueueStore }    from './stores/queueStore'
import { useIpcOn }         from './hooks/useIpc'
import TitleBar      from './components/TitleBar'
import Toolbar       from './components/Toolbar'
import QueuePanel    from './components/QueuePanel/QueuePanel'
import SettingsPanel from './components/SettingsPanel'
import StatusBar     from './components/StatusBar'
import HistoryPanel  from './components/HistoryPanel'

export default function App() {
  const loadSettings = useSettingsStore(s => s.load)
  const loadJobs     = useQueueStore(s => s.loadJobs)
  const setJobs      = useQueueStore(s => s.setJobs)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [updateInfo,  setUpdateInfo]  = useState(null)

  useEffect(() => {
    loadSettings()
    loadJobs()
  }, [])

  // Keep queue in sync with main process push events
  useIpcOn('queue:updated', setJobs)
  useIpcOn('update:available', setUpdateInfo)

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#0a1929] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Brand stripe top */}
      <div className="flex h-[3px] flex-shrink-0">
        <div className="flex-[3] bg-brand-blue" />
        <div className="flex-[1.5] bg-brand-amber" />
        <div className="flex-[0.8] bg-brand-orange" />
      </div>

      <TitleBar updateInfo={updateInfo} />
      <Toolbar onHistoryClick={() => setHistoryOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <QueuePanel />
        <SettingsPanel />
      </div>

      <StatusBar />

      {/* Brand stripe bottom */}
      <div className="flex h-[3px] flex-shrink-0">
        <div className="flex-[3] bg-brand-blue" />
        <div className="flex-[1.5] bg-brand-amber" />
        <div className="flex-[0.8] bg-brand-orange" />
      </div>

      {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
    </div>
  )
}
