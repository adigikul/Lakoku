/**
 * Lakoku — Progress Baca Lokal (client-only cache)
 *
 * ARSITEKTUR: ARCHITECTURE §3.1 menetapkan client "persist local progress".
 * Modul ini adalah cache progres milik client — BUKAN sumber kebenaran.
 * Sumber kebenaran tetap Reader API di backend (ARCH §7.1). Saat backend
 * nyata siap, progres server direkonsiliasi dengan cache lokal ini (ambil
 * yang paling jauh) tanpa mengubah komponen UI.
 *
 * Sifat: MONOTONIC — progres hanya boleh maju, tidak pernah mundur.
 *
 * Aman untuk SSR: semua akses `localStorage`/`window` dijaga `typeof window`,
 * jadi meng-import modul ini di server tidak akan error. Hanya panggil
 * fungsinya dari komponen client.
 */

const STORAGE_KEY = 'lakoku:progress:v1'

type ProgressMap = Record<string, number>
type Listener = () => void

const listeners = new Set<Listener>()

function readMap(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

function writeMap(map: ProgressMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Storage penuh / diblokir — abaikan; progres tetap berjalan di sesi ini.
  }
}

/** Progres terjauh yang tercatat lokal untuk sebuah cerita, atau null bila belum ada. */
export function getLocalProgress(storyId: string): number | null {
  const map = readMap()
  return typeof map[storyId] === 'number' ? map[storyId] : null
}

/**
 * Catat bahwa pembaca telah mencapai `chapter` pada cerita ini.
 * Monotonic: nilai hanya diperbarui bila lebih besar dari yang tersimpan.
 * Mengembalikan nilai progres terkini setelah pencatatan.
 */
export function recordChapterReached(storyId: string, chapter: number): number {
  const map = readMap()
  const current = map[storyId] ?? 0
  if (chapter > current) {
    map[storyId] = chapter
    writeMap(map)
    listeners.forEach((l) => l())
    return chapter
  }
  return current
}

/**
 * Chapter untuk melanjutkan: nilai terjauh antara progres lokal dan
 * `fallback` dari server (fixtures saat ini). Selalu menghormati sifat monotonic.
 */
export function getResumeChapter(storyId: string, fallback: number): number {
  const local = getLocalProgress(storyId)
  return local != null ? Math.max(local, fallback) : fallback
}

/** Berlangganan perubahan progres (untuk useSyncExternalStore). */
export function subscribeProgress(listener: Listener): () => void {
  listeners.add(listener)
  if (typeof window !== 'undefined') {
    // Sinkron lintas-tab.
    window.addEventListener('storage', listener)
  }
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', listener)
    }
  }
}
