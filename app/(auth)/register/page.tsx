import { Suspense } from 'react';
import AuthUnifiedView from '@/components/auth-unified-view';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-slate-900" />}>
      <AuthUnifiedView initialTab="register" />
    </Suspense>
  );
}
