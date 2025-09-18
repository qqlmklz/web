import { useMemo, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delay = 180) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const timer = useRef<number | null>(null);

  return useMemo(
    () =>
      (...args: Parameters<T>) => {
        if (timer.current != null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => cbRef.current(...args), delay) as unknown as number;
      },
    [delay]
  );
}
