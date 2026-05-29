import { useEffect, useState, useRef } from "react";

/**
 * Lightweight Vercel-compatible useSWR hook for Polling-based Realtime Synchronization.
 * Useful in Serverless runtimes like Vercel where WebSockets / Socket.io are not supported.
 */
export function useSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { refreshInterval?: number }
) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<any>(undefined);
  const [isValidating, setIsValidating] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;

    const execute = async () => {
      if (!active) return;
      setIsValidating(true);
      try {
        const result = await fetcherRef.current();
        if (active) {
          setData(result);
          setError(undefined);
        }
      } catch (err: any) {
        if (active) {
          setError(err);
          // ONLY redirect to login if status is 401 (session expired).
          // For 403 (Forbidden), we just throw/handle the error without redirecting.
          if (err?.status === 401) {
            if (typeof window !== "undefined") {
              window.location.href = "/login";
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

    if (options?.refreshInterval) {
      const timer = setInterval(execute, options.refreshInterval);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }

    return () => {
      active = false;
    };
  }, [key, options?.refreshInterval]);

  const mutate = async () => {
    setIsValidating(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(undefined);
      return result;
    } catch (err) {
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
