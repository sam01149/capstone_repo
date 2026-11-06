import React, { useState, useRef, useEffect } from 'react';
import {
  Sprout,
  Search,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  MapPin,
  Star,
  Wheat,
  Leaf,
  CupSoda,
  Apple,
  Store,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  PackageCheck,
  Tag,
  Hash,
  Coins,
  ShieldCheck,
  Eye,
  LogOut,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getStoredProducts,
  calculateCategories,
  formatRupiah,
} from '../data/productsData';

export default function KatalogStaff({ onBackToHome, onGoToDashboard, onLogout }) {
  const { user, role } = useAuth();
  const [productsList, setProductsList] = useState(getStoredProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('POPULAR');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const categoryScrollRef = useRef(null);

  // Sinkronisasi data real-time saat ada perubahan produk di dashboard
  useEffect(() => {
    const handleProductsUpdate = () => {
      setProductsList(getStoredProducts());
    };
    window.addEventListener('farmsight_products_updated', handleProductsUpdate);
    return () => window.removeEventListener('farmsight_products_updated', handleProductsUpdate);
  }, []);

  // Baca URL hash awal untuk navigasi langsung ke produk tertentu
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/katalog/')) {
        const id = decodeURIComponent(hash.replace('#/katalog/', ''));
        const found = productsList.find((p) => p.id === id);
        if (found) {
          setSelectedProduct(found);
        }
      } else {
        setSelectedProduct(null);
      }
    };
    handleHash();
    window.addEventListener('popstate', handleHash);
    return () => window.removeEventListener('popstate', handleHash);
  }, [productsList]);

  // Scroll to top saat membuka atau menutup detail produk
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedProduct]);

  const categoriesList = calculateCategories(productsList);

  const handleOpenDetail = (product) => {
    setSelectedProduct(product);
    window.history.pushState({ view: 'catalog', detailId: product.id }, '', `#/katalog/${product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCatalog = () => {
    setSelectedProduct(null);
    if (window.location.hash.startsWith('#/katalog/')) {
      window.history.back();
    } else {
      window.history.pushState({ view: 'catalog' }, '', '#/katalog');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filter produk untuk staf (staf dapat melihat semua produk termasuk yang disembunyikan/hidden)
  const filteredProducts = productsList.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.composition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCat =
      selectedCategory === 'all' || item.categorySlug === selectedCategory;

    const matchStock =
      stockFilter === 'ALL' ||
      (stockFilter === 'AVAILABLE' && item.stock > item.minStock && item.isAvailable !== false) ||
      (stockFilter === 'LIMITED' && item.stock > 0 && item.stock <= item.minStock && item.isAvailable !== false) ||
      (stockFilter === 'OUT' && (item.stock === 0 || item.isAvailable === false));

    return matchSearch && matchCat && matchStock;
  }).sort((a, b) => {
    if (sortBy === 'STOCK_LOW') return a.stock - b.stock;
    if (sortBy === 'STOCK_HIGH') return b.stock - a.stock;
    if (sortBy === 'PRICE_LOW') return a.price - b.price;
    if (sortBy === 'PRICE_HIGH') return b.price - a.price;
    if (sortBy === 'RATING') return b.rating - a.rating;
    return b.soldCount - a.soldCount; // Default POPULAR
  });

  const getCategoryIcon = (slug) => {
    switch (slug) {
      case 'camilan':
        return <Wheat size={15} />;
      case 'olahan':
        return <Leaf size={15} />;
      case 'minuman':
        return <CupSoda size={15} />;
      case 'sayur':
        return <Apple size={15} />;
      case 'bibit_pupuk':
        return <Sprout size={15} />;
      default:
        return <Sparkles size={15} />;
    }
  };

  const roleLabel =
    role === 'SUPER_ADMIN'
      ? 'Super Admin'
      : role === 'STOCK_MANAGER'
        ? 'Stock Manager'
        : 'Sales Admin';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8faf9', color: '#142019', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. TOP HEADER STAF */}
      <header
        style={{
          height: '76px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8e3',
          padding: '0 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Brand Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            onClick={onBackToHome}
            role={onBackToHome ? 'button' : undefined}
            title="Kembali ke Beranda"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: onBackToHome ? 'pointer' : 'default' }}
          >
            <img
              src="/images/logo-farm-berkah.jpg"
              alt="Logo UMKM Toko Farm Berkah"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                objectFit: 'contain',
                border: '1px solid #d8e2da',
                boxShadow: '0 2px 6px rgba(27, 67, 50, 0.08)',
                backgroundColor: '#ffffff',
                padding: '2px',
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#142019', letterSpacing: '-0.02em' }}>
                  Toko Farm Berkah
                </span>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                  Portal Staf
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#718277', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} color="#2d6a4f" />
                <span>Komplek Masnaga, Pulo Gebang, Jakarta Timur</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Search Bar */}
        <div style={{ flex: '1', maxWidth: '460px', margin: '0 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f2',
              borderRadius: '30px',
              padding: '4px 6px 4px 16px',
              border: '1px solid #d8e2da',
            }}
          >
            <Search size={16} color="#718277" style={{ flexShrink: 0, marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, kategori, atau bahan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                fontSize: '0.85rem',
                color: '#142019',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#9aa8a0', cursor: 'pointer', padding: '0 6px' }}
              >
                <X size={14} />
              </button>
            )}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#2d6a4f',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Search size={14} />
            </div>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', padding: '5px 12px', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0' }}>
              Role: {roleLabel}
            </span>
            <button
              onClick={onGoToDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '24px',
                border: 'none',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(27,67,50,0.2)',
              }}
            >
              <LayoutDashboard size={14} />
              <span>Dashboard ({user?.name ? user.name.split(' ')[0] : 'Staf'})</span>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar dari Portal Staf"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  borderRadius: '24px',
                  border: '1px solid #e2e8e3',
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. BODY CONTENT: DETAIL PRODUK vs DAFTAR PRODUK */}
      {selectedProduct ? (
        /* ================= TAMPILAN DETAIL PRODUK STAF (BEBAS DUPLIKASI) ================= */
        <main style={{ flex: 1, padding: '28px 36px 60px 36px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          
          {/* Breadcrumb Navigation (Satu Navigasi Kembali Saja) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
              <button
                onClick={handleBackToCatalog}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2d6a4f',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                }}
              >
                <ArrowLeft size={16} />
                <span>Katalog Staf</span>
              </button>
              <span style={{ color: '#94a3b8' }}>/</span>
              <span style={{ color: '#64748b' }}>{selectedProduct.category}</span>
              <span style={{ color: '#94a3b8' }}>/</span>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{selectedProduct.name}</span>
            </div>
          </div>

          {/* Layout 2 Kolom Seimbang: Kiri (Visual & Deskripsi) | Kanan (Kartu Pemantauan Terpadu) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 0.85fr)',
              gap: '28px',
              alignItems: 'start',
            }}
          >
            {/* KOLOM KIRI: Visual Produk, Judul, Deskripsi & Bahan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Card 1: Gambar Utama & Identitas Dasar */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e1e7e2',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h1
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: '#142019',
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {selectedProduct.name}
                  </h1>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#64748b' }}>
                    <Star size={14} color="#eab308" fill="#eab308" />
                    <strong style={{ color: '#0f172a' }}>{selectedProduct.rating || '4.8'}</strong>
                    <span>({selectedProduct.reviews || 0} ulasan)</span>
                  </div>
                </div>

                {/* Foto Produk */}
                <div
                  style={{
                    width: '100%',
                    height: '420px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: '#f8faf9',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                >
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: '8px',
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  {selectedProduct.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(6px)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: selectedProduct.badgeColor || '#1b4332',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      {selectedProduct.badge}
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Deskripsi & Komposisi Bahan */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e1e7e2',
                  padding: '22px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#142019', marginBottom: '8px' }}>
                    Deskripsi Lengkap Produk
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: '#48564e', lineHeight: 1.7, margin: 0 }}>
                    {selectedProduct.description || 'Tidak ada deskripsi tambahan.'}
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#142019', marginBottom: '8px' }}>
                    Komposisi Bahan Baku
                  </h3>
                  <div
                    style={{
                      backgroundColor: '#f8faf8',
                      border: '1px solid #e1e7e2',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      fontSize: '0.84rem',
                      color: '#2d6a4f',
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedProduct.composition || 'Bahan alami binaan kelompok tani UMKM Toko Farm Berkah.'}
                  </div>
                </div>
              </div>

            </div>

            {/* KOLOM KANAN: KARTU PEMANTAUAN TERPADU STAF (SATU KARTU UTUH, TANPA DUPLIKASI) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                position: 'sticky',
                top: '96px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Header Kartu Pemantauan */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PackageCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                    Pemantauan Produk & Stok
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                    Data inventaris & spesifikasi resmi toko
                  </p>
                </div>
              </div>

              {/* 1. GRID STATISTIK UTAMA (TAMPIL 1 KALI SAJA SECARA JELAS) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                {/* A. Harga Jual Pelanggan */}
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#f8faf9',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Coins size={12} color="#2d6a4f" />
                    <span>Harga Jual Publik</span>
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#1b4332',
                      marginTop: '4px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {selectedProduct.priceFormatted || formatRupiah(selectedProduct.price)}
                  </div>
                </div>

                {/* B. Sisa Stok & Status */}
                <div
                  style={{
                    padding: '14px',
                    backgroundColor:
                      selectedProduct.stock === 0
                        ? '#fef2f2'
                        : selectedProduct.stock <= selectedProduct.minStock
                          ? '#fffbeb'
                          : '#f0fdf4',
                    borderRadius: '12px',
                    border: `1px solid ${
                      selectedProduct.stock === 0
                        ? '#fecaca'
                        : selectedProduct.stock <= selectedProduct.minStock
                          ? '#fef3c7'
                          : '#bbf7d0'
                    }`,
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedProduct.stock === 0 ? (
                      <>
                        <XCircle size={12} color="#dc2626" />
                        <span style={{ color: '#dc2626' }}>Stok Habis</span>
                      </>
                    ) : selectedProduct.stock <= selectedProduct.minStock ? (
                      <>
                        <AlertTriangle size={12} color="#b45309" />
                        <span style={{ color: '#b45309' }}>Stok Menipis</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} color="#15803d" />
                        <span style={{ color: '#15803d' }}>Stok Tersedia</span>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color:
                        selectedProduct.stock === 0
                          ? '#dc2626'
                          : selectedProduct.stock <= selectedProduct.minStock
                            ? '#b45309'
                            : '#166534',
                      marginTop: '4px',
                    }}
                  >
                    {selectedProduct.stock || 0}{' '}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selectedProduct.unit}</span>
                  </div>
                </div>

                {/* C. Batas Stok Minimum */}
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#f8faf9',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    Batas Minimum
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                    {selectedProduct.minStock || 0}{' '}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>{selectedProduct.unit}</span>
                  </div>
                </div>

                {/* D. Estimasi Nilai Aset Stok */}
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#f8faf9',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    Nilai Aset Stok
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#2d6a4f', marginTop: '2px' }}>
                    {formatRupiah((selectedProduct.stock || 0) * (selectedProduct.price || 0))}
                  </div>
                </div>

              </div>

              {/* 2. RINCIAN SPESIFIKASI TEKNIS PRODUK (TIDAK MENGULANG HARGA / STOK) */}
              <div
                style={{
                  backgroundColor: '#f8faf8',
                  borderRadius: '12px',
                  border: '1px solid #e2e8e3',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #edf2ee' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Hash size={13} color="#2d6a4f" />
                    <span>Kode SKU:</span>
                  </span>
                  <strong style={{ fontFamily: 'monospace', color: '#0f172a', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                    {selectedProduct.id}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #edf2ee' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={13} color="#2d6a4f" />
                    <span>Kategori:</span>
                  </span>
                  <span style={{ fontWeight: 700, color: '#1b4332' }}>
                    {selectedProduct.category}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #edf2ee' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={13} color="#2d6a4f" />
                    <span>Kemasan Satuan:</span>
                  </span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {selectedProduct.unit}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={13} color="#2d6a4f" />
                    <span>Visibilitas Katalog:</span>
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: selectedProduct.visibility === 'hidden' ? '#fee2e2' : '#dcfce7',
                      color: selectedProduct.visibility === 'hidden' ? '#b91c1c' : '#15803d',
                    }}
                  >
                    {selectedProduct.visibility === 'hidden' ? 'Disembunyikan' : '✓ Ditampilkan'}
                  </span>
                </div>
              </div>

              {/* 3. TOMBOL NAVIGASI STAF */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={onGoToDashboard}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(27, 67, 50, 0.2)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d6a4f')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1b4332')}
                >
                  <LayoutDashboard size={16} />
                  <span>Kembali ke Dashboard Staf</span>
                </button>

                <button
                  type="button"
                  onClick={handleBackToCatalog}
                  style={{
                    width: '100%',
                    padding: '11px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8faf9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <ArrowLeft size={15} />
                  <span>Lihat Produk Lain di Katalog</span>
                </button>
              </div>

            </div>
          </div>
        </main>
      ) : (
        /* ================= TAMPILAN DAFTAR KATALOG UNTUK STAF ================= */
        <main style={{ flex: 1, padding: '24px 36px 60px 36px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          {/* Kategori Horizontal Scroll */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <button
              onClick={() => scrollCategories('left')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #d8e2da',
                color: '#142019',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
              }}
              title="Geser kategori ke kiri"
            >
              <ChevronLeft size={18} />
            </button>

            <div
              ref={categoryScrollRef}
              style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                padding: '6px 4px',
                scrollBehavior: 'smooth',
                flex: 1,
                alignItems: 'center',
                scrollbarWidth: 'none',
              }}
            >
              {categoriesList.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: '30px',
                      border: isSelected ? '1px solid #1b4332' : '1px solid #d8e2da',
                      backgroundColor: isSelected ? '#1b4332' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#37473d',
                      fontSize: '0.84rem',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 3px 8px rgba(27, 67, 50, 0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <span style={{ color: isSelected ? '#95d5b2' : '#2d6a4f', display: 'flex', alignItems: 'center' }}>
                      {getCategoryIcon(cat.id)}
                    </span>
                    <span>{cat.name}</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        backgroundColor: isSelected ? '#2d6a4f' : '#edf2ee',
                        color: isSelected ? '#ffffff' : '#5b6b61',
                        fontWeight: 700,
                      }}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => scrollCategories('right')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #d8e2da',
                color: '#142019',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
              }}
              title="Geser kategori ke kanan"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e1e7e2',
              padding: '12px 24px',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#48564e', fontWeight: 500 }}>
              Menampilkan <strong>{filteredProducts.length}</strong> produk di katalog inventaris
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#718277', fontWeight: 600 }}>Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '20px',
                    border: '1px solid #d8e2da',
                    backgroundColor: '#f8faf8',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#142019',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="POPULAR">Paling Populer</option>
                  <option value="STOCK_LOW">Stok Terendah (Prioritas)</option>
                  <option value="STOCK_HIGH">Stok Tertinggi</option>
                  <option value="PRICE_LOW">Harga: Terendah</option>
                  <option value="PRICE_HIGH">Harga: Tertinggi</option>
                  <option value="RATING">Rating Tertinggi</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#718277', fontWeight: 600 }}>Kondisi Stok:</span>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '20px',
                    border: '1px solid #d8e2da',
                    backgroundColor: '#f8faf8',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#142019',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">Semua Kondisi</option>
                  <option value="AVAILABLE">Stok Aman</option>
                  <option value="LIMITED">Stok Menipis</option>
                  <option value="OUT">Stok Habis</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid Kartu Produk Staf */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredProducts.map((product) => {
              const isOut = product.stock === 0 || product.isAvailable === false;
              const isLow = !isOut && product.stock <= product.minStock;

              return (
                <div
                  key={product.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e1e7e2',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                  }}
                >
                  {/* Foto Produk */}
                  <div
                    style={{
                      height: '180px',
                      backgroundColor: '#f8faf9',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px',
                      borderBottom: '1px solid #edf2ee',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleOpenDetail(product)}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    {/* Badge Kondisi Stok */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        backgroundColor: isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4',
                        color: isOut ? '#dc2626' : isLow ? '#b45309' : '#15803d',
                        border: `1px solid ${isOut ? '#fecaca' : isLow ? '#fef3c7' : '#bbf7d0'}`,
                      }}
                    >
                      {isOut ? 'Habis' : isLow ? 'Menipis' : 'Aman'}
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '10px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.92)',
                        color: '#64748b',
                        fontFamily: 'monospace',
                      }}
                    >
                      {product.id}
                    </div>
                  </div>

                  {/* Info Kartu */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                      {product.category}
                    </div>

                    <h3
                      onClick={() => handleOpenDetail(product)}
                      style={{
                        fontSize: '0.96rem',
                        fontWeight: 800,
                        color: '#142019',
                        margin: 0,
                        cursor: 'pointer',
                        lineHeight: 1.3,
                      }}
                    >
                      {product.name}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '8px' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1b4332' }}>
                        {product.priceFormatted || formatRupiah(product.price)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        Stok: <strong style={{ color: isOut ? '#dc2626' : isLow ? '#b45309' : '#166534' }}>{product.stock} {product.unit}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(product)}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#1b4332',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(27, 67, 50, 0.18)',
                        transition: 'background-color 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2d6a4f';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1b4332';
                      }}
                    >
                      <Eye size={13} />
                      <span>Pantau Stok & Detail</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2' }}>
              <p style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>Tidak ada produk yang cocok dengan pencarian atau filter Anda.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setStockFilter('ALL');
                }}
                style={{
                  marginTop: '12px',
                  padding: '8px 18px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reset Filter
              </button>
            </div>
          )}

        </main>
      )}

      {/* Footer Staf */}
      <footer style={{ marginTop: 'auto', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8e3', padding: '20px 36px', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
        Portal Monitoring Inventaris & Katalog Staf &bull; UMKM Toko Farm Berkah &bull; Sistem FarmSight
      </footer>

    </div>
  );
}

