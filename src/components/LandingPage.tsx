import React from 'react';
import {
  Building2,
  Users,
  Zap,
  Droplets,
  FileText,
  MessageCircle,
  ShieldCheck,
  ExternalLink,
  Calculator,
  TrendingUp,
  Download,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  authError: string | null;
  onClearAuthError: () => void;
  isInIframe: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  authError,
  onClearAuthError,
  isInIframe
}) => {
  return (
    <div className="space-y-10 py-4 max-w-6xl mx-auto">
      {/* Auth Error Banner if present */}
      {authError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 flex items-start space-x-3 text-sm text-red-900 shadow-md">
          <span className="bg-red-600 text-white p-2 rounded-2xl shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div className="flex-1 space-y-1">
            <p className="font-extrabold text-base">Error de Autenticación en Firebase</p>
            <p className="leading-relaxed">{authError}</p>
          </div>
          <button
            onClick={onClearAuthError}
            className="text-red-500 hover:text-red-800 font-bold text-sm px-2 py-1 bg-red-100 rounded-lg hover:bg-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Sistema Profesional de Gestión de Alquileres</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
            Administra tus viviendas e inquilinos de forma inteligente
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-normal">
            Control de cobros mensuales, reparto proporcional de luz y agua, generación de recibos PDF y avisos por WhatsApp. Todo sincronizado de forma segura en tu base de datos.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={onLogin}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
            >
              <Lock className="w-5 h-5" />
              <span>Iniciar Sesión con Google</span>
            </button>

            {isInIframe && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-bold px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-sm"
              >
                <ExternalLink className="w-4 h-4 text-blue-400" />
                <span>Abrir en Pestaña Nueva</span>
              </a>
            )}
          </div>

          <div className="pt-4 flex items-center gap-6 text-xs text-slate-400 font-medium border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Acceso seguro mediante Google OAuth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Base de Datos Firestore Privada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Todo lo que necesitas para gestionar tus alquileres
          </h2>
          <p className="text-slate-600 text-sm">
            Diseñado para propietarios y administradores que buscan agilidad y transparencia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Ficha Completa de Inquilinos</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Registra datos personales, DNI, teléfono, email, fechas de contrato, importe de fianza depositada y contactos de emergencia.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Reparto Proporcional de Luz y Agua</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Cálculo automático del porcentaje imputable de luz y agua según consumo real. Posibilidad de incluir otros extras personalizados.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Generador de Recibos en PDF</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Emisión instantánea de recibos profesionales desglosados en PDF con firma y sello, listos para descargar o guardar en el expediente.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Notificaciones por WhatsApp</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Envía el desglose mensual o aviso de pago directamente al WhatsApp del inquilino con un formato claro y cordial.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Histórico y Liquidación Anual</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Resumen visual de rentas cobradas, recibos pendientes, gráfico mensual de ingresos y exportación de datos a Excel / CSV.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Exportación Completa de Expedientes</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Descarga expedientes completos de inquilinos en PDF, Excel o JSON con todo su historial de recibos e ingresos.
            </p>
          </div>
        </div>
      </div>

      {/* Login CTA Footer Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-2xl font-bold">¿Listo para comenzar a gestionar tus viviendas?</h3>
          <p className="text-blue-100 text-sm">
            Inicia sesión con tu cuenta de Google para acceder a tu panel de control privado.
          </p>
        </div>

        <button
          onClick={onLogin}
          className="bg-white hover:bg-slate-100 text-blue-900 font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-md transition shrink-0 flex items-center gap-2"
        >
          <Lock className="w-4 h-4 text-blue-600" />
          <span>Iniciar Sesión con Google</span>
        </button>
      </div>
    </div>
  );
};
