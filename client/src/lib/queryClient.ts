import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export type HttpMethod = 'GET'|'POST'|'PATCH'|'DELETE';

export const apiRequest = async (url: string, options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; data?: any; headers?: Record<string, string>; } = {}) => {
  const { method = 'GET', data, headers = {} } = options;
  const token = localStorage.getItem('token');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Only add Authorization header if we have a valid token
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  // Remove leading /api if it exists to avoid double /api
  const cleanUrl = url.startsWith('/api') ? url : `/api${url}`;
  const response = await fetch(cleanUrl, config);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If we can't parse error as JSON, use the status text
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result;
};

export type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});