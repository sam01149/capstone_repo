import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Tampilan belum dapat dimuat</h1>
          <p>
            Silakan muat ulang halaman. Jika masalah berulang, hubungi pengelola
            FarmSight.
          </p>
          <button onClick={() => window.location.reload()}>
            Muat ulang halaman
          </button>
        </section>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
