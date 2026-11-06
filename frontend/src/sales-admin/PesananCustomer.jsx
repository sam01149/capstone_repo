// Modal-modal proses pesanan Sales Admin (mengikuti flowchart Sales Admin)
// 1. Input Pesanan Baru / Create Order  -> Gateway "Apakah stok mencukupi?"
// 2. Kirim QR Code pembayaran ke WhatsApp customer
// 3. Catat bukti transfer yang dikirim customer via WhatsApp
// 4. Verifikasi nominal -> Konfirmasi Pembayaran (Confirm Order) / Minta Transfer Ulang
import React, { useMemo, useState } from 'react';
import {
  PackageCheck, PackageX, QrCode, MessageSquare, Copy, Download, Upload,
  CheckCircle2, AlertTriangle, Receipt, Phone, MapPin, User, ShoppingBag, XCircle,
  Plus, Minus, Check, Eye, Clock, ShieldCheck, CheckCheck, X,
} from 'lucide-react';
import { Modal, FlowSteps } from '../shared/StaffUI';
import { formatRupiah, getStoredProducts, cleanUnit, formatQtyUnit } from '../data/productsData';
import {
  createSalesOrder,
  cancelSalesOrder,
  getReservedQty,
  generateCustomerQrisWhatsAppUrl,
  generateReTransferWhatsAppUrl,
  generateStockCancelledWhatsAppUrl,
  markQrisSent,
  submitTransferProof,
  verifyAndConfirmPayment,
} from '../data/ordersAndInventoryData';

// ---------- Label & warna status pesanan ----------
export const ORDER_STATUS = {
  MENUNGGU_PEMBAYARAN: { label: 'Menunggu Pembayaran', badge: 'badge-yellow' },
  SUDAH_BAYAR: { label: 'Sudah Bayar · Perlu Dicek', badge: 'badge-blue' },
  PERLU_TRANSFER_ULANG: { label: 'Minta Transfer Ulang', badge: 'badge-red' },
  SELESAI: { label: 'Lunas · Selesai', badge: 'badge-green' },
  DIBATALKAN: { label: 'Dibatalkan', badge: 'badge-gray' },
};

export const ORDER_STEPS = ['Pesanan Diinput', 'Stok Direservasi', 'QRIS Dikirim', 'Bukti Diterima', 'Pembayaran Dikonfirmasi'];

export function getOrderStep(o) {
  if (o.status === 'SELESAI') return 5;
  if (o.status === 'SUDAH_BAYAR') return 4;
  if (o.status === 'PERLU_TRANSFER_ULANG') return 3;
  if (o.qrisSent) return 3;
  if (o.status === 'MENUNGGU_PEMBAYARAN') return 2;
  return 0;
}

// Salin gambar QRIS ke clipboard agar bisa langsung Ctrl+V di WhatsApp
export async function copyQrisImage() {
  try {
    const res = await fetch('/images/qris-farm-berkah.jpg');
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext('2d').drawImage(bmp, 0, 0);
    const png = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (png && navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': png })]);
      return true;
    }
  } catch (err) {
    console.warn('Gagal menyalin gambar QRIS', err);
  }
  return false;
}

