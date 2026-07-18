'use client';

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
        checked ? 'bg-blue-600' : 'bg-slate-200'
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

  const settingsSections = [
    {
      title: 'Apariencia',
      icon: Palette,
      items: [
        {
          label: 'Modo oscuro',
          description: 'Cambia la interfaz a tonos oscuros para reducir la fatiga visual.',
          icon: isDarkMode ? Moon : Sun,
          action: (
            <ToggleSwitch checked={isDarkMode} onChange={toggleDarkMode} />
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
            <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">
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
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              Español (GT)
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <div
      className="px-2 py-4 sm:px-6 sm:py-8 lg:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 -mt-4 md:-mt-8 -mx-4 md:-mx-8 px-4 md:px-8 pt-4 md:pt-8 pb-4 mb-8 rounded-3xl bg-white/10 backdrop-blur-lg">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-slate-900">Configuración</h1>
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + sectionIndex * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-xl shadow-slate-900/5"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 sm:px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <section.icon className="h-[18px] w-[18px]" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">{section.title}</h2>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-100">
              {section.items.map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <item.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
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
      <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white/40 backdrop-blur-md p-6 text-center">
        <Settings className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-600">Más opciones próximamente</p>
        <p className="mt-1 text-xs text-slate-400">
          Estamos trabajando en más opciones de personalización para tu cuenta.
        </p>
      </div>
    </div>
  );
}
