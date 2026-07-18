'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { Pill, Search, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { NeoLoader } from '@/components/neo-loader';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Directorio' },
  { href: '/dashboard/citas', label: 'Citas' },
  { href: '/dashboard/medicamentos', label: 'Medicamentos' },
];

const MOCK_MEDICATIONS = [
  { name: 'Losartán 50mg', category: 'Antihipertensivo', frequency: 'Diario', status: 'active' },
  { name: 'Metformina 850mg', category: 'Antidiabético', frequency: 'Dos veces al día', status: 'active' },
  { name: 'Omeprazol 20mg', category: 'Protector gástrico', frequency: 'En ayunas', status: 'active' },
  { name: 'Atorvastatina 20mg', category: 'Hipolipemiante', frequency: 'Nocturno', status: 'paused' },
  { name: 'Aspirina 100mg', category: 'Antiagregante', frequency: 'Diario', status: 'active' },
  { name: 'Diazepam 5mg', category: 'Ansiolítico', frequency: 'S.O.S.', status: 'paused' },
];

function MedicamentosContent() {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');

  const filtered = MOCK_MEDICATIONS.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  return (
    <div className="min-h-screen text-slate-900">

      <motion.main
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
            <Pill className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Medicamentos</h1>
            <p className="text-sm text-slate-500">Control y seguimiento de medicación</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar medicamento..."
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'paused'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  filter === f
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Pausados'}
              </button>
            ))}
          </div>
        </div>

        {/* Medication list */}
        <div className="mt-8 space-y-3">
          {filtered.map((med, index) => (
            <motion.div
              key={med.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                med.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                <Pill className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-black text-slate-900">{med.name}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{med.category}</p>
                <p className="text-xs font-semibold text-slate-400 sm:hidden mt-0.5">{med.frequency}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-700">{med.frequency}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                med.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {med.status === 'active' ? 'Activo' : 'Pausado'}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 flex items-start gap-3 rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-900">Sección informativa</p>
            <p className="mt-1 text-sm text-amber-700">
              Los medicamentos se vincularán con las recetas de tus médicos del directorio.
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
