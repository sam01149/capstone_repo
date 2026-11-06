// Komponen tampilan bersama untuk semua halaman staf
import React, { useEffect, useState } from 'react';
import { LogOut, Store, X, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import './staff.css';

// ---------- Kerangka halaman staf (sidebar + topbar) ----------
export function StaffLayout({ user, roleLabel, roleColor, roleBg, menus, activeMenu, onSelectMenu, title, subtitle, actions, onLogout, onViewCatalog, children }) {
  return (
    <div className="staff-shell">
      <aside className="staff-sidebar">
        <div className="staff-brand">
          <img src="/images/logo-farm-berkah.jpg" alt="Logo Toko Farm Berkah" />
          <div>
            <div className="staff-brand-title">Toko Farm Berkah</div>
            <div className="staff-brand-sub">FarmSight · Portal Staf</div>
          </div>
        </div>

        <div className="staff-role-pill" style={{ background: roleBg, color: roleColor }}>
          {roleLabel}
        </div>

        <nav className="staff-nav">
          {menus.map((m) =>
            m.section ? (
              <div key={m.section} className="staff-nav-label">{m.section}</div>
            ) : (
              <button
                key={m.id}
                type="button"
                className={`staff-nav-item ${activeMenu === m.id ? 'active' : ''}`}
                onClick={() => onSelectMenu(m.id)}
              >
                {m.icon}
                <span>{m.label}</span>
                {m.badge > 0 && <span className="staff-nav-badge">{m.badge}</span>}
              </button>
            )
          )}
        </nav>

        <div className="staff-sidebar-footer">
          <div className="staff-user">
            <div className="staff-avatar">{user?.avatar || (user?.name || 'S').slice(0, 2).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Staf'}
              </div>
              <div className="text-sm text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onViewCatalog}>
            <Store size={14} /> Lihat Katalog Publik
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onLogout}>
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      <main className="staff-main">
        <header className="staff-topbar">
          <div>
            <div className="staff-page-title">{title}</div>
            {subtitle && <div className="staff-page-sub">{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
        </header>
        <div className="staff-content" key={activeMenu}>
          {children}
        </div>
      </main>
    </div>
  );
}

// ---------- Kartu angka ringkasan ----------
export function StatCard({ icon, label, value, hint, color = '#2d6a4f', bg = '#dcfce7', onClick }) {
  return (
    <div className="card stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ title, subtitle, onClose, children, footer, size }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sizeClass = size === 'fullscreen' ? 'modal-fullscreen' : size === 'xl' ? 'modal-xl' : size === 'lg' ? 'modal-lg' : '';

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${sizeClass}`}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Toast notifikasi ----------
export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const node = toast ? (
    <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`} key={toast.id}>
      {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
      <span>{toast.message}</span>
    </div>
  ) : null;

  // Support both array destructuring [ToastComponent, showToast] and object destructuring { toast, showToast, ToastComponent }
  const result = [node, show];
  result.node = node;
  result.show = show;
  result.showToast = show;
  result.ToastComponent = node;
  result.toast = toast;
  return result;
}

// ---------- Langkah alur proses (mengikuti flowchart) ----------
export function FlowSteps({ steps, current }) {
  return (
    <div className="flow-steps">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span className={`flow-step ${i < current ? 'done' : i === current ? 'current' : ''}`}>
            {i < current ? '✓' : i + 1}. {s}
          </span>
          {i < steps.length - 1 && <ChevronRight size={14} className="flow-arrow" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------- Kotak kosong ----------
export function EmptyState({ icon, title, desc }) {
  return (
    <div className="empty-state">
      {icon}
      <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{title}</div>
      {desc && <div style={{ marginTop: 4 }}>{desc}</div>}
    </div>
  );
}

// ---------- Hook sinkronisasi data localStorage antar halaman ----------
export function useStoreSync(arg1, arg2) {
  useEffect(() => {
    let callback = null;
    let events = [];

    if (Array.isArray(arg1)) {
      events = arg1;
      callback = typeof arg2 === 'function' ? arg2 : null;
    } else if (typeof arg1 === 'function') {
      callback = arg1;
      events = Array.isArray(arg2) ? arg2 : [];
    }

    const handler = () => {
      if (typeof callback === 'function') {
        try {
          callback();
        } catch (err) {
          console.error('Store sync callback error:', err);
        }
      }
    };

    const allEvents = ['storage', ...(Array.isArray(events) ? events : [])];
    allEvents.forEach((ev) => window.addEventListener(ev, handler));

    return () => {
      allEvents.forEach((ev) => window.removeEventListener(ev, handler));
    };
  }, [arg1, arg2]);
}

