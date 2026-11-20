# Rencana Kerja: Revisi Proposal → Siap Deploy

Dokumen kerja untuk tim dan untuk agen/AI yang mengerjakan kode ini.
**Berdiri sendiri** — tidak perlu membuka Google Doc revisinya.

- **Sumber revisi:** Google Doc "Draft Proposal Revisi 14 Oktober DOCS"
  (hijau = versi baru, merah = dicoret pembimbing).
- **Status:** keputusan di §3 sudah final per 15 November 2026, kecuali yang
  ditandai ⚠️.
- **Baca juga:** `AGENTS.md` (aturan repo), `docs/thesis-divergences.md`
  (perlu diperbarui setelah pekerjaan ini — kolom statusnya sudah basi).

---

## 1. Keadaan sekarang dalam satu paragraf

Aplikasinya jalan dan tersambung database: autentikasi, profil, katalog gim,
lobi penuh (buat–lamar–mulai–akhiri–undang–chat), pesan, notifikasi, dan social
sudah nyata. Yang belum nyata: **reputasi** — jantung skripsi ini. Tabel
`reviews` belum ada, jadi variabel R di rumus tidak punya sumber data. Konsol
admin tampilannya lengkap tapi seluruhnya berjalan di atas data palsu di
`localStorage`. Di samping itu, revisi 14 Oktober mengubah rumus rekomendasi
secara fundamental, sehingga `src/lib/recommendation.ts` sekarang
mengimplementasikan rumus yang **sudah dicoret pembimbing**.

---

## 2. Rumus final sesudah revisi

Penomoran mengikuti penomoran baru di dokumen.

### Skor utama

```
S_total = 0.40·P + 0.28·R + 0.32·T                      (3.1)
```

Bobotnya **dihitung dari kuesioner**, bukan dipilih: pada Gambar L2.9 gaya
bermain disebut 81 responden, kecocokan personalitas 65, dan sikap positif
57; masing-masing dibagi total 203 menghasilkan 0,399, 0,320, dan 0,281.

⚠️ **Dokumen ini sempat menulis 0,40 / 0,30 / 0,30, dan kode mengikutinya
sampai 20 November 2026.** Kedua contoh perhitungan di proposal hampir tidak
membedakan keduanya — contoh pertama (P = R = 0,75 tanpa tag) menghasilkan
0,75 pada bobot apa pun, karena rata-rata tertimbang dari nilai yang sama
tidak bergantung pada bobot. Hanya contoh kedua yang memisahkan: P = R = 0,75
dengan T = 1 bernilai **0,83** pada bobot yang benar dan 0,825 pada yang
lama, dan proposal mencetak 0,83. Keduanya kini jadi kasus uji di
`src/lib/recommendation.test.ts`.

**Tidak ada pengali `M_rank`.** Kalau lobi tidak menetapkan tag sama sekali
(`|B| = 0`), komponen T dikeluarkan dan bobotnya dinormalisasi ulang:

```
S_total = (0.40·P + 0.28·R) / 0.68                      (3.15)
```

Pembagian 0,68 menjaga perbandingan P : R tetap 10 : 7. Jangan pakai
`T = 1` sebagai jalan pintas — itu memberi lobi tanpa kriteria skor 0,32
gratis sehingga mengalahkan lobi yang tag-nya benar-benar cocok.

Karena pertanyaan kuesionernya boleh dijawab lebih dari satu, bobot ini
mengukur **berapa banyak orang menyebut suatu faktor penting**, bukan
seberapa penting faktornya. Proposal karenanya menjanjikan **analisis
sensitivitas ±0,10** pada tiap bobot — jadi bobotnya akan diubah-ubah saat
evaluasi. Biarkan tetap di satu tempat (`SCORE_WEIGHTS`), dan jangan
menuliskan angkanya lagi di tempat lain; test pun membacanya dari sana.

### P — gaya bermain

```
P = 1 − |Pa − Pb| / 4                                   (3.2)
```

`Pa` playstyle pelamar, `Pb` playstyle **lobi** (bukan playstyle leader —
lihat §5.4). Skala 1–5 dengan definisi tetap:

