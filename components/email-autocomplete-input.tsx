'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';
import { getEmailHistory } from '@/lib/email-history';

export const POPULAR_EMAIL_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'outlook.es',
];

export interface EmailAutocompleteInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Si es true, permite sugerencias desde el historial guardado localmente
   * al comenzar a escribir. Por defecto: false.
   */
  showHistory?: boolean;
  /**
   * Lista personalizada de dominios sugeridos (opcional)
   */
  domains?: string[];
  /**
   * Callback cuando se completa una sugerencia con TAB
   */
  onSelectSuggestion?: (email: string) => void;
  /**
   * Clases adicionales para el contenedor relativo
   */
  wrapperClassName?: string;
}

/**
 * Componente de entrada de correo electrónico con sugerencias "Ghost Text" en línea (texto gris).
 * Evita colisiones visuales con los autocompletados y gestores de contraseñas nativos del navegador.
 * Al presionar TAB o flecha derecha al final del texto, completa la sugerencia inmediatamente.
 */
export const EmailAutocompleteInput = forwardRef<HTMLInputElement, EmailAutocompleteInputProps>(
  (
    {
      showHistory = false,
      domains = POPULAR_EMAIL_DOMAINS,
      onSelectSuggestion,
      wrapperClassName = '',
      className = '',
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      value: controlledValue,
      defaultValue,
      autoComplete = 'username email',
      ...props
    },
    forwardedRef
  ) => {
    const internalInputRef = useRef<HTMLInputElement | null>(null);
    const ghostRef = useRef<HTMLDivElement | null>(null);
    useImperativeHandle(forwardedRef, () => internalInputRef.current as HTMLInputElement);

    const [inputValue, setInputValue] = useState<string>(() => {
      if (controlledValue !== undefined) return String(controlledValue);
      if (defaultValue !== undefined) return String(defaultValue);
      return '';
    });

    const [isDismissed, setIsDismissed] = useState(false);
    const [historyList, setHistoryList] = useState<string[]>([]);

    // Sincronizar con valor controlado de formularios (e.g. react-hook-form)
    useEffect(() => {
      if (controlledValue !== undefined) {
        setInputValue(String(controlledValue));
      }
    }, [controlledValue]);

    // Cargar historial en cliente si está habilitado
    useEffect(() => {
      if (showHistory) {
        setHistoryList(getEmailHistory());
      }
    }, [showHistory]);

    // Calcular el sufijo de sugerencia en gris (Ghost text)
    const ghostSuffix = useMemo(() => {
      if (!inputValue || inputValue.length === 0) return '';

      const atIndex = inputValue.indexOf('@');
      const hasAt = atIndex !== -1;

      if (hasAt) {
        const prefix = inputValue.slice(0, atIndex);
        const domainQuery = inputValue.slice(atIndex + 1).toLowerCase();

        // No sugerir si no se ha escrito un nombre de usuario antes del '@'
        if (!prefix.trim()) return '';

        // Si el dominio ya coincide exactamente con uno de la lista, no mostrar sufijo
        const exactMatch = domains.some((d) => d.toLowerCase() === domainQuery);
        if (exactMatch) return '';

        // Buscar el primer dominio que comience con lo escrito
        const matched = domains.find((d) => d.toLowerCase().startsWith(domainQuery));
        if (matched) {
          // El texto gris es la porción restante del dominio
          return matched.slice(domainQuery.length);
        }

        return '';
      }

      // Si aún no ha escrito '@' y showHistory está activo, sugerir coincidencia desde historial
      if (showHistory && historyList.length > 0) {
        const trimmed = inputValue.trim().toLowerCase();
        const matchedEmail = historyList.find(
          (h) => h.toLowerCase().startsWith(trimmed) && h.toLowerCase() !== trimmed
        );
        if (matchedEmail) {
          return matchedEmail.slice(inputValue.length);
        }
      }

      return '';
    }, [inputValue, domains, showHistory, historyList]);

    // Aplicar valor completado y disparar eventos para React Hook Form
    const applyValue = useCallback(
      (completedEmail: string) => {
        setInputValue(completedEmail);
        setIsDismissed(false);

        if (internalInputRef.current) {
          internalInputRef.current.value = completedEmail;
          // Evento de input nativo para que react-hook-form actualice su estado interno
          const nativeEvent = new Event('input', { bubbles: true });
          internalInputRef.current.dispatchEvent(nativeEvent);
          internalInputRef.current.focus();
        }

        if (onChange) {
          const syntheticEvent = {
            target: { value: completedEmail, name: props.name },
            currentTarget: { value: completedEmail, name: props.name },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }

        onSelectSuggestion?.(completedEmail);
      },
      [onChange, onSelectSuggestion, props.name]
    );

    // Manejador de teclado para autocompletar con TAB, Flecha Derecha o Enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const activeSuffix = !isDismissed ? ghostSuffix : '';

      if (activeSuffix) {
        // Autocompletar al presionar TAB
        if (e.key === 'Tab') {
          e.preventDefault();
          applyValue(inputValue + activeSuffix);
          return;
        }

        // Autocompletar al presionar Flecha Derecha al final del texto
        if (e.key === 'ArrowRight') {
          if (
            internalInputRef.current &&
            internalInputRef.current.selectionStart === inputValue.length
          ) {
            e.preventDefault();
            applyValue(inputValue + activeSuffix);
            return;
          }
        }

        // Autocompletar al presionar Enter si hay sugerencia activa
        if (e.key === 'Enter') {
          e.preventDefault();
          applyValue(inputValue + activeSuffix);
          return;
        }

        // Descartar sugerencia temporalmente con Escape
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsDismissed(true);
          return;
        }
      }

      onKeyDown?.(e);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setIsDismissed(false);
      onChange?.(e);
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (showHistory) {
        setHistoryList(getEmailHistory());
      }
      setIsDismissed(false);
      onFocus?.(e);
    };

    const handleInputScroll = (e: React.UIEvent<HTMLInputElement>) => {
      if (ghostRef.current) {
        ghostRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
    };

    const activeSuffix = !isDismissed ? ghostSuffix : '';

    return (
      <div className={`relative flex items-center w-full h-full min-w-0 ${wrapperClassName}`}>
        {/* Capa de Ghost Text (texto gris sincronizado exactamente con el cursor) */}
        <div
          ref={ghostRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre select-none font-sans text-sm text-left"
        >
          {/* Duplicado invisible del texto escrito para calibrar la posición exacta */}
          <span className="invisible opacity-0">{inputValue}</span>
          {/* Texto gris sugerido */}
          {activeSuffix && (
            <span className="text-slate-400/85 dark:text-slate-500 font-normal">
              {activeSuffix}
            </span>
          )}
        </div>

        {/* Input accesible real */}
        <input
          ref={internalInputRef}
          type="email"
          autoComplete={autoComplete}
          value={controlledValue !== undefined ? controlledValue : inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          onScroll={handleInputScroll}
          className={className}
          {...props}
        />

        {/* Indicador sutil de 'Tab ↹' en la esquina derecha cuando hay sugerencia disponible */}
        {activeSuffix && (
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold tracking-tight text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-300/40 dark:border-slate-600/40 select-none animate-in fade-in duration-150">
            Tab ↹
          </span>
        )}
      </div>
    );
  }
);

EmailAutocompleteInput.displayName = 'EmailAutocompleteInput';
