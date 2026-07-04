# Lakoku — Narrative Traceability Matrix (NTM) v1.0

**Status:** Build-governance document
**Last updated:** 5 July 2026
**Owner:** Project lead / Narrative Operations
**Governs:** `PRD_Lakoku_Interactive_v0.3.md`, `ARCHITECTURE_v1.1.md`, `NARRATIVE_CONSISTENCY_SPEC.md` (NCS v1.0)

---

## 0. Kenapa Dokumen Ini Ada

PRD, ARCHITECTURE, dan NCS masing-masing benar, tetapi kebenaran itu tersebar. Risiko terbesar sebuah cerita 50 bab **bukan** karena satu mekanisme tidak dirancang — melainkan karena satu **mata rantai** (skema, validator, fixture, metrik, atau release gate) diam-diam terlewat saat implementasi, sehingga mekanisme yang dirancang tidak pernah benar-benar menutup gap-nya.

NTM adalah satu tabel penelusuran *end-to-end* untuk setiap gap konsistensi. Sebuah gap dianggap **DONE** hanya jika **seluruh kolom di barisnya** terbukti ada di kode, migrasi, test, dan dashboard. Ini adalah alat sign-off, bukan spesifikasi baru — spesifikasi tetap milik NCS.

**Aturan penggunaan:**
- Setiap PR yang mengklaim menutup sebagian gap harus mereferensikan ID baris NTM (mis. `G2-COMPACT`).
- Release template diblokir bila ada baris berstatus selain `DONE` untuk gap yang masuk scope release itu (selaras ARCHITECTURE §18.3 + NCS §8).
- Bila NCS berubah, NTM diperbarui di PR yang sama. NTM tidak boleh melenceng dari NCS.

---

## 1. Matriks Penelusuran Gap → Gate

Kolom: **Gap** (NCS) · **Requirement** · **Skema DB** · **Runtime/Validator** · **Fixture** · **Metrik** · **Release gate** · **Status**.

### G1 — Blueprint Reconciliation (NCS §1)

| ID | Requirement | Skema DB | Runtime/Validator | Fixture | Metrik | Release gate | Status |
|---|---|---|---|---|---|---|---|
| G1-VERSION | Blueprint versioned, bukan overwrite | `chapter_blueprints.version`, `.reconciled_from_version`, `.reconciliation_reason`; event `BLUEPRINT_RECONCILED` | Reconciliation step (WF step R) | drift fixture (Bab 20) | — | ARCH §18.3 soak | TODO |
| G1-DRIFT | Drift score goal-vs-state; ≥2 → regenerate goal | — | WF step 3 (validate plan) | drift fixture | `review_required_rate` | soak | TODO |
| G1-REACH | Ending reachability check tiap checkpoint | `ending_rules` | Reconciliation step | soak 3 jalur | "semua ending reachable" (NCS §8.3) | soak | TODO |
| G1-SPINE | Reconciliation tak boleh langgar spine/reveal gate/ending | spine layer immutable | WF step R hard rule; ARCH rule #17 | drift fixture | 0 pelanggaran spine | soak | TODO |

### G2 — Memory Compaction & Context Budget (NCS §2)

| ID | Requirement | Skema DB | Runtime/Validator | Fixture | Metrik | Release gate | Status |
|---|---|---|---|---|---|---|---|
| G2-TIERS | Hierarki T0–T3; T1 rollup otomatis saat act selesai | `act_rollups` (T1), `chapter_summaries` (T2) | WF step 1 & step 9 | soak (context di Bab 45 = T0+rollup+±8 summary) | cost/bab dalam guardrail (NCS §8.4) | soak | TODO |
| G2-BUDGET | Alokasi budget packet + aturan overflow | — | Context compiler; `context_budget_report{}` | load-bearing fixture | — | soak | TODO |
| G2-LOADBEAR | `LOAD_BEARING` tak pernah dipangkas sebelum dibayar; exclusion di-log | `facts_ledger.load_bearing`, `.salience`; `retrieval_logs` | Context compiler; ARCH rule #16 | load-bearing fixture (fakta Bab 3 muncul benar Bab 47) | — | soak | TODO |

### G3 — Continuity Validator (NCS §3)

