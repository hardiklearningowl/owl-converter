import React, { useEffect, useState } from 'react'
import { invoke } from '../hooks/useIpc'
import logoHorizontal from '../assets/logo-horizontal.png'

export default function TitleBar({ updateInfo }) {
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    invoke('app:getVersion').then(setAppVersion).catch(() => setAppVersion(''))
  }, [])

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
          className="text-[10px] bg-brand-blue/10 border border-brand-blue/30 text-brand-blue px-2 py-1 rounded-full font-semibold hover:bg-brand-blue/20 cursor-pointer transition-colors"
        >
          Update v{updateInfo.version} available ↓
        </button>
      ) : (
        <div className="text-[10px] bg-brand-blue/10 border border-brand-blue/30 text-brand-blue px-2 py-1 rounded-full font-semibold">
          {appVersion ? `v${appVersion}` : ''}
        </div>
      )}
    </div>
  )
}
