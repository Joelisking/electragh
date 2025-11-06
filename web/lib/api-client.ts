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
