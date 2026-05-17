import React  from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useQueueStore }    from '../stores/queueStore'
import { invoke }           from '../hooks/useIpc'
import WatermarkPicker      from './WatermarkPicker'

const RESOLUTIONS = ['1080p','720p','480p','original']
const QUALITIES   = [
  { value:'lossless', label:'Lossless (CRF 12)' },
  { value:'high',     label:'High (CRF 18)' },
  { value:'medium',   label:'Medium (CRF 23)' },
  { value:'low',      label:'Low (CRF 28)' },
]
const FPS_OPTIONS = ['source','24','30','60']

export default function SettingsPanel() {
  const { settings, save } = useSettingsStore()
  const { jobs, mode }     = useQueueStore()

  if (!settings) return null

  const wm = settings.watermark

  async function handlePickFolder() {
    const folder = await invoke('dialog:openFolder')
    if (folder) save({ outputFolder: folder })
  }

  async function handleConvert() {
    const pending = jobs.filter(j => j.status === 'queued')
    if (pending.length === 0) return
    if (mode === 'merge') {
      // window.prompt() is disabled by Electron with contextIsolation/sandbox.
      // Use a native Save dialog instead — picks both folder and filename.
      const stamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const defaultPath = (settings.outputFolder ? settings.outputFolder + '\\' : '') + `merged_${stamp}.mp4`
      const pick = await invoke('dialog:saveMergedMp4', { defaultPath })
      if (!pick) return
      await invoke('convert:startMerge', {
        jobs: pending,
        outputFolder: pick.folder,
        outputName:   pick.name,
        settings,
      })
    } else {
      await invoke('convert:start', { jobs: pending, settings })
    }
  }

  const pendingCount = jobs.filter(j => j.status === 'queued').length

  return (
    <div className="w-64 flex-shrink-0 flex flex-col bg-slate-50/50 dark:bg-white/[0.015] border-l border-slate-100 dark:border-slate-800">

      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
          <SettingsIcon /> Output Settings
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-4">

        {/* Resolution */}
        <Field label="Resolution" icon={<MonitorIcon />}>
          <Select value={settings.resolution} onChange={v => save({ resolution: v })} options={RESOLUTIONS.map(r => ({ value: r, label: r === 'original' ? 'Original' : r }))} />
        </Field>

        {/* Quality */}
        <Field label="Output Quality" icon={<WaveIcon />}>
          <Select value={settings.quality} onChange={v => save({ quality: v })} options={QUALITIES} />
          <div className="mt-2 px-0.5">
            <div className="flex justify-between text-[9px] text-slate-400 uppercase mb-1.5">
              <span>Smaller file</span><span>Better quality</span>
            </div>
            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded relative">
              <div className="absolute left-0 top-0 h-full rounded bg-gradient-to-r from-brand-blue to-brand-amber"
                style={{ width: `${({ lossless:100, high:75, medium:50, low:25 }[settings.quality]) ?? 75}%` }} />
            </div>
          </div>
        </Field>

        {/* FPS */}
        <Field label="Frame Rate" icon={<FilmIcon />}>
          <Select value={settings.fps} onChange={v => save({ fps: v })} options={FPS_OPTIONS.map(f => ({ value: f, label: f === 'source' ? 'Match source' : `${f} fps` }))} />
        </Field>

        {/* Output folder */}
        <Field label="Output Folder" icon={<FolderIcon />}>
          <button onClick={handlePickFolder}
            className="w-full h-9 flex items-center justify-between px-3 bg-white dark:bg-[#0d2137] border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 hover:border-brand-blue transition-colors cursor-pointer">
            <span className="truncate">{settings.outputFolder || 'Click to choose…'}</span>
            <EditIcon />
          </button>
        </Field>

        {/* Toggles */}
        <Field label="Options" icon={<ToggleIcon />}>
          <Toggle label="GPU Acceleration" desc="NVENC / Intel QSV"
            value={settings.gpuAcceleration} onChange={v => save({ gpuAcceleration: v })} />
          <Toggle label="Add Watermark" desc="Learning Owl logo overlay"
            value={wm.enabled} onChange={v => save({ watermark: { ...wm, enabled: v } })} />
          <Toggle label="Open when done" desc="Open output folder"
            value={settings.openFolderWhenDone} onChange={v => save({ openFolderWhenDone: v })} />
        </Field>

        {/* Watermark position (only when enabled) */}
        {wm.enabled && (
          <Field label="Watermark Position" icon={<ImageIcon />}>
            <WatermarkPicker value={wm.position} onChange={v => save({ watermark: { ...wm, position: v } })} />
          </Field>
        )}
      </div>

      {/* Convert button */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <button onClick={handleConvert} disabled={pendingCount === 0}
          className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-br from-brand-orange to-[#c73c24] text-white font-bold text-sm rounded-lg shadow-lg shadow-brand-orange/30 hover:shadow-brand-orange/50 hover:-translate-y-px transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
          <PlayIcon />
          Convert {pendingCount > 0 ? `(${pendingCount} file${pendingCount !== 1 ? 's' : ''})` : 'All'}
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function Field({ label, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
        {icon}{label}
      </div>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-3 pr-7 bg-white dark:bg-[#0d2137] border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 appearance-none cursor-pointer hover:border-brand-blue transition-colors">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-blue text-[10px] pointer-events-none">▾</span>
    </div>
  )
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-[#0d2137] border border-slate-200 dark:border-slate-700 rounded-lg mb-1.5 cursor-pointer hover:border-brand-blue/30 transition-colors">
      <div>
        <div className="text-xs text-slate-900 dark:text-slate-100 font-medium">{label}</div>
        <div className="text-[10px] text-slate-400">{desc}</div>
      </div>
      <div className={`w-8 h-[18px] rounded-full flex items-center px-0.5 transition-colors ${value ? 'bg-brand-blue justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}>
        <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
      </div>
    </button>
  )
}

// SVG icons
const si = (d) => () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" dangerouslySetInnerHTML={{__html:d}}/>
const SettingsIcon = si('<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>')
const MonitorIcon  = si('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>')
const WaveIcon     = si('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>')
const FilmIcon     = si('<rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>')
const FolderIcon   = si('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>')
const ToggleIcon   = si('<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>')
const ImageIcon    = si('<rect x="3" y="3" width="18" height="18" rx="2"/>')
const EditIcon     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#29ABE2" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const PlayIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
