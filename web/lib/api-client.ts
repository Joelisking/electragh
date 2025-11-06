import axios from 'axios';

// Create a custom axios instance with base URL from environment
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (only in browser)
    if (typeof window !== 'undefined') {
      // Check for both voter token and admin token
      const voterToken = localStorage.getItem('voting-token');
      const adminToken = localStorage.getItem('admin-token');
      const token = adminToken || voterToken;


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

// // Add response interceptor to handle auth errors
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Clear auth data and redirect to login
//       if (typeof window !== 'undefined') {
//         localStorage.removeItem('voting-user');
//         localStorage.removeItem('voting-token');
//         window.location.href = '/login';
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// Orval mutator function - this is what Orval expects
export const mutator = async <T>(config: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  params?: any;
}): Promise<T> => {
  const response = await apiClient({
    url: config.url,
    method: config.method,
    headers: config.headers,
    data: config.data,
    params: config.params,
  });
  return response.data;
};

export default apiClient;
