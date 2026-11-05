import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  PackageSearch,
  Users,
  FileBarChart,
  LogOut,
  ExternalLink,
  Plus,
  Search,
  Edit2,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Download,
  KeyRound,
  Power,
  Copy,
  DollarSign,
  ShoppingCart,
  Boxes,
  TrendingUp,
  MapPin,
  Star,
  Save,
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  Mail,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_DETAILS, dummyHashPassword } from '../data/mockAuth';
import { getStoredProducts, saveStoredProducts, formatRupiah, toggleProductVisibility } from '../data/productsData';
import {
  getStoredOrders,
  getStoredMovements,
  getStoredForecasts,
} from '../data/ordersAndInventoryData';

const CATEGORY_OPTIONS = [
  { slug: 'camilan', name: 'Camilan & Keripik', badge: 'Camilan Sehat', color: '#9a3412', bg: '#ffedd5' },
  { slug: 'olahan', name: 'Olahan Permen & Cokelat', badge: 'Olahan Aloe', color: '#065f46', bg: '#d1fae5' },
  { slug: 'minuman', name: 'Minuman Segar & Teh', badge: 'Segar & Alami', color: '#0369a1', bg: '#e0f2fe' },
  { slug: 'sayur', name: 'Sayuran & Panen Segar', badge: 'Panen Segar', color: '#166534', bg: '#dcfce7' },
  { slug: 'bibit_pupuk', name: 'Bibit & Sarana Tanam', badge: 'Sarana Tani', color: '#1e40af', bg: '#dbeafe' },
];

