'use client';

import { useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { useDoctors } from '@/hooks/use-doctors';
import { useServiciosMedico } from '@/hooks/use-flujo-citas';
import { useCitaStore } from '@/store/use-cita-store';
import { Step1Modalidad } from '@/components/citas-wizard/Step1Modalidad';
import { Step2PacienteMotivo } from '@/components/citas-wizard/Step2PacienteMotivo';
import { Step3MetodoPago } from '@/components/citas-wizard/Step3MetodoPago';
import { Step4Confirmacion } from '@/components/citas-wizard/Step4Confirmacion';
import { CitaSummarySidebar } from '@/components/citas-wizard/CitaSummarySidebar';
import { WizardHeader } from '@/components/citas-wizard/WizardHeader';
import { buildDoctorFullName } from '@/types/doctor';

export default function AgendarCitaPage({ params }: { params: Promise<{ codMedico: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramMotivo = searchParams.get('motivo');
  const paramSypCodigo = searchParams.get('sypCodigo');

  const { codMedico } = use(params);
  const { data: doctors = [], isLoading: isLoadingDoctors } = useDoctors();
  const { data: servicios = [] } = useServiciosMedico(codMedico);
  
  const { step, setStep, setMedico, setServicio, setMotivo, reset } = useCitaStore();

  // Inicializar estado del wizard
  useEffect(() => {
    reset();
  }, [reset]);

  // Posicionar siempre hasta arriba de la página cada vez que cambie de paso
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [step]);

  const currentDoctor = doctors.find(d => d.exp_codigo === codMedico);

  useEffect(() => {
    if (currentDoctor) {
      setMedico(currentDoctor.exp_codigo, buildDoctorFullName(currentDoctor));
    }
  }, [currentDoctor, setMedico]);

  // Pre-seleccionar servicio si viene en la URL
  useEffect(() => {
    if (servicios.length > 0) {
      if (paramSypCodigo) {
        const found = servicios.find(s => s.sypCodigo === Number(paramSypCodigo));
        if (found) {
          setServicio(found);
          setMotivo(found.servicio);
        }
      } else if (paramMotivo) {
        const found = servicios.find(s => s.servicio?.toLowerCase() === paramMotivo.toLowerCase());
        if (found) {
          setServicio(found);
          setMotivo(found.servicio);
        } else {
          setMotivo(paramMotivo);
        }
      }
    }
  }, [servicios, paramSypCodigo, paramMotivo, setServicio, setMotivo]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-200 pb-20 lg:pb-0 pt-8">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Content Area - Clean without borders/shadows */}
        <div className="w-full relative">
          <WizardHeader />
          
          <div className="w-full relative">
            <div className={step === 1 ? 'block animate-in fade-in zoom-in-[0.98] duration-200 ease-out' : 'hidden'}>
              <Step1Modalidad />
            </div>
            <div className={step === 2 ? 'block animate-in fade-in zoom-in-[0.98] duration-200 ease-out' : 'hidden'}>
              <Step2PacienteMotivo />
            </div>
            <div className={step === 3 ? 'block animate-in fade-in zoom-in-[0.98] duration-200 ease-out' : 'hidden'}>
              <Step3MetodoPago />
            </div>
            <div className={step === 4 ? 'block animate-in fade-in zoom-in-[0.98] duration-200 ease-out' : 'hidden'}>
              <Step4Confirmacion />
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
