import type { ComponentType, ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
};

export function SectionCard({ title, icon: Icon, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
