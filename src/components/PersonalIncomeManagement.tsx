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
  PieChart as PieIcon,
  Tag,
  FolderPlus
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
  const [categoriesList, setCategoriesList] = useState<{ id: string; label: string; color: string }[]>(() => {
    try {
      const saved = localStorage.getItem('app_personal_income_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'Nomina', label: 'Nómina', color: '#10b981' },
      { id: 'Regalo', label: 'Regalo', color: '#f43f5e' },
      { id: 'Venta', label: 'Venta', color: '#f59e0b' },
      { id: 'Inversion', label: 'Inversión', color: '#6366f1' },
      { id: 'Otros', label: 'Otros', color: '#8b5cf6' },
    ];
  });

  const saveCategoriesList = (updated: { id: string; label: string; color: string }[]) => {
    setCategoriesList(updated);
    localStorage.setItem('app_personal_income_categories', JSON.stringify(updated));
  };

  // Modal for Full Category Management (Edit, Rename, Delete, Add)
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#6366f1');
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const handleStartEditCategory = (index: number) => {
    setEditingCategoryIndex(index);
    setEditCategoryName(categoriesList[index].id);
    setEditCategoryColor(categoriesList[index].color || '#6366f1');
  };

  const handleSaveEditCategory = () => {
    if (editingCategoryIndex === null) return;
    const name = editCategoryName.trim();
    if (!name) return;

    const oldId = categoriesList[editingCategoryIndex].id;
    const updated = [...categoriesList];
    updated[editingCategoryIndex] = {
      id: name,
      label: name,
      color: editCategoryColor
    };

    saveCategoriesList(updated);
    if (category === oldId) setCategory(name);

    setEditingCategoryIndex(null);
    setEditCategoryName('');
  };

  const handleDeleteCategoryItem = (index: number) => {
    const target = categoriesList[index];
    if (window.confirm(`¿Estás seguro de eliminar la categoría "${target.id}" del desplegable?`)) {
      const updated = categoriesList.filter((_, i) => i !== index);
      saveCategoriesList(updated);
      if (category === target.id) setCategory(updated[0]?.id || 'Otros');
      if (filterCategory === target.id) setFilterCategory('all');
    }
  };

  const handleAddCategoryItem = () => {
    const name = newCategoryInput.trim();
    if (!name) return;
    if (!categoriesList.some(c => c.id.toLowerCase() === name.toLowerCase())) {
      const updated = [...categoriesList, { id: name, label: name, color: '#10b981' }];
      saveCategoriesList(updated);
      setCategory(name);
    }
    setNewCategoryInput('');
  };

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
        const cat = categoriesList.find(c => c.id === name) || categoriesList[categoriesList.length - 1];
        return { name: cat ? cat.label : name, value: parseFloat(value.toFixed(2)), color: cat ? cat.color : '#6366f1' };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredIncomes, categoriesList]);

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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Categoría</label>
                      <button
                        type="button"
                        onClick={() => setShowManageCategoriesModal(true)}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 underline flex items-center gap-1"
                      >
                        ⚙️ Modificar
                      </button>
                    </div>
                    <select
                      value={category}
                      onChange={e => {
                        if (e.target.value === '__MANAGE__') {
                          setShowManageCategoriesModal(true);
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      {categoriesList.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                      <option value="__MANAGE__">⚙️ Modificar Lista...</option>
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
                {categoriesList.map(cat => (
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
                      const cat = categoriesList.find(c => c.id === inc.category) || categoriesList[categoriesList.length - 1] || { id: 'Otros', label: 'Otros', color: '#8b5cf6' };
                      const Icon = Tag;
                      
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

      {/* Modal for Full Category Management */}
      {showManageCategoriesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowManageCategoriesModal(false);
                setEditingCategoryIndex(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <FolderPlus className="w-5 h-5 text-emerald-600" />
              Gestión de Categorías de Ingresos
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Modifica, renombra o elimina las categorías de ingresos.
            </p>

            {/* List of categories */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 mb-4">
              {categoriesList.map((cat, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                  {editingCategoryIndex === idx ? (
                    <div className="flex flex-col gap-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1 text-xs border border-emerald-300 bg-white text-slate-800 rounded-lg p-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                          placeholder="Nombre..."
                        />
                        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1 shrink-0" title="Color de la Categoría">
                          <input
                            type="color"
                            value={editCategoryColor}
                            onChange={(e) => setEditCategoryColor(e.target.value)}
                            className="w-5 h-5 border-0 rounded-md cursor-pointer p-0 bg-transparent"
                          />
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{editCategoryColor}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={handleSaveEditCategory}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingCategoryIndex(null)}
                          className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1.5 font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white" style={{ backgroundColor: cat.color || '#10b981' }} />
                        <span className="text-xs font-bold text-slate-800">{cat.id}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEditCategory(idx)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                          title="Renombrar o modificar esta categoría"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {categoriesList.length > 1 && (
                          <button
                            onClick={() => handleDeleteCategoryItem(idx)}
                            className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Eliminar de la lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Form to add a new category item */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Añadir Nueva Categoría</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Ej: Ingresos Extra..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategoryItem();
                  }}
                  className="flex-1 border border-slate-300 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <button
                  onClick={handleAddCategoryItem}
                  disabled={!newCategoryInput.trim()}
                  className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-xl transition whitespace-nowrap"
                >
                  Añadir
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowManageCategoriesModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
