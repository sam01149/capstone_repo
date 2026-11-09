import React, { useCallback, useEffect, useState } from "react";
import { useAction } from "./feedback";
import {
  Plus,
  MessageSquare,
  QrCode,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { Field, Dialog, Empty, SearchBox, Badge, Table } from "./ui";
import { api, allPages, mutate, money, when, units } from "../services/api";
const statusLabels = {
  DRAFT: "Draft",
  PENDING_CONFIRMATION: "Menunggu validasi stok",
  CONFIRMED: "Stok direservasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};
const paymentLabels = {
  RECEIVED: "Bukti diterima",
  VERIFIED: "Pembayaran dikonfirmasi",
  RETRANSFER_REQUIRED: "Perlu transfer / bukti ulang",
};
export function Orders({ settings }) {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { busy, run, notify } = useAction();
  const refresh = useCallback(async () => {
    const [o, p] = await Promise.all([
      allPages("/orders"),
      allPages("/products"),
    ]);
    setOrders(o);
    setProducts(p);
  }, []);
  useEffect(() => {
    run(async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    });
    const focus = () => run(refresh);
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [run, refresh]);
  const open = (id) => run(async () => setSelected(await api(`/orders/${id}`)));
  const changed = async () => {
    await refresh();
    if (selected) setSelected(await api(`/orders/${selected.id}`));
  };
  const rows = orders.filter(
    (o) =>
      (!filter || o.status === filter) &&
      `${o.publicCode} ${o.customer?.name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Manajemen Pesanan</h2>
            <p className="muted">
              Validasi stok, QRIS manual, bukti transfer, dan konfirmasi
              pembayaran.
            </p>
          </div>
          <button className="primary" onClick={() => setCreating(true)}>
            <Plus size={17} />
            Input pesanan
          </button>
        </div>
        <div className="actions" style={{ marginBottom: 20 }}>
          <SearchBox value={search} onChange={setSearch} />
          <select
            aria-label="Status pesanan"
            style={{ maxWidth: 250 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Semua status</option>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button disabled={busy} onClick={() => run(refresh)}>
            Muat ulang
          </button>
        </div>
        {loading ? (
          <Empty>Memuat pesanan...</Empty>
        ) : !rows.length ? (
          <Empty>Belum ada pesanan yang sesuai.</Empty>
        ) : (
          <Table
            headings={[
              "Pesanan",
              "Pelanggan",
              "Total",
              "Status",
              "Pembayaran",
              "Tindakan",
            ]}
          >
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.publicCode}</strong>
                  <small>{when(o.createdAt)}</small>
                  <small>
                    {o.source === "PUBLIC_WHATSAPP"
                      ? "Draft katalog · WhatsApp manual"
                      : "Input Sales Admin"}
                  </small>
                </td>
                <td>
                  {o.customer?.name || "Data dianonimkan"}
                  <small>{o.customer?.phone}</small>
                </td>
                <td>
                  {money(o.totalAmount)}
                  <small>{o.items.length} jenis produk</small>
                </td>
                <td>
                  <Badge
                    tone={
                      o.status === "CANCELLED"
                        ? "danger"
                        : o.status === "COMPLETED"
                          ? ""
                          : "warn"
                    }
                  >
                    {statusLabels[o.status]}
                  </Badge>
                </td>
                <td>{paymentLabels[o.payment?.status] || "Belum ada bukti"}</td>
                <td>
                  <button disabled={busy} onClick={() => open(o.id)}>
                    Lihat & proses
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      {creating && (
        <OrderForm
          products={products}
          onClose={() => setCreating(false)}
          onSaved={async (o) => {
            setCreating(false);
            await refresh();
            setSelected(await api(`/orders/${o.id}`));
            notify(
              "Pesanan tersimpan. Lanjutkan validasi stok untuk mereservasi.",
            );
          }}
        />
      )}
      {selected && (
        <OrderDetail
          order={selected}
          settings={settings}
          products={products}
          onClose={() => setSelected(null)}
          onChanged={changed}
        />
      )}
    </>
  );
}
function OrderForm({ products, order, onClose, onSaved }) {
  const { busy, run } = useAction();
  const [items, setItems] = useState(
    order
      ? order.items.map((x) => ({
          productId: x.productId,
          quantity: x.quantity,
        }))
      : [{ productId: "", quantity: "1" }],
  );
  return (
    <Dialog
      title={order ? "Ubah draft pesanan" : "Input pesanan pelanggan"}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const body = {
            customerName: f.get("name"),
            customerPhone: f.get("phone"),
            customerAddress: f.get("address"),
            items: items.map((x) => ({ ...x, quantity: String(x.quantity) })),
          };
          run(async () => {
            const result = await mutate(
              order ? `/orders/${order.id}` : "/orders",
              body,
              order ? "PATCH" : "POST",
            );
            await onSaved(result);
          });
        }}
      >
        <fieldset disabled={busy}>
          <div className="grid">
            <Field
              label="Nama pelanggan"
              name="name"
              required
              maxLength={120}
              defaultValue={order?.customer?.name || ""}
            />
            <Field
              label="Nomor WhatsApp"
              name="phone"
              type="tel"
              required
              maxLength={32}
              defaultValue={order?.customer?.phone || ""}
            />
            <Field
              label="Alamat (opsional)"
              name="address"
              maxLength={500}
              defaultValue={order?.customer?.address || ""}
            />
          </div>
          <h3 style={{ marginBottom: 12 }}>Produk pesanan</h3>
          {items.map((item, index) => (
            <div className="order-item" key={index}>
              <select
                aria-label={`Produk ${index + 1}`}
                required
                value={item.productId}
                onChange={(e) =>
                  setItems(
                    items.map((x, i) =>
                      i === index ? { ...x, productId: e.target.value } : x,
                    ),
                  )
                }
              >
                <option value="">Pilih produk</option>
                {products
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {money(p.price)} / {units[p.stockUnit]}
                    </option>
                  ))}
              </select>
              <input
                aria-label={`Jumlah produk ${index + 1}`}
                type="number"
                min="0.001"
                step="0.001"
                max="1000000"
                required
                value={item.quantity}
                onChange={(e) =>
                  setItems(
                    items.map((x, i) =>
                      i === index ? { ...x, quantity: e.target.value } : x,
                    ),
                  )
                }
              />
              <button
                aria-label={`Hapus produk ${index + 1}`}
                type="button"
                disabled={items.length === 1}
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
          ))}
          <div className="actions">
            <button
              type="button"
              disabled={items.length >= 20}
              onClick={() =>
                setItems([...items, { productId: "", quantity: "1" }])
              }
            >
              Tambah produk
            </button>
            <button className="primary" type="submit">
              Simpan draft
            </button>
          </div>
          <p className="muted" style={{ marginTop: 15 }}>
            Stok diperiksa dan direservasi ketika Sales Admin menekan Validasi &
            reservasi stok. Harga dan total dihitung server.
          </p>
        </fieldset>
      </form>
    </Dialog>
  );
}
function OrderDetail({ order, settings, products, onClose, onChanged }) {
  const { busy, run, notify } = useAction();
  const [proof, setProof] = useState(null);
  const [editing, setEditing] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const act = async (action, extra = {}) => {
    await mutate(`/orders/${order.id}/transition`, { action, ...extra });
    await onChanged();
  };
  const validate = () =>
    run(async () => {
      let current = order;
      if (current.status === "DRAFT")
        current = await mutate(`/orders/${order.id}/transition`, {
          action: "SUBMIT",
        });
      try {
        current = await mutate(`/orders/${order.id}/transition`, {
          action: "VALIDATE_STOCK",
        });
      } catch (error) {
        await onChanged();
        throw error;
      }
      await onChanged();
      if (current.status === "CANCELLED") {
        notify(
          "Stok tidak cukup atau produk tidak aktif. Pesanan dibatalkan; hubungi pelanggan melalui WhatsApp.",
          "error",
        );
        return;
      }
      notify(
        "Stok tersedia dan berhasil direservasi. QRIS dapat dikirim melalui WhatsApp.",
      );
    });
  const waPhone = (order.customer?.phone || "")
    .replace(/[^0-9]/g, "")
    .replace(/^0/, "62");
  const waText = `Halo ${order.customer?.name || "Pelanggan"}, pesanan ${order.publicCode}:\n${order.items.map((x) => `${x.name}: ${x.quantity} ${units[x.stockUnit]}`).join("\n")}\nTotal ${money(order.totalAmount)}. Stok telah direservasi. Silakan membayar melalui QRIS resmi yang dikirim Sales Admin, lalu kirim bukti transfer untuk diperiksa.`;
  const loadProof = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProofImage(null);
    await run(async () => {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 750000
      )
        throw new Error("Pilih gambar PNG, JPEG, atau WebP maksimal 750 KB.");
      const result = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
        reader.readAsDataURL(file);
      });
      setProofImage(result);
    });
  };
  const payment = order.payment || {};
  return (
    <Dialog title={`Pesanan ${order.publicCode}`} onClose={onClose} wide>
      <div className="steps">
        <span>1. Input pesanan</span>
        <span>2. Validasi & reservasi</span>
        <span>3. Kirim QRIS</span>
        <span>4. Catat bukti</span>
        <span>5. Konfirmasi pembayaran</span>
      </div>
      <div className="section-heading">
        <div>
          <strong>
            {order.customer?.name || "Data pelanggan dianonimkan"}
          </strong>
          <p className="muted">
            {order.customer?.phone} · {order.customer?.address}
          </p>
        </div>
        <Badge>{statusLabels[order.status]}</Badge>
      </div>
      <Table headings={["Produk", "Jumlah", "Harga", "Subtotal"]}>
        {order.items.map((i) => (
          <tr key={i.productId}>
            <td>{i.name}</td>
            <td>
              {i.quantity} {units[i.stockUnit]}
            </td>
            <td>{money(i.unitPrice)}</td>
            <td>{money(i.subtotalAmount)}</td>
          </tr>
        ))}
      </Table>
      <h3 style={{ textAlign: "right", margin: "18px 0" }}>
        Total: {money(order.totalAmount)}
      </h3>
      <p className="muted">
        {paymentLabels[payment.status] || "Belum ada bukti pembayaran."}
        {payment.amount ? ` · Nominal dicatat: ${money(payment.amount)}` : ""}
      </p>
      {payment.qrisSentAt && (
        <p className="muted">
          Ditandai QRIS dikirim: {when(payment.qrisSentAt)}
        </p>
      )}
      {payment.note && <p className="notice">{payment.note}</p>}
      {payment.proofImage && (
        <img
          className="proof"
          src={payment.proofImage}
          alt={`Bukti transfer pesanan ${order.publicCode}`}
        />
      )}
      <fieldset disabled={busy}>
        <div className="actions">
          {["DRAFT", "PENDING_CONFIRMATION"].includes(order.status) && (
            <>
              <button className="primary" onClick={validate}>
                Validasi & reservasi stok
              </button>
              <button onClick={() => setEditing(true)}>Ubah draft</button>
            </>
          )}
          {order.status === "CONFIRMED" && !order.stockDeductedAt && (
            <>
              <button onClick={() => setProof("qris")}>
                <QrCode size={16} />
                Siapkan QRIS & WhatsApp
              </button>
              <button
                onClick={() => {
                  setProof("upload");
                  setAmount("");
                  setProofImage(null);
                }}
              >
                <Receipt size={16} />
                Catat bukti transfer
              </button>
              {payment.status === "RECEIVED" && (
                <>
                  <button
                    className="primary"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Saya sudah memeriksa bukti dan nominal ${money(order.totalAmount)}. Konfirmasi pembayaran dan kurangi stok sekarang?`,
                        )
                      )
                        run(async () => {
                          await act("COMPLETE");
                          notify(
                            "Pembayaran dikonfirmasi, pesanan selesai, dan stok keluar tercatat.",
                          );
                        });
                    }}
                  >
                    <CheckCircle2 size={16} />
                    Sesuai — konfirmasi pembayaran
                  </button>
                  <button onClick={() => setProof("retransfer")}>
                    Tidak sesuai — minta ulang
                  </button>
                </>
              )}
            </>
          )}
          {!["COMPLETED", "CANCELLED"].includes(order.status) &&
            !order.stockDeductedAt && (
              <button
                className="danger"
                onClick={() => {
                  if (
                    window.confirm("Batalkan pesanan dan lepas reservasi stok?")
                  )
                    run(async () => {
                      await act("CANCEL");
                      notify("Pesanan dibatalkan dan reservasi dilepas.");
                    });
                }}
              >
                Batalkan pesanan
              </button>
            )}
        </div>
      </fieldset>
      {order.status === "CANCELLED" && waPhone && (
        <div className="actions" style={{ marginTop: 16 }}>
          <a
            className="button"
            target="_blank"
            rel="noreferrer"
            href={
              "https://wa.me/" +
              waPhone +
              "?text=" +
              encodeURIComponent(
                "Halo " +
                  (order.customer?.name || "Pelanggan") +
                  ", pesanan " +
                  order.publicCode +
                  " dibatalkan. " +
                  (payment.note ||
                    "Silakan hubungi Sales Admin untuk informasi lebih lanjut."),
              )
            }
          >
            Buka pesan pembatalan di WhatsApp
          </a>
        </div>
      )}
      {order.stockDeductedAt && (
        <p className="notice">
          Stok keluar tercatat pada {when(order.stockDeductedAt)}.
        </p>
      )}
      {order.source === "PUBLIC_WHATSAPP" && order.status === "DRAFT" && (
        <p className="notice">
          Draft berasal dari katalog. Pastikan pelanggan benar-benar mengirim
          pesan di WhatsApp sebelum memvalidasi.
        </p>
      )}
      {proof === "qris" && (
        <section className="panel" style={{ marginTop: 20 }}>
          <h3>Kirim QRIS secara manual</h3>
          {settings.qrisImageUrl ? (
            <>
              <img
                className="proof"
                src={settings.qrisImageUrl}
                alt="QRIS toko yang dikonfigurasi"
              />
              <a
                className="button"
                href={settings.qrisImageUrl}
                target="_blank"
                rel="noreferrer"
              >
                Buka gambar QRIS
              </a>
            </>
          ) : (
            <p className="notice">
              QRIS toko belum dikonfigurasi pada aplikasi. Kirim gambar QRIS
              resmi yang sudah diverifikasi melalui WhatsApp.
            </p>
          )}
          <p className="muted">
            Buka chat, lampirkan gambar QRIS resmi, lalu tekan Kirim di
            WhatsApp. Setelah selesai, tandai di bawah.
          </p>
          <div className="actions">
            {waPhone && (
              <a
                className="button primary"
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageSquare size={16} />
                Buka chat pelanggan
              </a>
            )}
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await act("MARK_QRIS_SENT");
                  setProof(null);
                  notify("Penandaan QRIS tersimpan.");
                })
              }
            >
              Saya sudah mengirim QRIS
            </button>
          </div>
        </section>
      )}
      {proof === "upload" && (
        <form
          className="panel"
          style={{ marginTop: 20 }}
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              if (!proofImage)
                throw new Error("Pilih foto bukti terlebih dahulu.");
              await act("RECORD_PAYMENT", {
                amount: Number(amount),
                proofImage,
                note,
              });
              setProof(null);
              setProofImage(null);
              notify(
                "Bukti tersimpan. Periksa sebelum mengonfirmasi pembayaran.",
              );
            });
          }}
        >
          <fieldset disabled={busy}>
            <h3>Catat bukti yang diterima melalui WhatsApp</h3>
            <Field label="Foto bukti transfer (maksimal 750 KB)">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={loadProof}
              />
            </Field>
            {proofImage && (
              <img
                className="proof"
                src={proofImage}
                alt="Pratinjau bukti transfer"
              />
            )}
            <Field
              label="Nominal pada bukti (rupiah)"
              type="number"
              min="1"
              max="2147483647"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Field
              label="Catatan (opsional)"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="primary">Simpan bukti</button>
          </fieldset>
        </form>
      )}
      {proof === "retransfer" && (
        <section className="panel" style={{ marginTop: 20 }}>
          <Field
            label="Alasan meminta bukti atau transfer ulang"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="actions">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await act("REQUEST_RETRANSFER", {
                    note:
                      note ||
                      "Nominal atau bukti belum sesuai. Mohon kirim ulang.",
                  });
                  setProof(null);
                  notify(
                    "Permintaan pemeriksaan ulang tersimpan. Hubungi pelanggan melalui WhatsApp.",
                  );
                })
              }
            >
              Simpan permintaan ulang
            </button>
            {waPhone && (
              <a
                className="button"
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Halo, bukti/nominal pesanan ${order.publicCode} belum sesuai. ${note || "Mohon kirim bukti atau transfer yang sesuai."}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Buka pesan WhatsApp
              </a>
            )}
          </div>
        </section>
      )}
      {editing && (
        <OrderForm
          products={products}
          order={order}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onChanged();
            notify("Draft diperbarui.");
          }}
        />
      )}
    </Dialog>
  );
}
