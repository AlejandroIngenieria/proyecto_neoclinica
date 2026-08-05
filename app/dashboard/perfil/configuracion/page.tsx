'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, Shield, Palette, Globe, Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function ConfiguracionPage() {
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeDarkMode = mounted ? isDarkMode : false;

  const settingsSections = [
    {
      title: 'Apariencia',
      icon: Palette,
      items: [
        {
          label: 'Modo oscuro',
          description: 'Cambia la interfaz a tonos oscuros para reducir la fatiga visual.',
          icon: activeDarkMode ? Moon : Sun,
          action: (
            <ToggleSwitch checked={activeDarkMode} onChange={toggleDarkMode} />
          ),
        },
      ],
    },
    {
      title: 'Notificaciones',
      icon: Bell,
      items: [
        {
          label: 'Recordatorios de citas',
          description: 'Recibe notificaciones antes de tus citas programadas.',
          icon: Bell,
          action: <ToggleSwitch checked={true} onChange={() => {}} />,
        },
      ],
    },
    {
      title: 'Privacidad y Seguridad',
      icon: Shield,
      items: [
        {
          label: 'Autenticación de dos factores',
          description: 'Añade una capa extra de seguridad a tu cuenta.',
          icon: Shield,
          action: (
            <span className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Próximamente
            </span>
          ),
        },
      ],
    },
    {
      title: 'Idioma y Región',
      icon: Globe,
      items: [
        {
          label: 'Idioma de la interfaz',
          description: 'Selecciona el idioma en el que se muestra la aplicación.',
          icon: Globe,
          action: (
            <span className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Español (GT)
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto space-y-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 py-4 mb-6 backdrop-blur-md">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          Configuración
        </h1>
        <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
          Personaliza tu experiencia de usuario, apariencia y preferencias de la cuenta.
        </p>
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + sectionIndex * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-[#1E293B]/60 backdrop-blur-xl shadow-xl shadow-slate-900/5 dark:shadow-slate-950/20"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-slate-100/60 dark:border-slate-800/60 bg-transparent">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-100 dark:border-blue-900/30">
                <section.icon className="h-[18px] w-[18px]" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{section.title}</h2>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {section.items.map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <item.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <div className="self-end sm:self-auto shrink-0">
                    {item.action}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer note */}
      <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-[#1E293B]/40 backdrop-blur-md p-6 text-center space-y-1">
        <Settings className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Más opciones próximamente</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Estamos trabajando en más opciones de personalización para tu cuenta.
        </p>
      </div>
    </div>
  );
}
