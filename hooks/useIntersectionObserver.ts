import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * Fires `callback` when the returned sentinel ref enters the viewport.
 * Used for infinite-scroll triggers in FeedList.
 *
 * @param callback - Called each time the element becomes visible.
 * @param options  - IntersectionObserver options (threshold, rootMargin, etc.)
 * @returns A ref to attach to the sentinel DOM element.
 */
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = { threshold: 0.1 },
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);
  // Stable callback ref so the observer never needs to be re-created
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const stableCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) stableCallback();
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
    // options is stable — only re-run if the sentinel element changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableCallback]);

  return ref;
}
