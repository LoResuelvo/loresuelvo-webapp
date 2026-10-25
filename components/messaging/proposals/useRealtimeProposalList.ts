import { useCallback, useEffect, useRef, useState } from "react";
import { useResourceUpdate } from "@/infrastructure/notifications/NotificationContext";

export function useRealtimeProposalList<T>(
  initialItems: T[],
  loadItems: () => Promise<T[]>,
  initialLoadFailed = false
) {
  const [items, setItems] = useState(initialItems);
  const [refreshError, setRefreshError] = useState(initialLoadFailed);
  const [hasLoaded, setHasLoaded] = useState(!initialLoadFailed);
  const requestGenerationRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    requestGenerationRef.current += 1;
    setItems(initialItems);
    setRefreshError(initialLoadFailed);
    setHasLoaded(!initialLoadFailed);
  }, [initialItems, initialLoadFailed]);

  const refresh = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current;
    try {
      const updatedItems = await loadItems();
      if (!isMountedRef.current || requestGeneration !== requestGenerationRef.current) return;
      setItems(updatedItems);
      setRefreshError(false);
      setHasLoaded(true);
    } catch {
      if (!isMountedRef.current || requestGeneration !== requestGenerationRef.current) return;
      setRefreshError(true);
    }
  }, [loadItems]);

  useResourceUpdate("service_proposal", undefined, refresh);
  useResourceUpdate("work_order", undefined, refresh);

  return { items, refreshError, hasLoaded, retry: refresh };
}
