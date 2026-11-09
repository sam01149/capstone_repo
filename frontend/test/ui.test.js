import { test, before, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
let server, App, root, container, createRoot, dom;
let requests = [];
const originalFetch = globalThis.fetch;
const user = {
  id: "admin-uat",
  name: "UAT Admin",
  role: "SUPER_ADMIN",
  mustChangePassword: false,
};
const products = [
  {
    id: "p1",
    name: "Produk Uji A",
    price: 10000,
    stockUnit: "UNIT",
    category: { id: "c1", name: "Uji Lokal" },
    availability: "AVAILABLE",
  },
  {
    id: "p2",
    name: "Produk Uji B",
    price: 15000,
    stockUnit: "UNIT",
    category: { id: "c1", name: "Uji Lokal" },
    availability: "OUT_OF_STOCK",
  },
];
const json = (data) =>
  new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json" },
  });
before(async () => {
  dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: "http://localhost:5173/#/portal" },
  );
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "HTMLInputElement",
    "Event",
    "MouseEvent",
    "FormData",
    "localStorage",
  ])
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: dom.window[key],
      writable: true,
    });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = () => {};
  ({ createRoot } = await import("react-dom/client"));
  server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true, watch: null },
    appType: "custom",
  });
  ({ default: App } = await server.ssrLoadModule("/src/App.jsx"));
});
beforeEach(() => {
  requests = [];
  window.history.replaceState({}, "", "/#/portal");
  localStorage.clear();
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    requests.push({ path, options });
    if (path.endsWith("/public/settings"))
      return json({ whatsappNumber: null, qrisImageUrl: null });
    if (path.endsWith("/auth/me")) return json({ user });
    if (path.endsWith("/dashboards/inventory"))
      return json({
        totalProducts: 2,
        lowStock: [],
        outOfStock: [],
        stockByUnit: [],
      });
    if (path.endsWith("/dashboards/sales"))
      return json({ totalSales: "0", orderCounts: [], bestSelling: [] });
    if (path.endsWith("/public/products"))
      return json({ items: products, pagination: { total: 2 } });
    if (path.endsWith("/public/order-drafts"))
      return json({
        publicCode: "FS-UAT-01",
        totalAmount: 11000,
        items: [
          {
            productId: "p1",
            name: "Produk Uji A",
            quantity: "1.000",
            stockUnit: "UNIT",
            unitPrice: 11000,
            subtotalAmount: 11000,
          },
        ],
        whatsappUrl: "https://wa.me/628000000000?text=ringkasan-server",
      });
    throw new Error("Unexpected test request " + path);
  };
  container = document.getElementById("root");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
});
after(async () => {
  globalThis.fetch = originalFetch;
  await server?.close();
  dom?.window.close();
});
const render = async () =>
  act(async () => root.render(React.createElement(App)));
const button = (text) => {
  const found = [...container.querySelectorAll("button")].find((x) =>
    x.textContent.includes(text),
  );
  assert.ok(found, "Tombol ditemukan: " + text);
  return found;
};
const click = async (element) =>
  act(async () =>
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true })),
  );
const fill = async (name, value) => {
  const input = container.querySelector(`[name="${name}"]`);
  assert.ok(input, "Input ditemukan: " + name);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};
test("awal load mengabaikan hash dan sesi mock lama lalu selalu menampilkan landing", async () => {
  localStorage.setItem("farmsight_view", "dashboard");
  localStorage.setItem("farmsight_session_user", JSON.stringify(user));
  localStorage.setItem("farmsight_jwt_token", "mock-token");
  await render();
  assert.match(container.textContent, /Olahan Segar Hasil Tani/);
  assert.equal(window.location.hash, "#/");
  assert.deepEqual(
    requests.map((x) => x.path),
    ["/api/v1/public/settings"],
  );
  assert.equal(container.querySelector(".portal"), null);
});
test("sesi server hanya membuka portal setelah klik staf dan remount tetap landing", async () => {
  await render();
  await click(button("Masuk Staf"));
  assert.ok(container.querySelector(".portal"));
  assert.match(container.textContent, /UAT Admin/);
  await act(async () => root.unmount());
  root = createRoot(container);
  await render();
  assert.equal(window.location.hash, "#/");
  assert.equal(container.querySelector(".portal"), null);
  assert.match(container.textContent, /Olahan Segar Hasil Tani/);
});
test("katalog mengambil data server, menolak tambah stok habis dan memakai ringkasan harga terbaru", async () => {
  await render();
  await click(button("Lihat Katalog"));
  assert.match(container.textContent, /Produk Uji A/);
  const cards = [...container.querySelectorAll(".product-card")];
  assert.equal(cards.length, 2);
  assert.equal(cards[1].querySelector("button.primary").disabled, true);
  await click(cards[0].querySelector("button.primary"));
  await click(button("Keranjang (1)"));
  await fill("customerName", "Pelanggan UAT");
  await fill("customerPhone", "080000000000");
  const form = container.querySelector('[role="dialog"] form');
  await act(async () =>
    form.dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  assert.match(container.textContent, /FS-UAT-01/);
  const link = [...container.querySelectorAll("a")].find((x) =>
    x.href.includes("wa.me"),
  );
  assert.equal(link.href, "https://wa.me/628000000000?text=ringkasan-server");
  const call = requests.find((x) => x.path.endsWith("/public/order-drafts"));
  assert.deepEqual(JSON.parse(call.options.body).items, [
    { productId: "p1", quantity: "1" },
  ]);
  assert.equal(JSON.parse(call.options.body).totalAmount, undefined);
  assert.match(container.textContent, /11\.000/);
});
test("server tidak dapat dihubungi menghasilkan pesan yang dapat ditindaklanjuti", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("network");
  };
  await render();
  assert.match(
    container.querySelector('[role="alert"]').textContent,
    /Tidak dapat menghubungi server/,
  );
  assert.match(container.textContent, /Olahan Segar Hasil Tani/);
});
