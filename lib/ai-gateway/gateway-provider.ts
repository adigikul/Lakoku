import 'server-only'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { CanonSnapshot, Finding } from '@lakoku/narrative-core'
import {
  createDeterministicProvider,
  type GenerationProvider,
  type PlanInput,
  type WriteInput,
} from './provider'
import { scanForLeaks } from './gateway'

/**
 * Provider LLM NYATA via Vercel AI Gateway.
 *
 * Strategi keamanan (KUNCI): semua metadata terstruktur yang divalidasi
 * Layer A/B — events, reveals, proposedStateDelta, knowledgeAssertions, sinyal
 * voice/emosi/soft-claim — tetap DITURUNKAN DETERMINISTIK dari canon + plan
 * (via provider deterministik). LLM HANYA menulis prosa yang dilihat pembaca
 * (judul + paragraf). Dengan begitu:
 *   - jaminan konsistensi canon (Layer A) & Layer B tidak bergantung pada model,
 *   - nilai AI nyata ada di kualitas prosa,
 *   - tidak ada metadata model/prompt/token yang bisa bocor ke pembaca
 *     (discan ulang di sini + di boundary gateway).
 *
 * `plan` mengikuti provider deterministik (canon-derived & tervalidasi gateway),
 * jadi seluruh logika reveal/state/thread yang kritis TIDAK diserahkan ke model.
 */

const DEFAULT_MODEL = 'openai/gpt-4.1-mini'
const TARGET_WORD_LOW = 560
const TARGET_WORD_HIGH = 760

/** Skema prosa yang diminta dari model — hanya konten naratif untuk pembaca. */
const ProseSchema = z.object({
  title: z
    .string()
    .min(1)
    .describe('Judul bab dalam Bahasa Indonesia, ringkas dan menggugah, tanpa nomor bab.'),
  paragraphs: z
    .array(z.string().min(1))
    .min(3)
    .max(8)
    .describe('Paragraf prosa naratif Bahasa Indonesia, urut, membentuk 2–4 adegan.'),
})

type ProseModel = {
  /** Model gateway, mis. "openai/gpt-4.1-mini". */
  model?: string
}

function countWords(paragraphs: string[]): number {
  return paragraphs.join(' ').split(/\s+/).filter(Boolean).length
}

function activeCharacterNames(snapshot: CanonSnapshot, chapter: number): string[] {
  return snapshot.characters
    .filter((c) => c.status !== 'DEAD' && c.introducedChapter <= chapter)
    .map((c) => c.canonicalName)
}

/** Ringkas findings jadi instruksi perbaikan singkat (repair pass). */
function repairHints(findings: Finding[] | undefined): string {
  if (!findings?.length) return ''
  const lines = findings
    .filter((f) => f.severity === 'CRITICAL' || f.severity === 'MAJOR')
    .map((f) => `- ${f.message}`)
  if (!lines.length) return ''
  return [
    '',
    'PERBAIKAN WAJIB (revisi sebelumnya bermasalah, perbaiki hal berikut):',
    ...lines,
  ].join('\n')
}

