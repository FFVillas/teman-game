# Pengujian TemanGame

Bahan pengujian sesuai *Draft Revisi Proposal 20 November*, 3.1.6. Tidak ada hasil
uji di folder ini yang dikarang: semua yang belum dijalankan tertulis
"Belum dijalankan".

| Bagian | File | Status |
|---|---|---|
| Black-box: kebutuhan, kasus uji, RTM, decision table, state transition | `blackbox/TemanGame_BlackBox_RTM.xlsx` | Siap diisi; belum dijalankan |
| Non-fungsional: k6 breakpoint test | `k6/` | Belum dibuat |
| Core Web Vitals (web-vitals, p75) dan Lighthouse | `web-vitals/` | Belum dibuat |
| Uji notifikasi push (≥ 95% per platform) | `push/` | Belum dibuat |
| Checklist instalasi PWA | `pwa/` | Belum dibuat |
| Seed lobi uji (±10 per gim) dan reset antarpasangan | `seed/` | Belum dibuat |
| Analisis sensitivitas bobot (±0,10 + tambahan) | `sensitivity/` | Belum dibuat |
| SUS, UI/UX, kuesioner, lembar observasi | — | Disusun tim |

## Black-box workbook

- **Kebutuhan**: F-01 sampai F-25, dari use case dan 3.2.4; fitur di luar paper
  ditandai "Tambahan implementasi".
- **Kasus Uji**: 146 kasus (TC-01 … TC-146), masing-masing dengan teknik (EP,
  BVA, DT, ST) dan jalur (UI atau API). Yang diisi tim hanya sel kuning: Hasil
  Aktual, Status, Tester, Tanggal, Bukti.
- **RTM**: daftar kasus uji per kebutuhan, ditambah jumlah Pass, Fail, Blocked
  dan belum dijalankan yang dihitung otomatis dari kolom Status.
- **Decision Table**: DT-01 melamar lobi, DT-02 menerima lamaran, DT-03 memberi
  rating, DT-04 penyaringan daftar LFG.
- **State Transition**: lobi, lamaran, laporan.
- **Perhitungan S_total**: hasil yang diharapkan untuk TC-66 dan TC-67, dengan
  bobot 0,40 / 0,28 / 0,32 (sama dengan kode). Contoh paper: 0,75 tanpa tag dan
  0,83 dengan semua tag terpenuhi.
- **Ringkasan**: total per status, teknik dan jalur.

Kasus berjalur **API** dijalankan di **lingkungan uji** (project Supabase
kedua) dengan token akun uji, untuk nilai yang tidak bisa diketik di UI
(rating 0/6, playstyle 0/6, slot 0/1/maks+1) dan untuk memastikan aturan
ditegakkan di server. Kondisi waktu (durasi 15 menit, kedaluwarsa 6 jam, rilis
48 jam) disiapkan dengan mengatur timestamp lewat SQL di lingkungan uji.

Workbook dibuat dengan rumus; Excel dan Google Sheets menghitungnya saat file
dibuka.
