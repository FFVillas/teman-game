# Lingkungan uji (project Supabase kedua)

Dipakai untuk black-box jalur API dan k6. Sesi partisipan tetap di aplikasi
utama.

## Membuat project uji (sekali)

1. Supabase → **New project**, misalnya `temangame-test`, region Singapore.
2. **SQL Editor** → tempel seluruh isi `test_project_schema.sql` → **Run**
   (tanpa ada teks yang terseleksi). Hasil terakhir harus menampilkan 8 nama
   fungsi.
3. **Authentication → Providers → Email**: matikan *Confirm email*, supaya akun
   uji tidak perlu konfirmasi lewat email.
4. Catat **Project URL** dan **publishable key** (Settings → API Keys). Jangan
   pakai atau bagikan secret key.
5. Admin uji: daftar satu akun di project ini, lalu di SQL Editor:

   ```sql
   insert into public.admins (user_id, display_name)
   select id, 'Admin Uji' from auth.users where email = 'EMAIL_ADMIN_UJI';
   ```

**Jangan pernah** menjalankan `test_project_schema.sql` di project utama:
semua migration-nya sudah jalan di sana.

## Menjalankan aplikasi terhadap project uji (untuk k6)

Buat `.env.test.local` di root repo (sudah di-gitignore):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-uji>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Lalu build dan jalankan dengan env itu (detailnya ikut script k6).

## Memperbarui file gabungan

Kalau ada migration baru, file gabungan dibuat ulang dari `supabase/migrations/`
(urutan nama file, kecuali `20260919000200_reports_moderation.sql` yang berjalan
tepat setelah `20261115000100_thesis_naming.sql`). Di project uji yang sudah
ada, cukup jalankan migration barunya saja.
