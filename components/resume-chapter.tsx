'use client'

import { useSyncExternalStore } from 'react'
import { getResumeChapter, subscribeProgress } from '@/lib/api'

/**
 * Menampilkan nomor bab untuk melanjutkan, sadar progres lokal.
 * Server merender `fallback` (dari seam/fixtures); setelah hydration,
 * angka diperbarui ke progres terjauh yang tersimpan di client.
 * Pola useSyncExternalStore dengan server-snapshot = fallback mencegah
 * ketidakcocokan hydration.
 */
export function ResumeChapter({
  storyId,
  fallback,
}: {
  storyId: string
  fallback: number
}) {
  const chapter = useSyncExternalStore(
    subscribeProgress,
    () => getResumeChapter(storyId, fallback),
    () => fallback,
  )
  return <>{chapter}</>
}
