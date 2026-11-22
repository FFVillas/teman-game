# Rencana pengujian — dari Black-box sampai UAT

Menerjemahkan janji evaluasi di proposal (§3, Rumusan Masalah 4) menjadi
sesuatu yang bisa dijalankan. **Angka batas di dokumen ini diambil dari
constraint yang benar-benar berlaku di database dan kode**, bukan dikarang —
setiap nilai bisa ditelusuri ke berkas migrasinya.

Dokumen pendamping: [`proposal-revision-2026-10.md`](proposal-revision-2026-10.md)
untuk rumusnya, [`thesis-divergences.md`](thesis-divergences.md) untuk setiap
tempat build menyimpang dari proposal.

---

## 1. Urutan, dan kenapa begitu

Proposal menyebut lima evaluasi tetapi **tidak mengunci urutannya**. Urutan di
bawah ini yang masuk akal, dan sudah tersirat di proposal sendiri:

> *"UAT hanya mencakup skenario inti, sedangkan pengujian menyeluruh per fitur
> dilakukan melalui Black-box Testing."*

```
Fase A  (internal, tim sendiri)         Fase B  (dengan partisipan)
┌──────────────────────────┐            ┌──────────────────────────────┐
│ 1. Black-box Testing     │            │ 4. UAT + SUS                 │
│ 2. Non-Functional Eval.  │   ──────▶  │ 5. Evaluasi UI/UX            │
│ 3. Seed data disiapkan   │            │ 6. Matching Accuracy (P@5)   │
└──────────────────────────┘            └──────────────────────────────┘
```

Tiga alasan urutan ini benar, dan ketiganya layak ditulis di BAB 3:

1. **Partisipan UAT hanya bisa diundang sekali.** Kalau mereka menemukan bug
   fungsional yang seharusnya tertangkap black-box, sesi itu habis untuk
   melaporkan bug, bukan untuk mengukur penerimaan — dan skor SUS-nya jadi
   mengukur kualitas build, bukan kualitas rancangan.
