/**
 * Orkestrasi generasi satu bab: plan → write → Layer A → repair.
 *
 * Repair protocol (NCS §3.2):
 *   - CRITICAL memblokir publish; MAJOR masuk repair; MINOR hanya dicatat.
 *   - Maksimal 2 repair attempt; setelah itu FAILED_REVIEW_REQUIRED.
 *   - Repair hanya merevisi draft (memanggil writeChapter dengan findings),
 *     TIDAK PERNAH memutasi/menghapus canon snapshot.
 */

import type { CanonSnapshot, ChapterBlueprint, Finding } from '../narrative/types'
import { validateLayerA } from '../narrative/layer-a'
import { generatePlan, writeChapter, type GatewayDeps } from './gateway'
import type { ChapterDraftParsed } from './schemas'
import type { DraftDefect } from './provider'

export const MAX_REPAIR_ATTEMPTS = 2 // per lapis (Layer A)

export type GenerationStatus = 'PUBLISHED' | 'FAILED_REVIEW_REQUIRED'

export interface GenerationResult {
  status: GenerationStatus
  chapterNumber: number
  draft: ChapterDraftParsed | null
  attempts: number // jumlah repair attempt yang dijalankan
  findings: Finding[] // findings tersisa di akhir (untuk audit)
  reason?: string
}

/** Findings yang menuntut repair: CRITICAL atau MAJOR (MINOR hanya dicatat). */
function needsRepair(findings: Finding[]): boolean {
  return findings.some((f) => f.severity === 'CRITICAL' || f.severity === 'MAJOR')
}

/** Snapshot dianggap tak-boleh-berubah selama generasi; kunci audit sederhana. */
function canonFingerprint(s: CanonSnapshot): string {
  return JSON.stringify({
    c: s.characters.map((c) => c.id).sort(),
    f: s.facts.map((f) => f.id).sort(),
    sec: s.secrets.map((x) => x.id).sort(),
    th: s.threads.map((t) => t.id).sort(),
  })
}

export async function generateChapter(
  deps: GatewayDeps,
  args: {
    snapshot: CanonSnapshot
    blueprint: ChapterBlueprint
    chapterNumber: number
    injectDefects?: DraftDefect[]
  },
): Promise<GenerationResult> {
  const { snapshot, blueprint, chapterNumber } = args
  const fpBefore = canonFingerprint(snapshot)

  const plan = await generatePlan(deps, { snapshot, blueprint, chapterNumber })

  // Attempt awal (bukan repair).
  let draft = await writeChapter(deps, {
    snapshot,
    plan,
    injectDefects: args.injectDefects,
  })
  let result = validateLayerA(snapshot, draft)
  let attempts = 0

  // Loop repair: hanya bila ada CRITICAL/MAJOR & kuota tersisa.
  while (needsRepair(result.findings) && attempts < MAX_REPAIR_ATTEMPTS) {
    attempts++
    draft = await writeChapter(deps, {
      snapshot,
      plan,
      repairFindings: result.findings, // repair hanya terima findings + context
    })
    result = validateLayerA(snapshot, draft)
  }

  // Jaminan: canon tidak berubah selama generasi/repair.
  if (canonFingerprint(snapshot) !== fpBefore) {
    throw new Error('Invariant dilanggar: canon berubah selama generasi.')
  }

  if (needsRepair(result.findings)) {
    return {
      status: 'FAILED_REVIEW_REQUIRED',
      chapterNumber,
      draft: null,
      attempts,
      findings: result.findings,
      reason:
        result.blocking && attempts >= MAX_REPAIR_ATTEMPTS
          ? 'CRITICAL/MAJOR bertahan setelah 2 repair.'
          : 'Findings tak terselesaikan.',
    }
  }

  return {
    status: 'PUBLISHED',
    chapterNumber,
    draft,
    attempts,
    findings: result.findings, // mungkin berisi MINOR
  }
}
