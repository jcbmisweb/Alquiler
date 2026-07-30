import React, { useState } from 'react';
import { Tenant, MonthlyBill, ExtraConcept } from '../types';
import {
  Zap,
  Droplets,
  Home,
  Plus,
  Lock,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Euro,
  FileText,
  CornerDownRight,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface MultiMonthDebtControlProps {
  currentTenant: Tenant;
  bills: MonthlyBill[];
  selectedYear: number;
  selectedMonth: number;
  monthNames: string[];
  onSaveBill: (bill: MonthlyBill) => void;
  onImportPastConcept: (pastItem: {
    billId: string;
    concept: ExtraConcept;
    monthName: string;
    year: number;
    month: number;
  }) => void;
  onOpenPaymentForMonth?: (year: number, month: number) => void;
}

export const MultiMonthDebtControl: React.FC<MultiMonthDebtControlProps> = ({
  currentTenant,
  bills,
  selectedYear,
  selectedMonth,
  monthNames,
  onSaveBill,
  onImportPastConcept,
  onOpenPaymentForMonth
}) => {
  const [showAddModal, setShowAddModal] = useState<{
    billId: string;
    year: number;
    month: number;
    category: 'luz' | 'agua' | 'otro';
  } | null>(null);

  const [quickAmount, setQuickAmount] = useState('');
  const [quickTotalInvoice, setQuickTotalInvoice] = useState('');
  const [quickStartDate, setQuickStartDate] = useState('');
  const [quickEndDate, setQuickEndDate] = useState('');

  // Find all past & current months for this tenant up to current month that have debt or pending items
  const allTenantBills = bills.filter(b => b.tenantId === currentTenant.id);

  // Generate chronological month list for last 12 months up to current selectedMonth/selectedYear
  const monthsToEvaluate: { year: number; month: number; monthName: string }[] = [];
  
  // Go back up to 6 months
  for (let i = 5; i >= 0; i--) {
    let m = selectedMonth - i;
    let y = selectedYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    monthsToEvaluate.push({
      year: y,
      month: m,
      monthName: monthNames[m - 1]
    });
  }

  // Calculate month items status
  const monthData = monthsToEvaluate.map(({ year, month, monthName }) => {
    const existingBill = allTenantBills.find(b => b.year === year && b.month === month);

    const rentAmount = existingBill ? existingBill.rentAmount : currentTenant.monthlyRentAmount;
    const isRentPaid = existingBill ? (existingBill.paidAmount >= existingBill.rentAmount || existingBill.status === 'paid') : false;

    // Find electricity extra
    const elecConcept = existingBill?.extraConcepts.find(
      c => c.category === 'suministro' && (c.concept.toLowerCase().includes('luz') || c.concept.toLowerCase().includes('electr'))
    ) || existingBill?.extraConcepts.find(c => c.concept.toLowerCase().includes('luz'));

    // Find water extra
    const waterConcept = existingBill?.extraConcepts.find(
      c => c.category === 'suministro' && (c.concept.toLowerCase().includes('agua') || c.concept.toLowerCase().includes('hidr'))
    ) || existingBill?.extraConcepts.find(c => c.concept.toLowerCase().includes('agua'));

    // Other extra concepts
    const otherConcepts = existingBill?.extraConcepts.filter(
      c => c !== elecConcept && c !== waterConcept
    ) || [];

    const totalUnpaidExtras = (existingBill?.extraConcepts || [])
      .filter(c => !c.isPaid)
      .reduce((s, c) => s + c.amount, 0);

    const isCurrentActive = year === selectedYear && month === selectedMonth;
    const isPendingMonth = !isRentPaid || totalUnpaidExtras > 0 || (existingBill && existingBill.pendingAmount > 0);

    return {
      year,
      month,
      monthName,
      existingBill,
      rentAmount,
      isRentPaid,
      elecConcept,
      waterConcept,
      otherConcepts,
      totalUnpaidExtras,
      isCurrentActive,
      isPendingMonth
    };
  });

  // Filter to show only pending/unpaid months + active month
  const activeAndPendingMonths = monthData.filter(m => m.isPendingMonth || m.isCurrentActive);

  // Handle Postpone Supply
  const handleTogglePostpone = (bill: MonthlyBill, conceptId: string) => {
    const updatedExtras = bill.extraConcepts.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          isPostponed: !c.isPostponed
        };
      }
      return c;
    });

    onSaveBill({
      ...bill,
      extraConcepts: updatedExtras
    });
  };

  // Handle Quick Add Supply
  const handleSaveQuickSupply = () => {
    if (!showAddModal || !quickAmount || parseFloat(quickAmount) <= 0) return;

    const amountNum = parseFloat(quickAmount);
    const { billId, year, month, category } = showAddModal;

    let targetBill = allTenantBills.find(b => b.id === billId || (b.year === year && b.month === month));

    if (!targetBill) {
      targetBill = {
        id: `bill-${year}-${month}-${currentTenant.id}`,
        userId: currentTenant.userId || '',
        tenantId: currentTenant.id,
        tenantName: currentTenant.name,
        year,
        month,
        rentAmount: currentTenant.monthlyRentAmount,
        extraConcepts: [],
        totalAmount: currentTenant.monthlyRentAmount,
        paidAmount: 0,
        pendingAmount: currentTenant.monthlyRentAmount,
        previousPendingAmount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    const conceptName = category === 'luz' ? 'Factura Luz / Electricidad' : category === 'agua' ? 'Factura Agua / Suministros' : 'Gasto Extra';

    const newExtra: ExtraConcept = {
      id: `ext-${Date.now()}`,
      concept: `${conceptName} (${monthNames[month - 1]} ${year})`,
      amount: amountNum,
      totalInvoiceAmount: quickTotalInvoice ? parseFloat(quickTotalInvoice) : undefined,
      percentageShare: category === 'luz' ? currentTenant.electricityPercentage : category === 'agua' ? currentTenant.waterPercentage : 100,
      isPaid: false,
      isPostponed: false,
      isLocked: false,
      category: 'suministro',
      periodMonth: month,
      periodYear: year,
      originMonthName: `${monthNames[month - 1]} ${year}`,
      periodStartDate: quickStartDate || undefined,
      periodEndDate: quickEndDate || undefined
    };

    const updatedExtras = [...targetBill.extraConcepts, newExtra];
    const totalExtras = updatedExtras.reduce((s, c) => s + c.amount, 0);
    const newTotal = targetBill.rentAmount + targetBill.previousPendingAmount + totalExtras;
    const newPending = Math.max(0, newTotal - targetBill.paidAmount);

    onSaveBill({
      ...targetBill,
      extraConcepts: updatedExtras,
      totalAmount: newTotal,
      pendingAmount: newPending
    });

    setShowAddModal(null);
    setQuickAmount('');
    setQuickTotalInvoice('');
    setQuickStartDate('');
    setQuickEndDate('');
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/40 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-white">
                Control por Meses: Alquiler, Luz, Agua y Pendientes
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Pospuestos + Arrastres
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Si la luz o el agua de un mes aún no ha llegado el día del cobro (ej: día 5), márcala como <strong>Pospuesta (⏸️)</strong>. Se cobrará la renta y el suministro quedará listo para el siguiente cobro sin perder el control.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-indigo-900/50 px-4 py-2 rounded-2xl border border-indigo-700/50">
          <span className="text-xs font-bold text-indigo-200">Inquilino:</span>
          <span className="text-sm font-black text-white">{currentTenant.name}</span>
        </div>
      </div>

      {/* Month Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeAndPendingMonths.map((m) => {
          const bill = m.existingBill;

          return (
            <div
              key={`${m.year}-${m.month}`}
              className={`rounded-2xl p-4.5 border transition space-y-4 relative ${
                m.isCurrentActive
                  ? 'bg-indigo-900/40 border-indigo-500 shadow-lg shadow-indigo-900/30'
                  : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Month Header */}
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-white uppercase tracking-wider">
                    {m.monthName} {m.year}
                  </span>
                  {m.isCurrentActive && (
                    <span className="bg-blue-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                      Mes Activo
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                    m.isRentPaid && m.totalUnpaidExtras === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {m.isRentPaid && m.totalUnpaidExtras === 0 ? 'Al Día 🔒' : 'Pendiente ⏳'}
                </span>
              </div>

              {/* 4 Core Items Breakdown */}
              <div className="space-y-2 text-xs">
                
                {/* 1. Alquiler */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <Home className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-200">Renta Alquiler</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Fijo mensual</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white block">{m.rentAmount.toFixed(2)} €</span>
                    {m.isRentPaid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <Lock className="w-3 h-3" /> Cobrado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <Clock className="w-3 h-3" /> Pendiente
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Luz */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-200">Factura Luz</span>
                      {m.elecConcept?.isPostponed ? (
                        <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded block font-bold mt-0.5">
                          ⏸️ Pospuesta a sig. cobro
                        </span>
                      ) : m.elecConcept ? (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {m.elecConcept.percentageShare ? `${m.elecConcept.percentageShare}% asignado` : 'Cargada'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic block">Sin meter aún</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    {m.elecConcept ? (
                      <div>
                        <span className="font-bold text-white block">{m.elecConcept.amount.toFixed(2)} €</span>
                        <div className="flex items-center justify-end gap-1">
                          {m.elecConcept.isPaid ? (
                            <span className="text-[10px] font-bold text-emerald-400">🔒 Cobrado</span>
                          ) : (
                            <button
                              onClick={() => bill && handleTogglePostpone(bill, m.elecConcept!.id)}
                              className="text-[10px] font-bold text-amber-300 hover:underline flex items-center gap-0.5"
                              title="Marcar como pospuesto para el siguiente cobro"
                            >
                              {m.elecConcept.isPostponed ? '▶️ Quitar pospuesto' : '⏸️ Posponer'}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setShowAddModal({
                            billId: bill?.id || '',
                            year: m.year,
                            month: m.month,
                            category: 'luz'
                          })
                        }
                        className="bg-indigo-600/60 hover:bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition border border-indigo-500/40"
                      >
                        + Cargar Luz
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Agua */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-200">Factura Agua</span>
                      {m.waterConcept?.isPostponed ? (
                        <span className="text-[10px] text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded block font-bold mt-0.5">
                          ⏸️ Pospuesta a sig. cobro
                        </span>
                      ) : m.waterConcept ? (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {m.waterConcept.percentageShare ? `${m.waterConcept.percentageShare}% asignado` : 'Cargada'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic block">Sin meter aún</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    {m.waterConcept ? (
                      <div>
                        <span className="font-bold text-white block">{m.waterConcept.amount.toFixed(2)} €</span>
                        <div className="flex items-center justify-end gap-1">
                          {m.waterConcept.isPaid ? (
                            <span className="text-[10px] font-bold text-emerald-400">🔒 Cobrado</span>
                          ) : (
                            <button
                              onClick={() => bill && handleTogglePostpone(bill, m.waterConcept!.id)}
                              className="text-[10px] font-bold text-cyan-300 hover:underline flex items-center gap-0.5"
                              title="Marcar como pospuesto para el siguiente cobro"
                            >
                              {m.waterConcept.isPostponed ? '▶️ Quitar pospuesto' : '⏸️ Posponer'}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setShowAddModal({
                            billId: bill?.id || '',
                            year: m.year,
                            month: m.month,
                            category: 'agua'
                          })
                        }
                        className="bg-indigo-600/60 hover:bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition border border-indigo-500/40"
                      >
                        + Cargar Agua
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Otros Conceptos / Ajustes Anteriores */}
                {m.otherConcepts.map((extra) => (
                  <div key={extra.id} className="flex items-center justify-between p-2 rounded-xl bg-purple-950/40 border border-purple-800/40">
                    <div className="flex items-center space-x-2 truncate">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="font-semibold text-purple-200 truncate">{extra.concept}</span>
                    </div>
                    <span className="font-bold text-purple-100 shrink-0">{extra.amount.toFixed(2)} €</span>
                  </div>
                ))}
              </div>

              {/* Import/Action buttons */}
              <div className="pt-2 border-t border-slate-700/60 space-y-2">
                {!m.isCurrentActive && bill && bill.extraConcepts.some(c => !c.isPaid) && (
                  <button
                    onClick={() => {
                      bill.extraConcepts.forEach(c => {
                        if (!c.isPaid) {
                          onImportPastConcept({
                            billId: bill.id,
                            concept: c,
                            monthName: m.monthName,
                            year: m.year,
                            month: m.month
                          });
                        }
                      });
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>📥 Unir Suministros Pendientes a Recibo Actual</span>
                  </button>
                )}

                {onOpenPaymentForMonth && (
                  <button
                    onClick={() => onOpenPaymentForMonth(m.year, m.month)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Euro className="w-3.5 h-3.5" />
                    <span>Cobrar {m.monthName}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Quick Add Supply */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 text-white shadow-2xl">
            <h4 className="text-base font-black flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Cargar {showAddModal.category === 'luz' ? 'Luz' : showAddModal.category === 'agua' ? 'Agua' : 'Gasto'} ({monthNames[showAddModal.month - 1]} {showAddModal.year})
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Importe a cobrar al Inquilino (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 71.72"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white text-base focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Factura Total Original (€) (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 143.44"
                  value={quickTotalInvoice}
                  onChange={(e) => setQuickTotalInvoice(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Consumo Desde:</label>
                  <input
                    type="date"
                    value={quickStartDate}
                    onChange={(e) => setQuickStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Consumo Hasta:</label>
                  <input
                    type="date"
                    value={quickEndDate}
                    onChange={(e) => setQuickEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveQuickSupply}
                disabled={!quickAmount}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                Guardar Factura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
