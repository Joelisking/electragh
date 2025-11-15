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

// Add request interceptor to attach token from localStorage as fallback
apiClient.interceptors.request.use(
  (config) => {
    // Cookies are automatically sent via withCredentials
    // But also send token in Authorization header as fallback for mobile devices
    if (typeof window !== 'undefined') {
      const votingToken = localStorage.getItem('voting-token');
      const adminToken = localStorage.getItem('admin-token');

      // For voting routes, use voting token
      if (config.url?.includes('/voting') && votingToken) {
        config.headers.Authorization = `Bearer ${votingToken}`;
      }
      // For admin routes, use admin token
      else if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    }
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

      // Check if this is a voting route - voters don't have refresh tokens
      const isVotingRoute = originalRequest.url?.includes('/voting');

      if (isVotingRoute) {
        // For voting routes, just clear auth and redirect - no refresh attempt
        if (typeof window !== 'undefined') {
          const toast = (window as any).toast;
          if (toast) {
            toast.error('Session expired. Please log in again.');
          }

          localStorage.removeItem('voting-auth');
          localStorage.removeItem('voting-token');
          window.dispatchEvent(new CustomEvent('auth:logout'));

          setTimeout(() => {
            window.location.href = '/auth';
          }, 1000);
        }
      } else {
        // For admin routes, try to refresh the token
        try {
          await apiClient.post('/api/auth/refresh');
          // If refresh succeeds, retry the original request
          return apiClient(originalRequest);
        } catch (refreshError) {
          // If refresh fails, clear auth data and redirect
          if (typeof window !== 'undefined') {
            const toast = (window as any).toast;
            if (toast) {
              toast.error('Session expired. Please log in again.');
            }

            localStorage.removeItem('admin-user');
            localStorage.removeItem('admin-token');
            localStorage.removeItem('admin-refresh-token');

            setTimeout(() => {
              window.location.href = '/admin/login';
            }, 1000);
          }
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
