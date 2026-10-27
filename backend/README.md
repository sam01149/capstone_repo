# FarmSight Backend

Backend FarmSight menggunakan NestJS, Prisma ORM, dan PostgreSQL. Autentikasi/RBAC, pengguna internal, kategori/master produk, inventory, katalog publik, draft WhatsApp, pesanan, serta integrasi movement penjualan telah tersedia; frontend serta modul bisnis lain dikerjakan pada paket terpisah.

## Stack yang dipin

- Node.js `22.22.3`
- npm `11.12.1`
- NestJS `12.1.3`
- TypeScript `6.0.3`
- Prisma ORM `7.10.0`
- PostgreSQL `18`
- Vitest `5.0.4`

Project memakai ESM (`"type": "module"`) dan npm sebagai satu-satunya package manager. Gunakan versi Node pada `.nvmrc` atau `.node-version` agar hasil instalasi konsisten.

## Arsitektur

```mermaid
flowchart LR
    Client[Frontend atau API client] --> Nest[NestJS HTTP layer]
    Nest --> Controller[Controller]
    Controller --> Service[Application/domain service]
    Service --> PrismaService[PrismaService]
    Config[ConfigModule + environment validation] --> Nest
    Config --> PrismaService
    PrismaService --> ClientGen[Generated Prisma Client]
    ClientGen --> Adapter[PrismaPg adapter]
    Adapter --> Driver[node-postgres / pg]
    Driver --> PostgreSQL[(PostgreSQL)]
```

Tanggung jawab setiap bagian:

- **NestJS** menerima HTTP request, menjalankan controller, validasi, service, guard/RBAC, dan membentuk HTTP response. NestJS tidak menyimpan data sendiri.
- **Prisma ORM** menjadi lapisan akses data. `schema.prisma` mendefinisikan model dan Prisma menghasilkan client bertipe. `PrismaService` menyediakan satu connection pool yang dapat dipakai service NestJS melalui dependency injection.
- **PostgreSQL** menyimpan data secara persisten serta menegakkan constraint dan transaksi. Prisma menerjemahkan pemanggilan client menjadi SQL dan mengirimkannya lewat driver `pg`.

Implementasi koneksi saat ini:

1. `ConfigModule` membaca `.env` dan memvalidasi seluruh nilai melalui `src/config/environment.schema.ts`.
2. `DatabaseModule` mendaftarkan `PrismaService` sebagai provider global NestJS.
3. `PrismaService` membaca `DATABASE_URL`, batas pool, timeout koneksi, dan SSL dari `ConfigService`.
4. `PrismaService` membuat `PrismaPg`, lalu memberikannya kepada generated `PrismaClient`.
5. Saat module aktif, `$connect()` membuka koneksi ke PostgreSQL. Saat aplikasi berhenti, `$disconnect()` menutupnya.
6. Endpoint `GET /health` menjalankan `SELECT 1` melalui Prisma. Respons `database: "up"` berarti seluruh jalur NestJS → Prisma → driver `pg` → PostgreSQL berhasil.

File utamanya:

Lapisan HTTP menerapkan request ID, response/error envelope, validasi DTO, logging aman tanpa body/token, origin check, rate limit, serta guard default-private. Auth memakai access JWT dalam cookie `HttpOnly`, refresh session yang hash-nya tersimpan di PostgreSQL, rotasi CSRF, dan RBAC tiga role.

- `src/main.ts`: bootstrap HTTP server dan prefix `/api/v1`.
- `src/app.module.ts`: composition root aplikasi.
- `src/config/environment.schema.ts`: validasi environment.
- `src/database/prisma.service.ts`: lifecycle Prisma dan connection pool.
- `prisma/schema.prisma`: kontrak model database.
- `prisma.config.ts`: lokasi schema, migrasi, dan URL datasource untuk Prisma CLI.

## Persiapan lokal

Prasyarat:

- Node.js `22.22.3`;
- PostgreSQL aktif pada port lokal yang dipilih;
- database dan role khusus FarmSight, bukan superuser `postgres` untuk operasi aplikasi.

