/**
 * G1 — Blueprint Reconciliation / Adaptive Re-planning (NCS §1).
 *
 * Blueprint dua lapis:
 *   - Spine layer (IMMUTABLE): batas act, mandatory reveals, reveal gates,
 *     ending rules, konflik inti. Tak pernah berubah setelah lock.
 *   - Trajectory layer (RECONCILABLE): chapter goal, beat detail per bab.
 *
 * Checkpoint (akhir tiap act + on-demand saat drift ≥ 2):
 *   1. Bandingkan trajectory act berikutnya dengan state aktual.
 *   2. Hitung drift score per goal (0 konsisten … 3 mustahil).
 *   3. Goal drift ≥ 2 diregenerasi (constraint: spine/ending/reveal gate tetap).
 *   4. Simpan sebagai blueprint versi baru (versioned, auditable) — bukan overwrite.
 *   5. Bila spine tak terpenuhi (mis. ending tak reachable) → FAILED_REVIEW_REQUIRED.
 */

import type { ChapterBlueprint, Finding, SecretReveal } from './types'
import {
  ENDING_RULES,
  REVEAL_GATE_CHAPTERS,
  actForChapter,
} from './template'

export const DRIFT_REGEN_THRESHOLD = 2
export const DRIFT_MAX = 3

/** State aktual yang dibandingkan terhadap trajectory. */
export interface ActualState {
  /** flag cerita yang sudah aktif (mis. 'rani.tahu_warisan'). */
  storyFlags: Set<string>
  /** clue yang sudah tersedia bagi protagonis. */
  clues: Set<string>
  /** status thread aktual: threadId → status. */
  threadStatuses: Record<string, string>
}

/** Kebutuhan trajectory per bab (dipakai menghitung drift, di luar spine). */
export interface TrajectoryRequirement {
  chapterNumber: number
  requiredFlags?: string[]
  requiredClues?: string[]
  requiredThreadsActive?: string[]
}

/** Definisi ending untuk reachability check. */
export interface EndingDef {
  id: string
  isMain: boolean
  isSecret: boolean
  /** Ending tak lagi reachable bila salah satu flag ini sudah aktif. */
  blockedByFlags?: string[]
}

export interface ReconcileInput {
  storyId: string
  /** blueprint act berikutnya yang akan direkonsiliasi. */
  blueprints: ChapterBlueprint[]
  requirements: TrajectoryRequirement[]
  state: ActualState
  secrets: SecretReveal[]
  endings: EndingDef[]
  /** bab tempat checkpoint dijalankan (untuk konteks reveal gate). */
  checkpointChapter: number
}

export type ReconcileStatus = 'RECONCILED' | 'NO_CHANGE' | 'FAILED_REVIEW_REQUIRED'

export interface ReconcileResult {
  status: ReconcileStatus
  /** blueprint hasil (versi baru untuk goal yang diregenerasi). */
  blueprints: ChapterBlueprint[]
  driftByChapter: Record<number, number>
  reconciledChapters: number[]
  findings: Finding[]
  /** event ledger yang harus ditulis (BLUEPRINT_RECONCILED). */
  events: { type: 'BLUEPRINT_RECONCILED'; chapterNumber: number; reason: string }[]
}

/** Hitung drift score 0..3 sebuah goal terhadap state aktual. */
export function computeDriftScore(
  req: TrajectoryRequirement | undefined,
  state: ActualState,
): number {
  if (!req) return 0
  let unmet = 0
  for (const f of req.requiredFlags ?? []) if (!state.storyFlags.has(f)) unmet++
  for (const c of req.requiredClues ?? []) if (!state.clues.has(c)) unmet++
  for (const t of req.requiredThreadsActive ?? []) {
    const st = state.threadStatuses[t]
    const active = st === 'OPEN' || st === 'DEVELOPING' || st === 'PAYOFF_DUE'
    if (!active) unmet++
  }
  return Math.min(unmet, DRIFT_MAX)
}

/** Ending reachable bila tak ada blockedByFlags yang sudah aktif. */
export function isEndingReachable(e: EndingDef, state: ActualState): boolean {
  return !(e.blockedByFlags ?? []).some((f) => state.storyFlags.has(f))
}

/**
 * Ending reachability check (NCS §1.4): minimal `minReachableEndings` ending
 * utama + jalur secret ending tetap reachable dari state saat ini.
 */
export function checkEndingReachability(
  endings: EndingDef[],
  state: ActualState,
): Finding[] {
  const findings: Finding[] = []
  const reachableMain = endings.filter(
    (e) => e.isMain && isEndingReachable(e, state),
  ).length
  if (reachableMain < ENDING_RULES.minReachableEndings) {
    findings.push({
      code: 'ENDING_UNREACHABLE',
      severity: 'CRITICAL',
      message: `Hanya ${reachableMain} ending utama reachable (min ${ENDING_RULES.minReachableEndings}).`,
      detail: { reachableMain },
    })
  }
  const secret = endings.find((e) => e.isSecret)
  if (secret && !isEndingReachable(secret, state)) {
    findings.push({
      code: 'SECRET_ENDING_UNREACHABLE',
      severity: 'CRITICAL',
      message: 'Jalur secret ending tidak lagi reachable.',
      detail: { endingId: secret.id },
    })
  }
  return findings
}

