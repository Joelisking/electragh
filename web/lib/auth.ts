import axios from 'axios';

// Token storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Get token from localStorage
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

// Save tokens to localStorage and cookies
export const saveTokens = (
  accessToken: string,
  refreshToken: string
): void => {
  if (typeof window === 'undefined') return;

  // Save to localStorage
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  // Also set cookies for middleware compatibility
  document.cookie = `accessToken=${accessToken}; path=/; max-age=3600; SameSite=Strict`;
  document.cookie = `refreshToken=${refreshToken}; path=/; max-age=86400; SameSite=Strict`;
};

// Clear tokens from localStorage and cookies
export const clearTokens = (): void => {
  if (typeof window === 'undefined') return;

  // Clear from localStorage
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  // Clear cookies
  document.cookie =
    'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie =
    'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

// Set up axios interceptor to automatically add authorization header
export const setupAxiosInterceptors = (
  axiosInstance = axios
): void => {
  // Request interceptor to add auth header
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token refresh
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // If the error is 401 and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            // Try to refresh the token
            const response = await axiosInstance.post(
              '/auth/refresh',
              {
                refreshToken,
              }
            );

            const { accessToken, refreshToken: newRefreshToken } =
              response.data;

            // Save new tokens
            saveTokens(accessToken, newRefreshToken);

            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axiosInstance(originalRequest);
          }
        } catch {
          // If refresh fails, clear tokens and redirect to login
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }

      return Promise.reject(error);
    }
  );
};
