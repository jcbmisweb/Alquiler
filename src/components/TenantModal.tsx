import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldAlert,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Euro,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Upload,
  Trash2,
  Download,
  Lock,
  Plus,
  Paperclip,
  Check
} from 'lucide-react';
import { Tenant, RentStatus, TenantStatus, PaymentRecord, TenantDocument, MonthlyBill } from '../types';
import { downloadTenantJSON, downloadTenantCSV, printTenantReport } from '../utils/exportTenantData';

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null; // null if creating a new tenant
  onSaveTenant: (tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onDeleteTenant?: (tenantId: string) => void;
  paymentHistory?: PaymentRecord[];
  bills?: MonthlyBill[];
}

export const TenantModal: React.FC<TenantModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSaveTenant,
  onDeleteTenant,
  paymentHistory = [],
  bills = []
}) => {
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    address: '',
    phone: '',
    email: '',
    monthlyRentAmount: 700,
    rentPaymentStatus: 'al_dia' as RentStatus,
    leaseStartDate: new Date().toISOString().split('T')[0],
    leaseEndDate: '',
    status: 'active' as TenantStatus,
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    notes: '',
    lastPaymentDate: new Date().toISOString().split('T')[0],
    // Fianza (Deposit)
    hasDeposit: true,
    depositAmount: 700,
    depositDate: new Date().toISOString().split('T')[0],
    depositNotes: '',
    // Suministros (%)
    electricityPercentage: 50,
    waterPercentage: 50
  });

  // Signed Documents (PDF)
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDate, setNewDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDocFile, setNewDocFile] = useState<File | null>(null);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        dni: tenant.dni || '',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        monthlyRentAmount: tenant.monthlyRentAmount || 700,
        rentPaymentStatus: tenant.rentPaymentStatus || 'al_dia',
        leaseStartDate: tenant.leaseStartDate || new Date().toISOString().split('T')[0],
        leaseEndDate: tenant.leaseEndDate || '',
        status: tenant.status || 'active',
        emergencyName: tenant.emergencyContact?.name || '',
        emergencyPhone: tenant.emergencyContact?.phone || '',
        emergencyRelationship: tenant.emergencyContact?.relationship || '',
        notes: tenant.notes || '',
        lastPaymentDate: tenant.lastPaymentDate || new Date().toISOString().split('T')[0],
        hasDeposit: tenant.hasDeposit !== undefined ? tenant.hasDeposit : true,
        depositAmount: tenant.depositAmount !== undefined ? tenant.depositAmount : tenant.monthlyRentAmount || 700,
        depositDate: tenant.depositDate || tenant.leaseStartDate || new Date().toISOString().split('T')[0],
        depositNotes: tenant.depositNotes || '',
        electricityPercentage: tenant.electricityPercentage !== undefined ? tenant.electricityPercentage : 50,
        waterPercentage: tenant.waterPercentage !== undefined ? tenant.waterPercentage : 50
      });
      setDocuments(tenant.documents || []);
    } else {
      setFormData({
        name: '',
        dni: '',
        address: '',
        phone: '',
        email: '',
        monthlyRentAmount: 700,
        rentPaymentStatus: 'al_dia',
        leaseStartDate: new Date().toISOString().split('T')[0],
        leaseEndDate: '',
        status: 'active',
        emergencyName: '',
        emergencyPhone: '',
        emergencyRelationship: '',
        notes: '',
        lastPaymentDate: new Date().toISOString().split('T')[0],
        hasDeposit: true,
        depositAmount: 700,
        depositDate: new Date().toISOString().split('T')[0],
        depositNotes: '',
        electricityPercentage: 50,
        waterPercentage: 50
      });
      setDocuments([]);
    }
  }, [tenant, isOpen]);

  if (!isOpen) return null;

  // Handle PDF file upload
  const handleAddDocument = () => {
    if (!newDocFile) {
      alert('Por favor, selecciona un archivo PDF.');
      return;
    }

    if (newDocFile.size > 700 * 1024) {
      alert('El archivo supera los 700 KB permitidos para ser almacenado en la base de datos.');
      return;
    }

    const title = newDocTitle.trim() || newDocFile.name;
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileUrl = e.target?.result as string;
      const newDoc: TenantDocument = {
        id: `doc-${Date.now()}`,
        title,
        uploadDate: newDocDate,
        fileName: newDocFile.name,
        fileSize: `${(newDocFile.size / 1024 / 1024).toFixed(2)} MB`,
        fileUrl
      };

      setDocuments((prev) => [...prev, newDoc]);
      setNewDocTitle('');
      setNewDocFile(null);
    };

    reader.readAsDataURL(newDocFile);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleDeleteTenantClick = () => {
    if (tenant && onDeleteTenant) {
      onDeleteTenant(tenant.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor, indica al menos el nombre del inquilino.');
      return;
    }

    const payload: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } = {
      userId: tenant?.userId || '',
      name: formData.name.trim(),
      dni: formData.dni ? formData.dni.trim() : '',
      address: formData.address ? formData.address.trim() : '',
      phone: formData.phone ? formData.phone.trim() : '',
      email: formData.email ? formData.email.trim() : '',
      monthlyRentAmount: Number(formData.monthlyRentAmount) || 0,
      rentPaymentStatus: formData.rentPaymentStatus || 'al_dia',
      leaseStartDate: formData.leaseStartDate || new Date().toISOString().split('T')[0],
      leaseEndDate: formData.leaseEndDate ? formData.leaseEndDate.trim() : '',
      status: formData.status || 'active',
      emergencyContact: {
        name: formData.emergencyName ? formData.emergencyName.trim() : '',
        phone: formData.emergencyPhone ? formData.emergencyPhone.trim() : '',
        relationship: formData.emergencyRelationship ? formData.emergencyRelationship.trim() : ''
      },
      notes: formData.notes ? formData.notes.trim() : '',
      lastPaymentDate: formData.lastPaymentDate || new Date().toISOString().split('T')[0],
      hasDeposit: Boolean(formData.hasDeposit),
      depositAmount: formData.hasDeposit ? Number(formData.depositAmount) || 0 : 0,
      depositDate: formData.depositDate || '',
      depositNotes: formData.depositNotes ? formData.depositNotes.trim() : '',
      electricityPercentage: Number(formData.electricityPercentage) || 0,
      waterPercentage: Number(formData.waterPercentage) || 0,
      documents: documents || []
    };

    if (tenant?.id) {
      payload.id = tenant.id;
    }

    onSaveTenant(payload);

    onClose();
  };

  const filteredHistory = tenant
    ? paymentHistory.filter((p) => p.tenantId === tenant.id)
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">
              {tenant ? `Ficha del Inquilino: ${tenant.name}` : 'Crear Ficha de Nuevo Inquilino'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quick Export / Download Bar */}
          {tenant && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div>
                <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-700" />
                  Descargar Ficha e Historial Completo
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Exporta todos los datos personales, contrato, facturas y registros de cobros de este inquilino.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => printTenantReport(tenant, bills, paymentHistory)}
                  className="bg-white hover:bg-slate-50 text-blue-800 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Informe PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTenantCSV(tenant, bills, paymentHistory)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Excel / CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadTenantJSON(tenant, bills, paymentHistory)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Datos Personales del Inquilino */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
              1. Datos Personales del Inquilino
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Martínez Fernández"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DNI / NIE
                </label>
                <input
                  type="text"
                  placeholder="Ej: 12345678X"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección de la Vivienda Alquilada *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Calle Gran Vía 12, 3ºB"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono Móvil
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 612345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="Ej: laura@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Estado del Pago & Renta Mensual */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
              2. Renta y Estado del Pago
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Renta Mensual (€) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formData.monthlyRentAmount}
                    onChange={(e) => setFormData({ ...formData, monthlyRentAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado de Pago Actual
                </label>
                <select
                  value={formData.rentPaymentStatus}
                  onChange={(e) => setFormData({ ...formData, rentPaymentStatus: e.target.value as RentStatus })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="al_dia">✅ Al día (Pago correcto)</option>
                  <option value="pendiente">⏳ Pendiente de abonar</option>
                  <option value="atrasado">⚠️ Atrasado (Impago)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha Modificación de Pago
                </label>
                <input
                  type="date"
                  value={formData.lastPaymentDate}
                  onChange={(e) => setFormData({ ...formData, lastPaymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha Inicio Contrato
                </label>
                <input
                  type="date"
                  value={formData.leaseStartDate}
                  onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha Fin Contrato (Opcional)
                </label>
                <input
                  type="date"
                  value={formData.leaseEndDate}
                  onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado del Contrato
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TenantStatus })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                >
                  <option value="active">Activo (Inquilino Actual)</option>
                  <option value="past">Histórico / Pasado</option>
                </select>
              </div>
            </div>

            {/* Suministros y Porcentajes de Cobro */}
            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-2">
              <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <span className="bg-blue-600 text-white rounded-md p-1 text-[10px]">%</span>
                Porcentaje Imputable de Suministros al Inquilino
              </p>
              <p className="text-[11px] text-blue-700">
                Determina qué porcentaje de la factura total se le adjudica a este inquilino (ej: 50% de la luz o 50% del agua). Al registrar la factura completa, la app calculará automáticamente su parte.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    % Cobro Electricidad (Luz)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formData.electricityPercentage}
                      onChange={(e) => setFormData({ ...formData, electricityPercentage: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    % Cobro Agua
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formData.waterPercentage}
                      onChange={(e) => setFormData({ ...formData, waterPercentage: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Fianza / Depósito de Garantía */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                <Euro className="w-4 h-4 text-purple-600" />
                3. Fianza y Depósito de Garantía
              </h4>
            </div>

            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasDeposit}
                  onChange={(e) => setFormData({ ...formData, hasDeposit: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-xs font-bold text-slate-800">
                  ¿Hizo fianza / depósito entregado al firmar el contrato?
                </span>
              </label>

              {formData.hasDeposit && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cantidad de Fianza (€)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.depositAmount}
                        onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fecha de Cobro Fianza
                    </label>
                    <input
                      type="date"
                      value={formData.depositDate}
                      onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anotaciones Fianza / Depósito
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Depositada en IVIMA / Garantía adicional"
                      value={formData.depositNotes}
                      onChange={(e) => setFormData({ ...formData, depositNotes: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Documentos Firmados y Contrato en PDF */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              4. Documentos Firmados y Contrato (PDF)
            </h4>

            {/* List of uploaded documents */}
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{docItem.title}</p>
                        <p className="text-[11px] text-slate-500">
                          Fecha: {docItem.uploadDate} {docItem.fileSize ? `• ${docItem.fileSize}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {docItem.fileUrl && (
                        <a
                          href={docItem.fileUrl}
                          download={docItem.fileName || `${docItem.title}.pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar PDF</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(docItem.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                No hay ningún contrato o documento adjunto para este inquilino.
              </p>
            )}

            {/* Upload PDF Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-blue-600" />
                Adjuntar Nuevo Documento / Contrato Firmado en PDF
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Nombre/Título del Documento (Ej: Contrato Alquiler 2026.pdf)"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="sm:col-span-5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />

                <input
                  type="date"
                  value={newDocDate}
                  onChange={(e) => setNewDocDate(e.target.value)}
                  className="sm:col-span-3 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />

                <div className="sm:col-span-4 flex items-center space-x-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setNewDocFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shrink-0 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Guardar PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Datos de un Familiar de Contacto */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg inline-block flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              5. Contacto Familiar o de Emergencia
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Familiar
                </label>
                <input
                  type="text"
                  placeholder="Ej: Antonio Martínez"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono Familiar
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 699112233"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parentesco
                </label>
                <input
                  type="text"
                  placeholder="Ej: Padre, Madre, Hermano/a, Pareja"
                  value={formData.emergencyRelationship}
                  onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones / Notas adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Añade detalles sobre la fianza, entregas de llaves o acuerdos especiales..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
            />
          </div>

          {/* Payment History Section (If tenant exists) */}
          {tenant && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg inline-block flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                Historial de Registros de Pagos del Inquilino
              </h4>

              {filteredHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl">
                  Aún no se han registrado abonos individuales directos para este inquilino.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {filteredHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{rec.concept}</span>
                        <span className="text-slate-400 ml-2">({rec.paymentDate})</span>
                      </div>
                      <div className="font-bold text-emerald-600">
                        +{rec.amount.toFixed(2)} € ({rec.method})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Actions & Delete Tenant Button */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div>
              {tenant && onDeleteTenant && (
                <button
                  type="button"
                  onClick={handleDeleteTenantClick}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-4 py-2.5 rounded-xl border border-rose-200 flex items-center gap-2 text-xs transition"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Eliminar Inquilino</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 text-sm transition"
              >
                <Save className="w-4 h-4" />
                <span>{tenant ? 'Guardar Cambios' : 'Crear Inquilino'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
