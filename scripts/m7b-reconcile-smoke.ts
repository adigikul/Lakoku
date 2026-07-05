/**
 * Harness T7.5 — adaptive goal-authoring pada reconciliation checkpoint.
 *
 * Menguji `runReconciliationAdaptive` (narrative-core) + penulis-goal LLM
 * (lib/authoring/reconcile-goal) secara MURNI-LOGIKA (goalAuthor di-mock):
 *   - regresi: tanpa goalAuthor identik dengan jalur deterministik lama;
 *   - adaptif: goalAuthor mengganti chapterGoal (versioned), spine tetap;
 *   - fallback: goalAuthor throw/null → jatuh ke penanda deterministik;
 *   - spine guard & ending reachability tetap ditegakkan;
 *   - validateAuthoredGoal menolak kebocoran & reveal terlarang.
 * Tambahan opsional (butuh env OPENROUTER/GATEWAY): 1x authorChapterGoal live.
 *
 * Jalankan: npx tsx scripts/m7b-reconcile-smoke.ts
 */
import { buildFixtureSnapshot } from '@/fixtures/narrative/fixture-50'
import {
  runReconciliation,
  runReconciliationAdaptive,
  computeDriftScore,
  type ActualState,
  type EndingDef,
  type GoalAuthorFn,
  type GoalAuthorContext,
} from '@lakoku/narrative-core'
import { validateAuthoredGoal } from '../lib/authoring/reconcile-goal'

