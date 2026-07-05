/**
 * Layer B — Model-based continuity checks (NCS §3.1 lapis B).
 *
 * Di produksi, lapis ini dijalankan oleh validator model TERPISAH dari writer.
 * Di sini diimplementasikan sebagai simulasi DETERMINISTIK atas sinyal
 * terstruktur pada draft (dialogue, emotionBeats, softClaims) sehingga bisa
 * diuji tanpa LLM. Kontraknya identik: findings terstruktur berseverity.
 *
 *   - Kontradiksi fakta lunak terhadap fakta canon → MAJOR.
 *   - Konsistensi suara terhadap voice sheet (forbidden words) → MAJOR;
 *     penyimpangan register ringan → MINOR.
 *   - Emosi/reaksi vs relationship score saat ini → MAJOR bila berlawanan.
 *
 * CRITICAL memblokir publish; MAJOR masuk repair; MINOR hanya dicatat
 * (penegakan severity dilakukan pemanggil / loop repair).
 */

import type {
  CanonSnapshot,
  ChapterDraft,
  Finding,
  VoiceSheet,
} from './types'

/** Skor relationship berpasangan; kunci = `${a}|${b}` (urut alfabet). */
export type RelationshipScores = Record<string, number>

export interface LayerBContext {
  /** Skor relationship saat ini (-100..100). */
  relationships?: RelationshipScores
}

export interface LayerBResult {
  findings: Finding[]
  blocking: boolean // ada CRITICAL
}

export function relationshipKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** Cek voice: dialog karakter tak boleh memuat forbidden words voice sheet. */
function checkVoice(
  draft: ChapterDraft,
  voiceById: Map<string, VoiceSheet>,
): Finding[] {
  const findings: Finding[] = []
  for (const line of draft.dialogue ?? []) {
    const sheet = voiceById.get(line.characterId)
    if (!sheet) continue
    const tokens = new Set(tokenize(line.text))
    for (const forbidden of sheet.forbiddenWords) {
      const fTokens = tokenize(forbidden)
      const hit =
        fTokens.length === 1
          ? tokens.has(fTokens[0])
          : line.text.toLowerCase().includes(forbidden.toLowerCase())
      if (hit) {
        findings.push({
          code: 'VOICE_FORBIDDEN_WORD',
          severity: 'MAJOR',
          message: `Dialog ${line.characterId} memakai kata terlarang voice sheet: "${forbidden}".`,
          detail: { characterId: line.characterId, forbidden },
        })
      }
    }
  }
  return findings
}

/** Cek kontradiksi lunak: softClaim.agrees=false atas fakta canon relevan. */
function checkSoftContradictions(
  draft: ChapterDraft,
  factIds: Set<string>,
): Finding[] {
  const findings: Finding[] = []
  for (const claim of draft.softClaims ?? []) {
    if (!factIds.has(claim.factId)) {
      findings.push({
        code: 'SOFT_CLAIM_UNKNOWN_FACT',
        severity: 'MINOR',
        message: `Klaim lunak merujuk fakta tak dikenal: ${claim.factId}.`,
        detail: { factId: claim.factId },
      })
      continue
    }
    if (!claim.agrees) {
      findings.push({
        code: 'SOFT_CONTRADICTION',
        severity: 'MAJOR',
        message: `Kontradiksi lunak terhadap fakta canon ${claim.factId} (${claim.characterId}).`,
        detail: { factId: claim.factId, characterId: claim.characterId },
      })
    }
  }
  return findings
}

/** Cek emosi vs relationship score saat ini. */
function checkEmotionVsRelationship(
  draft: ChapterDraft,
  relationships: RelationshipScores,
): Finding[] {
  const findings: Finding[] = []
  for (const beat of draft.emotionBeats ?? []) {
    const key = relationshipKey(beat.characterId, beat.targetCharacterId)
    const score = relationships[key]
    if (score == null) continue // tak ada baseline → tak bisa dinilai
    const contradictsWarm = beat.valence === 'warm' && score <= -30
    const contradictsHostile = beat.valence === 'hostile' && score >= 30
    if (contradictsWarm || contradictsHostile) {
      findings.push({
        code: 'EMOTION_RELATIONSHIP_MISMATCH',
        severity: 'MAJOR',
        message: `Emosi "${beat.valence}" ${beat.characterId}→${beat.targetCharacterId} bertentangan dengan relationship score ${score}.`,
        detail: {
          pair: key,
          valence: beat.valence,
          score,
        },
      })
    }
  }
  return findings
}

export function validateLayerB(
  snapshot: CanonSnapshot,
  draft: ChapterDraft,
  ctx: LayerBContext = {},
): LayerBResult {
  const voiceById = new Map(snapshot.voiceSheets.map((v) => [v.characterId, v]))
  const factIds = new Set(snapshot.facts.map((f) => f.id))
  const relationships = ctx.relationships ?? {}

  const findings: Finding[] = [
    ...checkVoice(draft, voiceById),
    ...checkSoftContradictions(draft, factIds),
    ...checkEmotionVsRelationship(draft, relationships),
  ]

  return {
    findings,
    blocking: findings.some((f) => f.severity === 'CRITICAL'),
  }
}
