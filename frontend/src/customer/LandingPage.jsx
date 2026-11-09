import React from "react";
import { ShoppingBag, LogIn, ArrowRight, MapPin } from "lucide-react";

export function LandingPage({
  onGoToCatalog,
  onGoToLogin,
  onOpenCatalog,
  onOpenLogin,
}) {
  const handleCatalog = onGoToCatalog || onOpenCatalog;
  const handleLogin = onGoToLogin || onOpenLogin;
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        background:
          "radial-gradient(ellipse at top, #2d6a4f 0%, #1b4332 45%, #0d281e 100%)",
        color: "#ffffff",
        padding: "32px 24px 28px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Main Centered Hero */}
      <main
        style={{
          width: "100%",
          maxWidth: "820px",
          textAlign: "center",
          margin: "auto 0",
          padding: "40px 16px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2.3rem, 5.5vw, 3.6rem)",
            fontWeight: 900,
            lineHeight: 1.15,
            margin: "0 0 24px",
            letterSpacing: "-0.03em",
            color: "#ffffff",
            textShadow: "0 2px 12px rgba(0, 0, 0, 0.25)",
          }}
        >
          Olahan Segar Hasil Tani Kebun Pulo Gebang
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "#d8f3dc",
            lineHeight: 1.7,
            margin: "0 auto 42px",
            maxWidth: "680px",
            fontWeight: 400,
            opacity: 0.95,
          }}
        >
          Selamat datang di Toko Farm Berkah. Nikmati aneka keripik labu madu,
          permen dan cokelat lidah buaya, serta minuman herbal bunga telang
          alami tanpa pengawet.
        </p>

        {/* TWO MAIN DOORS: Tujuan Aksesnya? */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Door 1: Guest / Customer -> Katalog */}
          <button
            type="button"
            onClick={handleCatalog}
            id="btn-lihat-katalog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "16px 34px",
              borderRadius: "14px",
              backgroundColor: "#52b788",
              color: "#081c15",
              fontSize: "1.02rem",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(82, 183, 136, 0.4)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#74c69d";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 14px 28px rgba(82, 183, 136, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#52b788";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow =
                "0 10px 25px rgba(82, 183, 136, 0.4)";
            }}
          >
            <ShoppingBag size={20} />
            <span>Lihat Katalog Produk</span>
            <ArrowRight size={18} />
          </button>

          {/* Door 2: Staff -> Login */}
          <button
            type="button"
            onClick={handleLogin}
            id="btn-masuk-staf"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "16px 30px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              color: "#ffffff",
              fontSize: "1.02rem",
              fontWeight: 700,
              border: "1.5px solid rgba(255, 255, 255, 0.28)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.45)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.28)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <LogIn size={20} />
            <span>Masuk Staf Internal</span>
          </button>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer
        style={{
          width: "100%",
          maxWidth: "840px",
          paddingTop: "20px",
          borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "0.8rem",
          color: "#95d5b2",
          opacity: 0.85,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={14} color="#74c69d" />
          <span>Komplek Masnaga, Pulo Gebang, Jakarta Timur</span>
        </div>
        <div>&copy; 2026 Toko Farm Berkah · Seluruh Hak Cipta Dilindungi</div>
      </footer>
    </div>
  );
}

export default LandingPage;