2. **Black-box dikerjakan tim sendiri** ("dilakukan secara internal oleh tim
   pengembang"), jadi tidak bergantung pada jadwal siapa pun.
3. **Nomor 4, 5, dan 6 terjadi di sesi yang sama.** Partisipan menjalankan
   tugas (UAT), waktunya dicatat (UI/UX), lalu mengisi SUS dan menandai lima
   lobi teratas (P@5). Satu pertemuan, empat keluaran.

**Yang mudah terlewat:** Evaluasi UI/UX butuh **sesi kedua 3–7 hari kemudian**
untuk faktor *retention over time*. Jadwalkan sejak awal, jangan sampai
partisipan sudah hilang.

---

## 2. Target yang dijanjikan proposal

Ini daftar periksa BAB 4. Semua angka diambil langsung dari proposal.

| Evaluasi | Ukuran | Target | Rujukan proposal |
|---|---|---|---|
| Black-box | Seluruh kebutuhan fungsional termasuk Admin | semua kasus uji lulus | §3 |
| Non-functional | Waktu respons API (p95) | **< 1 detik** | ISO/IEC 25010 |
| Non-functional | LCP / INP / CLS | **≤ 2,5 s / ≤ 200 ms / ≤ 0,1** | Core Web Vitals |
| Non-functional | Uji beban 50 VU | galat **< 1%** | — |
| Non-functional | Pengiriman push | **≥ 95%** | — |
| UAT | Task completion rate | **≥ 80%** | Sauro (2011) |
| UAT | Skor SUS | **≥ 68**, dilaporkan dengan CI 95% | Lewis & Sauro (2018) |
| UI/UX | 8 butir Golden Rules + 5 butir kepuasan | diuji terhadap netral 3, α = 0,05 | Shneiderman et al. (2016) |
| Matching accuracy | Precision@5 | **≥ 0,6** | Aggarwal (2016) |

---

## 3. Black-box Testing

Proposal menyebut empat teknik. Bagian ini memberi kerangka dan kasus inti
untuk tiap teknik; perluas per fitur mengikuti polanya.

### 3.1 Equivalence partitioning + boundary value analysis

Semua batas di bawah **diverifikasi terhadap migrasi**, kolom terakhir
menunjukkan sumbernya.

| # | Masukan | Tidak valid | Valid (batas bawah) | Valid (batas atas) | Tidak valid | Sumber |
|---|---|---|---|---|---|---|
| BV-01 | Rating bintang | 0 | **1** | **5** | 6 | `reviews.stars check between 1 and 5` |
| BV-02 | Playstyle | 0 | **1** | **5** | 6 | `profiles.playstyle check between 1 and 5` |
| BV-03 | Kapasitas lobi | 1 | **2** | **5** | 6 | `lobbies.capacity check between 2 and 5` |
| BV-04 | Tag personalitas pengguna | 2 | **3** | **5** | 6 | `too_few_tags` / `too_many_tags` |
| BV-05 | Tag yang dicari lobi (\|B\|) | — | **0** | **3** | 4 | `check_lobby_tag_count` |
| BV-06 | Bahasa lobi | — | 0 | **4** | 5 | `cardinality(languages) <= 4` |
| BV-07 | Panjang username | 2 | **3** | **24** | 25 | `src/lib/username.ts` |
| BV-08 | Karakter username | `a b`, `a@b` | `a-b_c.d` | — | — | `[A-Za-z0-9_.-]` |
| BV-09 | Umur dari tanggal lahir | 17 th 364 hr | **18 th** | — | — | `enforce_minimum_age()` |
| BV-10 | Durasi lobi sebelum rating | 14 mnt 59 dtk | **15 mnt** | — | — | `closed_at - started_at >= interval '15 minutes'` |
| BV-11 | Rank pelamar vs rentang lobi | 1 tingkat di bawah min | **tepat min** | **tepat maks** | 1 tingkat di atas maks | `lobbyJoinBounds()` |
| BV-12 | Alasan rating rendah | kosong saat bintang ≤ 2 | salah satu dari 4 alasan | — | alasan terisi saat bintang ≥ 3 | `reviews_low_rating_needs_reason` |

**BV-12 perlu diperhatikan:** constraint-nya dua arah. Bintang 1–2 **wajib**
beralasan, dan bintang 3–5 **wajib tanpa** alasan. Uji keduanya.

**BV-05 itu kasus khusus Persamaan 3.15**: lobi tanpa tag sama sekali tetap
sah, dan skornya dihitung dengan rumus yang berbeda. Pastikan hasilnya bukan
0 dan bukan nilai yang menang telak.

### 3.2 Decision table — kelayakan bergabung ke lobi

Kondisi yang diperiksa `RequestToJoinModal` dan `apply_to_lobby`:

| Kondisi | A1 | A2 | A3 | A4 | A5 | A6 |
|---|---|---|---|---|---|---|
| Sudah masuk lobi live lain? | Y | T | T | T | T | T |
| Slot masih ada? | – | T | Y | Y | Y | Y |
| Rank diterima rentang lobi? | – | – | T | Y | Y | Y |
| Sudah pernah melamar? | – | – | – | Y | T | T |
| Status lobi `live`? | – | – | – | – | T | Y |
| **Hasil** | tolak | tolak | tolak | tolak | tolak | **terima** |

Setiap penolakan harus memunculkan **alasan yang berbeda dan bisa dibaca**
(`lobbyErrorMessage`), bukan pesan galat generik. Itu bagian dari kasus
ujinya — satu kasus per baris, periksa teks pesannya juga.

### 3.3 Decision table — penerimaan lamaran oleh pembuat lobi

Dicek ulang oleh `respond_to_application` **pada saat Accept ditekan**, bukan
saat lamaran masuk. Ini penting: keadaan bisa berubah di antara keduanya.

| Kondisi | B1 | B2 | B3 | B4 |
|---|---|---|---|---|
| Lobi masih punya slot? | T | Y | Y | Y |
| Pelamar masih memenuhi rentang rank? | – | T | Y | Y |
| Pelamar sudah masuk lobi live lain? | – | – | Y | T |
| **Hasil** | tolak (penuh) | tolak (rank) | tolak (sudah di lobi lain) | **terima** |

> Skenario uji yang paling berharga di sini: **terima dua pelamar berturut-turut
> pada lobi bersisa satu slot.** Yang kedua harus ditolak dengan alasan jelas,
> bukan membuat lobi kelebihan anggota. Seed data sudah menyiapkan kasus ini —
> salah satu pelamar sengaja sudah berada di lobi lain.

### 3.4 State transition — siklus hidup lobi

```
                  start_lobby            close_lobby
   [live] ──────────▶ [started] ──────────▶ [completed]
     │  ▲                                        │
     │  └──── reopen_lobby ────┐                 ▼
     │                         │          rating dibuka
     ├── close_lobby ──▶ [closed]          (≥ 15 menit)
     │
   [scheduled] ── start_lobby ──▶ [started]

   expire_stale_lobbies: live/started > 6 jam ──▶ otomatis berakhir
```

| # | Dari | Aksi | Ke | Harus terjadi |
|---|---|---|---|---|
| ST-01 | live | `start_lobby` | started | anggota dapat notifikasi `lobby_started`; lamaran pending lain ditarik |
| ST-02 | started | `close_lobby` | completed | chat ditutup bagi pemain, baris chat **tetap tersimpan** untuk admin |
| ST-03 | live | `close_lobby` | closed | **tidak ada** rating (tidak pernah dimulai) |
| ST-04 | closed | `reopen_lobby` | live | undangan lama yang sudah lewat tidak hidup kembali |
| ST-05 | completed | `submit_review` | — | hanya jika ≥ 15 menit; uji 14:59 dan 15:00 |
| ST-06 | live, > 6 jam | `expire_stale_lobbies` | berakhir otomatis | tanpa campur tangan manusia |
| ST-07 | started | pelamar menekan Join | ditolak | lobi yang sudah jalan tidak menerima lamaran |

### 3.5 State transition — siklus hidup lamaran

`pending → accepted | declined`, lalu `accepted → left`.

| # | Dari | Aksi | Ke | Harus terjadi |
|---|---|---|---|---|
| ST-10 | (tidak ada) | `apply_to_lobby` | pending | pembuat lobi dapat notifikasi `join_request` |
| ST-11 | pending | pelamar membatalkan | terhapus | notifikasi pembuat lobi ikut hilang |
| ST-12 | pending | Accept | accepted | pelamar dapat `application_accepted`; lamaran pending-nya ke lobi live lain ditarik |
| ST-13 | pending | Decline | declined | tidak bisa melamar ulang ke lobi yang sama |
| ST-14 | accepted | `leave_lobby` | left | slot kembali terbuka |
| ST-15 | accepted | `remove_member` | left | **boleh melamar lagi** (beda dari declined) |

ST-13 lawan ST-15 adalah pasangan uji yang bagus: dua jalan menuju "tidak lagi
di lobi", dengan akibat yang sengaja dibedakan.

### 3.6 Kasus yang sering terlupa

| # | Kasus | Kenapa penting |
|---|---|---|
| X-01 | Pemain tersuspensi mencoba login | harus keluar sendiri ke `/account-restricted`, bukan dapat sesi |
| X-02 | Non-staf membuka `/admin` | harus **404 biasa**, bukan "akses ditolak" — itu sengaja |
| X-03 | Akun baru lewat Google/Discord | username dibuatkan otomatis, lalu diarahkan ke `/onboarding` |
| X-04 | Menutup tab di tengah onboarding | `proxy.ts` mengembalikannya ke onboarding |
| X-05 | Rating rendah tanpa alasan | ditolak database, bukan cuma ditahan form |
| X-06 | Membaca DM lewat API sebagai admin | **harus gagal** — tidak ada policy-nya, dan itu disengaja |
| X-07 | Lobi tanpa tag (\|B\| = 0) di daftar | skornya memakai Persamaan 3.15 |
| X-08 | Tautan voice Discord dilihat non-anggota | kolomnya tidak boleh terbaca |
| X-09 | Aplikasi dibuka tanpa koneksi | halaman `/offline` tampil **lengkap dengan gambarnya** |

X-02, X-06, dan X-08 adalah **uji negatif keamanan**. Jangan hanya menguji
"fitur jalan"; uji juga "yang tidak berhak tidak bisa". Penguji suka ini.

### 3.7 Requirements Traceability Matrix

Proposal sudah menjanjikan RTM. Tambahkan satu kolom di paling kiri supaya ia
sekaligus membuktikan kebutuhan dari kuesioner sudah terjawab:

| Temuan kuesioner | Kebutuhan fungsional | Fitur | Kasus uji | Hasil |
|---|---|---|---|---|
| Gaya bermain paling penting (81,8%) | Lobi diurutkan berdasarkan kecocokan playstyle | Parameter P | BV-02, P@5 | |
| AFK/flaming/trolling (87,9/72,7/68,7%) | Rekam jejak perilaku terlihat sebelum bergabung | Reputasi + riwayat sanksi | BV-01, BV-12 | |
| 78,8% bermain lintas perangkat | Bisa dipakai di HP dan PC tanpa instalasi | PWA | X-09, Lighthouse | |
| 73,7% voice chat eksternal | Lobi bisa menyematkan tautan Discord | `lobby_voice_link` | X-08 | |
| Penyaringan rekan penting (80,8%) | Filter rank dan role | `lobbyJoinBounds` | BV-11, A1–A6 | |

---

## 4. Non-Functional Evaluation

Namanya di proposal: **Non-Functional Evaluation**, mengacu pada dua
karakteristik kualitas **ISO/IEC 25010** — *performance efficiency* dan
*reliability*.

### 4.1 Waktu respons API (k6, target p95 < 1 detik)

Endpoint yang disebut proposal, dan padanannya di sistem ini:

| Proposal | Yang dipanggil | Catatan |
|---|---|---|
| Autentikasi | `POST /auth/v1/token` | Supabase Auth |
| Daftar & rekomendasi lobi | `GET /api/lobbies/recommended?game=<slug>` | **sudah ada khusus untuk ini** |
| Pembuatan lobi | `rpc/create_lobby` | |
| Pengiriman lamaran | `rpc/apply_to_lobby` | |
| Chat lobi | `POST /rest/v1/lobby_messages` | 30 pesan/menit per pemain |
| Pengiriman penilaian | `rpc/submit_review` | |

`/api/lobbies/recommended` memang dibuat untuk keperluan ini — ia mengembalikan
daftar yang sudah disaring dan diurutkan sebagai JSON, jadi k6 mengukur jalur
yang sama dengan yang dipakai halaman asli.

```js
// contoh ambang k6
export const options = {
  stages: [{ duration: '1m', target: 50 }, { duration: '3m', target: 50 }],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // target proposal
    http_req_failed:   ['rate<0.01'],   // galat < 1%
  },
};
```

⚠️ **Jangan jalankan uji beban dengan akun sungguhan.** Pakai pemain `demo_*`
dari seed. 50 VU yang membuat lobi sungguhan akan mengotori data UAT, dan
kalau menulis `reviews` akan menggeser reputasi yang dilihat partisipan.

### 4.2 Performa halaman (Lighthouse + web-vitals)

Target: **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1**.

Ukur di build produksi (`npm run build && npx next start`), bukan `npm run dev`
— dev tidak memakai kode yang dioptimalkan dan **tidak mendaftarkan service
worker**, jadi angkanya tidak ada artinya.

Halaman yang diukur: beranda, `/lfg/valorant` (daftar terberat), halaman lobi,
`/messages`, dan `/profile/<user>`.

### 4.3 Keandalan

| Uji | Target | Cara |
|---|---|---|
| Uji beban 50 VU | galat < 1% | ambang k6 di atas |
| Pengiriman push | ≥ 95% diterima | tabel di bawah |

Matriks push yang disebut proposal — **ketiganya wajib**, dan yang ketiga
paling rawan:

| Perangkat | Syarat | Catatan |
|---|---|---|
| Chrome desktop | build produksi | paling mudah |
| Chrome Android | build produksi | |
| Safari iPhone | **iOS 16.4+ dan sudah Add to Home Screen** | push **tidak akan** jalan di tab Safari biasa |

Kesiapan instalasi (Add to Home Screen) diperiksa lewat **Chrome DevTools →
panel Application**.

⚠️ **Browser pane di aplikasi Claude tidak bisa mendaftarkan service worker.**
Seluruh pengujian PWA dan push harus di Chrome asli atau HP sungguhan.

---

## 5. UAT + SUS

### 5.1 Susunan partisipan

12 partisipan, **2 pemain aktif per gim** × 6 gim, purposive. Diuji
**berpasangan** karena alur intinya melibatkan lebih dari satu orang: satu jadi
pembuat lobi, satu jadi pelamar, lalu **ditukar**.

Artinya **6 sesi**, bukan 12. Rencanakan waktunya begitu.

### 5.2 Empat skenario tugas

Diambil persis dari proposal:

| # | Tugas | Yang dicatat |
|---|---|---|
| T1 | Mendaftar dan melengkapi profil | berhasil/gagal, waktu, jumlah kesalahan |
| T2 | Mencari dan melamar lobi, menerima notifikasi keputusan | idem |
| T3 | Membuat lobi, mengelola lamaran, chat lobi | idem |
| T4 | Bermain bersama ≥ 15 menit, lalu saling menilai | idem |

**T4 adalah yang paling rapuh**, dan perlu disiapkan khusus:

- Butuh pertandingan sungguhan **minimal 15 menit** — itu syarat database,
  bukan syarat di layar. Lobi yang berakhir pada menit ke-14 **tidak** akan
  membuka rating, dan partisipan akan mengira aplikasinya rusak.
- Kedua partisipan harus punya akun gim yang sama.
- Sediakan cadangan: kalau pertandingannya batal, T4 bisa diulang di sesi
  kedua (yang memang sudah dijadwalkan untuk *retention*).

### 5.3 Yang dikumpulkan di akhir sesi

| Instrumen | Butir | Analisis |
|---|---|---|
| **SUS** | 10 butir, versi Indonesia (Sharfina & Santoso, 2016) | rerata + CI 95%, target ≥ 68 |
| **Kepuasan per fitur** | 5 butir Likert | one-sample t-test terhadap 3 |
| **Eight Golden Rules** | 8 butir Likert | one-sample t-test terhadap 3 |
| **Precision@5** | tandai 5 lobi teratas | rerata, target ≥ 0,6 |

**Saran kuat:** buat 5 butir kepuasan per fitur **mencerminkan lima konstruk
kuesioner satu lawan satu**. Dengan begitu BAB 4 bisa menyandingkan "apa yang
mereka harapkan" (kuesioner, n = 99) dengan "apakah terpenuhi" (UAT, n = 12)
dalam satu tabel — tanpa perlu menautkan ke jawaban individual, yang tidak
mungkin karena kuesionernya anonim.

Tambahkan juga **pre-test di awal sesi** memakai butir yang sama: tanyakan
harapannya dulu, ukur pemenuhannya di akhir. Hasilnya pasangan harapan→pemenuhan
dari orang yang sama, tetap anonim, dan bisa diuji dengan **paired t-test**
yang sudah ada di proposal.

Dengan 13 butir diuji tanpa koreksi perbandingan majemuk, proposal sudah
menyatakan hasilnya **eksploratori** — pertahankan kalimat itu di BAB 4.

### 5.4 Sesi kedua (3–7 hari kemudian)

Untuk *retention over time*: ulangi **T2 dan T3 saja** (yang tidak butuh
pertandingan bersama), tanpa penjelasan ulang. Bandingkan waktunya dengan sesi
pertama memakai paired t-test.

---

## 6. Matching Accuracy (Precision@5)

Prosedurnya:

1. Partisipan membuka `/lfg/<gim-nya>` dengan profil mereka sendiri
2. Sistem menampilkan 5 lobi teratas
3. Partisipan menandai tiap lobi **relevan / tidak relevan**
4. `Precision@5 = jumlah relevan / 5`, dirata-ratakan ke semua partisipan
5. Target **≥ 0,6** — minimal 3 dari 5 dinilai relevan

Dua hal yang menentukan hasilnya:

- **Jalankan setelah perbaikan bobot 20 Nov 2026.** Bobotnya kini
  0,40/0,28/0,32, bukan 0,40/0,30/0,30. Angka P@5 yang diambil sebelum itu
  tidak sah dilaporkan.
- **Profil partisipan harus lengkap** — playstyle dan 3–5 tag. Tanpa itu
  rumusnya tidak bisa menghitung apa pun. Gerbang onboarding sudah memaksanya,
  tapi periksa sebelum mulai.

Proposal juga menjelaskan kenapa rating pasca-bermain **tidak** dipakai sebagai
ukuran akurasi: rating itu juga menjadi masukan R di rumusnya, jadi akan
melingkar; dan rating rendah bisa mencerminkan perilaku orangnya, bukan
kualitas pencocokan. Pertahankan alasan itu di BAB 4.

---

## 7. Data dummy: boleh, lazim, dan sudah tersedia

### 7.1 Jawaban singkat: ya, dan proposalmu sendiri mewajibkannya

Proposal menulis:

> *"Peneliti menyiapkan sekitar **20 lobi uji** dengan variasi gim, rank,
> playstyle, dan tag."*

Jadi ini bukan sesuatu yang perlu dibela — **sudah tertulis sebagai metode**.
Dan memang tidak ada jalan lain: Precision@5 butuh minimal 5 lobi per gim untuk
ditampilkan, sedangkan platform baru belum punya pengguna.

### 7.2 Yang sudah ada di repo

[`supabase/dev-seed/seed.sql`](../supabase/dev-seed/seed.sql) sudah membuat:

- **51 pemain demo** (`demo_*`, `@demo.temangame.test`), 8–11 per gim, lengkap
  dengan rank, playstyle, 3 tag personalitas, dan reputasi
- **30 lobi terbuka** (5 per gim) plus 2 terjadwal. Kelimanya per gim sengaja
  berbeda: sangat kasual, sangat kompetitif, seimbang **tanpa tag** (kasus
  \|B\| = 0), rentang rank sempit, dan satu yang anggotanya berreputasi buruk
- **Reputasi dari baris rating sungguhan** — pemain demo saling menilai di lobi
  "Earlier demo match", lalu `recompute_reputation` menghitung R\* persis
  seperti pada data asli

Yang terakhir itu penting dan patut disebut di BAB 4: reputasi demo **bukan
angka yang ditulis tangan**, melainkan hasil perhitungan Bayesian yang sama
dengan rating sungguhan. Jadi yang diuji benar-benar rumusnya.

Dua pengaman yang sudah terpasang:

- Pemain demo **tidak punya password**, jadi tidak ada yang bisa masuk sebagai
  mereka
- [`cleanup.sql`](../supabase/dev-seed/cleanup.sql) menghapus seluruh jejaknya

```powershell
# jalankan isi seed.sql di Supabase SQL Editor; aman diulang
```

### 7.3 Batas yang tidak boleh dilewati

Ini yang memisahkan praktik lazim dari pelanggaran integritas akademik:

| ✅ Sah | ❌ Tidak sah |
|---|---|
| Lobi dan pemain demo sebagai **lingkungan uji** | Jawaban SUS atau UAT yang dikarang |
| Data demo untuk uji beban dan black-box | Data demo dilaporkan seolah pengguna nyata |
| Reputasi demo dihitung dari rating demo | Angka reputasi ditulis tangan agar hasil bagus |
| 20 lobi uji untuk P@5 | Lobi yang disusun agar P@5 pasti lolos |

Soal baris terakhir: **lobi uji dirancang bervariasi, bukan dirancang agar
cocok.** Justru itu gunanya ada lobi "sangat kasual" dan "reputasi buruk" di
seed — kalau semua lobi dibuat ideal, P@5 akan 1,0 dan tidak membuktikan apa
pun.

Tulis satu paragraf di BAB 3 atau BAB 4 yang menyatakan terus terang: data
demo dipakai sebagai lingkungan pengujian, jumlah dan wataknya apa adanya,
dan hasil UAT berasal dari 12 partisipan manusia. Keterbukaan ini **menguatkan**
skripsi, bukan melemahkannya.

### 7.4 Sebelum sesi UAT

1. Jalankan `cleanup.sql`, lalu `seed.sql` lagi — supaya tiap partisipan
   melihat keadaan awal yang sama
2. Pastikan setiap gim punya **minimal 5 lobi terbuka** (P@5 butuh lima)
3. Jangan jalankan uji beban setelah ini; kerjakan uji beban **sebelumnya**
4. Periksa gerbang onboarding: profil partisipan harus punya playstyle dan tag

---

## 8. Urutan kerja yang disarankan

| Urutan | Pekerjaan | Perlu partisipan? |
|---|---|---|
| 1 | Black-box (§3), perbaiki yang gagal | tidak |
| 2 | k6, Lighthouse, uji push (§4) | tidak |
| 3 | `cleanup.sql` → `seed.sql` | tidak |
| 4 | Sesi UAT 1–6 (berpasangan): T1–T4, SUS, P@5 | **ya** |
| 5 | Sesi kedua 3–7 hari kemudian: T2, T3 | **ya** |
| 6 | Analisis: t-test, CI SUS, rerata P@5 | tidak |
| 7 | Analisis sensitivitas bobot ±0,10 | tidak |

Nomor 7 masih berupa rencana ([`thesis-divergences.md`](thesis-divergences.md)
baris B12, "Not built"). Bobot sudah berada di satu tempat
(`SCORE_WEIGHTS` di `src/lib/recommendation.ts`) dan test membacanya dari sana,
jadi mengubahnya tidak akan memecahkan apa pun.
