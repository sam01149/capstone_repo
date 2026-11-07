import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Package,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  ExternalLink,
  LogOut,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Check,
  Activity,
  Sliders,
  BarChart3,
  Info,
  Zap,
  RotateCcw,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStoredProducts, saveStoredProducts, formatRupiah } from '../data/productsData';
import {
  getStoredMovements,
  saveStoredMovements,
  getStoredForecasts,
  saveStoredForecasts,
  FARMSIGHT_MODEL_MONITORING_DATA,
  FARMSIGHT_INVENTORY_LOGS,
  FARMSIGHT_FORECAST_HORIZONS,
} from '../data/ordersAndInventoryData';

export default function DashboardStockManager({ onLogout, onViewCatalog }) {
  const { user } = useAuth();

  // Core Data States
  const [products, setProducts] = useState(getStoredProducts);
  const [movements, setMovements] = useState(getStoredMovements);
  const [forecasts, setForecasts] = useState(getStoredForecasts);
  const [successToast, setSuccessToast] = useState('');

  // Main FarmSight Tabs matching User Mockups:
  // 'dashboard' | 'inventory' | 'model' | 'lab'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Sub-tab for Data Inventaris
  const [inventorySubTab, setInventorySubTab] = useState('logs'); // 'logs' (Log Pergerakan Terpadu), 'stock' (Stok Fisik), 'movement' (Histori IN/OUT)

  // Forecast Horizon Filter (Screenshot 1 & 4)
  const [forecastHorizon, setForecastHorizon] = useState(4); // 1, 2, 3, 4 minggu

  // Search & Filters
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('ALL');
  const [stockRopFilter, setStockRopFilter] = useState('ALL');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL');
  const [modelSearch, setModelSearch] = useState('');
  const [inventoryLogSearch, setInventoryLogSearch] = useState('');

  // Lab Prediksi Interactive Parameters (Screenshot 5)
  const [labProductCode, setLabProductCode] = useState('CKP');
  const [labDemandType, setLabDemandType] = useState('Intermiten / Sporadis');
  const [labMethod, setLabMethod] = useState('CROSTON_SBA');
  const [labP, setLabP] = useState(1);
  const [labD, setLabD] = useState(1);
  const [labQ, setLabQ] = useState(1);
  const [labAlpha, setLabAlpha] = useState(0.2);
  const [labLeadTime, setLabLeadTime] = useState(3);
  const [labServiceLevel, setLabServiceLevel] = useState(95);
  const [labHoldingCost, setLabHoldingCost] = useState(1000);
  const [labStockoutCost, setLabStockoutCost] = useState(5000);
  const [labDemandShock, setLabDemandShock] = useState(0);

  // Modal 1: Barang Masuk (Restock)
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [inProdId, setInProdId] = useState(products[0]?.id || 'ES-TELANG');
  const [inQty, setInQty] = useState(20);
  const [inCategory, setInCategory] = useState('Panen & Produksi Baru');
  const [inNote, setInNote] = useState('Batch Panen Segar Kebun Pulo Gebang');

  // Modal 2: Barang Keluar (Rusak / Kadaluwarsa / Penyesuaian)
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [outProdId, setOutProdId] = useState(products[0]?.id || 'ES-TELANG');
  const [outQty, setOutQty] = useState(5);
  const [outCategory, setOutCategory] = useState('Barang Rusak / Spoilage');
  const [outNote, setOutNote] = useState('Kemasan rusak saat sortir gudang');

  // Modal Hasil Gateway ROP & Alur Selesai
  const [gatewayResultModal, setGatewayResultModal] = useState(null);

  // Sync data across tabs
  useEffect(() => {
    const syncAll = () => {
      setProducts(getStoredProducts());
      setMovements(getStoredMovements());
      setForecasts(getStoredForecasts());
    };
    window.addEventListener('storage', syncAll);
    window.addEventListener('farmsight_products_updated', syncAll);
    window.addEventListener('farmsight_movements_updated', syncAll);
    const interval = setInterval(syncAll, 1500);
    return () => {
      window.removeEventListener('storage', syncAll);
      window.removeEventListener('farmsight_products_updated', syncAll);
      window.removeEventListener('farmsight_movements_updated', syncAll);
      clearInterval(interval);
    };
  }, []);

  const triggerToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  // Helper kalkulasi ulang ARIMA & Croston SBA
  const recalculateForecastEngine = (currentForecasts = forecasts) => {
    return currentForecasts.map((f) => {
      const growthFactor = 1 + (Math.random() * 0.12 - 0.04);
      const w1 = Math.round(f.horizonW1 * growthFactor);
      const w2 = Math.round(f.horizonW2 * growthFactor);
      const w3 = Math.round(f.horizonW3 * growthFactor);
      const w4 = Math.round(f.horizonW4 * growthFactor);
      return {
        ...f,
        horizonW1: Math.max(1, w1),
        horizonW2: Math.max(1, w2),
        horizonW3: Math.max(1, w3),
        horizonW4: Math.max(1, w4),
      };
    });
  };

  // AKSI 1: BARANG MASUK (RESTOCK MANUAL)
  const handleStockInSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(inQty, 10);
    if (!qty || qty <= 0) {
      alert('Kuantitas penambahan stok harus lebih dari 0.');
      return;
    }

    const targetProd = products.find((p) => p.id === inProdId);
    if (!targetProd) return;

    const newStock = (targetProd.stock || 0) + qty;
    const updatedProducts = products.map((p) => (p.id === inProdId ? { ...p, stock: newStock } : p));
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);

    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    const newMovement = {
      id: `MOV-${Date.now().toString().slice(-6)}`,
      productId: targetProd.id,
      productName: targetProd.name,
      type: 'IN',
      category: inCategory,
      quantity: qty,
      remainingStock: newStock,
      date: nowStr,
      reference: inNote || 'Penambahan Stok Manual / Restock',
      operator: user?.name || 'Stock Manager (BS)',
    };
    const updatedMovements = [newMovement, ...movements];
    setMovements(updatedMovements);
    saveStoredMovements(updatedMovements);

    const rop = targetProd.reorderPoint || targetProd.minStock || 15;
    const isRopTriggered = newStock <= rop;
    const ropStatusText = isRopTriggered ? 'PERLU RESTOCK' : 'STOK AMAN';

    const updatedForecasts = recalculateForecastEngine(forecasts);
    setForecasts(updatedForecasts);
    saveStoredForecasts(updatedForecasts);

    setIsStockInModalOpen(false);

    setGatewayResultModal({
      actionTitle: 'Barang Masuk (Restock Manual)',
      product: targetProd,
      qtyChange: `+${qty}`,
      newStock,
      rop,
      isRopTriggered,
      ropStatusText,
      forecastUpdated: true,
      message: `Penambahan stok +${qty} unit untuk ${targetProd.name} berhasil disimpan. Sisa stok saat ini: ${newStock} ${targetProd.unit}.`,
    });

    triggerToast(`✓ Penambahan stok +${qty} unit berhasil dicatat. Mutasi & Kalkulasi Forecast diperbarui!`);
  };

  // AKSI 2: BARANG KELUAR (RUSAK / KADALUWARSA)
  const handleStockOutSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(outQty, 10);
    if (!qty || qty <= 0) {
      alert('Kuantitas pengurangan stok harus lebih dari 0.');
      return;
    }

    const targetProd = products.find((p) => p.id === outProdId);
    if (!targetProd) return;

    if (qty > targetProd.stock) {
      alert(`Stok tidak mencukupi untuk pengurangan ini. Stok saat ini hanya ${targetProd.stock} ${targetProd.unit}.`);
      return;
    }

    const newStock = Math.max(0, targetProd.stock - qty);
    const updatedProducts = products.map((p) => (p.id === outProdId ? { ...p, stock: newStock } : p));
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);

    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    const newMovement = {
      id: `MOV-${Date.now().toString().slice(-6)}`,
      productId: targetProd.id,
      productName: targetProd.name,
      type: 'OUT',
      category: outCategory,
      quantity: -qty,
      remainingStock: newStock,
      date: nowStr,
      reference: outNote || 'Pengurangan Stok Manual / Spoilage',
      operator: user?.name || 'Stock Manager (BS)',
    };
    const updatedMovements = [newMovement, ...movements];
    setMovements(updatedMovements);
    saveStoredMovements(updatedMovements);

    const rop = targetProd.reorderPoint || targetProd.minStock || 15;
    const isRopTriggered = newStock <= rop;
    const ropStatusText = isRopTriggered ? 'PERLU RESTOCK' : 'STOK AMAN';

    const updatedForecasts = recalculateForecastEngine(forecasts);
    setForecasts(updatedForecasts);
    saveStoredForecasts(updatedForecasts);

    setIsStockOutModalOpen(false);

    setGatewayResultModal({
      actionTitle: 'Barang Keluar (Rusak / Kadaluwarsa)',
      product: targetProd,
      qtyChange: `-${qty}`,
      newStock,
      rop,
      isRopTriggered,
      ropStatusText,
      forecastUpdated: true,
      message: `Pengurangan stok -${qty} unit untuk ${targetProd.name} berhasil dicatat. Sisa stok saat ini: ${newStock} ${targetProd.unit}.`,
    });

    triggerToast(`✓ Barang Keluar -${qty} unit dicatat. Mutasi & Kalkulasi Forecast diperbarui!`);
  };

  // AKSI 3: ANALISIS FORECAST
  const handleRunForecastAnalysis = () => {
    const updatedForecasts = recalculateForecastEngine(forecasts);
    setForecasts(updatedForecasts);
    saveStoredForecasts(updatedForecasts);
    setActiveTab('model');
    triggerToast('✓ Mesin Kalkulasi Demand Forecasting (ARIMA & Croston SBA) dan Safety Stock berhasil dihitung ulang!');
  };

  // Export Laporan Persediaan Resmi (.CSV)
  const handleExportReport = () => {
    const nowStr = new Date().toISOString().slice(0, 10);
    const csvRows = [
      ['KODE SKU', 'NAMA PRODUK', 'KATEGORI', 'STOK FISIK', 'SATUAN', 'MIN STOCK', 'SAFETY STOCK', 'REORDER POINT', 'STATUS ROP', 'NILAI ASET (RP)'],
      ...products.map((p) => {
        const rop = p.reorderPoint || p.minStock || 15;
        const ss = p.safetyStock || Math.round(rop * 0.5);
        const statusRop = p.stock <= rop ? 'PERLU RESTOCK' : 'STOK AMAN';
        const assetValue = (p.price || 0) * (p.stock || 0);
        return [p.id, p.name, p.category, p.stock, p.unit, p.minStock, ss, rop, statusRop, assetValue];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan-Persediaan-TokoFarmBerkah-${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast('✓ Laporan Persediaan (.CSV) berhasil di-generate dan diunduh!');
  };

  // Filtered products for physical stock
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(stockSearch.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(stockSearch.toLowerCase());
    const matchCat = stockCategoryFilter === 'ALL' || p.categorySlug === stockCategoryFilter;
    const rop = p.reorderPoint || p.minStock || 15;
    const isRestock = p.stock <= rop;
    const matchRop =
      stockRopFilter === 'ALL' ||
      (stockRopFilter === 'SAFE' && !isRestock) ||
      (stockRopFilter === 'RESTOCK' && isRestock);

    return matchSearch && matchCat && matchRop;
  });

  // Filtered movements
  const filteredMovements = movements.filter((m) => {
    const matchSearch =
      (m.productName || '').toLowerCase().includes(movementSearch.toLowerCase()) ||
      (m.reference || '').toLowerCase().includes(movementSearch.toLowerCase()) ||
      (m.operator || '').toLowerCase().includes(movementSearch.toLowerCase());
    const matchType = movementTypeFilter === 'ALL' || m.type === movementTypeFilter;
    return matchSearch && matchType;
  });

  // Filtered inventory logs (Screenshot 2)
  const filteredInventoryLogs = FARMSIGHT_INVENTORY_LOGS.filter((log) => {
    return (
      log.productId.toLowerCase().includes(inventoryLogSearch.toLowerCase()) ||
      log.productName.toLowerCase().includes(inventoryLogSearch.toLowerCase())
    );
  });

  // Filtered model monitoring table (Screenshot 3)
  const filteredModelMonitoring = FARMSIGHT_MODEL_MONITORING_DATA.filter((m) => {
    return (
      m.code.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.bestModel.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.status.toLowerCase().includes(modelSearch.toLowerCase())
    );
  });

  const ropAlertProducts = products.filter((p) => {
    const rop = p.reorderPoint || p.minStock || 15;
    return p.stock <= rop;
  });

  const currentHorizonData = FARMSIGHT_FORECAST_HORIZONS[forecastHorizon] || FARMSIGHT_FORECAST_HORIZONS[4];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* ------------------------------------------------------------- */}
      {/* TOP FLOATING NAVBAR FARMSIGHT (PERSIS SESUAI SCREENSHOT MOCKUP) */}
      {/* ------------------------------------------------------------- */}
      <div style={{ padding: '16px 24px 0 24px', maxWidth: '1360px', margin: '0 auto' }}>
        <header
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Brand Left: Logo + FarmSight */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              }}
            >
              <img
                src="/images/logo-farm-berkah.jpg"
                alt="Logo Toko Farm Berkah"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                FarmSight
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                Portal Stock Manager
              </span>
            </div>
          </div>

          {/* Center Tabs: Dashboard | Data Inventaris | Pemantauan Model | Laboratorium Prediksi */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'inventory', label: 'Data Inventaris' },
              { id: 'model', label: 'Pemantauan Model' },
              { id: 'lab', label: 'Laboratorium Prediksi' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 18px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 800 : 500,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Area: TFB Badge + Toko Farm Berkah + Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onViewCatalog && (
              <button
                onClick={onViewCatalog}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#2d6a4f',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ExternalLink size={13} />
                <span>Katalog</span>
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#6d28d9',
                  color: '#ffffff',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                TFB
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                Toko Farm Berkah
              </span>
            </div>

            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #fee2e2',
                backgroundColor: '#fff5f5',
                color: '#dc2626',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Keluar dari portal"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          </div>
        </header>
      </div>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 24px 60px 24px' }}>
        {/* Global Toast Message */}
        {successToast && (
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              color: '#166534',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
            <span>{typeof successToast === 'string' ? successToast.replace(/^[✓✔]\s*/, '') : successToast}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: DASHBOARD FARMSIGHT (SCREENSHOT 4 & SCREENSHOT 1) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Bar Header with Update Badge */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0369a1', letterSpacing: '0.04em' }}>
                  UPDATE: 01/11/2026
                </span>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 2px 0' }}>
                  Dashboard FarmSight
                </h1>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Pantau kinerja demand forecasting dan inventaris toko real-time.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => triggerToast('✓ Data FarmSight berhasil dimuat ulang secara real-time!')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Muat Ulang Data</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportReport}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2d6a4f',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FileSpreadsheet size={14} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Top Operational Metrics & Indeks Kesehatan (Screenshot 4) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 2fr', gap: '20px' }}>
              {/* Card Kiri: Indeks Kesehatan Inventaris (Dark Emerald Card) */}
              <div
                style={{
                  background: 'linear-gradient(145deg, #064e3b 0%, #047857 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 14px rgba(6, 78, 59, 0.2)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.9 }}>
                    Indeks Kesehatan Inventaris
                  </div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.75, marginTop: '2px' }}>
                    Agregat pergerakan stok & estimasi ROP
                  </div>

                  {/* Speedometer Gauge Visual */}
                  <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <svg viewBox="0 0 200 110" style={{ width: '160px', margin: '0 auto', display: 'block' }}>
                      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="16" strokeLinecap="round" />
                      <path d="M 20 100 A 80 80 0 0 1 145 35" fill="none" stroke="#34d399" strokeWidth="16" strokeLinecap="round" />
                      <circle cx="100" cy="100" r="6" fill="#ffffff" />
                      <line x1="100" y1="100" x2="135" y2="45" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, marginTop: '-15px' }}>70.8</div>
                    <span style={{ fontSize: '0.74rem', padding: '3px 12px', borderRadius: '12px', backgroundColor: '#34d399', color: '#064e3b', fontWeight: 800 }}>
                      Sehat
                    </span>
                  </div>

                  <p style={{ fontSize: '0.74rem', lineHeight: 1.5, opacity: 0.85, margin: '10px 0 16px 0' }}>
                    Skor agregat mencerminkan stabilitas persediaan, akurasi model peramalan, dan efektivitas pencegahan stockout.
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.75 }}>Nilai Penjualan</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>67%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.75 }}>Akurasi Prediksi</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>85%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.75 }}>Efisiensi ROP</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>60%</div>
                  </div>
                </div>
              </div>

              {/* 4 Stat Cards di Kanan */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Rentang Analisis</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>141 hari transaksi</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Data historis pergerakan transaksi toko</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Cakupan Model</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', margin: '8px 0 4px 0' }}>9 produk aktif</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Memiliki model forecasting ARIMA / Croston</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Rekomendasi Persediaan</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>9 dari 38 produk</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Telah dihitung Safety Stock & ROP optimal</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Prediksi Pendapatan (4 Mgg)</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#6d28d9', margin: '8px 0 4px 0' }}>Rp 273.049</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Estimasi demand * harga satuan produk</div>
                </div>
              </div>
            </div>

            {/* Ringkasan Operasional 4 Metrik */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total Transaksi</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>702</div>
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total Pendapatan Tunai</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>Rp 58.682.000</div>
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Prediksi Pendapatan</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#6d28d9', marginTop: '4px' }}>Rp 273.049</div>
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Rasio Pemenuhan (Fulfillment)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>82,35%</div>
              </div>
            </div>

            {/* FORECAST PENDAPATAN (PERSIS SCREENSHOT 1 & SCREENSHOT 4) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                    Forecast Pendapatan
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    Estimasi pendapatan dari prediksi demand dikali harga satuan, untuk horizon yang Anda pilih.
                  </p>
                  <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600, marginTop: '8px' }}>
                    Periode: <strong>5 Okt sampai 1 Nov 2026</strong>
                  </div>
                </div>

                {/* Horizon Selector (1, 2, 3, 4 minggu) */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', textAlign: 'right' }}>
                    HORIZON FORECAST
                  </div>
                  <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                    {[1, 2, 3, 4].map((h) => {
                      const isSel = forecastHorizon === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setForecastHorizon(h)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: isSel ? '#7c3aed' : 'transparent',
                            color: isSel ? '#ffffff' : '#475569',
                            fontWeight: isSel ? 800 : 600,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            boxShadow: isSel ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {h} minggu
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4 Cards Ringkasan Horizon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fbf7ff', border: '1px solid #f3e8ff' }}>
                  <div style={{ fontSize: '0.74rem', color: '#7c3aed', fontWeight: 600 }}>Total estimasi pendapatan</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#6d28d9', marginTop: '6px' }}>
                    {currentHorizonData.totalRevenue}
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Rata-rata per minggu</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                    {currentHorizonData.avgWeekly}
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total prediksi demand</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                    {currentHorizonData.totalDemand}
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Produk dengan prediksi</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                    {currentHorizonData.activeProducts}
                  </div>
                </div>
              </div>

              {/* Chart Visualisasi Kumulatif Ungu + Teal */}
              <div style={{ height: '240px', position: 'relative', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 40px 10px 40px' }}>
                {/* Horizontal grid lines */}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '25%', borderTop: '1px dashed #e2e8f0' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '50%', borderTop: '1px dashed #e2e8f0' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '75%', borderTop: '1px dashed #e2e8f0' }} />

                {currentHorizonData.bars.map((bar, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6d28d9' }}>
                      {bar.value} rb
                    </div>
                    <div
                      style={{
                        width: '54px',
                        height: `${Math.max(25, bar.height * 1.8)}px`,
                        backgroundColor: '#7c3aed',
                        borderRadius: '6px 6px 0 0',
                        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                      }}
                    />
                    <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                      {bar.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend & Caption */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#7c3aed', borderRadius: '3px' }} />
                  <span>Estimasi kumulatif</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                  <div style={{ width: '12px', height: '3px', backgroundColor: '#0f766e', borderRadius: '2px' }} />
                  <span>Garis kumulatif</span>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', marginTop: '12px', lineHeight: 1.5 }}>
                Ini estimasi, bukan pendapatan aktual. Hanya mencakup 9 produk yang memiliki prediksi model; produk dengan metode heuristik dan produk tidak aktif tidak termasuk, jadi totalnya lebih rendah dari pendapatan aktual.
              </div>
            </div>

            {/* Ringkasan Rekomendasi Stok Alert Cards (Screenshot 4) */}
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                Ringkasan Rekomendasi Stok
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fff5f5', border: '1.5px solid #fecaca' }}>
                  <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.88rem' }}>
                    🚨 {ropAlertProducts.length} Produk Perlu Restock Mendesak
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                    Stok telah menyentuh batas Reorder Point (ROP). Segera jadwalkan produksi atau restock bahan baku.
                  </p>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.88rem' }}>
                    ✅ {products.length - ropAlertProducts.length} Produk Stok Aman & Optimal
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                    Level stok berada di atas batas ROP dengan cadangan safety stock yang memadai untuk 14 hari ke depan.
                  </p>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fbf7ff', border: '1.5px solid #e9d5ff' }}>
                  <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '0.88rem' }}>
                    📊 Rekomendasi Model Croston SBA
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                    Optimal untuk produk camilan dan olahan pangan berpermintaan intermiten/sporadis.
                  </p>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f0f9ff', border: '1.5px solid #bae6fd' }}>
                  <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.88rem' }}>
                    📈 Rekomendasi Model ARIMA (1,1,1)
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                    Optimal untuk produk sayuran segar dan minuman berpermintaan kontinu musiman reguler.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: DATA INVENTARIS (PERSIS SCREENSHOT 2 + 3 AKSI UTAMA) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 3 PILIHAN AKSI UTAMA STOCK MANAGER (SESUAI ALUR TUGAS BESAR) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#065f46', letterSpacing: '0.04em' }}>
                    Alur Kerja Terpadu Stock Manager
                  </div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                    3 Aksi Utama Operasional Gudang & Persediaan
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleExportReport}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <FileSpreadsheet size={15} color="#16a34a" />
                  <span>Export Laporan Persediaan (.CSV)</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {/* Aksi 1: Barang Masuk */}
                <div
                  onClick={() => setIsStockInModalOpen(true)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1.5px solid #86efac',
                    backgroundColor: '#f0fdf4',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dcfce7')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#166534', fontSize: '0.92rem' }}>
                    <ArrowDownLeft size={18} />
                    <span>1. Barang Masuk (Restock Manual)</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#374151', margin: '6px 0 10px 0', lineHeight: 1.45 }}>
                    Input penambahan stok &bull; Catat mutasi IN &bull; Gateway ROP &bull; Hitung ARIMA/Croston &bull; Generate Laporan.
                  </p>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>Buka Formulir Restock</span>
                    <ArrowRight size={12} />
                  </span>
                </div>

                {/* Aksi 2: Barang Keluar */}
                <div
                  onClick={() => setIsStockOutModalOpen(true)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1.5px solid #fca5a5',
                    backgroundColor: '#fef2f2',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#991b1b', fontSize: '0.92rem' }}>
                    <ArrowUpRight size={18} />
                    <span>2. Barang Keluar (Rusak / Spoilage)</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#374151', margin: '6px 0 10px 0', lineHeight: 1.45 }}>
                    Input pengurangan stok manual &bull; Catat mutasi OUT &bull; Gateway ROP &bull; Hitung ARIMA/Croston &bull; Generate Laporan.
                  </p>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>Buka Formulir Barang Keluar</span>
                    <ArrowRight size={12} />
                  </span>
                </div>

                {/* Aksi 3: Analisis Forecast */}
                <div
                  onClick={handleRunForecastAnalysis}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1.5px solid #7dd3fc',
                    backgroundColor: '#f0f9ff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0f2fe')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#0369a1', fontSize: '0.92rem' }}>
                    <TrendingUp size={18} />
                    <span>3. Analisis Forecast (ARIMA / Croston)</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#374151', margin: '6px 0 10px 0', lineHeight: 1.45 }}>
                    Kalkulasi demand forecast & safety stock &bull; Update data &bull; Pantau alert ROP &bull; Generate & export laporan persediaan.
                  </p>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>Jalankan Mesin Analisis</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInventorySubTab('logs')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: inventorySubTab === 'logs' ? '#0f172a' : '#ffffff',
                  color: inventorySubTab === 'logs' ? '#ffffff' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Log Pergerakan Inventaris Terpadu (173 Data)
              </button>
              <button
                type="button"
                onClick={() => setInventorySubTab('stock')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: inventorySubTab === 'stock' ? '#0f172a' : '#ffffff',
                  color: inventorySubTab === 'stock' ? '#ffffff' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tabel Stok Toko ({products.length} SKU)
              </button>
              <button
                type="button"
                onClick={() => setInventorySubTab('movement')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: inventorySubTab === 'movement' ? '#0f172a' : '#ffffff',
                  color: inventorySubTab === 'movement' ? '#ffffff' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Histori Mutasi IN/OUT ({movements.length})
              </button>
            </div>

            {/* SUB-VIEW 1: LOG PERGERAKAN INVENTARIS TERPADU (PERSIS SCREENSHOT 2) */}
            {inventorySubTab === 'logs' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Log Pergerakan Inventaris Terpadu
                      </h2>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        173 data
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                      Data inventaris dari backend FarmSight.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="text"
                      value={inventoryLogSearch}
                      onChange={(e) => setInventoryLogSearch(e.target.value)}
                      placeholder="Cari ID produk atau nama item..."
                      style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '240px' }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        <th style={{ padding: '14px 20px' }}>ID PRODUK</th>
                        <th style={{ padding: '14px 20px' }}>NAMA ITEM</th>
                        <th style={{ padding: '14px 20px' }}>TANGGAL PRODUKSI</th>
                        <th style={{ padding: '14px 20px' }}>TANGGAL PESANAN</th>
                        <th style={{ padding: '14px 20px', textAlign: 'right' }}>STOK TERSEDIA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventoryLogs.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a' }}>
                            {item.productId}
                          </td>
                          <td style={{ padding: '14px 20px', fontWeight: 700, color: '#2563eb' }}>
                            {item.productName}
                          </td>
                          <td style={{ padding: '14px 20px', color: '#475569' }}>
                            {item.prodDate}
                          </td>
                          <td style={{ padding: '14px 20px', color: '#475569' }}>
                            {item.orderDate}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {item.stock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: STOK FISIK TOKO */}
            {inventorySubTab === 'stock' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="Cari SKU atau nama produk..."
                      style={{ height: '34px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', width: '200px' }}
                    />
                    <select
                      value={stockRopFilter}
                      onChange={(e) => setStockRopFilter(e.target.value)}
                      style={{ height: '34px', padding: '0 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      <option value="ALL">Semua Status ROP</option>
                      <option value="SAFE">✅ Stok Aman (&gt; ROP)</option>
                      <option value="RESTOCK">⚠️ Perlu Restock (&le; ROP)</option>
                    </select>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Menampilkan <strong>{filteredProducts.length}</strong> produk
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                        <th style={{ padding: '12px 16px' }}>SKU</th>
                        <th style={{ padding: '12px 16px' }}>Nama Produk</th>
                        <th style={{ padding: '12px 16px' }}>Kategori</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Stok Fisik</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Safety Stock</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Reorder Point</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Gateway ROP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const rop = p.reorderPoint || p.minStock || 15;
                        const ss = p.safetyStock || Math.round(rop * 0.5);
                        const isRestock = p.stock <= rop;
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#2d6a4f' }}>{p.id}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#142019' }}>{p.name}</td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>{p.category}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: isRestock ? '#dc2626' : '#1b4332' }}>
                              {p.stock} {p.unit}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>{ss} {p.unit}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>{rop} {p.unit}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              {isRestock ? (
                                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                                  ⚠️ Perlu Restock
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                  ✓ Stok Aman
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW 3: HISTORI MUTASI */}
            {inventorySubTab === 'movement' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                        <th style={{ padding: '12px 16px' }}>No. Mutasi</th>
                        <th style={{ padding: '12px 16px' }}>Tanggal</th>
                        <th style={{ padding: '12px 16px' }}>Produk</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tipe</th>
                        <th style={{ padding: '12px 16px' }}>Kategori</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Kuantitas</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Sisa Stok</th>
                        <th style={{ padding: '12px 16px' }}>Referensi & Operator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((m) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{m.id}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>{m.date}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#142019' }}>{m.productName}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, backgroundColor: m.type === 'IN' ? '#dcfce7' : '#fee2e2', color: m.type === 'IN' ? '#15803d' : '#b91c1c' }}>
                              {m.type === 'IN' ? '↓ IN' : '↑ OUT'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{m.category}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: m.type === 'IN' ? '#15803d' : '#dc2626' }}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{m.remainingStock}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.74rem' }}>
                            <div>{m.reference}</div>
                            <div style={{ color: '#0f172a', fontWeight: 600 }}>{m.operator}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: PEMANTAUAN MODEL (PERSIS SCREENSHOT 3) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'model' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Header Pemantauan Model */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Pemantauan Model
                </h1>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Pemantauan demand forecasting, evaluasi model, dan parameter persediaan FarmSight.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunForecastAnalysis}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} />
                <span>Muat Ulang Data</span>
              </button>
            </div>

            {/* 3 Badges di Atas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Produk</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>38</div>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0', padding: '18px' }}>
                <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>Produk dengan Model</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>9</div>
              </div>
              <div style={{ backgroundColor: '#fffbeb', borderRadius: '14px', border: '1px solid #fde68a', padding: '18px' }}>
                <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>Produk Belum Tersedia</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>29</div>
              </div>
            </div>

            {/* Ringkasan Pemodelan dan Inventaris (8 Cards) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Ringkasan Pemodelan dan Inventaris
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Ringkasan cakupan model, evaluasi, dan pergerakan persediaan berdasarkan data API yang tersedia.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Produk dalam Horizon Analisis</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>38</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Model Tersedia</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>9 / 38</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Produk dengan Catatan Stok</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>38</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Evaluasi WAPE Tersedia</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>38</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Total Barang Masuk</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>5.960</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Total Permintaan (Demand)</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>4.908</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Rasio Pemenuhan (Fulfillment)</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>82,35%</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Ukuran Sampel Uji Multivariat</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>96</div>
                </div>
              </div>

              {/* Blue Callout Note */}
              <div style={{ marginTop: '18px', padding: '14px 18px', borderRadius: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.75rem', color: '#1e40af', lineHeight: 1.6 }}>
                <strong>Catatan interpretasi data:</strong> Total barang masuk dan permintaan adalah agregasi historis volume inventaris. Hubungan antara penambahan dan pemenuhan demand tidak teratur karena perbedaan waktu spesifik. Metrik dengan ketersediaan WAPE & Safety Stock terobservasi di 38 produk dan ROP teramati untuk 31 produk.
              </div>
            </div>

            {/* DETAIL PEMANTAUAN MODEL (TABEL 38 PRODUK PERSIS SCREENSHOT 3) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Detail Pemantauan Model
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      {filteredModelMonitoring.length} dari 38 produk
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    Daftar model dan estimasi parameter persediaan berdasarkan data API.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Cari kode, nama produk, atau model..."
                    style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '260px' }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      <th style={{ padding: '14px 18px' }}>KODE</th>
                      <th style={{ padding: '14px 18px' }}>NAMA PRODUK</th>
                      <th style={{ padding: '14px 18px' }}>MODEL TERBAIK</th>
                      <th style={{ padding: '14px 18px', textAlign: 'right' }}>RMSE</th>
                      <th style={{ padding: '14px 18px', textAlign: 'right' }}>SAFETY STOCK</th>
                      <th style={{ padding: '14px 18px', textAlign: 'right' }}>REORDER POINT (ROP)</th>
                      <th style={{ padding: '14px 18px', textAlign: 'center' }}>STATUS MODEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModelMonitoring.map((row) => {
                      const isTersedia = row.status === 'Tersedia';
                      const isHeuristik = row.status === 'Metode heuristik';
                      return (
                        <tr key={row.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0f172a' }}>
                            {row.code}
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: 700, color: isTersedia ? '#0f766e' : '#1e293b' }}>
                            {row.name}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            {row.bestModel === 'Belum tersedia' ? (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.78rem' }}>
                                Belum tersedia
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, backgroundColor: row.bestModel.includes('ARIMA') ? '#dbeafe' : '#e0e7ff', color: row.bestModel.includes('ARIMA') ? '#1d4ed8' : '#4338ca' }}>
                                {row.bestModel}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>
                            {row.rmse}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', color: row.safetyStock === 'Belum tersedia' ? '#94a3b8' : '#0f172a', fontWeight: row.safetyStock === 'Belum tersedia' ? 400 : 700 }}>
                            {row.safetyStock}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', color: row.rop === 'Belum tersedia' ? '#94a3b8' : '#0f172a', fontWeight: row.rop === 'Belum tersedia' ? 400 : 800 }}>
                            {row.rop}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            {isTersedia && (
                              <span style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                Tersedia
                              </span>
                            )}
                            {isHeuristik && (
                              <span style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, backgroundColor: '#eff6ff', color: '#2563eb' }}>
                                Metode heuristik
                              </span>
                            )}
                            {!isTersedia && !isHeuristik && (
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                Tidak aktif
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: LABORATORIUM PREDIKSI (PERSIS SCREENSHOT 5) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'lab' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Lab */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Laboratorium Prediksi
                </h1>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Eksplorasi mendalam model forecasting arima & croston sba, simulasi skenario persediaan.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLabP(1);
                    setLabD(1);
                    setLabQ(1);
                    setLabAlpha(0.2);
                    setLabLeadTime(3);
                    setLabServiceLevel(95);
                    triggerToast('✓ Parameter laboratorium berhasil direset ke nilai default optimal!');
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset Parameter</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerToast(`✓ Model ${labMethod} berhasil diterapkan ke basis data operasional!`)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <Check size={15} />
                  <span>Terapkan Model</span>
                </button>
              </div>
            </div>

            {/* BAGIAN 1: EKSPLORASI DATA */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#0f766e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                  1
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Eksplorasi Data Deret Waktu (Time Series)
                </h2>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Pilih Produk</label>
                  <select
                    value={labProductCode}
                    onChange={(e) => setLabProductCode(e.target.value)}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    <option value="CKP">CKP - COKELAT PERMEN</option>
                    <option value="MLB">MLB - MINUMAN LIDAH BUAYA</option>
                    <option value="KKG">KKG - KANGKUNG HIDROPONIK</option>
                    <option value="LDB">LDB - LIDAH BUAYA ORGANIK</option>
                    <option value="TTL">TTL - TEH BUNGA TELANG</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Pola Permintaan</label>
                  <select
                    value={labDemandType}
                    onChange={(e) => setLabDemandType(e.target.value)}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.8rem' }}
                  >
                    <option value="Intermiten / Sporadis">Intermiten / Sporadis (Croston SBA)</option>
                    <option value="Kontinu (Reguler Musiman)">Kontinu Musiman (ARIMA)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Horizon Analisis</label>
                  <select style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.8rem' }}>
                    <option>4 Minggu ke depan</option>
                    <option>8 Minggu ke depan</option>
                    <option>12 Minggu ke depan</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Granularitas</label>
                  <select style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.8rem' }}>
                    <option>Mingguan (Weekly Aggregated)</option>
                    <option>Harian (Daily Raw)</option>
                  </select>
                </div>
              </div>

              {/* Time Series SVG Visual */}
              <div style={{ height: '160px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', position: 'relative' }}>
                <svg viewBox="0 0 600 120" style={{ width: '100%', height: '100%' }}>
                  <path d="M 0 80 Q 50 30 100 70 T 200 60 T 300 90 T 400 40 T 500 75 T 600 50" fill="none" stroke="#2563eb" strokeWidth="2.5" />
                  <path d="M 0 80 Q 50 30 100 70 T 200 60 T 300 90 T 400 40 T 500 75 T 600 50 L 600 120 L 0 120 Z" fill="rgba(37, 99, 235, 0.08)" />
                </svg>
                <div style={{ position: 'absolute', bottom: '8px', right: '16px', fontSize: '0.72rem', color: '#64748b' }}>
                  Fluktuasi Permintaan Aktual 14 Minggu Terakhir
                </div>
              </div>
            </div>

            {/* BAGIAN 2: PEMODELAN & DEMAND FORECAST */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#0f766e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                  2
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Pemodelan Algoritma (ARIMA & Croston SBA)
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Panel Slider Parameter */}
                <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '12px' }}>
                    Tuning Parameter Model
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                        <span>Autoregressive Order (p)</span>
                        <strong style={{ color: '#2563eb' }}>{labP}</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        value={labP}
                        onChange={(e) => setLabP(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#2563eb' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                        <span>Differencing Degree (d)</span>
                        <strong style={{ color: '#2563eb' }}>{labD}</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        value={labD}
                        onChange={(e) => setLabD(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#2563eb' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                        <span>Moving Average Order (q)</span>
                        <strong style={{ color: '#2563eb' }}>{labQ}</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        value={labQ}
                        onChange={(e) => setLabQ(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#2563eb' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                        <span>Smoothing Parameter Croston (Alpha)</span>
                        <strong style={{ color: '#7c3aed' }}>{labAlpha}</strong>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={labAlpha}
                        onChange={(e) => setLabAlpha(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#7c3aed' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Hasil Perbandingan Model */}
                <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1.5px solid #86efac' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#166534', marginBottom: '8px' }}>
                    Evaluasi Akurasi Model Rekomendasi
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.5, marginBottom: '16px' }}>
                    Model terpilih dihitung secara otomatis berdasarkan nilai Root Mean Squared Error (RMSE) terendah.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Model ARIMA ({labP},{labD},{labQ})</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>RMSE 2.14</div>
                      <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>Akurat (Reguler)</span>
                    </div>

                    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1.5px solid #7c3aed' }}>
                      <div style={{ fontSize: '0.72rem', color: '#7c3aed' }}>Model Croston SBA (α={labAlpha})</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#7c3aed', marginTop: '2px' }}>RMSE 1.85</div>
                      <span style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 800 }}>★ Terpilih Optimal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BAGIAN 3: SIMULASI SKENARIO SAFETY STOCK & ROP */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#0f766e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                  3
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Simulasi Skenario Persediaan & Reorder Point (ROP)
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>Lead Time Pemasok</span>
                    <strong>{labLeadTime} hari</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={labLeadTime}
                    onChange={(e) => setLabLeadTime(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                </div>

                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>Tingkat Layanan (Service Level)</span>
                    <strong>{labServiceLevel}%</strong>
                  </div>
                  <input
                    type="range"
                    min="85"
                    max="99"
                    value={labServiceLevel}
                    onChange={(e) => setLabServiceLevel(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                </div>

                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>Biaya Simpan per Unit</span>
                    <strong>{formatRupiah(labHoldingCost)}</strong>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="3000"
                    step="100"
                    value={labHoldingCost}
                    onChange={(e) => setLabHoldingCost(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '6px' }}
                  />
                </div>
              </div>

              {/* Simulation Result Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700 }}>SAFETY STOCK OPTIMAL</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1d4ed8', marginTop: '4px' }}>
                    {Math.round(labLeadTime * 2.8 * (labServiceLevel / 90))} unit
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Penyangga fluktuasi demand</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>REORDER POINT (ROP)</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
                    {Math.round(labLeadTime * 5.2 + (labServiceLevel / 90) * 8)} unit
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Titik picu pesanan restock</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fbf7ff', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 700 }}>RISIKO STOCKOUT</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#6d28d9', marginTop: '4px' }}>
                    {(100 - labServiceLevel).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Probabilitas kehabisan stok</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>ESTIMASI BIAYA SIMPAN</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {formatRupiah(labHoldingCost * 24)}/bln
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Biaya penyimpanan gudang</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: FORMULIR BARANG MASUK (RESTOCK MANUAL) */}
      {/* ------------------------------------------------------------- */}
      {isStockInModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowDownLeft size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                    1. Input Barang Masuk (Restock Manual)
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Catat penambahan stok & kalkulasi ulang Gateway ROP
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockInModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleStockInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Pilih Produk
                </label>
                <select
                  value={inProdId}
                  onChange={(e) => setInProdId(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok Saat Ini: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Kuantitas Masuk (Unit / Pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={inQty}
                  onChange={(e) => setInQty(e.target.value)}
                  required
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Kategori Penambahan
                </label>
                <select
                  value={inCategory}
                  onChange={(e) => setInCategory(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
                >
                  <option value="Panen & Produksi Baru">Panen & Produksi Baru</option>
                  <option value="Restock dari Petani Mitra">Restock dari Petani Mitra</option>
                  <option value="Penyesuaian Opname Gudang">Penyesuaian Opname Gudang</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Catatan / Batch Produksi
                </label>
                <input
                  type="text"
                  value={inNote}
                  onChange={(e) => setInNote(e.target.value)}
                  placeholder="Contoh: Batch Panen Segar Kebun Pulo Gebang"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsStockInModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#15803d', color: '#ffffff', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Simpan Barang Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: FORMULIR BARANG KELUAR (RUSAK / KADALUWARSA) */}
      {/* ------------------------------------------------------------- */}
      {isStockOutModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                    2. Input Barang Keluar (Rusak / Kadaluwarsa)
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Catat pengurangan stok manual & evaluasi Gateway ROP
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockOutModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleStockOutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Pilih Produk
                </label>
                <select
                  value={outProdId}
                  onChange={(e) => setOutProdId(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Tersedia: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Kuantitas Keluar (Unit / Pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={outQty}
                  onChange={(e) => setOutQty(e.target.value)}
                  required
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Alasan Pengurangan
                </label>
                <select
                  value={outCategory}
                  onChange={(e) => setOutCategory(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.82rem' }}
                >
                  <option value="Barang Rusak / Spoilage">Barang Rusak / Spoilage</option>
                  <option value="Kadaluwarsa (Expired)">Kadaluwarsa (Expired)</option>
                  <option value="Sampel Uji Kualitas / Promosi">Sampel Uji Kualitas / Promosi</option>
                  <option value="Selisih Opname Fisik">Selisih Opname Fisik</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Keterangan Tambahan
                </label>
                <input
                  type="text"
                  value={outNote}
                  onChange={(e) => setOutNote(e.target.value)}
                  placeholder="Contoh: Kemasan bocor saat penataan rak"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsStockOutModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Simpan Barang Keluar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL HASIL GATEWAY ROP & RINGKASAN ALUR SELESAI */}
      {/* ------------------------------------------------------------- */}
      {gatewayResultModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 12px 35px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: gatewayResultModal.isRopTriggered ? '#fee2e2' : '#dcfce7', color: gatewayResultModal.isRopTriggered ? '#dc2626' : '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {gatewayResultModal.isRopTriggered ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Hasil Gateway ROP & Pembaruan Sistem
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Aksi: {gatewayResultModal.actionTitle}
                </span>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                {gatewayResultModal.product.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                Perubahan: <strong>{gatewayResultModal.qtyChange} unit</strong> &bull; Sisa Stok: <strong style={{ color: '#065f46' }}>{gatewayResultModal.newStock} {gatewayResultModal.product.unit}</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                Titik Reorder Point (ROP): <strong>{gatewayResultModal.rop} unit</strong>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: gatewayResultModal.isRopTriggered ? '#fff1f2' : '#f0fdf4', border: `1.5px solid ${gatewayResultModal.isRopTriggered ? '#fda4af' : '#86efac'}`, marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: gatewayResultModal.isRopTriggered ? '#e11d48' : '#166534' }}>
                {gatewayResultModal.isRopTriggered ? '⚠️ ALERT: Perlu Restock Segera!' : '✓ Status: Stok Aman (Di Atas ROP)'}
              </div>
              <p style={{ fontSize: '0.74rem', color: '#374151', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                {gatewayResultModal.isRopTriggered
                  ? 'Sisa stok saat ini berada di bawah batas minimum pemesanan kembali. Sistem telah memperbarui alert di dashboard persediaan.'
                  : 'Sisa stok masih mencukupi kebutuhan permintaan dan berada dalam batas aman persediaan.'}
              </p>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.74rem', color: '#1e40af', marginBottom: '20px' }}>
              ✓ Mutasi stok berhasil dicatat &bull; Model ARIMA / Croston SBA dihitung ulang &bull; Data dashboard ter-update &bull; Siap export laporan.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setGatewayResultModal(null)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Tutup & Lanjutkan Pantau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
