import axios from 'axios';

// Create a separate admin API client
export const adminApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include admin auth token
adminApiClient.interceptors.request.use(
  (config) => {
    // Get admin token from localStorage (only in browser)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin-token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle admin auth errors
adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear admin auth data and redirect to admin login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin-user');
        localStorage.removeItem('admin-token');
        localStorage.removeItem('admin-refresh-token');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Admin API mutator function for Orval-generated functions
export const adminMutator = async <T>(config: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  params?: any;
}): Promise<T> => {
  const response = await adminApiClient({
    url: config.url,
    method: config.method,
    headers: config.headers,
    data: config.data,
    params: config.params,
  });
  return response.data;
};

export default adminApiClient;