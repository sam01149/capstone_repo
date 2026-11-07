import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  X,
  Search,
  ChevronDown,
  Check,
  TrendingUp,
} from 'lucide-react';
import { formatRupiah, formatStockUnit, formatMutationQuantity, formatRemainingStockToast } from '../data/productsData';

export default function BarangMasuk({
  products,
  movements,
  forecasts,
  user,
  onSaveProducts,
  onSaveMovements,
  onSaveForecasts,
  onExportCsv,
  onNavigateToForecast,
}) {
  // Form State untuk Input Penambahan Stok
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Searchable Select State & Ref
  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const productSelectRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productSelectRef.current && !productSelectRef.current.contains(event.target)) {
        setIsProductSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isProductSelectOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isProductSelectOpen]);

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return products;
    const term = productSearchTerm.toLowerCase();
    return products.filter((p) =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.id || '').toLowerCase().includes(term)
    );
  }, [products, productSearchTerm]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Kalkulasi parameter produk terpilih
  const currentRop = selectedProduct?.reorderPoint || selectedProduct?.minStock || 15;
  const currentSafetyStock = selectedProduct?.safetyStock || Math.round(currentRop * 0.5);
  const isIntermittentProd = (selectedProduct?.categorySlug || '').includes('keripik') || (selectedProduct?.name || '').toLowerCase().includes('keripik');
  const modelUsedProd = isIntermittentProd ? 'Croston SBA' : 'ARIMA (1,1,1)';

  // 1. CEK & BUKA MODAL KONFIRMASI (YA / TIDAK) SEBELUM SIMPAN
  const handleInitiateSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      alert('Kuantitas penambahan stok harus lebih dari 0.');
      return;
    }
    if (!selectedProduct) return;
    setShowConfirmModal(true);
  };

  // 2. EKSEKUSI SIMPAN SETELAH KLIK "YA"
  const handleConfirmSaveStockIn = () => {
    const qty = parseInt(quantity, 10);
    if (!qty || !selectedProduct) return;

    // 1. Tambah stok fisik produk
    const oldStock = selectedProduct.stock || 0;
    const newStock = oldStock + qty;
    const updatedProducts = products.map((p) =>
      p.id === selectedProduct.id ? { ...p, stock: newStock } : p
    );
    onSaveProducts(updatedProducts);

    // 2. Evaluasi Sisa Stok vs Reorder Point (ROP)
    const isPerluRestock = newStock <= currentRop;

    // 3. Sistem catat histori pergerakan stok (IN)
    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    const newMovement = {
      id: `MOV-IN-${Date.now().toString().slice(-6)}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      type: 'IN',
      category: 'Restock Produk',
      quantity: qty,
      remainingStock: newStock,
      date: nowStr,
      reference: notes.trim() || 'Barang Masuk (Kualitas Baik)',
      operator: user?.name || 'Stock Manager (BS)',
      ropStatus: isPerluRestock ? 'Perlu Restock' : 'Stok Aman',
    };
    const updatedMovements = [newMovement, ...movements];
    onSaveMovements(updatedMovements);

    // 4. Kalkulasi Demand Forecast (ARIMA / Croston SBA) & Safety Stock
    const updatedForecasts = forecasts.map((f) => {
      const growthFactor = 1 + (Math.random() * 0.1 - 0.03);
      return {
        ...f,
        horizonW1: Math.max(1, Math.round(f.horizonW1 * growthFactor)),
        horizonW2: Math.max(1, Math.round(f.horizonW2 * growthFactor)),
        horizonW3: Math.max(1, Math.round(f.horizonW3 * growthFactor)),
        horizonW4: Math.max(1, Math.round(f.horizonW4 * growthFactor)),
      };
    });
    onSaveForecasts(updatedForecasts);

    // Tutup modal konfirmasi & reset form
    setShowConfirmModal(false);
    setQuantity('');
    setNotes('');

    // 5. Tampilkan notifikasi sukses (centang tunggal) dengan evaluasi ROP
    const addedText = formatMutationQuantity(qty, selectedProduct.unit);
    const remainingText = formatRemainingStockToast(newStock, selectedProduct.unit);
    const ropAlertText = isPerluRestock ? '⚠️: Perlu Restock' : 'Status: Stok Aman';
    setToastMessage(`Berhasil menambahkan +${addedText} untuk ${selectedProduct.name}. Sisa stok saat ini: ${remainingText}. (${ropAlertText})`);
    setTimeout(() => setToastMessage(''), 5000);
  };

  // Nilai proyeksi untuk modal konfirmasi
  const parsedQty = parseInt(quantity, 10) || 0;
  const projectedRemainingStock = (selectedProduct?.stock || 0) + parsedQty;
  const isModalRopTriggered = projectedRemainingStock <= currentRop;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* TOAST NOTIFIKASI */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1b4332',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 100,
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid #86efac',
          }}
        >
          <CheckCircle2 size={18} color="#86efac" />
          <span>{typeof toastMessage === 'string' ? toastMessage.replace(/^[✓✔]\s*/, '') : toastMessage}</span>
        </div>
      )}

      {/* MODAL KONFIRMASI SIMPAN BARANG MASUK (YA / TIDAK) */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#15803d',
                    flexShrink: 0,
                  }}
                >
                  <ArrowDownLeft size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#142019' }}>
                    Konfirmasi Simpan Barang Masuk
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    Apakah Anda yakin ingin menyimpan penambahan stok ini?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Rincian Penambahan Stok */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Nama Produk:</span>
                <span style={{ fontWeight: 800, color: '#142019', textAlign: 'right' }}>{selectedProduct?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Kuantitas Masuk:</span>
                <span style={{ fontWeight: 800, color: '#15803d' }}>
                  +{formatMutationQuantity(parsedQty, selectedProduct?.unit)} ({parsedQty} {selectedProduct?.unit})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Catatan Produk:</span>
                <span style={{ fontWeight: 600, color: '#334155', textAlign: 'right', fontStyle: notes.trim() ? 'normal' : 'italic' }}>
                  {notes.trim() || 'Barang Masuk (Kualitas Baik)'}
                </span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Sisa Stok Setelah Masuk:</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#142019' }}>
                  {formatRemainingStockToast(projectedRemainingStock, selectedProduct?.unit)}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginLeft: '6px' }}>
                    (Batas ROP: {currentRop})
                  </span>
                </span>
              </div>
            </div>

            {/* Kotak Hasil Evaluasi: Sisa Stok vs Reorder Point (ROP) */}
            {isModalRopTriggered ? (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={24} color="#b45309" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
                    Sisa Stok ≤ Reorder Point: PERLU RESTOCK!
                  </div>
                  <div style={{ fontSize: '12px', color: '#b45309', marginTop: '3px', lineHeight: 1.4 }}>
                    Sisa stok ({formatRemainingStockToast(projectedRemainingStock, selectedProduct?.unit)}) masih di bawah / sama dengan batas ROP ({currentRop}).
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <CheckCircle2 size={24} color="#15803d" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                    Sisa Stok &gt; Reorder Point: STATUS STOK AMAN
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d', marginTop: '3px', lineHeight: 1.4 }}>
                    Sisa stok ({formatRemainingStockToast(projectedRemainingStock, selectedProduct?.unit)}) berada di atas batas ROP ({currentRop}).
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Aksi Ya / Tidak */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '11px 20px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                Tidak, Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveStockIn}
                style={{
                  backgroundColor: '#1b4332',
                  border: 'none',
                  color: '#ffffff',
                  padding: '11px 22px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(27, 67, 50, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Ya, Simpan Barang Masuk</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}



      {/* 2. FORMULIR INPUT PENAMBAHAN STOK */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid #e2e8e3',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowDownLeft size={20} color="#166534" />
            Input Penambahan Stok
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Operator: <strong style={{ color: '#142019' }}>{user?.name || 'Budi Santoso'}</strong>
          </span>
        </div>

        <form onSubmit={handleInitiateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Field 1: Pilih Produk (Searchable Dropdown) */}
          <div ref={productSelectRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Pilih Produk yang Masuk:
            </label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsProductSelectOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsProductSelectOpen((prev) => !prev);
                }
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: isProductSelectOpen ? '2px solid #1b4332' : '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                fontWeight: 600,
                color: '#142019',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedProduct
                    ? `${selectedProduct.name} (Stok Saat Ini: ${formatStockUnit(selectedProduct.stock, selectedProduct.unit)})`
                    : 'Pilih Produk...'}
                </span>
              </div>
              <ChevronDown
                size={18}
                color="#64748b"
                style={{
                  transform: isProductSelectOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              />
            </div>

            {/* Dropdown Popover dengan Filter Cari */}
            {isProductSelectOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                {/* Search Input Bar */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <Search size={16} color="#64748b" style={{ flexShrink: 0 }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="Ketik untuk memfilter / mencari produk..."
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1e293b',
                    }}
                  />
                  {productSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setProductSearchTerm('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Product Options List */}
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                      Tidak ada produk yang cocok dengan "{productSearchTerm}"
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = p.id === selectedProductId;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setIsProductSelectOpen(false);
                            setProductSearchTerm('');
                          }}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                            borderBottom: '1px solid #f8fafc',
                            transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#15803d' : '#1e293b' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              Stok Saat Ini: <strong style={{ color: '#334155' }}>{formatStockUnit(p.stock, p.unit)}</strong>
                            </div>
                          </div>
                          {isSelected && <Check size={16} color="#15803d" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Field 2: Kuantitas */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Kuantitas Penambahan Stok:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min="1"
                required
                placeholder="Masukkan kuantitas penambahan stok..."
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#166534',
                  padding: '12px 18px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '10px',
                  border: '1px solid #bbf7d0',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedProduct?.unit || 'Pcs'}
              </span>
            </div>
          </div>

          {/* Field 3: Catatan Produk */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Catatan Produk:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kualitas produk bagus dan segar, kemasan aman, grade A..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: '6px',
              backgroundColor: '#1b4332',
              color: '#ffffff',
              border: 'none',
              padding: '13px 20px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(27, 67, 50, 0.2)',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>Simpan Barang Masuk</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>

      {/* 2.5 BANNER ALUR OPERASIONAL: LANJUT KE KALKULASI DEMAND FORECAST */}
      {onNavigateToForecast && (
        <div
          style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0369a1' }}>
                Langkah Selanjutnya: Kalkulasi Demand Forecast & Safety Stock
              </div>
              <div style={{ fontSize: '12.5px', color: '#0284c7', marginTop: '2px' }}>
                Setelah pencatatan stok selesai, lanjutkan kalkulasi peramalan kebutuhan (ARIMA & Croston SBA) serta evaluasi batas ROP di Halaman Analisis Forecast.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToForecast}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '11px 20px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              transition: 'background-color 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0369a1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0284c7';
            }}
          >
            <span>Kalkulasi Demand Forecast ARIMA</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* 3. TABEL HISTORI PENCATATAN BARANG MASUK */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8e3', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#142019', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#166534" />
              Histori Pencatatan Barang Masuk
            </h3>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ width: '16.66%', padding: '12px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>ID MUTASI</th>
                <th style={{ width: '16.66%', padding: '12px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>PRODUK</th>
                <th style={{ width: '16.66%', padding: '12px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>JUMLAH MASUK</th>
                <th style={{ width: '16.66%', padding: '12px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>SISA STOK</th>
                <th style={{ width: '16.66%', padding: '12px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>OPERATOR & WAKTU</th>
                <th style={{ width: '16.66%', padding: '12px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.02em', textAlign: 'center' }}>CATATAN PRODUK</th>
              </tr>
            </thead>
            <tbody>
              {movements
                .filter(
                  (m) =>
                    m.type === 'IN' &&
                    !['MOV-972', 'MOV-213', 'MOV-091', 'MOV-089'].includes(m.id) &&
                    !String(m.reference || '').includes('ORD-2026-659') &&
                    !String(m.reference || '').includes('ORD-2026-527') &&
                    !String(m.reference || '').includes('ORD-2026-079') &&
                    !String(m.reference || '').includes('KASIR-004')
                )
                .slice(0, 8)
                .map((m) => {
                  const prod = products.find((p) => p.id === m.productId || p.name === m.productName);
                  const prodRop = prod?.reorderPoint || prod?.minStock || 15;
                  const isPerlu = (m.remainingStock ?? 0) <= prodRop;

                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ width: '16.66%', padding: '12px 14px', fontWeight: 700, color: '#0369a1', verticalAlign: 'middle', textAlign: 'center' }}>
                        {m.id}
                      </td>
                      <td style={{ width: '16.66%', padding: '12px 14px', fontWeight: 800, color: '#1b4332', verticalAlign: 'middle', wordBreak: 'break-word', textAlign: 'center' }}>
                        {m.productName}
                      </td>
                      <td style={{ width: '16.66%', padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#15803d', fontSize: '14px', verticalAlign: 'middle' }}>
                        +{m.quantity}
                      </td>
                      <td style={{ width: '16.66%', padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#142019' }}>{m.remainingStock}</div>
                        <div style={{ marginTop: '4px' }}>
                          {isPerlu ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <AlertTriangle size={11} />
                              Perlu Restock
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <CheckCircle2 size={11} />
                              Stok Aman
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ width: '16.66%', padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
                          {m.operator || 'Budi Santoso'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                          {m.date}
                        </div>
                      </td>
                      <td style={{ width: '16.66%', padding: '12px 14px', color: '#475569', fontSize: '12.5px', verticalAlign: 'middle', wordBreak: 'break-word', textAlign: 'center' }}>
                        {m.reference || '-'}
                      </td>
                    </tr>
                  );
                })}
              {movements.filter((m) => m.type === 'IN').length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Belum ada histori transaksi barang masuk yang tercatat.
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
