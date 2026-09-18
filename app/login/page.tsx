import { Suspense } from 'react';
import AuthUnifiedView from '@/components/auth-unified-view';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-slate-900" />}>
      <AuthUnifiedView initialTab="login" />
    </Suspense>
  );
}