Contoh SQL yang dijalankan satu kali melalui pgAdmin atau `psql` sebagai administrator:

```sql
CREATE ROLE farmsight_app
  WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  PASSWORD 'ganti-dengan-password-lokal-yang-kuat';

CREATE DATABASE farmsight_dev OWNER farmsight_app;
CREATE DATABASE farmsight_test OWNER farmsight_app;
```

Jangan menyalin password contoh apa adanya. Jangan commit `.env`.

Dari folder `backend/`, siapkan aplikasi:

```powershell
npm ci
npm run env:init:local
npm run prisma:validate
npm run prisma:generate
npm run db:migrate:deploy
npm run db:seed:roles
npm run start:dev
```

Sebelum menjalankan `env:init:local`, buat file `.env` yang tidak boleh di-commit dan isi minimal konfigurasi berikut. Ganti nilai koneksi database, origin frontend, dan konfigurasi cookie sesuai lingkungan:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://farmsight_app:PASSWORD_URL_ENCODED@localhost:5432/farmsight_dev?schema=public
DATABASE_POOL_MAX=10
DATABASE_CONNECT_TIMEOUT_MS=5000
DATABASE_SSL=false
FRONTEND_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
WHATSAPP_BUSINESS_NUMBER=6281234567890
```

`env:init:local` melengkapi JWT secret dan pepper acak hanya di dalam `.env`. Karakter khusus pada username atau password database wajib di-URL-encode.

## Prisma dan migrasi

Generated Prisma Client ditempatkan di `src/generated/prisma/` dan tidak masuk Git. Jalankan ulang generator setiap kali `schema.prisma` berubah:

```powershell
npm run prisma:generate
```

Setelah model pertama ditambahkan dan migration sudah direview:

```powershell
npm run db:migrate:dev -- --name nama_migrasi
```

Environment bersama atau production hanya menjalankan migration yang sudah ada:

```powershell
npm run db:migrate:deploy
```

Migration pertama membuat `roles`, `users`, `sessions`, dan `audit_logs`. Migration `20261016090000_internal_users_password_policy` memperbarui kebijakan pengguna. Migration `20261021130000_product_catalog` menambahkan kategori/master produk. Dua migration 2026-10-25 menambahkan saldo dan ledger inventory. Migration `20261027120000_orders_whatsapp_stock_integration` serta forward-fix `20261027123000_order_state_constraints` menambahkan order, snapshot item, idempotensi, relasi movement penjualan, dan constraint state. Karena role aplikasi tidak memiliki `CREATEDB`, development lokal dapat memakai migration SQL yang sudah direview melalui `db:migrate:deploy`; jangan menaikkan hak role hanya agar shadow database Prisma tersedia.

Super Admin pertama dibuat satu kali tanpa password default. Isi tiga environment sementara berikut dengan nilai nyata, jalankan command, lalu hapus environment prosesnya: `BOOTSTRAP_SUPER_ADMIN_NAME`, `BOOTSTRAP_SUPER_ADMIN_EMAIL`, dan `BOOTSTRAP_SUPER_ADMIN_PASSWORD`.

```powershell
npm run admin:bootstrap
```

## Menjalankan pemeriksaan

```powershell
npm run format:check
npm run typecheck
npm run lint
npm test
```

E2E otomatis menurunkan target `farmsight_test` dari URL lokal `farmsight_dev`, atau memakai `DATABASE_URL_TEST` bila tersedia. Script menolak database lain:

```powershell
npm run db:migrate:test
npm run db:migrate:test:empty
npm run test:e2e
```

Jangan arahkan integration/e2e test ke database development bersama, staging, atau production.

## Health check

Setelah aplikasi berjalan:

```http
GET http://localhost:3000/health
```

Respons sehat:

```json
{
  "data": {
    "status": "ok",
    "database": "up"
  },
  "meta": { "requestId": "uuid" }
}
```

Route bisnis berikutnya akan berada di bawah prefix `/api/v1`. Health check sengaja dikecualikan dari prefix agar mudah digunakan oleh proses lokal maupun platform hosting nanti.

## Endpoint autentikasi

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/change-password`

