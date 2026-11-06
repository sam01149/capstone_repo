# FarmSight – Frontend Web Toko Farm Berkah

Sistem frontend web terintegrasi untuk **UMKM Toko Farm Berkah** yang berfokus pada produk pangan olahan hasil pertanian (keripik labu, permen & cokelat lidah buaya, jelly bunga telang, instan jahe, dll.).

Dibangun dengan arsitektur **frontend-only** yang sepenuhnya terisolasi dari backend melalui **Service & Mock API Layer** (`/src/services/*`). Sistem siap dihubungkan langsung ke backend **NestJS + PostgreSQL (RESTful API, JSON, JWT)** hanya dengan mengubah satu konstanta konfigurasi.

---

## 1. Panduan Menjalankan Aplikasi

### Kebutuhan Sistem
- **Node.js**: v18+ atau v20+
- **Browser**: Google Chrome atau Microsoft Edge terbaru

### Menjalankan Development Server
```bash
cd frontend
npm install
npm run dev
```
Buka browser di: `http://localhost:5173`

### Membangun Versi Produksi (Production Build)
```bash
npm run build
npm run preview
```

---

## 2. Kredensial Demo Staf (4 Peran Pengguna)

Sistem telah dilengkapi data mock realistis Toko Farm Berkah dan 1-click autofill di halaman login (`/login`):

| Peran (Role) | Email / Username | Kata Sandi | Keterangan / Fokus Utama |
|---|---|---|---|
| **Super Admin** | `superadmin@farmberkah.com` | `AdminFarm2026!` | Kontrol penuh, kelola akun, manajemen produk, parameter persediaan, audit log. |
| **Stock Manager** | `stockmanager@farmberkah.com` | `StockManager2026!` | Inventori gudang, mutasi stok (IN/OUT), forecasting (ARIMA & Croston SBA), SS & ROP, restock. |
| **Sales Admin** | `salesadmin@farmberkah.com` | `SalesAdmin2026!` | Inbox WhatsApp, Gateway 1 (validasi stok & QRIS), Gateway 2 (verifikasi bukti & konfirmasi). |
| **Staf Baru (Demo Wajib Ganti Password)** | `stafbaru@farmberkah.com` | `TempPass123!` | Akun dengan flag `must_change_password: true`. Menampilkan modal wajib ganti password yang tidak dapat dilewati. |
| **Guest / Pelanggan** | *Tanpa Login* | *Tanpa Password* | Akses langsung ke `/katalog` (filter, cari, lihat detail, estimasi harga, download draft invoice, order via WhatsApp). |

---

## 3. Alur Kerja Sistem (Workflow Sesuai Rancangan Capstone)

### A. Autentikasi & Masuk Staf
1. **Pintu Masuk Utama (`/`)**: Dua opsi jelas: "Lihat Katalog Produk" (Guest) vs "Masuk Staf" (Karyawan).
2. **Form Login (`/login`)**: Input email + sandi (toggle visibility), validasi form, fitur Lupa Sandi.
3. **Gateway Ganti Sandi**: Jika akun memiliki `must_change_password = true`, modal pengubahan kata sandi muncul wajib diisi (minimal 8 karakter dengan meter kekuatan). Setelah berhasil disimpan, flag menjadi `false` dan diarahkan ke dashboard peran.
4. **Otorisasi Berbasis Peran (RBAC)**: Dilindungi oleh `RoleGuard` & `ProtectedRoute`. Akses tidak sah menampilkan pesan ramah `403 – Akses Ditolak`.
5. **Idle Session Expiration**: Sesi otomatis berakhir setelah 15 menit tanpa aktivitas pengguna dengan notifikasi peringatan.

