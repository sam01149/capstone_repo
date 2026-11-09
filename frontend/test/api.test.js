import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { api, mutate, allPages } from "../src/services/api.js";
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.document = { cookie: "farmsight_csrf=csrf-demo" };
});
after(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.document;
});
const response = (data, status = 200) =>
  new Response(JSON.stringify(status < 400 ? { data } : { error: data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("mengirim cookie dan CSRF serta membuka response envelope", async () => {
  let call;
  globalThis.fetch = async (url, options) => {
    call = { url, options };
    return response({ id: "saved" });
  };
  assert.deepEqual(
    await api("/orders", {
      method: "POST",
      body: { action: "CONFIRM" },
      key: "key-test",
    }),
    { id: "saved" },
  );
  assert.equal(call.options.credentials, "include");
  assert.equal(call.options.headers["X-CSRF-Token"], "csrf-demo");
  assert.equal(call.options.headers["Idempotency-Key"], "key-test");
  assert.equal(call.url, "http://localhost:3000/api/v1/orders");
  assert.equal(call.options.headers.Authorization, undefined);
});
test("menampilkan detail validasi aman dari server", async () => {
  globalThis.fetch = async () =>
    response(
      {
        code: "VALIDATION_ERROR",
        message: "Data tidak valid.",
        details: ["Kuantitas wajib positif."],
      },
      400,
    );
  await assert.rejects(
    api("/products"),
    (error) =>
      error.status === 400 &&
      error.message.includes("Kuantitas wajib positif."),
  );
});
test("refresh bersamaan dijalankan sekali dan retry mempertahankan kunci mutation", async () => {
  let refresh = 0;
  const counts = new Map();
  const seen = [];
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/auth/refresh")) {
      refresh++;
      await new Promise((r) => setTimeout(r, 5));
      return response({ csrfToken: "rotated" });
    }
    const count = counts.get(url) || 0;
    counts.set(url, count + 1);
    seen.push(options.headers["Idempotency-Key"]);
    return count === 0
      ? response({ message: "Sesi kedaluwarsa." }, 401)
      : response({ ok: true });
  };
  await Promise.all([
    api("/orders/one", { method: "POST", key: "one" }),
    api("/orders/two", { method: "POST", key: "two" }),
  ]);
  assert.equal(refresh, 1);
  assert.equal(seen.filter((x) => x === "one").length, 2);
  assert.equal(seen.filter((x) => x === "two").length, 2);
});
test("retry setelah koneksi putus mempertahankan idempotency key", async () => {
  const keys = [];
  let first = true;
  globalThis.fetch = async (_url, options) => {
    keys.push(options.headers["Idempotency-Key"]);
    if (first) {
      first = false;
      throw new TypeError("network");
    }
    return response({ id: 1 });
  };
  await assert.rejects(
    mutate("/public/order-drafts", {
      items: [{ productId: "one", quantity: "1" }],
    }),
  );
  await mutate("/public/order-drafts", {
    items: [{ productId: "one", quantity: "1" }],
  });
  assert.equal(keys[0], keys[1]);
});
test("membaca seluruh pagination tanpa fallback mock", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return response({ items: [{ id: calls }], pagination: { total: 2 } });
  };
  assert.deepEqual(await allPages("/products"), [{ id: 1 }, { id: 2 }]);
  assert.equal(calls, 2);
});
test("refresh gagal tidak mengulangi mutation", async () => {
  let mutations = 0;
  globalThis.fetch = async (url) => {
    if (!url.endsWith("/auth/refresh")) mutations++;
    return response({ message: "Masuk kembali." }, 401);
  };
  await assert.rejects(
    api("/inventory/movements", { method: "POST", key: "immutable" }),
    /Masuk kembali/,
  );
  assert.equal(mutations, 1);
});
