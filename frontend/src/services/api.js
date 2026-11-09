export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
let refreshing;
function csrf() {
  return globalThis.document?.cookie
    ?.split("; ")
    .find((x) => x.startsWith("farmsight_csrf="))
    ?.split("=")
    .slice(1)
    .join("=");
}
export async function api(
  path,
  { method = "GET", body, key, binary = false, retry = true, signal } = {},
) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include",
      signal,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" && csrf()
          ? { "X-CSRF-Token": decodeURIComponent(csrf()) }
          : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.",
    );
  }
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    refreshing ??= api("/auth/refresh", {
      method: "POST",
      retry: false,
    }).finally(() => {
      refreshing = null;
    });
    await refreshing;
    return api(path, { method, body, key, binary, retry: false, signal });
  }
  if (binary && response.ok) return response.blob();
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401)
      globalThis.window?.dispatchEvent(new Event("farmsight_session_expired"));
    const error = new Error(
      value.error?.message ||
        value.message ||
        `Permintaan gagal (${response.status}).`,
    );
    if (Array.isArray(value.error?.details) && value.error.details.length)
      error.message += " " + value.error.details.join(" ");
    error.code = value.error?.code;
    error.status = response.status;
    throw error;
  }
  return value.data;
}
const pendingKeys = new Map();
export async function mutate(path, body, method = "POST", key) {
  const signature = JSON.stringify([method, path, body]);
  key ??= pendingKeys.get(signature) ?? crypto.randomUUID();
  pendingKeys.set(signature, key);
  try {
    const result = await api(path, { method, body, key });
    pendingKeys.delete(signature);
    if (path === "/auth/login" || path === "/auth/logout") pendingKeys.clear();
    return result;
  } catch (error) {
    if (error.status && error.status < 500) pendingKeys.delete(signature);
    throw error;
  }
}
export async function allPages(path) {
  const items = [];
  let page = 1;
  while (true) {
    const value = await api(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=100`,
    );
    items.push(...value.items);
    const total = value.pagination?.total ?? value.total ?? items.length;
    if (items.length >= total || !value.items.length) return items;
    page++;
  }
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const money = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
export const when = (value) =>
  value ? new Date(value).toLocaleString("id-ID") : "-";
export const roles = {
  SUPER_ADMIN: "Super Admin",
  STOCK_MANAGER: "Stock Manager",
  SALES_ADMIN: "Sales Admin",
};
export const units = {
  UNIT: "Unit",
  PACK: "Pak",
  BOX: "Kotak",
  BOTTLE: "Botol",
  SACK: "Karung",
  KG: "Kilogram",
  GRAM: "Gram",
  LITER: "Liter",
  MILLILITER: "Mililiter",
};
