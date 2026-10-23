import { useCallback, useEffect, useRef, useState } from "react";

/** Agrupa chamadas próximas (ex.: várias mensagens em tempo real) em uma só. */
export function useDebounce(fn: () => void, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => ref.current(), ms);
  }, [ms]);
}

/** Força uma nova renderização periódica (para textos como "há 2 min"). */
export function useRelogio(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((v) => v + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}
