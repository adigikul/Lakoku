/**
 * Pembacaan status lease generasi (server-only, operasional).
 *
 * `generation_leases` memakai RLS TANPA policy baca publik, jadi client anon
 * tidak bisa membacanya. Status ketersediaan bab (untuk layar reader-safe)
 * karenanya dibaca lewat admin client di sisi server, dan HANYA dipetakan ke
 * enum kasar `ChapterAvailability` — tak ada detail teknis yang keluar.
 */
import 'server-only'
import { createAdminClient } from '@lakoku/db'

/**
 * true bila ada lease generasi AKTIF (belum kedaluwarsa) untuk (story, bab):
 * artinya bab itu sedang ditulis. Best-effort — kegagalan baca dianggap
 * "tidak sedang disiapkan" agar layar reader tetap anggun.
 */
export async function isChapterPreparing(
  storyId: string,
  chapterNumber: number,
): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('generation_leases')
      .select('id, expires_at')
      .eq('story_id', storyId)
      .eq('chapter_number', chapterNumber)
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()
    if (error) return false
    return data != null
  } catch {
    return false
  }
}
