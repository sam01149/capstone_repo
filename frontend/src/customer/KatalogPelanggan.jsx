import React, { useState, useRef, useEffect } from 'react';
import {
  Sprout,
  Search,
  LogIn,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  MapPin,
  Star,
  SlidersHorizontal,
  Wheat,
  Leaf,
  CupSoda,
  Apple,
  PhoneCall,
  Store,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Tag,
  ArrowRight,
  ArrowLeft,
  Download,
  Minus,
  Plus,
  FileText,
  User,
  ShoppingCart,
  ShieldCheck,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  getStoredProducts,
  calculateCategories,
  formatRupiah,
} from '../data/productsData';
import {
  saveDraftInvoice,
} from '../data/ordersAndInventoryData';

export default function KatalogPelanggan({ onBackToHome, onOpenLogin, onGoToDashboard }) {
  const { isAuthenticated, user, role } = useAuth();
  const [productsList, setProductsList] = useState(getStoredProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('POPULAR');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [invoiceToast, setInvoiceToast] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [activeDraftNo, setActiveDraftNo] = useState(null);

  // Real-time synchronization when Super Admin adds/edits products in staff portal
  useEffect(() => {
    const handleProductsUpdate = () => {
      setProductsList(getStoredProducts());
    };
    window.addEventListener('farmsight_products_updated', handleProductsUpdate);
    return () => window.removeEventListener('farmsight_products_updated', handleProductsUpdate);
  }, []);

  const categoriesList = calculateCategories(productsList.filter((p) => p.visibility !== 'hidden'));
  // Status Visibilitas: Hanya tampilkan produk yang diset 'visible' oleh Super Admin (produk 'hidden' disembunyikan dari publik)
  const activeProducts = productsList.filter((p) => p.visibility !== 'hidden');

  // Scroll to the very top whenever a product detail view is opened or closed
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedProduct]);

  const handleOpenDetail = (product) => {
    setSelectedProduct(product);
    setOrderQty(1);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setActiveDraftNo(null);
    setInvoiceToast('');
    window.history.pushState({ view: 'catalog', detailId: product.id }, '', `#/katalog/${product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCatalog = () => {
    setSelectedProduct(null);
    if (window.location.hash.startsWith('#/katalog/')) {
      window.history.back();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      if (!window.location.hash.startsWith('#/katalog/')) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [showPromoBanner, setShowPromoBanner] = useState(() => {
    try {
      return sessionStorage.getItem('farmsight_promo_closed') !== 'true';
    } catch {
      return true;
    }
  });

  const handleClosePromoBanner = () => {
    setShowPromoBanner(false);
    try {
      sessionStorage.setItem('farmsight_promo_closed', 'true');
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToProducts = (e) => {
    if (e) e.preventDefault();
    if (selectedProduct) {
      setSelectedProduct(null);
    }
    setTimeout(() => {
      const el = document.getElementById('katalog-produk');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 380, behavior: 'smooth' });
      }
    }, 50);
  };
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const categoryScrollRef = useRef(null);

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filter products based on search, category, and stock filter
  const filteredProducts = activeProducts.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.composition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCat =
      selectedCategory === 'all' || item.categorySlug === selectedCategory;

    const matchStock =
      stockFilter === 'ALL' ||
      (stockFilter === 'AVAILABLE' && item.stock > item.minStock && item.isAvailable !== false) ||
      (stockFilter === 'LIMITED' && item.stock > 0 && item.stock <= item.minStock && item.isAvailable !== false) ||
      (stockFilter === 'OUT' && (item.stock === 0 || item.isAvailable === false));

    return matchSearch && matchCat && matchStock;
  }).sort((a, b) => {
    if (sortBy === 'PRICE_LOW') return a.price - b.price;
    if (sortBy === 'PRICE_HIGH') return b.price - a.price;
    if (sortBy === 'RATING') return b.rating - a.rating;
    return b.soldCount - a.soldCount; // Default POPULAR
  });

  const handleDownloadDraftInvoice = (product, qty) => {
    if (!custName.trim() || !custPhone.trim() || !custAddress.trim()) {
      alert('Silakan lengkapi Data Diri Pembeli (Nama Lengkap, Nomor WhatsApp, dan Alamat Pengiriman) pada formulir terlebih dahulu.');
      return;
    }

    const quantity = Math.max(1, qty || 1);
    const subtotal = (product.price || 0) * quantity;
    const now = new Date();
    const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const draftInvoiceNo = activeDraftNo || `DRAFT-INV-${dateCode}-${randCode}`;
    if (!activeDraftNo) {
      setActiveDraftNo(draftInvoiceNo);
    }
    const dateFormatted = now.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

    const draftData = {
      invoiceNo: draftInvoiceNo,
      date: dateFormatted,
      productId: product.id,
      productName: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      priceFormatted: product.priceFormatted,
      quantity,
      subtotal,
      subtotalFormatted: formatRupiah(subtotal),
      customerName: custName.trim(),
      customerPhone: custPhone.trim(),
      customerAddress: custAddress.trim(),
      status: 'DRAFT_DIUNDUH',
      createdAt: now.toISOString(),
    };

    // Draft hanya diunduh customer. Pesanan baru masuk ke Sales Admin saat customer klik "Pesan via WhatsApp".
    void draftData;

    // Create printable text invoice
    const invoiceContent = [
      '======================================================================',
      '                    UMKM TOKO FARM BERKAH - PULO GEBANG',
      '                     RINGKASAN PEMESANAN / DRAFT INVOICE',
      '======================================================================',
      `No. Dokumen     : ${draftInvoiceNo}`,
      `Tanggal         : ${dateFormatted}`,
      `Status Dokumen  : DRAFT RESMI PEMESANAN`,
      '----------------------------------------------------------------------',
      'DATA PEMESAN (CUSTOMER):',
      `• Nama Lengkap  : ${custName.trim()}`,
      `• No. WhatsApp  : ${custPhone.trim()}`,
      `• Alamat Kirim  : ${custAddress.trim()}`,
      '----------------------------------------------------------------------',
      'RINCIAN PRODUK PESANAN:',
      `• Nama Produk   : ${product.name}`,
      `• Kode SKU      : ${product.id}`,
      `• Kategori      : ${product.category}`,
      `• Kemasan Satuan: ${product.unit}`,
      `• Harga Satuan  : ${product.priceFormatted}`,
      `• Kuantitas     : ${quantity}`,
      '----------------------------------------------------------------------',
      `ESTIMASI TOTAL PEMBAYARAN : ${formatRupiah(subtotal)}`,
      '======================================================================',
      '',
      'ALUR PEMESANAN & PEMBAYARAN VIA SALES ADMIN:',
      '1. Kirimkan pesan pemesanan ke nomor WhatsApp Toko: 0812-1614-6510.',
      '2. Sales Admin akan memeriksa ketersediaan stok terlebih dahulu.',
      '3. Jika stok tersedia, Sales Admin mereservasi stok dan mengirim QRIS resmi.',
      '4. Lakukan transfer sesuai nominal dan kirimkan bukti transfer.',
      '5. Sales Admin mengonfirmasi pembayaran dan pesanan segera diproses.',
      '',
      'Alamat Toko: Komplek Masnaga, Pulo Gebang, Jakarta Timur',
      'WhatsApp Resmi: 0812-1614-6510 | Email: admin@farmberkah.com',
      '======================================================================',
    ].join('\n');

    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Draft-Invoice-${product.name.replace(/\s+/g, '-')}-${draftInvoiceNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setInvoiceToast(`Draft Invoice ${draftInvoiceNo} berhasil diunduh!`);
    setTimeout(() => setInvoiceToast(''), 4500);
    return draftInvoiceNo;
  };

  const handleWhatsAppOrder = (product, qty) => {
    if (!product || !product.stock || product.stock <= 0 || product.isAvailable === false) {
      alert(`Mohon maaf, produk "${product?.name || 'ini'}" saat ini sedang habis atau tidak tersedia sehingga belum dapat dipesan.`);
      return;
    }

    if (!custName.trim() || !custPhone.trim() || !custAddress.trim()) {
      alert('Silakan lengkapi Data Diri Pembeli (Nama Lengkap, Nomor WhatsApp, dan Alamat Pengiriman) pada formulir terlebih dahulu.');
      return;
    }

    const quantity = Math.max(1, qty || 1);
    const subtotal = (product.price || 0) * quantity;
    const now = new Date();
    const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const draftInvoiceNo = activeDraftNo || `DRAFT-INV-${dateCode}-${randCode}`;
    if (!activeDraftNo) {
      setActiveDraftNo(draftInvoiceNo);
    }

    // Auto-save draft for Sales Admin inbox
    saveDraftInvoice({
      invoiceNo: draftInvoiceNo,
      date: now.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
      productId: product.id,
      productName: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      priceFormatted: product.priceFormatted,
      quantity,
      subtotal,
      subtotalFormatted: formatRupiah(subtotal),
      customerName: custName.trim(),
      customerPhone: custPhone.trim(),
      customerAddress: custAddress.trim(),
      status: 'DIKIRIM_VIA_WHATSAPP',
      createdAt: now.toISOString(),
    });

    const phone = '6281216146510';
    const lines = [
      'PEMESANAN - TOKO FARM BERKAH',
      '------------------------------------------',
      `📄 No. Draft Invoice: ${draftInvoiceNo}`,
      '📦 Rincian Produk:',
      `• Nama Produk: ${product.name}`,
      `• Kemasan / Satuan: ${product.unit}`,
      `• Harga Satuan: ${product.priceFormatted}`,
      `• Kuantitas Pesanan: ${quantity}`,
      `• Estimasi Total Pembayaran: ${formatRupiah(subtotal)}`,
      '',
      '👤 Data Diri Pembeli:',
      `• Nama Lengkap: ${custName.trim()}`,
      `• Nomor WhatsApp / HP: ${custPhone.trim()}`,
      `• Alamat Pengiriman: ${custAddress.trim()}`,
      '------------------------------------------',
      'Mohon dicek ketersediaan stok tokonya ya kak. Terima kasih! 🙏',
    ];

    const message = lines.join('\n');
    // Using official api.whatsapp.com endpoint to preserve UTF-8 emojis without browser redirect corruption
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // Pesan WhatsApp ini akan diterima Sales Admin (muncul di menu "Pesan WhatsApp Masuk").
    // Sales Admin yang kemudian menginput pesanan ke sistem secara manual (Create Order).

    // Reset formulir pemesanan kembali ke awal agar siap untuk pemesanan berikutnya
    setOrderQty(1);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setActiveDraftNo(null);
    setInvoiceToast('✓ Ringkasan pesanan berhasil dikirim ke WhatsApp Sales Admin Toko Farm Berkah! Sales Admin kami akan segera mengecek ketersediaan stok dan membalas pesan WhatsApp Anda.');
    setTimeout(() => setInvoiceToast(''), 5000);
  };

  const formatStockDisplay = (stock, unit, isAvailable) => {
    if (isAvailable === false) return 'Tidak Tersedia';
    if (!stock || stock === 0) return 'Stok Habis';
    const u = (unit || '').trim();
    const uUpper = u.toUpperCase();
    if (uUpper === 'PCS' || uUpper === 'KG' || uUpper === 'BOTOL' || uUpper === 'POLYBAG' || uUpper === 'PACK' || uUpper === 'CUP') {
      return `${stock} ${u}`;
    }
    return `${stock} Pcs (${u.toLowerCase()})`;
  };

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8faf9', color: '#142019', display: 'flex', flexDirection: 'column' }}>

      {/* 1. TOP HEADER (Dribbble Style with center search & nav links) */}
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
        {/* Brand Left with Authentic Toko Farm Berkah Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            onClick={onBackToHome} 
            role={onBackToHome ? 'button' : undefined}
            title={onBackToHome ? 'Kembali ke Halaman Utama' : undefined}
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
              </div>
              <div style={{ fontSize: '0.72rem', color: '#718277', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} color="#2d6a4f" />
                <span>Komplek Masnaga, Pulo Gebang, Jakarta Timur</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Search Bar (Exact Dribbble Style Pill Search) */}
        <div style={{ flex: '1', maxWidth: '480px', margin: '0 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f2',
              borderRadius: '30px',
              padding: '4px 6px 4px 16px',
              border: '1px solid #d8e2da',
              transition: 'border-color 0.2s, background-color 0.2s',
            }}
          >
            <Search size={17} color="#718277" style={{ flexShrink: 0, marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Cari keripik, lidah buaya, bayam, teh telang..."
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
                cursor: 'pointer',
              }}
            >
              <Search size={14} />
            </div>
          </div>
        </div>

        {/* Right Navigation & Staff Login */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Login / Dashboard Button */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                Role: {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'STOCK_MANAGER' ? 'Stock Manager' : 'Sales Admin'}
              </span>
              <button
                onClick={onGoToDashboard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2d6a4f',
                  color: '#ffffff',
                  padding: '9px 18px',
                  borderRadius: '30px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(45, 106, 79, 0.25)',
                }}
              >
                <LayoutDashboard size={15} />
                <span>Dashboard ({(user?.name || 'Staf').split(' ')[0]})</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#142019',
                color: '#ffffff',
                padding: '9px 22px',
                borderRadius: '30px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2d6a4f';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#142019';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <LogIn size={15} />
              <span>Masuk Staf</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT: SWITCH BETWEEN DEDICATED PRODUCT DETAIL VIEW OR CATALOG GRID */}
      {selectedProduct ? (
        /* 1. DEDICATED PRODUCT DETAIL VIEW (Rapi, Proporsional, Tipografi Elegan & Pas) */
        <main
          style={{
            width: '100%',
            padding: '24px 36px 48px 36px',
            flex: 1,
          }}
          className="animate-fade-in"
        >
          {/* Breadcrumb & Kembali Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <button
              onClick={handleBackToCatalog}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #d8e2da',
                color: '#1b4332',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '20px',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#edf7f0';
                e.currentTarget.style.borderColor = '#2d6a4f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#d8e2da';
              }}
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Katalog Produk</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#718277' }}>
              <span>Katalog</span>
              <span>/</span>
              <span style={{ color: '#1b4332', fontWeight: 600 }}>{selectedProduct.category}</span>
              <span>/</span>
              <span style={{ color: '#142019', fontWeight: 600 }}>{selectedProduct.name}</span>
            </div>
          </div>

          {/* 2-Column Balanced Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.25fr) minmax(380px, 450px)',
              gap: '24px',
              alignItems: 'start',
              width: '100%',
            }}
          >
            {/* Left Column: Visual Showcase, Pricing, Description, Ingredients, & Flow Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Card 1: Product Header, Image Showcase & Price/Stock */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e1e7e2',
                  padding: '24px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Header Meta: Category, SKU, Rating, Location */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#edf7f0',
                        color: '#1b4332',
                        padding: '3px 10px',
                        borderRadius: '12px',
                      }}
                    >
                      {selectedProduct.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#718277' }}>
                      SKU: <strong>{selectedProduct.id}</strong>
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#718277',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={13} color="#eab308" fill="#eab308" />
                      <strong style={{ color: '#142019' }}>{selectedProduct.rating}</strong>
                      <span>({selectedProduct.reviews} Ulasan)</span>
                    </div>
                    <span>&bull;</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="#2d6a4f" />
                      <span>Pulo Gebang, Jakarta Timur</span>
                    </div>
                  </div>
                </div>

                <h1
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    color: '#142019',
                    marginBottom: '16px',
                    lineHeight: 1.3,
                  }}
                >
                  {selectedProduct.name}
                </h1>

                {/* Product Real Image Preview - Diperbesar & Tidak Terpotong */}
                <div
                  style={{
                    width: '100%',
                    height: '420px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: '#f8faf9',
                    border: '1px solid #d8e2da',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
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
                      borderRadius: '10px',
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '14px',
                      left: '14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(6px)',
                      padding: '5px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: selectedProduct.badgeColor || '#1b4332',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {selectedProduct.badge}
                  </div>
                </div>
              </div>

              {/* Card 2: Description & Ingredients */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e1e7e2',
                  padding: '22px 24px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#142019', marginBottom: '8px' }}>
                    Deskripsi Lengkap Produk
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: '#48564e', lineHeight: 1.7, margin: 0 }}>
                    {selectedProduct.description}
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
                    {selectedProduct.composition || 'Bahan alami berkualitas pilihan dari kelompok tani UMKM Toko Farm Berkah.'}
                  </div>
                </div>
              </div>

              {/* Card 3: Cara Pemesanan via WhatsApp */}
              <div
                style={{
                  backgroundColor: '#edf7f0',
                  borderRadius: '16px',
                  border: '1px solid #d3e7d8',
                  padding: '20px 24px',
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1b4332', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={17} />
                  <span>Cara Pemesanan via WhatsApp</span>
                </h4>
                <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.82rem', color: '#2d6a4f', lineHeight: 1.7 }}>
                  <li>Tentukan kuantitas pesanan pada formulir di sebelah kanan untuk melihat total tagihan otomatis.</li>
                  <li>Lengkapi nama, nomor WhatsApp, dan alamat pengiriman Anda.</li>
                  <li>Klik <strong>"Unduh Draft Invoice"</strong> untuk menyimpan dokumen ringkasan resmi pemesanan Anda.</li>
                  <li>Klik <strong>"Pesan via WhatsApp"</strong> untuk mengirim rincian draft pesanan langsung ke Sales Admin Toko Farm Berkah.</li>
                  <li>Sales Admin akan memeriksa ketersediaan stok di toko terlebih dahulu. Jika stok tersedia, Sales Admin akan mereservasi stok dan menerbitkan QR Code QRIS pembayaran resmi kepada Anda.</li>
                </ol>
              </div>
            </div>

            {/* Right Column: Formulir Pemesanan & Checkout (Sticky & Balanced) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e1e7e2',
                padding: '22px',
                boxShadow: 'var(--shadow-sm)',
                position: 'sticky',
                top: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Header Kolom Kanan: Formulir Pemesanan */}
              <div style={{ paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                      Formulir Pemesanan
                    </h3>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                      Lengkapi data pesanan untuk dikirim ke WhatsApp toko
                    </p>
                  </div>
                </div>
              </div>

              {/* HARGA SATUAN & STOK TERSEDIA (DITARUH DI ATAS KUANTITAS PESANAN) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Harga Satuan */}
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#f8faf8',
                    borderRadius: '12px',
                    border: '1px solid #e1e7e2',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: '#718277', fontWeight: 600 }}>
                    Harga Satuan
                  </div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      color: '#1b4332',
                      marginTop: '2px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {selectedProduct.priceFormatted}
                  </div>
                </div>

                {/* Stok Tersedia */}
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor:
                      selectedProduct.stock === 0
                        ? '#fef2f2'
                        : selectedProduct.stock <= selectedProduct.minStock
                          ? '#fffbeb'
                          : '#f0f7f2',
                    borderRadius: '12px',
                    border: `1px solid ${
                      selectedProduct.stock === 0
                        ? '#fecaca'
                        : selectedProduct.stock <= selectedProduct.minStock
                          ? '#fef3c7'
                          : '#d2e7d7'
                    }`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    {selectedProduct.stock === 0 || selectedProduct.isAvailable === false ? (
                      <XCircle size={14} color="#dc2626" />
                    ) : selectedProduct.stock <= selectedProduct.minStock ? (
                      <AlertTriangle size={14} color="#b45309" />
                    ) : (
                      <CheckCircle2 size={14} color="#1b4332" />
                    )}
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        color:
                          selectedProduct.stock === 0 || selectedProduct.isAvailable === false
                            ? '#dc2626'
                            : selectedProduct.stock <= selectedProduct.minStock
                              ? '#b45309'
                              : '#1b4332',
                      }}
                    >
                      {selectedProduct.stock === 0
                        ? 'Stok Habis'
                        : selectedProduct.isAvailable === false
                          ? 'Tidak Tersedia'
                          : selectedProduct.stock <= selectedProduct.minStock
                            ? 'Stok Menipis'
                            : 'Stok Tersedia'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: selectedProduct.stock === 0 || selectedProduct.isAvailable === false ? '#dc2626' : '#1b4332', marginTop: '2px' }}>
                    {formatStockDisplay(selectedProduct.stock, selectedProduct.unit, selectedProduct.isAvailable)}
                  </div>
                </div>
              </div>

              {/* FORMULIR PEMESANAN, ESTIMASI HARGA, INVOICE & WHATSAPP */}
              {/* 1. INPUT KUANTITAS & RINGKASAN PEMESANAN DENGAN ESTIMASI HARGA */}
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: '#f8faf8',
                      borderRadius: '12px',
                      border: '1px solid #d8e2da',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#142019' }}>
                        Kuantitas Pesanan:
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#718277' }}>
                        Sisa Stok: <strong>{selectedProduct.stock || 0} {selectedProduct.unit}</strong>
                      </span>
                    </div>

                    {/* Stepper Input Kuantitas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setOrderQty((prev) => Math.max(1, prev - 1))}
                        disabled={orderQty <= 1 || selectedProduct.stock === 0 || selectedProduct.isAvailable === false}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: orderQty <= 1 ? '#f1f5f9' : '#ffffff',
                          color: orderQty <= 1 ? '#94a3b8' : '#142019',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: orderQty <= 1 ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        <Minus size={15} />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={selectedProduct.stock || 1}
                        value={orderQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val) || val < 1) setOrderQty(1);
                          else setOrderQty(Math.min(val, selectedProduct.stock || 1));
                        }}
                        disabled={selectedProduct.stock === 0 || selectedProduct.isAvailable === false}
                        style={{
                          flex: 1,
                          height: '36px',
                          textAlign: 'center',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: '#142019',
                          outline: 'none',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setOrderQty((prev) => Math.min(selectedProduct.stock || 1, prev + 1))}
                        disabled={orderQty >= (selectedProduct.stock || 1) || selectedProduct.stock === 0 || selectedProduct.isAvailable === false}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: orderQty >= (selectedProduct.stock || 1) ? '#f1f5f9' : '#ffffff',
                          color: orderQty >= (selectedProduct.stock || 1) ? '#94a3b8' : '#142019',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: orderQty >= (selectedProduct.stock || 1) ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    {/* Ringkasan Pemesanan & Estimasi Harga */}
                    <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b', marginBottom: '3px' }}>
                        <span>Harga Satuan:</span>
                        <span>{selectedProduct.priceFormatted}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b', marginBottom: '6px' }}>
                        <span>Kuantitas:</span>
                        <span>{orderQty} unit</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#142019' }}>Estimasi Total:</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1b4332' }}>
                          {formatRupiah((selectedProduct.price || 0) * orderQty)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Data Diri Pembeli (Customer Input for Invoice & WhatsApp) */}
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#f8faf8',
                      borderRadius: '12px',
                      border: '1px solid #d8e2da',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.78rem', fontWeight: 700, color: '#1b4332' }}>
                      <User size={14} />
                      <span>Data Diri Pembeli:</span>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        Nama Lengkap:
                      </label>
                      <input
                        type="text"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="Masukkan nama lengkap Anda..."
                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#142019', outline: 'none' }}
                      />
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        Nomor WhatsApp / HP:
                      </label>
                      <input
                        type="text"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#142019', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        Alamat Pengiriman:
                      </label>
                      <textarea
                        rows={2}
                        value={custAddress}
                        onChange={(e) => setCustAddress(e.target.value)}
                        placeholder="Alamat lengkap tujuan pengiriman..."
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#142019', resize: 'none', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Feedback Download Toast */}
                  {invoiceToast && (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        color: '#16a34a',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      className="animate-fade-in"
                    >
                      <CheckCircle2 size={15} />
                      <span>{typeof invoiceToast === 'string' ? invoiceToast.replace(/^[✓✔]\s*/, '') : invoiceToast}</span>
                    </div>
                  )}

                  {/* Action Buttons: Download Draft Invoice & WhatsApp CTA */}
                  {(() => {
                    const isDetailOutOfStock = !selectedProduct.stock || selectedProduct.stock <= 0 || selectedProduct.isAvailable === false;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Tombol 1: Unduh Ringkasan Pemesanan / Draft Invoice (Di Atas) */}
                        <button
                          type="button"
                          disabled={isDetailOutOfStock}
                          onClick={() => !isDetailOutOfStock && handleDownloadDraftInvoice(selectedProduct, orderQty)}
                          style={{
                            width: '100%',
                            padding: '11px 16px',
                            borderRadius: '10px',
                            border: isDetailOutOfStock ? '1px solid #e2e8f0' : '1.5px solid #2d6a4f',
                            backgroundColor: '#ffffff',
                            color: isDetailOutOfStock ? '#94a3b8' : '#2d6a4f',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: isDetailOutOfStock ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.15s',
                            opacity: isDetailOutOfStock ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!isDetailOutOfStock) e.currentTarget.style.backgroundColor = '#f0fdf4';
                          }}
                          onMouseLeave={(e) => {
                            if (!isDetailOutOfStock) e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <Download size={15} />
                          <span>Unduh Draft Invoice (Ringkasan)</span>
                        </button>

                        {/* Tombol 2: Pesan via WhatsApp (Di Bawah) */}
                        <button
                          type="button"
                          disabled={isDetailOutOfStock}
                          onClick={() => !isDetailOutOfStock && handleWhatsAppOrder(selectedProduct, orderQty)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: isDetailOutOfStock ? '1px solid #e2e8f0' : 'none',
                            backgroundColor: isDetailOutOfStock ? '#f1f5f9' : '#2d6a4f',
                            color: isDetailOutOfStock ? '#94a3b8' : '#ffffff',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            cursor: isDetailOutOfStock ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: isDetailOutOfStock ? 'none' : '0 3px 8px rgba(45, 106, 79, 0.25)',
                            transition: 'all 0.2s',
                            opacity: isDetailOutOfStock ? 0.75 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!isDetailOutOfStock) e.currentTarget.style.backgroundColor = '#1b4332';
                          }}
                          onMouseLeave={(e) => {
                            if (!isDetailOutOfStock) e.currentTarget.style.backgroundColor = '#2d6a4f';
                          }}
                          title={isDetailOutOfStock ? 'Produk sedang habis atau tidak tersedia' : 'Pesan via WhatsApp'}
                        >
                          {isDetailOutOfStock ? <XCircle size={16} /> : <MessageSquare size={16} />}
                          <span>{isDetailOutOfStock ? 'Stok Habis - Tidak Dapat Dipesan' : 'Pesan via WhatsApp'}</span>
                        </button>

                        <div style={{ fontSize: '0.72rem', color: isDetailOutOfStock ? '#dc2626' : '#718277', textAlign: 'center', marginTop: '2px', fontWeight: isDetailOutOfStock ? 600 : 400 }}>
                          {isDetailOutOfStock
                            ? 'Mohon maaf, produk ini sedang kosong dan belum dapat dipesan.'
                            : <>WhatsApp Toko: <strong>0812-1614-6510</strong></>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Catatan Toko */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '0.74rem',
                      color: '#475569',
                      lineHeight: '1.45',
                    }}
                  >
                    <Info size={15} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ textAlign: 'justify', textJustify: 'inter-word', width: '100%' }}>
                      <strong>Catatan Toko:</strong> Pemesanan, pembayaran QRIS resmi, dan pengiriman bukti transfer dilakukan melalui WhatsApp. Sales Admin akan mengecek ketersediaan stok di sistem sebelum mengirimkan QRIS pembayaran langsung ke nomor WhatsApp Anda.
                    </span>
                  </div>
            </div>
          </div>
        </main>
      ) : (
        /* 2. PUBLIC CATALOG GRID VIEW */
        <>
          {showPromoBanner && (
            <div
              style={{
                backgroundColor: '#edf7f0',
                borderBottom: '1px solid #d3e7d8',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                fontSize: '0.825rem',
                color: '#1b4332',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span
                  style={{
                    backgroundColor: '#2d6a4f',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isAuthenticated ? '👁️ Mode Staf' : <><Tag size={11} /> 100% Organik & Segar</>}
                </span>
                <span>
                  {isAuthenticated ? (
                    <>
                      Anda sedang melihat <strong>Pratinjau Katalog Publik</strong> sebagai <strong>{user?.name || 'Staf'}</strong> ({role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'STOCK_MANAGER' ? 'Stock Manager' : 'Sales Admin'}).
                    </>
                  ) : (
                    <>
                      Selamat datang di <strong>Katalog UMKM Toko Farm Berkah</strong>. Seluruh produk panen dan olahan pangan sehat siap dipesan via WhatsApp.
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={scrollToProducts}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontWeight: 700,
                    color: '#2d6a4f',
                    textDecoration: 'underline',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    cursor: 'pointer',
                    fontSize: '0.825rem',
                  }}
                >
                  Pesan Sekarang <ArrowRight size={13} />
                </button>
              </div>

              <button
                onClick={handleClosePromoBanner}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.04)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  color: '#48564e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s',
                }}
                title="Tutup pesan pengumuman ini"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)')}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* 3. HEADLINE SECTION */}
          <section
            style={{
              padding: '36px 36px 20px 36px',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#142019',
                marginBottom: '10px',
                lineHeight: 1.2,
              }}
            >
              Katalog Produk
            </h1>

            <p
              style={{
                fontSize: '1rem',
                color: '#48564e',
                lineHeight: 1.6,
                maxWidth: '800px',
                margin: '0 auto 12px auto',
              }}
            >
              Ragam produk olahan hasil panen, camilan sehat, minuman herbal alami, sayuran segar, dan bibit tanaman berkualitas binaan Toko Farm Berkah.
            </p>
          </section>

          {/* 4. FULL-WIDTH HORIZONTAL SCROLLING CATEGORIES & TOOLBAR */}
          <div
            style={{
              width: '100%',
              padding: '0 36px',
              marginBottom: '24px',
            }}
          >
            {/* Horizontal Category Scroll Container with Left/Right Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', position: 'relative' }}>
              {/* Scroll Left Button */}
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
                  zIndex: 2,
                }}
                title="Geser kategori ke kiri"
              >
                <ChevronLeft size={18} />
              </button>

              {/* Scrollable Pills Track */}
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
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
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
                        padding: '9px 18px',
                        borderRadius: '30px',
                        border: isSelected ? '1px solid #1b4332' : '1px solid #d8e2da',
                        backgroundColor: isSelected ? '#1b4332' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#37473d',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 700 : 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 4px 10px rgba(27, 67, 50, 0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <span style={{ color: isSelected ? '#95d5b2' : '#2d6a4f', display: 'flex', alignItems: 'center' }}>
                        {getCategoryIcon(cat.id)}
                      </span>
                      <span style={{ whiteSpace: 'nowrap' }}>{cat.name}</span>
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

              {/* Scroll Right Button */}
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
                  zIndex: 2,
                }}
                title="Geser kategori ke kanan"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Toolbar: Product Counter, Sort by, and Stock Filter */}
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
                boxShadow: 'var(--shadow-sm)',
                width: '100%',
              }}
            >
              {/* 1. Menampilkan Counter */}
              <div style={{ fontSize: '0.85rem', color: '#48564e', fontWeight: 500 }}>
                Menampilkan <strong>{filteredProducts.length}</strong> produk pilihan Toko Farm Berkah
              </div>

              {/* Right Controls Container */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* 2. Urutkan */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#718277', fontWeight: 600 }}>Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: '1px solid #d8e2da',
                      backgroundColor: '#f8faf8',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#142019',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="POPULAR">Paling Populer</option>
                    <option value="RATING">Rating Tertinggi</option>
                    <option value="PRICE_LOW">Harga: Terendah ke Tinggi</option>
                    <option value="PRICE_HIGH">Harga: Tinggi ke Rendah</option>
                  </select>
                </div>

                {/* 3. Ketersediaan */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#718277', fontWeight: 600 }}>Ketersediaan:</span>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: '1px solid #d8e2da',
                      backgroundColor: '#f8faf8',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#142019',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">Semua Kondisi Stok</option>
                    <option value="AVAILABLE">Tersedia Aman</option>
                    <option value="LIMITED">Stok Terbatas / Kritis</option>
                    <option value="OUT">Habis</option>
                  </select>
                </div>
              </div>


            </div>
          </div>

          {/* 5. FULL-WIDTH MAIN PRODUCTS GRID */}
          <main id="katalog-produk" style={{ width: '100%', padding: '0 36px 56px 36px', flex: 1, scrollMarginTop: '90px' }}>
            {/* Reset Search Bar if Active */}
            {searchQuery && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' }}>
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.825rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  ✕ Reset Pencarian "{searchQuery}"
                </button>
              </div>
            )}

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  border: '1px solid #e1e7e2',
                  padding: '60px 24px',
                  textAlign: 'center',
                }}
              >
                <Search size={36} color="#718277" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#142019', marginBottom: '4px' }}>
                  Produk Tidak Ditemukan
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#718277', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                  Tidak ada produk yang sesuai dengan pencarian "{searchQuery}".
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setStockFilter('ALL');
                  }}
                  style={{
                    backgroundColor: '#2d6a4f',
                    color: '#fff',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Tampilkan Semua Produk
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '24px',
                }}
              >
                {filteredProducts.map((p) => {
                  const isOutOfStock = !p.stock || p.stock <= 0 || p.isAvailable === false;
                  const isLowStock = !isOutOfStock && p.stock <= p.minStock;

                  return (
                    <div
                      key={p.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        border: '1px solid #e2e8e3',
                        padding: '0',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 4px rgba(18, 38, 28, 0.04)',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(27, 67, 50, 0.12)';
                        e.currentTarget.style.borderColor = '#b7e4c7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(18, 38, 28, 0.04)';
                        e.currentTarget.style.borderColor = '#e2e8e3';
                      }}
                    >
                      {/* Top Artwork / Real Product Photo Box */}
                      <div
                        style={{
                          height: '190px',
                          position: 'relative',
                          overflow: 'hidden',
                          backgroundColor: '#f1f5f2',
                        }}
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: isOutOfStock ? 'grayscale(80%) opacity(0.85)' : 'none',
                            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isOutOfStock) e.currentTarget.style.transform = 'scale(1.06)';
                          }}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />

                        {/* Subtle dark vignette overlay for badge clarity */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)',
                            pointerEvents: 'none',
                          }}
                        />

                        {/* Top Badges */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            right: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            zIndex: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              backdropFilter: 'blur(4px)',
                              color: p.badgeColor || '#1b4332',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            }}
                          >
                            {p.badge}
                          </span>

                          {/* Stock indicator */}
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: '20px',
                              backdropFilter: 'blur(4px)',
                              backgroundColor: isOutOfStock
                                ? 'rgba(220, 38, 38, 0.92)'
                                : isLowStock
                                  ? 'rgba(217, 119, 6, 0.92)'
                                  : 'rgba(22, 101, 52, 0.92)',
                              color: '#ffffff',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {isOutOfStock ? (
                              <>
                                <XCircle size={12} />
                                <span>{p.isAvailable === false ? 'Tidak Tersedia' : 'Habis'}</span>
                              </>
                            ) : isLowStock ? (
                              <>
                                <AlertTriangle size={12} />
                                <span>Sisa {p.stock}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={12} />
                                <span>Tersedia ({p.stock})</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Bottom SKU tag */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '12px',
                            zIndex: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(15, 23, 42, 0.78)',
                              backdropFilter: 'blur(4px)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              color: '#f8fafc',
                            }}
                          >
                            SKU: {p.id}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          {/* Category & Rating */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2d6a4f' }}>
                              {p.category}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', fontWeight: 700, color: '#142019' }}>
                              <Star size={13} fill="#f59e0b" color="#f59e0b" />
                              <span>{p.rating}</span>
                              <span style={{ fontSize: '0.7rem', color: '#718277', fontWeight: 500 }}>({p.soldCount}+ terjual)</span>
                            </div>
                          </div>

                          {/* Product Name */}
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#142019', marginBottom: '6px', lineHeight: 1.3 }}>
                            {p.name}
                          </h3>

                          <p style={{ fontSize: '0.8rem', color: '#5b6b61', lineHeight: 1.5, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {p.description}
                          </p>
                        </div>

                        {/* Price, Unit & Buttons */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #f0f4f1', paddingTop: '12px', marginBottom: '14px' }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: '#718277', fontWeight: 600, textTransform: 'uppercase' }}>Harga Satuan</div>
                              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1b4332' }}>
                                {p.priceFormatted}
                              </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#718277', fontWeight: 600 }}>
                              {p.unit}
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(p)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#2d6a4f',
                                color: '#ffffff',
                                fontSize: '0.825rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(45, 106, 79, 0.2)',
                                transition: 'all 0.18s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#1b4332';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#2d6a4f';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                              title="Lihat Detail Produk"
                            >
                              <Info size={15} />
                              <span>Lihat Detail</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </>
      )}

      {/* 6. FOOTER WITH 3 AUTHENTIC LOGOS */}
      <footer
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e1e7e2',
          padding: '28px 32px',
          marginTop: 'auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Official 3 Logos Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* 1. Logo Toko Farm Berkah */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src="/images/logo-farm-berkah.jpg"
                alt="Logo Toko Farm Berkah"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid #d8e2da',
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#142019' }}>
                Toko Farm Berkah
              </span>
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8e3' }} />

            {/* 2. Logo Poktan Masnaga */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src="/images/logo-poktan-masnaga.jpg"
                alt="Logo Poktan Masnaga"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid #d8e2da',
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#48564e' }}>
                Poktan Masnaga RW 003
              </span>
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8e3' }} />

            {/* 3. Logo Halal Indonesia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img
                src="/images/logo-halal.jpg"
                alt="Logo Halal Indonesia ID31410026464280825"
                style={{
                  height: '36px',
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1b4332' }}>Halal Indonesia</div>
                <div style={{ fontSize: '0.68rem', color: '#718277', fontFamily: 'monospace' }}>ID31410026464280825</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#718277' }}>
            &copy; 2026 Toko Farm Berkah. Hak Cipta Dilindungi.
          </div>
        </div>
      </footer>
    </div>
  );
}
