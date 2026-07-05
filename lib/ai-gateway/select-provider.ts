import 'server-only'
import { createDeterministicProvider } from './provider'
import type { GenerationProvider } from './provider'

/**
 * Seam pemilihan provider generasi (satu-satunya tempat runtime memutuskan
 * "otak" penulis). Konsumen lain hanya kenal kontrak GenerationProvider —
 * mengganti provider nyata (LLM via AI Gateway) nanti cukup di sini, tanpa
 * menyentuh workflow, compiler, atau validator.
 *
 * Saat ini default deterministik (tanpa LLM): jalur generasi tervalidasi sudah
 * hidup end-to-end. Ketika provider LLM tersedia, cabangkan di sini berdasarkan
 * env (mis. NARRATIVE_PROVIDER=gateway) — pipeline & boundary tetap sama.
 */
export function selectProvider(): GenerationProvider {
  // const mode = process.env.NARRATIVE_PROVIDER
  // if (mode === 'gateway') return createGatewayProvider()  // (M6)
  return createDeterministicProvider()
}
