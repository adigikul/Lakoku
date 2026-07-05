import 'server-only'
import { createDeterministicProvider } from './provider'
import { createGatewayProvider } from './gateway-provider'
import type { GenerationProvider } from './provider'

/**
 * Seam pemilihan provider generasi (satu-satunya tempat runtime memutuskan
 * "otak" penulis). Konsumen lain hanya kenal kontrak GenerationProvider —
 * pipeline, compiler, & validator tak berubah apa pun provider yang dipakai.
 *
 * Mode (env `NARRATIVE_PROVIDER`):
 *   - `gateway` → LLM nyata via Vercel AI Gateway (butuh AI_GATEWAY_API_KEY;
 *     model dari `NARRATIVE_MODEL`, default openai/gpt-4.1-mini). Hanya prosa
 *     yang dari model; metadata terstruktur tetap canon-derived (lihat
 *     gateway-provider.ts).
 *   - selain itu (default) → deterministik tanpa LLM (gratis, dipakai harness).
 */
export function selectProvider(): GenerationProvider {
  if (process.env.NARRATIVE_PROVIDER === 'gateway') {
    return createGatewayProvider()
  }
  return createDeterministicProvider()
}