| Tingkat | Label | Deskripsi |
|---|---|---|
| 1 | Sangat Kasual | Bermain untuk bersantai; hasil tidak jadi perhatian utama |
| 2 | Kasual | Ingin menang tapi santai, terbuka mencoba hero/agen/strategi baru |
| 3 | Seimbang | Serius selama pertandingan, tidak menargetkan kenaikan rank |
| 4 | Kompetitif | Fokus menang dan naik rank, mengikuti strategi tim |
| 5 | Sangat Kompetitif | Menargetkan rank tinggi, menuntut koordinasi maksimal |

### R — reputasi

```
R = (R* − 1) / 4                                        (3.3)
```

Min-max, **bukan** `R*/5`. Alasan untuk sidang: rating minimum adalah 1
bintang, jadi dengan `R*/5` nilai R tidak pernah bisa di bawah 0.20 — 20%
rentang terbuang dan R tidak setara dengan P dan T yang berentang penuh 0–1.

**R bersifat dua arah (reciprocal recommender):**

- Leader meninjau pelamar → `R` = reputasi pelamar.
- Pelamar meninjau daftar lobi → `R` = `R_lobi`, rata-rata reputasi **seluruh
  anggota lobi saat itu**, termasuk leader:

```
R_lobi = (1/|L|) · Σ R_u , untuk u ∈ L                  (3.4)
```

### R* — skor reputasi skala bintang

Empat tahap, **wajib dihitung di server**, tidak boleh di klien.

**Tahap 1 — koreksi bias penilai.** Rata-rata Bayesian dari rating yang pernah
*diberikan* penilai `j`:

```
r̄*_j = (C·m + Σ g_{j,q}) / (C + n_j)                    (3.5)
b_j   = r̄*_j − m                                        (3.6)
r̃_i   = clamp(r_i − b_j, 1, 5)                          (3.7)
```

**Tahap 2 — bobot rating.** Satu penilai satu suara terhadap satu pengguna:

```
w_i = 1 / k_i                                           (3.8)
```

`k_i` = berapa kali penilai yang sama menilai pengguna yang sama di dalam
jendela. `w_i = 0` untuk rating rendah yang alasannya di luar perilaku.

**Tahap 3 — jendela rating.**

```
N = (z·σ / E)² = (1.96 × 1 / 0.4)² ≈ 24 → N = 25        (3.9)
```

Hanya 25 rating terakhir dihitung. Pengguna dengan < 25 rating memakai seluruh
ratingnya.

**Tahap 4 — rata-rata Bayesian berbobot.**

```
R* = (C·m + Σ w_i·r̃_i) / (C + Σ w_i)                    (3.10)
C  = σ² / τ²                                            (3.11)
```

**Nilai tetap:** `m = 3` (sebelum ada data platform), `C = 5`, `σ = 1`,
`E = 0.4`. Lihat §3.3 — jangan menghitung ulang `C` dari data UAT.

**Yang ditampilkan di profil** adalah rata-rata sederhana, bukan `R*`:

```
R̄_tampil = (1/|W|) · Σ r_i                              (3.12)
```

### T — kecocokan personalitas

```
s_t = (p_t + n_t) / max(p_t' + n_t')                    (3.13)
T   = Σ s_t / |B| , untuk t ∈ B                         (3.14)
```

- `p_t` = 1 kalau pengguna memilih tag itu sendiri saat buat akun, 0 kalau tidak.
- `n_t` = jumlah **penilai berbeda** yang memberi tag itu dalam 25 rating terakhir.
- Pembagi = jumlah suara terbanyak di antara seluruh tag milik pengguna.
- `B` = tag ideal yang dicari lobi, **maksimal 3**.
- `s_t = 0` kalau pelamar tidak punya tag itu.
- Pengguna baru yang belum dinilai: `s_t = 1` untuk semua tag pilihannya.

Contoh dari dokumen: pengguna memilih Chill, PMA, Shot Caller. Penilai memberi
Chill 8×, Flex Player 6×, PMA 3×, Shot Caller 0×. Suara terbanyak = Chill
(1+8 = 9). Maka Chill = 1.00, Flex Player = 0.67, PMA = 0.44, Shot Caller = 0.11.
Kalau lobi mencari Chill + Flex Player → T = (1.00 + 0.67)/2 = 0.83.

---

## 3. Keputusan tim — final

### 3.1 Status lobi: nama ikut skripsi, `scheduled` tetap, `full` diturunkan

