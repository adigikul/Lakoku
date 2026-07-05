/**
 * Kontrak domain narrative-core (M3) — cerminan skema canon di Supabase.
 *
 * Snapshot in-memory ini dipakai oleh context compiler & Layer A validator
 * agar deterministik dan bisa diuji tanpa DB. Loader terpisah
 * (`lib/narrative/loader.ts`) mengisi snapshot dari Supabase.
 */

export type CharacterStatus = 'ALIVE' | 'DEAD' | 'INACTIVE'
export type AliasType = 'NAME' | 'NICKNAME' | 'RELATION' | 'TITLE'
export type ThreadStatus =
  | 'OPEN'
  | 'DEVELOPING'
  | 'PAYOFF_DUE'
  | 'RESOLVED'
  | 'ABANDONED_APPROVED'

export interface Character {
  id: string
  storyId: string
  canonicalName: string
  role: string
  motivation: string
  introducedChapter: number
  status: CharacterStatus
}

export interface CharacterAlias {
  characterId: string
  alias: string
  aliasType: AliasType
}

export interface VoiceSheet {
  characterId: string
  register: string
  speechHabits: string[]
  forbiddenWords: string[]
  sampleLines: string[]
}

export interface Fact {
  id: string
  storyId: string
  statement: string
  subjectCharacterId: string | null
  establishedChapter: number
  salience: number
  loadBearing: boolean
  paidOff: boolean
}

/** Siapa mengetahui fakta apa, sejak bab berapa. */
export interface KnowledgeScope {
  characterId: string
  factId: string
  knownFromChapter: number
}

export interface SecretReveal {
  id: string
  description: string
  revealGateChapter: number
  revealed: boolean
}

export interface TimelineEvent {
  chapterNumber: number
  ordinal: number
  description: string
  isFlashback: boolean
  occursAt: number | null
}

export interface StoryThread {
  id: string
  title: string
  status: ThreadStatus
  openedChapter: number
  lastTouchedChapter: number
  payoffWindow: number | null
  isMainMystery: boolean
  /** Flag staleness (NCS §4.2) — terpisah dari status; thread bisa OPEN+stale. */
  stale?: boolean
  staleSinceChapter?: number | null
}

export interface ActRollup {
  actNumber: number
  summary: string
  stateDelta: Record<string, unknown>
  coversFromChapter: number
  coversToChapter: number
}

export interface ChapterBlueprint {
  chapterNumber: number
  version: number
  phase: string
  chapterGoal: string
  mandatoryBeats: string[]
  forbiddenReveals: string[]
  allowedStateDelta: Record<string, unknown>
  introducesCharacters: string[]
  reconciledFromVersion: number | null
  reconciliationReason: string | null
}

/** Snapshot canon lengkap satu cerita untuk kompilasi & validasi. */
export interface CanonSnapshot {
  storyId: string
  characters: Character[]
  aliases: CharacterAlias[]
  voiceSheets: VoiceSheet[]
  facts: Fact[]
  knowledge: KnowledgeScope[]
  secrets: SecretReveal[]
  timeline: TimelineEvent[]
  threads: StoryThread[]
  actRollups: ActRollup[]
  blueprints: ChapterBlueprint[]
}

// ---------- Draft yang divalidasi (output planner/writer nanti) ----------

/** Event yang diekstrak dari draft bab untuk validasi. */
export interface ExtractedEvent {
  /** Mention karakter mentah (nama/alias) di dalam prosa. */
  characterMention: string
  /** Deskripsi aksi/kejadian. */
  description: string
  /** Ordinal dalam bab (untuk cek timeline monotonic). */
  ordinal: number
  occursAt: number | null
  isFlashback: boolean
}

/** Atribusi pengetahuan: karakter X "tahu" fakta Y di dalam draft. */
export interface KnowledgeAssertion {
  characterMention: string
  factId: string
}

/** Reveal rahasia yang muncul di draft. */
export interface RevealAssertion {
  secretId: string
}

/** State delta yang diusulkan draft (harus ⊆ allowed_state_delta). */
export type StateDelta = Record<string, unknown>

/** Draft bab yang akan divalidasi Layer A. */
export interface ChapterDraft {
  storyId: string
  chapterNumber: number
  title: string
  paragraphs: string[]
  wordCount: number
  sceneCount: number
  hasChoiceOrGate: boolean
  events: ExtractedEvent[]
  knowledgeAssertions: KnowledgeAssertion[]
  reveals: RevealAssertion[]
  proposedStateDelta: StateDelta
  /** character_id karakter baru yang muncul (sudah ter-resolve/bernama). */
  newNamedCharacters: string[]

  // ---- Input opsional untuk Layer B (model-based checks) ----
  /** Baris dialog dengan atribusi pembicara (uji voice sheet). */
  dialogue?: DialogueLine[]
  /** Beat emosi antar-karakter (uji vs relationship score). */
  emotionBeats?: EmotionBeat[]
  /** Klaim fakta lunak yang menyetujui/menentang fakta canon. */
  softClaims?: SoftClaim[]
  /** thread_id yang dimajukan/disentuh bab ini (uji lifecycle G4). */
  advancedThreadIds?: string[]
  /** true bila draft membuka thread naratif baru. */
  opensNewThread?: boolean
}

export interface DialogueLine {
  characterId: string
  text: string
}

export type EmotionValence = 'warm' | 'neutral' | 'cold' | 'hostile'

export interface EmotionBeat {
  characterId: string
  targetCharacterId: string
  valence: EmotionValence
}

export interface SoftClaim {
  characterId: string
  factId: string
  /** true = draft konsisten dgn fakta; false = menentang (kontradiksi lunak). */
  agrees: boolean
}

// ---------- Findings ----------

export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR'

export interface Finding {
  code: string
  severity: Severity
  message: string
  detail?: Record<string, unknown>
}
