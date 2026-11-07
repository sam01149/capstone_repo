import React, { useState } from 'react';
import {
  PackageSearch,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  formatRupiah,
  saveStoredProducts,
  toggleProductVisibility,
} from '../data/productsData';

export const CATEGORY_OPTIONS = [
  { slug: 'camilan', name: 'Camilan & Keripik', badge: 'Camilan Sehat', color: '#9a3412', bg: '#ffedd5' },
  { slug: 'olahan', name: 'Olahan Permen & Cokelat', badge: 'Olahan Aloe', color: '#065f46', bg: '#d1fae5' },
  { slug: 'minuman', name: 'Minuman Segar & Teh', badge: 'Segar & Alami', color: '#0369a1', bg: '#e0f2fe' },
  { slug: 'sayur', name: 'Sayuran & Panen Segar', badge: 'Panen Segar', color: '#166534', bg: '#dcfce7' },
  { slug: 'bibit_pupuk', name: 'Bibit & Sarana Tanam', badge: 'Sarana Tani', color: '#1e40af', bg: '#dbeafe' },
];

export default function ManajemenProduk({
  products = [],
  setProducts,
  showToast,
  prodViewMode: externalViewMode,
  setProdViewMode: setExternalViewMode,
}) {
  const [internalViewMode, setInternalViewMode] = useState('list');
  const prodViewMode = externalViewMode !== undefined ? externalViewMode : internalViewMode;
  const setProdViewMode = setExternalViewMode || setInternalViewMode;

  const [prodSearch, setProdSearch] = useState('');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('all');
  const [prodVisibilityFilter, setProdVisibilityFilter] = useState('ALL'); // 'ALL' | 'VISIBLE' | 'HIDDEN'
  const [editingProduct, setEditingProduct] = useState(null);

  const [prodFormData, setProdFormData] = useState({
    id: '',
    name: '',
    categorySlug: 'camilan',
    price: '',
    unit: '',
    stock: '',
    minStock: '',
    image: '',
    description: '',
    composition: '',
    badge: '',
    visibility: 'visible',
  });

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdFormData({
      id: '',
      name: '',
      categorySlug: 'camilan',
      price: '',
      unit: '',
      stock: '',
      minStock: '',
      image: '',
      description: '',
      composition: '',
      badge: '',
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
      unit: p.unit || '',
      stock: p.stock ?? '',
      minStock: p.minStock ?? '',
      image: p.image || '',
      description: p.description || '',
      composition: p.composition || '',
      badge: p.badge || '',
      visibility: p.visibility || (p.isAvailable !== false ? 'visible' : 'hidden'),
    });
    setProdViewMode('form');
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    if (!prodFormData.name.trim() || !prodFormData.price) {
      if (showToast) showToast('Harap lengkapi nama produk dan harga.');
      return;
    }

    const catObj = CATEGORY_OPTIONS.find((c) => c.slug === prodFormData.categorySlug) || CATEGORY_OPTIONS[0];
    const numPrice = Number(prodFormData.price);
    const numStock = Number(prodFormData.stock || 0);
    const numMin = Number(prodFormData.minStock || 10);
    const isVis = prodFormData.visibility === 'visible';
    const finalId = (prodFormData.id && prodFormData.id.trim())
      ? prodFormData.id.trim()
      : (editingProduct ? editingProduct.id : `PROD-${String(products.length + 1).padStart(3, '0')}`);

    const payload = {
      ...prodFormData,
      id: finalId,
      unit: prodFormData.unit?.trim() || 'Pcs',
      badge: prodFormData.badge?.trim() || 'Produk Baru',
      image: prodFormData.image?.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
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
      if (showToast) showToast(`Produk "${payload.name}" berhasil diperbarui! Status visibilitas: ${isVis ? 'Tampil di Publik' : 'Disembunyikan'}. Database diperbarui, proses selesai.`);
    } else {
      updated = [payload, ...products];
      if (showToast) showToast(`Produk baru "${payload.name}" berhasil ditambahkan! Status visibilitas: ${isVis ? 'Tampil di Publik' : 'Disembunyikan'}. Database diperbarui, proses selesai.`);
    }

    if (setProducts) setProducts(updated);
    saveStoredProducts(updated);
    setProdViewMode('list');
  };

  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`Yakin ingin menghapus produk "${name}" dari katalog toko?`)) {
      const updated = products.filter((p) => p.id !== id);
      if (setProducts) setProducts(updated);
      saveStoredProducts(updated);
      if (showToast) showToast(`Produk "${name}" berhasil dihapus dari sistem.`);
    }
  };

  // Ubah Visibilitas Produk (Toggle 1-Klik)
  const handleToggleProductVisibilityDirect = (id) => {
    const updated = toggleProductVisibility(id);
    if (setProducts) setProducts(updated);
    const target = updated.find((p) => p.id === id);
    const isVis = target?.visibility !== 'hidden';
    if (showToast) {
      showToast(
        isVis
          ? `Visibilitas diubah: "${target?.name}" kini DITAMPILKAN di katalog publik. Database diperbarui, proses selesai.`
          : `🚫 Visibilitas diubah: "${target?.name}" kini DISEMBUNYIKAN dari katalog publik. Database diperbarui, proses selesai.`
      );
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];
  const visibleProductsCount = safeProducts.filter((p) => p.visibility !== 'hidden').length;
  const hiddenProductsCount = safeProducts.filter((p) => p.visibility === 'hidden').length;

  const filteredProducts = safeProducts.filter((p) => {
    const q = prodSearch.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    const matchesCat = prodCategoryFilter === 'all' || p.categorySlug === prodCategoryFilter;
    const matchesVis =
      prodVisibilityFilter === 'ALL' ||
      (prodVisibilityFilter === 'VISIBLE' && p.visibility !== 'hidden') ||
      (prodVisibilityFilter === 'HIDDEN' && p.visibility === 'hidden');
    return matchesSearch && matchesCat && matchesVis;
  });

  return (
    <div>
      {prodViewMode === 'form' ? (
        /* FORM TAMBAH / EDIT DATA PRODUK - FULL SCREEN & BALANCED UI */
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', padding: '30px 32px', width: '100%', boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                {editingProduct ? `Edit Data Produk: ${editingProduct.name}` : 'Tambah Produk Baru ke Katalog'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                Perbarui informasi produk dan tentukan visibilitasnya di katalog publik.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProdViewMode('list')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Batal
            </button>
          </div>

          <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* BARIS 1: IDENTITAS PRODUK (3 KOLOM PROPORSIONAL) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.3fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Kode SKU {editingProduct ? '*' : '(Opsional)'}
                </label>
                <input
                  type="text"
                  value={prodFormData.id}
                  onChange={(e) => setProdFormData({ ...prodFormData, id: e.target.value })}
                  disabled={!!editingProduct}
                  placeholder={editingProduct ? 'PROD-xxx' : 'Contoh: PROD-001 (Otomatis bila kosong)'}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  value={prodFormData.name}
                  onChange={(e) => setProdFormData({ ...prodFormData, name: e.target.value })}
                  placeholder="Contoh: Keripik Labu Madu 150g"
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Kategori Produk
                </label>
                <select
                  value={prodFormData.categorySlug}
                  onChange={(e) => setProdFormData({ ...prodFormData, categorySlug: e.target.value })}
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* BARIS 2: KEUANGAN & STOK (4 KOLOM SEIMBANG) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Harga Satuan (Rp) *
                </label>
                <input
                  type="number"
                  required
                  value={prodFormData.price}
                  onChange={(e) => setProdFormData({ ...prodFormData, price: e.target.value })}
                  placeholder="Contoh: 15000"
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Satuan / Unit
                </label>
                <input
                  type="text"
                  value={prodFormData.unit}
                  onChange={(e) => setProdFormData({ ...prodFormData, unit: e.target.value })}
                  placeholder="Contoh: Pcs / Botol / Ikat"
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Stok Awal
                </label>
                <input
                  type="number"
                  value={prodFormData.stock}
                  onChange={(e) => setProdFormData({ ...prodFormData, stock: e.target.value })}
                  placeholder="Contoh: 50"
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Batas Min. Stok (ROP)
                </label>
                <input
                  type="number"
                  value={prodFormData.minStock}
                  onChange={(e) => setProdFormData({ ...prodFormData, minStock: e.target.value })}
                  placeholder="Contoh: 10"
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* BARIS 3: LABEL & URL FOTO (2 KOLOM SEIMBANG) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.3fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Label / Badge
                </label>
                <input
                  type="text"
                  value={prodFormData.badge}
                  onChange={(e) => setProdFormData({ ...prodFormData, badge: e.target.value })}
                  placeholder="Contoh: Produk Baru / Panen Segar"
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  URL Foto Produk
                </label>
                <input
                  type="text"
                  value={prodFormData.image}
                  onChange={(e) => setProdFormData({ ...prodFormData, image: e.target.value })}
                  placeholder="Contoh: https://images.unsplash.com/..."
                  style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* BARIS 4: DESKRIPSI & KOMPOSISI BAHAN BAKU (2 KOLOM SEIMBANG) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Deskripsi Singkat Produk
                </label>
                <textarea
                  rows={3}
                  value={prodFormData.description}
                  onChange={(e) => setProdFormData({ ...prodFormData, description: e.target.value })}
                  placeholder="Jelaskan keunggulan, cita rasa, dan spesifikasi produk ini..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box', lineHeight: 1.5, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Komposisi Bahan Baku
                </label>
                <textarea
                  rows={3}
                  value={prodFormData.composition}
                  onChange={(e) => setProdFormData({ ...prodFormData, composition: e.target.value })}
                  placeholder="Contoh: Rimpang kencur pilihan, beras sangrai, jahe segar, gula kelapa..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box', lineHeight: 1.5, resize: 'vertical' }}
                />
              </div>
            </div>

            {/* BARIS 5: PENGATURAN VISIBILITAS PRODUK */}
            <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>
                Pengaturan Visibilitas Produk di Katalog Publik *
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: prodFormData.visibility === 'visible' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    backgroundColor: prodFormData.visibility === 'visible' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="product-vis-radio"
                    value="visible"
                    checked={prodFormData.visibility === 'visible'}
                    onChange={() => setProdFormData({ ...prodFormData, visibility: 'visible' })}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Eye size={15} />
                      <span>Tampilkan di Katalog Publik</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Dapat dilihat dan dibeli oleh pelanggan di katalog publik
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: prodFormData.visibility === 'hidden' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: prodFormData.visibility === 'hidden' ? '#fef2f2' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="product-vis-radio"
                    value="hidden"
                    checked={prodFormData.visibility === 'hidden'}
                    onChange={() => setProdFormData({ ...prodFormData, visibility: 'hidden' })}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <EyeOff size={15} />
                      <span>Disembunyikan dari Publik</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Diarsipkan / draft (tidak tampil bagi pembeli)
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* BARIS 6: TOMBOL AKSI */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setProdViewMode('list')}
                style={{ padding: '11px 24px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="submit"
                style={{ padding: '11px 32px', borderRadius: '10px', border: 'none', backgroundColor: '#1b4332', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(27,67,50,0.25)' }}
              >
                Simpan Produk
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* TABEL DAFTAR PRODUK (LIST MODE) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Manajemen Produk */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e1e7e2',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#142019', margin: 0 }}>
                Manajemen Katalog Produk
              </h1>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>
                Tambah produk baru, edit data produk, atau ubah visibilitas produk di katalog publik dengan sekali klik.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddProduct}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(27, 67, 50, 0.25)',
              }}
            >
              <Plus size={16} />
              <span>Tambah Produk Baru</span>
            </button>
          </div>

          {/* Toolbar Filter Produk */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e1e7e2',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Cari nama produk atau SKU..."
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px 0 34px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>

              <select
                value={prodCategoryFilter}
                onChange={(e) => setProdCategoryFilter(e.target.value)}
                style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
              >
                <option value="all">Semua Kategori</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>

              <select
                value={prodVisibilityFilter}
                onChange={(e) => setProdVisibilityFilter(e.target.value)}
                style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
              >
                <option value="ALL">Semua Visibilitas</option>
                <option value="VISIBLE">🟢 Tampil di Publik ({visibleProductsCount})</option>
                <option value="HIDDEN">🚫 Disembunyikan ({hiddenProductsCount})</option>
              </select>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Menampilkan <strong>{filteredProducts.length}</strong> produk
            </div>
          </div>

          {/* Tabel Produk */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e1e7e2', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 14px', width: '19%' }}>SKU & Foto</th>
                    <th style={{ padding: '12px 14px', width: '21%' }}>Nama Produk</th>
                    <th style={{ padding: '12px 14px', width: '16%' }}>Kategori</th>
                    <th style={{ padding: '12px 14px', width: '13%' }}>Harga Satuan</th>
                    <th style={{ padding: '12px 14px', width: '11%' }}>Stok Fisik</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '12%' }}>Visibilitas</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: '8%' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isVis = p.visibility !== 'hidden';

                    return (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafcfb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80'}
                              alt={p.name}
                              style={{ width: '36px', height: '36px', borderRadius: '7px', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                            />
                            <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#166534', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.id}>
                              {p.id}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#142019', fontSize: '0.84rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.71rem', color: '#64748b', marginTop: '2px' }}>{p.badge || 'Produk UMKM'}</div>
                        </td>

                        <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>
                          <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '0.76rem' }}>
                            {p.category}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#166534', fontSize: '0.86rem' }}>
                          {p.priceFormatted || formatRupiah(p.price)}
                        </td>

                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: p.stock <= (p.reorderPoint || p.minStock || 10) ? '#dc2626' : '#0f172a' }}>
                              {p.stock}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                              {p.unit}
                            </span>
                          </div>
                        </td>

                        {/* TOMBOL / TOGGLE UBAH VISIBILITAS */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleProductVisibilityDirect(p.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              border: isVis ? '1px solid #86efac' : '1px solid #fecaca',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: isVis ? '#dcfce7' : '#fee2e2',
                              color: isVis ? '#15803d' : '#dc2626',
                              transition: 'all 0.15s ease',
                              boxShadow: isVis ? '0 1px 2px rgba(22, 101, 52, 0.08)' : 'none',
                              whiteSpace: 'nowrap',
                            }}
                            title="Klik langsung untuk mengubah visibilitas produk (Tampilkan / Sembunyikan)"
                          >
                            {isVis ? <Eye size={12} /> : <EyeOff size={12} />}
                            <span>{isVis ? 'Tampil di Publik' : 'Disembunyikan'}</span>
                          </button>
                        </td>

                        {/* AKSI EDIT & HAPUS PRODUK */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              style={{
                                padding: '5px 9px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                              title="Edit rincian data produk"
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              style={{
                                padding: '5px 7px',
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                backgroundColor: '#fff5f5',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Hapus produk dari katalog"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
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
    </div>
  );
}

