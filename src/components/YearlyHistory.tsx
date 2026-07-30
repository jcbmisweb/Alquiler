import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Euro,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  FileSpreadsheet,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { MonthlyBill, Tenant, PaymentRecord } from '../types';

interface YearlyHistoryProps {
  bills: MonthlyBill[];
  tenants: Tenant[];
  paymentRecords: PaymentRecord[];
}

const YEARS_LIST = Array.from(
  { length: Math.max(2030, new Date().getFullYear() + 2) - 2018 + 1 },
  (_, i) => 2018 + i
);

export const YearlyHistory: React.FC<YearlyHistoryProps> = ({
  bills,
  tenants,
  paymentRecords
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  // Bills for selected year
  const yearBills = bills.filter((b) => {
    const matchesYear = b.year === selectedYear;
    if (tenantFilter === 'all') return matchesYear;
    return matchesYear && b.tenantId === tenantFilter;
  });

  // Calculate Yearly Metrics
  const totalRentCollected = yearBills.reduce((sum, b) => {
    return sum + Math.min(b.paidAmount, b.rentAmount);
  }, 0);

  const totalExtrasCollected = yearBills.reduce((sum, b) => {
    const extrasTotal = b.extraConcepts.reduce((s, e) => s + e.amount, 0);
    const surplus = Math.max(0, b.paidAmount - b.rentAmount);
    return sum + Math.min(surplus, extrasTotal);
  }, 0);

  const totalYearRevenue = yearBills.reduce((sum, b) => sum + b.paidAmount, 0);
  const totalYearPending = yearBills.reduce((sum, b) => sum + b.pendingAmount, 0);
  
  // Expenses = Total Amount - Rent Amount (approximate)
  const totalYearExpenses = yearBills.reduce((sum, b) => {
    const expenses = b.extraConcepts.reduce((s, e) => s + e.amount, 0);
    return sum + expenses;
  }, 0);

  // Group by month for chart
  const chartData = Array.from({ length: 12 }, (_, index) => {
    const m = index + 1;
    const billsInMonth = yearBills.filter((b) => b.month === m);
    const monthPaid = billsInMonth.reduce((s, b) => s + b.paidAmount, 0);
    const monthExpenses = billsInMonth.reduce((s, b) => s + b.extraConcepts.reduce((s, e) => s + e.amount, 0), 0);

    return {
      name: monthNames[index],
      ingresos: monthPaid,
      gastos: monthExpenses,
    };
  });

  const monthlyBreakdown = Array.from({ length: 12 }, (_, index) => {
    const m = index + 1;
    const billsInMonth = yearBills.filter((b) => b.month === m);
    const monthTotal = billsInMonth.reduce((s, b) => s + b.totalAmount, 0);
    const monthPaid = billsInMonth.reduce((s, b) => s + b.paidAmount, 0);
    const monthPending = billsInMonth.reduce((s, b) => s + b.pendingAmount, 0);

    return {
      month: m,
      monthName: monthNames[index],
      billsCount: billsInMonth.length,
      totalAmount: monthTotal,
      paidAmount: monthPaid,
      pendingAmount: monthPending,
      bills: billsInMonth
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Ejercicio Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Historial y Resumen por Ejercicios
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Consulta de liquidaciones anuales, pagos realizados y balances consolidados por año.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Ejercicio / Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-800 text-white font-bold border border-slate-700 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {YEARS_LIST.map((yr) => (
                  <option key={yr} value={yr}>
                    Ejercicio {yr}
                  </option>
                ))}
              </select>
            </div>
            {/* Tenant filter... */}
          </div>
        </div>

        {/* Ejercicio Annual Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <span className="text-xs font-medium text-slate-400">Total Cobrado (Ejercicio)</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{totalYearRevenue.toFixed(2)} €</p>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <span className="text-xs font-medium text-slate-400">Total Gastos (Ejercicio)</span>
            <p className="text-2xl font-bold text-rose-400 mt-1">{totalYearExpenses.toFixed(2)} €</p>
          </div>
          {/* ...other cards */}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-6">
          Comparativa Anual: Ingresos vs Gastos
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value.toFixed(2)} €`]} />
              <Legend />
              <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
              <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Month-by-Month Exercise Table */}
            {/* Month-by-Month Exercise Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Evolución Mes a Mes — Ejercicio {selectedYear}
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            12 Mensualidades
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Mes</th>
                <th className="py-3 px-4">Recibos Emitidos</th>
                <th className="py-3 px-4">Total Importe (€)</th>
                <th className="py-3 px-4">Cobrado (€)</th>
                <th className="py-3 px-4">Pendiente (€)</th>
                <th className="py-3 px-4 text-center">Estado del Mes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {monthlyBreakdown.map((item) => {
                const isCurrentMonth =
                  selectedYear === new Date().getFullYear() && item.month === new Date().getMonth() + 1;

                return (
                  <tr
                    key={item.month}
                    className={`hover:bg-slate-50/80 transition ${
                      isCurrentMonth ? 'bg-blue-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      {item.monthName}
                      {isCurrentMonth && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          Mes En Curso
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {item.billsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {item.billsCount} recibo(s)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin abrir</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.totalAmount.toFixed(2)} €
                    </td>

                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      {item.paidAmount.toFixed(2)} €
                    </td>

                    <td className="py-3.5 px-4 font-bold text-rose-600">
                      {item.pendingAmount.toFixed(2)} €
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {item.billsCount === 0 ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : item.pendingAmount === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Liquidado
                        </span>
                      ) : item.paidAmount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Parcial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};