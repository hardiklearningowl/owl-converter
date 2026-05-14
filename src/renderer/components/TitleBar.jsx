import React from 'react'
import { invoke } from '../hooks/useIpc'

export default function TitleBar({ updateInfo }) {
  return (
    <div className="flex items-center gap-3 px-4 h-12 bg-white dark:bg-[#071220] border-b border-slate-100 dark:border-slate-800 flex-shrink-0">

      {/* Window controls (cosmetic — OS draws real controls on Windows) */}
      <div className="flex gap-[7px]">
        <div className="w-3 h-3 rounded-full bg-[#E8472A]" />
        <div className="w-3 h-3 rounded-full bg-[#F7B731]" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>

      {/* Logo + name — centred */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <OwlLogo />
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">OwlConverter</div>
          <div className="text-[10px] text-brand-blue leading-none mt-0.5">by Learning Owl</div>
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
          v1.0.0
        </div>
      )}
    </div>
  )
}

function OwlLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-800 dark:text-slate-200"/>
      <ellipse cx="50" cy="60" rx="25" ry="32" fill="#29ABE2"/>
      <path d="M30 32 Q50 18 70 32 Q65 22 50 20 Q35 22 30 32Z" fill="#E8472A"/>
      <path d="M52 58 Q66 52 68 70 Q66 80 54 82 Q50 70 52 58Z" fill="#F7B731"/>
    </svg>
  )
}
