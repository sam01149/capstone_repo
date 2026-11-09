# FarmSight

Aplikasi Toko Farm Berkah: frontend React/Vite dan backend NestJS/Prisma/PostgreSQL.
Integrasi mengikuti alur frontend Novita: katalog publik → ringkasan dan WhatsApp → validasi/reservasi stok oleh Sales Admin → QRIS manual → bukti transfer → konfirmasi pembayaran dan stok keluar.
Desain dashboard final merupakan pekerjaan frontend. Halaman operasional pada branch integrasi adalah antarmuka sementara untuk pengujian kontrak dan alur.

## Menjalankan lokal

Gunakan Node 22.22.3, npm 11.12.1 dan PostgreSQL 18. Pengaturan database, secret dan nomor WhatsApp disimpan dalam `backend/.env`, di luar Git. Ikuti konfigurasi backend pada `backend/README.md`.

```powershell
cd backend
npm.cmd ci
npm.cmd run prisma:generate
npm.cmd run db:migrate:deploy
npm.cmd run build
cd ../frontend
npm.cmd ci
cd ..
node backend/scripts/start-local.mjs
```

Buka `http://localhost:5173`. Backend tersedia pada `http://localhost:3000`; health check `GET /health`. Server lokal memakai loopback. Untuk menjalankan dengan terminal terpisah: `npm.cmd run start:dev` dalam `backend`, dan `npm.cmd run dev` dalam `frontend`.

Setiap awal load/reload kembali ke landing page, termasuk ketika URL berisi halaman lama dan cookie sesi masih valid. Klik Masuk Staf untuk melanjutkan sesi server atau login. Tidak ada autentikasi mock, kredensial default, atau token akses pada localStorage.

## Data uji lokal

Opsional: dari direktori `backend`, jalankan `node scripts/seed-local-uat.mjs` setelah build dan migration. Script hanya menerima database `farmsight_dev` di localhost; membuat tiga akun dengan password acak dan dua produk berlabel data sintetis. Akun/data yang sudah ada tidak ditimpa. Akses disimpan hanya dalam `tmp/akses-uji-lokal.txt` dan tidak boleh dipublikasikan. Data uji bukan data operasional atau bukti akurasi forecasting.

`WHATSAPP_BUSINESS_NUMBER` berisi digit nomor toko pada konfigurasi backend. `QRIS_IMAGE_URL` opsional menerima URL HTTPS atau path `/images/nama-file.jpg`/PNG/WebP. Gambar QRIS harus diverifikasi pengelola; aset lokal tersebut tidak otomatis masuk Git. Membuka chat tidak membuktikan pesan sudah dikirim. Sales Admin mengirim pesan/gambar dan memeriksa pembayaran secara manual; tidak ada verifikasi bank otomatis.

## Pemeriksaan

Backend: `npm.cmd run typecheck`, `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run db:migrate:test`, `npm.cmd run test:e2e`. E2E hanya menggunakan `farmsight_test`. Pengujian migration kosong dan upgrade tersedia pada script `db:migrate:test:empty` dan `db:migrate:test:reservations`.

Frontend: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`. Pengujian komponen memeriksa landing page, pemulihan sesi secara eksplisit, katalog dan ringkasan server. Pemeriksaan visual Chrome/Edge tetap bagian UAT.

Forecasting memakai worker Python 3.12.13 dan paket yang dipin dalam `backend/forecast-worker/requirements.lock`; isi `FORECAST_PYTHON_PATH` dengan executable environment yang sesuai. Hasil yang belum memenuhi kelengkapan data ditampilkan belum tersedia, tanpa fallback angka simulasi. Forecasting dan restock mendukung keputusan manusia.