/**
 * Spine guard: reconciliation tak boleh melanggar spine.
 *  - Mandatory reveal (secret dgn gate == bab) wajib tetap ada di mandatoryBeats.
 *  - forbidden_reveals bab N wajib memuat semua secret dgn gate > N
 *    (mencegah reveal gate dimajukan lebih awal).
 */
export function checkSpineIntegrity(
  reconciled: ChapterBlueprint,
  secrets: SecretReveal[],
): Finding[] {
  const findings: Finding[] = []
  const n = reconciled.chapterNumber

  for (const s of secrets) {
    if (s.revealGateChapter === n) {
      const present = reconciled.mandatoryBeats.some((b) => b.includes(s.id))
      if (!present) {
        findings.push({
          code: 'SPINE_MANDATORY_REVEAL_DROPPED',
          severity: 'CRITICAL',
          message: `Reconciliation menghapus mandatory reveal ${s.id} di Bab ${n}.`,
          detail: { secretId: s.id, chapter: n },
        })
      }
    }
    if (s.revealGateChapter > n && !reconciled.forbiddenReveals.includes(s.id)) {
      findings.push({
        code: 'SPINE_REVEAL_GATE_MOVED_EARLY',
        severity: 'CRITICAL',
        message: `Reveal gate ${s.id} tampak dimajukan sebelum Bab ${s.revealGateChapter}.`,
        detail: { secretId: s.id, gate: s.revealGateChapter, chapter: n },
      })
    }
  }

  // Reveal gate kanonik template tidak boleh hilang dari struktur act.
  if (REVEAL_GATE_CHAPTERS.includes(n)) {
    actForChapter(n) // memastikan bab valid dalam struktur act (lempar bila tidak)
  }
  return findings
}

/**
 * Regenerasi goal. Bila `authoredGoal` diberikan (hasil LLM tervalidasi, T7.5),
 * pakai sebagai chapterGoal baru; jika null, jatuh ke penanda deterministik.
 * Spine (mandatoryBeats, forbiddenReveals) TIDAK pernah diubah di sini.
 */
function regenerateGoal(
  bp: ChapterBlueprint,
  drift: number,
  authoredGoal?: string | null,
): ChapterBlueprint {
  const nextVersion = bp.version + 1
  const authored = authoredGoal?.trim()
  return {
    ...bp,
    version: nextVersion,
    reconciledFromVersion: bp.version,
    reconciliationReason: authored
      ? `drift=${drift} ≥ ${DRIFT_REGEN_THRESHOLD}: goal ditulis ulang (adaptif) dalam batas spine.`
      : `drift=${drift} ≥ ${DRIFT_REGEN_THRESHOLD}: trajectory diselaraskan ulang dalam batas spine.`,
    chapterGoal: authored ? authored : `${bp.chapterGoal} [rekonsiliasi v${nextVersion}]`,
    // mandatoryBeats, forbiddenReveals (spine) TIDAK diubah.
  }
}

/**
 * Konteks yang diberikan ke penulis-goal adaptif (T7.5). Berisi HANYA lapis
 * trajectory + ringkasan state; spine disertakan sebagai CONSTRAINT (read-only)
 * agar goal baru tetap menuju mandatory beats tanpa membocorkan reveal terlarang.
 */
export interface GoalAuthorContext {
  storyId: string
  chapterNumber: number
  phase: string
  drift: number
  /** goal lama yang sudah melenceng dari state. */
  currentGoal: string
  /** spine yang WAJIB tetap dipatuhi (tak boleh diubah goal). */
  mandatoryBeats: string[]
  forbiddenReveals: string[]
  /** ringkasan state aktual pembaca untuk menyelaraskan goal. */
  activeFlags: string[]
  availableClues: string[]
}

/**
 * Penulis-goal adaptif (diinjeksi; opsional untuk test). Mengembalikan goal baru
 * yang aman-pembaca, atau null bila gagal/menolak (→ fallback deterministik).
 */
export type GoalAuthorFn = (ctx: GoalAuthorContext) => Promise<string | null>

/**
 * Jalankan reconciliation checkpoint atas blueprint act berikutnya.
 * Hasil: blueprint versi baru untuk goal drift ≥ 2, atau FAILED_REVIEW_REQUIRED
 * bila spine tak terpenuhi / ending tak reachable.
 */
