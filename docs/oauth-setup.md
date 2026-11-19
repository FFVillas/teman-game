# Masuk lewat Google dan Discord

Tombol Google dan Discord di `/login` dan `/signup` sudah tersambung ke
Supabase Auth. Yang belum bisa dikerjakan dari repo ini cuma satu: **mendaftarkan
aplikasinya ke Google dan Discord, lalu menempelkan client ID dan secret-nya di
dashboard Supabase.** Itu di luar kode, jadi dikerjakan sekali dengan tangan
dan ditulis di sini supaya tidak perlu diingat-ingat.

Catatan penting: client secret Google dan Discord **tidak boleh masuk repo**
(repo ini publik di GitHub, dan riwayat git itu permanen). Tempatnya hanya di
dashboard Supabase.

---

## 1. Yang sudah ada di kode

| Bagian | Berkas |
|---|---|
| Tombolnya, memanggil `signInWithOAuth` | `src/components/auth/OAuthButtons.tsx` |
| Tempat Google/Discord mendarat, menukar `?code=` jadi sesi | `src/app/auth/callback/route.ts` |
| Username untuk akun yang tidak pernah mengetiknya | `supabase/migrations/20261119000400_oauth_signup.sql` |
| `/auth` dibebaskan dari gerbang onboarding | `src/proxy.ts` |

Alurnya: tombol → provider → Supabase → `/auth/callback` → (akun baru)
`/onboarding`, atau (akun lama) halaman tujuan.

**Migrasinya harus dijalankan lebih dulu.** Tanpa itu pendaftaran lewat Google
atau Discord gagal dengan "Database error saving new user" — alasannya ditulis
panjang di kepala berkas migrasinya.

---

## 2. URL yang dibutuhkan

Satu URL dipakai di Google maupun Discord — **bukan** alamat website kita,
melainkan alamat Supabase:

```
https://zembgybgnsjadpxizedo.supabase.co/auth/v1/callback
```

Alasannya: provider mengembalikan pemakai ke Supabase, baru Supabase
mengembalikannya ke `/auth/callback` milik kita. Jadi Google dan Discord tidak
pernah tahu alamat website kita sama sekali.

---

## 3. Google

Semuanya gratis dan tidak meminta kartu kredit. Yang berbayar di Google Cloud
itu layanan komputasi; login Google bukan salah satunya.

Dua hal yang perlu diketahui sebelum mulai:

- **Google Cloud Console mewajibkan 2-step verification** sejak 10 November
  2025. Kalau muncul "Google Cloud access blocked", aktifkan 2SV di
  <https://myaccount.google.com/signinoptions/twosv>, tunggu 2-3 menit, lalu
  muat ulang halamannya. Kena ke semua orang, bukan gara-gara setup ini.
- **Halaman "OAuth consent screen" sudah berganti nama** menjadi **Google Auth
  Platform**, dan isinya dipecah ke beberapa menu. Peta namanya:

  | Nama lama | Sekarang |
  |---|---|
  | OAuth consent screen | wizard **Get started** |
  | Publishing status + Test users | **Audience** |
  | Scopes | **Data Access** |
  | Credentials -> OAuth client ID | **Clients** |

1. Buka <https://console.cloud.google.com/>, buat project baru bernama
   `TemanGame`. Project ID yang dibuatkan otomatis tidak dipakai di mana pun,
   biarkan saja. Setelah jadi, **pastikan dropdown project di kiri atas sudah
   menunjuk `TemanGame`** — Google sering tidak memindahkannya sendiri.
2. **Google Auth Platform → Get started**, lalu isi empat langkahnya:
   - App Information: App name `TemanGame`, user support email kamu
   - Audience: **External** (Internal hanya untuk akun Google Workspace)
   - Contact Information: email kamu
   - Finish: centang *Google API Services: User Data Policy* → **Create**
3. **Google Auth Platform → Audience**
   - Status **Testing** sudah cukup untuk skripsi. Dalam mode itu hanya email
     yang terdaftar di **Test users** yang bisa masuk (maksimal 100), sisanya
     ditolak dengan "Access blocked: TemanGame has not completed
     verification". Tekan **+ Add users**, masukkan email kamu dan email teman
     satu kelompok.
   - Untuk UAT dengan responden luar, tekan **Publish app** di halaman yang
     sama. Gratis, langsung jadi, dan tidak perlu verifikasi selama scope-nya
     dasar. **Google meminta menu Branding diisi dulu** — isinya di bawah.
