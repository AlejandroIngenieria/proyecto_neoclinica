'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { Pill, Search, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { NeoLoader } from '@/components/neo-loader';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/dashboard/directorio', label: 'Directorio' },
  { href: '/dashboard/citas', label: 'Citas' },
  { href: '/dashboard/medicamentos', label: 'Medicamentos' },
];

interface Medication {
  name: string;
  category: string;
  frequency: string;
  status: 'active' | 'paused';
}

function MedicamentosContent() {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Los medicamentos se conectan con las recetas médicas del paciente desde el backend
  const medications: Medication[] = [];

  const filtered = medications.filter((m) => {
    const matchesFilter = filter === 'all' || m.status === filter;
    const matchesSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">

      <motion.main
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff4ff] dark:bg-slate-800 text-[#006194] dark:text-sky-400 shadow-2xs">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Medicamentos</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Control y seguimiento de medicación prescrita</p>
          </div>
        </div>

        {/* Search + Segmented Tray Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-2xs transition-all focus-within:ring-2 focus-within:ring-[#006194]/20 focus-within:border-[#006194]">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar medicamento o principio activo..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
            />
          </div>
          {/* Segmented Control Tray */}
          <div className="inline-flex p-1 bg-[#eff4ff] dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 items-center gap-1 shrink-0 self-start sm:self-center">
            {(['all', 'active', 'paused'] as const).map((f) => {
              const isActive = filter === f;
              const label = f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Pausados';
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-[#006194] dark:text-sky-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Medication list */}
        <div className="mt-8 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400">
                <Pill className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                {searchQuery ? 'No se encontraron medicamentos' : 'No tienes medicamentos activos'}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery
                  ? 'Intenta con otro término de búsqueda o cambia el filtro.'
                  : 'Los medicamentos y recetas emitidas durante tus consultas médicas por tus especialistas se sincronizarán directamente aquí.'}
              </p>
            </div>
          ) : (
            filtered.map((med, index) => (
              <motion.div
                key={med.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-5 py-4 shadow-[0_2px_12px_rgba(11,28,48,0.03)] hover:shadow-[0_4px_20px_rgba(11,28,48,0.06)] hover:border-slate-300/80 dark:hover:border-slate-700 transition-all"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  med.status === 'active' ? 'bg-[#eff4ff] text-[#006194] dark:bg-slate-800 dark:text-sky-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  <Pill className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{med.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{med.category}</p>
                  <p className="text-xs font-semibold text-slate-400 sm:hidden mt-0.5">{med.frequency}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{med.frequency}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  med.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${med.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {med.status === 'active' ? 'Activo' : 'Pausado'}
                </span>
              </motion.div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/60 bg-[#eff4ff]/30 dark:bg-slate-800/30 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#006194] dark:text-sky-400" />
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Sección informativa</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Los medicamentos se vinculan automáticamente con las recetas médicas emitidas en tus consultas.
            </p>
          </div>
        </div>
      </motion.main>
    </div>
  );
}

export default function MedicamentosPage() {
  return (
    <Suspense fallback={<NeoLoader />}>
      <MedicamentosContent />
    </Suspense>
  );
}