| ID | Requirement | Skema DB | Runtime/Validator | Fixture | Metrik | Release gate | Status |
|---|---|---|---|---|---|---|---|
| G3-LAYERA | Cek deterministik (tanpa LLM): karakter hidup/terdaftar, no reveal pre-gate, knowledge scope, state delta ⊆ allowed, timeline, struktur bab, alias, karakter baru >Bab30 | `characters`, `character_states`, `secrets_reveals`, `knowledge_scopes`, `timeline_events`, `character_aliases` | WF step 6 Layer A | seeded contradiction, prohibited early reveal | `continuity_critical_rate` per bab | ARCH §18.3 | TODO |
| G3-LAYERB | Cek berbasis model: kontradiksi lunak, voice, emosi vs relationship | `character_voice_sheets` | WF step 6 Layer B | voice fixture | `continuity_critical_rate` | soak | TODO |
| G3-REPAIR | Maks 2 repair/lapis → `FAILED_REVIEW_REQUIRED`; repair tak hapus canon | — | WF step 8 | retry fixture | `repair_success_rate` | soak | TODO |
| G3-METRICS | Dashboard + alert monotonic | — | Observability (ARCH §17.3/§17.4) | — | `continuity_critical_rate`, `reader_inconsistency_report_rate` | beta gate (PRD §5.3) | TODO |

### G4 — Story Thread Lifecycle (NCS §4)

| ID | Requirement | Skema DB | Runtime/Validator | Fixture | Metrik | Release gate | Status |
|---|---|---|---|---|---|---|---|
| G4-STATUS | `OPEN→DEVELOPING→PAYOFF_DUE→RESOLVED\|ABANDONED_APPROVED` | `story_threads.status`, `.payoff_window` | WF step 2 & step 9 | thread fixture | thread staleness | soak | TODO |
| G4-BUDGET | Maks 7 thread aktif; no new thread ≥ Bab 41 | — | WF step 2 (plan) | thread fixture | — | soak | TODO |
| G4-STALE | Stale 6 bab → wajib callback ≤ 3 bab | — | Validator/planner | thread fixture | thread staleness | soak | TODO |
| G4-BLOCK48 | Publish Bab 48 diblokir bila mystery utama non-RESOLVED | `story_threads.status` | Deterministic check (Layer A) | Bab 48 unresolved fixture | — | soak | TODO |

### G5 — Entity Canonicalization & Voice (NCS §5)

| ID | Requirement | Skema DB | Runtime/Validator | Fixture | Metrik | Release gate | Status |
|---|---|---|---|---|---|---|---|
| G5-ALIAS | Setiap mention di-resolve ke `character_id`; unresolved = MAJOR, bukan karakter baru | `character_aliases (character_id, alias, alias_type)` | WF step 5 (extract) | alias fixture (3 sebutan, 1 bab) | — | soak | TODO |
| G5-NOCONFLICT | Fakta baru konflik utk entitas sama = CRITICAL, no last-write-wins | `facts_ledger` | WF step 6 Layer A | seeded contradiction | `continuity_critical_rate` | soak | TODO |
| G5-VOICE | Voice sheet dibuat saat opening package; masuk T0 utk karakter tampil; dicek Layer B | `character_voice_sheets` | Opening package WF; WF step 6 Layer B | voice fixture | — | soak | TODO |

---

## 2. Definisi "Siap 50 Bab" (ringkas, mengikat NCS §8)

Release template diblokir sampai, pada soak test staging:

1. **0 kontradiksi CRITICAL** lolos publish pada 3 jalur (high-trust, low-trust, mixed).
2. `reader_inconsistency_report_rate` beta **< 3%** untuk story Bab 30+.
3. **Semua ending reachable** pada setiap checkpoint di ketiga jalur.
4. **Biaya per bab** tetap dalam guardrail ARCHITECTURE §20.2 meski konteks tumbuh (bukti kompaksi bekerja).

Keempat butir ini identik dengan NCS §8 dan PRD §5.3; NTM hanya memastikan tiap butir punya baris yang bisa di-sign-off di §1.

---

## 3. Fase vs Gap (menegaskan ARCHITECTURE §24)

| Fase | Gap yang wajib DONE sebelum fase berikutnya | Alasan |
|---|---|---|
| Phase B — Narrative core | G2 (T0–T3 + budget), G3-LAYERA, G5-ALIAS | Fondasi memori + validator murah + kanonikalisasi adalah prasyarat generasi panjang. |
| Phase C — Reader beta | G1 (reconciliation), G3-LAYERB, G4 (lifecycle), soak test penuh | Tanpa ini, cerita rusak justru pada pembaca yang mencapai bab jauh. |

---

## 4. Cara Menutup Sebuah Baris (Definition of Done per baris)

Sebuah baris berpindah ke `DONE` hanya bila semuanya benar:

1. Migrasi skema ada di `packages/db` dan lulus migration test.
2. Perilaku runtime/validator ada di `packages/narrative-core` dan punya unit test.
3. Fixture terkait ada di `fixtures/narrative/` dan lulus di CI.
4. Metrik muncul di dashboard yang benar (bukan hanya di-log).
5. Release gate menolak build bila baris ini gagal (bukti: test negatif yang sengaja gagal).

Baris tanpa bukti kolom lengkap tetap `TODO`/`IN_PROGRESS`, apa pun klaim PR-nya.