// =============================================================
// =============================================================
// 1. FORM INPUT PESANAN BARU / VALIDASI STOK
// =============================================================
export function FormInputPesanan({ draft, onClose, onCreated, onToast }) {
  const products = useMemo(() => getStoredProducts(), []);
  const [name, setName] = useState(draft?.customerName || '');
  const [phone, setPhone] = useState(draft?.customerPhone || '');
  const [address, setAddress] = useState(draft?.customerAddress || '');
  const [productId, setProductId] = useState(draft?.productId || '');
  const [qty, setQty] = useState(draft?.quantity || 1);
  const [result, setResult] = useState(null); // hasil gateway stok

  const product = products.find((p) => p.id === productId);
  const reserved = product ? getReservedQty(product.id) : 0;
  const available = product ? Math.max(0, (product.stock || 0) - reserved) : 0;
  const total = (product?.price || 0) * (Number(qty) || 0);

  const isOutOfStock = Boolean(product && (Number(qty) > available || product.isAvailable === false));

  // Aksi jika stok tidak tersedia: Batalkan pesanan & kirim info via WhatsApp ke customer
  const handleCancelAndSendWhatsApp = () => {
    if (!name.trim() || !phone.trim() || !productId) {
      onToast('Lengkapi nama, nomor WhatsApp, dan produk terlebih dahulu.', 'error');
      return;
    }
    const res = createSalesOrder({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerAddress: address.trim() || '-',
      productId,
      quantity: Number(qty) || 1,
      draftInvoiceNo: draft?.invoiceNo,
    });
    
    const waUrl = generateStockCancelledWhatsAppUrl(res.order, available);
    window.open(waUrl, '_blank');
    onToast(`Pesanan ${res.order.id} dibatalkan & info pembatalan stok dikirim ke WhatsApp ${name}.`, 'error');
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim() || !productId || Number(qty) < 1) {
      onToast('Lengkapi nama, nomor WhatsApp, produk, dan jumlah pesanan.', 'error');
      return;
    }
    const res = createSalesOrder({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerAddress: address.trim() || '-',
      productId,
      quantity: Number(qty),
      draftInvoiceNo: draft?.invoiceNo,
    });
    
    if (res.isInsufficientStock) {
      setResult(res);
      const waUrl = generateStockCancelledWhatsAppUrl(res.order, res.currentStock);
      window.open(waUrl, '_blank');
      onToast(`Stok tidak mencukupi. Pesanan ${res.order.id} dibatalkan & pesan pembatalan dikirim ke WhatsApp.`, 'error');
      return;
    }

    onToast(`Pesanan ${res.order.id} berhasil disimpan di Manajemen Pesanan.`, 'success');
    onCreated?.(res.order);
    onClose();
  };

  // ---- Hasil Gateway: STOK TIDAK MENCUKUPI ----
  if (result && result.isInsufficientStock) {
    const cancelWaUrl = generateStockCancelledWhatsAppUrl(result.order, result.currentStock);
    return (
      <Modal
        size="lg"
        title="Pesanan Dibatalkan: Stok Tidak Mencukupi"
        subtitle={`No. Pesanan: ${result.order.id}`}
        onClose={onClose}
        footer={
          <>
            <a
              className="btn btn-wa"
              href={cancelWaUrl}
              target="_blank"
              rel="noreferrer"
              style={{ backgroundColor: '#25d366', color: '#ffffff', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px' }}
            >
              <MessageSquare size={16} /> Kirim Info Pembatalan via WhatsApp
            </a>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Tutup
            </button>
          </>
        }
      >
        <div className="callout callout-red" style={{ padding: '18px 20px', borderRadius: '12px' }}>
          <PackageX size={24} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: '0.96rem', color: '#991b1b', display: 'block', marginBottom: '4px' }}>
              Pemberitahuan Ketersediaan Stok Tidak Mencukupi
            </strong>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#450a0a', lineHeight: 1.6 }}>
              Stok produk <strong>{result.order.productName}</strong> yang siap dijual saat ini hanya tersisa <strong>{result.currentStock}</strong>, sedangkan pesanan meminta <strong>{result.order.quantity}</strong>.
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#7f1d1d' }}>
              Pesanan otomatis dibatalkan di sistem. Silakan klik tombol hijau di bawah untuk langsung mengabari pelanggan melalui WhatsApp.
            </p>
          </div>
        </div>
        <FlowSteps steps={['Pesanan Diinput', 'Validasi Stok', 'Pesanan Dibatalkan']} current={2} />
      </Modal>
    );
  }

  // ---- Form input pesanan (Full Layar & Tampilan Rapi Seimbang 2 Kolom) ----
  return (
    <Modal
      size="fullscreen"
      title="Input Pesanan Baru (Validasi Stok)"
      subtitle={draft ? `Rincian otomatis dari pesan WhatsApp ${draft.customerName} · ${draft.invoiceNo}` : 'Input data pesanan pelanggan untuk validasi ketersediaan stok'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Batal
          </button>
          {isOutOfStock ? (
            <button
              type="button"
              onClick={handleCancelAndSendWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              }}
            >
              <MessageSquare size={16} />
              <span>Batalkan Pesanan & Kirim Info ke WhatsApp</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(27, 67, 50, 0.25)',
              }}
            >
              <PackageCheck size={16} />
              <span>Simpan Pesanan</span>
            </button>
          )}
        </>
      }
    >
      {draft && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <MessageSquare size={18} color="#1d4ed8" />
          <div style={{ fontSize: '0.82rem', color: '#1e40af' }}>
            Data diisi otomatis dari pesan WhatsApp draft <strong>{draft.invoiceNo}</strong>. Periksa dan sesuaikan ketersediaan stok di bawah.
          </div>
        </div>
      )}

      {/* Grid 2 Kolom Seimbang: Kiri (Data Pelanggan) | Kanan (Produk & Validasi Stok) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', alignItems: 'start' }}>
        
        {/* KOLOM KIRI: Data Pelanggan */}
        <div style={{ backgroundColor: '#f8faf9', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8e3', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #edf2ee', paddingBottom: '10px' }}>
            <User size={17} color="#1b4332" />
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#142019' }}>
              Data Diri Pelanggan
            </h3>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Nama Lengkap Pelanggan *
            </label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Ibu Dewi / Bpk. Tri"
              style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Nomor WhatsApp Pelanggan *
            </label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Nomor ini digunakan untuk mengirim QRIS dan pemberitahuan pesanan.
            </span>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Alamat Lengkap Pengiriman
            </label>
            <textarea
              className="textarea"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan..."
              style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        {/* KOLOM KANAN: Produk & Validasi Stok Real-Time */}
        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8e3', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #edf2ee', paddingBottom: '10px' }}>
            <ShoppingBag size={17} color="#1b4332" />
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#142019' }}>
              Produk & Jumlah Pesanan
            </h3>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Pilih Produk Toko *
            </label>
            <select
              className="select"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              style={{ borderRadius: '8px', fontWeight: 600 }}
            >
              <option value="">— Pilih Produk Toko Farm Berkah —</option>
              {products.map((p) => {
                const pReserved = getReservedQty(p.id);
                const pAvail = Math.max(0, (p.stock || 0) - pReserved);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.priceFormatted} (Sisa Stok: {pAvail})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Jumlah Pesanan *
            </label>
            <input
              className="input"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{ borderRadius: '8px', fontWeight: 700, fontSize: '1rem' }}
            />
          </div>

          {/* Statistik Ketersediaan Stok & Total Tagihan (Hanya Angka Murni, Bersih Tanpa Satuan Dobel) */}
          {product && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <div
                style={{
                  backgroundColor: available < Number(qty) ? '#fef2f2' : '#f0fdf4',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `1.5px solid ${available < Number(qty) ? '#fecaca' : '#86efac'}`,
                }}
              >
                <div style={{ fontSize: '0.75rem', color: available < Number(qty) ? '#dc2626' : '#15803d', fontWeight: 700 }}>
                  Sisa Stok Siap Dijual
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: available < Number(qty) ? '#dc2626' : '#15803d', marginTop: '2px' }}>
                  {available}
                </div>
                {reserved > 0 ? (
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                    Total stok toko: {product.stock} · Direservasi: {reserved}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: '3px' }}>
                    Stok lengkap & tersedia di toko
                  </div>
                )}
              </div>

              <div
                style={{
                  backgroundColor: '#f8faf9',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8e3',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                  Total Tagihan
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1b4332', marginTop: '2px' }}>
                  {formatRupiah(total)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                  {qty || 0} × {formatRupiah(product.price)}
                </div>
              </div>
            </div>
          )}

          {/* Kotak Validasi Stok Real-Time */}
          {isOutOfStock ? (
            <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #f87171', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <XCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#991b1b', display: 'block', marginBottom: '2px' }}>
                  Stok Toko Tidak Mencukupi!
                </strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.5 }}>
                  Jumlah yang diminta (<strong>{qty}</strong>) melebihi stok yang siap dijual (<strong>{available}</strong>). Silakan klik tombol <strong>"Batalkan Pesanan & Kirim Info ke WhatsApp"</strong> di bawah untuk mengabari pelanggan langsung via WA.
                </p>
              </div>
            </div>
          ) : product ? (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#15803d" />
              <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 700 }}>
                Stok toko aman & mencukupi.
              </span>
            </div>
          ) : null}

        </div>
      </div>
    </Modal>
  );
}

