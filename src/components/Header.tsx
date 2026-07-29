import React from 'react';
import { Home, Users, Calendar, BarChart3, LogIn, LogOut, ShieldCheck, Plus, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeTab: 'principal' | 'gestion' | 'historial';
  setActiveTab: (tab: 'principal' | 'gestion' | 'historial') => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenNewTenantModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogin,
  onLogout,
  onOpenNewTenantModal
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm flex items-center justify-center">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Gestión de Alquiler
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium border border-blue-400/30">
                  Vivienda
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Control de inquilinos, gastos mensuales y recibos
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('principal')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'principal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Inquilinos (Principal)</span>
            </button>

            <button
              onClick={() => setActiveTab('gestion')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'gestion'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Gestión Mensual</span>
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'historial'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Historial Anual</span>
            </button>
          </nav>

          {/* User Auth & Quick Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenNewTenantModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Inquilino</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-3 bg-slate-800 border border-slate-700 pl-3 pr-2 py-1.5 rounded-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuario'}
                    className="w-7 h-7 rounded-full border border-blue-400"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {(user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Google Auth
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center space-x-2 transition"
              >
                <LogIn className="w-4 h-4 text-blue-400" />
                <span>Acceder con Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('principal')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg ${
              activeTab === 'principal' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Inquilinos</span>
          </button>
          <button
            onClick={() => setActiveTab('gestion')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg ${
              activeTab === 'gestion' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span>Gestión</span>
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg ${
              activeTab === 'historial' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span>Historial</span>
          </button>
        </div>
      </div>
    </header>
  );
};
