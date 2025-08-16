import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export type HttpMethod = 'GET'|'POST'|'PATCH'|'DELETE';

export async function apiRequest(
  url: string,
  opts: { method?: HttpMethod; data?: any } = {}
) {
  const method = opts.method ?? 'GET';
  const data = opts.data;
  const res = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${method} ${url}`);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
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

export async function apiRequest(url: string, method: "GET"|"POST"|"PUT"|"DELETE" = "GET", data?: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    console.error("API request failed:", { url, method, status: res.status, body });
    throw new Error(body?.details?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}