// =============================================================
// 2. KIRIM QR CODE PEMBAYARAN KE WHATSAPP CUSTOMER
// =============================================================
export function ModalKirimQris({ order, onClose, onToast, justCreated }) {
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    const ok = await copyQrisImage();
    window.open(generateCustomerQrisWhatsAppUrl(order), '_blank');
    markQrisSent(order.id);
    onToast(
      ok
        ? `QRIS ${formatRupiah(order.totalAmount)} dikirim ke WhatsApp ${order.customerName}. Gambar QRIS sudah tersalin, tekan Ctrl+V di chat WhatsApp.`
        : `QRIS ${formatRupiah(order.totalAmount)} dikirim ke WhatsApp ${order.customerName}. Status: Menunggu Pembayaran.`
    );
    onClose();
  };

  const handleCopy = async () => {
    const ok = await copyQrisImage();
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      title={justCreated ? 'Stok Tersedia & Direservasi ✓' : 'Kirim QR Code Pembayaran'}
      subtitle={`${order.id} · ${order.customerName}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Nanti Saja</button>
          <button type="button" className="btn btn-wa" onClick={handleSend}>
            <MessageSquare size={16} /> Kirim QRIS ke WhatsApp Customer
          </button>
        </>
      }
    >
      {justCreated && (
        <div className="callout callout-green">
          <CheckCircle2 size={18} />
          <div>Stok <b>{order.productName}</b> sebanyak <b>{order.quantity}</b> sudah direservasi untuk pesanan ini. Langkah berikutnya: kirim QR Code pembayaran.</div>
        </div>
      )}
      <FlowSteps steps={ORDER_STEPS} current={2} />

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, alignItems: 'center' }}>
        <img src="/images/qris-farm-berkah.jpg" alt="QRIS Toko Farm Berkah" style={{ width: '100%', borderRadius: 12, border: '1px solid #d1fae5' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="text-sm text-muted">Total yang harus dibayar</div>
          <div className="fw-800 mono" style={{ fontSize: '1.7rem', color: 'var(--primary-800)' }}>{formatRupiah(order.totalAmount)}</div>
          <div className="text-sm">{order.productName} × {order.quantity}</div>
          <div className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone size={14} /> {order.customerPhone}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              <Copy size={13} /> {copied ? 'Tersalin ✓' : 'Salin Gambar QRIS'}
            </button>
            <a className="btn btn-outline btn-sm" href="/images/qris-farm-berkah.jpg" download="qris-toko-farm-berkah.jpg">
              <Download size={13} /> Unduh
            </a>
          </div>
        </div>
      </div>

      <div className="callout callout-blue">
        <QrCode size={18} />
        <div>
          Pesan WhatsApp berisi rincian tagihan, nominal yang harus ditransfer, dan gambar QRIS resmi. Setelah dikirim, status pesanan menjadi
          <b> Menunggu Pembayaran</b> sampai customer mengirim bukti transfer.
        </div>
      </div>
    </Modal>
  );
}

// =============================================================
// 3. CATAT BUKTI TRANSFER DARI WHATSAPP CUSTOMER (MANUAL UPLOAD)
// =============================================================
export function ModalCatatBukti({ order, onClose, onToast }) {
  const [uploaded, setUploaded] = useState(null);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploaded(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!uploaded) {
      onToast('Pilih dan unggah foto bukti transfer terlebih dahulu.', 'error');
      return;
    }
    submitTransferProof(order.id, uploaded, order.totalAmount, 'QRIS Toko Farm Berkah', 'Diterima via WhatsApp');
    onToast(`Bukti transfer pesanan ${order.id} berhasil disimpan.`);
    onClose();
  };

  return (
    <Modal
      size="lg"
      title="Catat Bukti Transfer dari WhatsApp"
      subtitle={`${order.id} · ${order.customerName} · Total Tagihan: ${formatRupiah(order.totalAmount)}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              backgroundColor: '#1b4332',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            <Receipt size={16} />
            <span>Simpan Bukti Transfer</span>
          </button>
        </>
      }
    >
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <MessageSquare size={18} color="#1d4ed8" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.82rem', color: '#1e40af' }}>
          Customer mengirim foto struk transfer lewat WhatsApp. Unggah foto bukti transfer tersebut di bawah ini lalu klik <strong>Simpan</strong>.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Kotak Upload Foto Bukti */}
          <div className="field" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Unggah Foto Bukti Transfer (Screenshot WhatsApp) *
            </label>
            <label
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: uploaded ? '#f0fdf4' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                flex: 1,
                minHeight: '230px',
                transition: 'all 0.15s',
              }}
            >
              <Upload size={30} color={uploaded ? '#15803d' : '#64748b'} />
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: uploaded ? '#15803d' : '#1e293b' }}>
                {uploaded ? '✓ Foto Struk Berhasil Dipilih (Klik untuk Ganti)' : 'Klik untuk Pilih Foto Struk / Bukti Bayar'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Mendukung JPG, PNG, atau WebP dari tangkapan layar WhatsApp
              </div>
              <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Pratinjau Foto */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Pratinjau Foto Struk
          </label>
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              flex: 1,
              minHeight: '230px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: uploaded ? '6px' : '16px',
            }}
          >
            {uploaded ? (
              <img
                src={uploaded}
                alt="Pratinjau Struk"
                style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '8px' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                <Receipt size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                <span>Foto struk akan tampil di sini setelah dipilih</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
}

// =============================================================
// 4. VERIFIKASI BUKTI PEMBAYARAN OLEH SALES ADMIN
// =============================================================
export function ModalVerifikasi({ order, onClose, onToast, onConfirmed }) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom((prev) => Number((prev + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((prev) => Number(Math.max(0.1, prev - 0.25).toFixed(2)));
  const handleZoomReset = () => setZoom(1);

  const handleConfirm = () => {
    const res = verifyAndConfirmPayment(order.id, true);
    onToast(
      res.isRopTriggered
        ? `Pembayaran pesanan ${order.id} berhasil dikonfirmasi. ${res.ropAlert}`
        : `Pembayaran pesanan ${order.id} berhasil diverifikasi & dikonfirmasi lunas. Stok otomatis dipotong.`
    );
    onConfirmed?.(res);
    onClose();
  };

  const handleRetransfer = () => {
    const reason = `Halo kak ${order.customerName || 'Pelanggan'}, bukti transfer untuk pesanan #${order.id} sebesar ${formatRupiah(order.totalAmount)} belum sesuai. Mohon kirimkan kembali foto bukti transfer yang benar atau lakukan transfer ulang ke QRIS resmi Toko Farm Berkah. Terima kasih! 🙏`;
    verifyAndConfirmPayment(order.id, false, reason);
    const waUrl = generateReTransferWhatsAppUrl(order, reason);
    window.open(waUrl, '_blank');
    onToast(`Status pesanan ${order.id} diubah: Perlu Transfer Ulang & pesan WhatsApp dibuka.`);
    onClose();
  };

  return (
    <Modal
      size="lg"
        title="Cek Bukti & Konfirmasi Pembayaran"
        subtitle={`${order.id} · ${order.customerName}`}
        onClose={onClose}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleRetransfer}
              style={{
                padding: '11px 22px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={16} />
              <span>Tidak Sesuai</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              style={{
                padding: '11px 26px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.88rem',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(27, 67, 50, 0.25)',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Sesuai</span>
            </button>
          </div>
        }
      >
        <FlowSteps steps={ORDER_STEPS} current={4} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '20px', alignItems: 'stretch', marginTop: '6px' }}>
        
        {/* Kolom Kiri: Bukti Screenshot Transfer dari WhatsApp dengan Kontrol - dan + (Tinggi Sama Rata) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Header Kartu Bukti & Kontrol Zoom - / + */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                Bukti Transfer
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#15803d',
                  backgroundColor: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                WhatsApp
              </span>
            </div>

            {/* Tombol Langsung - dan + (Tanpa Batasan Persen) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid #e2e8f0',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={handleZoomOut}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s ease',
                }}
                title="Perkecil (-)"
                aria-label="Perkecil"
              >
                <Minus size={15} strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={handleZoomReset}
                style={{
                  minWidth: '44px',
                  height: '28px',
                  padding: '0 4px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Reset ukuran normal (100%)"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s ease',
                }}
                title="Perbesar (+)"
                aria-label="Perbesar"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Area Tampilan Gambar (Bisa Di-Zoom Bebas & Di-Scroll, Mengisi Tinggi Penuh Kartu) */}
          <div
            style={{
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              flex: 1,
              minHeight: '260px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              position: 'relative',
              padding: '8px',
            }}
          >
            {order.transferProofImage ? (
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '100%',
                  minHeight: '100%',
                }}
              >
                <img
                  src={order.transferProofImage}
                  alt="Screenshot Bukti Transfer"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '260px',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    boxShadow: zoom > 1 ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                  }}
                  title="Bukti transfer pesanan"
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                <Receipt size={40} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                <span>Belum ada foto bukti transfer</span>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Total Tagihan & Rincian Pesanan (Tinggi Sama Rata dengan Kartu Kiri) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
          
          {/* Kartu Utama Total Tagihan */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              borderRadius: '14px',
              border: '1.5px solid #86efac',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 3px rgba(22, 101, 52, 0.05)',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Tagihan Resmi
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#1b4332', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {formatRupiah(order.totalAmount)}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#15803d', marginTop: '2px' }}>
              Nominal yang harus dibayarkan pelanggan Toko Farm Berkah
            </div>
          </div>

          {/* Rincian Ringkas Pesanan (Mengisi Ruang agar Sejajar Rata dengan Kartu Kiri) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Rincian Informasi Pesanan
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', fontSize: '0.82rem', alignItems: 'center' }}>
              <span style={{ color: '#64748b' }}>No. Pesanan:</span>
              <strong style={{ fontFamily: 'monospace', color: '#1b4332', fontSize: '0.88rem' }}>{order.id}</strong>

              <span style={{ color: '#64748b' }}>Pelanggan:</span>
              <span><strong>{order.customerName}</strong> <span style={{ color: '#64748b' }}>({order.customerPhone})</span></span>

              <span style={{ color: '#64748b' }}>Produk:</span>
              <span><strong>{order.productName}</strong> <span style={{ color: '#166534', fontWeight: 700 }}>({formatQtyUnit(order.quantity, order.unit)})</span></span>

              <span style={{ color: '#64748b' }}>Bank / QRIS:</span>
              <span>{order.transferBank || 'QRIS Toko Farm Berkah'}</span>

              <span style={{ color: '#64748b' }}>Waktu Kirim:</span>
              <span>{order.transferTime || 'Diterima via WhatsApp'}</span>
            </div>
          </div>

        </div>

      </div>
    </Modal>
  );
}

// =============================================================
// 5. DETAIL LENGKAP PESANAN (PREMIUM INVOICE & ORDER VIEW)
// =============================================================
export function ModalDetailPesanan({ order, onClose }) {
  const [showProofPreview, setShowProofPreview] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);

  const meta = ORDER_STATUS[order.status] || ORDER_STATUS.MENUNGGU_PEMBAYARAN;
  const currentStep = getOrderStep(order);
  const customerInitial = (order.customerName || 'P').charAt(0).toUpperCase();
  const unitPrice = order.unitPrice || order.price || (order.quantity ? Math.round(order.totalAmount / order.quantity) : 0);
  const waNumber = (order.customerPhone || '').replace(/\D/g, '').replace(/^0/, '62');
  const waUrl = waNumber ? `https://wa.me/${waNumber}` : null;
  const proofImg = order.transferProofImage || order.paymentProofUrl;

  return (
    <>
      <Modal
        title={`Detail Pesanan #${order.id}`}
        subtitle={`Dibuat pada ${order.date || order.createdAt || '-'} · Portal Sales Admin`}
        onClose={onClose}
        size="lg"
        footer={
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#1b4332',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(27, 67, 50, 0.2)',
            }}
          >
            Tutup
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Banner Status Pesanan */}
          {order.status === 'SELESAI' ? (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#14532d' }}>
                    Pembayaran Lunas & Transaksi Selesai
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: '2px' }}>
                    Nominal transfer sesuai total tagihan, stok toko telah terpotong otomatis dari persediaan.
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '20px' }}>
                ✓ Lunas · Terverifikasi
              </div>
            </div>
          ) : order.status === 'DIBATALKAN' ? (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PackageX size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#9f1239' }}>
                  Pesanan Dibatalkan
                </div>
                <div style={{ fontSize: '0.76rem', color: '#be123c', marginTop: '2px' }}>
                  {order.cancellationReason || 'Pesanan dibatalkan di sistem toko.'}
                </div>
              </div>
            </div>
          ) : null}

          {/* Stepper Timeline Alur Transaksi */}
          {order.status !== 'DIBATALKAN' && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                Alur Transaksi & Gateway Penjualan
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {ORDER_STEPS.map((step, idx) => {
                  const isDone = idx < currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <React.Fragment key={step}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1, flex: '0 0 auto' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: isDone ? '#1b4332' : isCurrent ? '#2d6a4f' : '#f1f5f9',
                            color: isDone || isCurrent ? '#ffffff' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            boxShadow: isDone || isCurrent ? '0 2px 6px rgba(27, 67, 50, 0.2)' : 'none',
                          }}
                        >
                          {isDone ? <Check size={14} strokeWidth={3} /> : idx + 1}
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: isDone || isCurrent ? 700 : 500,
                            color: isDone ? '#1b4332' : isCurrent ? '#0f172a' : '#94a3b8',
                            textAlign: 'center',
                            maxWidth: '92px',
                            lineHeight: 1.25,
                          }}
                        >
                          {step}
                        </span>
                      </div>
                      {idx < ORDER_STEPS.length - 1 && (
                        <div
                          style={{
                            flex: 1,
                            height: '2px',
                            backgroundColor: idx < currentStep - 1 ? '#1b4332' : idx === currentStep - 1 ? '#52b788' : '#e2e8f0',
                            margin: '0 6px',
                            marginBottom: '20px',
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid 2 Kolom: Data Pelanggan & Rincian Pembelian */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            {/* Kartu 1: Data Pelanggan */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#e8f5e9', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={15} />
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#142019' }}>Informasi Pelanggan</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Pembeli WhatsApp</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#1b4332',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(27, 67, 50, 0.2)',
                  }}
                >
                  {customerInitial}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>{order.customerName}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <Phone size={12} color="#94a3b8" />
                    <span>{order.customerPhone}</span>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginLeft: '4px',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title="Buka Chat WhatsApp Customer"
                      >
                        <MessageSquare size={10} />
                        <span>Chat WA</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8faf9', borderRadius: '10px', padding: '10px 12px', border: '1px solid #edf2ee' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                  <MapPin size={12} color="#047857" />
                  <span>Alamat Pengiriman:</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.35 }}>
                  {order.customerAddress && order.customerAddress !== '-' ? order.customerAddress : 'Pengambilan langsung di gerai Toko Farm Berkah'}
                </div>
              </div>
            </div>

            {/* Kartu 2: Rincian Produk & Tagihan */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#e8f5e9', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={15} />
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#142019' }}>Rincian Pembelian</span>
                </div>
                <span className={`badge ${meta.badge}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>{meta.label}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#142019' }}>{order.productName}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                    {formatQtyUnit(order.quantity, order.unit)} × {formatRupiah(unitPrice)}
                  </div>
                </div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#142019' }}>
                  {formatRupiah(order.totalAmount)}
                </div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '10px 14px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Total Tagihan Lunas</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>Termasuk reservasi stok toko</div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#166534', letterSpacing: '-0.02em' }}>
                  {formatRupiah(order.totalAmount)}
                </div>
              </div>
            </div>

          </div>

          {/* Kartu 3: Bukti Transfer WhatsApp & Rekonsiliasi Pembayaran */}
          {proofImg && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#e8f5e9', color: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={15} />
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#142019' }}>Bukti Pembayaran QRIS WhatsApp</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                  <CheckCircle2 size={12} color="#16a34a" />
                  <span>Terverifikasi Sah</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '16px', alignItems: 'center' }}>
                {/* Thumbnail Struk dengan Zoom on Click */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    overflow: 'hidden',
                    backgroundColor: '#f8fafc',
                    height: '110px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowProofPreview(true)}
                  title="Klik untuk melihat bukti ukuran penuh"
                >
                  <img
                    src={proofImg}
                    alt="Bukti Transfer"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      borderRadius: '4px',
                      padding: '2px 5px',
                      fontSize: '0.64rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Eye size={10} />
                    <span>Perbesar</span>
                  </div>
                </div>

                {/* Detail Verifikasi */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.78rem' }}>
                  <div style={{ backgroundColor: '#f8faf9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edf2ee' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Nominal Struk</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1b4332', marginTop: '1px' }}>
                      {formatRupiah(order.transferAmount || order.totalAmount)}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8faf9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edf2ee' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Metode / Merchant</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                      {order.transferBank || 'QRIS Toko Farm Berkah'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8faf9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edf2ee' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Waktu Kirim Bukti</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginTop: '1px' }}>
                      {order.transferTime || '-'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8faf9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #edf2ee' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Dikonfirmasi Sales Admin</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', marginTop: '1px' }}>
                      {order.confirmedAt || order.date || 'Selesai'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </Modal>

      {/* Modal Lightbox Perbesar Bukti Transfer */}
      {showProofPreview && proofImg && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowProofPreview(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '16px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#142019' }}>
                Pratinjau Bukti Transfer: #{order.id}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px', backgroundColor: '#f8fafc' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.max(0.25, z - 0.25))}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '3px 6px', fontSize: '0.8rem', fontWeight: 800 }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom((z) => Math.min(3, z + 0.25))}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '3px 6px', fontSize: '0.8rem', fontWeight: 800 }}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProofPreview(false)}
                  style={{
                    border: 'none',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '320px', minHeight: '350px' }}>
              <img
                src={proofImg}
                alt="Bukti Transfer Penuh"
                style={{
                  transform: `scale(${previewZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