| Kode sekarang | Jadi | Catatan |
|---|---|---|
| `live` | `open` | ganti nama |
| `started` | `in_progress` | ganti nama |
| `completed` | `completed` | tetap |
| `closed` | `cancelled` | ganti nama |
| `scheduled` | `scheduled` | **dipertahankan**, tidak ada di skripsi |
| — | ~~`full`~~ | **jangan disimpan sebagai status** |

**Kenapa `full` tidak disimpan:** penuh atau tidak bisa diturunkan dari
`capacity` dikurangi jumlah anggota. Menyimpannya adalah denormalisasi — suatu
saat anggota keluar tapi status lupa diubah, dan datanya jadi bohong.

**Kenapa `scheduled` tetap:** skripsi menghapusnya dari daftar status tapi
tetap mempertahankan kolom jadwal di tabel `lobby`. Itu kontradiksi di dalam
dokumen, dan fiturnya sudah jalan di kode.

### 3.2 Role = penyaring opsional, bukan filter mutlak

Pemain bisa menyaring daftar lobi berdasarkan role, tapi lobi yang mencari
"Duelist" **tetap terlihat** oleh pemain Sentinel. Alasannya: pemain sering
bersedia pindah role, dan menyembunyikan lobi sepenuhnya mengurangi penemuan
tanpa manfaat sepadan.

Konsekuensi: role **tidak** masuk `can_join_lobby()` sebagai syarat keras.
Tiga gim tanpa role (CS2, PUBG Mobile, Free Fire) otomatis melewati penyaring
ini — `game.roles` kosong untuk mereka.

Ini berbeda dari teks skripsi yang menyebut role sebagai variabel mutlak
ketiga. Catat di `docs/thesis-divergences.md`.

### 3.3 `C`, `σ²`, `τ²` dikunci, tidak dihitung dari UAT

Dokumen menjanjikan `σ²` dan `τ²` "dihitung ulang menggunakan data hasil UAT".
**Itu tidak bisa dipenuhi.** Empirical Bayes butuh banyak pengguna dengan
banyak rating masing-masing; dengan **12 partisipan UAT** (2 pemain aktif per
gim, purposive — Hwang & Salvendy 2010 untuk 10±2, Tullis & Stetson 2004
untuk SUS yang andal) estimasinya tidak bermakna. Kunci `C = 5`, tulis
sebagai keterbatasan di BAB 4.

**Konsekuensi yang harus diketahui sejak awal:** pada skala UAT, `n_t` hampir
selalu 0, sehingga `s_t = 1` untuk semua tag pilihan sendiri — artinya **rumus
T baru akan menghasilkan angka identik dengan rumus lama**. Tetap bangun
penyimpanannya supaya data terkumpul, tapi jangan berharap evaluasi
menunjukkan perbedaan.

### 3.4 Jenis sanksi: hapus `ban`

Hanya **peringatan** dan **penangguhan berdurasi**. Kode sekarang menawarkan
tiga (`warning`, `suspension`, `ban`); `ban` permanen tidak punya durasi
sehingga tidak termodelkan di tabel `sanction` versi skripsi.

Skripsi juga **mencoret** "pemotongan skor reputasi" sebagai jenis sanksi
(tanda `[D4]`). Reputasi tidak boleh diubah admin — hanya naik-turun dari
rating pemain. Kode sudah benar di sini.

### 3.5 Penamaan tabel diselaraskan ke skripsi

| Kode sekarang | Jadi |
|---|---|
| `games` | `game` |
| `lobbies` | `lobby` |
| `game_ranks` | `rank_tier` |
| `game_roles` | `game_role` |
| `lobby_roles` | `lobby_required_role` |
| `profiles` | **tetap `profiles`** — lihat di bawah |

**Satu pengecualian: `profiles` jangan diubah jadi `user`.** `user` adalah
kata kunci yang dicadangkan PostgreSQL, jadi setiap kueri harus menuliskannya
dalam tanda kutip (`"user"`) seumur hidup proyek. Lagi pula skripsi versi revisi
**sudah mengakui** bahwa kredensial ditangani Supabase Auth dan tabel ini hanya
menyimpan profil — jadi pemetaan `user` (ERD) → `profiles` + `auth.users`
(implementasi) tinggal dijelaskan satu kalimat di BAB 4.

Tabel yang tidak ada di ERD skripsi (`notifications`, `game_modes`,
`lobby_invites`, `profile_private`, `blocks`, `news`, `admins`) tetap dengan
namanya sekarang dan dicatat sebagai penambahan.