/** Bangun prompt penulisan bab dari plan + konteks canon (Bahasa Indonesia). */
function buildPrompt(args: {
  snapshot: CanonSnapshot
  plan: Record<string, unknown>
  repairFindings?: Finding[]
}): { system: string; prompt: string } {
  const { snapshot, plan } = args
  const chapter = Number(plan.chapterNumber)
  const names = activeCharacterNames(snapshot, chapter)
  const beats = Array.isArray(plan.plannedBeats) ? (plan.plannedBeats as string[]) : []
  const goal = String(plan.chapterGoal ?? '')
  const phase = String(plan.phase ?? '')
  const scenes = Number(plan.targetSceneCount ?? 3)

  const system = [
    'Anda penulis fiksi drama Bahasa Indonesia yang menulis prosa bab per bab.',
    'Tulis HANYA narasi cerita untuk dibaca pembaca akhir.',
    'DILARANG KERAS menyebut apa pun tentang AI, model, prompt, token, sistem,',
    'instruksi, atau proses teknis. Jangan menyapa pembaca atau memberi meta-komentar.',
    'Gunakan sudut pandang naratif yang konsisten, bahasa yang hidup dan menahan.',
  ].join(' ')

  const prompt = [
    `Tulis prosa untuk Bab ${chapter} sebuah drama berbahasa Indonesia.`,
    phase ? `Fase cerita: ${phase}.` : '',
    goal ? `Tujuan bab ini: ${goal}` : '',
    names.length ? `Tokoh yang boleh tampil (gunakan nama persis ini): ${names.join(', ')}.` : '',
    beats.length
      ? `Alurkan beat wajib berikut secara natural dan berurutan:\n${beats.map((b) => `- ${b}`).join('\n')}`
      : '',
    `Bentuk ${Math.min(Math.max(scenes, 2), 4)} adegan yang mengalir.`,
    `Panjang total ${TARGET_WORD_LOW}–${TARGET_WORD_HIGH} kata, dibagi ke beberapa paragraf.`,
    'Jangan memperkenalkan tokoh bernama baru di luar daftar di atas.',
    'Jangan membocorkan rahasia yang belum waktunya terungkap.',
    repairHints(args.repairFindings),
  ]
    .filter(Boolean)
    .join('\n\n')

  return { system, prompt }
}

/**
 * Hasilkan prosa via LLM dengan penjagaan: bila terdeteksi kebocoran istilah
 * internal, coba sekali lagi; bila masih bocor, lempar agar pipeline menangani
 * (fallback aman ditangani pemanggil bila perlu).
 */
async function generateProse(args: {
  model: string
  snapshot: CanonSnapshot
  plan: Record<string, unknown>
  repairFindings?: Finding[]
}): Promise<{ title: string; paragraphs: string[] }> {
  const { system, prompt } = buildPrompt(args)

  for (let attempt = 0; attempt < 2; attempt++) {
    const { object } = await generateObject({
      model: args.model,
      schema: ProseSchema,
      system,
      prompt:
        attempt === 0
          ? prompt
          : `${prompt}\n\nCATATAN: revisi sebelumnya memuat istilah teknis terlarang. Tulis ulang murni sebagai narasi cerita.`,
    })
    const blob = [object.title, ...object.paragraphs].join('\n')
    if (scanForLeaks(blob).length === 0) {
      return { title: object.title, paragraphs: object.paragraphs }
    }
  }
  throw new Error('gateway-provider: prosa LLM memuat istilah internal setelah 2 percobaan.')
}

/**
 * Provider LLM nyata. `generatePlan` & scaffold metadata memakai provider
 * deterministik (canon-safe); hanya prosa yang berasal dari model.
 */
export function createGatewayProvider(opts: ProseModel = {}): GenerationProvider {
  const base = createDeterministicProvider()
  const model = opts.model ?? process.env.NARRATIVE_MODEL ?? DEFAULT_MODEL

  return {
    name: `gateway:${model}`,

    // Plan tetap canon-derived (aman); model tidak menyentuh logika reveal/state.
    generatePlan(input: PlanInput): Promise<unknown> {
      return base.generatePlan(input)
    },

    async writeChapter(input: WriteInput): Promise<unknown> {
      // 1) Scaffold canon-safe (semua metadata terstruktur & sinyal Layer B).
      const scaffold = (await base.writeChapter(input)) as Record<string, unknown>

      // 2) Prosa nyata dari LLM.
      const { title, paragraphs } = await generateProse({
        model,
        snapshot: input.snapshot,
        plan: input.plan as Record<string, unknown>,
        repairFindings: input.repairFindings,
      })

      // 3) Gabungkan: prosa model menggantikan judul/paragraf; sisanya canon-safe.
      return {
        ...scaffold,
        title,
        paragraphs,
        wordCount: countWords(paragraphs),
      }
    },
  }
}
