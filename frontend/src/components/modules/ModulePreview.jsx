import React, { useState } from 'react';
import {
  Boxes,
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,
  Plus,
  Filter,
  ShoppingCart,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockAuth';
import AccessDenied from '../layout/AccessDenied';

export default function ModulePreview({ tabId, onBackToDashboard }) {
  const { role, isRole } = useAuth();
  const [successToast, setSuccessToast] = useState('');

  const triggerAction = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Products Catalog Module (FR-PC-1 s/d FR-PC-10)
  if (tabId === 'products') {
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Katalog Produk Olahan UMKM</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Daftar produk hasil panen pertanian Toko Farm Berkah.</p>
          </div>
          {isRole(ROLES.SUPER_ADMIN) && (
            <button
              onClick={() => triggerAction('Fitur tambah produk siap dikembangkan.')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <Plus size={16} />
              <span>Tambah Produk Baru (Super Admin)</span>
            </button>
          )}
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem' }}>
            {successToast}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {[
            { id: 'MDT', name: 'Keripik Labu Madu 150g', cat: 'Olahan Labu', price: 'Rp 18.000', stock: 48, minStock: 20 },
            { id: 'KKG', name: 'Kue Kering Labu Berkah', cat: 'Olahan Labu', price: 'Rp 35.000', stock: 22, minStock: 15 },
            { id: 'LDB', name: 'Permen Lidah Buaya Manis', cat: 'Olahan Aloe Vera', price: 'Rp 12.000', stock: 12, minStock: 25 },
            { id: 'PSK', name: 'Stick Olahan Labu Gurih', cat: 'Olahan Labu', price: 'Rp 15.000', stock: 30, minStock: 15 },
            { id: 'MLB', name: 'Minuman Jelly Bunga Telang', cat: 'Minuman Herbal', price: 'Rp 13.000', stock: 6, minStock: 20 },
            { id: 'CKP', name: 'Cokelat Lidah Buaya Premium', cat: 'Olahan Aloe Vera', price: 'Rp 25.000', stock: 35, minStock: 15 },
          ].map((item) => (
            <div key={item.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', background: '#f1f5f2', padding: '2px 8px', borderRadius: '4px', color: '#48564e', fontWeight: 600 }}>{item.id}</span>
                <span style={{ fontSize: '0.75rem', color: '#2d6a4f', fontWeight: 700 }}>{item.cat}</span>
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>{item.name}</h3>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2d6a4f', marginBottom: '10px' }}>{item.price}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#48564e', borderTop: '1px solid #f0f4f1', paddingTop: '10px' }}>
                <span>Stok Saat Ini: <strong>{item.stock} pcs</strong></span>
                <span>Min: {item.minStock} pcs</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Inventory Management Module (FR-IM-1 s/d FR-IM-6)
  if (tabId === 'inventory') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER)) {
      return <AccessDenied featureName="Manajemen Persediaan & Penyesuaian Stok" onBackToDashboard={onBackToDashboard} />;
    }
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Manajemen Persediaan & Stok</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Pencatatan saldo fisik dan batas stok minimum Toko Farm Berkah.</p>
          </div>
          <button
            onClick={() => triggerAction('Stok berhasil diselaraskan.')}
            style={{ backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Penyesuaian Stok Fisik (Stock Adjustment)
          </button>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem' }}>
            {successToast}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Kode & Nama Produk</th>
                <th style={{ padding: '12px 16px' }}>Stok Fisik</th>
                <th style={{ padding: '12px 16px' }}>Batas Minimum</th>
                <th style={{ padding: '12px 16px' }}>Safety Stock</th>
                <th style={{ padding: '12px 16px' }}>Reorder Point</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: 'MDT', name: 'Keripik Labu Madu 150g', stock: 48, min: 20, ss: 15, rop: 30, status: 'Aman' },
                { code: 'KKG', name: 'Kue Kering Labu Berkah', stock: 22, min: 15, ss: 8, rop: 18, status: 'Aman' },
                { code: 'LDB', name: 'Permen Lidah Buaya Manis', stock: 12, min: 25, ss: 12, rop: 25, status: 'Di Bawah ROP' },
                { code: 'PSK', name: 'Stick Olahan Labu Gurih', stock: 30, min: 15, ss: 10, rop: 20, status: 'Aman' },
                { code: 'MLB', name: 'Minuman Jelly Bunga Telang', stock: 6, min: 20, ss: 8, rop: 20, status: 'Kritis' },
              ].map((r) => (
                <tr key={r.code} style={{ borderBottom: '1px solid #f0f4f1' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.name} ({r.code})</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{r.stock} unit</td>
                  <td style={{ padding: '12px 16px' }}>{r.min} unit</td>
                  <td style={{ padding: '12px 16px' }}>{r.ss} unit</td>
                  <td style={{ padding: '12px 16px' }}>{r.rop} unit</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: r.status === 'Aman' ? '#dcfce7' : r.status === 'Kritis' ? '#fee2e2' : '#fef3c7', color: r.status === 'Aman' ? '#16a34a' : r.status === 'Kritis' ? '#dc2626' : '#b45309' }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Stock Movement Module (FR-SD-1 s/d FR-SD-7)
  if (tabId === 'movement') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER)) {
      return <AccessDenied featureName="Pencatatan Pergerakan Stok (Stock Movement)" onBackToDashboard={onBackToDashboard} />;
    }
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Riwayat Stock Movement</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Pencatatan mutasi Stok Masuk (In), Stok Keluar (Out), Rusak, dan Kedaluwarsa.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => triggerAction('Stok Masuk (Stock In) berhasil dicatat.')}
              style={{ backgroundColor: '#2d6a4f', color: '#fff', padding: '8px 14px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer' }}
            >
              + Catat Stok Masuk
            </button>
            <button
              onClick={() => triggerAction('Catatan produk rusak/expired disimpan.')}
              style={{ backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fee2e2', padding: '8px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer' }}
            >
              Catat Barang Rusak
            </button>
          </div>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem' }}>
            {successToast}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Waktu</th>
                <th style={{ padding: '12px 16px' }}>Produk</th>
                <th style={{ padding: '12px 16px' }}>Jenis Aktivitas</th>
                <th style={{ padding: '12px 16px' }}>Jumlah</th>
                <th style={{ padding: '12px 16px' }}>Petugas (User)</th>
                <th style={{ padding: '12px 16px' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {[
                { time: '2026-10-09 14:20', prd: 'Keripik Labu Madu', type: 'Stock In', qty: '+30 pcs', user: 'Budi Santoso (Stock Manager)', note: 'Hasil Produksi Batch #28' },
                { time: '2026-10-09 11:15', prd: 'Minuman Jelly Telang', type: 'Stock Out', qty: '-10 pcs', user: 'Siti Rahmawati (Sales Admin)', note: 'Pesanan ORD-2026-078' },
                { time: '2026-10-08 16:40', prd: 'Permen Lidah Buaya', type: 'Expired/Damaged', qty: '-2 pcs', user: 'Budi Santoso (Stock Manager)', note: 'Kemasan bocor saat display' },
              ].map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f4f1' }}>
                  <td style={{ padding: '12px 16px', color: '#718277' }}>{m.time}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{m.prd}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: m.type === 'Stock In' ? '#dcfce7' : m.type === 'Stock Out' ? '#e0f2fe' : '#fee2e2', color: m.type === 'Stock In' ? '#16a34a' : m.type === 'Stock Out' ? '#0284c7' : '#dc2626' }}>
                      {m.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{m.qty}</td>
                  <td style={{ padding: '12px 16px' }}>{m.user}</td>
                  <td style={{ padding: '12px 16px', color: '#48564e' }}>{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Sales Orders Module (FR-SO-1 s/d FR-SO-7)
  if (tabId === 'orders') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.SALES_ADMIN)) {
      return <AccessDenied featureName="Manajemen Pesanan Penjualan (Sales Orders)" onBackToDashboard={onBackToDashboard} />;
    }
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Pesanan Penjualan (Sales Orders)</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Penerimaan pesanan pelanggan, verifikasi ketersediaan stok, dan status pemrosesan.</p>
          </div>
          <button
            onClick={() => triggerAction('Form pesanan baru siap digunakan.')}
            style={{ backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            + Buat Pesanan Baru (Sales)
          </button>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem' }}>
            {successToast}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>No. Pesanan</th>
                <th style={{ padding: '12px 16px' }}>Nama Pelanggan</th>
                <th style={{ padding: '12px 16px' }}>Detail Produk</th>
                <th style={{ padding: '12px 16px' }}>Total Bayar</th>
                <th style={{ padding: '12px 16px' }}>Validasi Stok</th>
                <th style={{ padding: '12px 16px' }}>Status Pesanan</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'ORD-2026-081', customer: 'Ibu Ratna (Reseller)', items: 'Keripik Labu 150g (10x)', total: 'Rp 180.000', stockCheck: 'Stok Cukup (48 pcs)', status: 'Menunggu Konfirmasi' },
                { id: 'ORD-2026-080', customer: 'Bpk. Hendra (Offline)', items: 'Jelly Telang (5x)', total: 'Rp 65.000', stockCheck: 'Stok Kritis (6 pcs)', status: 'Diproses' },
                { id: 'ORD-2026-079', customer: 'Toko Cemilan Bu Wardah', items: 'Cokelat Aloe Vera (15x)', total: 'Rp 270.000', stockCheck: 'Stok Cukup (35 pcs)', status: 'Selesai' },
              ].map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2d6a4f' }}>{o.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{o.customer}</td>
                  <td style={{ padding: '12px 16px' }}>{o.items}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{o.total}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: o.stockCheck.includes('Kritis') ? '#dc2626' : '#16a34a' }}>{o.stockCheck}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: o.status === 'Selesai' ? '#dcfce7' : o.status === 'Diproses' ? '#e0f2fe' : '#fef3c7', color: o.status === 'Selesai' ? '#16a34a' : o.status === 'Diproses' ? '#0284c7' : '#b45309' }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => triggerAction(`Pesanan ${o.id} dikonfirmasi.`)}
                      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Konfirmasi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Demand Forecasting Module (FR-DF-1 s/d FR-DF-7)
  if (tabId === 'forecasting') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER)) {
      return <AccessDenied featureName="Demand Forecasting & Analisis Permintaan" onBackToDashboard={onBackToDashboard} />;
    }
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Demand Forecasting (ARIMA & Croston SBA)</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Model peramalan deret waktu mingguan untuk perencanaan stok Toko Farm Berkah.</p>
          </div>
          <button
            onClick={() => triggerAction('Kalkulasi ulang peramalan selesai.')}
            style={{ backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Jalankan Peramalan (Horizon 4 Minggu)
          </button>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem' }}>
            {successToast}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#142019' }}>Hasil Prediksi Kebutuhan Permintaan Produk Utama</h3>
            <span style={{ fontSize: '0.75rem', color: '#718277' }}>Tingkat Layanan (Service Level): 95% (z = 1.645)</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>SKU Produk</th>
                <th style={{ padding: '10px 14px' }}>Metode Terbaik</th>
                <th style={{ padding: '10px 14px' }}>Prediksi M1</th>
                <th style={{ padding: '10px 14px' }}>Prediksi M2</th>
                <th style={{ padding: '10px 14px' }}>Prediksi M3</th>
                <th style={{ padding: '10px 14px' }}>Prediksi M4</th>
                <th style={{ padding: '10px 14px' }}>Akurasi (RMSE)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { sku: 'Keripik Labu Madu (MDT)', method: 'ARIMA (1,1,1)', m1: '28 pcs', m2: '32 pcs', m3: '30 pcs', m4: '35 pcs', acc: '1.42 (Optimal)' },
                { sku: 'Permen Lidah Buaya (LDB)', method: 'Croston SBA', m1: '18 pcs', m2: '16 pcs', m3: '20 pcs', m4: '19 pcs', acc: '1.85 (Optimal)' },
                { sku: 'Jelly Bunga Telang (MLB)', method: 'ARIMA (0,1,1)', m1: '24 pcs', m2: '22 pcs', m3: '26 pcs', m4: '28 pcs', acc: '1.60 (Optimal)' },
                { sku: 'Stick Labu Gurih (PSK)', method: 'Croston SBA', m1: '15 pcs', m2: '14 pcs', m3: '18 pcs', m4: '17 pcs', acc: '1.92 (Optimal)' },
              ].map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f4f1' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{f.sku}</td>
                  <td style={{ padding: '10px 14px', color: '#2d6a4f', fontWeight: 600 }}>{f.method}</td>
                  <td style={{ padding: '10px 14px' }}>{f.m1}</td>
                  <td style={{ padding: '10px 14px' }}>{f.m2}</td>
                  <td style={{ padding: '10px 14px' }}>{f.m3}</td>
                  <td style={{ padding: '10px 14px' }}>{f.m4}</td>
                  <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>{f.acc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Recommendations & Reports fallback
  return (
    <div style={{ padding: '24px' }} className="animate-fade-in">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019', marginBottom: '8px' }}>
        {tabId === 'recommendation' ? 'Rekomendasi Pengadaan (Restock Recommendation)' : 'Laporan & Histori Operasional'}
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#48564e', marginBottom: '20px' }}>
        Modul ini siap dikembangkan terintegrasi dengan backend NestJS dan database PostgreSQL.
      </p>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '30px', textAlign: 'center' }}>
        <CheckCircle size={40} color="#2d6a4f" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
          Otorisasi Pengguna Terverifikasi
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#718277', maxWidth: '420px', margin: '0 auto' }}>
          Peran Anda diizinkan untuk mengakses modul ini. Komponen ini dapat diekspor ke format laporan PDF/Excel saat backend selesai diintegrasikan.
        </p>
      </div>
    </div>
  );
}
