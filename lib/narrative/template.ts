/**
 * Template `lakoku_drama_bangkit_v1` — cetak biru drama kebangkitan 50 bab.
 *
 * Template mendefinisikan STRUKTUR (act, gate act, reveal gate, aturan ending)
 * dan menurunkan `ChapterBlueprint[]` deterministik dari spine cerita.
 * Ini bukan prosa — hanya kerangka yang dipatuhi planner/writer & Layer A.
 */

import type { ChapterBlueprint, SecretReveal } from './types'

export const TEMPLATE_ID = 'lakoku_drama_bangkit_v1'
export const TEMPLATE_VERSION = 1
export const TOTAL_CHAPTERS = 50

export interface ActDef {
  actNumber: number
  phase: string
  fromChapter: number
  toChapter: number
  /** Bab gate act (checkpoint rekonsiliasi & beat wajib). */
  gateChapter: number
  goal: string
}

/**
 * 8 act dengan gate act 5/12/20/32/40/45/48 (Bab terakhir = resolusi).
 * Gate = bab terakhir tiap act tempat checkpoint act dijalankan.
 */
export const ACTS: readonly ActDef[] = [
  { actNumber: 1, phase: 'Pijakan', fromChapter: 1, toChapter: 5, gateChapter: 5, goal: 'Perkenalkan dunia, luka, dan taruhan tokoh.' },
  { actNumber: 2, phase: 'Retak', fromChapter: 6, toChapter: 12, gateChapter: 12, goal: 'Konflik pertama membelah kenyamanan tokoh.' },
  { actNumber: 3, phase: 'Terseret', fromChapter: 13, toChapter: 20, gateChapter: 20, goal: 'Tokoh terseret makin dalam; rahasia mulai berdenyut.' },
  { actNumber: 4, phase: 'Titik Balik', fromChapter: 21, toChapter: 32, gateChapter: 32, goal: 'Titik balik tengah membalik tujuan tokoh.' },
  { actNumber: 5, phase: 'Menanjak', fromChapter: 33, toChapter: 40, gateChapter: 40, goal: 'Taruhan meninggi; aliansi diuji.' },
  { actNumber: 6, phase: 'Krisis', fromChapter: 41, toChapter: 45, gateChapter: 45, goal: 'Krisis memaksa pilihan yang tak bisa ditarik.' },
  { actNumber: 7, phase: 'Puncak', fromChapter: 46, toChapter: 48, gateChapter: 48, goal: 'Puncak konfrontasi; mystery utama harus terbayar.' },
  { actNumber: 8, phase: 'Bangkit', fromChapter: 49, toChapter: 50, gateChapter: 50, goal: 'Kebangkitan & penutupan yang membumi.' },
]

export const ACT_GATES: readonly number[] = ACTS.map((a) => a.gateChapter)

/** Reveal gate kanonik template (sinkron dengan act). */
export const REVEAL_GATE_CHAPTERS: readonly number[] = [12, 20, 32, 45]

/**
 * Aturan ending template:
 *  - Ending hanya boleh muncul pada bab ending window.
 *  - Mystery utama WAJIB RESOLVED sebelum Bab 48 (blokir Bab 48 bila belum).
 *  - Minimal 2 ending berbeda harus reachable.
 */
export const ENDING_RULES = {
  endingWindowFrom: 49,
  mainMysteryMustResolveBeforeChapter: 48,
  minReachableEndings: 2,
} as const

export function actForChapter(chapter: number): ActDef {
  const act = ACTS.find((a) => chapter >= a.fromChapter && chapter <= a.toChapter)
  if (!act) throw new Error(`Bab ${chapter} di luar rentang template (1–${TOTAL_CHAPTERS}).`)
  return act
}

export function isActGate(chapter: number): boolean {
  return ACT_GATES.includes(chapter)
}

/** Spine minimal yang dibutuhkan template untuk menurunkan blueprint. */
export interface StorySpine {
  storyId: string
  /** Rahasia berikut gate reveal-nya (mengatur forbidden_reveals per bab). */
  secrets: SecretReveal[]
  /** character_id yang direncanakan diperkenalkan, per bab. */
  plannedIntroductions?: Record<number, string[]>
  /** allowed_state_delta kustom per bab (opsional; default dari fase). */
  allowedStateDeltaByChapter?: Record<number, Record<string, unknown>>
}

/**
 * Turunkan blueprint deterministik untuk seluruh 50 bab.
 * forbidden_reveals bab N = semua secret yang gate-nya > N (belum boleh dibuka).
 */
export function buildBlueprints(spine: StorySpine): ChapterBlueprint[] {
  const blueprints: ChapterBlueprint[] = []
  for (let n = 1; n <= TOTAL_CHAPTERS; n++) {
    const act = actForChapter(n)
    const forbiddenReveals = spine.secrets
      .filter((s) => s.revealGateChapter > n)
      .map((s) => s.id)
    const introduces = spine.plannedIntroductions?.[n] ?? []
    const allowedStateDelta =
      spine.allowedStateDeltaByChapter?.[n] ?? defaultStateDelta(act)

    blueprints.push({
      chapterNumber: n,
      version: 1,
      phase: act.phase,
      chapterGoal: chapterGoal(n, act),
      mandatoryBeats: mandatoryBeats(n, act, spine),
      forbiddenReveals,
      allowedStateDelta,
      introducesCharacters: introduces,
      reconciledFromVersion: null,
      reconciliationReason: null,
    })
  }
  return blueprints
}

function chapterGoal(n: number, act: ActDef): string {
  if (n === act.gateChapter) return `${act.goal} (gate act ${act.actNumber})`
  return act.goal
}

function mandatoryBeats(n: number, act: ActDef, spine: StorySpine): string[] {
  const beats = [`Kembangkan fase "${act.phase}".`]
  const revealHere = spine.secrets.filter((s) => s.revealGateChapter === n)
  for (const s of revealHere) beats.push(`Buka rahasia terjadwal: ${s.id}.`)
  if (n >= ENDING_RULES.endingWindowFrom) beats.push('Arah menuju penutupan (ending window).')
  if (n === ENDING_RULES.mainMysteryMustResolveBeforeChapter) {
    // Bab 48 boleh dibuka HANYA jika mystery utama sudah RESOLVED (dijaga runtime).
    beats.push('Prasyarat: mystery utama sudah RESOLVED sebelum bab ini.')
  }
  return beats
}

/** State delta yang lazim diizinkan per fase (kerangka konservatif). */
function defaultStateDelta(act: ActDef): Record<string, unknown> {
  const base: Record<string, unknown> = {
    'protagonist.emotion': true,
    'relationship.trust': true,
  }
  if (act.actNumber >= 4) base['protagonist.resolve'] = true
  if (act.actNumber >= 6) base['antagonist.exposure'] = true
  return base
}