### 3.6 `admins` dipertahankan

Tidak diubah jadi `access_role` + `user_access_role`. Alasannya sudah tertulis
di `docs/thesis-divergences.md` dan bisa dibela: moderator tidak boleh menilai
laporan dari akun yang dia pakai bermain. Tetap dicatat sebagai penyimpangan
sadar.

### 3.7 ⚠️ Rating tertunda — asumsi, belum dikonfirmasi

Aturan baru: skor profil diperbarui setelah semua anggota menilai **atau**
lewat 48 jam.

**Asumsi:** tidak membuat layar "penilaian tertunda" baru. Pakai jalur yang
sudah ada — `/profile/<user>/matches/<id>`, dengan `MatchTeammate.reviewed`
menandai siapa yang belum dinilai. Konfirmasi kalau pembimbing meminta layar
tersendiri.

---

## 4. Papan progres

Diperbarui 16 November 2026. Centang berarti sudah dijalankan di database dan
kodenya ikut dipindahkan.

| Fase | Bagian | Status |
|---|---|---|
| 0 | Buang `M_rank`, renormalisasi \|B\|=0, umur 18, hapus sanksi `ban` | ✅ selesai |
| 1 | §6.0 Rename tabel + status + kolom playstyle | ✅ selesai |
| 1 | §6.1a `tag`, `user_tag`, pindah kode tag, playstyle wajib, gerbang onboarding | ✅ selesai |
| 1 | §6.1b `reviews`, `review_tag`, `submit_review`, aturan 15 menit | ✅ selesai |
| 1 | §6.1c Perhitungan Bayesian (Pers. 3.5-3.12), penundaan 48 jam | ✅ selesai |
| 1 | §6.1d `lobby_tag` + `set_lobby_preferences` | ✅ selesai |
| 1 | §6.1e `sanction`, `reports` | ✅ selesai |
| 1 | §6.3a `tag_strengths()`, kekuatan tag di skor, `lobbyReputation()` | ✅ selesai |
| 1 | §6.3b Form lobi ke `set_lobby_preferences` (+ UI playstyle & tag) | ✅ selesai |
| 2 | Daftar lobi diurutkan `S_total` (+ `R_lobi`), filter rank/role/region/mode, `/api/lobbies/recommended`, Vitest, seed 30 lobi uji | ✅ selesai (17 Nov) |
| 2 | Alur penilaian di lobi sungguhan ke `submit_review` (+ alasan 1–2 bintang, tag urut kekuatan), riwayat match nyata (`player_matches`), laporan tersimpan + bukti | ✅ selesai (18 Nov) — migrasi `20261118000000`, `20261118000100` |
| 2 | Tujuh lubang UI, admin ke Supabase, `AdminGate` ke RLS | ⬜ belum |
| 3 | PWA, FCM, black-box test, deploy | ⬜ belum |

> ⚠️ **Untuk yang melanjutkan:** kesepuluh migrasi di bawah **sudah dijalankan**
> di database Supabase bersama. Jangan dijalankan ulang — beberapa di antaranya
> (`alter table ... rename`, `insert` data tag) akan gagal atau menggandakan
> data. Migrasi di proyek ini diterapkan manual lewat SQL editor, tidak ada
> pelacakan otomatis, jadi daftar ini yang jadi catatannya.

**Migrasi yang sudah dijalankan**, berurutan: `20261115000000_minimum_age_18`,
`20261115000100_thesis_naming`, `20261115000200_lobby_playstyle_grant`,
`20261116000000_personality_tags`, `20261116000100_user_tag_minimum`,
`20261116000200_reviews`, `20261116000300_reputation_bayes`,
`20261116000400_lobby_preferences`, `20260919000200_reports_moderation`
(ditulis September, sengaja ditahan sampai November),
`20261116000500_tag_strengths`.

**Keputusan yang berubah sejak rencana awal:**

- `lobby_member` tetap **view**, bukan tabel. Keanggotaan diturunkan dari
  `lobby.leader_id` dan `applications` yang diterima, jadi tidak bisa melenceng.
- `profiles` tidak diubah jadi `user` (kata kunci PostgreSQL).
- Playstyle ikut jadi wajib di onboarding, bukan hanya tag: keduanya masukan
  rumus. Sebelumnya form memilihkan nilai 3 tanpa pengguna menyentuhnya, dan
  itu mengisi 40% bobot skor dengan angka karangan.