let pass = 0
let fail = 0
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}`, extra !== undefined ? JSON.stringify(extra) : '') }
}

const ENDINGS: EndingDef[] = [
  { id: 'ending:tegar', isMain: true, isSecret: false, blockedByFlags: [] },
  { id: 'ending:damai', isMain: true, isSecret: false, blockedByFlags: ['rani.balas_dendam'] },
  { id: 'ending:pahit', isMain: true, isSecret: false, blockedByFlags: [] },
  { id: 'ending:rahasia', isMain: false, isSecret: true, blockedByFlags: ['sari.tak_ditemukan'] },
]

async function main() {
  const snapshot = buildFixtureSnapshot()
  const bp = (n: number) => snapshot.blueprints[n - 1]
  const emptyState: ActualState = { storyFlags: new Set(), clues: new Set(), threadStatuses: {} }

  // Input drift: bab 13 drift ≥ 2 (regen), bab 14 drift 0.
  const baseInput = {
    storyId: snapshot.storyId,
    blueprints: [bp(13), bp(14)],
    requirements: [
      { chapterNumber: 13, requiredFlags: ['x', 'y'] },
      { chapterNumber: 14 },
    ],
    state: emptyState,
    secrets: snapshot.secrets,
    endings: ENDINGS,
    checkpointChapter: 12,
  }

  // 1) REGRESI — adaptive tanpa goalAuthor == deterministik lama.
  {
    const sync = runReconciliation(baseInput)
    const adapt = await runReconciliationAdaptive(baseInput)
    const s13 = sync.blueprints.find((b) => b.chapterNumber === 13)!
    const a13 = adapt.blueprints.find((b) => b.chapterNumber === 13)!
    check('regresi: status sama (RECONCILED)', sync.status === adapt.status && adapt.status === 'RECONCILED', { sync: sync.status, adapt: adapt.status })
    check('regresi: chapterGoal identik tanpa author', s13.chapterGoal === a13.chapterGoal, { s: s13.chapterGoal, a: a13.chapterGoal })
    check('regresi: version identik (=2)', s13.version === a13.version && a13.version === 2, a13.version)
    check('regresi: authoredChapters kosong', adapt.authoredChapters.length === 0, adapt.authoredChapters)
    check('regresi: bab 14 tak berubah', adapt.blueprints.find((b) => b.chapterNumber === 14)!.version === 1)
  }

  // 2) ADAPTIF — goalAuthor menulis ulang goal (spine tetap).
  {
    const authored = 'Rani menegaskan haknya atas warisan sambil menahan diri dari tuduhan terbuka.'
    const goalAuthor: GoalAuthorFn = async () => authored
    const adapt = await runReconciliationAdaptive(baseInput, goalAuthor)
    const a13 = adapt.blueprints.find((b) => b.chapterNumber === 13)!
    check('adaptif: chapterGoal = hasil author', a13.chapterGoal === authored, a13.chapterGoal)
    check('adaptif: authoredChapters berisi 13', adapt.authoredChapters.includes(13), adapt.authoredChapters)
    check('adaptif: version naik & reconciledFromVersion', a13.version === 2 && a13.reconciledFromVersion === 1, a13)
    check('adaptif: mandatoryBeats (spine) tak berubah', JSON.stringify(a13.mandatoryBeats) === JSON.stringify(bp(13).mandatoryBeats), a13.mandatoryBeats)
    check('adaptif: forbiddenReveals (spine) tak berubah', JSON.stringify(a13.forbiddenReveals) === JSON.stringify(bp(13).forbiddenReveals))
    check('adaptif: alasan menyebut "adaptif"', (a13.reconciliationReason ?? '').includes('adaptif'), a13.reconciliationReason)
    check('adaptif: event BLUEPRINT_RECONCILED ditulis', adapt.events.some((e) => e.chapterNumber === 13))
  }

  // 3) FALLBACK — goalAuthor throw → penanda deterministik.
  {
    const goalAuthor: GoalAuthorFn = async () => { throw new Error('LLM down') }
    const adapt = await runReconciliationAdaptive(baseInput, goalAuthor)
    const a13 = adapt.blueprints.find((b) => b.chapterNumber === 13)!
    check('fallback: tetap RECONCILED', adapt.status === 'RECONCILED', adapt.status)
    check('fallback: pakai penanda deterministik', a13.chapterGoal.includes('[rekonsiliasi v2]'), a13.chapterGoal)
    check('fallback: authoredChapters kosong', adapt.authoredChapters.length === 0, adapt.authoredChapters)
  }

  // 3b) FALLBACK — goalAuthor mengembalikan null (menolak).
  {
    const goalAuthor: GoalAuthorFn = async () => null
    const adapt = await runReconciliationAdaptive(baseInput, goalAuthor)
    const a13 = adapt.blueprints.find((b) => b.chapterNumber === 13)!
    check('fallback-null: penanda deterministik', a13.chapterGoal.includes('[rekonsiliasi v2]'), a13.chapterGoal)
  }

  // 4) ENDING UNREACHABLE — FAILED walau ada goalAuthor.
  {
    const state: ActualState = {
      storyFlags: new Set(['rani.balas_dendam', 'sari.tak_ditemukan']),
      clues: new Set(),
      threadStatuses: {},
    }
    const endings: EndingDef[] = [
      { id: 'e1', isMain: true, isSecret: false, blockedByFlags: ['rani.balas_dendam'] },
      { id: 'e2', isMain: true, isSecret: false, blockedByFlags: ['sari.tak_ditemukan'] },
      { id: 'e3', isMain: false, isSecret: true, blockedByFlags: ['sari.tak_ditemukan'] },
    ]
    const adapt = await runReconciliationAdaptive(
      { ...baseInput, blueprints: [bp(20)], requirements: [], state, endings, checkpointChapter: 20 },
      async () => 'goal apa pun',
    )
    check('ending: FAILED_REVIEW_REQUIRED', adapt.status === 'FAILED_REVIEW_REQUIRED', adapt.status)
    check('ending: blueprint tak diubah', adapt.reconciledChapters.length === 0, adapt.reconciledChapters)
  }

  // 5) validateAuthoredGoal — pagar aman-pembaca & anti reveal dini.
  {
    const ctx: GoalAuthorContext = {
      storyId: 's', chapterNumber: 13, phase: 'RISING', drift: 2,
      currentGoal: 'goal lama', mandatoryBeats: [], forbiddenReveals: ['secret:pemalsuan'],
      activeFlags: [], availableClues: [],
    }
    check('validate: goal bersih lolos', validateAuthoredGoal('Rani mencari bukti untuk menuntut keadilan atas keluarganya.', ctx) !== null)
    check('validate: reveal terlarang ditolak', validateAuthoredGoal('Rani mengungkap secret:pemalsuan di depan semua orang.', ctx) === null)
    check('validate: terlalu pendek ditolak', validateAuthoredGoal('Rani pergi.', ctx) === null)
    check('validate: kebocoran istilah teknis ditolak', validateAuthoredGoal('Sesuaikan prompt model AI agar token berikutnya konsisten dengan sistem.', ctx) === null)
    check('drift score capped = 2', computeDriftScore({ chapterNumber: 13, requiredFlags: ['x', 'y'] }, emptyState) === 2)
  }

  // 6) LIVE (opsional) — 1x authorChapterGoal bila ada key.
  if (process.env.OPENROUTER_API_KEY || process.env.AI_GATEWAY_API_KEY) {
    try {
      const { authorChapterGoal } = await import('../lib/authoring/reconcile-goal')
      const ctx: GoalAuthorContext = {
        storyId: 'live', chapterNumber: 13, phase: 'RISING', drift: 2,
        currentGoal: 'Rani menemukan petunjuk pertama tentang warisan.',
        mandatoryBeats: ['perkenalkan ketegangan warisan'],
        forbiddenReveals: ['secret:pemalsuan'],
        activeFlags: ['rani.pulang_kampung'], availableClues: ['clue:wasiat'],
      }
      const goal = await authorChapterGoal(ctx)
      check('live: goal dihasilkan & lolos validasi', typeof goal === 'string' && goal.length >= 20, goal)
      check('live: goal tak bocorkan reveal terlarang', !goal || !goal.toLowerCase().includes('secret:pemalsuan'))
    } catch (e) {
      console.log('  SKIP  live authorChapterGoal:', (e as Error)?.message)
    }
  } else {
    console.log('  SKIP  live authorChapterGoal (tak ada API key)')
  }

  console.log(`\nT7.5 reconcile smoke: ${pass} PASS / ${fail} FAIL`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
