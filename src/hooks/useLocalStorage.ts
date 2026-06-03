import { useCallback, useEffect, useRef, useState } from "react";
import { loadJSON, saveJSON } from "../lib/storage";

/**
 * Estado de React sincronizado con localStorage.
 * Persiste automáticamente en cada cambio.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadJSON<T>(key, initial));
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    saveJSON(key, value);
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}
