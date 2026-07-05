/**
 * M4 — Skema output planner & writer (Zod) + kontrak internal gateway.
 *
 * Skema ini adalah gerbang: output provider HARUS parse di sini sebelum
 * menyentuh canon atau Layer A. Semua field memakai terminologi domain,
 * bukan istilah model/prompt/token (boundary consumer-safe di gateway.ts).
 */

import { z } from 'zod'

// ---------- Plan (WF step 2: Plan chapter) ----------

/** Batas terencana; Layer A tetap validasi angka final draft. */
export const NEW_THREAD_CUTOFF_CHAPTER = 41 // NCS §4.2: no new thread ≥ Bab 41

export const ChapterPlanSchema = z
  .object({
    storyId: z.string().min(1),
    chapterNumber: z.number().int().positive(),
    phase: z.string(),
    chapterGoal: z.string().min(1),
    plannedBeats: z.array(z.string().min(1)).min(1),
    targetWordCount: z.number().int().min(300).max(1200),
    targetSceneCount: z.number().int().min(1).max(6),
    /** Thread baru yang dibuka bab ini (harus kosong bila ≥ cutoff). */
    opensThreadId: z.string().nullable().default(null),
    /** Rahasia yang direncanakan dibuka (Layer A cek gate). */
    usesReveals: z.array(z.string()).default([]),
    /** Perubahan state terencana (harus ⊆ allowed_state_delta blueprint). */
    proposedStateDelta: z.record(z.string(), z.unknown()).default({}),
    /** Karakter baru bernama yang direncanakan diperkenalkan. */
    introducesCharacters: z.array(z.string()).default([]),
  })
  .strict()
  .superRefine((plan, ctx) => {
    if (plan.opensThreadId && plan.chapterNumber >= NEW_THREAD_CUTOFF_CHAPTER) {
      ctx.addIssue({
        code: 'custom',
        message: `Tidak boleh membuka thread baru pada Bab ${plan.chapterNumber} (≥ ${NEW_THREAD_CUTOFF_CHAPTER}).`,
        path: ['opensThreadId'],
      })
    }
  })

export type ChapterPlan = z.infer<typeof ChapterPlanSchema>

// ---------- Draft (WF step 4: Write prose) ----------

const ExtractedEventSchema = z
  .object({
    characterMention: z.string().min(1),
    description: z.string().min(1),
    ordinal: z.number().int().nonnegative(),
    occursAt: z.number().nullable(),
    isFlashback: z.boolean(),
  })
  .strict()

const KnowledgeAssertionSchema = z
  .object({
    characterMention: z.string().min(1),
    factId: z.string().min(1),
  })
  .strict()

const RevealAssertionSchema = z
  .object({ secretId: z.string().min(1) })
  .strict()

export const ChapterDraftSchema = z
  .object({
    storyId: z.string().min(1),
    chapterNumber: z.number().int().positive(),
    title: z.string().min(1),
    paragraphs: z.array(z.string().min(1)).min(1),
    wordCount: z.number().int().nonnegative(),
    sceneCount: z.number().int().nonnegative(),
    hasChoiceOrGate: z.boolean(),
    events: z.array(ExtractedEventSchema).default([]),
    knowledgeAssertions: z.array(KnowledgeAssertionSchema).default([]),
    reveals: z.array(RevealAssertionSchema).default([]),
    proposedStateDelta: z.record(z.string(), z.unknown()).default({}),
    newNamedCharacters: z.array(z.string()).default([]),
  })
  .strict()

export type ChapterDraftParsed = z.infer<typeof ChapterDraftSchema>

/** Hasil parse aman: sukses berisi data, gagal berisi pesan ringkas. */
export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] }

export function parsePlan(input: unknown): ParseResult<ChapterPlan> {
  const r = ChapterPlanSchema.safeParse(input)
  if (r.success) return { ok: true, data: r.data }
  return { ok: false, errors: r.error.issues.map(issueToString) }
}

export function parseDraft(input: unknown): ParseResult<ChapterDraftParsed> {
  const r = ChapterDraftSchema.safeParse(input)
  if (r.success) return { ok: true, data: r.data }
  return { ok: false, errors: r.error.issues.map(issueToString) }
}

function issueToString(i: {
  path: PropertyKey[]
  message: string
}): string {
  const path = i.path.length ? i.path.map(String).join('.') : '(root)'
  return `${path}: ${i.message}`
}
