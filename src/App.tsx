import React, { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
  testFirebaseConnection
} from './firebase/config';
import { Tenant, MonthlyBill, PaymentRecord, RentStatus } from './types';
import { rentService, initialSampleTenants, initialSampleBills } from './services/rentService';
import { Header } from './components/Header';
import { TenantList } from './components/TenantList';
import { TenantModal } from './components/TenantModal';
import { MonthlyManagement } from './components/MonthlyManagement';
import { YearlyHistory } from './components/YearlyHistory';
import { ExtraFeaturesModal } from './components/ExtraFeaturesModal';
import { Calculator, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'principal' | 'gestion' | 'historial'>('principal');

  // Core Data State
  const [tenants, setTenants] = useState<Tenant[]>(initialSampleTenants);
  const [bills, setBills] = useState<MonthlyBill[]>(initialSampleBills);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);

  // Selected Tenant for Detail or Management
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Modals state
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Initialize Firebase connection check & auth listener
  useEffect(() => {
    testFirebaseConnection();

    // Check redirect login result if user logged in via redirect
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        setUser(result.user);
        loadAllData();
      }
    }).catch((err) => {
      console.error('Error en getRedirectResult:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthError(null);
      }
      await loadAllData();
    });

    return () => unsubscribe();
  }, []);

  const loadAllData = async () => {
    try {
      const loadedTenants = await rentService.getTenants();
      const loadedBills = await rentService.getMonthlyBills();
      const loadedPayments = await rentService.getPaymentRecords();

      setTenants(loadedTenants);
      setBills(loadedBills);
      setPaymentRecords(loadedPayments);
    } catch (err) {
      console.error('Error cargando datos de Firebase:', err);
    }
  };

  // Google Sign In
  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      await loadAllData();
    } catch (err: any) {
      console.error('Error de autenticación con Google:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setAuthError(`Dominio no autorizado en Firebase. Debes añadir '${window.location.hostname}' en Firebase Console > Authentication > Settings > Authorized Domains.`);
      } else if (isInIframe || err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
        // Fallback for iframe popup restriction: try redirect or notify user to open in new tab
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          setAuthError('El visor integrado bloquea las ventanas de Google Auth. Haz clic en "Abrir en nueva pestaña" para iniciar sesión.');
        }
      } else {
        setAuthError(`Error de autenticación: ${err?.message || err?.code || 'Revisa la configuración de Firebase'}`);
      }
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      await loadAllData();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  // Save or Edit Tenant
  const handleSaveTenant = async (tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const saved = await rentService.saveTenant(tenantData);
    await loadAllData();
    setSelectedTenant(saved);
  };

  // Delete Tenant
  const handleDeleteTenant = async (tenantId: string) => {
    if (window.confirm('¿Estás seguro de eliminar la ficha de este inquilino?')) {
      await rentService.deleteTenant(tenantId);
      await loadAllData();
      if (selectedTenant?.id === tenantId) {
        setSelectedTenant(null);
      }
    }
  };

  // Quick Payment Status Update (Al día, Pendiente, Atrasado)
  const handleUpdatePaymentStatus = async (tenantId: string, newStatus: RentStatus) => {
    await rentService.updateTenantPaymentStatus(tenantId, newStatus);
    await loadAllData();
  };

  // Save Monthly Bill (Alquiler + Extras)
  const handleSaveBill = async (bill: MonthlyBill) => {
    await rentService.saveMonthlyBill(bill);
    await loadAllData();
  };

  // Register Payment
  const handleRegisterPayment = async (record: Omit<PaymentRecord, 'id' | 'createdAt' | 'userId'>) => {
    await rentService.registerPayment(record);
    await loadAllData();
  };

  // Modal Triggers
  const handleOpenNewTenantModal = () => {
    setTenantToEdit(null);
    setIsTenantModalOpen(true);
  };

  const handleOpenDetailModal = (tenant: Tenant) => {
    setTenantToEdit(tenant);
    setIsTenantModalOpen(true);
  };

  const handleOpenManagementForTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setActiveTab('gestion');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onOpenNewTenantModal={handleOpenNewTenantModal}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Auth Error Banner */}
        {authError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-xs sm:text-sm text-red-900 shadow-xs">
            <span className="bg-red-600 text-white p-1.5 rounded-xl shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="flex-1 space-y-1">
              <p className="font-bold">Error de Inicio de Sesión</p>
              <p>{authError}</p>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Login Notice Banner if in preview mode */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3 text-xs sm:text-sm text-blue-900">
              <span className="bg-blue-600 text-white p-1.5 rounded-xl shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span>
                <strong>Modo Vista Previa:</strong> Estás explorando la app con datos de demostración. Inicia sesión con Google para sincronizar tus datos en tiempo real.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isInIframe && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                  title="Abre la app fuera de la vista previa para evitar bloqueos del navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en nueva pestaña</span>
                </a>
              )}
              <button
                onClick={handleGoogleLogin}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
              >
                Iniciar Sesión con Google
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Página Principal de Inquilinos */}
        {activeTab === 'principal' && (
          <TenantList
            tenants={tenants}
            bills={bills}
            paymentRecords={paymentRecords}
            onSelectTenant={handleOpenDetailModal}
            onOpenManagementForTenant={handleOpenManagementForTenant}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
            onOpenNewTenantModal={handleOpenNewTenantModal}
            onDeleteTenant={handleDeleteTenant}
          />
        )}

        {/* Tab 2: Gestión Mensual de Gastos, Alquiler y Recibos */}
        {activeTab === 'gestion' && (
          <MonthlyManagement
            tenants={tenants}
            bills={bills}
            selectedTenant={selectedTenant}
            onSelectTenant={setSelectedTenant}
            onSaveBill={handleSaveBill}
            onRegisterPayment={handleRegisterPayment}
          />
        )}

        {/* Tab 3: Historial de Años y Ejercicios */}
        {activeTab === 'historial' && (
          <YearlyHistory
            bills={bills}
            tenants={tenants}
            paymentRecords={paymentRecords}
          />
        )}
      </main>

      {/* Floating Auxiliary Tools Button */}
      <button
        onClick={() => setIsCalculatorOpen(true)}
        className="fixed bottom-6 right-6 z-20 bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-full shadow-lg border border-slate-700 flex items-center space-x-2 text-xs font-bold transition transform hover:scale-105"
        title="Calculadora de prorrateo de suministros"
      >
        <Calculator className="w-5 h-5 text-blue-400" />
        <span className="hidden sm:inline">Calculadora Suministros</span>
      </button>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Gestión de Alquiler de Vivienda. Todos los derechos reservados.</p>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Preparado para Google Login & Vercel
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TenantModal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        tenant={tenantToEdit}
        onSaveTenant={handleSaveTenant}
        paymentHistory={paymentRecords}
        bills={bills}
      />

      <ExtraFeaturesModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}
