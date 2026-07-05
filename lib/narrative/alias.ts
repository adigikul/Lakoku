/**
 * G5 — Alias registry & resolver.
 *
 * Setiap mention karakter di draft harus di-resolve ke character_id via
 * canonical name + registry alias (case-insensitive). Mention yang tak
 * ter-resolve adalah finding MAJOR — BUKAN karakter baru otomatis (NCS §5.1).
 */

import type { CanonSnapshot, Finding } from './types'

export interface AliasResolver {
  /** Kembalikan character_id untuk sebuah mention, atau null bila tak dikenal. */
  resolve(mention: string): string | null
  /** Semua character_id yang dikenal. */
  knownCharacterIds(): Set<string>
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Bangun resolver dari snapshot. Memetakan canonical name DAN semua alias
 * (lowercase) ke character_id. Bila ada tabrakan alias antar karakter,
 * pemetaan pertama menang dan sisanya diabaikan (registry seharusnya unik
 * per cerita — dijaga unique index di DB).
 */
export function buildAliasResolver(snapshot: CanonSnapshot): AliasResolver {
  const map = new Map<string, string>()

  for (const c of snapshot.characters) {
    const key = norm(c.canonicalName)
    if (!map.has(key)) map.set(key, c.id)
    // Izinkan resolve via id mentah juga (memudahkan fixture/testing).
    if (!map.has(norm(c.id))) map.set(norm(c.id), c.id)
  }
  for (const a of snapshot.aliases) {
    const key = norm(a.alias)
    if (!map.has(key)) map.set(key, a.characterId)
  }

  const ids = new Set(snapshot.characters.map((c) => c.id))

  return {
    resolve(mention: string): string | null {
      return map.get(norm(mention)) ?? null
    },
    knownCharacterIds() {
      return ids
    },
  }
}

/**
 * Resolve daftar mention; kumpulkan finding MAJOR untuk yang tak dikenal.
 * Mengembalikan peta mention→characterId (hanya yang ter-resolve).
 */
export function resolveMentions(
  resolver: AliasResolver,
  mentions: string[],
): { resolved: Map<string, string>; findings: Finding[] } {
  const resolved = new Map<string, string>()
  const findings: Finding[] = []
  const seenUnresolved = new Set<string>()

  for (const mention of mentions) {
    const id = resolver.resolve(mention)
    if (id) {
      resolved.set(mention, id)
    } else if (!seenUnresolved.has(norm(mention))) {
      seenUnresolved.add(norm(mention))
      findings.push({
        code: 'ALIAS_UNRESOLVED',
        severity: 'MAJOR',
        message: `Sebutan "${mention}" tidak dapat dipetakan ke karakter mana pun di registry.`,
        detail: { mention },
      })
    }
  }

  return { resolved, findings }
}