export function runReconciliation(input: ReconcileInput): ReconcileResult {
  const reqByChapter = new Map(
    input.requirements.map((r) => [r.chapterNumber, r]),
  )
  const driftByChapter: Record<number, number> = {}
  const reconciledChapters: number[] = []
  const events: ReconcileResult['events'] = []
  const findings: Finding[] = []

  // 1) Ending reachability WAJIB lulus lebih dulu (gate keras).
  findings.push(...checkEndingReachability(input.endings, input.state))

  // 2) Drift + regenerasi trajectory.
  const out = input.blueprints.map((bp) => {
    const drift = computeDriftScore(reqByChapter.get(bp.chapterNumber), input.state)
    driftByChapter[bp.chapterNumber] = drift
    if (drift >= DRIFT_REGEN_THRESHOLD) {
      const regen = regenerateGoal(bp, drift)
      const spine = checkSpineIntegrity(regen, input.secrets)
      findings.push(...spine)
      reconciledChapters.push(bp.chapterNumber)
      events.push({
        type: 'BLUEPRINT_RECONCILED',
        chapterNumber: bp.chapterNumber,
        reason: regen.reconciliationReason ?? '',
      })
      return regen
    }
    return bp
  })

  const hasCritical = findings.some((f) => f.severity === 'CRITICAL')
  if (hasCritical) {
    return {
      status: 'FAILED_REVIEW_REQUIRED',
      blueprints: input.blueprints, // jangan terapkan perubahan bila spine gagal
      driftByChapter,
      reconciledChapters: [],
      findings,
      events: [],
    }
  }

  return {
    status: reconciledChapters.length ? 'RECONCILED' : 'NO_CHANGE',
    blueprints: out,
    driftByChapter,
    reconciledChapters,
    findings,
    events,
  }
}

/**
 * Varian ADAPTIF (T7.5): sama seperti runReconciliation, tapi goal bab yang
 * drift diregenerasi oleh `goalAuthor` (LLM tervalidasi) alih-alih penanda
 * deterministik. Bila author gagal/menolak untuk sebuah bab, jatuh ke fallback
 * deterministik agar checkpoint tak pernah buntu. Spine & gate ending tetap
 * ditegakkan identik dengan jalur sinkron.
 */
export async function runReconciliationAdaptive(
  input: ReconcileInput,
  goalAuthor?: GoalAuthorFn,
): Promise<ReconcileResult & { authoredChapters: number[] }> {
  const reqByChapter = new Map(input.requirements.map((r) => [r.chapterNumber, r]))
  const driftByChapter: Record<number, number> = {}
  const reconciledChapters: number[] = []
  const authoredChapters: number[] = []
  const events: ReconcileResult['events'] = []
  const findings: Finding[] = []

  // 1) Ending reachability WAJIB lulus lebih dulu (gate keras).
  findings.push(...checkEndingReachability(input.endings, input.state))

  // 2) Drift + regenerasi trajectory (adaptif bila ada goalAuthor).
  const out: ChapterBlueprint[] = []
  for (const bp of input.blueprints) {
    const drift = computeDriftScore(reqByChapter.get(bp.chapterNumber), input.state)
    driftByChapter[bp.chapterNumber] = drift
    if (drift < DRIFT_REGEN_THRESHOLD) {
      out.push(bp)
      continue
    }

    // Coba goal adaptif; fallback deterministik bila gagal/menolak.
    let authoredGoal: string | null = null
    if (goalAuthor) {
      try {
        authoredGoal = await goalAuthor({
          storyId: input.storyId,
          chapterNumber: bp.chapterNumber,
          phase: bp.phase,
          drift,
          currentGoal: bp.chapterGoal,
          mandatoryBeats: bp.mandatoryBeats,
          forbiddenReveals: bp.forbiddenReveals,
          activeFlags: [...input.state.storyFlags],
          availableClues: [...input.state.clues],
        })
      } catch (err) {
        console.log(
          `[v0] reconcile: goalAuthor gagal Bab ${bp.chapterNumber}, fallback deterministik:`,
          (err as Error)?.message,
        )
        authoredGoal = null
      }
    }

    const regen = regenerateGoal(bp, drift, authoredGoal)
    findings.push(...checkSpineIntegrity(regen, input.secrets))
    reconciledChapters.push(bp.chapterNumber)
    if (authoredGoal?.trim()) authoredChapters.push(bp.chapterNumber)
    events.push({
      type: 'BLUEPRINT_RECONCILED',
      chapterNumber: bp.chapterNumber,
      reason: regen.reconciliationReason ?? '',
    })
    out.push(regen)
  }

  const hasCritical = findings.some((f) => f.severity === 'CRITICAL')
  if (hasCritical) {
    return {
      status: 'FAILED_REVIEW_REQUIRED',
      blueprints: input.blueprints,
      driftByChapter,
      reconciledChapters: [],
      authoredChapters: [],
      findings,
      events: [],
    }
  }

  return {
    status: reconciledChapters.length ? 'RECONCILED' : 'NO_CHANGE',
    blueprints: out,
    driftByChapter,
    reconciledChapters,
    authoredChapters,
    findings,
    events,
  }
}