4. **Data Access: jangan disentuh.** Scope bawaan (`email`, `profile`,
   `openid`) sudah cukup, dan menambah scope justru memicu proses verifikasi
   Google yang makan waktu berminggu-minggu.

   **Google Auth Platform → Branding**, hanya perlu diisi kalau mau
   **Publish app** (mode Testing jalan tanpanya):

   | Kolom | Isi |
   |---|---|
   | App name | `TemanGame` |
   | User support email | email kamu |
   | App logo | **kosongkan** |
   | Application home page | `https://teman-game.vercel.app` |
   | Privacy policy link | `https://teman-game.vercel.app/privacy` |
   | Terms of service link | `https://teman-game.vercel.app/terms` |
   | Authorized domains | `teman-game.vercel.app` |
   | Developer contact | email kamu |

   Halaman `/privacy` dan `/terms` sudah ada di aplikasi, jadi tautannya nyata.

   **Jangan unggah App logo.** Logo memicu *brand verification* — proses
   manual bermingguan, persis yang dihindari dengan tidak menambah scope.
   Imbalannya cuma gambar kecil di layar izin.

   Kalau **Authorized domains** menolak dan meminta verifikasi kepemilikan:
   domain `*.vercel.app` tidak bisa diverifikasi lewat DNS, tapi bisa lewat
   berkas HTML — ambil berkas `google<hash>.html` dari Google Search Console,
   taruh di `public/`, push, dan Vercel langsung menyajikannya di root.
5. **Google Auth Platform → Clients → Create client**
   - Application type: **Web application**
   - Authorized redirect URIs: URL Supabase di bagian 2. **Ini satu-satunya
     yang wajib**, dan isinya tidak pernah berubah — juga setelah deploy.
   - Authorized JavaScript origins: boleh **dikosongkan**. Aplikasi kita tidak
     pernah bicara langsung ke Google (browser → Supabase → Google → Supabase →
     kita), jadi Google tidak pernah melihat origin kita. Kolom itu hanya perlu
     kalau memakai library JavaScript Google di halaman sendiri. Mengisinya
     `http://localhost:3000` juga tidak merusak apa-apa.
6. Simpan. Google memberi **Client ID** dan **Client secret** — biarkan tab-nya
   terbuka, dipakai di bagian 5.

---

## 4. Discord

1. Buka <https://discord.com/developers/applications> → **New Application**,
   nama `TemanGame`.
2. Menu **OAuth2**:
   - **Redirects → Add Redirect**: tempel URL Supabase di bagian 2, lalu
     **Save Changes**. Kalau ini dilewat, Discord menolak dengan "Invalid OAuth2
     redirect_uri".
   - **Client ID** ada di halaman yang sama; **Client Secret** di bawahnya
     (tekan *Reset Secret* kalau belum pernah dilihat — secret-nya hanya
     tampil sekali).
3. Scope tidak perlu diatur di sini. Supabase sendiri yang meminta `identify`
   dan `email` saat mengalihkan pemakai.

Satu hal yang perlu diketahui: akun Discord **boleh tidak punya email
terverifikasi**. Akun seperti itu sampai ke kita tanpa alamat email, dan
`generate_username` sudah menanganinya (jatuh ke nama `player…`). Tanpa migrasi
di bagian 1, kasus ini menggagalkan pendaftaran.

---

## 5. Supabase

1. Buka dashboard project → **Authentication → Sign In / Providers**.
2. **Google**: aktifkan, tempel Client ID dan Client Secret dari bagian 3, Save.
3. **Discord**: aktifkan, tempel Client ID dan Client Secret dari bagian 4, Save.
4. **Authentication → URL Configuration**:
   - **Site URL**: `https://teman-game.vercel.app` (alamat Vercel produksi).
     **Bukan localhost**, meskipun sedang mengembangkan di localhost. Site URL
     juga jadi alamat dasar email yang dikirim Supabase — tautan reset password
     memakainya — jadi kalau diisi localhost, pemakai asli menerima email yang
     menunjuk ke komputer mereka sendiri. Login dari localhost tetap jalan,
     karena yang dicocokkan saat OAuth adalah daftar di bawah, bukan ini.
   - **Redirect URLs**, tambahkan dua-duanya supaya keduanya jalan:
     ```
     http://localhost:3000/**
     https://teman-game.vercel.app/**
     ```
     `/**` berarti "alamat apa pun di bawah domain itu". Tanpa akhiran itu
     hanya halaman depan yang diizinkan dan `/auth/callback` ditolak.

     Tambahkan `https://*-<nama-tim>.vercel.app/**` juga kalau preview
     deployment Vercel perlu bisa login.

     Daftar ini yang dicocokkan Supabase dengan `redirectTo` yang dikirim
     tombolnya. Kalau alamatnya tidak ada di daftar, Supabase mengabaikannya dan
     memulangkan pemakai ke Site URL — gejalanya: habis klik Google malah
     mendarat di halaman depan dan tetap belum login.