### B. Katalog Publik untuk Guest (`/katalog`)
- Daftar produk pertanian olahan dengan badge ketersediaan (`Tersedia`, `Stok Terbatas`, `Habis`).
- Filter kategori & pencarian kata kunci real-time.
- Modal detail produk dengan alt-text lengkap ramah aksesibilitas.
- Pembelian stok habis otomatis dinonaktifkan dengan rekomendasi produk serupa.
- **Keranjang Belanja**: Download Draft Invoice `.txt` dan tombol kirim pemesanan ke WhatsApp resmi Toko Farm Berkah (`0812-1614-6510`).
- **Batasan**: Tidak ada pembayaran langsung di katalog; pembayaran difasilitasi lewat Sales Admin.

### C. Alur Pemesanan & Pembayaran (Sales Admin)
1. **Inbox WhatsApp**: Menampilkan pesanan yang masuk dari chat pelanggan. Sales Admin mengklik *"Input Pesanan Ini"*.
2. **Gateway 1 – Validasi Ketersediaan Stok**:
   - Jika `Stok Tersedia >= Qty`: Sistem **mereservasi stok** dan menerbitkan kartu QRIS resmi Toko Farm Berkah (**NMID: ID1026508798372**). Sales Admin mengklik *"Kirim QR Code via WhatsApp ke Customer"*.
   - Jika stok tidak mencukupi: Sistem membatalkan reservasi dan memicu *Insufficient Stock Notification*.
3. **Gateway 2 – Verifikasi Bukti Pembayaran**:
   - Pelanggan mengirimkan bukti struk transfer via WhatsApp.
   - Jika **Nominal Sesuai**: Sales Admin klik *"Konfirmasi Pembayaran"*. Sistem otomatis:
     - Mengubah status pesanan menjadi `confirmed`.
     - Mengurangi stok fisik toko secara otomatis.
     - Mencatat log mutasi barang keluar (`OUT`).
     - Mengecek Reorder Point (ROP); jika stok &le; ROP, memicu alert restock ke Stock Manager.
   - Jika **Nominal Tidak Sesuai**: Sales Admin klik *"Minta Transfer Ulang"*, membuka draft WhatsApp pemberitahuan kekurangan bayar.

### D. Manajemen Inventori & Forecasting (Stock Manager)
1. **3 Aktivitas Gudang**:
   - **Barang Masuk / Restock**: Menambah stok fisik dan mencatat log mutasi `IN`.
   - **Barang Keluar / Rusak / Kadaluwarsa**: Mengurangi stok fisik dan mencatat log mutasi `OUT`.
   - **Analisis Forecast**: Menjalankan evaluasi permintaan masa depan.
2. **Demand Forecasting**:
   - Metode **ARIMA** untuk produk berpola permintaan reguler (contoh: Keripik Labu, Stick Labu Madu).
   - Metode **Croston SBA** untuk produk berpola *intermittent / sporadic* (contoh: Minuman Lidah Buaya, Cokelat Permen).
   - Metrik akurasi terpadu: **MAE, RMSE, MAPE**, serta visualisasi kurva 95% interval kepercayaan (*Confidence Interval*).
3. **Safety Stock & Reorder Point (SS & ROP)**:
   - Rumus Safety Stock: $$SS = Z \times \sigma \times \sqrt{LT}$$
   - Rumus ROP: $$ROP = (d \times LT) + SS$$
   - Tombol *"Terapkan ke Parameter Produk"* untuk memperbarui batasan stok secara langsung.
4. **Rekomendasi Restock**: Tabel rekomendasi otomatis dengan skala prioritas (*Kritis*, *Tinggi*, *Normal*).

---

## 4. Cara Menghubungkan ke Backend Asli (NestJS + PostgreSQL)

Seluruh komponen UI **hanya berkomunikasi melalui service di `/src/services/*`**. UI tidak memuat logika query database atau perhitungan berat.

Untuk beralih dari Mock ke REST API NestJS:
1. Buka file `src/services/apiClient.js`.
2. Ubah baris konfigurasi berikut:
```javascript
// src/services/apiClient.js
export const USE_REAL_BACKEND = true; // Ganti dari false menjadi true
export const API_BASE_URL = 'http://localhost:3000/api'; // Sesuaikan port backend NestJS Anda
```
3. Pastikan backend NestJS telah mengaktifkan CORS untuk origin frontend (`http://localhost:5173`).

