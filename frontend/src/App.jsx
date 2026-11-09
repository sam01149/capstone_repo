import React, { useCallback, useEffect, useState } from "react";
import {
  Leaf,
  ShoppingBag,
  LogOut,
  LayoutDashboard,
  Package,
  Users,
  ClipboardList,
  ArrowDownToLine,
  Bell,
  ChartNoAxesCombined,
  FileText,
  Menu,
  X,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { LandingPage } from "./customer/LandingPage";
import { api, mutate, roles } from "./services/api";
import "./integration.css";
import { Feedback, useAction } from "./integration/feedback";
import { Field, Dialog } from "./integration/ui";
import { Catalog } from "./integration/Catalog";
import { Orders } from "./integration/Orders";
import {
  Products,
  UsersPage,
  Inventory,
  Forecasts,
  Reports,
  Overview,
  Notifications,
} from "./integration/Operations";

function Login({ onLogin, onBack, settings }) {
  const { busy, run } = useAction();
  const [forgot, setForgot] = useState(false);
  return (
    <div className="auth-page">
      <section className="auth-card">
        <button className="link" onClick={onBack}>
          <ArrowLeft size={16} /> Halaman utama
        </button>
        <div className="brand">
          <Leaf /> FarmSight
        </div>
        <h1>{forgot ? "Bantuan lupa kata sandi" : "Masuk Portal Staf"}</h1>
        <p className="muted">Toko Farm Berkah · Sistem operasional internal</p>
        {forgot ? (
          <>
            <p>
              Hubungi Super Admin untuk verifikasi identitas dan penggantian
              kata sandi.
            </p>
            {settings.whatsappNumber ? (
              <a
                className="button"
                href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent("Halo, saya staf FarmSight dan membutuhkan bantuan reset kata sandi. Nama dan email saya: ")}`}
                target="_blank"
                rel="noreferrer"
              >
                Minta bantuan melalui WhatsApp toko
              </a>
            ) : (
              <p>
                Kontak WhatsApp belum dikonfigurasi. Hubungi Super Admin secara
                langsung.
              </p>
            )}
            <button onClick={() => setForgot(false)}>Kembali ke login</button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run(() => onLogin(f.get("email"), f.get("password")));
            }}
          >
            <fieldset disabled={busy}>
              <Field
                label="Email staf"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
              />
              <Field
                label="Kata sandi"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={16}
              />
              <button className="primary full" type="submit">
                {busy ? "Memeriksa..." : "Masuk"}
              </button>
              <button
                type="button"
                className="link"
                onClick={() => setForgot(true)}
              >
                Lupa kata sandi?
              </button>
            </fieldset>
          </form>
        )}
      </section>
    </div>
  );
}
function ChangePassword({ onClose, onChanged }) {
  const { busy, run } = useAction();
  return (
    <Dialog title="Ganti kata sandi" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(async () => {
            if (f.get("newPassword") !== f.get("confirm"))
              throw new Error("Konfirmasi kata sandi belum sama.");
            await mutate("/auth/change-password", {
              currentPassword: f.get("currentPassword"),
              newPassword: f.get("newPassword"),
            });
            onChanged();
          });
        }}
      >
        <fieldset disabled={busy}>
          <Field
            label="Kata sandi sekarang"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <Field
            label="Kata sandi baru (8–16 karakter)"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={16}
            required
          />
          <Field
            label="Ulangi kata sandi baru"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={16}
            required
          />
          <button className="primary">Simpan dan masuk ulang</button>
        </fieldset>
      </form>
    </Dialog>
  );
}
const nav = [
  [
    "overview",
    "Dashboard",
    LayoutDashboard,
    ["SUPER_ADMIN", "STOCK_MANAGER", "SALES_ADMIN"],
  ],
  ["products", "Manajemen Produk", Package, ["SUPER_ADMIN"]],
  ["users", "Manajemen Akun", Users, ["SUPER_ADMIN"]],
  [
    "catalog",
    "Katalog Staf",
    ShoppingBag,
    ["SUPER_ADMIN", "STOCK_MANAGER", "SALES_ADMIN"],
  ],
  [
    "orders",
    "Pesanan Pelanggan",
    ClipboardList,
    ["SUPER_ADMIN", "SALES_ADMIN"],
  ],
  [
    "inventory",
    "Persediaan & Mutasi",
    ArrowDownToLine,
    ["SUPER_ADMIN", "STOCK_MANAGER", "SALES_ADMIN"],
  ],
  [
    "forecast",
    "Analisis & Restock",
    ChartNoAxesCombined,
    ["SUPER_ADMIN", "STOCK_MANAGER"],
  ],
  [
    "reports",
    "Laporan",
    FileText,
    ["SUPER_ADMIN", "STOCK_MANAGER", "SALES_ADMIN"],
  ],
  [
    "notifications",
    "Notifikasi",
    Bell,
    ["SUPER_ADMIN", "STOCK_MANAGER", "SALES_ADMIN"],
  ],
];
function Portal({ user, onLogout, onHome, settings }) {
  const [tab, setTab] = useState("overview");
  const [change, setChange] = useState(false);
  const [dismiss, setDismiss] = useState(false);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((x) => x + 1);
  const { busy, run, notify } = useAction();
  const allowed = nav.filter((x) => x[3].includes(user.role));
  const title = allowed.find((x) => x[0] === tab)?.[1] || "Dashboard";
  const body = {
    overview: <Overview user={user} />,
    products: <Products />,
    users: <UsersPage />,
    catalog: <Inventory readOnly />,
    inventory: <Inventory readOnly={user.role === "SALES_ADMIN"} />,
    orders: <Orders settings={settings} />,
    forecast: <Forecasts />,
    reports: <Reports role={user.role} />,
    notifications: <Notifications />,
  }[tab];
  return (
    <div className="portal">
      <aside className={open ? "sidebar opened" : "sidebar"}>
        <button className="brand" onClick={onHome}>
          <Leaf /> FarmSight
        </button>
        <p className="sidebar-caption">PORTAL OPERASIONAL</p>
        <nav>
          {allowed.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => {
                setTab(key);
                setOpen(false);
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <strong>Toko Farm Berkah</strong>
          <small>Persediaan terhubung, keputusan terarah.</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile"
            aria-label="Menu navigasi"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <div>
            <strong>{roles[user.role]}</strong>
            <small>{user.name}</small>
          </div>
          <div className="actions">
            <button onClick={() => setChange(true)}>Ganti kata sandi</button>
            <button
              disabled={busy}
              onClick={() => {
                if (window.confirm("Keluar dari portal staf?")) run(onLogout);
              }}
            >
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                FARMSIGHT / {roles[user.role].toUpperCase()}
              </p>
              <h1>{title}</h1>
              <p className="muted">
                Kelola operasional Toko Farm Berkah dalam satu tempat.
              </p>
            </div>
            <button onClick={refresh}>
              <RefreshCw size={16} /> Muat ulang
            </button>
          </div>
          {user.mustChangePassword && !dismiss && (
            <div className="notice">
              <span>
                Super Admin telah mereset kata sandi Anda. Disarankan
                menggantinya.
              </span>
              <button onClick={() => setChange(true)}>Ganti sekarang</button>
              <button
                aria-label="Tutup pengingat"
                onClick={() => setDismiss(true)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div key={`${tab}-${revision}`}>{body}</div>
        </main>
      </div>
      {change && (
        <ChangePassword
          onClose={() => setChange(false)}
          onChanged={() => {
            notify("Kata sandi diperbarui. Silakan masuk kembali.");
            onLogout();
          }}
        />
      )}
    </div>
  );
}
export default function App() {
  const [view, setView] = useState("landing");
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState({});
  const navigate = (view) => {
    setView(view);
    window.history.pushState(
      { view },
      "",
      `#/${view === "landing" ? "" : view}`,
    );
    window.scrollTo(0, 0);
  };
  const notify = useCallback(
    (message, tone = "success") => setToast({ message, tone, id: Date.now() }),
    [],
  );
  useEffect(() => {
    window.history.replaceState(
      { view: "landing" },
      "",
      `${window.location.pathname}${window.location.search}#/`,
    );
    const controller = new AbortController();
    api("/public/settings", { signal: controller.signal })
      .then(setSettings)
      .catch((error) => {
        if (error.name !== "AbortError") notify(error.message, "error");
      });
    const pop = () => {
      const next = window.location.hash.slice(2);
      setView(["catalog", "login", "portal"].includes(next) ? next : "landing");
    };
    const expired = () => {
      setUser(null);
    };
    window.addEventListener("popstate", pop);
    window.addEventListener("hashchange", pop);
    window.addEventListener("farmsight_session_expired", expired);
    return () => {
      controller.abort();
      window.removeEventListener("popstate", pop);
      window.removeEventListener("hashchange", pop);
      window.removeEventListener("farmsight_session_expired", expired);
    };
  }, [notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  const enter = async () => {
    try {
      let result;
      try {
        result = await api("/auth/me");
      } catch (error) {
        if (error.status !== 401) throw error;
        result = await mutate("/auth/refresh");
      }
      setUser(result.user);
      navigate("portal");
    } catch {
      navigate("login");
    }
  };
  const logout = async () => {
    await mutate("/auth/logout");
    setUser(null);
    navigate("landing");
  };
  return (
    <Feedback.Provider value={notify}>
      {view === "landing" ? (
        <LandingPage
          onGoToCatalog={() => navigate("catalog")}
          onGoToLogin={enter}
        />
      ) : view === "catalog" ? (
        <Catalog onBack={() => navigate("landing")} onLogin={enter} />
      ) : view === "portal" && user ? (
        <Portal
          user={user}
          settings={settings}
          onHome={() => navigate("landing")}
          onLogout={logout}
        />
      ) : (
        <Login
          onBack={() => navigate("landing")}
          settings={settings}
          onLogin={async (email, password) => {
            const result = await mutate("/auth/login", { email, password });
            setUser(result.user);
            navigate("portal");
          }}
        />
      )}
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          className={`toast ${toast.tone}`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Tutup pesan">
            <X size={18} />
          </button>
        </div>
      )}
    </Feedback.Provider>
  );
}