- `reviews` tidak punya kebijakan select sama sekali — syarat anonimitas.
- Status laporan ikut nama skripsi: `pending`, `resolved`, `rejected`.
  `in_review` tambahan kami (admin mengklaim kasus agar dua moderator tidak
  mengerjakan laporan yang sama).
- `create_lobby` dan `update_lobby` **tidak** jadi ditulis ulang. Preferensi
  lobi (playstyle, tag) ditulis fungsi tersendiri `set_lobby_preferences`,
  karena menyalin ulang 239 baris SQL tanpa bisa mengujinya lebih dulu
  berisiko merusak pembuatan lobi yang sudah berjalan.

## 5. Rencana kerja empat fase

Fase 0 bisa dimulai hari ini. Fase 1 adalah penghalang untuk hampir semua
sisanya.

| Fase | Isi | Penghalang |
|---|---|---|
| **0** | Perbaikan yang tidak butuh tabel baru | — |
| **1** | Tabel baru + mesin reputasi | Fase 0 selesai |
| **2** | UI yang menyusul data + admin disambungkan | Fase 1 |
| **3** | Sisa menuju deploy | Fase 2 |

---

## 6. Fase 0 — status

**Selesai dan terverifikasi (15 November 2026):** §5.1, §5.2, §5.3, §5.7.
Typecheck, lint dan `npm run build` bersih; perubahan rumus diuji terhadap dua
contoh angka di dokumen skripsi.

**Dipindahkan ke awal Fase 1:** §5.4, §5.5, §5.6 — alasannya di §5.9.

### 5.1 Buang `M_rank` — `src/lib/recommendation.ts`

Hapus `rankMultiplier()`, `RANK_TOLERANCE`, `RANK_MAX_PENALTY`, `RANK_FLOOR`,
dan perkaliannya di `scoreMatch()`. Perbarui komentar blok di bagian atas file
(masih menuliskan rumus lama secara verbatim).

`rankOrdinal()` **tetap dipakai** — untuk penyaring rentang rank, bukan skor.

**Alasan (tulis di komentar kode):** rank sudah jadi penyaring, jadi semua
kandidat yang tersisa sudah diterima leader. Mengalikannya lagi menghukum orang
yang sudah lolos. Lebih parah: kandidat dengan kecocokan sosial sempurna dan
ΔR = 10 mendapat 1.0 × 0.30 = **0.30**, kalah dari kandidat biasa-biasa saja
serank yang mendapat 0.5 × 1.0 = **0.50** — persis membalik temuan survei bahwa
gaya bermain (79,3%) lebih penting daripada skill (46,6%).

### 5.2 Renormalisasi `|B| = 0` — `src/lib/recommendation.ts`

`tagScore()` sekarang mengembalikan `1` saat `wantedTags` kosong. Ganti: kalau
`|B| = 0`, pakai Persamaan 3.15.

### 5.3 Umur 13 → 18

Trigger 13 tahun ada di `20261003000000_profiles_dossier.sql`. **Jangan edit
migrasi yang sudah dijalankan** — buat migrasi baru bertanggal. Perbarui juga
teks errornya dan `tooYoung()` di `src/lib/profiles.ts`.

Dasar: UU PDP No. 27 Tahun 2022 — pemrosesan data anak butuh persetujuan wali.
Bukan preferensi.

### 5.4 – 5.6 Dipindahkan ke Fase 1 — lihat §5.9

Kolom playstyle lobi, penggantian nama status, penggantian nama tabel.

### 5.7 Hapus jenis sanksi `ban`

`src/data/admin-moderation.ts` (`SanctionType`), `SanctionModal.tsx`,
`src/lib/admin.ts` (`accountStatus`, `describeSanction`, saran sanksi), dan
`20260919000200_reports_moderation.sql` yang belum dijalankan.

### 5.8 Perbaiki `wantedTags` yang kosong

`src/components/lobby/RealInvitePlayersModal.tsx:121` mengirim
`wantedTags: []`. Artinya **T selalu bernilai 1 di lobi sungguhan sekarang** —
komponen personalitas tidak berpengaruh apa pun pada pengurutan. Bukan akibat
revisi; sudah begitu sejak awal. Tuntas setelah `lobby_tag` ada (Fase 1), tapi
catat sekarang supaya tidak terlupa.

### 5.9 Kenapa §5.4–§5.6 dipindahkan ke Fase 1

