import React, { useMemo, useState } from 'react';
import { PersonalExpense, PersonalIncome } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { TrendingUp, Activity, AlertCircle, CheckCircle2, HeartPulse, DollarSign, Wallet, ArrowDownRight, ArrowUpRight, PieChart as PieIcon } from 'lucide-react';

interface GlobalStatisticsProps {
  expenses: PersonalExpense[];
  incomes: PersonalIncome[];
}

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export const GlobalStatistics: React.FC<GlobalStatisticsProps> = ({ expenses, incomes }) => {
  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<string>();
    yearsSet.add(currentYear.toString());
    yearsSet.add((currentYear - 1).toString());
    yearsSet.add((currentYear - 2).toString());
    expenses.forEach(i => {
      if (i.date) {
        const y = i.date.split('-')[0];
        if (y && /^\d{4}$/.test(y)) yearsSet.add(y);
      }
    });
    incomes.forEach(i => {
      if (i.date) {
        const y = i.date.split('-')[0];
        if (y && /^\d{4}$/.test(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [expenses, incomes]);

  const [filterYear, setFilterYear] = useState<string>(() => new Date().getFullYear().toString());

  const filteredExpenses = useMemo(() => {
    if (filterYear === 'all') return expenses;
    return expenses.filter(e => e.date && e.date.startsWith(filterYear));
  }, [expenses, filterYear]);

  const filteredIncomes = useMemo(() => {
    if (filterYear === 'all') return incomes;
    return incomes.filter(i => i.date && i.date.startsWith(filterYear));
  }, [incomes, filterYear]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomes = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncomes - totalExpenses;
  const savingsRate = totalIncomes > 0 ? ((balance) / totalIncomes) * 100 : 0;

  // Monthly Comparison Chart Data
  const monthlyData = useMemo(() => {
    return MONTHS.map(m => {
      const monthVal = m.value.padStart(2, '0');
      
      let expTotal = 0;
      let incTotal = 0;
      
      if (filterYear === 'all') {
        expTotal = expenses.filter(e => e.date && e.date.split('-')[1] === monthVal).reduce((s, e) => s + e.amount, 0);
        incTotal = incomes.filter(i => i.date && i.date.split('-')[1] === monthVal).reduce((s, i) => s + i.amount, 0);
      } else {
        expTotal = filteredExpenses.filter(e => e.date && e.date.startsWith(`${filterYear}-${monthVal}`)).reduce((s, e) => s + e.amount, 0);
        incTotal = filteredIncomes.filter(i => i.date && i.date.startsWith(`${filterYear}-${monthVal}`)).reduce((s, i) => s + i.amount, 0);
      }

      return {
        name: m.label.substring(0, 3),
        fullName: m.label,
        Ingresos: parseFloat(incTotal.toFixed(2)),
        Gastos: parseFloat(expTotal.toFixed(2)),
        Balance: parseFloat((incTotal - expTotal).toFixed(2))
      };
    });
  }, [filteredExpenses, filteredIncomes, filterYear, expenses, incomes]);

  // Expenses By Category Chart Data
  const expenseChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    });
    // We will generate generic colors for categories if not found in saved
    let savedCats: any[] = [];
    try {
      const s = localStorage.getItem('app_personal_expense_categories_v2');
      if (s) savedCats = JSON.parse(s);
    } catch(e) {}
    
    return Object.entries(totals)
      .map(([name, value], index) => {
        const cat = savedCats.find(c => c.id === name);
        const color = cat?.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
        return { name: cat?.label || name, value: parseFloat(value.toFixed(2)), color };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Income By Category Chart Data
  const incomeChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredIncomes.forEach(inc => {
      totals[inc.category] = (totals[inc.category] || 0) + inc.amount;
    });
    let savedCats: any[] = [];
    try {
      const s = localStorage.getItem('app_personal_income_categories');
      if (s) savedCats = JSON.parse(s);
    } catch(e) {}

    return Object.entries(totals)
      .map(([name, value], index) => {
        const cat = savedCats.find(c => c.id === name);
        const color = cat?.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
        return { name: cat?.label || name, value: parseFloat(value.toFixed(2)), color };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredIncomes]);

  const topExpenses = expenseChartData.slice(0, 5);
  const isHealthy = balance >= 0;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Salud Financiera de la Casa
          </h2>
          <p className="text-sm text-slate-500 mt-1">Análisis global de ingresos, gastos y balance.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">Año:</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
          >
            <option value="all">Todos los años</option>
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Incomes */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowUpRight className="w-16 h-16 text-emerald-600" />
          </div>
          <p className="text-emerald-700 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Wallet className="w-4 h-4" /> Total Ingresos
          </p>
          <p className="text-3xl font-black text-slate-900">
            {totalIncomes.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-200">
             {filteredIncomes.length} movimientos registrados
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowDownRight className="w-16 h-16 text-rose-600" />
          </div>
          <p className="text-rose-700 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> Total Gastos
          </p>
          <p className="text-3xl font-black text-slate-900">
            {totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 w-fit px-3 py-1.5 rounded-lg border border-rose-200">
             {filteredExpenses.length} recibos procesados
          </div>
        </div>

        {/* Balance / Health */}
        <div className={`rounded-2xl p-6 shadow-sm relative overflow-hidden ${isHealthy ? 'bg-emerald-600 border border-emerald-700' : 'bg-rose-600 border border-rose-700'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          
          <p className="text-white/80 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4" /> Balance Neto
          </p>
          <p className="text-4xl font-black text-white">
            {balance > 0 ? '+' : ''}{balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
          
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-white bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-white/20 shadow-sm backdrop-blur-sm">
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" /> 
                Economía Saludable ({savingsRate.toFixed(1)}% ahorro)
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-300" /> 
                Economía en Déficit
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Comparison */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Flujo de Caja Mensual ({filterYear !== 'all' ? filterYear : 'Todos los años'})
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`]}
                  labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Pie */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
            <PieIcon className="w-5 h-5 text-rose-600" />
            Distribución de Gastos
          </h3>
          {expenseChartData.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="h-56 relative mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute pointer-events-none inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total</span>
                  <span className="text-sm font-black text-slate-800">
                    {totalExpenses.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                  </span>
                </div>
              </div>
              
              <div className="mt-auto">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Mayores Gastos</p>
                <div className="space-y-2">
                  {topExpenses.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 truncate">{item.name}</span>
                      </div>
                      <span className="text-slate-900 font-bold shrink-0">{item.value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
             <div className="py-12 text-center text-slate-400">
               <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />
               <p className="text-sm font-semibold">No hay gastos en este período</p>
             </div>
          )}
        </div>

        {/* Incomes Pie */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
            <PieIcon className="w-5 h-5 text-emerald-600" />
            Fuentes de Ingresos
          </h3>
          {incomeChartData.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="h-56 relative mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {incomeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute pointer-events-none inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total</span>
                  <span className="text-sm font-black text-slate-800">
                    {totalIncomes.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                  </span>
                </div>
              </div>
              
              <div className="mt-auto">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Desglose</p>
                <div className="space-y-2">
                  {incomeChartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 truncate">{item.name}</span>
                      </div>
                      <span className="text-slate-900 font-bold shrink-0">{item.value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
             <div className="py-12 text-center text-slate-400">
               <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
               <p className="text-sm font-semibold">No hay ingresos en este período</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
};
