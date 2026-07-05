/**
 * Seed CANON nyata dari fixture 50-bab ke Supabase, sehingga loader canon
 * (lib/narrative/loader.ts) punya data untuk dibaca dan workflow generasi
 * nyata bisa memproduksi bab end-to-end.
 *
 * Jalankan:
 *   set -a && source /vercel/share/.env.project && set +a && npx tsx scripts/seed-canon.ts
 *
 * Idempotent: hapus canon story lalu insert ulang (delete-then-insert).
 * Memakai service role key — HANYA untuk script/server.
 */
import { createClient } from '@supabase/supabase-js'
import { buildFixtureSnapshot, FIXTURE_STORY_ID } from '../fixtures/narrative/fixture-50'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di env.')
  process.exit(1)
}
const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const STORY = FIXTURE_STORY_ID

async function del(table: string, column = 'story_id') {
  const { error } = await db.from(table).delete().eq(column, STORY)
  if (error) throw new Error(`delete ${table}: ${error.message}`)
}

async function ins(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const { error } = await db.from(table).insert(rows)
  if (error) throw new Error(`insert ${table}: ${error.message}`)
  console.log(`[seed-canon] ${table}: ${rows.length} baris`)
}

async function main() {
  const s = buildFixtureSnapshot()

  // 0) Story shell (FK target untuk chapters/canon). Upsert idempoten.
  const { error: eStory } = await db.from('stories').upsert({
    id: STORY,
    title: 'Warisan yang Terkubur',
    cover: '/placeholder.svg?height=400&width=300',
    tagline: 'Drama keluarga yang ditenun jalur cerita AI, bab demi bab.',
    role: 'Rani, sang pewaris',
    tropes: ['misteri keluarga', 'pengkhianatan', 'penebusan'],
    total_chapters: 50,
    synopsis:
      'Rani pulang untuk memakamkan ayahnya dan menemukan warisan yang menyembunyikan kebenaran berbahaya.',
    status: 'BARU',
    current_chapter: 0,
    jejak: [],
    ending_name: null,
  })
  if (eStory) throw new Error(`stories: ${eStory.message}`)
  console.log('[seed-canon] stories: 1 baris (shell)')

  // 1) Bersihkan canon lama story ini (urutan bebas; tak ada FK antar-canon ketat).
  for (const t of [
    'chapter_blueprints',
    'act_rollups',
    'story_threads',
    'timeline_events',
    'secrets_reveals',
    'knowledge_scopes',
    'facts_ledger',
    'character_voice_sheets',
    'character_aliases',
    'characters',
  ]) {
    await del(t)
  }
  // character_states dikunci oleh character_id (tanpa story_id) → hapus per karakter.
  const charIds = s.characters.map((c) => c.id)
  if (charIds.length) {
    const { error } = await db.from('character_states').delete().in('character_id', charIds)
    if (error) throw new Error(`delete character_states: ${error.message}`)
  }

  // 2) Insert canon.
  await ins(
    'characters',
    s.characters.map((c) => ({
      id: c.id,
      story_id: STORY,
      canonical_name: c.canonicalName,
      role: c.role,
      motivation: c.motivation,
      introduced_chapter: c.introducedChapter,
    })),
  )

  await ins(
    'character_states',
    s.characters.map((c) => ({
      character_id: c.id,
      as_of_chapter: c.introducedChapter,
      status: c.status,
      attributes: {},
    })),
  )

  await ins(
    'character_aliases',
    s.aliases.map((a) => ({
      story_id: STORY,
      character_id: a.characterId,
      alias: a.alias,
      alias_type: a.aliasType,
    })),
  )

  await ins(
    'character_voice_sheets',
    s.voiceSheets.map((v) => ({
      story_id: STORY,
      character_id: v.characterId,
      register: v.register,
      speech_habits: v.speechHabits,
      forbidden_words: v.forbiddenWords,
      sample_lines: v.sampleLines,
    })),
  )

  await ins(
    'facts_ledger',
    s.facts.map((f) => ({
      id: f.id,
      story_id: STORY,
      statement: f.statement,
      subject_character_id: f.subjectCharacterId,
      established_chapter: f.establishedChapter,
      salience: f.salience,
      load_bearing: f.loadBearing,
      paid_off: f.paidOff,
    })),
  )

  await ins(
    'knowledge_scopes',
    s.knowledge.map((k) => ({
      story_id: STORY,
      character_id: k.characterId,
      fact_id: k.factId,
      known_from_chapter: k.knownFromChapter,
    })),
  )

  await ins(
    'secrets_reveals',
    s.secrets.map((x) => ({
      id: x.id,
      story_id: STORY,
      description: x.description,
      reveal_gate_chapter: x.revealGateChapter,
      revealed: x.revealed,
    })),
  )

  await ins(
    'story_threads',
    s.threads.map((t) => ({
      id: t.id,
      story_id: STORY,
      title: t.title,
      status: t.status,
      opened_chapter: t.openedChapter,
      last_touched_chapter: t.lastTouchedChapter,
      payoff_window: t.payoffWindow,
      is_main_mystery: t.isMainMystery,
      stale: t.stale ?? false,
      stale_since_chapter: t.staleSinceChapter ?? null,
    })),
  )

  await ins(
    'act_rollups',
    s.actRollups.map((r) => ({
      story_id: STORY,
      act_number: r.actNumber,
      summary: r.summary,
      state_delta: r.stateDelta,
      covers_from_chapter: r.coversFromChapter,
      covers_to_chapter: r.coversToChapter,
    })),
  )

  await ins(
    'chapter_blueprints',
    s.blueprints.map((b) => ({
      story_id: STORY,
      chapter_number: b.chapterNumber,
      version: b.version,
      phase: b.phase,
      chapter_goal: b.chapterGoal,
      mandatory_beats: b.mandatoryBeats,
      forbidden_reveals: b.forbiddenReveals,
      allowed_state_delta: b.allowedStateDelta,
      introduces_characters: b.introducesCharacters,
      reconciled_from_version: b.reconciledFromVersion,
      reconciliation_reason: b.reconciliationReason,
    })),
  )

  console.log(`[seed-canon] selesai untuk story "${STORY}".`)
}

main().catch((err) => {
  console.error('[seed-canon] gagal:', err.message)
  process.exit(1)
})