Ketiganya tampak terpisah, tapi semuanya menuntut **menulis ulang lapisan
fungsi lobi** — pekerjaan yang sama yang sudah dijadwalkan di Fase 1.

Pemeriksaan pada 15 November menemukan:

- **20 fungsi database** menyentuh `public.lobbies` atau literal status
  (`'live'`, `'closed'`, `'started'`), tersebar di 8 berkas migrasi.
- Badan fungsi plpgsql disimpan sebagai **teks** dan baru diurai saat
  dijalankan. Jadi `alter table ... rename` **tidak** ikut memperbarui isinya —
  setiap fungsi yang menyebut nama lama gagal saat dipanggil, bukan saat
  migrasi dijalankan. Gagalnya baru ketahuan ketika pemain memakai aplikasi.
- Hal yang sama berlaku untuk nilai status: mengganti check constraint tanpa
  menulis ulang fungsi yang menuliskan `status = 'live'` membuat pembuatan
  lobi gagal.
- Menambah `p_playstyle` ke `create_lobby` mengubah signature-nya, jadi fungsi
  itu harus di-`drop` dan dibuat ulang utuh.

Sementara itu Fase 1 **sudah** akan menulis ulang `create_lobby`,
`update_lobby`, `apply_to_lobby`, `respond_to_application`, `leave_lobby`,
`remove_member`, `start_lobby` dan `close_lobby` untuk `lobby_tag`,
`lobby_member`, dan aturan rating 15 menit — mayoritas dari 20 fungsi tadi.

Mengerjakan rename sekarang berarti menulis ulang 20 fungsi, lalu menulis
ulang sebagian besarnya lagi beberapa minggu kemudian. Digabung jadi satu
penulisan ulang dengan nama baru langsung terpasang: separuh pekerjaan,
separuh risiko, dan satu kali pengujian alur lobi alih-alih dua.

---

## 7. Fase 1 — tabel baru dan mesin reputasi

Inti skripsi. Tanpa ini, variabel R tidak punya sumber data dan konsol admin
tidak bisa lepas dari data palsu.

### 6.0 Nama tabel, nama status, kolom playstyle — **selesai ditulis**

Migrasi: `20261115000100_thesis_naming.sql`. **Belum dijalankan.**

Yang dilakukan:

- Ganti nama tabel sesuai §3.5; `lobby_members` (view) ikut jadi `lobby_member`.
- Ganti nama status sesuai §3.1, berikut memindahkan data yang sudah ada dan
  mengganti check constraint serta default-nya.
- Tambah kolom `lobby.playstyle` (nullable dulu).
- Menulis ulang badan fungsi lewat `pg_get_functiondef()` alih-alih menyalin
  ulang ke-20 fungsi: yang diperbaiki adalah definisi yang benar-benar hidup di
  database, bukan versi di berkas migrasi yang mungkin sudah usang. Ditutup
  blok pemeriksaan yang melempar exception kalau masih ada fungsi memakai nama
  lama.

Sisi TypeScript sudah ikut diubah, termasuk **embedded resource** di
`fetchGameCatalog` (`game_ranks(...)` → `rank_tier(...)`) yang paling mudah
terlewat karena ada di dalam string `select`.

**Belum:** parameter `p_playstyle` pada `create_lobby` / `update_lobby`. Itu
mengubah signature sehingga fungsinya harus dibuat ulang utuh — dan keduanya
akan ditulis ulang lagi saat `lobby_tag` masuk (§6.1). Dikerjakan sekali di
sana.

Uji seluruh alur lobi sesudah SQL dijalankan: buat, lamar, terima, mulai,
akhiri, undang, keluarkan anggota, chat.

### 6.1 Tabel yang dibuat

`tag`, `user_tag`, `review_tag`, `lobby_tag`, `lobby_member`, `reviews`,
`sanction`, `reports`.

Catatan rancangan:

- Tag personalitas sekarang disimpan sebagai `profiles.personality_tags text[]`.
  Skripsi **secara eksplisit menolak** itu dengan alasan bentuk normal pertama
  (1NF) — pecah jadi `tag` + `user_tag`.
- `reviews` butuh `rater_bias`, `corrected_rating`, `reviewer_weight`,
  `low_rating_reason`. Ketiga yang pertama dihitung **saat ulasan dikirim**
  berdasarkan riwayat penilai sebelum rating itu, lalu disimpan — bukan dihitung
  ulang setiap dibaca.
