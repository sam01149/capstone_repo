// FarmSight API Client Layer
// Designed to mimic Axios / Fetch RESTful client connecting to NestJS Backend.
// To connect to real backend later: set USE_REAL_BACKEND = true and specify API_BASE_URL.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
export const USE_REAL_BACKEND = false; // Toggle to true when NestJS + PostgreSQL is connected

// Helper: Simulated latency to mimic network roundtrip and loading states
export const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Get JWT token from storage
export function getAuthToken() {
  return localStorage.getItem('farmsight_jwt_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('farmsight_jwt_token', token);
  } else {
    localStorage.removeItem('farmsight_jwt_token');
  }
}

// REST wrapper
export async function request(endpoint, options = {}) {
  if (USE_REAL_BACKEND) {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }
  // When mock mode, caller service handles simulated response
  await delay();
  return null;
}

