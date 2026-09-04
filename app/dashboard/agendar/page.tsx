'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function AgendarRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctor = searchParams.get('doctor') || searchParams.get('medico') || searchParams.get('codMedico');

  useEffect(() => {
    if (doctor) {
      router.replace(`/dashboard/agendar/${doctor}`);
    } else {
      router.replace('/dashboard/directorio');
    }
  }, [doctor, router]);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        Redirigiendo a agendar cita...
      </p>
    </div>
  );
}

export default function AgendarRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      }
    >
      <AgendarRedirectContent />
    </Suspense>
  );
}
