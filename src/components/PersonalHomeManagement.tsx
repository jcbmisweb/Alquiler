import React, { useState } from 'react';
import {
  Home,
  Plus,
  Trash2,
  Zap,
  ShieldCheck,
  Building,
  Receipt,
  Euro,
  PieChart as PieIcon,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { PersonalExpense, MonthlyBill } from '../types';
import { personalHomeService } from '../services/personalHomeService';

interface PersonalHomeManagementProps {
  expenses: PersonalExpense[];
  bills?: MonthlyBill[];
  onExpenseAdded: () => void;
}

export const PersonalHomeManagement: React.FC<PersonalHomeManagementProps> = ({
  expenses,
  bills = [],
  onExpenseAdded
}) => {
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<'suministro' | 'seguro' | 'impuesto' | 'otro'>('suministro');
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Category Icon & Color Mapping
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'suministro':
        return {
          label: 'Suministros (Luz/Agua/Gas)',
          icon: Zap,
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-200',
          colorCode: '#f59e0b'
        };
      case 'seguro':
        return {
          label: 'Seguros',
          icon: ShieldCheck,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          colorCode: '#3b82f6'
        };
      case 'impuesto':
        return {
          label: 'Impuestos & IBI',
          icon: Building,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          colorCode: '#8b5cf6'
        };
      default:
        return {
          label: 'Otros Gastos',
          icon: Receipt,
          bgColor: 'bg-slate-100',
          textColor: 'text-slate-800',
          borderColor: 'border-slate-200',
          colorCode: '#64748b'
        };
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || !amount || parseFloat(amount) <= 0) return;

    setIsAdding(true);
    try {
      await personalHomeService.savePersonalExpense({
        concept: concept.trim(),
        amount: parseFloat(amount),
        date: date || new Date().toISOString().split('T')[0],
        category,
        notes: notes.trim() || undefined
      });

      setConcept('');
      setAmount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      onExpenseAdded();
    } catch (err) {
      console.error('Error guardando gasto personal:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este registro de gasto?')) {
      try {
        await personalHomeService.deletePersonalExpense(id);
        onExpenseAdded();
      } catch (err) {
        console.error('Error eliminando gasto personal:', err);
      }
    }
  };

  // Metrics Calculations
  const totalPersonalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const totalSuministros = expenses
    .filter((e) => e.category === 'suministro')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSeguros = expenses
    .filter((e) => e.category === 'seguro')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalImpuestos = expenses
    .filter((e) => e.category === 'impuesto')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOtros = expenses
    .filter((e) => e.category === 'otro')
    .reduce((sum, e) => sum + e.amount, 0);

  // Rental Income calculation for comparison
  const totalRentalIncomeCollected = bills.reduce((sum, b) => sum + b.paidAmount, 0);
  const netProfitability = totalRentalIncomeCollected - totalPersonalExpenses;

  // Pie Chart Data
  const categoryDistributionData = [
    { name: 'Suministros', value: totalSuministros, color: '#f59e0b' },
    { name: 'Seguros', value: totalSeguros, color: '#3b82f6' },
    { name: 'Impuestos / IBI', value: totalImpuestos, color: '#8b5cf6' },
    { name: 'Otros', value: totalOtros, color: '#64748b' }
  ].filter((item) => item.value > 0);

  // Filtered Expenses List
  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
    const matchesSearch =
      exp.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Home className="w-6 h-6 text-indigo-400" />
              Gestión de Gastos de Casa Personal
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Registro y control integral de gastos fijos (IBI, Seguros, Luz, Agua, Tasas) y rentabilidad neta.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Gastos Casa
              </span>
              <span className="text-xl font-extrabold text-rose-400">
                {totalPersonalExpenses.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
              <Zap className="w-4 h-4" />
              <span>Suministros</span>
            </div>
            <p className="text-lg font-bold text-white">{totalSuministros.toFixed(2)} €</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Seguros</span>
            </div>
            <p className="text-lg font-bold text-white">{totalSeguros.toFixed(2)} €</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold mb-1">
              <Building className="w-4 h-4" />
              <span>Impuestos / IBI</span>
            </div>
            <p className="text-lg font-bold text-white">{totalImpuestos.toFixed(2)} €</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
              <Receipt className="w-4 h-4" />
              <span>Otros</span>
            </div>
            <p className="text-lg font-bold text-white">{totalOtros.toFixed(2)} €</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
              <Euro className="w-4 h-4" />
              <span>Rentabilidad Neta</span>
            </div>
            <p
              className={`text-lg font-bold ${
                netProfitability >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {netProfitability.toFixed(2)} €
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Formulario de alta + Distribución visual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario para nuevo gasto */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Registrar Nuevo Gasto Doméstico
          </h3>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Concepto del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Recibo IBI 2026, Factura Luz Julio, Seguro del Hogar"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Importe (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="suministro">⚡ Suministro (Luz, Agua, Gas, Internet)</option>
                  <option value="seguro">🛡️ Seguro (Hogar, Responsabilidad Civil)</option>
                  <option value="impuesto">🏛️ Impuesto / IBI / Tasas Municipales</option>
                  <option value="otro">🧾 Otro Gasto Mantenimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha del Pago / Emisión
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observaciones / Notas (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Número de referencia, periodo abonado o proveedor"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {isAdding ? 'Guardando...' : 'Añadir Gasto'}
            </button>
          </form>
        </div>

        {/* Distribución por Categorías */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-600" />
            Distribución por Categorías
          </h3>

          {categoryDistributionData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {categoryDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [`${val.toFixed(2)} €`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8">
              <Receipt className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-xs">Aún no hay gastos registrados para estructurar el gráfico.</p>
            </div>
          )}
        </div>
      </div>

      {/* Listado de Gastos */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Histórico de Gastos Registrados ({filteredExpenses.length})
          </h3>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por concepto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Todas las categorías</option>
              <option value="suministro">Suministros</option>
              <option value="seguro">Seguros</option>
              <option value="impuesto">Impuestos / IBI</option>
              <option value="otro">Otros</option>
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">
              No hay gastos registrados que coincidan con la búsqueda.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Utiliza el formulario superior para añadir tu primer gasto doméstico.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Notas</th>
                  <th className="py-3 px-4 text-right">Importe (€)</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredExpenses.map((expense) => {
                  const details = getCategoryDetails(expense.category);
                  const CategoryIcon = details.icon;

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-medium text-slate-600 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {expense.date}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {expense.concept}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${details.bgColor} ${details.textColor} ${details.borderColor}`}
                        >
                          <CategoryIcon className="w-3 h-3" />
                          {details.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {expense.notes || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {expense.amount.toFixed(2)} €
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
