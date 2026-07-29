import React, { useState, useEffect } from 'react';
import {
  Calendar,
  User,
  Plus,
  Trash2,
  FileText,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Euro,
  Receipt,
  Download,
  Lock,
  Unlock,
  Zap,
  Droplets,
  Wrench,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Tenant, MonthlyBill, ExtraConcept, PaymentRecord } from '../types';
import { generateReceiptPDF, generateWhatsAppLink } from '../utils/pdfGenerator';
import { downloadTenantJSON, downloadTenantCSV, printTenantReport } from '../utils/exportTenantData';

interface MonthlyManagementProps {
  tenants: Tenant[];
  bills: MonthlyBill[];
  selectedTenant: Tenant | null;
  onSelectTenant: (tenant: Tenant) => void;
  onSaveBill: (bill: MonthlyBill) => void;
  onRegisterPayment: (record: Omit<PaymentRecord, 'id' | 'createdAt' | 'userId'>) => void;
}

export const MonthlyManagement: React.FC<MonthlyManagementProps> = ({
  tenants,
  bills,
  selectedTenant,
  onSelectTenant,
  onSaveBill,
  onRegisterPayment
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // New extra concept form state with consumption date range and percentage share
  const [newConceptName, setNewConceptName] = useState('');
  const [newConceptAmount, setNewConceptAmount] = useState('');
  const [newConceptCategory, setNewConceptCategory] = useState<'suministro' | 'reparacion' | 'comunidad' | 'otro'>('suministro');
  const [totalInvoiceInput, setTotalInvoiceInput] = useState('');
  const [percentageShareInput, setPercentageShareInput] = useState('');
  const [newConceptStartDate, setNewConceptStartDate] = useState('');
  const [newConceptEndDate, setNewConceptEndDate] = useState('');

  const activeTenants = tenants.filter((t) => t.status === 'active');
  const currentTenant = selectedTenant || activeTenants[0] || tenants[0];

  // Auto-fill percentage share based on selected tenant and concept name
  useEffect(() => {
    if (!currentTenant) return;
    const lname = newConceptName.toLowerCase();
    if (lname.includes('luz') || lname.includes('elec')) {
      const p = currentTenant.electricityPercentage ?? 50;
      setPercentageShareInput(String(p));
      if (totalInvoiceInput && parseFloat(totalInvoiceInput) > 0) {
        setNewConceptAmount(((parseFloat(totalInvoiceInput) * p) / 100).toFixed(2));
      }
    } else if (lname.includes('agua')) {
      const p = currentTenant.waterPercentage ?? 50;
      setPercentageShareInput(String(p));
      if (totalInvoiceInput && parseFloat(totalInvoiceInput) > 0) {
        setNewConceptAmount(((parseFloat(totalInvoiceInput) * p) / 100).toFixed(2));
      }
    }
  }, [newConceptName, currentTenant, totalInvoiceInput]);

  const handleTotalInvoiceChange = (val: string) => {
    setTotalInvoiceInput(val);
    const totalVal = parseFloat(val);
    const pctVal = parseFloat(percentageShareInput || '100');
    if (!isNaN(totalVal) && totalVal > 0 && !isNaN(pctVal) && pctVal > 0) {
      setNewConceptAmount(((totalVal * pctVal) / 100).toFixed(2));
    } else if (!val) {
      setNewConceptAmount('');
    }
  };

  const handlePercentageShareChange = (val: string) => {
    setPercentageShareInput(val);
    const totalVal = parseFloat(totalInvoiceInput);
    const pctVal = parseFloat(val);
    if (!isNaN(totalVal) && totalVal > 0 && !isNaN(pctVal) && pctVal >= 0) {
      setNewConceptAmount(((totalVal * pctVal) / 100).toFixed(2));
    }
  };

  // Payment registration modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo' | 'bizum' | 'otro'>('bizum');
  const [paymentConcept, setPaymentConcept] = useState('Abono alquiler y gastos');

  // Items selected for immediate settlement in payment modal
  const [selectedItemsToPay, setSelectedItemsToPay] = useState<{ [key: string]: boolean }>({});

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  if (!currentTenant) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No hay inquilinos registrados</h3>
        <p className="text-sm text-slate-500 mt-1">
          Añade un inquilino en la pantalla principal para comenzar a gestionar sus mensualidades y recibos.
        </p>
      </div>
    );
  }

  // Find current bill for selected tenant, year & month
  const currentBill = bills.find(
    (b) => b.tenantId === currentTenant.id && b.year === selectedYear && b.month === selectedMonth
  );

  // Calculate pending from previous month if no bill created yet
  const previousMonthNum = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const previousYearNum = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevBill = bills.find(
    (b) => b.tenantId === currentTenant.id && b.year === previousYearNum && b.month === previousMonthNum
  );
  const previousArrears = prevBill ? prevBill.pendingAmount : 0;

  // Active or draft bill representation
  const activeBill: MonthlyBill = currentBill || {
    id: `bill-${selectedYear}-${selectedMonth}-${currentTenant.id}`,
    userId: currentTenant.userId || '',
    tenantId: currentTenant.id,
    tenantName: currentTenant.name,
    year: selectedYear,
    month: selectedMonth,
    rentAmount: currentTenant.monthlyRentAmount,
    extraConcepts: [],
    totalAmount: currentTenant.monthlyRentAmount + previousArrears,
    paidAmount: 0,
    pendingAmount: currentTenant.monthlyRentAmount + previousArrears,
    previousPendingAmount: previousArrears,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. SCAN ALL PRIOR UNPAID UTILITY & EXTRA CONCEPTS Across Previous Months
  const pastBills = bills.filter((b) => {
    if (b.tenantId !== currentTenant.id) return false;
    if (b.year < selectedYear) return true;
    return b.year === selectedYear && b.month < selectedMonth;
  });

  const pendingPastConcepts: {
    billId: string;
    concept: ExtraConcept;
    monthName: string;
    year: number;
    month: number;
  }[] = [];

  pastBills.forEach((pb) => {
    const mName = monthNames[pb.month - 1];
    pb.extraConcepts.forEach((ec) => {
      // Unpaid concept from past month that hasn't been imported into current active bill yet
      const alreadyImported = activeBill.extraConcepts.some(
        (curEc) => curEc.id === ec.id || (curEc.concept === `${ec.concept} (${mName})`)
      );
      if (!ec.isPaid && !alreadyImported) {
        pendingPastConcepts.push({
          billId: pb.id,
          concept: ec,
          monthName: mName,
          year: pb.year,
          month: pb.month
        });
      }
    });
  });

  // 2. Import a past unpaid concept into current active bill
  const handleImportPastConcept = (pastItem: typeof pendingPastConcepts[0]) => {
    const importedConcept: ExtraConcept = {
      ...pastItem.concept,
      id: `imported-${pastItem.concept.id}-${Date.now()}`,
      concept: `${pastItem.concept.concept} (${pastItem.monthName} ${pastItem.year})`,
      originMonthName: `${pastItem.monthName} ${pastItem.year}`,
      periodMonth: pastItem.month,
      periodYear: pastItem.year,
      isPaid: false,
      isLocked: false
    };

    const updatedExtras = [...activeBill.extraConcepts, importedConcept];
    const newTotalExtras = updatedExtras.reduce((sum, item) => sum + item.amount, 0);
    const newTotal = activeBill.rentAmount + activeBill.previousPendingAmount + newTotalExtras;
    const newPending = Math.max(0, newTotal - activeBill.paidAmount);

    let newStatus = activeBill.status;
    if (newPending === 0) newStatus = 'paid';
    else if (activeBill.paidAmount > 0) newStatus = 'partial';
    else newStatus = 'pending';

    const updatedBill: MonthlyBill = {
      ...activeBill,
      extraConcepts: updatedExtras,
      totalAmount: newTotal,
      pendingAmount: newPending,
      status: newStatus
    };

    onSaveBill(updatedBill);
  };

  // 3. Mark past concept as paid & locked directly in its origin month
  const handleMarkPastConceptPaid = (pastItem: typeof pendingPastConcepts[0]) => {
    const targetBill = bills.find((b) => b.id === pastItem.billId);
    if (!targetBill) return;

    const updatedExtras = targetBill.extraConcepts.map((ec) =>
      ec.id === pastItem.concept.id ? { ...ec, isPaid: true, isLocked: true, paymentDate: new Date().toISOString() } : ec
    );

    const updatedBill: MonthlyBill = {
      ...targetBill,
      extraConcepts: updatedExtras
    };

    onSaveBill(updatedBill);
  };

  // Add extra concept (Agua, Luz, Reparaciones, etc.) with period dates
  const handleAddExtraConcept = () => {
    if (!newConceptName.trim() || !newConceptAmount || parseFloat(newConceptAmount) <= 0) {
      alert('Introduce un concepto válido y un importe mayor a cero.');
      return;
    }

    const newExtra: ExtraConcept = {
      id: `ext-${Date.now()}`,
      concept: newConceptName.trim(),
      amount: parseFloat(newConceptAmount),
      totalInvoiceAmount: totalInvoiceInput ? parseFloat(totalInvoiceInput) : undefined,
      percentageShare: percentageShareInput ? parseFloat(percentageShareInput) : undefined,
      isPaid: false,
      isLocked: false,
      category: newConceptCategory,
      originMonthName: `${monthNames[selectedMonth - 1]} ${selectedYear}`,
      periodMonth: selectedMonth,
      periodYear: selectedYear,
      periodStartDate: newConceptStartDate || undefined,
      periodEndDate: newConceptEndDate || undefined
    };

    const updatedExtras = [...activeBill.extraConcepts, newExtra];
    const newTotalExtras = updatedExtras.reduce((sum, item) => sum + item.amount, 0);
    const newTotal = activeBill.rentAmount + activeBill.previousPendingAmount + newTotalExtras;
    const newPending = Math.max(0, newTotal - activeBill.paidAmount);

    let newStatus = activeBill.status;
    if (newPending === 0) newStatus = 'paid';
    else if (activeBill.paidAmount > 0) newStatus = 'partial';
    else newStatus = 'pending';

    const updatedBill: MonthlyBill = {
      ...activeBill,
      extraConcepts: updatedExtras,
      totalAmount: newTotal,
      pendingAmount: newPending,
      status: newStatus
    };

    onSaveBill(updatedBill);
    setNewConceptName('');
    setNewConceptAmount('');
    setTotalInvoiceInput('');
    setPercentageShareInput('');
    setNewConceptStartDate('');
    setNewConceptEndDate('');
  };

  // Remove extra concept
  const handleRemoveExtraConcept = (extraId: string) => {
    const targetExtra = activeBill.extraConcepts.find((e) => e.id === extraId);
    if (targetExtra?.isLocked) {
      if (!window.confirm('Este gasto está marcado como COBRADO y BLOQUEADO. ¿Deseas eliminarlo de todos modos?')) {
        return;
      }
    }

    const updatedExtras = activeBill.extraConcepts.filter((e) => e.id !== extraId);
    const newTotalExtras = updatedExtras.reduce((sum, item) => sum + item.amount, 0);
    const newTotal = activeBill.rentAmount + activeBill.previousPendingAmount + newTotalExtras;
    const newPending = Math.max(0, newTotal - activeBill.paidAmount);

    let newStatus = activeBill.status;
    if (newPending === 0) newStatus = 'paid';
    else if (activeBill.paidAmount > 0) newStatus = 'partial';
    else newStatus = 'pending';

    const updatedBill: MonthlyBill = {
      ...activeBill,
      extraConcepts: updatedExtras,
      totalAmount: newTotal,
      pendingAmount: newPending,
      status: newStatus
    };

    onSaveBill(updatedBill);
  };

  // Toggle item paid / lock status
  const handleToggleExtraPaid = (extraId: string) => {
    const updatedExtras = activeBill.extraConcepts.map((e) => {
      if (e.id === extraId) {
        const nextPaid = !e.isPaid;
        return {
          ...e,
          isPaid: nextPaid,
          isLocked: nextPaid // Automatically lock when paid!
        };
      }
      return e;
    });

    const updatedBill: MonthlyBill = {
      ...activeBill,
      extraConcepts: updatedExtras
    };

    onSaveBill(updatedBill);
  };

  // Recalculate suggested payment amount whenever selected items to pay change
  const updatePaymentAmountFromSelections = (selections: { [key: string]: boolean }) => {
    let sum = 0;
    if (selections['rent']) sum += activeBill.rentAmount;
    if (selections['arrears']) sum += activeBill.previousPendingAmount;
    activeBill.extraConcepts.forEach((ec) => {
      if (selections[ec.id]) sum += ec.amount;
    });

    const suggestedPayment = Math.max(0, sum - activeBill.paidAmount);
    setPaymentAmount(suggestedPayment.toFixed(2));
  };

  // Toggle checkbox item in payment modal
  const handleToggleItemToPay = (key: string, isChecked: boolean) => {
    const nextSelections = { ...selectedItemsToPay, [key]: isChecked };
    setSelectedItemsToPay(nextSelections);
    updatePaymentAmountFromSelections(nextSelections);
  };

  // Open Payment Modal with auto-selected items
  const handleOpenPaymentModal = () => {
    const initialMap: { [key: string]: boolean } = {
      rent: activeBill.rentAmount > 0,
      arrears: activeBill.previousPendingAmount > 0
    };

    activeBill.extraConcepts.forEach((ec) => {
      if (!ec.isPaid) {
        initialMap[ec.id] = true;
      }
    });

    setSelectedItemsToPay(initialMap);
    updatePaymentAmountFromSelections(initialMap);
    setShowPaymentModal(true);
  };

  // Register payment against bill and lock paid items
  const handleConfirmPayment = () => {
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor, indica un importe de abono válido.');
      return;
    }

    const newPaidTotal = activeBill.paidAmount + amountNum;
    const newPending = Math.max(0, activeBill.totalAmount - newPaidTotal);

    let newStatus: 'paid' | 'partial' | 'pending' = 'pending';
    if (newPending <= 0) newStatus = 'paid';
    else if (newPaidTotal > 0) newStatus = 'partial';

    // Mark concepts as paid & locked if selected in modal
    const updatedExtras = activeBill.extraConcepts.map((ec) => {
      if (selectedItemsToPay[ec.id] || newPending === 0) {
        return {
          ...ec,
          isPaid: true,
          isLocked: true,
          paymentDate: new Date().toISOString()
        };
      }
      return ec;
    });

    const updatedBill: MonthlyBill = {
      ...activeBill,
      extraConcepts: updatedExtras,
      paidAmount: newPaidTotal,
      pendingAmount: newPending,
      status: newStatus,
      lastPaidDate: new Date().toISOString().split('T')[0]
    };

    onSaveBill(updatedBill);

    // Register log
    onRegisterPayment({
      tenantId: currentTenant.id,
      monthlyBillId: activeBill.id,
      amount: amountNum,
      paymentDate: new Date().toISOString().split('T')[0],
      method: paymentMethod,
      concept: paymentConcept || `Abono de ${monthNames[selectedMonth - 1]} ${selectedYear}`
    });

    setShowPaymentModal(false);
    setPaymentAmount('');
  };

  // Download PDF
  const handleDownloadPDF = () => {
    generateReceiptPDF(activeBill, currentTenant);
  };

  // Open WhatsApp with pre-formatted message
  const handleOpenWhatsApp = () => {
    const url = generateWhatsAppLink(activeBill, currentTenant);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Explanation Banner: Late utility bill handling */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <span className="p-2 bg-blue-600/30 rounded-xl text-blue-300 shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Control Flexible de Cobros y Suministros Tardíos (Luz / Agua)
              </h3>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                Si cobras cada 1, 2 o 3 meses o si las facturas de luz/agua llegan con retraso (ej. Junio no cobrado), el sistema detecta los conceptos pendientes y los <strong>bloquea automáticamente (🔒)</strong> al cobrarlos para garantizar un balance exacto.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Tenant Selector & Month Control */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          {/* Tenant Selector */}
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Seleccionar Inquilino
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <User className="w-5 h-5 text-blue-600 shrink-0" />
              <select
                value={currentTenant.id}
                onChange={(e) => {
                  const found = tenants.find((t) => t.id === e.target.value);
                  if (found) onSelectTenant(found);
                }}
                className="w-full max-w-md bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold rounded-xl px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.address} ({t.status === 'active' ? 'Activo' : 'Histórico'})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => printTenantReport(currentTenant, bills)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-2.5 rounded-xl flex items-center gap-1 transition"
                  title="Imprimir o guardar en PDF el informe completo de este inquilino"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => downloadTenantCSV(currentTenant, bills)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-2.5 rounded-xl flex items-center gap-1 transition"
                  title="Descargar Excel / CSV con el historial de facturación de este inquilino"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center space-x-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Selected Tenant Quick Card Banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-4 pt-2">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-slate-800">
              📍 <span className="font-semibold">{currentTenant.address}</span>
            </span>
            <span>📱 {currentTenant.phone || 'Sin teléfono'}</span>
            <span>💶 Renta Fija: <strong className="text-slate-900">{currentTenant.monthlyRentAmount} €/mes</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generar Recibo PDF</span>
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETECTED PAST UNPAID UTILITIES CARD */}
      {pendingPastConcepts.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-amber-200/80 rounded-xl text-amber-800">
                <Zap className="w-5 h-5 text-amber-700" />
              </span>
              <div>
                <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                  📌 Facturas y Suministros Sin Cobrar de Meses Anteriores ({pendingPastConcepts.length})
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  El sistema ha localizado suministros o gastos pendientes de meses pasados para <strong>{currentTenant.name}</strong>. Puedes añadirlos a este cobro de {monthNames[selectedMonth - 1]} {selectedYear}.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block bg-amber-200 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
              Arrastre Automático
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {pendingPastConcepts.map((item, idx) => (
              <div
                key={`${item.billId}-${item.concept.id}-${idx}`}
                className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1">
                      Origen: {item.monthName} {item.year}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{item.concept.concept}</h4>
                    {item.concept.periodStartDate && item.concept.periodEndDate && (
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        Consumo: {item.concept.periodStartDate} al {item.concept.periodEndDate}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-rose-600">{item.concept.amount.toFixed(2)} €</span>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleImportPastConcept(item)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir a {monthNames[selectedMonth - 1]}</span>
                  </button>
                  <button
                    onClick={() => handleMarkPastConceptPaid(item)}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-1 transition"
                    title="Marcar como cobrado en su mes de origen"
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cobrado</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Breakdown Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Conceptos & Gastos del Mes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Automatic Rent & Arrears Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                Desglose Mensual: {monthNames[selectedMonth - 1]} {selectedYear}
              </h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                Alquiler + Arrastres
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              {/* Renta Alquiler Fija */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>Renta Mensual Alquiler</span>
                    {activeBill.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3 text-emerald-600" /> Cobrado (Bloqueado)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-amber-600" /> Pendiente
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Importe contractual de la ficha del inquilino</p>
                </div>
                <p className="text-base font-bold text-slate-900">{activeBill.rentAmount.toFixed(2)} €</p>
              </div>

              {/* Arrastre de meses anteriores si hubiere */}
              {activeBill.previousPendingAmount > 0 && (
                <div className="py-3 flex items-center justify-between bg-rose-50/50 -mx-6 px-6">
                  <div>
                    <p className="font-semibold text-rose-800 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Pendiente / Arrastre de Meses Anteriores
                    </p>
                    <p className="text-xs text-rose-600">Saldo no abonado de mensualidades anteriores</p>
                  </div>
                  <p className="text-base font-bold text-rose-700">+{activeBill.previousPendingAmount.toFixed(2)} €</p>
                </div>
              )}
            </div>
          </div>

          {/* Suministros y Conceptos Extras (con opción de Bloqueo 🔒) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Suministros y Gastos Extras (Agua, Luz, Reparaciones)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los gastos marcados como cobrados quedan <strong>bloqueados (🔒)</strong> para proteger la precisión de tus cobros.
                </p>
              </div>
            </div>

            {/* List of Extra Concepts */}
            {activeBill.extraConcepts.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-dashed border-slate-200">
                No hay suministros ni gastos cargados para este mes.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeBill.extraConcepts.map((extra) => (
                  <div
                    key={extra.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm transition ${
                      extra.isPaid
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleExtraPaid(extra.id)}
                        className={`p-1.5 rounded-lg border transition ${
                          extra.isPaid
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-400 border-slate-300 hover:border-emerald-500'
                        }`}
                        title={extra.isPaid ? 'Cobrado (Haz clic para desbloquear)' : 'Marcar como cobrado'}
                      >
                        {extra.isPaid ? <Lock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </button>

                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <p className={`font-bold ${extra.isPaid ? 'text-slate-800' : 'text-slate-900'}`}>
                            {extra.concept}
                          </p>
                          {extra.originMonthName && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                              {extra.originMonthName}
                            </span>
                          )}
                          {extra.totalInvoiceAmount && extra.percentageShare && (
                            <span className="text-[10px] bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded border border-purple-200">
                              {extra.percentageShare}% de {extra.totalInvoiceAmount.toFixed(2)} € total
                            </span>
                          )}
                        </div>

                        {extra.periodStartDate && extra.periodEndDate && (
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-blue-600" />
                            Fechas consumo: {extra.periodStartDate} al {extra.periodEndDate}
                          </p>
                        )}

                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            {extra.category || 'Gasto extra'}
                          </span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span
                            className={`text-[10px] font-bold ${
                              extra.isPaid ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {extra.isPaid ? '🔒 Cobrado y Bloqueado' : '⏳ Pendiente de cobro'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-base text-slate-900">{extra.amount.toFixed(2)} €</span>
                      <button
                        onClick={() => handleRemoveExtraConcept(extra.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="Eliminar concepto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Extra Form with Consumption Dates and Invoice Split Calculator */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Añadir Factura o Gasto de este Mes
                </h4>
                {currentTenant && (
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    % Asignado: Luz ({currentTenant.electricityPercentage ?? 50}%) | Agua ({currentTenant.waterPercentage ?? 50}%)
                  </span>
                )}
              </div>

              {/* Step 1: Main Concept Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Ej: Luz, Agua, Reparación caldera"
                  value={newConceptName}
                  onChange={(e) => setNewConceptName(e.target.value)}
                  className="sm:col-span-8 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                />

                <select
                  value={newConceptCategory}
                  onChange={(e) => setNewConceptCategory(e.target.value as any)}
                  className="sm:col-span-4 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                >
                  <option value="suministro">Suministro (Agua/Luz)</option>
                  <option value="reparacion">Reparación</option>
                  <option value="comunidad">Comunidad</option>
                  <option value="otro">Otro concepto</option>
                </select>
              </div>

              {/* Step 2: Total Invoice, Percentage Share & Final Tenant Charge */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Factura Total Suministro (€)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 94.52"
                      value={totalInvoiceInput}
                      onChange={(e) => handleTotalInvoiceChange(e.target.value)}
                      className="w-full pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">€</span>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    % Inquilino
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      placeholder="50"
                      value={percentageShareInput}
                      onChange={(e) => handlePercentageShareChange(e.target.value)}
                      className="w-full pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-emerald-800 mb-0.5">
                    A Cobrar Inquilino (€) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newConceptAmount}
                      onChange={(e) => setNewConceptAmount(e.target.value)}
                      className="w-full pl-2.5 pr-6 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-extrabold text-emerald-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">€</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddExtraConcept}
                  className="sm:col-span-2 mt-auto bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition py-2 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>

              {/* Consumption Dates row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Fecha Consumo Desde (Opcional):
                  </label>
                  <input
                    type="date"
                    value={newConceptStartDate}
                    onChange={(e) => setNewConceptStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Fecha Consumo Hasta (Opcional):
                  </label>
                  <input
                    type="date"
                    value={newConceptEndDate}
                    onChange={(e) => setNewConceptEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Totals, Payment Status & Receipt Action */}
        <div className="space-y-6">
          {/* Liquidation Summary Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Resumen del Recibo
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  activeBill.status === 'paid'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : activeBill.status === 'partial'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {activeBill.status === 'paid' ? 'TOTALMENTE PAGADO' : activeBill.status === 'partial' ? 'PAGO PARCIAL' : 'PENDIENTE DE COBRO'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Renta Alquiler:</span>
                <span className="font-medium text-white">{activeBill.rentAmount.toFixed(2)} €</span>
              </div>

              {activeBill.previousPendingAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-amber-300">
                  <span>Atrasos Anteriores:</span>
                  <span className="font-bold">+{activeBill.previousPendingAmount.toFixed(2)} €</span>
                </div>
              )}

              {activeBill.extraConcepts.length > 0 && (
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Suministros / Extras:</span>
                  <span className="font-medium text-white">
                    +{activeBill.extraConcepts.reduce((s, e) => s + e.amount, 0).toFixed(2)} €
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-lg font-bold">
                <span className="text-slate-200">Total a Cobrar:</span>
                <span className="text-2xl text-white">{activeBill.totalAmount.toFixed(2)} €</span>
              </div>

              <div className="pt-2 divide-y divide-slate-800 text-xs">
                <div className="py-1.5 flex justify-between text-emerald-400 font-semibold">
                  <span>Importe Ya Pagado:</span>
                  <span>{activeBill.paidAmount.toFixed(2)} €</span>
                </div>
                <div className="py-1.5 flex justify-between text-rose-400 font-bold">
                  <span>Resta Por Pagar:</span>
                  <span>{activeBill.pendingAmount.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleOpenPaymentModal}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition"
              >
                <Euro className="w-4 h-4" />
                <span>Registrar Cobro / Abono</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Descargar Recibo en PDF</span>
              </button>

              <button
                onClick={handleOpenWhatsApp}
                className="w-full bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-300 border border-emerald-600/40 font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Enviar Recibo por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Registration Modal with Itemized Checkbox Breakdown */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Euro className="w-5 h-5 text-emerald-600" />
                Registrar Cobro y Bloquear Gastos
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Selecciona los conceptos que el inquilino está pagando hoy. Al guardar, quedarán <strong>bloqueados (🔒)</strong> automáticamente.
            </p>

            {/* Checklist of concepts included in this payment */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                Desglose de Conceptos a Liquidar Hoy:
              </span>

              <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!selectedItemsToPay['rent']}
                    onChange={(e) => handleToggleItemToPay('rent', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">Renta Alquiler {monthNames[selectedMonth - 1]}</span>
                </div>
                <span className="font-bold text-slate-900">{activeBill.rentAmount.toFixed(2)} €</span>
              </label>

              {activeBill.previousPendingAmount > 0 && (
                <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!selectedItemsToPay['arrears']}
                      onChange={(e) => handleToggleItemToPay('arrears', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-rose-700">Atrasos de Meses Anteriores</span>
                  </div>
                  <span className="font-bold text-rose-700">+{activeBill.previousPendingAmount.toFixed(2)} €</span>
                </label>
              )}

              {activeBill.extraConcepts.map((ec) => (
                <label
                  key={ec.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!selectedItemsToPay[ec.id]}
                      onChange={(e) => handleToggleItemToPay(ec.id, e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">{ec.concept}</span>
                      {ec.periodStartDate && ec.periodEndDate && (
                        <span className="text-[10px] text-slate-400 block">
                          Consumo: {ec.periodStartDate} al {ec.periodEndDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">+{ec.amount.toFixed(2)} €</span>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Importe Recibido (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`Monto sugerido: ${activeBill.pendingAmount.toFixed(2)} €`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setPaymentAmount(activeBill.pendingAmount.toString())}
                  className="text-[11px] text-blue-600 font-medium hover:underline mt-1"
                >
                  Cobrar todo el restante ({activeBill.pendingAmount.toFixed(2)} €)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                >
                  <option value="bizum">Bizum</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Concepto / Nota del Cobro
                </label>
                <input
                  type="text"
                  value={paymentConcept}
                  onChange={(e) => setPaymentConcept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Guardar Cobro y Bloquear</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
