import axios from 'axios';

// Create a custom axios instance with base URL from environment
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

// Add request interceptor (no longer needed for token attachment - cookies handle it)
// Keeping this for potential future use (e.g., request logging, custom headers)
apiClient.interceptors.request.use(
  (config) => {
    // Cookies are automatically sent via withCredentials
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to refresh the token
      try {
        await apiClient.post('/api/auth/refresh');
        // If refresh succeeds, retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear auth data and redirect
        if (typeof window !== 'undefined') {
          // Show user-friendly message
          const toast = (window as any).toast;
          if (toast) {
            toast.error('Session expired. Please log in again.');
          }

          // Clear all auth-related localStorage items
          localStorage.removeItem('voting-auth');
          localStorage.removeItem('admin-user');

          // Trigger auth context logout event
          window.dispatchEvent(new CustomEvent('auth:logout'));

          // Small delay to allow toast to show
          setTimeout(() => {
            // Redirect based on current path
            const currentPath = window.location.pathname;
            if (currentPath.startsWith('/admin')) {
              window.location.href = '/admin/login';
            } else {
              window.location.href = '/auth';
            }
          }, 1000);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Orval mutator function - this is what Orval expects
export const mutator = async <T>(config: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  params?: any;
  signal?: AbortSignal;
}): Promise<T> => {
  const response = await apiClient({
    url: config.url,
    method: config.method,
    headers: config.headers,
    data: config.data,
    params: config.params,
    signal: config.signal,
  });
  return response.data;
};

export default apiClient;