**Saat deploy nanti, yang disentuh hanya kedua kolom di nomor 4 itu.** Google
dan Discord tidak perlu dibuka lagi: redirect URI di sana selamanya alamat
Supabase (bagian 2), karena provider memulangkan pemakai ke Supabase, bukan ke
kita. Naluri bilang "ganti ke alamat Vercel" — jangan.

Tidak ada variabel lingkungan baru. Semuanya di sisi Supabase, dan kunci yang
dipakai frontend tetap `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` yang sudah ada.

---

## 6. Mencobanya

```powershell
npm run dev
```

Buka <http://localhost:3000/login>, tekan Google atau Discord. Yang harus
terjadi: halaman izin provider → kembali ke `/auth/callback` sekejap → mendarat
di `/onboarding` (karena akun baru belum punya playstyle dan tag).

Kalau gagal, pesannya muncul di bawah tombol, dibawa lewat
`/login?error=…`. Yang sering kejadian:

| Pesan | Artinya |
|---|---|
| `… sign-in isn't available yet` | provider-nya belum diaktifkan di bagian 5 |
| `Invalid OAuth2 redirect_uri` (dari Discord) | URL di bagian 2 belum ditambahkan di Discord |
| `redirect_uri_mismatch` (dari Google) | sama, tapi di Google Credentials |
| Mendarat di halaman depan, tetap belum login | alamatnya belum ada di **Redirect URLs** |
| `Database error saving new user` | migrasi `20261119000400` belum dijalankan |
| `Access blocked: TemanGame has not completed verification` | email itu belum terdaftar di **Audience → Test users** |

---

## 7. Yang didapat dan tidak didapat dari provider

- **Username** dibuatkan, karena pemakai tidak pernah mengetiknya. Discord
  memberi handel publiknya, jadi itu yang dipakai. Google hanya memberi nama
  asli, yang sengaja **tidak** dipakai — username muncul di URL
  (`/profile/<username>`), dan menyebarkan nama asli seseorang bukan hak kita;
  jadi untuk Google dipakai bagian depan alamat emailnya. Bentrok nama
  diselesaikan dengan menambah angka. Pemakainya bisa menggantinya di
  `/profile/me/edit`.
- **Foto profil tidak diambil.** `profiles.avatar_path` dikunci CHECK ke berkas
  milik pemakai sendiri di bucket `avatars`, justru supaya tidak ada URL luar di
  sana (`20261004000000_avatars.sql`). Akun baru tampil sebagai inisial sampai
  ia mengunggah foto sendiri.
- **Password awalnya tidak ada**, dan itu tidak jadi jalan buntu: bagian
  Password di `/settings` tidak menanyakan password lama, ia langsung memanggil
  `updateUser({ password })`. Jadi akun Google/Discord bisa **memasang**
  password di situ, dan setelah itu bisa juga masuk lewat email seperti akun
  biasa. Sebelum dipasang, "Forgot password?" memang tidak berlaku untuknya.

## 8. Yang belum ditangani

| Hal | Keadaan |
|---|---|
| Kalimat di bagian Password `/settings` | berbunyi "Forgot the current one? Log out and use Forgot password?", padahal akun OAuth belum punya password sama sekali. Isinya tetap bekerja (memasang password baru), hanya kalimatnya salah sasaran |
| Hapus akun sendiri | `DeleteAccountSection` memverifikasi dengan `signInWithPassword`, jadi akun OAuth harus memasang password dulu di `/settings` sebelum bisa menghapus akunnya. Bekerja, tapi tidak dijelaskan di layarnya |
| Satu orang, dua akun | masuk lewat Google lalu lewat Discord dengan email sama menghasilkan **satu** akun kalau Supabase mendeteksi emailnya sama dan terverifikasi, dan **dua** kalau tidak. Belum ada layar untuk menggabungkannya |
| `connected_accounts` | tetap tidak dibuat. Ini **login**, bukan penautan akun — Supabase menyimpan identitasnya di `auth.identities`. Penautan akun Discord sudah dicoret dari ruang lingkup pada revisi Oktober 2026 (`docs/proposal-revision-2026-10.md` §9) |
