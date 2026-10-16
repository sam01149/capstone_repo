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

Source backend berada di `backend/`. Fondasi API, autentikasi, sesi yang dapat dicabut, CSRF, RBAC tiga role, serta pengelolaan pengguna internal lengkap sudah tersedia. Super Admin dapat melihat, membuat, memperbarui, mengubah role, menonaktifkan, mereset password, dan melihat aktivitas staf. Reset memakai password 8–16 karakter tanpa expiry; `mustChangePassword` menjadi penanda saran non-blocking. Frontend tidak diubah. Instruksi menjalankan aplikasi dan membuat Super Admin pertama terdapat di `backend/README.md`.
