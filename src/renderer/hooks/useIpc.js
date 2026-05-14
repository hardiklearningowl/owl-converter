import { useEffect } from 'react'

/** Typed wrapper around window.owl IPC bridge */
const ipc = () => window.owl

/**
 * Invoke an IPC channel and get a Promise result.
 */
export const invoke = (channel, data) => ipc().invoke(channel, data)

/**
 * Subscribe to an IPC push event from main process.
 * Automatically unsubscribes when the component unmounts.
 */
export function useIpcOn(channel, callback) {
  useEffect(() => {
    const unsubscribe = ipc().on(channel, callback)
    return unsubscribe
  }, [channel, callback])
}
