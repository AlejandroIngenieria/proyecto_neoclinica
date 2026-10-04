'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * Hook para sincronizar un valor string con un parámetro de la URL con reactividad en tiempo real.
 *
 * @example
 * const [search, setSearch] = useParamString('q', '');
 * // URL: /dashboard?q=cardiología
 */
export function useParamString(key: string, defaultValue: string = ''): [string, (value: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const paramValue = searchParams.get(key) ?? defaultValue;
  const [localValue, setLocalValue] = useState(paramValue);

  useEffect(() => {
    setLocalValue(paramValue);
  }, [paramValue]);

  const setValue = useCallback(
    (next: string) => {
      setLocalValue(next);

      const currentParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(searchParams.toString());

      if (next === defaultValue || next === '') {
        currentParams.delete(key);
      } else {
        currentParams.set(key, next);
      }

      const query = currentParams.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      if (typeof window !== 'undefined') {
        window.history.replaceState(window.history.state, '', url);
      }
      router.replace(url, { scroll: false });
    },
    [defaultValue, key, pathname, router, searchParams],
  );

  return [localValue, setValue];
}

/**
 * Hook para sincronizar un booleano con un parámetro de la URL con reactividad en tiempo real.
 *
 * @example
 * const [active, setActive] = useParamBoolean('active', false);
 * // URL: /dashboard?active=1
 */
export function useParamBoolean(key: string, defaultValue: boolean = false): [boolean, (value: boolean) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get(key);
  const paramValue = raw !== null ? raw === '1' || raw === 'true' : defaultValue;
  const [localValue, setLocalValue] = useState(paramValue);

  useEffect(() => {
    setLocalValue(paramValue);
  }, [paramValue]);

  const setValue = useCallback(
    (next: boolean) => {
      setLocalValue(next);

      const currentParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(searchParams.toString());

      if (next === defaultValue) {
        currentParams.delete(key);
      } else {
        currentParams.set(key, next ? '1' : '0');
      }

      const query = currentParams.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      if (typeof window !== 'undefined') {
        window.history.replaceState(window.history.state, '', url);
      }
      router.replace(url, { scroll: false });
    },
    [defaultValue, key, pathname, router, searchParams],
  );

  return [localValue, setValue];
}

/**
 * Hook para sincronizar un número con un parámetro de la URL con reactividad en tiempo real.
 *
 * @example
 * const [price, setPrice] = useParamNumber('price', 5000);
 * // URL: /dashboard?price=2000
 */
export function useParamNumber(key: string, defaultValue: number): [number, (value: number) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get(key);
  const parsed = raw !== null ? Number(raw) : defaultValue;
  const paramValue = Number.isFinite(parsed) ? parsed : defaultValue;
  const [localValue, setLocalValue] = useState(paramValue);

  useEffect(() => {
    setLocalValue(paramValue);
  }, [paramValue]);

  const setValue = useCallback(
    (next: number) => {
      setLocalValue(next);

      const currentParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(searchParams.toString());

      if (next === defaultValue) {
        currentParams.delete(key);
      } else {
        currentParams.set(key, String(next));
      }

      const query = currentParams.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      if (typeof window !== 'undefined') {
        window.history.replaceState(window.history.state, '', url);
      }
      router.replace(url, { scroll: false });
    },
    [defaultValue, key, pathname, router, searchParams],
  );

  return [localValue, setValue];
}

/**
 * Hook para resetear todos los parámetros de la URL.
 */
export function useResetParams() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', pathname);
    }
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);
}
