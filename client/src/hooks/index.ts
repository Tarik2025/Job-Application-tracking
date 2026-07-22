import { useState, useEffect, useRef } from 'react';

/**
 * Debounces a value by the given delay.
 * Used for search inputs to prevent firing a request on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(searchValue, 300);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Persists state to localStorage with SSR safety.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch {
      // Silently fail — localStorage may be unavailable
    }
  };

  return [storedValue, setValue];
}

/**
 * Tracks whether a boolean value is open/closed.
 * Useful for modals, drawers, dropdowns.
 */
export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return { isOpen, open, close, toggle };
}

/**
 * Detects clicks outside a referenced element.
 * Used for dropdowns, popovers, command palettes.
 */
export function useClickOutside<T extends HTMLElement>(
  callback: () => void,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [callback]);

  return ref;
}

/**
 * Copies text to clipboard with a temporary "copied" state.
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
    }
  };

  return { copied, copy };
}

/**
 * Tracks online/offline status.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Tracks previous value of a variable.
 * Useful for detecting changes in props or state.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/**
 * Keyboard shortcut handler.
 * @example useKeyboard('k', handler, { meta: true }) // Cmd+K
 */
export function useKeyboard(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const metaMatch = options.meta ? event.metaKey || event.ctrlKey : true;
      const ctrlMatch = options.ctrl ? event.ctrlKey : true;
      const shiftMatch = options.shift ? event.shiftKey : true;
      const altMatch = options.alt ? event.altKey : true;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        metaMatch &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault();
        callback(event);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback, options.meta, options.ctrl, options.shift, options.alt]);
}

/**
 * Simple toggle hook.
 */
export function useToggle(
  initialValue = false,
): [boolean, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = () => setValue((v) => !v);
  return [value, toggle, setValue];
}
