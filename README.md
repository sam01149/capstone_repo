# FarmSight

Repositori monolith FarmSight untuk Toko Farm Berkah. Backend berada di folder `backend/` dan dibangun dengan NestJS, Prisma ORM, serta PostgreSQL. Frontend dikelola oleh anggota tim yang bertanggung jawab pada bagian frontend.

## Tim dan tanggung jawab awal

| Anggota | Tanggung jawab utama |
|---|---|
| Samuel Armando Napitu | Backend, integrasi, koordinasi tim |
| Anarta Abimanyu Kurniawan | Business Analyst dan Project Management |
| Rania Zamrizq | Data Engineering dan Machine Learning |
| Tri Novita Sari | Frontend dan UI/UX |

Tanggung jawab tidak membatasi kolaborasi, tetapi setiap perubahan tetap harus memiliki pemilik dan reviewer yang jelas.

## Status implementasi

Source backend berada di `backend/`. Fondasi API, autentikasi, sesi, CSRF, RBAC tiga role, pengguna internal, kategori/master produk, serta inventory dan stock movement manual sudah tersedia. Saldo memakai decimal presisi tetap, movement idempotent/atomik, dan Sales Admin memiliki akses baca inventory. Order, pengurangan stok melalui konfirmasi pesanan, serta frontend belum termasuk perubahan ini. Instruksi menjalankan aplikasi dan membuat Super Admin pertama terdapat di `backend/README.md`.
