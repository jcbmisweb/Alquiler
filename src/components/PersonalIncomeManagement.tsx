import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Wallet,
  Briefcase,
  Gift,
  Coins,
  TrendingUp,
  Activity,
  X,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Euro,
  PieChart as PieIcon
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { PersonalIncome } from '../types';
import { personalHomeService } from '../services/personalHomeService';

interface PersonalIncomeManagementProps {
  incomes: PersonalIncome[];
  onIncomeAdded: () => void;
}

const INCOME_CATEGORIES = [
  { id: 'Nomina', label: 'Nómina', icon: Briefcase, color: '#10b981' },
  { id: 'Regalo', label: 'Regalo', icon: Gift, color: '#f43f5e' },
  { id: 'Venta', label: 'Venta', icon: Coins, color: '#f59e0b' },
  { id: 'Inversion', label: 'Inversión', icon: TrendingUp, color: '#6366f1' },
  { id: 'Otros', label: 'Otros', icon: Wallet, color: '#8b5cf6' },
];

const MONTHS = [
  { value: 'all', label: 'Todos los meses' },
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

export const PersonalIncomeManagement: React.FC<PersonalIncomeManagementProps> = ({ incomes, onIncomeAdded }) => {
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('Nomina');
  const [notes, setNotes] = useState('');
  
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>(() => new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>(() => (new Date().getMonth() + 1).toString());

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || !amount || !date || !category) return;

    try {
      await personalHomeService.savePersonalIncome({
        id: editingIncomeId || undefined,
        concept,
        amount: parseFloat(amount),
        date,
        category,
        notes
      });

      // Reset form
      setConcept('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Nomina');
      setNotes('');
      setIsAddingIncome(false);
      setEditingIncomeId(null);
      
      onIncomeAdded();
    } catch (err) {
      console.error('Error saving income:', err);
    }
  };

  const handleEditIncome = (income: PersonalIncome) => {
    setConcept(income.concept);
    setAmount(income.amount.toString());
    setDate(income.date);
    setCategory(income.category);
    setNotes(income.notes || '');
    setEditingIncomeId(income.id);
    setIsAddingIncome(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteIncome = async (id: string) => {
    if (!window.confirm('¿Eliminar este ingreso?')) return;
    await personalHomeService.deletePersonalIncome(id);
    onIncomeAdded();
  };

  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<string>();
    yearsSet.add(currentYear.toString());
    yearsSet.add((currentYear - 1).toString());
    yearsSet.add((currentYear - 2).toString());
    incomes.forEach(i => {
      if (i.date) {
        const y = i.date.split('-')[0];
        if (y && /^\d{4}$/.test(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [incomes]);

  // Filtering
  const filteredIncomes = useMemo(() => {
    return incomes.filter(inc => {
      let matchesCategory = filterCategory === 'all' || inc.category === filterCategory;
      let matchesSearch = inc.concept.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (inc.notes && inc.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchesYear = true;
      let matchesMonth = true;
      if (inc.date) {
        const [y, m] = inc.date.split('-');
        if (filterYear !== 'all') matchesYear = y === filterYear;
        if (filterMonth !== 'all') matchesMonth = parseInt(m, 10).toString() === filterMonth;
      }
      
      return matchesCategory && matchesSearch && matchesYear && matchesMonth;
    });
  }, [incomes, filterCategory, searchQuery, filterYear, filterMonth]);

  const totalAmount = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);

  // Chart Data (Distribution)
  const chartData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredIncomes.forEach(inc => {
      totals[inc.category] = (totals[inc.category] || 0) + inc.amount;
    });
    return Object.entries(totals)
      .map(([name, value]) => {
        const cat = INCOME_CATEGORIES.find(c => c.id === name) || INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
        return { name: cat.label, value: parseFloat(value.toFixed(2)), color: cat.color };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredIncomes]);

  // Chart Data (Trend)
  const trendData = useMemo(() => {
    const targetYear = filterYear !== 'all' ? filterYear : new Date().getFullYear().toString();
    const months = MONTHS.filter(m => m.value !== 'all');
    return months.map(m => {
      const monthVal = m.value.padStart(2, '0');
      const total = incomes
        .filter(inc => inc.date && inc.date.startsWith(`${targetYear}-${monthVal}`))
        .reduce((sum, inc) => sum + inc.amount, 0);
      return {
        name: m.label.substring(0, 3),
        fullName: m.label,
        'Ingresos': parseFloat(total.toFixed(2))
      };
    });
  }, [incomes, filterYear]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            Ingresos Personales
          </h2>
          <p className="text-sm text-slate-500 mt-1">Controla tus nóminas, ventas y otros ingresos.</p>
        </div>
        <button
          onClick={() => {
            setIsAddingIncome(!isAddingIncome);
            if (!isAddingIncome) {
              setEditingIncomeId(null);
              setConcept('');
              setAmount('');
              setDate(new Date().toISOString().split('T')[0]);
              setCategory('Nomina');
              setNotes('');
            }
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm"
        >
          {isAddingIncome ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAddingIncome ? 'Cancelar' : 'Añadir Ingreso'}
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Form or List) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Add/Edit Form */}
          {isAddingIncome && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                {editingIncomeId ? <Edit2 className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                {editingIncomeId ? 'Editar Ingreso' : 'Nuevo Ingreso'}
              </h3>
              
              <form onSubmit={handleSaveIncome} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Concepto</label>
                    <input
                      type="text"
                      required
                      value={concept}
                      onChange={e => setConcept(e.target.value)}
                      placeholder="Ej: Nómina de Agosto"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Importe (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      {INCOME_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {editingIncomeId ? 'Guardar Cambios' : 'Añadir Ingreso'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar ingresos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="all">Todas las Categorías</option>
                {INCOME_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="all">Todos los años</option>
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {filteredIncomes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No hay ingresos registrados.</p>
                <p className="text-sm">Añade tu primer ingreso usando el botón superior.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 w-full">Concepto</th>
                      <th className="px-4 py-3 text-right">Importe</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIncomes.map(inc => {
                      const cat = INCOME_CATEGORIES.find(c => c.id === inc.category) || INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
                      const Icon = cat.icon;
                      
                      return (
                        <tr key={inc.id} className="hover:bg-slate-50 transition group">
                          <td className="px-4 py-3 text-slate-600 font-medium">{inc.date.split('-').reverse().join('/')}</td>
                          <td className="px-4 py-3">
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
                              style={{ backgroundColor: `${cat.color}15`, color: cat.color, borderColor: `${cat.color}30` }}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {cat.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-medium">
                            {inc.concept}
                            {inc.notes && <span className="block text-xs text-slate-400 font-normal truncate max-w-sm mt-0.5">{inc.notes}</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-emerald-600">
                            +{inc.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditIncome(inc)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteIncome(inc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

        {/* Right Column (Charts & Totals) */}
        <div className="space-y-6">
          <div className="bg-emerald-600 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <h3 className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">
              Total Filtrado
            </h3>
            <div className="text-4xl font-black mb-4">
              {totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </div>
            <div className="flex items-center gap-2 text-emerald-100 text-xs bg-black/20 p-2.5 rounded-xl border border-white/10">
              <Activity className="w-4 h-4" />
              <span>
                {filteredIncomes.length} {filteredIncomes.length === 1 ? 'registro' : 'registros'} en este período
              </span>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              Distribución de Ingresos
            </h3>
            
            {chartData.length > 0 ? (
              <div className="flex flex-col">
                <div className="h-44 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [`${val.toFixed(2)} €`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-slate-800 tracking-tight">
                      {totalAmount.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                  {chartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-slate-900 font-bold">{item.value.toFixed(1)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <PieIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs">Sin datos para el gráfico</p>
              </div>
            )}
          </div>
          
          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Evolución Mensual ({filterYear !== 'all' ? filterYear : new Date().getFullYear()})
            </h3>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val: number) => [`${val.toFixed(2)} €`, 'Ingresos']} labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label} />
                  <Area type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIngresos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
