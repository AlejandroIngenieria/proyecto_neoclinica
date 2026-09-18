'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useId,
} from 'react';
import { AtSign, Clock, X, Mail } from 'lucide-react';
import { getEmailHistory, removeEmailFromHistory } from '@/lib/email-history';

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
   * Si es true, muestra los correos guardados previamente al enfocar el campo
   * cuando no se ha escrito '@'. Por defecto: false.
   */
  showHistory?: boolean;
  /**
   * Lista personalizada de dominios sugeridos (opcional)
   */
  domains?: string[];
  /**
   * Callback cuando se selecciona una sugerencia
   */
  onSelectSuggestion?: (email: string) => void;
  /**
   * Clases adicionales para el contenedor wrapper relativo
   */
  wrapperClassName?: string;
}

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
    useImperativeHandle(forwardedRef, () => internalInputRef.current as HTMLInputElement);

    const [inputValue, setInputValue] = useState<string>(() => {
      if (controlledValue !== undefined) return String(controlledValue);
      if (defaultValue !== undefined) return String(defaultValue);
      return '';
    });

    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [historyList, setHistoryList] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const listboxId = useId();

    // Sincronizar con valor controlado si cambia desde afuera
    useEffect(() => {
      if (controlledValue !== undefined) {
        setInputValue(String(controlledValue));
      }
    }, [controlledValue]);

    // Cargar historial en el cliente si está habilitado
    useEffect(() => {
      if (showHistory) {
        setHistoryList(getEmailHistory());
      }
    }, [showHistory]);

    // Analizar el texto actual para determinar modo: sugerencias de dominio vs historial
    const atIndex = inputValue.indexOf('@');
    const hasAt = atIndex !== -1;
    const prefix = hasAt ? inputValue.slice(0, atIndex) : inputValue;
    const domainQuery = hasAt ? inputValue.slice(atIndex + 1).toLowerCase() : '';

    // Si tiene '@' y hay un prefijo de usuario, filtrar los dominios
    const domainSuggestions: string[] = React.useMemo(() => {
      if (!hasAt || !prefix.trim()) return [];
      
      // Si el dominio ya coincide exactamente con uno, no saturar si ya está terminado
      const exactMatch = domains.some((d) => d.toLowerCase() === domainQuery);
      if (exactMatch) return [];

      return domains.filter((d) => d.toLowerCase().startsWith(domainQuery));
    }, [hasAt, prefix, domainQuery, domains]);

    // Modo activo de sugerencias
    const isDomainMode = hasAt && domainSuggestions.length > 0;
    const isHistoryMode = showHistory && !hasAt && historyList.length > 0 && inputValue.trim().length === 0;

    const currentItemsCount = isDomainMode
      ? domainSuggestions.length
      : isHistoryMode
      ? historyList.length
      : 0;

    // Abrir o cerrar menú según disponibilidad de items
    useEffect(() => {
      if (isDomainMode || isHistoryMode) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setIsOpen(false);
      }
    }, [isDomainMode, isHistoryMode]);

    // Aplicar un nuevo valor al input y disparar eventos para React Hook Form
    const applyValue = useCallback(
      (newEmail: string) => {
        setInputValue(newEmail);
        setIsOpen(false);

        if (internalInputRef.current) {
          internalInputRef.current.value = newEmail;
          // Disparar evento de input nativo para que react-hook-form y otros listeners se enteren
          const nativeEvent = new Event('input', { bubbles: true });
          internalInputRef.current.dispatchEvent(nativeEvent);
          internalInputRef.current.focus();
        }

        // Llamar callbacks opcionales
        if (onChange) {
          const syntheticEvent = {
            target: { value: newEmail, name: props.name },
            currentTarget: { value: newEmail, name: props.name },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }

        onSelectSuggestion?.(newEmail);
      },
      [onChange, onSelectSuggestion, props.name]
    );

    // Cerrar al hacer clic fuera
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Manejador de teclado
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isOpen && currentItemsCount > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % currentItemsCount);
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + currentItemsCount) % currentItemsCount);
          return;
        }

        if (e.key === 'Tab' || e.key === 'Enter') {
          // Si presiona Tab o Enter cuando las sugerencias están visibles
          if (isDomainMode && domainSuggestions[highlightedIndex]) {
            e.preventDefault();
            const selectedDomain = domainSuggestions[highlightedIndex];
            applyValue(`${prefix}@${selectedDomain}`);
            return;
          }

          if (isHistoryMode && historyList[highlightedIndex]) {
            e.preventDefault();
            applyValue(historyList[highlightedIndex]);
            return;
          }
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
          return;
        }
      }

      onKeyDown?.(e);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      onChange?.(e);
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (showHistory) {
        const freshHistory = getEmailHistory();
        setHistoryList(freshHistory);
      }
      if (isDomainMode || (showHistory && e.target.value.trim() === '')) {
        setIsOpen(true);
      }
      onFocus?.(e);
    };

    const handleRemoveHistoryItem = (emailToRemove: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const updated = removeEmailFromHistory(emailToRemove);
      setHistoryList(updated);
      if (updated.length === 0) {
        setIsOpen(false);
      }
    };

    return (
      <div ref={containerRef} className={`relative w-full ${wrapperClassName}`}>
        <input
          ref={internalInputRef}
          type="email"
          autoComplete={autoComplete}
          value={controlledValue !== undefined ? controlledValue : inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen ? `${listboxId}-item-${highlightedIndex}` : undefined
          }
          className={className}
          {...props}
        />

        {/* Menú de Sugerencias Flotante */}
        {isOpen && currentItemsCount > 0 && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-50 left-0 right-0 top-[calc(100%+6px)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl overflow-hidden py-1.5 transition-all text-left"
          >
            {/* Encabezado contextual */}
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1 mb-1">
              <span className="flex items-center gap-1.5">
                {isDomainMode ? (
                  <>
                    <Mail className="w-3 h-3 text-blue-500" />
                    Sugerencias de Correo
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-slate-400" />
                    Cuentas Recientes
                  </>
                )}
              </span>
              <span className="text-[9px] font-normal lowercase tracking-normal text-slate-400">
                Tab o clic para completar
              </span>
            </div>

            {/* Lista de Sugerencias de Dominio (@gmail.com, etc.) */}
            {isDomainMode && (
              <div className="max-h-56 overflow-y-auto">
                {domainSuggestions.map((domain, index) => {
                  const isSelected = index === highlightedIndex;
                  const fullEmail = `${prefix}@${domain}`;

                  return (
                    <button
                      key={domain}
                      id={`${listboxId}-item-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => applyValue(fullEmail)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 font-medium'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <AtSign
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected
                              ? 'text-blue-500 dark:text-sky-400'
                              : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">
                          <span className="text-slate-500 dark:text-slate-400 font-normal">
                            {prefix}@
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {domain}
                          </span>
                        </span>
                      </div>

                      {isSelected && (
                        <kbd className="hidden sm:inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-800 shrink-0 select-none">
                          Tab ↹
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lista de Historial Reciente */}
            {isHistoryMode && (
              <div className="max-h-52 overflow-y-auto">
                {historyList.map((histEmail, index) => {
                  const isSelected = index === highlightedIndex;

                  return (
                    <div
                      key={histEmail}
                      id={`${listboxId}-item-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => applyValue(histEmail)}
                      className={`flex items-center justify-between px-3 py-2 text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 font-medium'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{histEmail}</span>
                      </div>

                      <button
                        type="button"
                        title="Eliminar de historial"
                        aria-label={`Eliminar ${histEmail} del historial`}
                        onClick={(e) => handleRemoveHistoryItem(histEmail, e)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

EmailAutocompleteInput.displayName = 'EmailAutocompleteInput';
