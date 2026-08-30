import { useRef, useCallback, useEffect, useState, type RefObject } from "react";

export interface UseSmartScrollOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
}

export interface UseSmartScrollReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export function useSmartScroll<T = unknown>(
  deps: T[],
  options?: UseSmartScrollOptions | number
): UseSmartScrollReturn {
  const threshold = typeof options === "number" ? options : (options?.threshold ?? 100);
  const defaultBehavior = typeof options === "object" ? (options?.behavior ?? "smooth") : "smooth";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(isAtBottom);
  const prevDepsRef = useRef<T[]>(deps);
  const isFirstRender = useRef(true);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  const scrollToBottom = useCallback(
    (behavior?: ScrollBehavior) => {
      const targetBehavior = behavior ?? defaultBehavior;
      if (typeof endRef.current?.scrollIntoView === "function") {
        endRef.current.scrollIntoView({ behavior: targetBehavior });
      }
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      setIsAtBottom(true);
      isAtBottomRef.current = true;
    },
    [defaultBehavior]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      setIsAtBottom(atBottom);
      isAtBottomRef.current = atBottom;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (isAtBottomRef.current) {
        scrollToBottom();
      }
      return;
    }

    const prevDeps = prevDepsRef.current;
    const hasChanged =
      prevDeps.length !== deps.length ||
      deps.some((dep, i) => !Object.is(dep, prevDeps[i]));

    if (hasChanged) {
      prevDepsRef.current = deps;
      if (isAtBottomRef.current) {
        scrollToBottom();
      }
    }
  });

  return { containerRef, endRef, isAtBottom, scrollToBottom };
}
