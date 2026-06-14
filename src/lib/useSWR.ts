import { useEffect, useState, useRef } from "react";

/**
 * Lightweight Vercel-compatible useSWR hook for Polling-based Realtime Synchronization.
 * Useful in Serverless runtimes like Vercel where WebSockets / Socket.io are not supported.
 */
const globalCache = new Map<string, { data: any; timestamp: number }>();

export function useSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
  } = {}
) {
  const dedupingInterval = options.dedupingInterval ?? 30000; // default to 30s if not specified

  const [data, setData] = useState<T | undefined>(() => {
    if (key && globalCache.has(key)) {
      const cached = globalCache.get(key);
      if (cached && Date.now() - cached.timestamp < dedupingInterval) {
        return cached.data;
      }
    }
    return undefined;
  });
  const [error, setError] = useState<any>(undefined);
  // Only show validating loader if we don't have initial cached data
  const [isValidating, setIsValidating] = useState(!data && !!key);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!key) return;
    let active = true;

    const execute = async (force = false) => {
      if (!active) return;

      // Deduplicate requests if not forced
      if (!force) {
        const cached = globalCache.get(key);
        if (cached && Date.now() - cached.timestamp < dedupingInterval) {
          setData(cached.data);
          setError(undefined);
          setIsValidating(false);
          return;
        }
      }

      setIsValidating(true);
      try {
        const result = await fetcherRef.current();
        if (active) {
          setData(result);
          setError(undefined);
          globalCache.set(key, { data: result, timestamp: Date.now() });
        }
      } catch (err: any) {
        if (active) {
          setError(err);
          // Standardized 401 Unauthorized handling
          if (err?.status === 401 || err?.message?.includes("401")) {
            if (typeof window !== "undefined") {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = "/login?error=session_expired";
            }
          }
        }
      } finally {
        if (active) {
          setIsValidating(false);
        }
      }
    };

    execute();

    let timer: NodeJS.Timeout | null = null;
    if (options?.refreshInterval) {
      timer = setInterval(() => execute(true), options.refreshInterval);
    }

    // Handle focus revalidation if enabled
    const handleFocus = () => {
      if (options.revalidateOnFocus !== false) {
        execute(false); // check deduping interval on focus
      }
    };

    if (options.revalidateOnFocus !== false && typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      active = false;
      if (timer) {
        clearInterval(timer);
      }
      if (options.revalidateOnFocus !== false && typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
    };
  }, [key, options?.refreshInterval, options.revalidateOnFocus, dedupingInterval]);

  const mutate = async () => {
    setIsValidating(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(undefined);
      if (key) {
        globalCache.set(key, { data: result, timestamp: Date.now() });
      }
      return result;
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes("401")) {
        if (typeof window !== "undefined") {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/login?error=session_expired";
        }
      }
      setError(err);
      throw err;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    data,
    error,
    isValidating,
    mutate
  };
}
