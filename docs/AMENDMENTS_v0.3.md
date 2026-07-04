# Lakoku — Amandemen Dokumen v0.3

Status: APPLIED — §A telah diterapkan ke `docs/PRD_Lakoku_Interactive_v0.3.md`, §B telah diterapkan ke `docs/ARCHITECTURE_v1.1.md` (5 Juli 2026).
Dokumen sumber: PRD v0.2 Brand Aligned → v0.3, ARCHITECTURE v1 → v1.1, Brand Guidelines v1.1 (tidak berubah)
Dokumen baru terkait: `docs/NARRATIVE_CONSISTENCY_SPEC.md` (NCS v1.0), `docs/NARRATIVE_TRACEABILITY_MATRIX.md`

Daftar perubahan presisi yang harus diterapkan saat dokumen sumber direvisi ke versi berikutnya. Brand Guidelines tidak berubah.

---

## A. Amandemen PRD (v0.2 → v0.3)

### A1. §6.2 Struktur 50 Bab — tambah kolom "Checkpoint"

Tambahkan baris aturan setelah tabel:

> Pada akhir setiap act, sistem menjalankan Reconciliation Checkpoint (NCS §1) yang menyelaraskan rencana act berikutnya dengan konsekuensi pilihan pembaca, tanpa mengubah spine, reveal gate, atau ending rules.

Alasan: tabel act saat ini mengasumsikan rencana awal selalu tetap valid — asumsi ini gugur begitu pilihan L2/L3 terakumulasi.

### A2. §6.1 Batas Kombinasi MVP — perkuat aturan karakter

Ganti butir "Karakter baru penting setelah Chapter 30 dilarang kecuali sudah disiapkan dalam blueprint" menjadi:

> Karakter bernama baru setelah Bab 30 dilarang kecuali sudah ada di blueprint (dicek deterministik saat validasi, NCS §3.1). Setiap karakter memiliki alias registry dan voice sheet sejak opening package (NCS §5).

### A3. §8.2 Layer Choice Impact — tambah horizon eksplisit

Tambahkan kolom "Horizon konsistensi": L1 = bab yang sama; L2 = wajib terbayar naratif ≤ 3 bab (sudah ada di §8.3); L3 = tercermin di thread status dan ending eligibility, diaudit di checkpoint act.

### A4. §7.9 Generation Failure — tambah kategori review

Tambahkan: kegagalan konsistensi yang tidak bisa di-repair otomatis masuk antrian review manusia dengan bahasa pembaca yang aman (mis. "Cerita ini sedang dirapikan penulisnya"), sesuai lifecycle `FAILED_REVIEW_REQUIRED`.

### A5. §5.3 Target Internal Beta — tambah metrik konsistensi

Tambahkan target:

- `reader_inconsistency_report_rate` < 3% untuk story yang mencapai Bab 30+.
- 0 kontradiksi CRITICAL lolos publish pada soak test 50 bab (3 jalur) sebelum beta publik.

### A6. Baru — §6.6 Kontrak Konsistensi 50 Bab

Seksi baru yang merujuk NCS sebagai dokumen normatif untuk: hierarki memori T0–T3, thread lifecycle, alias registry, voice sheet, dan definisi sukses konsistensi.

---

## B. Amandemen ARCHITECTURE (v1 → v1.1)

### B1. §9.2 Canonical sources — tambah baris

| Domain | Canonical record | Derived |
|---|---|---|
| Alias karakter | `character_aliases` | Mention di prosa |
| Voice profile | `character_voice_sheets` | Gaya dialog di draft |
| Rollup memori | `act_rollups` (T1) | Chapter summaries (T2) |

### B2. §11.2 Workflow steps — terapkan delta NCS §6

Perubahan step 1, 2, 3, 6, 9 dan step baru Reconciliation, persis seperti tabel NCS §6.

### B3. §12.2 Chapter Context Packet — tambah field

Tambahkan ke payload: `act_rollups[]`, `active_threads_with_status[]`, `load_bearing_facts[]`, `voice_sheets[]`, `context_budget_report {}` (mencatat seksi yang dipangkas).

### B4. §12.3 Retrieval policy — tambah aturan

- Fakta ber-tag `LOAD_BEARING` tidak boleh dipangkas dari packet hingga terbayar.
- Compiler wajib mencatat exclusion list ke `retrieval_logs` untuk audit kontradiksi.

### B5. §13.1 Database domains — tambah tabel

Domain "Story spine/canon" ditambah: `character_aliases`, `character_voice_sheets`, `act_rollups`, kolom `facts_ledger.salience`, `facts_ledger.load_bearing`, `story_threads.payoff_window`, `story_threads.status`, `chapter_blueprints.version` + `reconciliation_reason`.

### B6. §17.3 / §17.4 Observability — tambah metrik & alert

- Dashboard Narrative quality memuat: `continuity_critical_rate` per nomor bab, `repair_success_rate`, `review_required_rate`, thread staleness.
- Alert baru: `continuity_critical_rate` naik monoton terhadap nomor bab (indikasi kegagalan kompaksi memori).

### B7. §18.2 Fixtures — tambah 5 fixture NCS §7

Soak test 50 bab (3 jalur), fixture drift, fixture kompaksi load-bearing, fixture alias, fixture thread staleness/blokir Bab 48.

### B8. §18.3 Release gates — tambah gate

Release template diblokir bila soak test 50 bab belum memenuhi Definisi Sukses NCS §8.

### B9. §24 Implementation Sequence — sisipkan di Phase B

Phase B (Narrative core prototype) ditambah deliverable: hierarki memori T0–T3 + validator lapis A deterministik + alias registry. Reconciliation checkpoint dan soak test penuh masuk Phase C (sebelum reader beta), karena beta tanpa keduanya akan menghasilkan cerita yang rusak justru pada pembaca paling loyal (yang mencapai bab jauh).

---

## C. Ringkasan Risiko yang Ditutup

| Risiko | Sebelum | Sesudah |
|---|---|---|
| Kontradiksi fakta di bab lanjut | Bergantung pada "validate continuity" tanpa spesifikasi | Validator 2 lapis + load-bearing facts + metrik terukur |
| Blueprint usang vs pilihan pembaca | Tidak ditangani | Reconciliation checkpoint per act + ending reachability check |
| Context overflow / fakta terpotong | Tidak ditangani | Hierarki memori T0–T3 + budget policy + exclusion audit |
| Mystery tidak dibayar di klimaks | Hanya aturan prosa di PRD | Thread lifecycle + blokir deterministik Bab 48 |
| Karakter ganda / voice berubah | Tidak ditangani | Alias registry + voice sheet + cek validator |