export default function DashboardSuperAdmin({ onLogout, onViewCatalog }) {
  const {
    user,
    users,
    createUser,
    updateUser,
    toggleUserStatus,
    adminResetUserPassword,
  } = useAuth();

  // Core Data States
  const [products, setProducts] = useState(getStoredProducts);
  const [orders, setOrders] = useState(getStoredOrders);
  const [movements, setMovements] = useState(getStoredMovements);
  const [forecasts, setForecasts] = useState(getStoredForecasts);
  const [toastMsg, setToastMsg] = useState('');

  // Main Tab Navigation: 'overview', 'products', 'users', 'reports'
  const [activeTab, setActiveTab] = useState('overview');

  // --- PRODUCT MANAGEMENT STATES ---
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('all');
  const [prodVisibilityFilter, setProdVisibilityFilter] = useState('ALL'); // 'ALL', 'VISIBLE', 'HIDDEN'
  const [prodViewMode, setProdViewMode] = useState('list'); // 'list' or 'form'
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodFormData, setProdFormData] = useState({
    id: '',
    name: '',
    categorySlug: 'camilan',
    price: '',
    unit: 'Pcs',
    stock: 20,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    description: '',
    composition: '',
    badge: 'Produk Baru',
    visibility: 'visible', // 'visible' atau 'hidden'
  });

  // --- USER MANAGEMENT STATES ---
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState(ROLES.SALES_ADMIN);
  const [newUserRoleTitle, setNewRoleTitle] = useState('Staff Penjualan');
  const [newUserPhone, setNewUserPhone] = useState('+62 813-');

  // Reset Password Modal & Success Result Modal
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [customPasswordInput, setCustomPasswordInput] = useState('');
  const [userActionSuccessModal, setUserActionSuccessModal] = useState(null);

  // --- REPORT STATES ---
  const [reportType, setReportType] = useState('sales'); // 'sales', 'inventory', 'forecasting'

  // Sync data across tabs
  useEffect(() => {
    const syncAll = () => {
      setProducts(getStoredProducts());
      setOrders(getStoredOrders());
      setMovements(getStoredMovements());
      setForecasts(getStoredForecasts());
    };
    window.addEventListener('storage', syncAll);
    const interval = setInterval(syncAll, 1500);
    return () => {
      window.removeEventListener('storage', syncAll);
      clearInterval(interval);
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // --- PRODUCT HANDLERS ---
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdFormData({
      id: `PROD-${String(products.length + 1).padStart(3, '0')}`,
      name: '',
      categorySlug: 'camilan',
      price: '',
      unit: 'Pcs',
      stock: 20,
      minStock: 10,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      description: '',
      composition: '',
      badge: 'Produk Baru',
      visibility: 'visible',
    });
    setProdViewMode('form');
  };

  const handleOpenEditProduct = (p) => {
    setEditingProduct(p);
    setProdFormData({
      id: p.id,
      name: p.name,
      categorySlug: p.categorySlug || 'camilan',
      price: p.price,
      unit: p.unit || 'Pcs',
      stock: p.stock || 0,
      minStock: p.minStock || 10,
      image: p.image || '',
      description: p.description || '',
      composition: p.composition || '',
      badge: p.badge || 'Unggulan',
      visibility: p.visibility || (p.isAvailable !== false ? 'visible' : 'hidden'),
    });
    setProdViewMode('form');
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    if (!prodFormData.name.trim() || !prodFormData.price || !prodFormData.id.trim()) {
      showToast('Harap lengkapi SKU, nama produk, dan harga.');
      return;
    }

    const catObj = CATEGORY_OPTIONS.find((c) => c.slug === prodFormData.categorySlug) || CATEGORY_OPTIONS[0];
    const numPrice = Number(prodFormData.price);
    const numStock = Number(prodFormData.stock || 0);
    const numMin = Number(prodFormData.minStock || 10);
    const isVis = prodFormData.visibility === 'visible';

    const payload = {
      ...prodFormData,
      visibility: prodFormData.visibility || 'visible',
      isAvailable: isVis,
      price: numPrice,
      priceFormatted: formatRupiah(numPrice),
      stock: numStock,
      minStock: numMin,
      safetyStock: Math.round(numMin * 0.8),
      reorderPoint: Math.round(numMin * 1.5),
      category: catObj.name,
      badgeColor: catObj.color,
      badgeBg: catObj.bg,
      rating: editingProduct?.rating || 5.0,
      reviews: editingProduct?.reviews || 10,
    };

    let updated;
    if (editingProduct) {
      updated = products.map((p) => (p.id === editingProduct.id ? payload : p));
      showToast(`✓ Produk ${payload.name} berhasil diperbarui! Status visibilitas: ${isVis ? 'Tampil di Publik' : 'Disembunyikan'}.`);
    } else {
      updated = [payload, ...products];
      showToast(`✓ Produk baru ${payload.name} berhasil ditambahkan! Status visibilitas: ${isVis ? 'Tampil di Publik' : 'Disembunyikan'}.`);
    }

    setProducts(updated);
    saveStoredProducts(updated);
    setProdViewMode('list');
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Yakin ingin menghapus produk ini dari katalog?')) {
      const updated = products.filter((p) => p.id !== id);
      setProducts(updated);
      saveStoredProducts(updated);
      showToast('Produk berhasil dihapus.');
    }
  };

  const handleToggleProductAvailability = (id) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        const nextVis = p.visibility === 'visible' ? 'hidden' : 'visible';
        showToast(nextVis === 'visible' ? `✓ Produk ${p.name} kini ditampilkan di katalog publik.` : `🚫 Produk ${p.name} kini disembunyikan dari katalog publik.`);
        return { ...p, visibility: nextVis, isAvailable: nextVis === 'visible' };
      }
      return p;
    });
    setProducts(updated);
    saveStoredProducts(updated);
  };

  // --- USER HANDLERS (Aksi 1: Input Data Akun Baru & Aksi 2: Reset Password) ---
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showToast('Nama dan email staf wajib diisi.');
      return;
    }

    try {
      const result = await createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword || undefined,
        role: newUserRole,
        roleTitle: newUserRoleTitle,
        phone: newUserPhone,
      });
      setIsAddUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');

      setUserActionSuccessModal({
        actionType: 'TAMBAH_AKUN',
        title: 'Akun Staf Baru Berhasil Dibuat!',
        account: result.newUser,
        tempPassword: result.tempPassword,
        hash: result.newUser.passwordHash,
        note: 'Sistem telah memperbarui database dengan status must_change_password = true. Staf wajib membuat kata sandi baru saat pertama kali masuk ke sistem.',
      });
      showToast(`✓ Akun staf ${newUserName} berhasil dibuat!`);
    } catch (err) {
      showToast(err.message || 'Gagal membuat akun staf.');
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedUserForReset) return;
    try {
      const result = await adminResetUserPassword(selectedUserForReset.id, customPasswordInput);
      setIsResetPassModalOpen(false);

      setUserActionSuccessModal({
        actionType: 'RESET_PASSWORD',
        title: 'Kata Sandi Staf Berhasil Direset!',
        account: result.updatedUser,
        tempPassword: result.tempPassword,
        hash: result.updatedUser.passwordHash,
        note: 'Sistem telah memperbarui database dengan status must_change_password = true. Staf wajib mengganti kata sandi saat login berikutnya.',
      });
      showToast(`✓ Kata sandi untuk ${selectedUserForReset.name} berhasil diatur ulang.`);
    } catch (err) {
      showToast(err.message || 'Gagal mereset kata sandi.');
    }
  };

  // --- REPORT EXPORT ---
  const handleExportCSV = () => {
    const nowStr = new Date().toISOString().slice(0, 10);
    let csvRows = [];
    let fileName = `Laporan-FarmBerkah-${nowStr}.csv`;

    if (reportType === 'sales') {
      fileName = `Laporan-Penjualan-${nowStr}.csv`;
      csvRows = [
        ['NO PESANAN', 'TANGGAL', 'PELANGGAN', 'NO WHATSAPP', 'PRODUK', 'QTY', 'TOTAL (RP)', 'STATUS PEMBAYARAN'],
        ...orders.map((o) => [o.id, o.date, o.customerName, o.customerPhone, o.productName, o.quantity, o.totalAmount, o.gateway2Status === 'LOLOS' ? 'LUNAS' : 'MENUNGGU']),
      ];
    } else if (reportType === 'inventory') {
      fileName = `Laporan-Stok-Fisik-${nowStr}.csv`;
      csvRows = [
        ['SKU', 'NAMA PRODUK', 'KATEGORI', 'HARGA', 'STOK FISIK', 'SAFETY STOCK', 'REORDER POINT', 'STATUS'],
        ...products.map((p) => [p.id, p.name, p.category, p.price, p.stock, p.safetyStock || 8, p.reorderPoint || 15, p.stock <= (p.reorderPoint || 15) ? 'PERLU RESTOCK' : 'AMAN']),
      ];
    } else {
      fileName = `Laporan-Forecasting-${nowStr}.csv`;
      csvRows = [
        ['PRODUK', 'POLA', 'METODE', 'W1', 'W2', 'W3', 'W4', 'SAFETY STOCK', 'ROP', 'RMSE'],
        ...forecasts.map((f) => [f.productName, f.demandType, f.recommendedMethod, f.horizonW1, f.horizonW2, f.horizonW3, f.horizonW4, f.safetyStock, f.reorderPoint, f.rmse]),
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ ${fileName} berhasil diunduh!`);
  };

  // Filtered lists
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(prodSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(prodSearch.toLowerCase());
    const matchesCat = prodCategoryFilter === 'all' || p.categorySlug === prodCategoryFilter;
    const matchesVis =
      prodVisibilityFilter === 'ALL' ||
      (prodVisibilityFilter === 'VISIBLE' && p.visibility !== 'hidden') ||
      (prodVisibilityFilter === 'HIDDEN' && p.visibility === 'hidden');
    return matchesSearch && matchesCat && matchesVis;
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.roleTitle.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate Executive Stats
  const totalRevenue = orders
    .filter((o) => o.gateway2Status === 'LOLOS' || o.status === 'SELESAI')
    .reduce((sum, curr) => sum + (curr.totalAmount || 0), 0);
  const totalCompletedOrders = orders.filter((o) => o.gateway2Status === 'LOLOS' || o.status === 'SELESAI').length;
  const criticalStockCount = products.filter((p) => p.stock <= (p.reorderPoint || p.minStock || 15)).length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f4' }}>
      {/* Top Navbar Super Admin */}
      <header
        style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e1e7e2',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#d8f3dc', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#1b4332', fontSize: '1.05rem', lineHeight: 1.2 }}>
              Toko Farm Berkah
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Portal Eksekutif & Manajemen Bisnis
            </div>
          </div>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onViewCatalog && (
            <button
              onClick={onViewCatalog}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid #d8e2da',
                backgroundColor: '#ffffff',
                color: '#2d6a4f',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={13} />
              <span>Lihat Katalog Publik</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#d8f3dc', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
              IP
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                {user?.name || 'Ibu Intan Permatasari'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#1b4332', fontWeight: 600 }}>
                Pemilik & Super Admin
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Keluar dari sistem"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Toast Notifikasi */}
        {toastMsg && (
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
            }}
          >
            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Tab Navigation for Super Admin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setActiveTab('overview');
              setProdViewMode('list');
            }}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'overview' ? '#2d6a4f' : '#ffffff',
              color: activeTab === 'overview' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'overview' ? '0 2px 8px rgba(45, 106, 79, 0.2)' : 'none',
            }}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard Eksekutif</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('products');
              setProdViewMode('list');
            }}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'products' ? '#2d6a4f' : '#ffffff',
              color: activeTab === 'products' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'products' ? '0 2px 8px rgba(45, 106, 79, 0.2)' : 'none',
            }}
          >
            <PackageSearch size={16} />
            <span>Manajemen Produk ({products.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users');
              setProdViewMode('list');
            }}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'users' ? '#2d6a4f' : '#ffffff',
              color: activeTab === 'users' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'users' ? '0 2px 8px rgba(45, 106, 79, 0.2)' : 'none',
            }}
          >
            <Users size={16} />
            <span>Manajemen Pengguna & Peran ({users.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('reports');
              setProdViewMode('list');
            }}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'reports' ? '#2d6a4f' : '#ffffff',
              color: activeTab === 'reports' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'reports' ? '0 2px 8px rgba(45, 106, 79, 0.2)' : 'none',
            }}
          >
            <FileBarChart size={16} />
            <span>Laporan Terpadu</span>
          </button>
        </div>

        {/* TAB 1: DASHBOARD EKSEKUTIF (SESUAI GAMBAR 4) */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Header Dashboard FarmSight */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0369a1', letterSpacing: '0.04em' }}>
                  UPDATE: 01/11/2026
                </span>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 2px 0' }}>
                  Dashboard FarmSight (Eksekutif Super Admin)
                </h1>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Pantau kinerja demand forecasting, penjualan, dan tata kelola akun toko real-time.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => showToast('✓ Data FarmSight berhasil dimuat ulang secara real-time!')}
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
                  <span>Muat Ulang Data</span>
                </button>
              </div>
            </div>

            {/* Indeks Kesehatan & Metrik Utama (Persis Gambar 4) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 2fr', gap: '20px' }}>
              {/* Card Kiri: Indeks Kesehatan Inventaris (Dark Emerald) */}
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
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Data historis transaksi toko</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Cakupan Model</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', margin: '8px 0 4px 0' }}>9 produk aktif</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Model ARIMA & Croston SBA</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Rekomendasi Persediaan</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>9 dari 38 produk</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Parameter Safety Stock & ROP</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Prediksi Pendapatan (4 Mgg)</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#6d28d9', margin: '8px 0 4px 0' }}>Rp 273.049</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Estimasi demand * harga satuan</div>
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

            {/* Quick Action Navigation ke Menu Utama Super Admin */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div
                onClick={() => setActiveTab('products')}
                style={{ padding: '20px', borderRadius: '14px', border: '1.5px solid #bbf7d0', backgroundColor: '#f0fdf4', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dcfce7')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
              >
                <div style={{ fontWeight: 800, color: '#166534', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageSearch size={18} />
                  <span>Kelola Master Produk ({products.length} SKU)</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#374151', margin: '6px 0 10px 0' }}>
                  Tambah produk baru, perbarui data harga & stok, serta atur visibilitas katalog (sembunyikan / tampilkan ke publik).
                </p>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>Buka Manajemen Produk &rarr;</span>
              </div>

              <div
                onClick={() => setActiveTab('users')}
                style={{ padding: '20px', borderRadius: '14px', border: '1.5px solid #bfdbfe', backgroundColor: '#eff6ff', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
              >
                <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} />
                  <span>Kelola Akun Staf ({users.length} Akun)</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#374151', margin: '6px 0 10px 0' }}>
                  Input staf baru, buat kata sandi sementara terenkripsi hash, set must_change_password = true, dan lakukan reset sandi staf.
                </p>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8' }}>Buka Manajemen Akun &rarr;</span>
              </div>
            </div>

            {/* Produk Terlaris & Riwayat Pesanan */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
              {/* Box 1: Produk Terlaris */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#142019', marginBottom: '14px' }}>
                  Produk Unggulan & Terlaris (Top Selling)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {products.slice(0, 5).map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.category} &bull; Sisa: {p.stock} {p.unit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1b4332' }}>{p.priceFormatted}</div>
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                          {p.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 2: Pesanan Terkini */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '20px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#142019', marginBottom: '14px' }}>
                  Pesanan Pelanggan Terkini
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{o.id} - {o.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{o.productName} ({o.quantity} unit)</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1b4332' }}>{formatRupiah(o.totalAmount)}</div>
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, backgroundColor: o.gateway2Status === 'LOLOS' ? '#dcfce7' : '#fef3c7', color: o.gateway2Status === 'LOLOS' ? '#15803d' : '#b45309' }}>
                          {o.gateway2Status === 'LOLOS' ? 'Lunas' : 'Menunggu Bayar'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAJEMEN PRODUK */}
        {activeTab === 'products' && (
          <div>
            {prodViewMode === 'form' ? (
              /* FORM TAMBAH / EDIT PRODUK */
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '24px', maxWidth: '720px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                    {editingProduct ? `Edit Produk: ${editingProduct.name}` : 'Tambah Produk Baru ke Katalog'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setProdViewMode('list')}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                </div>

                <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Kode SKU *</label>
                      <input
                        type="text"
                        value={prodFormData.id}
                        onChange={(e) => setProdFormData({ ...prodFormData, id: e.target.value })}
                        disabled={!!editingProduct}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nama Produk *</label>
                      <input
                        type="text"
                        value={prodFormData.name}
                        onChange={(e) => setProdFormData({ ...prodFormData, name: e.target.value })}
                        placeholder="Contoh: Keripik Labu Madu 150g"
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Kategori</label>
                      <select
                        value={prodFormData.categorySlug}
                        onChange={(e) => setProdFormData({ ...prodFormData, categorySlug: e.target.value })}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.slug} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Harga (Rp) *</label>
                      <input
                        type="number"
                        value={prodFormData.price}
                        onChange={(e) => setProdFormData({ ...prodFormData, price: e.target.value })}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Satuan</label>
                      <input
                        type="text"
                        value={prodFormData.unit}
                        onChange={(e) => setProdFormData({ ...prodFormData, unit: e.target.value })}
                        placeholder="Pcs / Botol"
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Stok Fisik Awal</label>
                      <input
                        type="number"
                        value={prodFormData.stock}
                        onChange={(e) => setProdFormData({ ...prodFormData, stock: e.target.value })}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Min Stock</label>
                      <input
                        type="number"
                        value={prodFormData.minStock}
                        onChange={(e) => setProdFormData({ ...prodFormData, minStock: e.target.value })}
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Badge Tampilan</label>
                      <input
                        type="text"
                        value={prodFormData.badge}
                        onChange={(e) => setProdFormData({ ...prodFormData, badge: e.target.value })}
                        placeholder="Contoh: Panen Baru"
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>URL Foto Produk</label>
                    <input
                      type="text"
                      value={prodFormData.image}
                      onChange={(e) => setProdFormData({ ...prodFormData, image: e.target.value })}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Deskripsi Produk</label>
                    <textarea
                      rows={3}
                      value={prodFormData.description}
                      onChange={(e) => setProdFormData({ ...prodFormData, description: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Komposisi Bahan Baku</label>
                    <input
                      type="text"
                      value={prodFormData.composition}
                      onChange={(e) => setProdFormData({ ...prodFormData, composition: e.target.value })}
                      placeholder="Contoh: Labu madu organik, minyak kelapa, garam laut..."
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>

                  {/* Status Visibilitas Produk di Publik */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                      Status Visibilitas di Katalog Produk Publik *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', border: (prodFormData.visibility || 'visible') === 'visible' ? '2px solid #16a34a' : '1px solid #cbd5e1', backgroundColor: (prodFormData.visibility || 'visible') === 'visible' ? '#f0fdf4' : '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="product-vis"
                          value="visible"
                          checked={(prodFormData.visibility || 'visible') === 'visible'}
                          onChange={() => setProdFormData({ ...prodFormData, visibility: 'visible' })}
                        />
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Eye size={14} />
                            <span>Tampilkan di Katalog Publik</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            Dapat dilihat & dipesan langsung oleh pelanggan
                          </div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', border: prodFormData.visibility === 'hidden' ? '2px solid #dc2626' : '1px solid #cbd5e1', backgroundColor: prodFormData.visibility === 'hidden' ? '#fef2f2' : '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="product-vis"
                          value="hidden"
                          checked={prodFormData.visibility === 'hidden'}
                          onChange={() => setProdFormData({ ...prodFormData, visibility: 'hidden' })}
                        />
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <EyeOff size={14} />
                            <span>Sembunyikan dari Publik</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            Tidak muncul di katalog pelanggan (hanya internal)
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setProdViewMode('list')}
                      style={{ padding: '11px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#2d6a4f', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
                    >
                      ✓ Simpan Produk ke Katalog
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* TABEL DAFTAR PRODUK */
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      placeholder="Cari nama atau SKU..."
                      style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '200px' }}
                    />
                    <select
                      value={prodCategoryFilter}
                      onChange={(e) => setProdCategoryFilter(e.target.value)}
                      style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    >
                      <option value="all">Semua Kategori</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      value={prodVisibilityFilter}
                      onChange={(e) => setProdVisibilityFilter(e.target.value)}
                      style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <option value="ALL">Semua Visibilitas</option>
                      <option value="VISIBLE">✓ Tampil di Publik (Visible)</option>
                      <option value="HIDDEN">🚫 Disembunyikan (Hidden)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddProduct}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      backgroundColor: '#2d6a4f',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Plus size={16} />
                    <span>+ Tambah Produk Baru</span>
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                        <th style={{ padding: '12px 16px' }}>SKU</th>
                        <th style={{ padding: '12px 16px' }}>Nama Produk</th>
                        <th style={{ padding: '12px 16px' }}>Kategori</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Harga</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Stok Fisik</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status Visibilitas</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#2d6a4f' }}>{p.id}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#142019' }}>{p.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.badge}</div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{p.category}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#1b4332' }}>{p.priceFormatted}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{p.stock} {p.unit}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleProductAvailability(p.id)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: p.visibility !== 'hidden' ? '#dcfce7' : '#fee2e2',
                                color: p.visibility !== 'hidden' ? '#15803d' : '#dc2626',
                              }}
                              title="Klik untuk mengubah visibilitas (Tampilkan / Sembunyikan)"
                            >
                              {p.visibility !== 'hidden' ? <Eye size={12} /> : <EyeOff size={12} />}
                              <span>{p.visibility !== 'hidden' ? 'Tampil di Publik' : 'Disembunyikan'}</span>
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0369a1', cursor: 'pointer' }}
                                title="Edit Produk"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#ffffff', color: '#dc2626', cursor: 'pointer' }}
                                title="Hapus Produk"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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

        {/* TAB 3: MANAJEMEN PENGGUNA & PERAN */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Manajemen Pengguna & Peran Staf
                </h1>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Kelola staf operasional Toko Farm Berkah, tetapkan peran wewenang (RBAC), dan atur ulang kata sandi staf.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#2d6a4f',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(45, 106, 79, 0.25)',
                  }}
                >
                  <Plus size={16} />
                  <span>+ Aksi 1: Input Akun Baru & Role</span>
                </button>
              </div>
            </div>

            {/* Toolbar Filter Pengguna */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e1e7e2', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari nama, email, atau kontak..."
                  style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '220px' }}
                />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <option value="ALL">Semua Peran (Role)</option>
                  <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
                  <option value={ROLES.STOCK_MANAGER}>Stock Manager</option>
                  <option value={ROLES.SALES_ADMIN}>Sales Admin</option>
                </select>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Menampilkan <strong>{filteredUsers.length}</strong> akun staf
              </div>
            </div>

            {/* Tabel Pengguna */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px' }}>Nama Staf</th>
                      <th style={{ padding: '12px 16px' }}>Email & Kontak</th>
                      <th style={{ padding: '12px 16px' }}>Peran Wewenang</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Wajib Ganti Sandi?</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status Akun</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi Akun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{u.roleTitle}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ color: '#334155' }}>{u.email}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{u.phone}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, backgroundColor: u.role === ROLES.SUPER_ADMIN ? '#d8f3dc' : u.role === ROLES.STOCK_MANAGER ? '#d1fae5' : '#dcfce7', color: '#166534' }}>
                            {u.role === ROLES.SUPER_ADMIN ? 'Super Admin' : u.role === ROLES.STOCK_MANAGER ? 'Stock Manager' : 'Sales Admin'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {u.must_change_password ? (
                            <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }} title="Akun ini wajib membuat password baru saat login">
                              ⚠️ YA (must_change_password=true)
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                              ✓ TIDAK (Aman)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              border: 'none',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              backgroundColor: u.status === 'Aktif' ? '#dcfce7' : '#fee2e2',
                              color: u.status === 'Aktif' ? '#15803d' : '#dc2626',
                            }}
                          >
                            {u.status === 'Aktif' ? '✓ Aktif' : '✕ Nonaktif'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForReset(u);
                              setCustomPasswordInput(`farmReset-${Math.floor(1000 + Math.random() * 9000)}`);
                              setIsResetPassModalOpen(true);
                            }}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #f59e0b', backgroundColor: '#fffbeb', color: '#b45309', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                            title="Klik untuk mereset kata sandi staf dan set must_change_password=true"
                          >
                            🔑 Aksi 2: Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL RESET PASSWORD STAF */}
            {isResetPassModalOpen && selectedUserForReset && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', width: '100%', maxWidth: '420px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Reset Password Staf
                    </h3>
                    <button onClick={() => setIsResetPassModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    Atur ulang kata sandi untuk akun staf <strong>{selectedUserForReset.name}</strong> ({selectedUserForReset.email}):
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Kata Sandi Baru:</label>
                    <input
                      type="text"
                      value={customPasswordInput}
                      onChange={(e) => setCustomPasswordInput(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px', marginTop: '6px' }}>
                    <button
                      onClick={() => setIsResetPassModalOpen(false)}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleResetPasswordSubmit}
                      style={{ padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2d6a4f', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      ✓ Simpan Password Baru
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL TAMBAH STAF BARU */}
            {isAddUserModalOpen && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <form onSubmit={handleCreateUserSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', width: '100%', maxWidth: '440px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Tambah Staf Operasional Baru
                    </h3>
                    <button onClick={() => setIsAddUserModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nama Lengkap Staf *</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Contoh: Rian Hidayat"
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Alamat Email *</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="rian@farmberkah.com"
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Peran (Role) *</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => {
                          setNewUserRole(e.target.value);
                          setNewRoleTitle(e.target.value === ROLES.SALES_ADMIN ? 'Staff Penjualan' : e.target.value === ROLES.STOCK_MANAGER ? 'Staff Gudang' : 'Super Admin');
                        }}
                        style={{ width: '100%', height: '38px', padding: '0 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      >
                        <option value={ROLES.SALES_ADMIN}>Sales Admin</option>
                        <option value={ROLES.STOCK_MANAGER}>Stock Manager</option>
                        <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Nomor WhatsApp</label>
                      <input
                        type="text"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="+62 8..."
                        style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Kata Sandi Sementara (Otomatis Dibuat Sistem)
                    </label>
                    <input
                      type="text"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Biarkan kosong untuk dibuatkan otomatis (farmTemp-xxxx)"
                      style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'monospace' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#166534', marginTop: '3px', display: 'block' }}>
                      ✓ Sistem otomatis membuat hash & mengatur <strong>must_change_password = true</strong>.
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsAddUserModalOpen(false)}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2d6a4f', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      ✓ Simpan Akun Baru & Buat Sandi
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* MODAL HASIL AKSI PENGGUNA (BUAT AKUN BARU / RESET PASSWORD) */}
            {userActionSuccessModal && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1.5px solid #86efac', width: '100%', maxWidth: '460px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#142019', textAlign: 'center', margin: '0 0 6px 0' }}>
                    {userActionSuccessModal.title}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                    {userActionSuccessModal.note}
                  </p>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '16px', fontSize: '0.8rem' }}>
                    <div style={{ marginBottom: '6px' }}>Nama Staf: <strong>{userActionSuccessModal.account.name}</strong></div>
                    <div style={{ marginBottom: '6px' }}>Email Akun: <strong>{userActionSuccessModal.account.email}</strong></div>
                    <div style={{ marginBottom: '6px' }}>Peran (Role): <strong>{userActionSuccessModal.account.role}</strong></div>

                    <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Kata Sandi Sementara:</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.04em', color: '#b45309', marginTop: '2px' }}>
                        {userActionSuccessModal.tempPassword}
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#475569', wordBreak: 'break-all' }}>
                      <strong>Hash Tersimpan di Database (Simulasi SHA-256):</strong>
                      <div style={{ fontFamily: 'monospace', marginTop: '2px', color: '#1e293b' }}>{userActionSuccessModal.hash}</div>
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#15803d', fontWeight: 700 }}>
                      ✓ Status Database: must_change_password = true (Telah Disimpan)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUserActionSuccessModal(null)}
                    style={{ width: '100%', padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#2d6a4f', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Tutup & Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LAPORAN TERPADU */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Laporan Bisnis & Operasional
                </h1>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Unduh atau cetak laporan resmi Toko Farm Berkah untuk audit operasional dan evaluasi berkala.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#2d6a4f',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Download size={16} />
                <span>Unduh Laporan (CSV)</span>
              </button>
            </div>

            {/* Pilihan Jenis Laporan */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setReportType('sales')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: reportType === 'sales' ? '#2d6a4f' : '#ffffff',
                  color: reportType === 'sales' ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Laporan Penjualan ({orders.length})
              </button>
              <button
                onClick={() => setReportType('inventory')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: reportType === 'inventory' ? '#2d6a4f' : '#ffffff',
                  color: reportType === 'inventory' ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Laporan Stok Fisik ({products.length})
              </button>
              <button
                onClick={() => setReportType('forecasting')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: reportType === 'forecasting' ? '#2d6a4f' : '#ffffff',
                  color: reportType === 'forecasting' ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Laporan Demand Forecasting ({forecasts.length})
              </button>
            </div>

            {/* Tabel Preview Laporan */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: '#142019' }}>
                Preview Data: {reportType === 'sales' ? 'Transaksi Penjualan' : reportType === 'inventory' ? 'Persediaan Barang' : 'Hasil Peramalan Permintaan'}
              </div>
              <div style={{ overflowX: 'auto', padding: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      {reportType === 'sales' && (
                        <>
                          <th style={{ padding: '10px 14px' }}>ID Pesanan</th>
                          <th style={{ padding: '10px 14px' }}>Pelanggan</th>
                          <th style={{ padding: '10px 14px' }}>Produk</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Tagihan</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                        </>
                      )}
                      {reportType === 'inventory' && (
                        <>
                          <th style={{ padding: '10px 14px' }}>SKU</th>
                          <th style={{ padding: '10px 14px' }}>Nama Produk</th>
                          <th style={{ padding: '10px 14px' }}>Kategori</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Stok Fisik</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Batas ROP</th>
                        </>
                      )}
                      {reportType === 'forecasting' && (
                        <>
                          <th style={{ padding: '10px 14px' }}>Produk</th>
                          <th style={{ padding: '10px 14px' }}>Pola</th>
                          <th style={{ padding: '10px 14px' }}>Metode</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>W1 (Pcs)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>W2 (Pcs)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reportType === 'sales' &&
                      orders.slice(0, 10).map((o) => (
                        <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace' }}>{o.id}</td>
                          <td style={{ padding: '10px 14px' }}>{o.customerName}</td>
                          <td style={{ padding: '10px 14px' }}>{o.productName} ({o.quantity} unit)</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#1b4332' }}>{formatRupiah(o.totalAmount)}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, backgroundColor: o.gateway2Status === 'LOLOS' ? '#dcfce7' : '#fef3c7', color: o.gateway2Status === 'LOLOS' ? '#15803d' : '#b45309' }}>
                              {o.gateway2Status === 'LOLOS' ? 'Lunas' : 'Menunggu'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {reportType === 'inventory' &&
                      products.slice(0, 10).map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#2d6a4f' }}>{p.id}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{p.name}</td>
                          <td style={{ padding: '10px 14px' }}>{p.category}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800 }}>{p.stock} {p.unit}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#1b4332' }}>{p.reorderPoint || 15} {p.unit}</td>
                        </tr>
                      ))}
                    {reportType === 'forecasting' &&
                      forecasts.slice(0, 10).map((f) => (
                        <tr key={f.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>{f.productName}</td>
                          <td style={{ padding: '10px 14px' }}>{f.demandType}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2d6a4f' }}>{f.recommendedMethod}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>{f.horizonW1}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>{f.horizonW2}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

