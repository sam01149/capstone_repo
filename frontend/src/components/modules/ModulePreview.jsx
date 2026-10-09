import React, { useState } from 'react';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Plus,
  Filter,
  ShoppingCart,
  DollarSign,
  Calendar,
  Clock,
  Download,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockAuth';
import AccessDenied from '../layout/AccessDenied';

export default function ModulePreview({ tabId, onBackToDashboard }) {
  const { role, isRole } = useAuth();
  const [successToast, setSuccessToast] = useState('');
  const [inventorySubTab, setInventorySubTab] = useState('summary'); // 'summary' or 'movement'
  const [reportType, setReportType] = useState('sales');

  const triggerAction = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Inventory & Stock Movement Module (FR-IM-1 s/d FR-IM-6 & FR-SD-1 s/d FR-SD-7)
  if (tabId === 'inventory') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER)) {
      return <AccessDenied featureName="Persediaan & Pergerakan Stok" onBackToDashboard={onBackToDashboard} />;
    }
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Persediaan & Pergerakan Stok</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Pencatatan stok fisik, parameter minimum stock, dan mutasi barang masuk/keluar.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => triggerAction('Form penyesuaian stok (Stock Adjustment) berhasil diproses.')}
              style={{ backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              + Penyesuaian Stok Fisik
            </button>
            <button
              onClick={() => triggerAction('Mutasi stok masuk/keluar baru berhasil disimpan.')}
              style={{ backgroundColor: '#ffffff', color: '#2d6a4f', border: '1px solid #2d6a4f', padding: '9px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              + Catat Mutasi Baru
            </button>
          </div>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {successToast}
          </div>
        )}

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e1e7e2', marginBottom: '16px' }}>
          <button
            onClick={() => setInventorySubTab('summary')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: inventorySubTab === 'summary' ? '2px solid #2d6a4f' : '2px solid transparent',
              color: inventorySubTab === 'summary' ? '#2d6a4f' : '#718277',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Ringkasan Stok & Parameter Persediaan
          </button>
          <button
            onClick={() => setInventorySubTab('movement')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: inventorySubTab === 'movement' ? '2px solid #2d6a4f' : '2px solid transparent',
              color: inventorySubTab === 'movement' ? '#2d6a4f' : '#718277',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Riwayat Mutasi Stok (Stock Movement)
          </button>
        </div>

        {inventorySubTab === 'summary' ? (
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
                  { code: 'CKP', name: 'Cokelat Lidah Buaya Premium', stock: 35, min: 15, ss: 10, rop: 22, status: 'Aman' },
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
        ) : (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Waktu</th>
                  <th style={{ padding: '12px 16px' }}>Produk</th>
                  <th style={{ padding: '12px 16px' }}>Jenis Aktivitas</th>
                  <th style={{ padding: '12px 16px' }}>Jumlah</th>
                  <th style={{ padding: '12px 16px' }}>Petugas</th>
                  <th style={{ padding: '12px 16px' }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '2026-10-09 14:20', prd: 'Keripik Labu Madu', type: 'Stock In', qty: '+30 pcs', user: 'Budi Santoso (Stock Manager)', note: 'Hasil Produksi Batch #28' },
                  { time: '2026-10-09 11:15', prd: 'Minuman Jelly Telang', type: 'Stock Out', qty: '-10 pcs', user: 'Siti Rahmawati (Sales Admin)', note: 'Pesanan ORD-2026-081' },
                  { time: '2026-10-08 16:40', prd: 'Permen Lidah Buaya', type: 'Expired/Damaged', qty: '-2 pcs', user: 'Budi Santoso (Stock Manager)', note: 'Kemasan rusak display' },
                  { time: '2026-10-08 09:10', prd: 'Cokelat Lidah Buaya', type: 'Stock In', qty: '+25 pcs', user: 'Budi Santoso (Stock Manager)', note: 'Restock mingguan' },
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
        )}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Manajemen Pesanan Penjualan</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Penerimaan pesanan, verifikasi otomatis stok fisik, dan alur pemrosesan.</p>
          </div>
          <button
            onClick={() => triggerAction('Form pesanan baru siap dibuat.')}
            style={{ backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            + Buat Pesanan Baru
          </button>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {successToast}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>No. Pesanan</th>
                <th style={{ padding: '12px 16px' }}>Pelanggan</th>
                <th style={{ padding: '12px 16px' }}>Item Produk</th>
                <th style={{ padding: '12px 16px' }}>Total Bayar</th>
                <th style={{ padding: '12px 16px' }}>Ketersediaan Stok</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'ORD-2026-081', customer: 'Ibu Ratna (Reseller)', items: 'Keripik Labu 150g (10x)', total: 'Rp 180.000', stockCheck: 'Stok Cukup (48 pcs)', status: 'Menunggu Konfirmasi' },
                { id: 'ORD-2026-080', customer: 'Bpk. Hendra (Offline)', items: 'Jelly Bunga Telang (5x)', total: 'Rp 65.000', stockCheck: 'Stok Menipis (6 pcs)', status: 'Diproses' },
                { id: 'ORD-2026-079', customer: 'Toko Cemilan Bu Wardah', items: 'Cokelat Aloe Vera (15x)', total: 'Rp 375.000', stockCheck: 'Stok Cukup (35 pcs)', status: 'Selesai' },
                { id: 'ORD-2026-078', customer: 'Warung Bu Siti', items: 'Permen Lidah Buaya (8x)', total: 'Rp 96.000', stockCheck: 'Stok Cukup (12 pcs)', status: 'Selesai' },
              ].map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2d6a4f' }}>{o.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{o.customer}</td>
                  <td style={{ padding: '12px 16px' }}>{o.items}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{o.total}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: o.stockCheck.includes('Menipis') ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{o.stockCheck}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: o.status === 'Selesai' ? '#dcfce7' : o.status === 'Diproses' ? '#e0f2fe' : '#fef3c7', color: o.status === 'Selesai' ? '#16a34a' : o.status === 'Diproses' ? '#0284c7' : '#b45309' }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => triggerAction(`Pesanan ${o.id} berhasil diperbarui.`)}
                      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Update Status
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Demand Forecasting (ARIMA & Croston SBA)</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Peramalan deret waktu berkala untuk estimasi kebutuhan stok Toko Farm Berkah.</p>
          </div>
          <button
            onClick={() => triggerAction('Kalkulasi ulang model peramalan ARIMA & Croston SBA selesai.')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <RefreshCw size={15} />
            <span>Hitung Ulang Peramalan (Horizon 4 Minggu)</span>
          </button>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {successToast}
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
                <th style={{ padding: '10px 14px' }}>Metode Rekomendasi</th>
                <th style={{ padding: '10px 14px' }}>Minggu 1</th>
                <th style={{ padding: '10px 14px' }}>Minggu 2</th>
                <th style={{ padding: '10px 14px' }}>Minggu 3</th>
                <th style={{ padding: '10px 14px' }}>Minggu 4</th>
                <th style={{ padding: '10px 14px' }}>Akurasi (RMSE)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { sku: 'Keripik Labu Madu (MDT)', method: 'ARIMA (1,1,1)', m1: '28 pcs', m2: '32 pcs', m3: '30 pcs', m4: '35 pcs', acc: '1.42 (Optimal)' },
                { sku: 'Permen Lidah Buaya (LDB)', method: 'Croston SBA', m1: '18 pcs', m2: '16 pcs', m3: '20 pcs', m4: '19 pcs', acc: '1.85 (Optimal)' },
                { sku: 'Jelly Bunga Telang (MLB)', method: 'ARIMA (0,1,1)', m1: '24 pcs', m2: '22 pcs', m3: '26 pcs', m4: '28 pcs', acc: '1.60 (Optimal)' },
                { sku: 'Stick Labu Gurih (PSK)', method: 'Croston SBA', m1: '15 pcs', m2: '14 pcs', m3: '18 pcs', m4: '17 pcs', acc: '1.92 (Optimal)' },
                { sku: 'Cokelat Lidah Buaya (CKP)', method: 'ARIMA (1,0,0)', m1: '20 pcs', m2: '22 pcs', m3: '25 pcs', m4: '24 pcs', acc: '1.51 (Optimal)' },
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

  // Recommendations Module (FR-SR-1 s/d FR-SR-6)
  if (tabId === 'recommendation') {
    if (!isRole(ROLES.SUPER_ADMIN, ROLES.STOCK_MANAGER)) {
      return <AccessDenied featureName="Rekomendasi Persediaan & Restock" onBackToDashboard={onBackToDashboard} />;
    }
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Rekomendasi Persediaan & Restock</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Perhitungan otomatis Safety Stock, Reorder Point (ROP), dan saran produksi harian.</p>
          </div>
          <button
            onClick={() => triggerAction('Rencana rekomendasi restock berhasil diexport.')}
            style={{ backgroundColor: '#2d6a4f', color: '#fff', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Buat Perintah Pengadaan / Produksi
          </button>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {successToast}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fee2e2', padding: '16px', borderLeft: '4px solid #dc2626' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#dc2626', fontWeight: 700 }}>
              <AlertTriangle size={18} />
              <span>Prioritas Kritis: Minuman Jelly Telang</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#48564e', lineHeight: 1.4, marginBottom: '10px' }}>
              Stok saat ini <strong>6 pcs</strong> berada di bawah Reorder Point (<strong>20 pcs</strong>) dan Safety Stock (<strong>8 pcs</strong>). Disarankan restock minimal <strong>30 pcs</strong> dalam 2 hari ke depan.
            </p>
            <button
              onClick={() => triggerAction('Instruksi restok Jelly Telang dikirim ke tim produksi.')}
              style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Kirim Perintah Restok
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fef3c7', padding: '16px', borderLeft: '4px solid #b45309' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#b45309', fontWeight: 700 }}>
              <AlertTriangle size={18} />
              <span>Peringatan Reorder: Permen Lidah Buaya</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#48564e', lineHeight: 1.4, marginBottom: '10px' }}>
              Stok saat ini <strong>12 pcs</strong> telah menyentuh batas Reorder Point (<strong>25 pcs</strong>). Disarankan menjadwalkan batch produksi olahan aloe vera berikutnya sebesar <strong>25 pcs</strong>.
            </p>
            <button
              onClick={() => triggerAction('Jadwal produksi Permen Lidah Buaya ditambahkan.')}
              style={{ padding: '6px 12px', background: '#fef3c7', color: '#b45309', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Jadwalkan Produksi
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e1e7e2', fontWeight: 700, fontSize: '0.9rem', color: '#142019' }}>
            Daftar Lengkap Kalkulasi Rekomendasi Restock
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Produk</th>
                <th style={{ padding: '12px 16px' }}>Stok Fisik</th>
                <th style={{ padding: '12px 16px' }}>Safety Stock (SS)</th>
                <th style={{ padding: '12px 16px' }}>Reorder Point (ROP)</th>
                <th style={{ padding: '12px 16px' }}>Saran Kuantitas Order</th>
                <th style={{ padding: '12px 16px' }}>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {[
                { prd: 'Minuman Jelly Bunga Telang', stock: 6, ss: 8, rop: 20, rec: 30, urg: 'Segera Restock' },
                { prd: 'Permen Lidah Buaya Manis', stock: 12, ss: 12, rop: 25, rec: 25, urg: 'Perlu Order' },
                { prd: 'Kue Kering Labu Berkah', stock: 22, ss: 8, rop: 18, rec: 0, urg: 'Aman' },
                { prd: 'Keripik Labu Madu 150g', stock: 48, ss: 15, rop: 30, rec: 0, urg: 'Aman' },
                { prd: 'Stick Olahan Labu Gurih', stock: 30, ss: 10, rop: 20, rec: 0, urg: 'Aman' },
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f4f1' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.prd}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{r.stock} unit</td>
                  <td style={{ padding: '12px 16px' }}>{r.ss} unit</td>
                  <td style={{ padding: '12px 16px' }}>{r.rop} unit</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: r.rec > 0 ? '#2d6a4f' : '#718277' }}>
                    {r.rec > 0 ? `+${r.rec} unit` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: r.urg === 'Aman' ? '#dcfce7' : r.urg === 'Segera Restock' ? '#fee2e2' : '#fef3c7', color: r.urg === 'Aman' ? '#16a34a' : r.urg === 'Segera Restock' ? '#dc2626' : '#b45309' }}>
                      {r.urg}
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

  // Reports Module (FR-RP-1 s/d FR-RP-6)
  if (tabId === 'reports') {
    return (
      <div style={{ padding: '24px' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019' }}>Laporan & Rekapitulasi Operasional</h1>
            <p style={{ fontSize: '0.85rem', color: '#48564e' }}>Laporan berkala kinerja penjualan, mutasi stok, dan akurasi model peramalan.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => triggerAction('Laporan PDF berhasil diunduh.')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#dc2626', color: '#fff', padding: '8px 14px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer' }}
            >
              <FileText size={15} />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => triggerAction('Laporan Excel (.xlsx) berhasil diunduh.')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2d6a4f', color: '#fff', padding: '8px 14px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.825rem', cursor: 'pointer' }}
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {successToast && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {successToast}
          </div>
        )}

        {/* Filter bar */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#142019' }}>Pilih Jenis Laporan:</span>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #c0ccc4', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <option value="sales">Laporan Penjualan (Sales Summary)</option>
            <option value="inventory">Laporan Mutasi & Saldo Stok</option>
            <option value="forecasting">Laporan Evaluasi Peramalan</option>
          </select>

          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#142019', marginLeft: '12px' }}>Periode:</span>
          <select style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #c0ccc4', fontSize: '0.85rem' }}>
            <option>Bulan Ini (Oktober 2026)</option>
            <option>Bulan Lalu (September 2026)</option>
            <option>Kuartal 3 (Juli - Sept 2026)</option>
          </select>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#142019' }}>
              {reportType === 'sales' && 'Rekapitulasi Penjualan Produk Olahan Pertanian'}
              {reportType === 'inventory' && 'Rekapitulasi Arus Mutasi Persediaan'}
              {reportType === 'forecasting' && 'Rekapitulasi Evaluasi Akurasi Peramalan Deret Waktu'}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#718277' }}>UMKM Toko Farm Berkah</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Kategori / Produk</th>
                <th style={{ padding: '10px 14px' }}>Unit Terjual</th>
                <th style={{ padding: '10px 14px' }}>Nilai Penjualan</th>
                <th style={{ padding: '10px 14px' }}>Stok Akhir</th>
                <th style={{ padding: '10px 14px' }}>Status Perputaran</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Keripik Labu Madu 150g', sold: '142 pcs', val: 'Rp 2.556.000', stock: '48 pcs', turn: 'Cepat (Fast Moving)' },
                { name: 'Kue Kering Labu Berkah', sold: '58 pcs', val: 'Rp 2.030.000', stock: '22 pcs', turn: 'Stabil' },
                { name: 'Permen Lidah Buaya Manis', sold: '85 pcs', val: 'Rp 1.020.000', stock: '12 pcs', turn: 'Stabil' },
                { name: 'Stick Olahan Labu Gurih', sold: '94 pcs', val: 'Rp 1.410.000', stock: '30 pcs', turn: 'Stabil' },
                { name: 'Minuman Jelly Bunga Telang', sold: '110 pcs', val: 'Rp 1.430.000', stock: '6 pcs', turn: 'Cepat (Fast Moving)' },
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f4f1' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.sold}</td>
                  <td style={{ padding: '10px 14px', color: '#2d6a4f', fontWeight: 700 }}>{r.val}</td>
                  <td style={{ padding: '10px 14px' }}>{r.stock}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>
                      {r.turn}
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

  // Fallback
  return (
    <div style={{ padding: '24px' }} className="animate-fade-in">
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '30px', textAlign: 'center' }}>
        <CheckCircle size={40} color="#2d6a4f" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
          Modul Terverifikasi
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#718277', maxWidth: '420px', margin: '0 auto' }}>
          Halaman siap digunakan.
        </p>
      </div>
    </div>
  );
}