Endpoint pengguna berikut khusus Super Admin:

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `PATCH /api/v1/users/:id/role`
- `POST /api/v1/users/:id/deactivate`
- `POST /api/v1/users/:id/reset-password`
- `GET /api/v1/users/:id/activity`

Password baru pada create/reset/change wajib sepanjang 8–16 karakter. Reset menerima password dari Super Admin, mencabut sesi target, serta menetapkan `mustChangePassword=true` sebagai penanda saran non-blocking tanpa expiry. Backend tidak mengembalikan password dan tidak menyediakan endpoint untuk tombol X banner; tombol tersebut sepenuhnya dikelola frontend.

Frontend harus memakai `credentials: 'include'` dan mengirim `X-CSRF-Token` pada mutation privat.

## Endpoint kategori dan produk

Ketiga role internal dapat memakai endpoint baca berikut:

- `GET /api/v1/categories` dan `GET /api/v1/categories/:id`
- `GET /api/v1/products` dan `GET /api/v1/products/:id`

Endpoint mutation berikut khusus Super Admin dan memerlukan CSRF:

- `POST /api/v1/categories`, `PATCH /api/v1/categories/:id`, `POST /api/v1/categories/:id/deactivate`
- `POST /api/v1/products`, `PATCH /api/v1/products/:id`, `POST /api/v1/products/:id/deactivate`

Harga disimpan sebagai integer rupiah positif. `minimumStock`, `safetyStock`, dan `reorderPoint` menerima decimal string nonnegatif maksimal tiga digit pecahan; `leadTimeDays` tetap integer. Produk memiliki `stockUnit`; satuan terkunci setelah saldo atau histori digunakan. `imageRef` hanya URL HTTPS opsional; backend belum mengunggah atau mengompresi file gambar. Slug dibuat saat create dan tetap stabil ketika nama berubah.

## Endpoint inventory

Ketiga role internal dapat membaca:

- `GET /api/v1/inventory`
- `GET /api/v1/inventory/:productId`
- `GET /api/v1/inventory/movements`

Super Admin dan Stock Manager dapat membuat movement manual melalui `POST /api/v1/inventory/movements`. Request memerlukan CSRF dan header `Idempotency-Key` UUID v4. Kuantitas dikirim sebagai decimal string; adjustment mengirim hasil hitung fisik. Sales Admin hanya membaca endpoint movement manual; movement `SALE_OUT` hanya dibuat oleh konfirmasi pesanan.

## Endpoint katalog publik dan pesanan

Endpoint tanpa login:

- `GET /api/v1/public/products`
- `GET /api/v1/public/products/:slug`
- `POST /api/v1/public/order-drafts`

Draft publik memerlukan nama, nomor telepon, minimal satu item, serta header `Idempotency-Key` UUID v4. Backend menghitung harga/total dari database dan mengembalikan ringkasan beserta URL WhatsApp dari `WHATSAPP_BUSINESS_NUMBER`. Pelanggan tetap menekan Kirim di WhatsApp; backend tidak mengirim pesan atau memproses pembayaran secara otomatis.

Sales Admin dan Super Admin dapat memakai:

- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `POST /api/v1/orders`
- `PATCH /api/v1/orders/:id`
- `POST /api/v1/orders/:id/transition`

Mutation internal memerlukan CSRF dan `Idempotency-Key`. Action yang tersedia adalah `SUBMIT`, `CONFIRM`, `COMPLETE`, dan `CANCEL` sesuai state saat ini. Draft/pending tidak mereservasi stok. `CONFIRM` mengunci saldo, memeriksa semua item, mengurangi stok, membuat satu movement per item, dan mengubah status dalam satu transaksi; satu item kurang menggagalkan seluruh proses. Draft publik kedaluwarsa setelah 24 jam. PII pelanggan dianonimkan 90 hari setelah `COMPLETED` atau `CANCELLED`, sedangkan data transaksi tetap disimpan.
