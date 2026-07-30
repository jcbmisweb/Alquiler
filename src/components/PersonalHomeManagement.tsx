import React, { useState } from 'react';
import {
  Home,
  Plus,
  Trash2,
  Edit2,
  Zap,
  Droplet,
  Flame,
  Globe,
  ShieldCheck,
  Building,
  Users,
  Wrench,
  Receipt,
  Euro,
  PieChart as PieIcon,
  Search,
  Calendar,
  AlertCircle,
  Tag,
  FolderPlus,
  X,
  MapPin,
  Building2,
  CheckCircle2,
  BarChart2,
  Layers,
  FileText,
  RefreshCw,
  Clock
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { PersonalExpense, PersonalHouse, MonthlyBill } from '../types';
import { personalHomeService } from '../services/personalHomeService';

interface PersonalHomeManagementProps {
  expenses: PersonalExpense[];
  houses: PersonalHouse[];
  bills?: MonthlyBill[];
  onExpenseAdded: () => void;
}

const DEFAULT_CATEGORIES = [
  { id: 'Luz', label: 'Luz / Electricity', icon: Zap, color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  { id: 'Agua', label: 'Agua / Water', icon: Droplet, color: '#06b6d4', bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  { id: 'Gas', label: 'Gas / Heating', icon: Flame, color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  { id: 'Internet', label: 'Internet / Telecom', icon: Globe, color: '#6366f1', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  { id: 'Seguros', label: 'Seguros / Insurance', icon: ShieldCheck, color: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { id: 'IBI / Impuestos', label: 'IBI / Impuestos / Tasas', icon: Building, color: '#8b5cf6', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  { id: 'Comunidad', label: 'Comunidad de Propietarios', icon: Users, color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  { id: 'Mantenimiento', label: 'Mantenimiento y Reparaciones', icon: Wrench, color: '#ec4899', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  { id: 'Otros', label: 'Otros Gastos', icon: Receipt, color: '#64748b', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' }
];

export const PersonalHomeManagement: React.FC<PersonalHomeManagementProps> = ({
  expenses,
  houses = [],
  bills = [],
  onExpenseAdded
}) => {
  // Active Selected House ('all' or houseId)
  const [selectedHouseId, setSelectedHouseId] = useState<string>('all');

  // New/Edit Expense Form State
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('Luz');
  const [targetHouseId, setTargetHouseId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState<number>(1);

  // Filters State
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  // Categories State (Persisted in localStorage with default fallback)
  const [categoriesList, setCategoriesList] = useState<{ id: string; label: string; color: string }[]>(() => {
    try {
      const saved = localStorage.getItem('app_personal_expense_categories_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'Luz', label: 'Luz / Electricity', color: '#f59e0b' },
      { id: 'Agua', label: 'Agua / Water', color: '#06b6d4' },
      { id: 'Gas', label: 'Gas / Heating', color: '#f97316' },
      { id: 'Internet', label: 'Internet / Telecom', color: '#6366f1' },
      { id: 'Seguros', label: 'Seguros / Insurance', color: '#3b82f6' },
      { id: 'IBI / Impuestos', label: 'IBI / Impuestos / Tasas', color: '#8b5cf6' },
      { id: 'Comunidad', label: 'Comunidad de Propietarios', color: '#10b981' },
      { id: 'Mantenimiento', label: 'Mantenimiento y Reparaciones', color: '#ec4899' },
      { id: 'Otros', label: 'Otros Gastos', color: '#64748b' }
    ];
  });

  // Modal for Full Category Management (Edit, Rename, Delete, Add)
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#6366f1');
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Legacy Category Modal compatibility
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Modal for House Creation / Editing
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState<PersonalHouse | null>(null);
  const [houseName, setHouseName] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [houseCity, setHouseCity] = useState('');
  const [houseCadastral, setHouseCadastral] = useState('');
  const [houseNotes, setHouseNotes] = useState('');
  const [isSavingHouse, setIsSavingHouse] = useState(false);

  // Split expenses into actual payments and recurring templates
  const actualExpenses = expenses.filter(e => !e.isRecurring);
  const recurringTemplates = expenses.filter(e => e.isRecurring);

  // Save categories to localStorage
  const saveCategoriesList = (newList: { id: string; label: string; color: string }[]) => {
    setCategoriesList(newList);
    try {
      localStorage.setItem('app_personal_expense_categories_v2', JSON.stringify(newList));
    } catch (err) {
      console.error('Error saving categories:', err);
    }
  };

  // Helper to resolve house ID for new expense form
  const effectiveTargetHouseId = targetHouseId || (houses.length > 0 ? (selectedHouseId !== 'all' ? selectedHouseId : houses[0].id) : '');

  // Category Names list
  const allCategoryNames = Array.from(
    new Set([
      ...categoriesList.map(c => c.id),
      ...actualExpenses.map(e => e.category)
    ])
  );

  const getCategoryMeta = (catName: string) => {
    const match = categoriesList.find(
      c => c.id.toLowerCase() === catName.toLowerCase() || c.label.toLowerCase().includes(catName.toLowerCase())
    );
    if (match) {
      return {
        id: match.id,
        label: match.label,
        icon: Tag,
        color: match.color || '#6366f1',
        bg: 'bg-indigo-50',
        text: 'text-indigo-900',
        border: 'border-indigo-200'
      };
    }

    return {
      id: catName,
      label: catName,
      icon: Tag,
      color: '#6366f1',
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-200'
    };
  };

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
    if (filterCategory === oldId) setFilterCategory(name);

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
      const updated = [...categoriesList, { id: name, label: name, color: editCategoryColor }];
      saveCategoriesList(updated);
      setCategory(name);
    }
    setNewCategoryInput('');
  };

  const handleSaveNewCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (!categoriesList.some(c => c.id.toLowerCase() === name.toLowerCase())) {
      const updated = [...categoriesList, { id: name, label: name, color: '#6366f1' }];
      saveCategoriesList(updated);
      setCategory(name);
    }
    setNewCategoryName('');
    setShowNewCategoryModal(false);
  };

  // Open Modal to Create or Edit House
  const handleOpenHouseModal = (houseToEdit?: PersonalHouse) => {
    if (houseToEdit) {
      setEditingHouse(houseToEdit);
      setHouseName(houseToEdit.name);
      setHouseAddress(houseToEdit.address);
      setHouseCity(houseToEdit.city || '');
      setHouseCadastral(houseToEdit.cadastralReference || '');
      setHouseNotes(houseToEdit.notes || '');
    } else {
      setEditingHouse(null);
      setHouseName('');
      setHouseAddress('');
      setHouseCity('');
      setHouseCadastral('');
      setHouseNotes('');
    }
    setShowHouseModal(true);
  };

  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseName.trim() || !houseAddress.trim()) return;

    setIsSavingHouse(true);
    try {
      const savedHouse = await personalHomeService.savePersonalHouse({
        id: editingHouse ? editingHouse.id : undefined,
        name: houseName.trim(),
        address: houseAddress.trim(),
        city: houseCity.trim() || undefined,
        cadastralReference: houseCadastral.trim() || undefined,
        notes: houseNotes.trim() || undefined
      });

      setShowHouseModal(false);
      if (!editingHouse) {
        setSelectedHouseId(savedHouse.id);
      }
      onExpenseAdded(); // Reload data
    } catch (err) {
      console.error('Error guardando casa personal:', err);
    } finally {
      setIsSavingHouse(false);
    }
  };

  const handleDeleteHouse = async (houseId: string, houseTitle: string) => {
    if (window.confirm(`¿Estás seguro de eliminar la casa personal "${houseTitle}"? Esto no eliminará los gastos asociados.`)) {
      try {
        await personalHomeService.deletePersonalHouse(houseId);
        if (selectedHouseId === houseId) {
          setSelectedHouseId('all');
        }
        onExpenseAdded();
      } catch (err) {
        console.error('Error eliminando casa:', err);
      }
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || !amount || parseFloat(amount) <= 0) return;

    setIsAddingExpense(true);
    try {
      await personalHomeService.savePersonalExpense({
        concept: concept.trim(),
        amount: parseFloat(amount),
        date: isRecurring ? '2000-01-01' : (date || new Date().toISOString().split('T')[0]),
        category,
        houseId: effectiveTargetHouseId || undefined,
        notes: notes.trim() || undefined,
        isRecurring: isRecurring || undefined,
        recurrenceDay: isRecurring ? recurrenceDay : undefined
      });

      setConcept('');
      setAmount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setRecurrenceDay(1);
      onExpenseAdded();
    } catch (err) {
      console.error('Error guardando gasto personal:', err);
    } finally {
      setIsAddingExpense(false);
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

  // Filter Expenses by Selected House (exclude recurring templates from history stats)
  const houseExpenses = selectedHouseId === 'all'
    ? actualExpenses
    : actualExpenses.filter(e => e.houseId === selectedHouseId || (!e.houseId && houses.length > 0 && houses[0].id === selectedHouseId));

  const totalFilteredExpenseAmount = houseExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAllExpenseAmount = actualExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category Totals for active house selection
  const categoryTotals = allCategoryNames.map(cat => {
    const catExpenses = houseExpenses.filter(e => e.category.toLowerCase() === cat.toLowerCase());
    const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
    const meta = getCategoryMeta(cat);
    const percentage = totalFilteredExpenseAmount > 0 ? (total / totalFilteredExpenseAmount) * 100 : 0;
    return {
      category: cat,
      meta,
      total,
      count: catExpenses.length,
      percentage
    };
  });

  // Income Comparison
  const totalRentalIncome = bills.reduce((sum, b) => sum + b.paidAmount, 0);

  // Chart Data
  const chartData = categoryTotals
    .filter(item => item.total > 0)
    .map(item => ({
      name: item.meta.label || item.category,
      value: item.total,
      color: item.meta.color
    }));

  // Months in Spanish
  const MONTHS_SPANISH = [
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
    { value: '12', label: 'Diciembre' }
  ];

  // Unique Years list
  const yearsList = Array.from(
    new Set([
      new Date().getFullYear().toString(),
      ...actualExpenses
        .filter(e => e.date)
        .map(e => e.date.split('-')[0])
    ])
  ).sort().reverse();

  // Helper to check if a recurring template is already generated in selected month/year
  const isTemplateGeneratedForMonth = (templateId: string, year: string, month: string) => {
    return actualExpenses.some(e => {
      if (e.originalRecurringId !== templateId) return false;
      const [eYear, eMonth] = e.date.split('-');
      return eYear === year && parseInt(eMonth, 10).toString() === month;
    });
  };

  // List of templates not yet generated for selected month/year
  const pendingTemplatesForSelectedMonth = recurringTemplates.filter(t => 
    filterYear !== 'all' && filterMonth !== 'all' && !isTemplateGeneratedForMonth(t.id, filterYear, filterMonth)
  );

  // Handle mass generation of fixed expenses
  const handleGenerateRecurringExpenses = async () => {
    if (filterYear === 'all' || filterMonth === 'all' || pendingTemplatesForSelectedMonth.length === 0) return;
    setIsGenerating(true);
    try {
      const targetDate = `${filterYear}-${filterMonth.padStart(2, '0')}-01`;
      for (const t of pendingTemplatesForSelectedMonth) {
        await personalHomeService.savePersonalExpense({
          concept: t.concept,
          amount: t.amount,
          category: t.category,
          houseId: t.houseId,
          date: targetDate,
          notes: 'Gasto fijo mensual autogenerado',
          originalRecurringId: t.id
        });
      }
      onExpenseAdded(); // Reload data
    } catch (err) {
      console.error('Error generando gastos fijos:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered List for Table
  const tableExpenses = houseExpenses.filter((exp) => {
    const matchesCategory =
      filterCategory === 'all' || exp.category.toLowerCase() === filterCategory.toLowerCase();
    const matchesSearch =
      exp.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesMonth = true;
    let matchesYear = true;

    if (exp.date) {
      const [eYear, eMonth] = exp.date.split('-');
      if (filterYear !== 'all') {
        matchesYear = eYear === filterYear;
      }
      if (filterMonth !== 'all') {
        matchesMonth = parseInt(eMonth, 10).toString() === filterMonth;
      }
    }

    return matchesCategory && matchesSearch && matchesMonth && matchesYear;
  });

  const sortedTableExpenses = [...tableExpenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Home className="w-6 h-6 text-indigo-400" />
              Gestión de Casas Personales y Gastos Específicos
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Administra individualmente tus viviendas personales (Casa Principal, Playa, Chalet, etc.) con desglose por categorías (Luz, Agua, Gas, IBI, Seguros, Comunidad).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenHouseModal()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm border border-indigo-500/50"
            >
              <Building2 className="w-4 h-4" />
              <span>+ Agregar Casa Personal</span>
            </button>
          </div>
        </div>

        {/* HOUSE SELECTION TABS & CARDS */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Selecciona Vivienda Personal ({houses.length} {houses.length === 1 ? 'casa' : 'casas'})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Tab: TODAS LAS CASAS */}
            <div
              onClick={() => setSelectedHouseId('all')}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                selectedHouseId === 'all'
                  ? 'bg-indigo-900/80 border-indigo-400 ring-2 ring-indigo-400/50'
                  : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-indigo-400" />
                  Todas las Casas
                </span>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  Global
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">Consolidado general de todas tus propiedades</p>
              <p className="text-lg font-extrabold text-amber-400 mt-2">
                {totalAllExpenseAmount.toFixed(2)} €
              </p>
            </div>

            {/* List of Personal Houses */}
            {houses.map(house => {
              const isSelected = selectedHouseId === house.id;
              const hExpenses = expenses.filter(e => e.houseId === house.id || (!e.houseId && houses.length > 0 && houses[0].id === house.id));
              const hTotal = hExpenses.reduce((sum, e) => sum + e.amount, 0);

              return (
                <div
                  key={house.id}
                  onClick={() => setSelectedHouseId(house.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-indigo-900/80 border-indigo-400 ring-2 ring-indigo-400/50'
                      : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="truncate">{house.name}</span>
                      </span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenHouseModal(house);
                          }}
                          className="p-1 hover:bg-slate-700 text-slate-300 rounded transition"
                          title="Editar información de la casa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {houses.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHouse(house.id, house.name);
                            }}
                            className="p-1 hover:bg-rose-900/80 text-rose-300 rounded transition"
                            title="Eliminar casa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{house.address}{house.city ? `, ${house.city}` : ''}</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Total Gastos:</span>
                    <span className="text-base font-extrabold text-amber-400">
                      {hTotal.toFixed(2)} €
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DESGLOSE POR CATEGORÍAS */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Categorías de Gastos ({selectedHouseId === 'all' ? 'Todas las casas' : houses.find(h => h.id === selectedHouseId)?.name})
            </h3>
            <button
              onClick={() => setShowNewCategoryModal(true)}
              className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Nueva Categoría Específica</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categoryTotals.map(item => {
              const IconComp = item.meta.icon || Tag;
              return (
                <div
                  key={item.category}
                  onClick={() => setFilterCategory(filterCategory === item.category ? 'all' : item.category)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    filterCategory === item.category
                      ? 'bg-indigo-900/60 border-indigo-400 ring-2 ring-indigo-400/50'
                      : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                      <IconComp className="w-3.5 h-3.5 shrink-0" style={{ color: item.meta.color }} />
                      <span className="truncate">{item.category}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded">
                      {item.count}
                    </span>
                  </div>

                  <p className="text-base font-bold text-white mt-1">
                    {item.total.toFixed(2)} €
                  </p>

                  <div className="w-full bg-slate-700/60 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(item.percentage, 100)}%`,
                        backgroundColor: item.meta.color
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block text-right mt-1 font-mono">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FORMULARIO & DISTRIBUCIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Alta de Gasto */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Añadir Gasto Doméstico
            </h3>
            <button
              type="button"
              onClick={() => setShowNewCategoryModal(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition"
            >
              <FolderPlus className="w-4 h-4" />
              + Nueva Categoría
            </button>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Asignar a Casa Personal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Casa Personal Correspondiente *
                </label>
                <select
                  value={effectiveTargetHouseId}
                  onChange={(e) => setTargetHouseId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                  required
                >
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>
                      🏡 {h.name} ({h.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Concepto del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Factura Luz Julio, Seguro Hogar, IBI 2026, Reparación Caldera"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Importe */}
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

              {/* Categoría */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Categoría Específica *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManageCategoriesModal(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                  >
                    ⚙️ Modificar Categorías
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__MANAGE__') {
                      setShowManageCategoriesModal(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label || cat.id}
                    </option>
                  ))}
                  <option value="__MANAGE__">⚙️ Modificar / Modificar Lista de Categorías...</option>
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha de Pago / Emisión
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones / Ref.
                </label>
                <input
                  type="text"
                  placeholder="Ej: Periodo de consumo, nº recibo o compañía"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* GASTO RECURRENTE FIJO CHECKBOX */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 border-slate-300 cursor-pointer"
                />
                <label htmlFor="isRecurring" className="text-xs font-bold text-indigo-950 cursor-pointer select-none">
                  🔁 ¿Es un gasto recurrente o fijo mensual? (Ej: Spotify, Internet, Alarma)
                </label>
              </div>
              
              {isRecurring && (
                <div className="pl-6.5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Día del mes estimado para el cobro:
                    </label>
                    <select
                      value={recurrenceDay}
                      onChange={(e) => setRecurrenceDay(parseInt(e.target.value))}
                      className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>Día {d} de cada mes</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center">
                    💡 Se guardará como una plantilla recurrente y no se sumará a tus históricos hasta que lo generes en el mes deseado.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isAddingExpense}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {isAddingExpense ? 'Guardando...' : (isRecurring ? 'Guardar Plantilla Fija' : 'Registrar Gasto')}
            </button>
          </form>
        </div>

        {/* Gráfico de Distribución */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-600" />
            Gráfico de Distribución
          </h3>

          {chartData.length > 0 && (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name.split('/')[0]}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [`${val.toFixed(2)} €`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DE GASTOS FIJOS Y RECURRENTES */}
      <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border border-indigo-100 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <span className="p-3 bg-indigo-600/10 rounded-2xl text-indigo-700 mt-0.5 border border-indigo-100">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin-slow" />
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  🔄 Gestión de Gastos Fijos y Servicios Recurrentes (Spotify, ADSL, etc.)
                </h3>
                <span className="bg-indigo-600/15 text-indigo-800 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-600/20">
                  Plantillas Mensuales ({recurringTemplates.length})
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Define aquí tus suscripciones fijas o facturas mensuales que no varían de precio. El sistema te permitirá <strong>volcarlas automáticamente en el historial</strong> de cada mes con un solo clic.
              </p>
            </div>
          </div>
        </div>

        {/* LISTA DE PLANTILLAS RECURRENTES ACTIVAS */}
        {recurringTemplates.length === 0 ? (
          <div className="bg-white/80 border border-indigo-100/60 rounded-2xl p-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-8 h-8 text-indigo-400" />
            <p className="font-bold text-slate-800 text-sm">No tienes gastos fijos configurados todavía</p>
            <p className="text-slate-500 max-w-md">
              Prueba a añadir un gasto arriba (ej. "Suscripción Spotify" de 15.99 €) y marca la casilla de <strong>"¿Es un gasto recurrente o fijo mensual?"</strong> para guardarlo como plantilla aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recurringTemplates.map((template) => {
              const meta = getCategoryMeta(template.category);
              const CategoryIcon = meta.icon || Tag;
              const houseMatch = houses.find(h => h.id === template.houseId);

              return (
                <div
                  key={template.id}
                  className="bg-white p-4.5 rounded-2xl border border-indigo-100 shadow-3xs hover:border-indigo-200 transition flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${meta.bg} ${meta.text} ${meta.border}`}>
                        <CategoryIcon className="w-3 h-3" />
                        {template.category}
                      </span>
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                        {template.amount.toFixed(2)} €/mes
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        {template.concept}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <Home className="w-3 h-3 text-indigo-500 shrink-0" />
                        Asociado a: <strong className="text-slate-700">{houseMatch ? houseMatch.name : (houses[0]?.name || 'Casa Principal')}</strong>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        Generación estimada: día {template.recurrenceDay || 1} de cada mes
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Plantilla Activa</span>
                    <button
                      onClick={() => handleDeleteExpense(template.id)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                      title="Eliminar plantilla recurrente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MONTHLY GENERATOR ACTION BANNER */}
        <div className="pt-4 border-t border-indigo-100/80">
          <div className="bg-white rounded-2xl p-4 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 block">
                Generador de Gastos Fijos Mensuales
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Estado de generación para:</span>
                
                <div className="flex items-center gap-2">
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="text-xs font-bold border border-slate-300 rounded-lg py-1 px-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">🔍 Seleccionar Mes...</option>
                    {MONTHS_SPANISH.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="text-xs font-bold border border-slate-300 rounded-lg py-1 px-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">🔍 Seleccionar Año...</option>
                    {yearsList.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => {
                      const now = new Date();
                      setFilterYear(now.getFullYear().toString());
                      setFilterMonth((now.getMonth() + 1).toString());
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-bold"
                  >
                    Establecer Mes Actual
                  </button>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center">
              {filterYear === 'all' || filterMonth === 'all' ? (
                <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl font-medium">
                  Selecciona un mes y año para activar el generador mensual.
                </div>
              ) : recurringTemplates.length === 0 ? (
                <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl font-medium">
                  Crea plantillas fijas arriba para poder generarlas mensualmente.
                </div>
              ) : pendingTemplatesForSelectedMonth.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl text-xs font-bold shadow-3xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>¡Gastos fijos de {MONTHS_SPANISH.find(m => m.value === filterMonth)?.label} {filterYear} al día! 🔒</span>
                </div>
              ) : (
                <button
                  onClick={handleGenerateRecurringExpenses}
                  disabled={isGenerating}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm border border-emerald-500/50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Generando...' : `Generar ${pendingTemplatesForSelectedMonth.length} Gastos Fijos (+${pendingTemplatesForSelectedMonth.reduce((sum, t) => sum + t.amount, 0).toFixed(2)} €) 🔁`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE GASTOS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Histórico de Gastos ({tableExpenses.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por concepto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
              />
            </div>

            {/* Sync'd Month Filter */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Todos los meses</option>
              {MONTHS_SPANISH.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Sync'd Year Filter */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Todos los años</option>
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  Año {y}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Todas las categorías</option>
              {allCategoryNames.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {tableExpenses.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">
              No hay gastos registrados que coincidan con los filtros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Casa Personal</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Notas / Ref</th>
                  <th className="py-3 px-4 text-right">Importe (€)</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedTableExpenses.map((expense) => {
                  const meta = getCategoryMeta(expense.category);
                  const CategoryIcon = meta.icon || Tag;
                  const houseMatch = houses.find(h => h.id === expense.houseId);

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-medium text-slate-600 text-xs whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {expense.date}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 text-xs whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1 w-fit">
                          <Home className="w-3 h-3 text-indigo-500" />
                          {houseMatch ? houseMatch.name : (houses[0]?.name || 'Casa Principal')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {expense.concept}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}
                        >
                          <CategoryIcon className="w-3.5 h-3.5" />
                          {expense.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {expense.notes || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {expense.amount.toFixed(2)} €
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50"
                          title="Eliminar gasto"
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

      {/* MODAL PARA AGREGAR / EDITAR CASA PERSONAL */}
      {showHouseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowHouseModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-indigo-600" />
              {editingHouse ? 'Editar Casa Personal' : 'Agregar Nueva Casa Personal'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa los datos de tu vivienda personal para gestionar sus recibos, facturas y gastos por separado.
            </p>

            <form onSubmit={handleSaveHouse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Casa / Identificador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Casa Principal Madrid, Apartamento Playa Alicante, Chalet Sierra"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calle / Dirección Completa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Calle Gran Vía 42, 3ºA"
                    value={houseAddress}
                    onChange={(e) => setHouseAddress(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ciudad / Municipio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Madrid, Alicante, Málaga"
                    value={houseCity}
                    onChange={(e) => setHouseCity(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Referencia Catastral (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 9876543VK2897N0001WX"
                    value={houseCadastral}
                    onChange={(e) => setHouseCadastral(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notas Adicionales (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Teléfono suministros, clave contador"
                    value={houseNotes}
                    onChange={(e) => setHouseNotes(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHouseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingHouse}
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-sm"
                >
                  {isSavingHouse ? 'Guardando...' : (editingHouse ? 'Guardar Cambios' : 'Crear Casa Personal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR CATEGORÍA PERSONALIZADA */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowNewCategoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
              <FolderPlus className="w-5 h-5 text-indigo-600" />
              Crear Categoría Personalizada
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Añade un nuevo tipo de gasto (ej: Limpieza, Tasa Basuras, Alarma, Jardinero) para organizar tus gastos.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alarma Securitas, Tasa de Basuras, Limpieza Comunitaria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNewCategory();
                    }
                  }}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewCategory}
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition"
                >
                  Guardar Categoría
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA GESTIONAR Y EDITAR TODAS LAS CATEGORÍAS DEL DESPLEGABLE */}
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
              <FolderPlus className="w-5 h-5 text-indigo-600" />
              Gestión y Modificación de Categorías
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Modifica, renombra o elimina los elementos del desplegable (por ejemplo, si no tienes "Comunidad", puedes cambiarlo por "Alarma", "Servicios" o eliminarlo).
            </p>

            {/* List of categories */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 mb-4">
              {categoriesList.map((cat, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  {editingCategoryIndex === idx ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1 text-xs border border-indigo-300 rounded-lg p-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEditCategory}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingCategoryIndex(null)}
                        className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1.5"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#6366f1' }} />
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
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Form to add a new category item */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Añadir Nueva Categoría al Desplegable</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ej: Alarma Securitas, Tasa Basura, Limpieza..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategoryItem();
                    }
                  }}
                  className="flex-1 text-xs border border-slate-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAddCategoryItem}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                >
                  + Añadir
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
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
