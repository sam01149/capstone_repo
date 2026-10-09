import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Package,
  Layers,
  Sparkles,
  X,
  Check,
  Image as ImageIcon,
  ArrowLeft,
  Save,
  Tag,
  Star,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/mockAuth';
import {
  getStoredProducts,
  saveStoredProducts,
  formatRupiah,
} from '../../data/productsData';
import AccessDenied from '../layout/AccessDenied';

const CATEGORY_OPTIONS = [
  { slug: 'camilan', name: 'Camilan & Keripik', badge: 'Camilan Sehat', color: '#9a3412', bg: '#ffedd5' },
  { slug: 'olahan', name: 'Olahan Permen & Cokelat', badge: 'Olahan Aloe', color: '#065f46', bg: '#d1fae5' },
  { slug: 'minuman', name: 'Minuman Segar & Teh', badge: 'Segar & Alami', color: '#0369a1', bg: '#e0f2fe' },
  { slug: 'sayur', name: 'Sayuran & Panen Segar', badge: 'Panen Segar', color: '#166534', bg: '#dcfce7' },
  { slug: 'bibit_pupuk', name: 'Bibit & Sarana Tanam', badge: 'Sarana Tani', color: '#1e40af', bg: '#dbeafe' },
];

export default function ProductManagementView({ onBackToDashboard }) {
  const { isRole } = useAuth();
  const [products, setProducts] = useState(getStoredProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  
  // View mode: 'list' (table) or 'form' (full screen page form)
  const [viewMode, setViewMode] = useState('list');
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State
  const initialFormData = {
    id: '',
    name: '',
    categorySlug: 'camilan',
    price: '',
    unit: 'Pcs',
    stock: 20,
    minStock: 10,
    safetyStock: 8,
    reorderPoint: 18,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    description: '',
    composition: '',
    shelfLife: '3 Bulan',
    badge: 'Produk Baru',
  };

  const [formData, setFormData] = useState(initialFormData);

  // Sync products on event
  useEffect(() => {
    const handleUpdate = () => {
      setProducts(getStoredProducts());
    };
    window.addEventListener('farmsight_products_updated', handleUpdate);
    return () => window.removeEventListener('farmsight_products_updated', handleUpdate);
  }, []);

  // Show Toast helper
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Strictly Super Admin only
  if (!isRole(ROLES.SUPER_ADMIN)) {
    return (
      <AccessDenied
        featureName="Manajemen Master Produk (Eksklusif Super Admin)"
        onBackToDashboard={onBackToDashboard}
      />
    );
  }

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.categorySlug === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Open Add Page (Full Screen)
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      ...initialFormData,
      id: `PROD-${String(products.length + 1).padStart(3, '0')}`,
    });
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Edit Page (Full Screen)
  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      id: p.id,
      name: p.name,
      categorySlug: p.categorySlug || 'camilan',
      price: p.price,
      unit: p.unit || 'Pcs',
      stock: p.stock || 0,
      minStock: p.minStock || 10,
      safetyStock: p.safetyStock || Math.round((p.minStock || 10) * 0.8),
      reorderPoint: p.reorderPoint || Math.round((p.minStock || 10) * 1.5),
      image: p.image || '',
      description: p.description || '',
      composition: p.composition || '',
      shelfLife: p.shelfLife || '3 Bulan',
      badge: p.badge || 'Unggulan',
    });
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Form Submit
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.id.trim()) {
      showToast('Harap lengkapi SKU, nama produk, dan harga.');
      return;
    }

    const catObj = CATEGORY_OPTIONS.find((c) => c.slug === formData.categorySlug) || CATEGORY_OPTIONS[0];

    if (editingProduct) {
      // Update existing
      const updatedList = products.map((item) => {
        if (item.id === editingProduct.id) {
          return {
            ...item,
            id: formData.id.trim(),
            name: formData.name.trim().toUpperCase(),
            category: catObj.name,
            categorySlug: catObj.slug,
            price: Number(formData.price),
            priceFormatted: formatRupiah(formData.price),
            unit: formData.unit.trim(),
            stock: Number(formData.stock),
            minStock: Number(formData.minStock),
            safetyStock: Number(formData.safetyStock),
            reorderPoint: Number(formData.reorderPoint),
            image: formData.image.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
            description: formData.description.trim() || 'Produk olahan pangan dan hasil panen berkualitas Toko Farm Berkah.',
            composition: formData.composition.trim() || 'Bahan Alami Pilihan Berkualitas.',
            shelfLife: formData.shelfLife.trim(),
            badge: formData.badge.trim() || catObj.badge,
            badgeColor: catObj.color,
            badgeBg: catObj.bg,
          };
        }
        return item;
      });

      saveStoredProducts(updatedList);
      setProducts(updatedList);
      setViewMode('list');
      showToast(`Produk "${formData.name}" berhasil diperbarui.`);
    } else {
      // Create new
      const isDuplicate = products.some((p) => p.id.toLowerCase() === formData.id.trim().toLowerCase());
      if (isDuplicate) {
        showToast(`SKU "${formData.id}" sudah digunakan. Gunakan SKU lain.`);
        return;
      }

      const newProd = {
        id: formData.id.trim().toUpperCase(),
        name: formData.name.trim().toUpperCase(),
        category: catObj.name,
        categorySlug: catObj.slug,
        price: Number(formData.price),
        priceFormatted: formatRupiah(formData.price),
        unit: formData.unit.trim(),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        safetyStock: Number(formData.safetyStock),
        reorderPoint: Number(formData.reorderPoint),
        rating: 5.0,
        soldCount: 0,
        badge: formData.badge.trim() || catObj.badge,
        badgeColor: catObj.color,
        badgeBg: catObj.bg,
        image: formData.image.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
        description: formData.description.trim() || 'Produk olahan pangan dan hasil panen berkualitas Toko Farm Berkah.',
        composition: formData.composition.trim() || 'Bahan Alami Pilihan Berkualitas.',
        shelfLife: formData.shelfLife.trim() || '3 Bulan',
        isAvailable: true,
      };

      const updatedList = [newProd, ...products];
      saveStoredProducts(updatedList);
      setProducts(updatedList);
      setViewMode('list');
      showToast(`Produk baru "${newProd.name}" berhasil ditambahkan ke katalog publik & sistem staf.`);
    }
  };

  // Toggle Availability (Aktif / Nonaktif)
  const handleToggleStatus = (prodId) => {
    const updated = products.map((p) => {
      if (p.id === prodId) {
        const nextStatus = p.isAvailable === false ? true : false;
        return { ...p, isAvailable: nextStatus };
      }
      return p;
    });
    saveStoredProducts(updated);
    setProducts(updated);
    showToast('Status ketersediaan produk diperbarui.');
  };

  // Delete Product
  const handleDelete = (prodId) => {
    const updated = products.filter((p) => p.id !== prodId);
    saveStoredProducts(updated);
    setProducts(updated);
    setDeleteConfirmId(null);
    showToast('Produk telah dihapus dari katalog publik dan sistem.');
  };

  // Render Full Screen / Full Page Form Mode
  if (viewMode === 'form') {
    const currentCatObj = CATEGORY_OPTIONS.find((c) => c.slug === formData.categorySlug) || CATEGORY_OPTIONS[0];

    return (
      <div style={{ padding: '24px 36px 60px 36px' }} className="animate-fade-in">
        {/* Top Header Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            borderBottom: '1px solid #e1e7e2',
            paddingBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #d8e2da',
                backgroundColor: '#ffffff',
                color: '#1b4332',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Daftar Produk</span>
            </button>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                {editingProduct ? `Ubah Produk: ${editingProduct.name}` : 'Tambah Produk Baru ke Katalog'}
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#667085', margin: '2px 0 0 0' }}>
                Formulir lengkap master produk, parameter persediaan, dan sinkronisasi ke etalase publik Toko Farm Berkah.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #d8e2da',
                backgroundColor: '#ffffff',
                color: '#48564e',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmitForm}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2d6a4f',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(45, 106, 79, 0.25)',
              }}
            >
              <Save size={16} />
              <span>{editingProduct ? 'Simpan Perubahan' : 'Simpan & Publikasikan Produk'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Full Screen Grid Layout */}
        <form onSubmit={handleSubmitForm} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '28px', alignItems: 'start' }}>
          {/* Left Column: Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Section 1: Informasi Dasar */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#142019', marginBottom: '16px', borderBottom: '1px solid #f0f4f1', paddingBottom: '10px' }}>
                1. Informasi Dasar Produk
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                      SKU / ID Produk *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                      placeholder="Contoh: KERIPIK-PISANG"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#718277', marginTop: '2px', display: 'block' }}>Kode unik produk untuk inventaris</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                      Nama Produk Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: KERIPIK PISANG ANEKA RASA 150G"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                      Kategori Produk *
                    </label>
                    <select
                      value={formData.categorySlug}
                      onChange={(e) => setFormData({ ...formData, categorySlug: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.85rem', backgroundColor: '#fff' }}
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                      Label Badge Produk
                    </label>
                    <input
                      type="text"
                      value={formData.badge}
                      onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                      placeholder="Contoh: Best Seller / Segar & Murah"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                    Deskripsi Lengkap Produk
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Jelaskan keunggulan rasa, manfaat kesehatan, kemasan, atau saran penyajian..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                      Komposisi Bahan Baku
                    </label>
                    <input
                      type="text"
                      value={formData.composition}
                      onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                      placeholder="Contoh: Labu Madu Panen Segar, Minyak Nabati, Gula Alami, Garam."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                      Masa Simpan (Shelf Life)
                    </label>
                    <input
                      type="text"
                      value={formData.shelfLife}
                      onChange={(e) => setFormData({ ...formData, shelfLife: e.target.value })}
                      placeholder="Contoh: 6 Bulan / 3 Hari"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Harga & Satuan */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#142019', marginBottom: '16px', borderBottom: '1px solid #f0f4f1', paddingBottom: '10px' }}>
                2. Harga Jual & Kemasan
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                    Harga Jual Satuan (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Contoh: 18000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.95rem', fontWeight: 700, color: '#1b4332' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#2d6a4f', marginTop: '3px', display: 'block', fontWeight: 600 }}>
                    Format: {formData.price ? formatRupiah(formData.price) : 'Rp 0'}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#142019', marginBottom: '6px' }}>
                    Satuan Kemasan / Ukuran *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Contoh: 150 GR / 1 IKAT / Botol / Pcs"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d8e2da', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Parameter Persediaan & Pengadaan (FR-PC6 s/d PC10) */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f0f4f1', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  3. Parameter Persediaan & Pengadaan Stok
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#2d6a4f', fontWeight: 700, backgroundColor: '#edf7f0', padding: '2px 8px', borderRadius: '4px' }}>
                  FR-PC6 s/d PC10
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ backgroundColor: '#f8faf8', padding: '12px', borderRadius: '8px', border: '1px solid #e1e7e2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#142019', marginBottom: '4px' }}>
                    Stok Fisik Awal
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8e2da', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#718277', marginTop: '2px', display: 'block' }}>Saldo di gudang</span>
                </div>

                <div style={{ backgroundColor: '#f8faf8', padding: '12px', borderRadius: '8px', border: '1px solid #e1e7e2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#142019', marginBottom: '4px' }}>
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8e2da', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#718277', marginTop: '2px', display: 'block' }}>Batas stok minimal</span>
                </div>

                <div style={{ backgroundColor: '#f8faf8', padding: '12px', borderRadius: '8px', border: '1px solid #e1e7e2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#142019', marginBottom: '4px' }}>
                    Safety Stock (SS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.safetyStock}
                    onChange={(e) => setFormData({ ...formData, safetyStock: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8e2da', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#718277', marginTop: '2px', display: 'block' }}>Cadangan pengaman</span>
                </div>

                <div style={{ backgroundColor: '#f8faf8', padding: '12px', borderRadius: '8px', border: '1px solid #e1e7e2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#142019', marginBottom: '4px' }}>
                    Reorder Point (ROP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8e2da', fontSize: '0.85rem', fontWeight: 700, color: '#d97706' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#718277', marginTop: '2px', display: 'block' }}>Titik picu restock</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Card Preview & Media URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Foto URL Input Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#142019', marginBottom: '12px' }}>
                Foto & Visual Produk
              </h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#142019', marginBottom: '4px' }}>
                  URL Foto Produk *
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8e2da', fontSize: '0.8rem' }}
                />
              </div>

              {/* Photo Preview Container */}
              <div
                style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: '#f1f5f2',
                  border: '1px solid #d8e2da',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt="Pratinjau"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#718277' }}>
                    <ImageIcon size={32} style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.75rem' }}>Pratinjau Foto Produk</div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Card Preview as in Public Catalog */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e1e7e2', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                  Pratinjau Katalog Publik (Live Preview)
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>● Sinkronisasi Aktif</span>
              </div>

              {/* Simulated Public Catalog Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e1e7e2',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ position: 'relative', height: '160px', backgroundColor: '#f1f5f2' }}>
                  <img
                    src={formData.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      backgroundColor: currentCatObj.bg,
                      color: currentCatObj.color,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {formData.badge || currentCatObj.badge}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      color: '#166534',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    Tersedia ({formData.stock || 0})
                  </span>
                </div>

                <div style={{ padding: '14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#718277', fontWeight: 600 }}>
                    {currentCatObj.name} &bull; ★ 5.0
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#142019', margin: '4px 0 8px 0', lineHeight: 1.3 }}>
                    {formData.name || 'NAMA PRODUK'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#718277' }}>Harga Satuan</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1b4332' }}>
                        {formData.price ? formatRupiah(formData.price) : 'Rp 0'}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#48564e', fontWeight: 600 }}>
                      /{formData.unit || 'Pcs'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSubmitForm}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2d6a4f',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(45, 106, 79, 0.25)',
                }}
              >
                <Save size={18} />
                <span>{editingProduct ? 'Simpan Perubahan' : 'Simpan Produk Baru'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #d8e2da',
                  backgroundColor: '#ffffff',
                  color: '#48564e',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // Render Table Master List Mode
  return (
    <div style={{ padding: '24px 32px' }} className="animate-fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1b4332',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            fontSize: '0.85rem',
            fontWeight: 600,
            zIndex: 9999,
          }}
          className="animate-slide-down"
        >
          {toastMsg}
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#142019', margin: 0 }}>
              Manajemen Master Produk
            </h1>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: '#d8f3dc',
                color: '#1b4332',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #74c69d',
              }}
            >
              Super Admin
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#667085', margin: 0 }}>
            Kelola {products.length} produk katalog publik, harga jual satuan, stok fisik, dan batas persediaan UMKM Toko Farm Berkah.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#2d6a4f',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(45, 106, 79, 0.2)',
            transition: 'all 0.15s',
          }}
        >
          <Plus size={16} />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Toolbar: Search & Category Filter */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e1e7e2',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={15} color="#718277" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari nama produk, SKU, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '20px',
              border: '1px solid #d8e2da',
              backgroundColor: '#f8faf8',
              fontSize: '0.825rem',
              color: '#142019',
              outline: 'none',
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: selectedCategory === 'all' ? '1px solid #1b4332' : '1px solid #d8e2da',
              backgroundColor: selectedCategory === 'all' ? '#1b4332' : '#ffffff',
              color: selectedCategory === 'all' ? '#ffffff' : '#48564e',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Semua ({products.length})
          </button>
          {CATEGORY_OPTIONS.map((c) => {
            const isSelected = selectedCategory === c.slug;
            const count = products.filter((p) => p.categorySlug === c.slug).length;
            return (
              <button
                key={c.slug}
                onClick={() => setSelectedCategory(c.slug)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: isSelected ? '1px solid #1b4332' : '1px solid #d8e2da',
                  backgroundColor: isSelected ? '#1b4332' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#48564e',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Master Products Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e1e7e2',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8faf8', borderBottom: '1px solid #e1e7e2', color: '#718277', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Produk</th>
                <th style={{ padding: '12px 14px' }}>Kategori</th>
                <th style={{ padding: '12px 14px' }}>Harga Satuan</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Stok Fisik</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Min / ROP</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi (Super Admin)</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#718277' }}>
                    Tidak ada produk yang cocok dengan pencarian "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0f4f1' }}>
                    {/* Image & Product Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid #d8e2da',
                            backgroundColor: '#f1f5f2',
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: '#142019', fontSize: '0.85rem' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#718277' }}>
                            SKU: <strong>{p.id}</strong> &bull; Kemasan: {p.unit}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '12px 14px', color: '#48564e' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: '#f0fdf4',
                          color: '#166534',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {p.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#142019' }}>
                      {p.priceFormatted || formatRupiah(p.price)}
                    </td>

                    {/* Stock */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: p.stock === 0 ? '#dc2626' : '#142019' }}>
                      {p.stock} {p.unit}
                    </td>

                    {/* Min & ROP */}
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#667085', fontSize: '0.75rem' }}>
                      Min: {p.minStock || 10} &bull; ROP: {p.reorderPoint || 18}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      {p.isAvailable === false ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626' }}>
                          Nonaktif
                        </span>
                      ) : p.stock === 0 ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626' }}>
                          Habis
                        </span>
                      ) : p.stock <= (p.minStock || 10) ? (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#b45309' }}>
                          Menipis
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eefbf3', color: '#16a34a' }}>
                          Tersedia
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(p)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #d8e2da',
                            backgroundColor: '#ffffff',
                            color: '#1b4332',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Ubah data produk"
                        >
                          <Edit3 size={13} />
                          <span>Ubah</span>
                        </button>

                        {/* Toggle Status */}
                        <button
                          onClick={() => handleToggleStatus(p.id)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e1e7e2',
                            backgroundColor: p.isAvailable === false ? '#f0fdf4' : '#fef2f2',
                            color: p.isAvailable === false ? '#16a34a' : '#dc2626',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                          title={p.isAvailable === false ? 'Aktifkan Produk di Katalog' : 'Nonaktifkan Produk'}
                        >
                          {p.isAvailable === false ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                          title="Hapus Produk"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', marginBottom: '8px' }}>
              Hapus Produk dari Sistem?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#48564e', lineHeight: 1.5, marginBottom: '20px' }}>
              Produk dengan SKU <strong>{deleteConfirmId}</strong> akan dihapus permanen dari etalase katalog publik dan basis data operasional.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d8e2da',
                  backgroundColor: '#ffffff',
                  color: '#48564e',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Ya, Hapus Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
