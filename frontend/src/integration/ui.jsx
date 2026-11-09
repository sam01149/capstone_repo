import React, { useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Empty({ children = "Belum ada data." }) {
  return <p className="empty">{children}</p>;
}
export function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    const controls = () =>
      [...node.querySelectorAll("button,input,select,textarea,a[href]")].filter(
        (x) => !x.disabled,
      );
    (controls()[0] || node).focus();
    const keys = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const list = controls();
        const first = list[0];
        const last = list.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    node.addEventListener("keydown", keys);
    return () => {
      node.removeEventListener("keydown", keys);
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay">
      <section
        ref={ref}
        className={`dialog ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="section-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Tutup">
            <X size={22} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Table({ headings, children }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headings.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Badge({ children, tone = "" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Cari nama atau kode...",
}) {
  return (
    <label className="search">
      <Search size={18} />
      <input
        aria-label="Cari"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
