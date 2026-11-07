import React, { useState } from 'react';
import { FileSpreadsheet, Search, X } from 'lucide-react';
import { formatRupiah, formatStockUnit } from '../data/productsData';

export default function AnalisisForecast({
  products,
  forecasts,
  user,
  onSaveForecasts,
  onExportCsv,
  onBackToDashboard,
}) {
  const [horizonWeek, setHorizonWeek] = useState(4); // 1 - 4 minggu
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter produk berdasarkan kategori dan kata kunci pencarian
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.categorySlug === selectedCategory;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (p.name || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.id || '').toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* TABEL HASIL ANALISIS FORECAST PER PRODUK */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        {/* BARIS 1: JUDUL & JUMLAH PRODUK */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#142019' }}>
              Hasil Prediksi Permintaan & Parameter Reorder Stok
            </h3>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                padding: '3px 10px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              {filteredProducts.length} Produk
            </span>
          </div>
        </div>

        {/* BARIS 2: TOOLBAR TERPADU (SEARCH DI KIRI, HORIZON & EXPORT DI KANAN) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {/* KIRI: Input Pencarian */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama produk atau kategori..."
              style={{
                width: '100%',
                padding: '9px 34px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#f8fafc',
                fontWeight: 600,
                color: '#1e293b',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#1b4332';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                if (!searchTerm) e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* KANAN: Horizon Prediksi & Tombol Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Horizon Prediksi:</span>
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {[1, 2, 3, 4].map((w) => {
                  const isActive = horizonWeek === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setHorizonWeek(w)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isActive ? '#0284c7' : 'transparent',
                        color: isActive ? '#ffffff' : '#475569',
                        fontWeight: isActive ? 800 : 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 1px 3px rgba(2, 132, 199, 0.3)' : 'none',
                      }}
                    >
                      {w} Minggu
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={onExportCsv}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(27, 67, 50, 0.2)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#143527';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1b4332';
              }}
            >
              <FileSpreadsheet size={15} />
              <span>Export Laporan Persediaan</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ width: '14.28%', padding: '12px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>PRODUK & KATEGORI</th>
                <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>METODE TERPILIH</th>
                <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>STOK FISIK</th>
                <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>SAFETY STOCK</th>
                <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>REORDER POINT (ROP)</th>
                <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>PREDIKSI DEMAND ({horizonWeek} MGG)</th>
                <th style={{ width: '14.28%', padding: '12px 10px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>STATUS EVALUASI ROP</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const rop = p.reorderPoint || p.minStock || 15;
                const ss = p.safetyStock || Math.round(rop * 0.5);
                const isRestock = (p.stock || 0) <= rop;
                const isIntermittent = (p.categorySlug || '').includes('keripik') || p.name.toLowerCase().includes('keripik');
                const modelUsed = isIntermittent ? 'Croston SBA' : 'ARIMA';

                // Prediksi demand mingguan
                const forecastData = forecasts.find((f) => f.productId === p.id) || {
                  horizonW1: 12,
                  horizonW2: 14,
                  horizonW3: 13,
                  horizonW4: 15,
                };
                const demandVal =
                  horizonWeek === 1
                    ? forecastData.horizonW1
                    : horizonWeek === 2
                      ? forecastData.horizonW1 + forecastData.horizonW2
                      : horizonWeek === 3
                        ? forecastData.horizonW1 + forecastData.horizonW2 + forecastData.horizonW3
                        : forecastData.horizonW1 + forecastData.horizonW2 + forecastData.horizonW3 + forecastData.horizonW4;

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ width: '14.28%', padding: '12px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 800, color: '#1b4332' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.category}</div>
                    </td>
                    <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          backgroundColor: isIntermittent ? '#fef3c7' : '#e0f2fe',
                          color: isIntermittent ? '#92400e' : '#0369a1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                        }}
                      >
                        {modelUsed}
                      </span>
                    </td>
                    <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, color: isRestock ? '#dc2626' : '#15803d' }}>
                      {formatStockUnit(p.stock, p.unit)}
                    </td>
                    <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#475569' }}>
                      {formatStockUnit(ss, p.unit)}
                    </td>
                    <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#475569' }}>
                      {formatStockUnit(rop, p.unit)}
                    </td>
                    <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, color: '#0369a1' }}>
                      {formatStockUnit(`~${demandVal}`, p.unit)}
                    </td>
                    <td style={{ width: '14.28%', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {isRestock ? (
                        <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, border: '1px solid #fca5a5' }}>
                          PERLU RESTOCK!
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, border: '1px solid #86efac' }}>
                          STOK AMAN
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Tidak ada produk yang cocok dengan pencarian "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

