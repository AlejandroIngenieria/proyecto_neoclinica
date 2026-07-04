'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * Hook para sincronizar un valor string con un parámetro de la URL.
 *
 * @example
 * const [search, setSearch] = useParamString('q', '');
 * // URL: /dashboard?q=cardiología
 */
export function useParamString(key: string, defaultValue: string = ''): [string, (value: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next === defaultValue || next === '') {
        params.delete(key);
      } else {
        params.set(key, next);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultValue, key, pathname, router, searchParams],
  );

  return [value, setValue];
}

/**
 * Hook para sincronizar un booleano con un parámetro de la URL.
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
  const value = raw !== null ? raw === '1' || raw === 'true' : defaultValue;

  const setValue = useCallback(
    (next: boolean) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, next ? '1' : '0');
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultValue, key, pathname, router, searchParams],
  );

  return [value, setValue];
}

/**
 * Hook para sincronizar un número con un parámetro de la URL.
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
  const value = raw !== null ? Number(raw) : defaultValue;
  const safeValue = Number.isFinite(value) ? value : defaultValue;

  const setValue = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, String(next));
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultValue, key, pathname, router, searchParams],
  );

  return [safeValue, setValue];
}

/**
 * Hook para resetear todos los parámetros de la URL.
 */
export function useResetParams() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);
}