- `lobby_member` di kode ada sebagai **view**, bukan tabel. Cek apakah
  `joined_at` tersedia sebelum memutuskan mengubahnya jadi tabel.
- `sanction` hanya `warning` dan `suspension` (§3.4), dengan waktu mulai dan
  berakhir.

### 6.2 Aturan yang ditegakkan database

- Rating hanya dari lobi `completed` yang sudah berjalan **minimal 15 menit**
  (selisih waktu mulai dan selesai). Mencegah leader memulai lalu langsung
  menyelesaikan lobi bersama akun sendiri.
- Satu pengguna satu rating per anggota per lobi.
- Rating **anonim**; skor profil diperbarui setelah semua anggota menilai atau
  48 jam berlalu.
- Rating 1–2 bintang **wajib** disertai alasan: AFK, provokasi/flaming,
  sabotase/trolling, atau pelecehan verbal. Tidak memengaruhi skor, hanya
  catatan moderasi.
- `R*` dan `R` **hanya dihitung di server**.
- Pengguna dengan penangguhan aktif dibuang dari rekomendasi **sebelum** skor
  dihitung, bukan diberi skor rendah.

### 6.3 Kode yang mengikuti

- Tulis ulang `reputationScore()` jadi Persamaan 3.3 + 3.5–3.11, di SQL.
- Tulis ulang `tagScore()` jadi Persamaan 3.13–3.14.
- Tambahkan `R_lobi` (Persamaan 3.4) untuk arah pelamar → lobi.
- Sambungkan `src/lib/invite-candidates.ts` ke sumber reputasi yang baru.

---

## 8. Fase 2 — UI yang menyusul data

### 7.1 Tujuh lubang UI

| # | Layar | Yang kurang | Kenapa wajib |
|---|---|---|---|
| 1 | `src/components/lfg/LfgTeamCard.tsx` | Reputasi tiap anggota | `R_lobi` itu rata-rata, satu anggota toksik tersembunyi. Skripsi **eksplisit** mensyaratkan kartu menampilkannya |
| 2 | `src/components/lobby/RatingModal.tsx` | Alasan wajib untuk rating 1–2 | Simpan di `reviews.low_rating_reason` |
| 3 | `src/components/lobby/RatingModal.tsx` | Urutan tag berdasarkan kekuatan | Tag terkuat di atas, **tanpa terpilih otomatis**. Skripsi mengakui ini menimbulkan bias posisi — catat sebagai keterbatasan |
| 4 | Profil pemain | Label "Pemain Baru" | Wajib kalau penilai < 5 orang berbeda. Beda dari "No ratings yet" yang sudah ada (itu untuk 0 rating) |
| 5 | Profil pemain | **Riwayat sanksi** | Indikator paling berguna menurut 63,8% responden. Sudah ada di layar admin, belum di profil yang dilihat pemain lain |
| 6 | `src/components/lfg/CreateTeamForm.tsx` | Playstyle lobi; tag dibatasi 3 | `Pb` tidak punya sumber; `\|B\|` harus ≤ 3 |
| 7 | Onboarding | Minimum 3 tag | Skripsi mewajibkan 3–5 saat buat akun |

Tambahan: rating **anonim** — UI tidak boleh membocorkan siapa yang menilai,
dan sebaiknya ada keterangan bahwa skor diperbarui setelah semua menilai atau
48 jam.

### 7.2 Konsol admin disambungkan ke Supabase

Layarnya **sudah lengkap dan alurnya sudah benar** — `ReportCase.tsx:315`
bahkan sudah menampilkan riwayat sanksi terlapor seperti yang diminta skripsi.
Yang kurang hanya datanya.

- `AdminDataContext` membaca `createSeedAdminData()` + `localStorage`
  (`temangame:admin-data:v1`). **Tidak ada satu pun panggilan Supabase di
  seluruh folder admin.** Ganti dengan pembacaan `reports` dan `sanction`.
- Selaraskan status laporan: `open` → `pending`, `dismissed` → ditolak,
  `resolved`/`closed` → selesai.
- Admin perlu bisa melihat `low_rating_reason` sebagai bahan moderasi.
- `AdminGate` masih pengecekan di sisi klien. Pindahkan ke `proxy.ts` +
  kebijakan RLS pada tabel moderasi. Sampai itu terjadi, konsol admin **tidak
  aman** dan tidak boleh dianggap terlindungi.

