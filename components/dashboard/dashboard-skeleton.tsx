import React from 'react';

/**
 * Esqueleto de Carga de Alta Fidelidad para el Dashboard (NeoClínica Clinical Trust)
 * Se renderiza instantáneamente desde el Server Component mediante Streaming & Suspense.
 */
export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
      {/* 1. Header de Bienvenida */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="w-32 h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="w-32 h-10 bg-sky-100 dark:bg-sky-950/60 rounded-xl" />
        </div>
      </div>

      {/* 2. Grid de 4 KPIs Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="w-20 h-4 bg-slate-100 dark:bg-slate-800 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="w-16 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="w-28 h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
          </div>
        ))}
      </div>

      {/* 3. Contenido Principal en Dos Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda / Central: Agenda y Próximas Citas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-36 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
            {/* Lista de tarjetas de citas */}
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-40 h-4 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="w-28 h-3 bg-slate-100 dark:bg-slate-800 rounded-md" />
                  <div className="w-56 h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                </div>
                <div className="w-20 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Lealtad y Médicos Frecuentes */}
        <div className="space-y-6">
          {/* Card de Lealtad / Puntos */}
          <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 space-y-4 shadow-lg">
            <div className="w-28 h-4 bg-slate-700 rounded-md" />
            <div className="w-36 h-8 bg-slate-600 rounded-lg" />
            <div className="w-full h-2 bg-slate-700 rounded-full" />
            <div className="w-44 h-3 bg-slate-700 rounded-md" />
          </div>

          {/* Card de Médicos Frecuentes */}
          <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="w-36 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
            {[1, 2, 3].map((doc) => (
              <div key={doc} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-32 h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="w-20 h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
