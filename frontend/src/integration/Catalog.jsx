import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "./feedback";
import { Leaf, ShoppingCart, LogIn, Package, Plus } from "lucide-react";
import { Field, Dialog, Empty, SearchBox, Badge } from "./ui";
import { allPages, mutate, money, download, units } from "../services/api";

export function Catalog({ onBack, onLogin }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [detail, setDetail] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const { busy, run, notify } = useAction();
  const load = useCallback(
    () =>
      run(async () => {
        setLoading(true);
        try {
          setProducts(await allPages("/public/products"));
        } finally {
          setLoading(false);
        }
      }),
    [run],
  );
  useEffect(() => {
    load();
  }, [load]);
  const add = (p) => {
    setCart((previous) => {
      const item = previous.find((x) => x.productId === p.id);
      return item
        ? previous.map((x) =>
            x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x,
          )
        : [
            ...previous,
            {
              productId: p.id,
              name: p.name,
              price: p.price,
              stockUnit: p.stockUnit,
              quantity: 1,
            },
          ];
    });
    notify(`${p.name} ditambahkan ke keranjang.`);
  };
  const visible = products.filter(
    (p) =>
      (!category || p.category.id === category) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const categories = [
    ...new Map(products.map((p) => [p.category.id, p.category])).values(),
  ];
  return (
    <>
      <header className="catalog-header">
        <button className="brand link" onClick={onBack}>
          <Leaf />
          FarmSight
        </button>
        <div className="actions">
          <button onClick={() => setCheckout(true)}>
            <ShoppingCart size={17} />
            Keranjang ({cart.reduce((n, x) => n + x.quantity, 0)})
          </button>
          <button onClick={onLogin}>
            <LogIn size={17} />
            Masuk Staf
          </button>
        </div>
      </header>
      <main className="catalog-main">
        <div className="catalog-hero">
          <p className="eyebrow">TOKO FARM BERKAH</p>
          <h1>Segar, alami, dari hasil tani.</h1>
          <p>
            Temukan produk pilihan kebun Pulo Gebang. Pesan dengan mudah melalui
            WhatsApp.
          </p>
        </div>
        <div className="section-heading">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Cari produk pilihan Anda..."
          />
          <select
            aria-label="Kategori produk"
            style={{ maxWidth: 240 }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button disabled={busy} onClick={load}>
            Muat ulang
          </button>
        </div>
        {loading ? (
          <Empty>Memuat katalog...</Empty>
        ) : !visible.length ? (
          <Empty>Belum ada produk yang sesuai pencarian.</Empty>
        ) : (
          <div className="product-grid">
            {visible.map((p) => (
              <article className="product-card" key={p.id}>
                {p.imageRef ? (
                  <img
                    className="product-photo"
                    src={p.imageRef}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/images/logo-farm-berkah.jpg";
                      e.currentTarget.onerror = null;
                    }}
                  />
                ) : (
                  <div className="product-photo">
                    <Package size={48} />
                  </div>
                )}
                <div className="product-body">
                  <small className="muted">{p.category.name}</small>
                  <h2>{p.name}</h2>
                  <div className="price">
                    {money(p.price)}{" "}
                    <small className="muted">
                      / {units[p.stockUnit] || p.stockUnit}
                    </small>
                  </div>
                  <Badge
                    tone={
                      p.availability === "OUT_OF_STOCK"
                        ? "danger"
                        : p.availability === "LIMITED"
                          ? "warn"
                          : ""
                    }
                  >
                    {p.availability === "OUT_OF_STOCK"
                      ? "Habis"
                      : p.availability === "LIMITED"
                        ? "Stok terbatas"
                        : "Tersedia"}
                  </Badge>
                  <div className="actions">
                    <button onClick={() => setDetail(p)}>Lihat detail</button>
                    <button
                      className="primary"
                      disabled={p.availability === "OUT_OF_STOCK"}
                      onClick={() => add(p)}
                    >
                      <Plus size={15} />
                      Tambah
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      {detail && (
        <Dialog title={detail.name} onClose={() => setDetail(null)}>
          {detail.imageRef && (
            <img className="proof" src={detail.imageRef} alt={detail.name} />
          )}
          <p style={{ margin: "18px 0", whiteSpace: "pre-wrap" }}>
            {detail.description || "Deskripsi produk belum tersedia."}
          </p>
          <strong>
            {money(detail.price)} /{" "}
            {units[detail.stockUnit] || detail.stockUnit}
          </strong>
          <p className="muted">
            Ketersediaan akan diperiksa kembali oleh Sales Admin saat pesanan
            diproses.
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={detail.availability === "OUT_OF_STOCK"}
              onClick={() => {
                add(detail);
                setDetail(null);
              }}
            >
              Tambah ke keranjang
            </button>
          </div>
        </Dialog>
      )}
      {checkout && (
        <Checkout
          cart={cart}
          setCart={setCart}
          onClose={() => setCheckout(false)}
        />
      )}
    </>
  );
}
function Checkout({ cart, setCart, onClose }) {
  const { busy, run } = useAction();
  const [draft, setDraft] = useState(null);
  const [customer, setCustomer] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
  });
  const saved = useRef(null);
  const payload = {
    ...customer,
    items: cart.map((x) => ({
      productId: x.productId,
      quantity: String(x.quantity),
    })),
  };
  const createDraft = async () => {
    if (!cart.length) throw new Error("Pilih minimal satu produk.");
    if (cart.some((x) => !Number.isFinite(x.quantity) || x.quantity <= 0))
      throw new Error("Jumlah setiap produk harus lebih dari nol.");
    const signature = JSON.stringify(payload);
    if (saved.current?.signature === signature) return saved.current.draft;
    const result = await mutate("/public/order-drafts", payload);
    saved.current = { signature, draft: result };
    setDraft(result);
    return result;
  };
  const file = (result) => {
    const text = [
      "RINGKASAN PEMESANAN TOKO FARM BERKAH",
      `Kode: ${result.publicCode}`,
      `Nama: ${customer.customerName}`,
      `Telepon: ${customer.customerPhone}`,
      `Alamat: ${customer.customerAddress}`,
      "",
      ...result.items.map(
        (x) =>
          `${x.name} — ${x.quantity} ${units[x.stockUnit] || x.stockUnit} × ${money(x.unitPrice)} = ${money(x.subtotalAmount)}`,
      ),
      "",
      `Total: ${money(result.totalAmount)}`,
      "Draft belum mereservasi stok. Sales Admin akan memeriksa ketersediaan sebelum mengirim QRIS.",
      "Kirim ringkasan melalui WhatsApp dan tekan Kirim pada aplikasi WhatsApp.",
    ].join("\n");
    download(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      `Ringkasan-${result.publicCode}.txt`,
    );
  };
  return (
    <Dialog title="Keranjang & ringkasan pesanan" onClose={onClose} wide>
      {!cart.length ? (
        <Empty>Keranjang masih kosong.</Empty>
      ) : (
        <>
          <div className="panel">
            {cart.map((item) => (
              <div className="order-item" key={item.productId}>
                <div>
                  <strong>{item.name}</strong>
                  <small className="muted"> · {money(item.price)}</small>
                </div>
                <input
                  aria-label={`Jumlah ${item.name}`}
                  type="number"
                  min="0.001"
                  max="1000000"
                  step="0.001"
                  value={item.quantity}
                  onChange={(e) => {
                    setDraft(null);
                    setCart(
                      cart.map((x) =>
                        x.productId === item.productId
                          ? { ...x, quantity: Number(e.target.value) }
                          : x,
                      ),
                    );
                  }}
                />
                <button
                  aria-label={`Hapus ${item.name}`}
                  onClick={() => {
                    setCart(cart.filter((x) => x.productId !== item.productId));
                    setDraft(null);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <strong>
              Estimasi total:{" "}
              {money(cart.reduce((n, x) => n + x.price * x.quantity, 0))}
            </strong>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(createDraft);
            }}
          >
            <fieldset disabled={busy}>
              <div className="grid">
                {[
                  ["customerName", "Nama lengkap", "text", true],
                  ["customerPhone", "Nomor WhatsApp / HP", "tel", true],
                  ["customerEmail", "Email (opsional)", "email", false],
                  ["customerAddress", "Alamat (opsional)", "text", false],
                ].map(([name, label, type, required]) => (
                  <Field
                    key={name}
                    label={label}
                    name={name}
                    type={type}
                    required={required}
                    maxLength={
                      name === "customerAddress"
                        ? 500
                        : name === "customerEmail"
                          ? 254
                          : name === "customerPhone"
                            ? 32
                            : 120
                    }
                    value={customer[name]}
                    onChange={(e) => {
                      setCustomer({ ...customer, [name]: e.target.value });
                      setDraft(null);
                    }}
                  />
                ))}
              </div>
              <p className="muted">
                Harga akhir pada ringkasan dihitung server. Membuat draft belum
                membuktikan pesan WhatsApp terkirim dan belum mencadangkan stok.
              </p>
              <div className="actions">
                <button className="primary" type="submit">
                  {busy ? "Memproses..." : "Buat ringkasan pesanan"}
                </button>
              </div>
            </fieldset>
          </form>
          {draft && (
            <section
              className="notice"
              style={{ display: "block", marginTop: 18 }}
            >
              <h3>Ringkasan {draft.publicCode}</h3>
              {draft.items.map((x) => (
                <p key={x.productId}>
                  {x.name} · {x.quantity} × {money(x.unitPrice)}
                </p>
              ))}
              <strong>Total terbaru: {money(draft.totalAmount)}</strong>
              <div className="actions" style={{ marginTop: 14 }}>
                <button onClick={() => file(draft)}>Unduh ringkasan</button>
                <a
                  className="button primary"
                  href={draft.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka WhatsApp untuk mengirim
                </a>
              </div>
              <p className="muted">
                Periksa ringkasan, lalu tekan Kirim di WhatsApp.
              </p>
            </section>
          )}
        </>
      )}
    </Dialog>
  );
}
