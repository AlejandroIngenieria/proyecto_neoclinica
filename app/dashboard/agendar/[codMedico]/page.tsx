'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { useDoctors } from '@/hooks/use-doctors';
import { useCitaStore } from '@/store/use-cita-store';
import { Step1Modalidad } from '@/components/citas-wizard/Step1Modalidad';
import { Step2FechaHora } from '@/components/citas-wizard/Step2FechaHora';
import { Step3PacienteMotivo } from '@/components/citas-wizard/Step3PacienteMotivo';
import { Step4Confirmacion } from '@/components/citas-wizard/Step4Confirmacion';
import { CitaSummarySidebar } from '@/components/citas-wizard/CitaSummarySidebar';
import { buildDoctorFullName } from '@/types/doctor';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Directorio' },
  { href: '/dashboard/citas', label: 'Citas' },
  { href: '/dashboard/medicamentos', label: 'Medicamentos' },
];

export default function AgendarCitaPage({ params }: { params: Promise<{ codMedico: string }> }) {
  const router = useRouter();
  const { codMedico } = use(params);
  const { data: doctors = [], isLoading: isLoadingDoctors } = useDoctors();
  
  const { step, setStep, setMedico, reset } = useCitaStore();

  // Inicializar estado del wizard
  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (doctors.length > 0 && codMedico) {
      const doc = doctors.find(d => d.exp_codigo === codMedico);
      if (doc) {
        setMedico(doc.exp_codigo, buildDoctorFullName(doc));
      }
    }
  }, [doctors, codMedico, setMedico]);

  const stepsInfo = [
    { num: 1, label: 'Modalidad' },
    { num: 2, label: 'Fecha y Hora' },
    { num: 3, label: 'Paciente' },
    { num: 4, label: 'Confirmar' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 lg:pb-0">
      <Navbar subtitle="Agendar cita" backHref="/dashboard" navLinks={NAV_LINKS} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Progress steps (Stepper) */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {stepsInfo.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => s.num <= step && setStep(s.num as 1 | 2 | 3 | 4)}
                disabled={s.num > step}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition ${
                  step === s.num
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                    : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'border border-slate-200 bg-white text-slate-400'
                }`}
              >
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </button>
              <span className={`hidden text-xs font-semibold sm:block ${step >= s.num ? 'text-slate-900' : 'text-slate-400'}`}>
                {s.label}
              </span>
              {i < stepsInfo.length - 1 && (
                <div className={`h-0.5 w-6 rounded-full sm:w-10 ${step > s.num ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-slate-200"
              >
                {step === 1 && <Step1Modalidad />}
                {step === 2 && <Step2FechaHora />}
                {step === 3 && <Step3PacienteMotivo />}
                {step === 4 && <Step4Confirmacion />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar Area */}
          <div className="w-full lg:w-96 lg:shrink-0">
            <div className="sticky top-28">
              <CitaSummarySidebar />
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
