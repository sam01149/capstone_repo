import React, { useCallback, useEffect, useState } from "react";
import { useAction } from "./feedback";
import { Plus } from "lucide-react";
import {
  api,
  mutate,
  allPages,
  money,
  when,
  roles,
  units,
  download,
} from "../services/api";
import { Dialog, Field, Table, Empty, Badge, SearchBox } from "./ui";

function useRows(path) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { run } = useAction();
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await allPages(path));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    run(refresh);
  }, [run, refresh]);
  return { rows, loading, refresh };
}
export function Products() {
  const { rows, loading, refresh } = useRows("/products");
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const { busy, run, notify } = useAction();
  const loadCategories = useCallback(
    async () => setCategories(await allPages("/categories")),
    [],
  );
  useEffect(() => {
    run(loadCategories);
  }, [run, loadCategories]);
  const filtered = rows.filter((p) =>
    `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Produk & kategori</h2>
          <div className="actions">
            <button onClick={() => setCategoryDialog(true)}>
              Kelola kategori
            </button>
            <button className="primary" onClick={() => setEditing({})}>
              <Plus size={16} />
              Tambah produk
            </button>
          </div>
        </div>
        <SearchBox value={search} onChange={setSearch} />
        {loading ? (
          <Empty>Memuat produk...</Empty>
        ) : !filtered.length ? (
          <Empty>Belum ada produk. Buat kategori dan produk pertama.</Empty>
        ) : (
          <Table
            headings={[
              "Produk",
              "Kategori",
              "Harga",
              "Parameter stok",
              "Visibilitas",
              "Tindakan",
            ]}
          >
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <small>
                    {p.sku} · {units[p.stockUnit]}
                  </small>
                </td>
                <td>{p.category.name}</td>
                <td>{money(p.price)}</td>
                <td>
                  Minimum {p.minimumStock}
                  <small>
                    SS {p.safetyStock} · ROP {p.reorderPoint}
                  </small>
                </td>
                <td>
                  <Badge tone={p.isActive ? "" : "muted"}>
                    {p.isActive ? "Tampil di katalog" : "Disembunyikan"}
                  </Badge>
                </td>
                <td>
                  <div className="actions">
                    <button onClick={() => setEditing(p)}>Ubah</button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `${p.isActive ? "Sembunyikan" : "Tampilkan"} produk ${p.name}?`,
                          )
                        )
                          run(async () => {
                            await mutate(
                              `/products/${p.id}`,
                              { isActive: !p.isActive },
                              "PATCH",
                            );
                            await refresh();
                            notify("Visibilitas produk diperbarui.");
                          });
                      }}
                    >
                      {p.isActive ? "Sembunyikan" : "Tampilkan"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      {editing && (
        <Dialog
          title={editing.id ? "Ubah produk" : "Tambah produk"}
          onClose={() => setEditing(null)}
          wide
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const body = Object.fromEntries(f);
              for (const key of ["price", "leadTimeDays"])
                body[key] = Number(body[key]);
              body.imageRef = body.imageRef || null;
              body.description = body.description || null;
              run(async () => {
                await mutate(
                  editing.id ? `/products/${editing.id}` : "/products",
                  body,
                  editing.id ? "PATCH" : "POST",
                );
                setEditing(null);
                await refresh();
                notify(
                  "Produk tersimpan. Untuk mengubah saldo, gunakan Persediaan & Mutasi.",
                );
              });
            }}
          >
            <fieldset disabled={busy}>
              <div className="grid">
                <Field
                  label="Kode SKU"
                  name="sku"
                  required
                  maxLength={64}
                  defaultValue={editing.sku || ""}
                />
                <Field
                  label="Nama produk"
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={editing.name || ""}
                />
                <Field label="Kategori">
                  <select
                    name="categoryId"
                    required
                    defaultValue={editing.category?.id || ""}
                  >
                    <option value="">Pilih kategori</option>
                    {categories
                      .filter((x) => x.isActive)
                      .map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field
                  label="Harga satuan (rupiah)"
                  type="number"
                  step="1"
                  min="1"
                  max="2000000000"
                  name="price"
                  required
                  defaultValue={editing.price || ""}
                />
                <Field label="Satuan stok">
                  <select
                    name="stockUnit"
                    defaultValue={editing.stockUnit || "UNIT"}
                  >
                    {Object.entries(units).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                {[
                  ["minimumStock", "Batas minimum"],
                  ["safetyStock", "Safety Stock"],
                  ["reorderPoint", "Reorder Point"],
                ].map(([k, l]) => (
                  <Field
                    key={k}
                    label={l}
                    name={k}
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    defaultValue={editing[k] || "0"}
                  />
                ))}
                <Field
                  label="Lead time (hari)"
                  name="leadTimeDays"
                  type="number"
                  min="0"
                  max="3650"
                  step="1"
                  required
                  defaultValue={editing.leadTimeDays || 0}
                />
                <Field
                  label="URL gambar HTTPS (opsional)"
                  name="imageRef"
                  type="url"
                  maxLength={2048}
                  defaultValue={editing.imageRef || ""}
                />
              </div>
              <Field label="Deskripsi">
                <textarea
                  name="description"
                  maxLength={1000}
                  defaultValue={editing.description || ""}
                />
              </Field>
              <p className="muted">
                Satuan tidak dapat diganti setelah stok atau histori digunakan.
                Saldo awal dicatat melalui menu Persediaan & Mutasi agar
                memiliki histori.
              </p>
              <div className="actions">
                <button className="primary">Simpan produk</button>
              </div>
            </fieldset>
          </form>
        </Dialog>
      )}
      {categoryDialog && (
        <Dialog
          title="Kategori produk"
          onClose={() => setCategoryDialog(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("name");
              const form = e.currentTarget;
              run(async () => {
                await mutate("/categories", { name });
                form.reset();
                await loadCategories();
                notify("Kategori ditambahkan.");
              });
            }}
          >
            <fieldset disabled={busy}>
              <Field
                label="Nama kategori baru"
                name="name"
                required
                maxLength={100}
              />
              <button className="primary">Tambah kategori</button>
            </fieldset>
          </form>
          <Table headings={["Kategori", "Status", "Tindakan"]}>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.isActive ? "Aktif" : "Nonaktif"}</td>
                <td>
                  <div className="actions">
                    <button
                      disabled={busy || !c.isActive}
                      onClick={() => {
                        const name = window.prompt("Nama kategori", c.name);
                        if (name?.trim())
                          run(async () => {
                            await mutate(
                              `/categories/${c.id}`,
                              { name },
                              "PATCH",
                            );
                            await loadCategories();
                            await refresh();
                          });
                      }}
                    >
                      Ubah
                    </button>
                    <button
                      disabled={busy || !c.isActive}
                      onClick={() => {
                        if (window.confirm(`Nonaktifkan kategori ${c.name}?`))
                          run(async () => {
                            await mutate(`/categories/${c.id}/deactivate`, {});
                            await loadCategories();
                          });
                      }}
                    >
                      Nonaktifkan
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Dialog>
      )}
    </>
  );
}
export function UsersPage() {
  const { rows, loading, refresh } = useRows("/users");
  const [editing, setEditing] = useState(null);
  const [reset, setReset] = useState(null);
  const [activity, setActivity] = useState(null);
  const { busy, run, notify } = useAction();
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Akun internal & otorisasi</h2>
          <button className="primary" onClick={() => setEditing({})}>
            <Plus size={16} />
            Tambah staf
          </button>
        </div>
        {loading ? (
          <Empty>Memuat pengguna...</Empty>
        ) : (
          <Table headings={["Nama", "Email", "Role", "Status", "Tindakan"]}>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.name}
                  <small>Login terakhir: {when(u.lastLoginAt)}</small>
                </td>
                <td>{u.email}</td>
                <td>{roles[u.role]}</td>
                <td>
                  <Badge tone={u.isActive ? "" : "muted"}>
                    {u.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td>
                  <div className="actions">
                    <button onClick={() => setEditing(u)}>Ubah</button>
                    <button disabled={!u.isActive} onClick={() => setReset(u)}>
                      Reset sandi
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () =>
                          setActivity({
                            user: u,
                            items: await allPages(`/users/${u.id}/activity`),
                          }),
                        )
                      }
                    >
                      Aktivitas
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `${u.isActive ? "Nonaktifkan" : "Aktifkan"} akun ${u.name}?`,
                          )
                        )
                          run(async () => {
                            await mutate(
                              `/users/${u.id}/${u.isActive ? "deactivate" : "activate"}`,
                              {},
                            );
                            await refresh();
                            notify("Status akun diperbarui.");
                          });
                      }}
                    >
                      {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      {editing && (
        <Dialog
          title={editing.id ? "Ubah akun staf" : "Tambah akun staf"}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run(async () => {
                if (editing.id) {
                  await mutate(
                    `/users/${editing.id}`,
                    { name: f.get("name"), email: f.get("email") },
                    "PATCH",
                  );
                  if (f.get("role") !== editing.role)
                    await mutate(
                      `/users/${editing.id}/role`,
                      { role: f.get("role") },
                      "PATCH",
                    );
                } else await mutate("/users", Object.fromEntries(f));
                setEditing(null);
                await refresh();
                notify("Akun staf tersimpan.");
              });
            }}
          >
            <fieldset disabled={busy}>
              <Field
                label="Nama staf"
                name="name"
                maxLength={120}
                required
                defaultValue={editing.name || ""}
              />
              <Field
                label="Email"
                name="email"
                type="email"
                maxLength={254}
                required
                defaultValue={editing.email || ""}
              />
              <Field label="Role">
                <select
                  name="role"
                  defaultValue={editing.role || "STOCK_MANAGER"}
                >
                  {Object.entries(roles).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              {!editing.id && (
                <Field
                  label="Kata sandi awal (8–16 karakter)"
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={16}
                  autoComplete="new-password"
                  required
                />
              )}
              <button className="primary">Simpan akun</button>
            </fieldset>
          </form>
        </Dialog>
      )}
      {reset && (
        <Dialog
          title={`Reset kata sandi ${reset.name}`}
          onClose={() => setReset(null)}
        >
          <p className="muted">
            Sesi staf akan dicabut. Sampaikan kata sandi baru melalui saluran
            pribadi yang disepakati.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const password = new FormData(e.currentTarget).get("password");
              run(async () => {
                await mutate(`/users/${reset.id}/reset-password`, { password });
                setReset(null);
                await refresh();
                notify("Kata sandi direset dan sesi lama dicabut.");
              });
            }}
          >
            <fieldset disabled={busy}>
              <Field
                label="Kata sandi pengganti"
                name="password"
                type="password"
                minLength={8}
                maxLength={16}
                autoComplete="new-password"
                required
              />
              <button className="primary">Reset kata sandi</button>
            </fieldset>
          </form>
        </Dialog>
      )}
      {activity && (
        <Dialog
          title={`Aktivitas ${activity.user.name}`}
          onClose={() => setActivity(null)}
          wide
        >
          {!activity.items.length ? (
            <Empty>Belum ada aktivitas.</Empty>
          ) : (
            <Table headings={["Waktu", "Pelaku", "Aktivitas", "Target"]}>
              {activity.items.map((x) => (
                <tr key={x.id}>
                  <td>{when(x.createdAt)}</td>
                  <td>{x.actor?.name || "Sistem"}</td>
                  <td>{x.action}</td>
                  <td>{x.targetType}</td>
                </tr>
              ))}
            </Table>
          )}
        </Dialog>
      )}
    </>
  );
}
const movementActions = {
  SET_OPENING_BALANCE: ["Saldo awal", "OPENING_BALANCE"],
  ADD_STOCK: ["Barang masuk / restock", "RESTOCK"],
  REDUCE_STOCK: ["Barang keluar manual", "MANUAL_REDUCTION"],
  MARK_DAMAGED: ["Barang rusak", "DAMAGED"],
  MARK_EXPIRED: ["Barang kedaluwarsa", "EXPIRED"],
  RETURN_CUSTOMER: ["Retur pelanggan", "CUSTOMER_RETURN"],
  ADJUST_TO_PHYSICAL: ["Penyesuaian hitung fisik", "PHYSICAL_COUNT"],
};
export function Inventory({ readOnly = false }) {
  const { rows, loading, refresh } = useRows("/inventory");
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [action, setAction] = useState("ADD_STOCK");
  const { busy, run, notify } = useAction();
  const loadMovements = useCallback(
    async () => setMovements(await allPages("/inventory/movements")),
    [],
  );
  useEffect(() => {
    run(loadMovements);
  }, [run, loadMovements]);
  const filtered = rows.filter((x) =>
    `${x.name} ${x.sku}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Persediaan produk</h2>
          <SearchBox value={search} onChange={setSearch} />
        </div>
        {loading ? (
          <Empty>Memuat persediaan...</Empty>
        ) : !filtered.length ? (
          <Empty>Belum ada produk.</Empty>
        ) : (
          <Table
            headings={[
              "Produk",
              "Fisik",
              "Direservasi",
              "Tersedia",
              "Minimum / ROP",
              ...(!readOnly ? ["Tindakan"] : []),
            ]}
          >
            {filtered.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.name}</strong>
                  <small>
                    {x.sku} · {units[x.stockUnit]}
                  </small>
                </td>
                <td>{x.currentStock}</td>
                <td>{x.reservedStock}</td>
                <td>
                  <Badge tone={Number(x.availableStock) <= 0 ? "danger" : ""}>
                    {x.availableStock}
                  </Badge>
                </td>
                <td>
                  {x.minimumStock} / {x.reorderPoint}
                </td>
                {!readOnly && (
                  <td>
                    <button
                      onClick={() => {
                        setAction("ADD_STOCK");
                        setEditing(x);
                      }}
                    >
                      Catat mutasi
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </Table>
        )}
      </section>
      <section className="panel">
        <h2>Riwayat pergerakan stok</h2>
        {!movements.length ? (
          <Empty>Belum ada pergerakan stok.</Empty>
        ) : (
          <Table
            headings={[
              "Tanggal",
              "Produk",
              "Tipe",
              "Jumlah",
              "Sebelum → Sesudah",
              "Pelaku",
              "Catatan",
            ]}
          >
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{when(m.occurredAt)}</td>
                <td>{m.product.name}</td>
                <td>{m.type}</td>
                <td>
                  {m.quantity} {units[m.product.stockUnit]}
                </td>
                <td>
                  {m.stockBefore} → {m.stockAfter}
                </td>
                <td>{m.actor.name}</td>
                <td>{m.note || m.reasonCode}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      {editing && (
        <Dialog
          title={`Mutasi ${editing.name}`}
          onClose={() => setEditing(null)}
        >
          <p className="notice">
            Fisik {editing.currentStock} · Reserved {editing.reservedStock} ·
            Tersedia {editing.availableStock} {units[editing.stockUnit]}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const body = {
                productId: editing.id,
                action,
                reasonCode: movementActions[action][1],
                note: f.get("note"),
                [action === "ADJUST_TO_PHYSICAL"
                  ? "physicalCount"
                  : "quantity"]: f.get("quantity"),
              };
              if (!window.confirm("Simpan mutasi stok dan histori ini?"))
                return;
              run(async () => {
                await mutate("/inventory/movements", body);
                setEditing(null);
                await Promise.all([refresh(), loadMovements()]);
                notify("Mutasi dan saldo stok tersimpan.");
              });
            }}
          >
            <fieldset disabled={busy}>
              <Field label="Jenis tindakan">
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  {Object.entries(movementActions).map(([k, [l]]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  action === "ADJUST_TO_PHYSICAL"
                    ? "Hasil hitung fisik"
                    : "Kuantitas"
                }
                name="quantity"
                type="number"
                step="0.001"
                min={
                  ["SET_OPENING_BALANCE", "ADJUST_TO_PHYSICAL"].includes(action)
                    ? "0"
                    : "0.001"
                }
                required
              />
              <Field label="Catatan / alasan">
                <textarea name="note" required maxLength={1000} />
              </Field>
              <button className="primary">Simpan mutasi</button>
            </fieldset>
          </form>
        </Dialog>
      )}
    </>
  );
}
export function Overview({ user }) {
  const [data, setData] = useState({});
  const { run } = useAction();
  useEffect(() => {
    run(async () => {
      const next = {};
      if (user.role !== "SALES_ADMIN")
        next.inventory = await api("/dashboards/inventory");
      if (user.role !== "STOCK_MANAGER")
        next.sales = await api("/dashboards/sales");
      setData(next);
    });
  }, [user.role, run]);
  return (
    <>
      <div className="grid">
        {data.inventory && (
          <>
            <div className="panel metric">
              <span className="muted">Produk aktif</span>
              <strong>{data.inventory.totalProducts}</strong>
            </div>
            <div className="panel metric">
              <span className="muted">Produk di bawah minimum</span>
              <strong>{data.inventory.lowStock.length}</strong>
            </div>
            <div className="panel metric">
              <span className="muted">Produk stok kosong</span>
              <strong>{data.inventory.outOfStock.length}</strong>
            </div>
          </>
        )}
        {data.sales && (
          <>
            <div className="panel metric">
              <span className="muted">Penjualan terpenuhi · 30 hari</span>
              <strong>{money(data.sales.totalSales)}</strong>
            </div>
            <div className="panel metric">
              <span className="muted">Pesanan dibuat · 30 hari</span>
              <strong>
                {data.sales.orderCounts.reduce((n, x) => n + x.count, 0)}
              </strong>
            </div>
          </>
        )}
      </div>
      {data.inventory && (
        <section className="panel">
          <h2>Ringkasan persediaan per satuan</h2>
          <Table headings={["Satuan", "Fisik", "Direservasi", "Tersedia"]}>
            {data.inventory.stockByUnit.map((x) => (
              <tr key={x.unit}>
                <td>{units[x.unit]}</td>
                <td>{x.quantity}</td>
                <td>{x.reservedQuantity}</td>
                <td>{x.availableQuantity}</td>
              </tr>
            ))}
          </Table>
          <p className="muted">
            Stok direkap terpisah sesuai satuan. Reservasi belum mengurangi stok
            fisik.
          </p>
        </section>
      )}
      {data.sales && (
        <section className="panel">
          <h2>Produk terlaris · 30 hari</h2>
          {!data.sales.bestSelling.length ? (
            <Empty>Belum ada penjualan terpenuhi pada periode ini.</Empty>
          ) : (
            <Table headings={["Produk", "Jumlah terpenuhi"]}>
              {data.sales.bestSelling.map((x) => (
                <tr key={x.productId}>
                  <td>{x.name}</td>
                  <td>
                    {x.quantity} {units[x.unit]}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      )}
      {!Object.keys(data).length && <Empty>Memuat dashboard...</Empty>}
    </>
  );
}
export function Notifications() {
  const { rows, loading, refresh } = useRows("/notifications");
  const { run, busy } = useAction();
  return (
    <section className="panel">
      <h2>Notifikasi untuk role Anda</h2>
      {loading ? (
        <Empty>Memuat notifikasi...</Empty>
      ) : !rows.length ? (
        <Empty>Belum ada notifikasi untuk role Anda.</Empty>
      ) : (
        <Table headings={["Waktu", "Pesan", "Status", "Tindakan"]}>
          {rows.map((n) => (
            <tr key={n.id}>
              <td>{when(n.createdAt)}</td>
              <td>{n.message}</td>
              <td>
                <Badge tone={!n.active ? "muted" : n.readAt ? "" : "warn"}>
                  {!n.active ? "Diarsipkan" : n.readAt ? "Dibaca" : "Baru"}
                </Badge>
              </td>
              <td>
                <button
                  disabled={busy || Boolean(n.readAt)}
                  onClick={() =>
                    run(async () => {
                      await mutate(`/notifications/${n.id}/read`, {});
                      await refresh();
                    })
                  }
                >
                  Tandai dibaca
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}
export function Reports({ role }) {
  const types =
    role === "SALES_ADMIN"
      ? ["sales"]
      : role === "STOCK_MANAGER"
        ? ["inventory", "movements", "forecast"]
        : ["inventory", "sales", "movements", "forecast"];
  const labels = {
    sales: "Penjualan",
    inventory: "Persediaan",
    movements: "Pergerakan stok",
    forecast: "Forecast",
  };
  const [type, setType] = useState(types[0]);
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { run, busy } = useAction();
  const query = () => {
    const q = new URLSearchParams();
    if (from) q.set("from", new Date(`${from}T00:00:00+07:00`).toISOString());
    if (to)
      q.set(
        "to",
        new Date(
          new Date(`${to}T00:00:00+07:00`).getTime() + 86400000,
        ).toISOString(),
      );
    return q.toString() ? `?${q}` : "";
  };
  return (
    <section className="panel">
      <h2>Laporan operasional</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => setData(await api(`/reports/${type}${query()}`)));
        }}
      >
        <fieldset disabled={busy}>
          <div className="grid" style={{ marginTop: 20 }}>
            <Field label="Jenis laporan">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setData(null);
                }}
              >
                {types.map((k) => (
                  <option key={k} value={k}>
                    {labels[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Tanggal mulai (opsional)"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setData(null);
              }}
            />
            <Field
              label="Tanggal akhir (opsional)"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setData(null);
              }}
            />
          </div>
          <div className="actions">
            <button className="primary">Tampilkan laporan</button>
            {["csv", "pdf"].map((format) => (
              <button
                key={format}
                type="button"
                onClick={() =>
                  run(async () =>
                    download(
                      await api(`/reports/${type}/export/${format}${query()}`, {
                        binary: true,
                      }),
                      `laporan-${type}.${format}`,
                    ),
                  )
                }
              >
                Unduh {format.toUpperCase()}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
      {data && (
        <div style={{ marginTop: 25 }}>
          <p className="muted">
            Periode: {when(data.period?.from)} — {when(data.period?.to)}
          </p>
          {data.truncated && (
            <p className="notice">
              Hasil mencapai batas laporan. Persempit periode untuk melihat data
              yang lebih lengkap.
            </p>
          )}
          {!data.rows?.length ? (
            <Empty>Tidak ada data pada periode ini.</Empty>
          ) : (
            <Table headings={Object.keys(data.rows[0])}>
              {data.rows.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v, j) => (
                    <td key={j}>{String(v ?? "-")}</td>
                  ))}
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}
    </section>
  );
}
export function Forecasts() {
  const { rows: products } = useRows("/products");
  const [productId, setProductId] = useState("");
  const [runs, setRuns] = useState([]);
  const [detail, setDetail] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [events, setEvents] = useState(
    Array.from({ length: 4 }, () => ({ bazaar: false, miniBazaar: false })),
  );
  const [observed, setObserved] = useState([]);
  const [restock, setRestock] = useState([]);
  const { run, busy, notify } = useAction();
  const load = useCallback(async (id) => {
    const [r, reco] = await Promise.all([
      api(`/forecasts?productId=${id}`),
      api(`/recommendations/${id}`),
    ]);
    setRuns(r);
    setRecommendation(reco);
  }, []);
  useEffect(() => {
    run(async () => setRestock(await allPages("/recommendations/restock")));
  }, [run]);
  useEffect(() => {
    if (productId) run(() => load(productId));
  }, [productId, run, load]);
  useEffect(() => {
    if (
      !productId ||
      !runs.some((x) => x.status === "RUNNING" || x.status === "QUEUED")
    )
      return;
    const timer = setInterval(() => run(() => load(productId)), 5000);
    return () => clearInterval(timer);
  }, [productId, runs, run, load]);
  return (
    <>
      <section className="panel">
        <h2>Analisis permintaan & rekomendasi</h2>
        <p className="muted">
          Hasil berasal dari histori yang diimpor atau penjualan tercatat. Data
          yang belum cukup akan ditampilkan sebagai belum tersedia.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const extra = observed.length ? { observedEvents: observed } : {};
              await mutate("/forecasts/runs", {
                productId,
                futureEvents: events,
                ...extra,
              });
              await load(productId);
              notify(
                "Permintaan analisis tersimpan. Status akan dimuat ulang.",
              );
            });
          }}
        >
          <fieldset disabled={busy}>
            <Field label="Produk">
              <select
                required
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setDetail(null);
                  setRecommendation(null);
                  setRuns([]);
                }}
              >
                <option value="">Pilih produk</option>
                {products
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <h3>Rencana event empat minggu ke depan</h3>
            <div className="grid" style={{ marginTop: 12 }}>
              {events.map((event, i) => (
                <div className="panel" key={i}>
                  <strong>Minggu {i + 1}</strong>
                  {["bazaar", "miniBazaar"].map((k) => (
                    <label className="actions" key={k}>
                      <input
                        type="checkbox"
                        checked={event[k]}
                        onChange={(e) =>
                          setEvents(
                            events.map((x, j) =>
                              j === i ? { ...x, [k]: e.target.checked } : x,
                            ),
                          )
                        }
                      />
                      {k === "bazaar" ? "Bazaar" : "Mini bazaar"}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <details>
              <summary>Lengkapi event penjualan yang belum dicatat</summary>
              <HistoricalEvents value={observed} onChange={setObserved} />
            </details>
            <div className="actions">
              <button className="primary" disabled={!productId}>
                Jalankan analisis
              </button>
              <button
                type="button"
                disabled={!productId}
                onClick={() => run(() => load(productId))}
              >
                Muat ulang hasil
              </button>
            </div>
          </fieldset>
        </form>
        {recommendation && (
          <section style={{ marginTop: 20 }}>
            <h3>Rekomendasi produk</h3>
            <Recommendation value={recommendation} />
          </section>
        )}
        {runs.length > 0 && (
          <Table headings={["Waktu", "Status", "Versi model", "Detail"]}>
            {runs.map((x) => (
              <tr key={x.id}>
                <td>{when(x.createdAt)}</td>
                <td>{x.status}</td>
                <td>{x.modelVersion}</td>
                <td>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () =>
                        setDetail(await api(`/forecasts/${x.id}`)),
                      )
                    }
                  >
                    Lihat hasil
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      <section className="panel">
        <h2>Pemantauan restock</h2>
        {!restock.length ? (
          <Empty>Belum ada rekomendasi restock yang tersedia.</Empty>
        ) : (
          restock.map((r) => (
            <div key={r.productId} style={{ marginTop: 15 }}>
              <h3>
                {products.find((p) => p.id === r.productId)?.name ||
                  r.productId}
              </h3>
              <Recommendation value={r} />
            </div>
          ))
        )}
      </section>
      {detail && (
        <Dialog title="Hasil analisis" onClose={() => setDetail(null)} wide>
          <p>
            Status: {detail.status} ·{" "}
            {when(detail.completedAt || detail.createdAt)}
          </p>
          <ForecastResult result={detail.result} />
        </Dialog>
      )}
    </>
  );
}
function Recommendation({ value }) {
  const labels = {
    analysisStatus: "Status analisis",
    generatedAt: "Dihasilkan",
    dataThrough: "Data sampai minggu",
    safetyStock: "Safety Stock",
    reorderPoint: "Reorder Point",
    currentStock: "Stok fisik",
    needsRestock: "Perlu restock",
    stale: "Perlu analisis ulang",
    recommendation: "Rekomendasi",
    message: "Keterangan",
    status: "Status",
    restockRequired: "Perlu restock",
  };
  return (
    <div className="notice" style={{ display: "block" }}>
      {Object.entries(value)
        .filter(([k, v]) => k in labels && typeof v !== "object")
        .map(([k, v]) => (
          <p key={k}>
            <strong>{labels[k]}:</strong>{" "}
            {typeof v === "boolean"
              ? v
                ? "Ya"
                : "Tidak"
              : String(v ?? "Belum tersedia")}
          </p>
        ))}
      {!value.lastSuccessfulRunId && (
        <p>
          Analisis model belum tersedia. Jangan gunakan angka simulasi sebagai
          hasil prediksi.
        </p>
      )}
    </div>
  );
}
function HistoricalEvents({ value, onChange }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p className="muted">
        Isi hanya minggu penjualan yang datanya sudah lengkap. Tanggal harus
        hari Senin. Jangan menganggap event yang belum diketahui sebagai tidak
        ada event.
      </p>
      {value.map((x, i) => (
        <div
          className="order-item"
          key={i}
          style={{ gridTemplateColumns: "1fr 1fr 1fr 40px" }}
        >
          <input
            aria-label={"Tanggal minggu historis " + (i + 1)}
            type="date"
            value={x.week}
            required
            onChange={(e) =>
              onChange(
                value.map((r, j) =>
                  j === i ? { ...r, week: e.target.value } : r,
                ),
              )
            }
          />
          {["bazaar", "miniBazaar"].map((k) => (
            <label key={k} className="actions">
              <input
                type="checkbox"
                checked={x[k]}
                onChange={(e) =>
                  onChange(
                    value.map((r, j) =>
                      j === i ? { ...r, [k]: e.target.checked } : r,
                    ),
                  )
                }
              />
              {k === "bazaar" ? "Bazaar" : "Mini bazaar"}
            </label>
          ))}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label="Hapus minggu"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...value, { week: "", bazaar: false, miniBazaar: false }])
        }
      >
        Tambah minggu
      </button>
    </div>
  );
}
function ForecastResult({ result }) {
  const reason = {
    LEAD_TIME_MISSING: "Isi lead time produk terlebih dahulu.",
    INSUFFICIENT_COVERAGE: "Cakupan histori belum cukup.",
    DATASET_INCOMPLETE: "Impor histori belum lengkap.",
    EVENTS_MISSING: "Lengkapi data event historis untuk minggu penjualan.",
    INSUFFICIENT_DATA: "Data belum cukup untuk analisis.",
    CALENDAR_GAP: "Kalender histori memiliki celah yang belum dijelaskan.",
  };
  if (!result?.forecast)
    return (
      <p className="notice">
        {reason[result?.reason] ||
          "Hasil model belum tersedia. Periksa kelengkapan histori dan parameter produk."}
      </p>
    );
  return (
    <>
      <div className="grid" style={{ marginTop: 20 }}>
        <div className="panel">
          <span className="muted">Model terpilih</span>
          <h2>{result.method === "arima" ? "ARIMA" : "Croston SBA"}</h2>
        </div>
        <div className="panel">
          <span className="muted">Safety Stock</span>
          <h2>{result.safetyStock}</h2>
        </div>
        <div className="panel">
          <span className="muted">Reorder Point</span>
          <h2>{result.reorderPoint}</h2>
        </div>
      </div>
      <h3>Prediksi empat minggu</h3>
      <Table headings={["Minggu", "Prediksi permintaan"]}>
        {result.forecast.map((x) => (
          <tr key={x.week}>
            <td>{x.week}</td>
            <td>{x.prediction}</td>
          </tr>
        ))}
      </Table>
      {result.evaluation && (
        <>
          <h3 style={{ marginTop: 20 }}>Evaluasi model</h3>
          <Table headings={["Metrik", "Model", "Baseline"]}>
            {[
              ["MAE", "mae", "baselineMae"],
              ["RMSE", "rmse", "baselineRmse"],
            ].map(([name, k, b]) => (
              <tr key={k}>
                <td>{name}</td>
                <td>{result.evaluation[k]}</td>
                <td>{result.evaluation[b]}</td>
              </tr>
            ))}
            <tr>
              <td>MAPE</td>
              <td>
                {result.evaluation.mapeMeaningful
                  ? result.evaluation.mape + "%"
                  : "Tidak representatif untuk periode ini"}
              </td>
              <td>-</td>
            </tr>
          </Table>
        </>
      )}
      {result.actualVsForecast?.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Aktual dibanding prediksi</h3>
          <Table headings={["Minggu", "Aktual", "Prediksi"]}>
            {result.actualVsForecast.map((x) => (
              <tr key={x.week}>
                <td>{x.week}</td>
                <td>{x.actual}</td>
                <td>{x.prediction}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
      <p className="notice">
        Hasil ini merupakan rekomendasi untuk membantu keputusan restock. Tinjau
        kualitas data dan kebutuhan operasional sebelum membeli.
      </p>
    </>
  );
}
