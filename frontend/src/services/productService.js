import { INITIAL_PRODUCTS, CATEGORIES } from '../mocks/productsData';
import { delay, request, USE_REAL_BACKEND } from './apiClient';

const STORAGE_PRODUCTS = 'farmsight_products_db_v1';
const STORAGE_CATEGORIES = 'farmsight_categories_db_v1';

function getLocalProducts() {
  const d = localStorage.getItem(STORAGE_PRODUCTS);
  if (!d) {
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  try {
    const parsed = JSON.parse(d);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return parsed;
  } catch (e) {
    localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
}

function saveLocalProducts(products) {
  localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
  window.dispatchEvent(new Event('farmsight_products_updated'));
}

function getLocalCategories() {
  const d = localStorage.getItem(STORAGE_CATEGORIES);
  if (!d) {
    localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(CATEGORIES));
    return CATEGORIES;
  }
  return JSON.parse(d);
}

function saveLocalCategories(cats) {
  localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(cats));
}

export const productService = {
  async getProducts(params = {}) {
    if (USE_REAL_BACKEND) {
      const q = new URLSearchParams(params).toString();
      return request(`/products?${q}`);
    }

    await delay(180);
    let list = getLocalProducts();

    if (params.publicOnly) {
      // Katalog publik hanya menampilkan produk dengan visibilitas 'visible' & aktif
      list = list.filter((p) => p.visibility === 'visible' && p.isActive !== false);
    }
    if (params.category && params.category !== 'all') {
      list = list.filter((p) => p.categorySlug === params.category || p.category === params.category);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.sku.toLowerCase().includes(s) ||
          (p.description && p.description.toLowerCase().includes(s))
      );
    }
    if (params.stockStatus) {
      if (params.stockStatus === 'AVAILABLE') list = list.filter((p) => p.stock > 0);
      if (params.stockStatus === 'LOW') list = list.filter((p) => p.stock > 0 && p.stock <= p.reorderPoint);
      if (params.stockStatus === 'OUT') list = list.filter((p) => p.stock === 0);
    }

    return list;
  },

  async getProductById(id) {
    if (USE_REAL_BACKEND) return request(`/products/${id}`);
    await delay(100);
    const list = getLocalProducts();
    const prod = list.find((p) => p.id === id || p.sku === id);
    if (!prod) throw new Error('Produk tidak ditemukan.');
    return prod;
  },

  async createProduct(data) {
    if (USE_REAL_BACKEND) {
      return request('/products', { method: 'POST', body: JSON.stringify(data) });
    }

    await delay(300);
    const list = getLocalProducts();

    const minStock = Number(data.minStock) || 10;
    const leadTime = Number(data.leadTimeDays) || 3;
    const ss = Number(data.safetyStock) || Math.round(minStock * 0.5);
    const rop = Number(data.reorderPoint) || (Math.round(minStock * 0.8) * leadTime + ss);

    const newProduct = {
      id: `PRD-${String(list.length + 1).padStart(3, '0')}`,
      sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
      name: data.name.trim(),
      category: data.category || 'Camilan & Keripik',
      categorySlug: data.categorySlug || 'camilan',
      price: Number(data.price) || 0,
      unit: data.unit || 'Pcs',
      stock: Number(data.stock) || 0,
      minStock,
      safetyStock: ss,
      reorderPoint: rop,
      leadTimeDays: leadTime,
      visibility: data.visibility || 'visible', // 'visible' | 'hidden'
      isActive: data.isActive !== false,
      description: data.description || '',
      composition: data.composition || '',
      image: data.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      altText: data.altText || `Foto Produk ${data.name}`,
      rating: 5.0,
      soldCount: 0,
      demandPattern: data.demandPattern || 'regular',
    };

    const updated = [newProduct, ...list];
    saveLocalProducts(updated);
    return newProduct;
  },

  async updateProduct(id, data) {
    if (USE_REAL_BACKEND) {
      return request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    await delay(250);
    const list = getLocalProducts();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Produk tidak ditemukan.');

    const updatedProduct = { ...list[idx], ...data };
    list[idx] = updatedProduct;
    saveLocalProducts(list);
    return updatedProduct;
  },

  async toggleVisibility(id) {
    if (USE_REAL_BACKEND) {
      return request(`/products/${id}/toggle-visibility`, { method: 'PATCH' });
    }

    await delay(200);
    const list = getLocalProducts();
    const prod = list.find((p) => p.id === id);
    if (!prod) throw new Error('Produk tidak ditemukan.');

    prod.visibility = prod.visibility === 'visible' ? 'hidden' : 'visible';
    saveLocalProducts(list);
    return prod;
  },

  async updateInventoryParams(id, params) {
    if (USE_REAL_BACKEND) {
      return request(`/products/${id}/inventory-params`, { method: 'PATCH', body: JSON.stringify(params) });
    }

    await delay(200);
    const list = getLocalProducts();
    const prod = list.find((p) => p.id === id);
    if (!prod) throw new Error('Produk tidak ditemukan.');

    if (params.minStock !== undefined) prod.minStock = Number(params.minStock);
    if (params.safetyStock !== undefined) prod.safetyStock = Number(params.safetyStock);
    if (params.reorderPoint !== undefined) prod.reorderPoint = Number(params.reorderPoint);
    if (params.leadTimeDays !== undefined) prod.leadTimeDays = Number(params.leadTimeDays);

    saveLocalProducts(list);
    return prod;
  },

  async getCategories() {
    if (USE_REAL_BACKEND) return request('/categories');
    await delay(100);
    return getLocalCategories();
  },

  async createCategory(cat) {
    if (USE_REAL_BACKEND) return request('/categories', { method: 'POST', body: JSON.stringify(cat) });
    await delay(200);
    const cats = getLocalCategories();
    const newCat = {
      id: `cat-${cats.length + 1}`,
      slug: cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: cat.name,
      description: cat.description || '',
    };
    const updated = [...cats, newCat];
    saveLocalCategories(updated);
    return newCat;
  },

  async deleteCategory(slug) {
    if (USE_REAL_BACKEND) return request(`/categories/${slug}`, { method: 'DELETE' });
    await delay(200);
    const prods = getLocalProducts();
    const isUsed = prods.some((p) => p.categorySlug === slug);
    if (isUsed) {
      throw new Error('Kategori ini masih digunakan oleh produk aktif dan tidak dapat dihapus.');
    }
    const cats = getLocalCategories().filter((c) => c.slug !== slug);
    saveLocalCategories(cats);
    return true;
  },
};

