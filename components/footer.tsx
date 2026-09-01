'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Stethoscope,
  Activity,
  ShieldCheck,
  Award,
  Calendar,
  Clock,
  Heart,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  BookUser,
  Pill,
  Video,
  Home as HomeIcon,
  Globe2,
} from 'lucide-react';
import { toast } from 'sonner';

export function Footer() {
  const pathname = usePathname();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // No renderizar en páginas de autenticación completas (login, registro, recuperación de contraseña, admin) ni en la raíz
  if (
    !pathname ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/olvide-password' ||
    pathname === '/restablecer-password' ||
    pathname === '/admin/login' ||
    pathname.startsWith('/(auth)')
  ) {
    return null;
  }

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      toast.error('Ingresa un correo electrónico válido');
      return;
    }

    setIsSubscribed(true);
    toast.success('¡Gracias por suscribirte a nuestros boletines de salud!');
    setNewsletterEmail('');
  };

  return (
    <footer className="mt-auto relative z-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-900 dark:bg-[#070D1A] text-slate-300 transition-colors">
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-48 bg-blue-600/10 dark:bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/2 right-10 -translate-y-1/2 w-80 h-80 bg-indigo-600/10 dark:bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* ─── Top Trust Banner ────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/80 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Especialistas Certificados */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Especialistas Verificados</h4>
                <p className="text-xs text-slate-400 mt-0.5">Médicos colegiados y certificados</p>
              </div>
            </div>

            {/* 2. Ciberseguridad Médica */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Seguridad Clínica 256-bit</h4>
                <p className="text-xs text-slate-400 mt-0.5">Privacidad y encriptación médica</p>
              </div>
            </div>

            {/* 3. Agendamiento Inmediato */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Agendamiento 24/7</h4>
                <p className="text-xs text-slate-400 mt-0.5">Presencial, virtual o a domicilio</p>
              </div>
            </div>

            {/* 4. Programa de Puntos */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Programa de Fidelidad</h4>
                <p className="text-xs text-slate-400 mt-0.5">Acumula puntos y canjea cupones</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Footer Columns ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Column 1: Brand, Tagline & Socials (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Logo */}
            <Link href="/dashboard" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  NeoClínica
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                <p className="text-[11px] font-medium text-slate-400">Salud y Tecnología Integral</p>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Plataforma líder en gestión y acceso a servicios de salud en Guatemala. Conectamos pacientes con médicos especialistas altamente calificados para una atención médica humana, rápida y segura.
            </p>

            {/* Live System Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Servicios y Citas Operativas 24/7</span>
            </div>

            {/* Social Media Links */}
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Síguenos en Redes</p>
              <div className="flex items-center gap-2 flex-wrap">
                {/* WhatsApp */}
                <a
                  href="https://wa.me/50222000000"
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                </a>

                {/* Facebook */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  title="Facebook"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  title="Instagram"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  title="LinkedIn"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Explorar y Servicios (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Explorar Servicios
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/dashboard/directorio"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-blue-400 transition-colors" />
                  Directorio de Especialistas
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/citas"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-blue-400 transition-colors" />
                  Gestión de Citas Médicas
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/medicamentos"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-blue-400 transition-colors" />
                  Farmacia y Medicamentos
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/directorio?modality=virtual"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-blue-400 transition-colors" />
                  Telemedicina y Videoconsulta
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/directorio?modality=domicilio"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-blue-400 transition-colors" />
                  Atención Médica a Domicilio
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Para Pacientes (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              Pacientes
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/dashboard/perfil"
                  className="hover:text-rose-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-rose-400 transition-colors" />
                  Expediente Clínico
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/perfil/pacientes"
                  className="hover:text-rose-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-rose-400 transition-colors" />
                  Familiares y Dependientes
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/perfil/puntos"
                  className="hover:text-rose-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-rose-400 transition-colors" />
                  Puntos y Recompensas
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/perfil/configuracion"
                  className="hover:text-rose-400 transition-colors flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-rose-400 transition-colors" />
                  Seguridad y Privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contacto & Newsletter (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              Contacto y Boletín
            </h3>

            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Ciudad de Guatemala, Guatemala</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>PBX: +(502) 2200-0000</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>soporte@neoclinica.com</span>
              </p>
            </div>

            {/* Newsletter Subscription Box */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <p className="text-[11px] font-bold text-white leading-snug">Consejos de Salud y Noticias</p>
              <p className="text-[10.5px] text-slate-400">Recibe artículos médicos semanales en tu correo.</p>
              <form onSubmit={handleNewsletterSubmit} className="flex items-center gap-1.5">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shrink-0 shadow-xs active:scale-95"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Copyright & Legal ────────────────────────────────────── */}
      <div className="border-t border-slate-800/80 bg-slate-950/80 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11.5px] text-slate-500">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} <strong className="text-slate-300">NeoClínica Healthcare Systems</strong>. Todos los derechos reservados.
          </p>

          <div className="flex items-center gap-4 flex-wrap justify-center text-xs">
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Privacidad de Datos Médicos</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Términos del Servicio</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Código de Ética</span>
            <span>•</span>
            <span className="text-slate-400 font-medium flex items-center gap-1">
              Guatemala
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