---

## 9. Fase 3 — sisa menuju deploy

Yang berikut belum pernah disentuh sama sekali.

| Pekerjaan | Keadaan | Wajib untuk skripsi? |
|---|---|---|
| **PWA**: `manifest`, service worker | Tidak ada file apa pun | **Ya** — ada di judul dan rumusan masalah |
| **Push FCM** | Tidak ada | **Ya** — fitur nomor 5 di §3.2.4 skripsi |
| **Filter LFG disambungkan ke daftar** | `LfgSearchBar` ada, hasilnya tidak menyaring apa-apa | **Ya** — fitur nomor 1 di §3.2.4 |
| **Black-box testing** | Tidak ada test runner di `package.json` | **Ya** — BAB 2 dan 3 menjanjikan equivalence partitioning, boundary value, decision table, state transition |
| **UAT** | Belum | **Ya** |
| Buang sisa mock | 12 komponen masih mengimpor `lfg-teams`, `social-friends`, `player-profiles`, `lfg-candidates` | Sebagian — lobi contoh boleh tinggal untuk demo |
| `/matches` pakai data nyata | Masih mock-only | Sebaiknya |
| Form laporan benar-benar menyimpan | Hanya menampilkan toast | **Ya** (tuntas di Fase 1) |
| `connected_accounts` | Belum ada | Tidak — Discord dicoret dari ruang lingkup, lobi hanya menyematkan tautan |
| Konfigurasi deploy, variabel lingkungan | Baru `.env.local` lokal | **Ya** |

**Catatan black-box testing:** skripsi sudah menyebut teknik dan contohnya —
nilai rating 0, 1, 5, 6; playstyle 1–5; jumlah slot lobi; decision table untuk
penyaringan lobi dan penerimaan lamaran; state transition untuk siklus status
lobi dan status lamaran (`pending`, `accepted`, `rejected`). Rancang kasus
ujinya mengikuti daftar itu supaya BAB 4 tinggal melaporkan hasil.

---

## 10. Aturan repo yang gampang dilanggar

Sudah ada di `AGENTS.md`, tapi paling sering kena:

- **Jangan pernah mengedit migrasi yang sudah dijalankan.** Tambah migrasi baru
  bertanggal.
- Migrasi dijalankan **manual oleh pemilik repo** di SQL editor Supabase. Agen
  tidak bisa menjalankan DDL — tulis filenya, lalu beri tahu untuk dijalankan.
- **Jangan pakai `.upsert()`** pada `profiles` dan `profile_private`. Tabel itu
  memberi hak UPDATE per kolom, dan PostgREST menerjemahkan upsert jadi
  `insert … on conflict do update set <semua kolom>` sehingga kena
  `42501 permission denied`. Pola benar: update dulu, insert kalau tidak ada
  baris. Contoh: `saveDateOfBirth()` di `src/lib/profiles.ts`.
- Semua penulisan data lobi lewat fungsi database, bukan insert dari browser.
- Kunci `sb_secret_…` tidak boleh masuk frontend.
- Jangan pilih kolom lobi dengan `*` — `lobby_voice_link` tertutup dari API.

---

## 11. Inkonsistensi yang masih ada di dokumen skripsi

Laporkan ke tim, jangan diperbaiki sepihak di kode:

1. **Data dictionary masih merujuk ΔR dan "Persamaan 3.5"** di dua tempat
   (deskripsi tabel `rank_tier` dan `user_game_mapping`). Padahal Persamaan 3.5
   lama (`M_rank`) sudah dicoret, dan 3.5 yang baru adalah rumus rata-rata
   rating penilai. Tabel `rank_tier` tetap dibutuhkan — untuk penyaring rentang
   rank, bukan ΔR.
2. **Status `full` dan hilangnya `scheduled`** bertabrakan dengan kolom jadwal
   yang tetap ada di tabel `lobby` (§3.1).
3. **Role sebagai variabel mutlak ketiga** bertentangan dengan keputusan tim
   (§3.2).
4. **Penamaan tunggal/jamak tidak konsisten** di ERD: `tag`, `sanction`,
   `lobby_member` tunggal; `reviews`, `reports`, `applications` jamak. Kode akan
   mengikuti apa adanya sesuai keputusan §3.5, tapi sebaiknya dirapikan di
   dokumen.
