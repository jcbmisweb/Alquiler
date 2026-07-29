import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Euro,
  FileText,
  Edit3,
  Trash2,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  UserPlus,
  Zap,
  Droplets
} from 'lucide-react';
import { Tenant, RentStatus } from '../types';

interface TenantListProps {
  tenants: Tenant[];
  onSelectTenant: (tenant: Tenant) => void;
  onOpenManagementForTenant: (tenant: Tenant) => void;
  onUpdatePaymentStatus: (tenantId: string, newStatus: RentStatus) => void;
  onOpenNewTenantModal: () => void;
  onDeleteTenant: (tenantId: string) => void;
}

export const TenantList: React.FC<TenantListProps> = ({
  tenants,
  onSelectTenant,
  onOpenManagementForTenant,
  onUpdatePaymentStatus,
  onOpenNewTenantModal,
  onDeleteTenant
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'past'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filtered tenants
  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.dni.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'active') return matchesSearch && tenant.status === 'active';
    if (filterStatus === 'past') return matchesSearch && tenant.status === 'past';
    return matchesSearch;
  });

  // Calculated KPI Summary
  const totalRentExpected = tenants
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + t.monthlyRentAmount, 0);

  const activeTenantsCount = tenants.filter((t) => t.status === 'active').length;
  const upToDateCount = tenants.filter((t) => t.status === 'active' && t.rentPaymentStatus === 'al_dia').length;
  const pendingCount = tenants.filter((t) => t.status === 'active' && t.rentPaymentStatus !== 'al_dia').length;

  const handleQuickStatusChange = (tenantId: string, currentStatus: RentStatus) => {
    setUpdatingId(tenantId);
    let nextStatus: RentStatus = 'al_dia';
    if (currentStatus === 'al_dia') nextStatus = 'pendiente';
    else if (currentStatus === 'pendiente') nextStatus = 'atrasado';
    else if (currentStatus === 'atrasado') nextStatus = 'al_dia';

    onUpdatePaymentStatus(tenantId, nextStatus);
    setTimeout(() => setUpdatingId(null), 300);
  };

  const getStatusBadge = (status: RentStatus) => {
    switch (status) {
      case 'al_dia':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Al Día
          </span>
        );
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pago Pendiente
          </span>
        );
      case 'atrasado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Atrasado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              Gestión Principal de Inquilinos
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Panel de control con datos personales, contratos y estado de pago de la renta mensual.
            </p>
          </div>
          <button
            onClick={onOpenNewTenantModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Añadir Nuevo Inquilino
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Renta Mensual Estimada</span>
              <Euro className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-1">{totalRentExpected.toFixed(2)} €</p>
            <p className="text-[11px] text-slate-400 mt-1">{activeTenantsCount} inquilino(s) activo(s)</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Inquilinos al Día</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{upToDateCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Pagos de renta actualizados</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Pagos Pendientes/Atrasados</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Requieren revisión en gestión</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({tenants.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterStatus === 'active' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activos ({tenants.filter((t) => t.status === 'active').length})
          </button>
          <button
            onClick={() => setFilterStatus('past')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterStatus === 'past' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico / Pasados ({tenants.filter((t) => t.status === 'past').length})
          </button>
        </div>
      </div>

      {/* Tenants Grid / Cards List */}
      {filteredTenants.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No se encontraron inquilinos</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Prueba a modificar la búsqueda o añade un nuevo inquilino para comenzar a gestionar el alquiler.
          </p>
          <button
            onClick={onOpenNewTenantModal}
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white font-medium px-4 py-2 rounded-xl text-sm hover:bg-blue-500 transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Crear Inquilino
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              className={`bg-white rounded-2xl p-6 border shadow-sm transition-all hover:shadow-md relative flex flex-col justify-between ${
                tenant.status === 'past' ? 'border-slate-200 opacity-80 bg-slate-50/50' : 'border-slate-200/90'
              }`}
            >
              <div>
                {/* Header card info */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">{tenant.name}</h3>
                      {tenant.status === 'past' && (
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Periodo Pasado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        DNI: {tenant.dni || 'Sin DNI'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {tenant.address}
                      </span>
                    </div>
                  </div>

                  {/* Payment Status Badge with Quick Toggle */}
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => handleQuickStatusChange(tenant.id, tenant.rentPaymentStatus)}
                      title="Haz clic para actualizar el estado del pago"
                      className="cursor-pointer hover:scale-105 transition transform"
                    >
                      {getStatusBadge(tenant.rentPaymentStatus)}
                    </button>
                    <span className="text-[10px] text-slate-400 italic">
                      Actualizado: {tenant.lastPaymentDate ? new Date(tenant.lastPaymentDate).toLocaleDateString('es-ES') : 'Hoy'}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs sm:text-sm">
                  {/* Left Column - Contact & Rent */}
                  <div className="space-y-2">
                    <div className="flex items-center text-slate-700 gap-2">
                      <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{tenant.phone || 'Sin teléfono'}</span>
                    </div>
                    <div className="flex items-center text-slate-700 gap-2">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">{tenant.email || 'Sin correo'}</span>
                    </div>
                    <div className="flex items-center text-slate-900 font-bold gap-2 pt-1">
                      <Euro className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Renta Mensual: <span className="text-emerald-700 text-base">{tenant.monthlyRentAmount} €</span></span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Luz: {tenant.electricityPercentage ?? 50}%
                      </span>
                      <span className="text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-cyan-600" />
                        Agua: {tenant.waterPercentage ?? 50}%
                      </span>
                    </div>
                  </div>

                  {/* Right Column - Lease Dates, Deposit & Emergency Contact */}
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center text-slate-600 gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-medium">Inicio Contrato:</span>
                      <span>{tenant.leaseStartDate}</span>
                    </div>

                    {tenant.hasDeposit && (
                      <div className="flex items-center text-purple-800 gap-1.5 text-xs font-semibold">
                        <Euro className="w-3.5 h-3.5 text-purple-600" />
                        <span>Fianza: {tenant.depositAmount || tenant.monthlyRentAmount} €</span>
                      </div>
                    )}

                    {tenant.documents && tenant.documents.length > 0 && (
                      <div className="flex items-center text-indigo-700 gap-1.5 text-xs font-medium">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{tenant.documents.length} PDF(s) adjunto(s)</span>
                      </div>
                    )}

                    {tenant.emergencyContact && tenant.emergencyContact.name && (
                      <div className="pt-1 text-xs border-t border-slate-200 mt-1">
                        <p className="font-semibold text-slate-700 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          Familiar: {tenant.emergencyContact.name} ({tenant.emergencyContact.relationship})
                        </p>
                        <p className="text-slate-500 pl-4">Tel: {tenant.emergencyContact.phone || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onSelectTenant(tenant)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ver Ficha Completa</span>
                  </button>
                  <button
                    onClick={() => onDeleteTenant(tenant.id)}
                    title="Eliminar inquilino"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => onOpenManagementForTenant(tenant)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <span>Gestionar Gastos & Recibo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
