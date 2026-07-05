/**
 * Adaptive goal-authoring (T7.5) — penulis-goal LLM untuk reconciliation checkpoint.
 *
 * Saat drift ≥ ambang di batas act, `runReconciliationAdaptive` (narrative-core)
 * memanggil GoalAuthorFn untuk MENULIS ULANG chapterGoal (lapis trajectory) agar
 * selaras dengan state pembaca yang sebenarnya — TANPA menyentuh spine:
 *   - goal baru tetap harus menuju semua mandatoryBeats bab itu;
 *   - goal baru TIDAK boleh menyinggung reveal yang masih terlarang (forbiddenReveals);
 *   - bahasa aman-pembaca (tanpa istilah teknis internal).
 *
 * Output LLM divalidasi berlapis; bila gagal → kembalikan null agar caller
 * jatuh ke fallback deterministik (checkpoint tak pernah buntu).
 */
import 'server-only'
import { z } from 'zod'
import type { GoalAuthorContext, GoalAuthorFn } from '@lakoku/narrative-core'
import { scanForLeaks } from '@lakoku/ai-gateway'
import { authorObject } from './model'

const GoalSchema = z.object({
  chapterGoal: z
    .string()
    .min(20)
    .max(280)
    .describe(
      'Satu kalimat tujuan bab yang selaras dengan keadaan cerita terkini. Bahasa cerita, bukan istilah teknis.',
    ),
})

const SYSTEM = [
  'Kamu editor naratif drama serial Bahasa Indonesia.',
  'Tugasmu MENULIS ULANG "tujuan bab" agar cocok dengan keadaan cerita yang sebenarnya,',
  'sambil TETAP mengarah ke beat wajib bab tersebut dan TIDAK membocorkan rahasia yang belum waktunya.',
  'Tulis satu kalimat ringkas, konkret, dan sinematik dalam Bahasa Indonesia.',
  'JANGAN menyebut istilah teknis apa pun (model, prompt, token, AI, sistem, versi, blueprint).',
].join(' ')

function buildPrompt(ctx: GoalAuthorContext): string {
  return [
    `Bab ${ctx.chapterNumber} (fase: ${ctx.phase}).`,
    `Tujuan lama (sudah melenceng): "${ctx.currentGoal}".`,
    ctx.mandatoryBeats.length
      ? `Beat WAJIB yang tetap harus dituju bab ini:\n${ctx.mandatoryBeats.map((b) => `- ${b}`).join('\n')}`
      : 'Tidak ada beat wajib khusus bab ini.',
    ctx.forbiddenReveals.length
      ? `JANGAN singgung/pancing rahasia berikut (belum waktunya): ${ctx.forbiddenReveals.join(', ')}.`
      : '',
    ctx.activeFlags.length ? `Keadaan cerita saat ini: ${ctx.activeFlags.join(', ')}.` : '',
    ctx.availableClues.length ? `Petunjuk yang sudah diketahui tokoh: ${ctx.availableClues.join(', ')}.` : '',
    'Kembalikan tujuan bab yang baru: relevan dengan keadaan terkini, tetap menuju beat wajib, tanpa membocorkan rahasia terlarang.',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Validasi output goal terhadap pagar aman-pembaca & spine.
 * @returns goal bersih (trim) bila lolos, atau null bila ditolak.
 */
export function validateAuthoredGoal(goal: string, ctx: GoalAuthorContext): string | null {
  const clean = goal.trim()
  if (clean.length < 20) return null

  // 1) Tak boleh membocorkan istilah teknis internal.
  if (scanForLeaks(clean).length > 0) return null

  // 2) Tak boleh menyinggung id rahasia yang masih terlarang (anti reveal dini).
  const lower = clean.toLowerCase()
  for (const secretId of ctx.forbiddenReveals) {
    if (secretId && lower.includes(secretId.toLowerCase())) return null
  }

  return clean
}

/**
 * Factory GoalAuthorFn berbasis LLM authoring. Diinjeksi ke
 * `runReconciliationAdaptive` oleh runtime/server action.
 */
export function makeGoalAuthor(): GoalAuthorFn {
  return async (ctx: GoalAuthorContext): Promise<string | null> => {
    try {
      const { object } = await authorObject({
        schema: GoalSchema,
        system: SYSTEM,
        prompt: buildPrompt(ctx),
      })
      return validateAuthoredGoal(object.chapterGoal, ctx)
    } catch (err) {
      console.log('[v0] authorChapterGoal gagal:', (err as Error)?.message)
      return null
    }
  }
}

/** Panggilan tunggal (dipakai test/observability). */
export async function authorChapterGoal(ctx: GoalAuthorContext): Promise<string | null> {
  return makeGoalAuthor()(ctx)
}
