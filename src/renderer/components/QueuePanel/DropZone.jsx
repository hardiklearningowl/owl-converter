import React, { useState } from 'react'
import { useQueueStore } from '../../stores/queueStore'
import { invoke }        from '../../hooks/useIpc'

export default function DropZone() {
  const addFiles = useQueueStore(s => s.addFiles)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const paths = Array.from(e.dataTransfer.files)
      .filter(f => f.name.toLowerCase().endsWith('.swf'))
      .map(f => f.path)
    if (paths.length > 0) addFiles(paths)
  }

  async function handleClick() {
    const paths = await invoke('dialog:openFiles')
    if (paths?.length > 0) addFiles(paths)
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
      onDrop={handleDrop}
      className={`mx-4 mb-2 border-[1.5px] border-dashed rounded-lg py-3 text-center transition-all cursor-pointer ${
        dragging
          ? 'border-brand-blue bg-brand-blue/5 dark:bg-brand-blue/10'
          : 'border-brand-blue/25 hover:border-brand-blue/50 bg-slate-50/50 dark:bg-brand-blue/3 hover:bg-brand-blue/5'
      }`}>
      <UploadIcon />
      <p className="text-xs text-slate-400 mt-1">
        Drop SWF files here or <span className="text-brand-blue font-semibold">click to browse</span>
      </p>
    </div>
  )
}

const UploadIcon = () => (
  <svg className="mx-auto text-brand-blue opacity-60" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
