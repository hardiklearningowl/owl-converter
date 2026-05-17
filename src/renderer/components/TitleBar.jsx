import React, { useEffect, useState } from 'react'
import { invoke, useIpcOn } from '../hooks/useIpc'
import logoHorizontal from '../assets/logo-horizontal.png'

export default function TitleBar({ updateInfo }) {
  const [appVersion, setAppVersion] = useState('')
  const [checkState, setCheckState] = useState(null) // null | 'checking' | 'uptodate' | 'error'
  const [checkMsg,   setCheckMsg]   = useState('')

  useEffect(() => {
    invoke('app:getVersion').then(setAppVersion).catch(() => setAppVersion(''))
  }, [])

  // Listen for update:checkResult (no-update or error feedback)
  useIpcOn('update:checkResult', ({ upToDate, error, current }) => {
    if (error) {
      setCheckState('error')
      setCheckMsg(error.slice(0, 80))
    } else if (upToDate) {
      setCheckState('uptodate')
      setCheckMsg('You’re on the latest version')
    }
    setTimeout(() => { setCheckState(null); setCheckMsg('') }, 4000)
  })

  async function manualCheck() {
    setCheckState('checking')
    setCheckMsg('Checking for updates…')
    const r = await invoke('update:check')
    if (r?.error) {
      setCheckState('error')
      setCheckMsg(r.error.slice(0, 80))
      setTimeout(() => { setCheckState(null); setCheckMsg('') }, 5000)
    }
    // success path is handled by either 'update:available' or 'update:checkResult' listeners
  }

  return (
    <div className="flex items-center gap-3 px-4 h-12 bg-white dark:bg-[#071220] border-b border-slate-100 dark:border-slate-800 flex-shrink-0">

      {/* Window controls (cosmetic — OS draws real controls on Windows) */}
      <div className="flex gap-[7px]">
        <div className="w-3 h-3 rounded-full bg-[#E8472A]" />
        <div className="w-3 h-3 rounded-full bg-[#F7B731]" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>

      {/* Logo + product name — centred */}
      <div className="flex items-center gap-3 flex-1 justify-center">
        <img src={logoHorizontal} alt="Learning Owl" className="h-7 w-auto object-contain dark:brightness-110" />
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">OwlConverter</div>
          <div className="text-[10px] text-brand-blue leading-none mt-0.5">SWF → MP4</div>
        </div>
      </div>

      {/* Version / update badge */}
      {updateInfo ? (
        <button
          onClick={() => invoke('update:download')}
          className="text-[10px] bg-brand-orange/10 border border-brand-orange/40 text-brand-orange px-2 py-1 rounded-full font-semibold hover:bg-brand-orange/20 cursor-pointer transition-colors"
        >
          Update v{updateInfo.version} available ↓
        </button>
      ) : (
        <button
          onClick={manualCheck}
          title={checkMsg || 'Click to check for updates'}
          className={`text-[10px] border px-2 py-1 rounded-full font-semibold cursor-pointer transition-colors ${
            checkState === 'error'
              ? 'bg-brand-orange/10 border-brand-orange/40 text-brand-orange hover:bg-brand-orange/20'
              : checkState === 'uptodate'
                ? 'bg-green-500/10 border-green-500/40 text-green-600 hover:bg-green-500/20'
                : 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/20'
          }`}
        >
          {checkState === 'checking' ? 'Checking…'
            : checkState === 'uptodate' ? `v${appVersion} ✓`
            : checkState === 'error' ? `v${appVersion} — check failed`
            : appVersion ? `v${appVersion}` : ''}
        </button>
      )}
    </div>
  )
}
