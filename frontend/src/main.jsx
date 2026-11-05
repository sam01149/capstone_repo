import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FarmSight Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8faf9',
            padding: '24px',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            color: '#1b4332',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d8e2da',
              borderRadius: '16px',
              padding: '36px',
              maxWidth: '520px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🌱</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#142019', marginBottom: '8px' }}>
              Memperbarui Tampilan Farm Berkah
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
              Sistem telah diperbarui. Silakan muat ulang halaman untuk membuka tampilan penuh Toko Farm Berkah.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#2d6a4f',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