---

## 5. Matriks Endpoint RESTful API yang Diharapkan dari NestJS

| Kategori | Method | Endpoint | Deskripsi & Payload |
|---|---|---|---|
| **Auth** | `POST` | `/auth/login` | `{ email, password }` &rarr; `{ token, user }` |
| | `POST` | `/auth/logout` | Revoke JWT token |
| | `POST` | `/auth/change-password` | `{ oldPassword, newPassword }` |
| | `POST` | `/auth/forgot-password` | `{ email }` &rarr; membuat tiket reset sandi |
| | `POST` | `/auth/reset-password/:id` | Super Admin reset sandi &rarr; `{ temporaryPassword }` |
| **Users** | `GET` | `/users` | List semua akun staf dan status aktif |
| | `POST` | `/users` | `{ name, email, role }` &rarr; generate temporary password |
| | `PUT` | `/users/:id` | Update data akun dan role staf |
| | `PATCH` | `/users/:id/status` | `{ active: boolean }` toggle status aktif |
| **Products** | `GET` | `/products` | List produk publik (`/katalog`) & internal |
| | `POST` | `/products` | `{ name, category, price, stock, altText, ... }` |
| | `PUT` | `/products/:id` | Update produk dan visibilitas katalog |
| | `PATCH` | `/products/:id/visibility` | `{ visibility: 'visible' \| 'hidden' }` |
| | `PATCH` | `/products/:id/parameters` | `{ minStock, safetyStock, rop, leadTime }` |
| **Orders** | `GET` | `/orders` | List pesanan, filter status, relasi stok |
| | `POST` | `/orders` | Gateway 1: Cek stok & reservasi `{ customer, items }` |
| | `POST` | `/orders/:id/verify-payment` | Gateway 2: `{ matches: true }` &rarr; potong stok fisik |
| | `POST` | `/orders/:id/request-retransfer` | Gateway 2: Notifikasi transfer ulang |
| | `POST` | `/orders/:id/cancel` | Batalkan pesanan & lepaskan reservasi stok |
| **Inventory** | `GET` | `/inventory/stock` | Stok fisik, stok reservasi, dan stok tersedia |
| | `GET` | `/inventory/movements` | Riwayat log mutasi stok (IN/OUT) |
| | `POST` | `/inventory/movements` | Input barang masuk / keluar `{ productId, qty, type, reason }` |
| | `GET` | `/inventory/restock-recommendations` | List saran restock produk &le; ROP |
| **Forecast** | `GET` | `/forecasting/:productId` | Eksekusi model ARIMA / Croston SBA & metrik akurasi |
| | `POST` | `/forecasting/apply-parameters` | Terapkan SS & ROP yang dihitung ke produk |
| **Reports** | `GET` | `/reports/sales` | Agregasi data penjualan dan omzet |
| | `GET` | `/reports/inventory` | Valuasi total stok dan status keamanan |
| | `GET` | `/reports/movements` | Rekapitulasi mutasi masuk dan keluar |
| **Audit Log**| `GET` | `/audit-logs` | Rekam jejak seluruh aktivitas pengguna |

---

## 6. Standar Aksesibilitas (WCAG) & Performa

- **Kontras Warna & Tipografi**: Memenuhi rasio kontras WCAG 2.1 AA di seluruh badge status, tabel, dan tombol.
- **Alt Text Gambar**: Seluruh gambar produk dilengkapi atribut `alt` deskriptif.
- **Keyboard Navigation**: Form dan modal dapat dioperasikan penuh menggunakan tombol `Tab`, `Enter`, dan `Escape`.
- **Loading State**: Komponen tabel dan kartu metrik dilengkapi Skeleton Loader untuk mencegah *layout shift*.
- **Pesan & Istilah**: 100% menggunakan Bahasa Indonesia yang mudah dipahami oleh staf dan pengguna lintas generasi.
