import React from 'react'

const POSITIONS = ['tl','tc','tr','bl','bc','br']
const LABELS    = { tl:'TL', tc:'TC', tr:'TR', bl:'BL', bc:'BC', br:'BR' }

export default function WatermarkPicker({ value, onChange }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Video preview */}
      <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative flex items-center justify-center">
        <svg className="text-slate-300 dark:text-slate-600" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        {/* Watermark badge preview in selected position */}
        <div className={`absolute ${posClass(value)} bg-brand-blue/80 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm`}>
          Learning Owl
        </div>
      </div>
      {/* Position grid */}
      <div className="grid grid-cols-6 gap-1 p-2 bg-white dark:bg-[#0a1929]">
        {POSITIONS.map(pos => (
          <button key={pos} onClick={() => onChange(pos)}
            className={`py-1 text-[9px] rounded transition-all cursor-pointer border ${
              value === pos
                ? 'bg-brand-blue/10 border-brand-blue text-brand-blue font-bold dark:bg-brand-blue/20'
                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-brand-blue/50'
            }`}>
            {LABELS[pos]}
          </button>
        ))}
      </div>
    </div>
  )
}

function posClass(pos) {
  const map = {
    tl: 'top-1.5 left-1.5', tc: 'top-1.5 left-1/2 -translate-x-1/2', tr: 'top-1.5 right-1.5',
    bl: 'bottom-1.5 left-1.5', bc: 'bottom-1.5 left-1/2 -translate-x-1/2', br: 'bottom-1.5 right-1.5',
  }
  return map[pos] ?? 'bottom-1.5 right-1.5'
}
