import React, { useState } from 'react';
import {
  User,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  Euro,
  Zap,
  TrendingUp,
  Download,
  Calendar,
  Pencil,
  ArrowRight,
  Filter,
  LogOut,
  CheckCircle2,
  X,
  Droplets,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Tenant, MonthlyBill, ExtraConcept, PaymentRecord, BillStatus } from '../types';
import { generateReceiptPDF } from '../utils/pdfGenerator';

interface TenantHistoryLedgerProps {
  tenants: Tenant[];
  bills: MonthlyBill[];
  selectedTenant: Tenant | null;
  onSelectTenant: (tenant: Tenant | null) => void;
  onSaveBill: (bill: MonthlyBill) => void;
  onDeleteBill: (billId: string) => void;
  onRegisterPayment: (record: Omit<PaymentRecord, 'id' | 'createdAt' | 'userId'>) => void;
  user?: FirebaseUser | null;
  onLogout?: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const YEARS_LIST = Array.from(
  { length: Math.max(2030, new Date().getFullYear() + 2) - 2018 + 1 },
  (_, i) => 2018 + i
);

interface MonthInlineBillEditorProps {
  row: any;
  tenant: Tenant | null;
  onSaveBill: (bill: MonthlyBill) => void;
  onDeleteBill: (billId: string) => void;
  onClose: () => void;
}

const MonthInlineBillEditor: React.FC<MonthInlineBillEditorProps> = ({
  row,
  tenant,
  onSaveBill,
  onDeleteBill,
  onClose
}) => {
  const existingBill: MonthlyBill | null = row.bill || null;
  const elec = row.elecConcept;
  const water = row.waterConcept;

  const [rentInput, setRentInput] = useState<string>(String(row.rentAmount || tenant?.monthlyRentAmount || 300));

  // Electricity fields
  const [elecInvoice, setElecInvoice] = useState<string>(
    elec?.totalInvoiceAmount ? String(elec.totalInvoiceAmount) : elec?.amount ? String(elec.amount * 2) : ''
  );
  const [elecPct, setElecPct] = useState<string>(
    elec?.percentageShare ? String(elec.percentageShare) : String(tenant?.electricityPercentage || 50)
  );
  const [elecStartDate, setElecStartDate] = useState<string>(elec?.periodStartDate || '');
  const [elecEndDate, setElecEndDate] = useState<string>(elec?.periodEndDate || '');

  // Water fields
  const [waterInvoice, setWaterInvoice] = useState<string>(
    water?.totalInvoiceAmount ? String(water.totalInvoiceAmount) : water?.amount ? String(water.amount * 2) : ''
  );
  const [waterPct, setWaterPct] = useState<string>(
    water?.percentageShare ? String(water.percentageShare) : String(tenant?.waterPercentage || 50)
  );
  const [waterStartDate, setWaterStartDate] = useState<string>(water?.periodStartDate || '');
  const [waterEndDate, setWaterEndDate] = useState<string>(water?.periodEndDate || '');

  // Other extra concepts
  const [otherConcepts] = useState<ExtraConcept[]>(
    (existingBill?.extraConcepts || []).filter(
      c => !c.concept.toLowerCase().includes('luz') && !c.concept.toLowerCase().includes('electr') && !c.concept.toLowerCase().includes('agua')
    )
  );

  // Calculate live amounts
  const parsedElecInv = parseFloat(elecInvoice) || 0;
  const parsedElecPct = parseFloat(elecPct) || 0;
  const calcElecAmount = (parsedElecInv * parsedElecPct) / 100;

  const parsedWaterInv = parseFloat(waterInvoice) || 0;
  const parsedWaterPct = parseFloat(waterPct) || 0;
  const calcWaterAmount = (parsedWaterInv * parsedWaterPct) / 100;

  const parsedRent = parseFloat(rentInput) || 0;
  const otherTotal = otherConcepts.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalCargosMes = parsedRent + calcElecAmount + calcWaterAmount + otherTotal;

  const handleSave = () => {
    if (!tenant) {
      alert('Selecciona un inquilino antes de guardar.');
      return;
    }

    const newExtraConcepts: ExtraConcept[] = [...otherConcepts];

    // Add / update electricity
    if (parsedElecInv > 0 || calcElecAmount > 0) {
      newExtraConcepts.push({
        id: elec?.id || `luz-${row.year}-${row.monthNum}-${Date.now()}`,
        concept: 'Factura Luz / Electricidad',
        amount: calcElecAmount,
        totalInvoiceAmount: parsedElecInv,
        percentageShare: parsedElecPct,
        periodStartDate: elecStartDate,
        periodEndDate: elecEndDate,
        isPaid: elec?.isPaid || false,
        category: 'suministro',
        periodMonth: row.monthNum,
        periodYear: row.year
      });
    }

    // Add / update water
    if (parsedWaterInv > 0 || calcWaterAmount > 0) {
      newExtraConcepts.push({
        id: water?.id || `agua-${row.year}-${row.monthNum}-${Date.now()}`,
        concept: 'Factura Agua / Suministros',
        amount: calcWaterAmount,
        totalInvoiceAmount: parsedWaterInv,
        percentageShare: parsedWaterPct,
        periodStartDate: waterStartDate,
        periodEndDate: waterEndDate,
        isPaid: water?.isPaid || false,
        category: 'suministro',
        periodMonth: row.monthNum,
        periodYear: row.year
      });
    }

    const paidAmt = existingBill ? existingBill.paidAmount : 0;
    const pendingAmt = Math.max(0, totalCargosMes - paidAmt);
    const billStatus: BillStatus = paidAmt >= totalCargosMes && totalCargosMes > 0 ? 'paid' : paidAmt > 0 ? 'partial' : 'pending';

    const billToSave: MonthlyBill = existingBill ? {
      ...existingBill,
      rentAmount: parsedRent,
      extraConcepts: newExtraConcepts,
      totalAmount: totalCargosMes,
      pendingAmount: pendingAmt,
      status: billStatus,
      updatedAt: new Date().toISOString()
    } : {
      id: `bill-${row.year}-${row.monthNum}-${tenant.id}`,
      userId: tenant.userId || '',
      tenantId: tenant.id,
      tenantName: tenant.name,
      year: row.year,
      month: row.monthNum,
      rentAmount: parsedRent,
      extraConcepts: newExtraConcepts,
      totalAmount: totalCargosMes,
      paidAmount: 0,
      pendingAmount: totalCargosMes,
      previousPendingAmount: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveBill(billToSave);
    alert(`Factura y suministros actualizados para ${row.monthName} ${row.year}.`);
    onClose();
  };

  return (
    <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 shadow-lg space-y-4 text-xs animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Pencil className="w-4 h-4 text-indigo-600" />
            EDICIÓN DE GASTOS Y SUMINISTROS
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">
            Modifica las lecturas, porcentaje o importes del mes de <strong>{row.monthName} {row.year}</strong>.
          </p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* RENTA ALQUILER BASE */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-800">Renta Mensual Alquiler (€)</label>
          <span className="text-[10px] text-slate-500">Importe base contractual para este mes</span>
        </div>
        <div className="w-36">
          <input
            type="number"
            step="0.01"
            value={rentInput}
            onChange={(e) => setRentInput(e.target.value)}
            className="w-full text-right font-bold text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* SUMINISTRO ELÉCTRICO CARD */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
            <Zap className="w-4 h-4 text-amber-600" />
            SUMINISTRO ELÉCTRICO
          </span>
          <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-md font-mono">
            {calcElecAmount > 0 ? `Cuota Inquilino: ${calcElecAmount.toFixed(2)} €` : '0.00 €'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-amber-900/80 mb-1">Importe Factura Total (€)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Ej: 143.43"
              value={elecInvoice}
              onChange={(e) => setElecInvoice(e.target.value)}
              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-amber-900/80 mb-1">Porcentaje Inquilino (%)</label>
            <input
              type="number"
              step="1"
              placeholder="Ej: 50"
              value={elecPct}
              onChange={(e) => setElecPct(e.target.value)}
              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-amber-900/80 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={elecStartDate}
              onChange={(e) => setElecStartDate(e.target.value)}
              className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-amber-900/80 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={elecEndDate}
              onChange={(e) => setElecEndDate(e.target.value)}
              className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* SUMINISTRO DE AGUA CARD */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
            <Droplets className="w-4 h-4 text-blue-600" />
            SUMINISTRO DE AGUA
          </span>
          <span className="text-xs font-bold text-blue-900 bg-blue-200/80 px-2.5 py-0.5 rounded-md font-mono">
            {calcWaterAmount > 0 ? `Cuota Inquilino: ${calcWaterAmount.toFixed(2)} €` : '0.00 €'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-blue-900/80 mb-1">Importe Factura Total (€)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Ej: 85.40"
              value={waterInvoice}
              onChange={(e) => setWaterInvoice(e.target.value)}
              className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-blue-900/80 mb-1">Porcentaje Inquilino (%)</label>
            <input
              type="number"
              step="1"
              placeholder="Ej: 50"
              value={waterPct}
              onChange={(e) => setWaterPct(e.target.value)}
              className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-blue-900/80 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={waterStartDate}
              onChange={(e) => setWaterStartDate(e.target.value)}
              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-blue-900/80 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={waterEndDate}
              onChange={(e) => setWaterEndDate(e.target.value)}
              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5"
          >
            <span>Guardar Cambios</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition"
          >
            Cancelar
          </button>
        </div>

        {existingBill && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`¿Seguro que deseas eliminar permanentemente la factura de ${row.monthName}?`)) {
                onDeleteBill(existingBill.id);
                onClose();
              }
            }}
            className="text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Factura del Mes</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const TenantHistoryLedger: React.FC<TenantHistoryLedgerProps> = ({
  tenants,
  bills,
  selectedTenant,
  onSelectTenant,
  onSaveBill,
  onDeleteBill,
  onRegisterPayment,
  user,
  onLogout
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [tenantFilterId, setTenantFilterId] = useState<string>(selectedTenant ? selectedTenant.id : 'all');

  // Modals state
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showPendingSettlementModal, setShowPendingSettlementModal] = useState(false);
  const [editingMonthBill, setEditingMonthBill] = useState<{ month: number; bill: MonthlyBill | null } | null>(null);

  // Charge Modal Form State
  const [chargeTenantId, setChargeTenantId] = useState<string>(
    selectedTenant?.id || tenants[0]?.id || ''
  );
  const [chargeMonth, setChargeMonth] = useState<number>(new Date().getMonth() + 1);
  const [chargeYear, setChargeYear] = useState<number>(new Date().getFullYear());
  const [chargeConceptType, setChargeConceptType] = useState<'renta' | 'luz' | 'agua' | 'reparacion' | 'comunidad' | 'otro'>('luz');
  const [chargeAmount, setChargeAmount] = useState<string>('');
  const [chargeNotes, setChargeNotes] = useState<string>('');
  
  // Consumption calculator states
  const [totalInvoiceInput, setTotalInvoiceInput] = useState('');
  const [percentageShareInput, setPercentageShareInput] = useState('');
  const [newConceptStartDate, setNewConceptStartDate] = useState('');
  const [newConceptEndDate, setNewConceptEndDate] = useState('');

  const currentTenant = tenants.find(t => t.id === chargeTenantId) || tenants[0];

  // Auto-fill percentage share based on selected tenant and concept type
  React.useEffect(() => {
    if (!currentTenant) return;
    if (chargeConceptType === 'luz') {
      const p = currentTenant.electricityPercentage ?? 50;
      setPercentageShareInput(String(p));
      if (totalInvoiceInput && parseFloat(totalInvoiceInput) > 0) {
        setChargeAmount(((parseFloat(totalInvoiceInput) * p) / 100).toFixed(2));
      }
    } else if (chargeConceptType === 'agua') {
      const p = currentTenant.waterPercentage ?? 50;
      setPercentageShareInput(String(p));
      if (totalInvoiceInput && parseFloat(totalInvoiceInput) > 0) {
        setChargeAmount(((parseFloat(totalInvoiceInput) * p) / 100).toFixed(2));
      }
    }
  }, [chargeConceptType, currentTenant, totalInvoiceInput]);

  const handleTotalInvoiceChange = (val: string) => {
    setTotalInvoiceInput(val);
    const totalVal = parseFloat(val);
    const pctVal = parseFloat(percentageShareInput || '100');
    if (!isNaN(totalVal) && totalVal > 0 && !isNaN(pctVal) && pctVal >= 0) {
      setChargeAmount(((totalVal * pctVal) / 100).toFixed(2));
    } else if (!val) {
      setChargeAmount('');
    }
  };

  const handlePercentageShareChange = (val: string) => {
    setPercentageShareInput(val);
    const totalVal = parseFloat(totalInvoiceInput);
    const pctVal = parseFloat(val);
    if (!isNaN(totalVal) && totalVal > 0 && !isNaN(pctVal) && pctVal >= 0) {
      setChargeAmount(((totalVal * pctVal) / 100).toFixed(2));
    }
  };

  // Payment Modal Form State
  const [paymentTenantId, setPaymentTenantId] = useState<string>(
    selectedTenant?.id || tenants[0]?.id || ''
  );
  const [paymentMonth, setPaymentMonth] = useState<number>(new Date().getMonth() + 1);
  const [paymentYear, setPaymentYear] = useState<number>(new Date().getFullYear());
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo' | 'bizum' | 'otro'>('bizum');

  // Active filtered tenant or null for all
  const activeTenant = tenantFilterId !== 'all' ? tenants.find(t => t.id === tenantFilterId) || null : null;
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  
  // State for inline editing in history
  const [editingRowData, setEditingRowData] = useState<Record<number, { expenses: any[] }>>({});

  const toggleRow = (monthNum: number, rowData?: any) => {
    setExpandedRows(prev => ({
      ...prev,
      [monthNum]: !prev[monthNum]
    }));
    if (rowData && !editingRowData[monthNum]) {
        // Initialize with current values from extraConcepts
        const initialExpenses = (rowData.bill?.extraConcepts || []).map((c: any) => ({
            id: c.id,
            type: c.concept.toLowerCase().includes('luz') ? 'luz' : c.concept.toLowerCase().includes('agua') ? 'agua' : 'otro',
            concept: c.concept,
            invoiceAmount: c.totalInvoiceAmount || '',
            percentage: c.percentageShare || '50',
            startDate: c.periodStartDate || '',
            endDate: c.periodEndDate || '',
            amount: c.amount
        }));

        setEditingRowData(prev => ({
            ...prev,
            [monthNum]: { expenses: initialExpenses }
        }));
    }
  };

  const updateEditingData = (monthNum: number, index: number, field: string, value: any) => {
    setEditingRowData(prev => {
        const row = prev[monthNum];
        const newExpenses = [...row.expenses];
        newExpenses[index] = { ...newExpenses[index], [field]: value };
        return {
            ...prev,
            [monthNum]: { ...row, expenses: newExpenses }
        };
    });
  };

  const addExpense = (monthNum: number, type: 'luz' | 'agua' | 'otro') => {
      setEditingRowData(prev => {
          const row = prev[monthNum] || { expenses: [] };
          const newExpense = {
              id: `temp-${Date.now()}`,
              type,
              concept: type === 'luz' ? 'Factura Luz' : type === 'agua' ? 'Factura Agua' : 'Otro Gasto',
              invoiceAmount: '',
              percentage: '50',
              startDate: '',
              endDate: '',
              amount: 0
          };
          return {
              ...prev,
              [monthNum]: { ...row, expenses: [...row.expenses, newExpense] }
          };
      });
  };

  // Filter bills for selected year and tenant filter
  const yearlyBills = bills.filter(b => {
    const matchYear = b.year === selectedYear;
    const matchTenant = tenantFilterId === 'all' || b.tenantId === tenantFilterId;
    return matchYear && matchTenant;
  });

  // Calculate annual metrics
  let totalBrutoAlquiler = 0;
  let totalSuministros = 0;
  let totalPagadoAno = 0;
  let totalDeudaPendiente = 0;

  // Helper to build monthly display rows for months 1 to 12 (or recent months)
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  // Determine months to display (up to current month if current year, or all 12 if past year)
  const monthsToDisplay = selectedYear < currentYearNum
    ? [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    : Array.from({ length: Math.min(12, currentMonthNum) }, (_, i) => Math.min(12, currentMonthNum) - i);

  // Compute stats across months
  const monthlyData = monthsToDisplay.map(m => {
    // Find bill for month m
    const bill = yearlyBills.find(b => b.month === m);

    // Get default tenant rent if bill doesn't exist
    const defaultRent = activeTenant ? activeTenant.monthlyRentAmount : 300;
    const rentAmount = bill ? bill.rentAmount : defaultRent;

    // Extra concepts (Luz, Agua, etc.)
    const extraConcepts = bill ? bill.extraConcepts || [] : [];
    
    // Find luz concept
    const elecConcept = extraConcepts.find(
      c => c.concept.toLowerCase().includes('luz') || c.concept.toLowerCase().includes('electr')
    );
    // Find agua concept
    const waterConcept = extraConcepts.find(
      c => c.concept.toLowerCase().includes('agua')
    );

    const totalGastos = extraConcepts.reduce((acc, c) => acc + c.amount, 0);
    const totalCargosMes = rentAmount + totalGastos;

    // Previous credit / carryover calculation
    const prevMonthNum = m === 1 ? 12 : m - 1;
    const prevYearNum = m === 1 ? selectedYear - 1 : selectedYear;
    const prevBill = bills.find(
      b => (tenantFilterId === 'all' || b.tenantId === tenantFilterId) &&
           b.year === prevYearNum &&
           b.month === prevMonthNum
    );

    let creditoPrev = 0;
    if (prevBill) {
      if (prevBill.paidAmount > prevBill.totalAmount) {
        creditoPrev = -(prevBill.paidAmount - prevBill.totalAmount);
      }
    }

    const netoAPagar = Math.max(0, totalCargosMes + creditoPrev);
    const pagado = bill ? bill.paidAmount : 0;
    const lastPaidDate = bill?.lastPaidDate || (pagado > 0 ? `${selectedYear}-${m < 10 ? '0' + m : m}-15` : `${selectedYear}-${m < 10 ? '0' + m : m}-01`);

    let sobrante = 0;
    if (pagado > netoAPagar) {
      sobrante = pagado - netoAPagar;
    } else if (creditoPrev < 0) {
      sobrante = Math.abs(creditoPrev);
    }

    const pendingAmount = Math.max(0, netoAPagar - pagado);

    // Accumulate year stats
    totalBrutoAlquiler += rentAmount;
    totalSuministros += totalGastos;
    totalPagadoAno += pagado;
    totalDeudaPendiente += pendingAmount;

    return {
      monthNum: m,
      monthName: MONTH_NAMES[m - 1],
      year: selectedYear,
      bill,
      rentAmount,
      elecConcept,
      waterConcept,
      totalGastos,
      totalCargosMes,
      creditoPrev,
      netoAPagar,
      pagado,
      lastPaidDate,
      sobrante,
      pendingAmount
    };
  });

  const beneficioNeto = totalBrutoAlquiler - totalSuministros;

  // Handle Add Charge
  const handleSaveAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(chargeAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const targetTenant = tenants.find(t => t.id === chargeTenantId) || tenants[0];
    if (!targetTenant) return;

    // Find existing bill or create draft
    const existingBill = bills.find(
      b => b.tenantId === targetTenant.id && b.year === chargeYear && b.month === chargeMonth
    );

    let updatedConcepts: ExtraConcept[] = existingBill ? [...(existingBill.extraConcepts || [])] : [];

    if (chargeConceptType === 'renta') {
      // Just update rent amount on bill
      const newBill: MonthlyBill = existingBill ? {
        ...existingBill,
        rentAmount: amountVal,
        totalAmount: amountVal + updatedConcepts.reduce((acc, c) => acc + c.amount, 0),
        pendingAmount: Math.max(0, (amountVal + updatedConcepts.reduce((acc, c) => acc + c.amount, 0)) - existingBill.paidAmount),
        updatedAt: new Date().toISOString()
      } : {
        id: `bill-${chargeYear}-${chargeMonth}-${targetTenant.id}`,
        userId: targetTenant.userId || '',
        tenantId: targetTenant.id,
        tenantName: targetTenant.name,
        year: chargeYear,
        month: chargeMonth,
        rentAmount: amountVal,
        extraConcepts: [],
        totalAmount: amountVal,
        paidAmount: 0,
        pendingAmount: amountVal,
        previousPendingAmount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onSaveBill(newBill);
    } else {
      // Add extra concept
      let conceptLabel = 'Gastos Extra';
      if (chargeConceptType === 'luz') conceptLabel = 'Factura Luz / Electricidad';
      if (chargeConceptType === 'agua') conceptLabel = 'Factura Agua / Suministros';
      if (chargeConceptType === 'reparacion') conceptLabel = 'Reparación / Mantenimiento';
      if (chargeConceptType === 'comunidad') conceptLabel = 'Cuota Comunidad';

      const newConcept: ExtraConcept = {
        id: `concept-${Date.now()}`,
        concept: chargeNotes ? `${conceptLabel} (${chargeNotes})` : conceptLabel,
        amount: amountVal,
        totalInvoiceAmount: totalInvoiceInput ? parseFloat(totalInvoiceInput) : undefined,
        percentageShare: percentageShareInput ? parseFloat(percentageShareInput) : undefined,
        isPaid: false,
        isLocked: false,
        category: chargeConceptType === 'reparacion' ? 'reparacion' : 'suministro',
        periodMonth: chargeMonth,
        periodYear: chargeYear,
        periodStartDate: newConceptStartDate || undefined,
        periodEndDate: newConceptEndDate || undefined
      };

      updatedConcepts.push(newConcept);
      const rentAmt = existingBill ? existingBill.rentAmount : targetTenant.monthlyRentAmount;
      const newTotal = rentAmt + updatedConcepts.reduce((acc, c) => acc + c.amount, 0);

      const newBill: MonthlyBill = existingBill ? {
        ...existingBill,
        extraConcepts: updatedConcepts,
        totalAmount: newTotal,
        pendingAmount: Math.max(0, newTotal - existingBill.paidAmount),
        updatedAt: new Date().toISOString()
      } : {
        id: `bill-${chargeYear}-${chargeMonth}-${targetTenant.id}`,
        userId: targetTenant.userId || '',
        tenantId: targetTenant.id,
        tenantName: targetTenant.name,
        year: chargeYear,
        month: chargeMonth,
        rentAmount: rentAmt,
        extraConcepts: updatedConcepts,
        totalAmount: newTotal,
        paidAmount: 0,
        pendingAmount: newTotal,
        previousPendingAmount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onSaveBill(newBill);
    }

    setShowAddChargeModal(false);
    setChargeAmount('');
    setChargeNotes('');
    setTotalInvoiceInput('');
    setPercentageShareInput('');
    setNewConceptStartDate('');
    setNewConceptEndDate('');
  };

  // Handle Add Payment
  const handleSaveAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(paymentAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const targetTenant = tenants.find(t => t.id === paymentTenantId) || tenants[0];
    if (!targetTenant) return;

    const existingBill = bills.find(
      b => b.tenantId === targetTenant.id && b.year === paymentYear && b.month === paymentMonth
    );

    const rentAmt = existingBill ? existingBill.rentAmount : targetTenant.monthlyRentAmount;
    const currentConcepts = existingBill ? existingBill.extraConcepts || [] : [];
    const totalAmt = rentAmt + currentConcepts.reduce((acc, c) => acc + c.amount, 0);
    const prevPaid = existingBill ? existingBill.paidAmount : 0;
    const newPaidTotal = prevPaid + amountVal;

    const newStatus = newPaidTotal >= totalAmt ? 'paid' : newPaidTotal > 0 ? 'partial' : 'pending';

    const newBill: MonthlyBill = existingBill ? {
      ...existingBill,
      paidAmount: newPaidTotal,
      pendingAmount: Math.max(0, totalAmt - newPaidTotal),
      status: newStatus,
      lastPaidDate: paymentDate,
      updatedAt: new Date().toISOString()
    } : {
      id: `bill-${paymentYear}-${paymentMonth}-${targetTenant.id}`,
      userId: targetTenant.userId || '',
      tenantId: targetTenant.id,
      tenantName: targetTenant.name,
      year: paymentYear,
      month: paymentMonth,
      rentAmount: rentAmt,
      extraConcepts: [],
      totalAmount: totalAmt,
      paidAmount: newPaidTotal,
      pendingAmount: Math.max(0, totalAmt - newPaidTotal),
      previousPendingAmount: 0,
      status: newStatus,
      lastPaidDate: paymentDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveBill(newBill);

    // Register payment record history
    onRegisterPayment({
      tenantId: targetTenant.id,
      monthlyBillId: newBill.id,
      amount: amountVal,
      paymentDate,
      method: paymentMethod,
      concept: `Cobro Alquiler ${MONTH_NAMES[paymentMonth - 1]} ${paymentYear}`
    });

    setShowAddPaymentModal(false);
    setPaymentAmount('');
  };

  // Handle Receipt PDF Download
  const handleDownloadReceipt = (monthRow: typeof monthlyData[0]) => {
    const targetTenant = activeTenant || tenants.find(t => t.id === monthRow.bill?.tenantId) || tenants[0];
    if (!targetTenant) return;

    const billToPrint: MonthlyBill = monthRow.bill || {
      id: `bill-${selectedYear}-${monthRow.monthNum}-${targetTenant.id}`,
      userId: targetTenant.userId || '',
      tenantId: targetTenant.id,
      tenantName: targetTenant.name,
      year: selectedYear,
      month: monthRow.monthNum,
      rentAmount: monthRow.rentAmount,
      extraConcepts: [],
      totalAmount: monthRow.totalCargosMes,
      paidAmount: monthRow.pagado,
      pendingAmount: monthRow.pendingAmount,
      previousPendingAmount: 0,
      status: monthRow.pagado >= monthRow.totalCargosMes ? 'paid' : monthRow.pagado > 0 ? 'partial' : 'pending',
      lastPaidDate: monthRow.lastPaidDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    generateReceiptPDF(billToPrint, targetTenant);
  };

  // Settle all pending debt with 1 click
  const handleSettleAllPending = () => {
    monthlyData.forEach(row => {
      if (row.pendingAmount > 0) {
        const targetTenant = activeTenant || (row.bill ? tenants.find(t => t.id === row.bill?.tenantId) : tenants[0]);
        if (!targetTenant) return;

        const existingBill = row.bill || {
          id: `bill-${selectedYear}-${row.monthNum}-${targetTenant.id}`,
          userId: targetTenant.userId || '',
          tenantId: targetTenant.id,
          tenantName: targetTenant.name,
          year: selectedYear,
          month: row.monthNum,
          rentAmount: row.rentAmount,
          extraConcepts: [],
          totalAmount: row.totalCargosMes,
          paidAmount: 0,
          pendingAmount: row.totalCargosMes,
          previousPendingAmount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updatedBill: MonthlyBill = {
          ...existingBill,
          paidAmount: existingBill.totalAmount,
          pendingAmount: 0,
          status: 'paid',
          lastPaidDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString()
        };

        onSaveBill(updatedBill);
      }
    });

    setShowPendingSettlementModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & User Badge */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Gestión de Alquiler
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Cifras Reales & Control de Suministros
            </p>
          </div>

          {/* User Profile Chip */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full" />
              ) : (
                (user?.displayName || user?.email || 'Juan')[0].toUpperCase()
              )}
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs font-bold text-slate-800">
                {user?.displayName || 'Juan'}
              </p>
              <p className="text-[10px] text-slate-500">
                {user?.email || 'jcbprofesor@gmail.com'}
              </p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-slate-600 p-1 transition"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Action Buttons & Tenant Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tenant Selector Dropdown */}
          <div className="relative">
            <select
              value={tenantFilterId}
              onChange={(e) => {
                setTenantFilterId(e.target.value);
                const found = tenants.find(t => t.id === e.target.value);
                onSelectTenant(found || null);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3 py-2.5 pr-8 focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">Filtro: Todos los Inquilinos</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.address.split(',')[0]})
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* + Añadir Cobro Button */}
          <button
            onClick={() => setShowAddChargeModal(true)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-2xs"
          >
            <Plus className="w-4 h-4 text-rose-600" />
            <span>Añadir Cobro</span>
          </button>

          {/* + Añadir Pago Button */}
          <button
            onClick={() => setShowAddPaymentModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Pago</span>
          </button>
        </div>
      </div>

      {/* Pending Settlement Alert Banner (If pending debt exists) */}
      {totalDeudaPendiente > 0 && (
        <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-rose-900">
                ATENCIÓN: PENDIENTE DE COBRO
              </h3>
              <p className="text-xs text-rose-700 font-medium mt-0.5">
                Hay un total de <strong className="font-bold text-rose-950 underline">{totalDeudaPendiente.toFixed(2)} €</strong> acumulados por cobrar.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowPendingSettlementModal(true)}
            className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shrink-0 shadow-sm"
          >
            <span>Liquidación Pendiente</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Metric Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bruto Alquiler */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Bruto Alquiler</p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalBrutoAlquiler.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </h4>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Euro className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Suministros */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Suministros</p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalSuministros.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </h4>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Beneficio Neto */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Beneficio Neto</p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {beneficioNeto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </h4>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Deuda Pendiente */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Deuda Pendiente</p>
            <h4 className={`text-xl sm:text-2xl font-black tracking-tight ${totalDeudaPendiente > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {totalDeudaPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </h4>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Year Selector Control & Record Counter */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs border border-indigo-500 cursor-pointer uppercase tracking-wider"
          >
            {YEARS_LIST.map((yr) => (
              <option key={yr} value={yr} className="bg-slate-900 text-white font-bold">
                AÑO {yr}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {monthlyData.length} REGISTROS
        </span>
      </div>

      {/* Monthly Record Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">MES/AÑO</th>
                <th className="py-3.5 px-4">CARGOS MES</th>
                <th className="py-3.5 px-4">CRÉDITO PREV.</th>
                <th className="py-3.5 px-4">NETO A PAGAR</th>
                <th className="py-3.5 px-4">PAGADO</th>
                <th className="py-3.5 px-4">SOBRANTE</th>
                <th className="py-3.5 px-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {monthlyData.map((row) => (
                <React.Fragment key={row.monthNum}>
                  <tr className="hover:bg-slate-50/60 transition cursor-pointer" onClick={() => toggleRow(row.monthNum, row)}>
                    {/* MES/AÑO */}
                    <td className="py-4 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{expandedRows[row.monthNum] ? '▼' : '▶'}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{row.monthName}</span>
                            {/* Lock badge (Migas de Pan) */}
                            {row.bill?.extraConcepts && row.bill.extraConcepts.length > 0 && (
                              row.bill.extraConcepts.every((ec) => ec.isLocked) ? (
                                <span className="text-emerald-600 cursor-help text-xs" title="Todos los suministros y gastos de este mes están liquidados y CERRADOS con candado (🔒)">
                                  🔒
                                </span>
                              ) : (
                                <span className="text-amber-500 cursor-help text-xs animate-pulse" title="Hay suministros o gastos de este mes PENDIENTES de liquidar o abiertos (🔓)">
                                  🔓
                                </span>
                              )
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400">{row.year}</span>
                        </div>
                      </div>
                    </td>

                    {/* CARGOS MES */}
                    <td className="py-4 px-4">
                      <div className="text-xs font-bold text-slate-900 mb-1">
                        TOTAL: {row.totalCargosMes.toFixed(2)} €
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Rent Badge */}
                        <span className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200/60">
                          R:{row.rentAmount}
                        </span>

                        {/* Electricity Badge */}
                        {row.elecConcept ? (
                          <span className="bg-amber-100/80 text-amber-900 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200/60 flex items-center gap-0.5">
                            ⚡ {row.elecConcept.amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="bg-slate-50 text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200/40">
                            ⚡ Posp.
                          </span>
                        )}

                        {/* Water Badge */}
                        {row.waterConcept ? (
                          <span className="bg-blue-100/80 text-blue-900 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200/60 flex items-center gap-0.5">
                            💧 {row.waterConcept.amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="bg-slate-50 text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200/40">
                            💧 0.00
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CRÉDITO PREV. */}
                    <td className="py-4 px-4 font-mono font-medium text-emerald-600">
                      {row.creditoPrev !== 0 ? `${row.creditoPrev.toFixed(2)} €` : '€0,00'}
                    </td>

                    {/* NETO A PAGAR */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {row.netoAPagar.toFixed(2)} €
                      </div>
                      {row.totalGastos > 0 && (
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight block mt-0.5">
                          INCL. {row.totalGastos.toFixed(2)} € GASTOS
                        </span>
                      )}
                    </td>

                    {/* PAGADO */}
                    <td className="py-4 px-4">
                      <div className={`font-bold text-sm ${row.pagado > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {row.pagado.toFixed(2)} €
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        {row.lastPaidDate}
                      </span>
                    </td>

                    {/* SOBRANTE */}
                    <td className="py-4 px-4">
                      <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-md font-mono border border-emerald-200/60 inline-block">
                        +{row.sobrante.toFixed(2)} €
                      </span>
                    </td>

                    {/* ACCIONES */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Receipt Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(row); }}
                          className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition"
                          title="Ver / Descargar Recibo PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingMonthBill({ month: row.monthNum, bill: row.bill }); }}
                          className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition"
                          title="Editar cargos de este mes"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (row.bill) {
                              if (window.confirm(`¿Eliminar permanentemente la factura de ${row.monthName}?`)) {
                                onDeleteBill(row.bill.id);
                              }
                            }
                          }}
                          className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition"
                          title="Eliminar datos del mes"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedRows[row.monthNum] && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={7} className="p-3 sm:p-5">
                        <MonthInlineBillEditor
                          row={row}
                          tenant={activeTenant || tenants.find(t => t.id === (row.bill?.tenantId || tenantFilterId)) || tenants[0]}
                          onSaveBill={onSaveBill}
                          onDeleteBill={onDeleteBill}
                          onClose={() => setExpandedRows(prev => ({ ...prev, [row.monthNum]: false }))}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Añadir Cobro / Cargo Mensual */}
      {showAddChargeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-600" />
                Añadir Nuevo Cobro / Cargo
              </h3>
              <button onClick={() => setShowAddChargeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddCharge} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Inquilino</label>
                <select
                  value={chargeTenantId}
                  onChange={(e) => setChargeTenantId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.address}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mes</label>
                  <select
                    value={chargeMonth}
                    onChange={(e) => setChargeMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Año</label>
                  <select
                    value={chargeYear}
                    onChange={(e) => setChargeYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold"
                  >
                    {YEARS_LIST.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Cargo</label>
                <select
                  value={chargeConceptType}
                  onChange={(e) => setChargeConceptType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold"
                >
                  <option value="luz">⚡ Factura Luz / Electricidad</option>
                  <option value="agua">💧 Factura Agua / Suministros</option>
                  <option value="renta">🏠 Renta Mensual Alquiler</option>
                  <option value="reparacion">🛠️ Reparación / Mantenimiento</option>
                  <option value="comunidad">🏢 Cuota Comunidad</option>
                  <option value="otro">📌 Otro Concepto</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Importe (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ej: 71.72"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                />
              </div>

              {/* Calculator Fields */}
              {(chargeConceptType === 'luz' || chargeConceptType === 'agua') && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                   <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Factura Total (€)</label>
                      <input type="number" step="0.01" value={totalInvoiceInput} onChange={(e) => handleTotalInvoiceChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">% Inquilino</label>
                      <input type="number" step="1" value={percentageShareInput} onChange={(e) => handlePercentageShareChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Desde</label>
                      <input type="date" value={newConceptStartDate} onChange={(e) => setNewConceptStartDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500">Hasta</label>
                      <input type="date" value={newConceptEndDate} onChange={(e) => setNewConceptEndDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                    </div>
                   </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas u Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Consumo Mayo-Junio"
                  value={chargeNotes}
                  onChange={(e) => setChargeNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddChargeModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md"
                >
                  Guardar Cargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Añadir Pago */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Registrar Pago de Inquilino
              </h3>
              <button onClick={() => setShowAddPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Inquilino</label>
                <select
                  value={paymentTenantId}
                  onChange={(e) => setPaymentTenantId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.address}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mes a Cobrar</label>
                  <select
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Año</label>
                  <select
                    value={paymentYear}
                    onChange={(e) => setPaymentYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-semibold"
                  >
                    {YEARS_LIST.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Importe Pagado (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ej: 950.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Método</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    <option value="bizum">Bizum</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Liquidación Pendiente */}
      {showPendingSettlementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Liquidación de Deuda Pendiente
              </h3>
              <button onClick={() => setShowPendingSettlementModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Actualmente existen <strong className="text-rose-600">{totalDeudaPendiente.toFixed(2)} €</strong> pendientes de cobro para el ejercicio {selectedYear}. Puedes marcar la deuda completa como cobrada o ajustar mes a mes.
            </p>

            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {monthlyData.filter(r => r.pendingAmount > 0).map(r => (
                <div key={r.monthNum} className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{r.monthName} {r.year}</span>
                    <span className="text-[10px] text-slate-500 block">Neto: {r.netoAPagar.toFixed(2)} € | Pagado: {r.pagado.toFixed(2)} €</span>
                  </div>
                  <span className="font-bold text-rose-600">Pendiente: {r.pendingAmount.toFixed(2)} €</span>
                </div>
              ))}
            </div>

            <div className="pt-3 flex items-center justify-between">
              <button
                onClick={() => setShowPendingSettlementModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100"
              >
                Cerrar
              </button>
              <button
                onClick={handleSettleAllPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Marcar Todo como Cobrado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Editar Mes Especifico */}
      {editingMonthBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Editar Mes: {MONTH_NAMES[editingMonthBill.month - 1]} {selectedYear}
              </h3>
              <button onClick={() => setEditingMonthBill(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Modifica el alquiler o añade gastos adicionales (Luz, Agua, Comunidad) directamente para este mes.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Renta Alquiler (€)</label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={editingMonthBill.bill ? editingMonthBill.bill.rentAmount : (activeTenant?.monthlyRentAmount || 300)}
                  id="edit-rent-input"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Importe Ya Cobrado (€)</label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={editingMonthBill.bill ? editingMonthBill.bill.paidAmount : 0}
                  id="edit-paid-input"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-emerald-600"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                onClick={() => setEditingMonthBill(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-xs hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const rentVal = parseFloat((document.getElementById('edit-rent-input') as HTMLInputElement)?.value || '300');
                  const paidVal = parseFloat((document.getElementById('edit-paid-input') as HTMLInputElement)?.value || '0');

                  const targetTenant = activeTenant || tenants[0];
                  if (!targetTenant) return;

                  const existing = editingMonthBill.bill;
                  const currentConcepts = existing ? existing.extraConcepts || [] : [];
                  const newTotal = rentVal + currentConcepts.reduce((acc, c) => acc + c.amount, 0);

                  const updatedBill: MonthlyBill = existing ? {
                    ...existing,
                    rentAmount: rentVal,
                    paidAmount: paidVal,
                    totalAmount: newTotal,
                    pendingAmount: Math.max(0, newTotal - paidVal),
                    status: paidVal >= newTotal ? 'paid' : paidVal > 0 ? 'partial' : 'pending',
                    updatedAt: new Date().toISOString()
                  } : {
                    id: `bill-${selectedYear}-${editingMonthBill.month}-${targetTenant.id}`,
                    userId: targetTenant.userId || '',
                    tenantId: targetTenant.id,
                    tenantName: targetTenant.name,
                    year: selectedYear,
                    month: editingMonthBill.month,
                    rentAmount: rentVal,
                    extraConcepts: [],
                    totalAmount: newTotal,
                    paidAmount: paidVal,
                    pendingAmount: Math.max(0, newTotal - paidVal),
                    previousPendingAmount: 0,
                    status: paidVal >= newTotal ? 'paid' : paidVal > 0 ? 'partial' : 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };

                  onSaveBill(updatedBill);
                  setEditingMonthBill(null);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
