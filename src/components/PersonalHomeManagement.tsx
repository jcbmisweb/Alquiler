import React, { useState, useMemo } from 'react';
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
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
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
  const [recurrencePeriod, setRecurrencePeriod] = useState<'mensual' | 'trimestral' | 'anual'>('mensual');
  const [recurrenceStartMonth, setRecurrenceStartMonth] = useState<number>(1);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Filters State
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>(() => new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>(() => (new Date().getMonth() + 1).toString());
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'dist' | 'trend' | 'houses' | 'fijos'>('dist');

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
      const updated = [...categoriesList, { id: name, label: name, color: editCategoryColor }];
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

  const handleStartEdit = (expense: PersonalExpense) => {
    setEditingExpenseId(expense.id);
    setConcept(expense.concept);
    setAmount(expense.amount.toString());
    setDate(expense.isRecurring ? new Date().toISOString().split('T')[0] : (expense.date || new Date().toISOString().split('T')[0]));
    setCategory(expense.category);
    setTargetHouseId(expense.houseId || '');
    setNotes(expense.notes || '');
    setIsRecurring(!!expense.isRecurring);
    setRecurrenceDay(expense.recurrenceDay || 1);
    setRecurrencePeriod(expense.recurrencePeriod || 'mensual');
    setRecurrenceStartMonth(expense.recurrenceStartMonth || 1);
    
    // Smooth scroll to form container
    const formEl = document.getElementById('gasto-form-container');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setConcept('');
    setAmount('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setRecurrenceDay(1);
    setRecurrencePeriod('mensual');
    setRecurrenceStartMonth(1);
    setEditingExpenseId(null);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || !amount || parseFloat(amount) <= 0) return;

    setIsAddingExpense(true);
    try {
      await personalHomeService.savePersonalExpense({
        id: editingExpenseId || undefined,
        concept: concept.trim(),
        amount: parseFloat(amount),
        date: isRecurring ? '2000-01-01' : (date || new Date().toISOString().split('T')[0]),
        category,
        houseId: effectiveTargetHouseId || undefined,
        notes: notes.trim() || undefined,
        isRecurring: isRecurring || undefined,
        recurrenceDay: isRecurring ? recurrenceDay : undefined,
        recurrencePeriod: isRecurring ? recurrencePeriod : undefined,
        recurrenceStartMonth: isRecurring ? recurrenceStartMonth : undefined
      });

      setConcept('');
      setAmount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setRecurrenceDay(1);
      setRecurrencePeriod('mensual');
      setRecurrenceStartMonth(1);
      setEditingExpenseId(null);
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

  const getTemplateRecurrenceText = (template: PersonalExpense) => {
    const day = template.recurrenceDay || 1;
    const period = template.recurrencePeriod || 'mensual';
    const start = template.recurrenceStartMonth || 1;

    if (period === 'mensual') {
      return `Día ${day} de cada mes`;
    }

    if (period === 'trimestral') {
      const cycleMonths = [start, start + 3, start + 6, start + 9].map(m => {
        // Wrap months
        const normalizedMonth = ((m - 1) % 12) + 1;
        const monthObj = MONTHS_SPANISH.find(mo => mo.value === normalizedMonth.toString());
        return monthObj ? monthObj.label.substring(0, 3) : '';
      });
      return `Día ${day} de: ${cycleMonths.join(', ')}`;
    }

    if (period === 'anual') {
      const monthObj = MONTHS_SPANISH.find(mo => mo.value === start.toString());
      const monthName = monthObj ? monthObj.label : 'Enero';
      return `Día ${day} de ${monthName} (Cada año)`;
    }

    return `Día ${day} de cada mes`;
  };

  // Unique Years list
  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<string>();
    
    // Always include current year and next year for planning
    yearsSet.add(currentYear.toString());
    yearsSet.add((currentYear + 1).toString());
    
    // Include past 2 years for historical reference
    yearsSet.add((currentYear - 1).toString());
    yearsSet.add((currentYear - 2).toString());
    
    // Include any years from actual registered expenses
    actualExpenses.forEach(e => {
      if (e.date) {
        const y = e.date.split('-')[0];
        if (y && /^\d{4}$/.test(y)) {
          yearsSet.add(y);
        }
      }
    });
    
    return Array.from(yearsSet).sort().reverse();
  }, [actualExpenses]);

  // Helper to check if a recurring template is already generated in selected month/year
  const isTemplateGeneratedForMonth = (templateId: string, year: string, month: string) => {
    return actualExpenses.some(e => {
      if (e.originalRecurringId !== templateId) return false;
      const [eYear, eMonth] = e.date.split('-');
      return eYear === year && parseInt(eMonth, 10).toString() === month;
    });
  };

  // Helper to check if a recurring template is eligible for generation in a selected month
  const isTemplateEligibleForMonth = (template: PersonalExpense, monthStr: string) => {
    const month = parseInt(monthStr, 10);
    if (isNaN(month)) return false;

    const period = template.recurrencePeriod || 'mensual';
    const startMonth = template.recurrenceStartMonth || 1;

    if (period === 'mensual') {
      return true;
    } else if (period === 'trimestral') {
      // Determines if selected month matches the quarterly cycle: e.g. startMonth, startMonth + 3, startMonth + 6, startMonth + 9
      const diff = (month - startMonth + 12) % 3;
      return diff === 0;
    } else if (period === 'anual') {
      return month === startMonth;
    }
    return false;
  };

  // List of templates not yet generated for selected month/year AND eligible for that month
  const pendingTemplatesForSelectedMonth = recurringTemplates.filter(t => 
    filterYear !== 'all' && 
    filterMonth !== 'all' && 
    isTemplateEligibleForMonth(t, filterMonth) &&
    !isTemplateGeneratedForMonth(t.id, filterYear, filterMonth)
  );

  const activeGeneratorYear = filterYear !== 'all' ? filterYear : new Date().getFullYear().toString();

  // Trend monthly chart data
  const trendChartData = useMemo(() => {
    const targetYear = filterYear !== 'all' ? filterYear : activeGeneratorYear;
    return MONTHS_SPANISH.map(m => {
      const monthValStr = m.value.padStart(2, '0');
      const monthExpenses = houseExpenses.filter(e => {
        if (!e.date) return false;
        const [y, mon] = e.date.split('-');
        return y === targetYear && mon === monthValStr;
      });
      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        name: m.label.substring(0, 3),
        fullName: m.label,
        'Gastos': parseFloat(total.toFixed(2))
      };
    });
  }, [houseExpenses, filterYear, activeGeneratorYear, MONTHS_SPANISH]);

  // House comparison chart data
  const houseComparisonData = useMemo(() => {
    return houses.map(h => {
      const hExpenses = actualExpenses.filter(e => {
        const belongs = e.houseId === h.id || (!e.houseId && houses.length > 0 && houses[0].id === h.id);
        if (!belongs) return false;
        
        let matchesYear = true;
        let matchesMonth = true;
        if (e.date) {
          const [y, mon] = e.date.split('-');
          if (filterYear !== 'all') matchesYear = y === filterYear;
          if (filterMonth !== 'all') matchesMonth = parseInt(mon, 10).toString() === filterMonth;
        }
        return matchesYear && matchesMonth;
      });
      const total = hExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        name: h.name,
        'Gastos': parseFloat(total.toFixed(2))
      };
    });
  }, [actualExpenses, houses, filterYear, filterMonth]);

  // Fixed vs Variable chart data
  const fixedVsVariableData = useMemo(() => {
    let fixedTotal = 0;
    let variableTotal = 0;
    houseExpenses.forEach(e => {
      if (e.originalRecurringId) {
        fixedTotal += e.amount;
      } else {
        variableTotal += e.amount;
      }
    });
    return [
      { name: 'Gastos Fijos', value: parseFloat(fixedTotal.toFixed(2)), color: '#6366f1' },
      { name: 'Gastos Variables', value: parseFloat(variableTotal.toFixed(2)), color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [houseExpenses]);

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

  // Handle mass generation of fixed expenses for a specific month and year
  const handleGenerateForSpecificMonth = async (monthVal: string, yearVal: string) => {
    const eligible = recurringTemplates.filter(t => isTemplateEligibleForMonth(t, monthVal));
    const pending = eligible.filter(t => !isTemplateGeneratedForMonth(t.id, yearVal, monthVal));
    if (pending.length === 0) return;
    
    setIsGenerating(true);
    try {
      const targetDate = `${yearVal}-${monthVal.padStart(2, '0')}-01`;
      for (const t of pending) {
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
      console.error('Error generando gastos fijos específicos:', err);
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
      <div id="gasto-form-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Alta de Gasto */}
        <div className={`lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border transition-all duration-300 ${editingExpenseId ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {editingExpenseId ? (
                <>
                  <Edit2 className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span>Modificar Gasto Doméstico</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <span>Añadir Gasto Doméstico</span>
                </>
              )}
            </h3>
            {editingExpenseId ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition border border-rose-200"
              >
                <X className="w-4 h-4" />
                Cancelar Edición
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewCategoryModal(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition"
              >
                <FolderPlus className="w-4 h-4" />
                + Nueva Categoría
              </button>
            )}
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
                  🔁 ¿Es un gasto recurrente o plantilla fija? (Mensual, Trimestral o Anual)
                </label>
              </div>
              
              {isRecurring && (
                <div className="pl-6.5 space-y-3 pt-1 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Día del mes */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Día estimado del cobro:
                      </label>
                      <select
                        value={recurrenceDay}
                        onChange={(e) => setRecurrenceDay(parseInt(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>Día {d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Frecuencia */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Frecuencia de cobro:
                      </label>
                      <select
                        value={recurrencePeriod}
                        onChange={(e) => {
                          const val = e.target.value as 'mensual' | 'trimestral' | 'anual';
                          setRecurrencePeriod(val);
                          // Reset start month based on periodicity defaults
                          if (val === 'trimestral') {
                            setRecurrenceStartMonth(1); // Cycle A by default
                          } else if (val === 'anual') {
                            setRecurrenceStartMonth(new Date().getMonth() + 1); // Current month by default
                          } else {
                            setRecurrenceStartMonth(1);
                          }
                        }}
                        className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                      >
                        <option value="mensual">🔄 Mensual (Cada mes)</option>
                        <option value="trimestral">📅 Trimestral (Cada 3 meses)</option>
                        <option value="anual">📆 Anual (Una vez al año)</option>
                      </select>
                    </div>

                    {/* Ciclo o Mes de cobro según frecuencia */}
                    {recurrencePeriod === 'trimestral' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Meses del año de cobro:
                        </label>
                        <select
                          value={recurrenceStartMonth}
                          onChange={(e) => setRecurrenceStartMonth(parseInt(e.target.value))}
                          className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                        >
                          <option value="1">Ene / Abr / Jul / Oct</option>
                          <option value="2">Feb / May / Ago / Nov</option>
                          <option value="3">Mar / Jun / Sep / Dic</option>
                        </select>
                      </div>
                    )}

                    {recurrencePeriod === 'anual' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Mes de cobro anual:
                        </label>
                        <select
                          value={recurrenceStartMonth}
                          onChange={(e) => setRecurrenceStartMonth(parseInt(e.target.value))}
                          className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                        >
                          <option value="1">Enero</option>
                          <option value="2">Febrero</option>
                          <option value="3">Marzo</option>
                          <option value="4">Abril</option>
                          <option value="5">Mayo</option>
                          <option value="6">Junio</option>
                          <option value="7">Julio</option>
                          <option value="8">Agosto</option>
                          <option value="9">Septiembre</option>
                          <option value="10">Octubre</option>
                          <option value="11">Noviembre</option>
                          <option value="12">Diciembre</option>
                        </select>
                      </div>
                    )}

                    {recurrencePeriod === 'mensual' && (
                      <div className="hidden sm:block">
                        {/* Empty space filler for 3 col layouts */}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 Se guardará como una plantilla recurrente y no se sumará a tus históricos hasta que la vuelques en el mes correspondiente usando el panel de abajo.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isAddingExpense}
              className={`w-full sm:w-auto font-semibold text-sm px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm ${
                editingExpenseId 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {editingExpenseId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isAddingExpense ? 'Guardando...' : (
                editingExpenseId 
                  ? 'Guardar Cambios' 
                  : (isRecurring ? 'Guardar Plantilla Fija' : 'Registrar Gasto')
              )}
            </button>
          </form>
        </div>

        {/* Panel de Gráficos e Informes Analíticos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                Análisis de Gastos
              </h3>
              
              {/* Selectores de Tipo de Gráficos */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveChartTab('dist')}
                  className={`px-2 py-1 rounded-md transition ${activeChartTab === 'dist' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Distribución de gastos por categoría"
                >
                  Categorías
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('trend')}
                  className={`px-2 py-1 rounded-md transition ${activeChartTab === 'trend' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Evolución temporal de gastos mensuales"
                >
                  Histórico
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('houses')}
                  className={`px-2 py-1 rounded-md transition ${activeChartTab === 'houses' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Comparativa de gastos entre tus casas"
                >
                  Casas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('fijos')}
                  className={`px-2 py-1 rounded-md transition ${activeChartTab === 'fijos' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Gastos fijos recurrentes vs variables"
                >
                  Fijo/Var
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
              {activeChartTab === 'dist' && 'Porcentaje de gastos por categoría en este período.'}
              {activeChartTab === 'trend' && `Evolución mensual de gastos durante el año ${activeGeneratorYear}.`}
              {activeChartTab === 'houses' && 'Comparativa del total de gastos acumulados entre tus propiedades.'}
              {activeChartTab === 'fijos' && 'Comparativa entre suscripciones/gastos recurrentes fijos y gastos variables.'}
            </p>
          </div>

          {/* RENDER ACTIVE CHART TAB */}
          <div className="mt-4 flex flex-col justify-between flex-1 min-h-[250px]">
            {activeChartTab === 'dist' && (
              chartData.length > 0 ? (
                <div className="flex flex-col justify-between flex-1">
                  {/* Contenedor del Donut con texto centrado absoluto */}
                  <div className="relative h-40 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={68}
                          paddingAngle={3}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => [`${val.toFixed(2)} €`]} />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Texto absoluto centrado */}
                    <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
                      <span className="text-sm font-black text-slate-800 tracking-tight">
                        {totalFilteredExpenseAmount.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Filtrado
                      </span>
                    </div>
                  </div>

                  {/* Leyenda Personalizada e Inteligente para evitar solapamientos */}
                  <div className="mt-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar space-y-1 pt-2 border-t border-slate-100">
                    {chartData.map((item, index) => {
                      const percentage = totalFilteredExpenseAmount > 0 ? (item.value / totalFilteredExpenseAmount) * 100 : 0;
                      return (
                        <div key={index} className="flex items-center justify-between text-xs font-medium py-0.5 hover:bg-slate-50 rounded-lg px-1 transition">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-700 font-bold truncate text-[11px]">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="text-slate-900 font-bold text-[11px]">{item.value.toFixed(1)}€</span>
                            <span className="text-[10px] font-semibold text-slate-400 font-mono">({percentage.toFixed(0)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 flex-1">
                  <PieIcon className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                  <p className="text-xs font-semibold">Sin datos en este período</p>
                  <p className="text-[10px] text-slate-500 text-center max-w-[150px] mt-1">Registra gastos para ver su distribución por categorías.</p>
                </div>
              )
            )}

            {activeChartTab === 'trend' && (
              <div className="flex flex-col justify-between flex-1">
                <div className="h-44 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val: number) => [`${val.toFixed(2)} €`, 'Gastos']} labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label} />
                      <Area type="monotone" dataKey="Gastos" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGastos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Media Mensual ({activeGeneratorYear})</span>
                    <span className="text-xs font-black text-slate-800">
                      {(trendChartData.reduce((sum, item) => sum + item['Gastos'], 0) / (trendChartData.filter(i => i['Gastos'] > 0).length || 1)).toFixed(1)} €/mes
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gasto Total Anual</span>
                    <span className="text-xs font-black text-indigo-600">
                      {trendChartData.reduce((sum, item) => sum + item['Gastos'], 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} €
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeChartTab === 'houses' && (
              <div className="flex flex-col justify-between flex-1">
                <div className="h-44 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={houseComparisonData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val: number) => [`${val.toFixed(2)} €`, 'Total Gastos']} />
                      <Bar dataKey="Gastos" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar pt-2 border-t border-slate-100">
                  {houseComparisonData.map((h, i) => {
                    const grandTotal = houseComparisonData.reduce((sum, item) => sum + item['Gastos'], 0);
                    const percentage = grandTotal > 0 ? (h['Gastos'] / grandTotal) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs font-medium py-1 px-1.5 hover:bg-slate-50 rounded-lg transition">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
                          <span className="text-slate-700 font-bold truncate text-[11px]">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <span className="text-slate-900 font-bold text-[11px]">{h['Gastos'].toFixed(1)}€</span>
                          <span className="text-[10px] font-semibold text-slate-400 font-mono">({percentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeChartTab === 'fijos' && (
              fixedVsVariableData.length > 0 ? (
                <div className="flex flex-col justify-between flex-1">
                  <div className="relative h-40 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fixedVsVariableData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                        >
                          {fixedVsVariableData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => [`${val.toFixed(2)} €`]} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Texto absoluto centrado */}
                    <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black text-slate-800 tracking-tight">
                        Fijos / Var
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100">
                    {fixedVsVariableData.map((item, index) => {
                      const totalAmount = fixedVsVariableData.reduce((sum, i) => sum + i.value, 0);
                      const percentage = totalAmount > 0 ? (item.value / totalAmount) * 100 : 0;
                      return (
                        <div key={index} className="flex items-center justify-between text-xs font-medium py-1 px-1.5 hover:bg-slate-50 rounded-lg transition">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-700 font-bold truncate text-[11px]">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="text-slate-900 font-bold text-[11px]">{item.value.toFixed(1)}€</span>
                            <span className="text-[10px] font-semibold text-slate-400 font-mono">({percentage.toFixed(0)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 flex-1">
                  <Activity className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                  <p className="text-xs font-semibold">Sin datos suficientes</p>
                  <p className="text-[10px] text-slate-500 text-center max-w-[150px] mt-1">Vuelca gastos fijos o añade variables para ver la proporción.</p>
                </div>
              )
            )}
          </div>
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
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg shrink-0">
                        {template.amount.toFixed(2)} €
                        <span className="text-[10px] font-bold text-indigo-400 ml-1">
                          {template.recurrencePeriod === 'trimestral' ? '/trimestre' : template.recurrencePeriod === 'anual' ? '/año' : '/mes'}
                        </span>
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
                        Generación estimada: {getTemplateRecurrenceText(template)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Plantilla Activa</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(template)}
                        className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition"
                        title="Editar plantilla fija"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(template.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                        title="Eliminar plantilla recurrente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MONTHLY GENERATOR ACTION BANNER & ANNUAL STATUS MATRIX */}
        <div className="pt-4 border-t border-indigo-100/80 space-y-4">
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

          {/* ANNUAL STATUS MATRIX OF FIXED EXPENSES */}
          <div className="bg-white/80 rounded-2xl p-4 border border-indigo-100/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  📅 Calendario Anual de Gastos Fijos ({activeGeneratorYear})
                </h4>
                <p className="text-[10px] text-slate-500">
                  Visualiza el estado de generación y vuelca los gastos mensuales para todo el año {activeGeneratorYear}.
                </p>
              </div>
              {filterYear === 'all' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-medium">Cambiar año:</span>
                  <select
                    value={activeGeneratorYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="text-[10px] font-bold border border-slate-300 rounded-lg py-0.5 px-2 bg-white text-slate-800"
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>{y === 'all' ? 'Ver todo' : y}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {MONTHS_SPANISH.map((m) => {
                const monthVal = m.value;
                const eligibleTemplates = recurringTemplates.filter(t => isTemplateEligibleForMonth(t, monthVal));
                const generatedTemplates = eligibleTemplates.filter(t => isTemplateGeneratedForMonth(t.id, activeGeneratorYear, monthVal));
                const pendingCount = eligibleTemplates.length - generatedTemplates.length;
                const totalAmount = eligibleTemplates.reduce((sum, t) => sum + t.amount, 0);

                let statusBg = 'bg-slate-50/70 border-slate-200';
                let statusText = 'text-slate-600';
                let isFullyGenerated = pendingCount === 0;

                if (eligibleTemplates.length === 0) {
                  statusBg = 'bg-slate-50/30 border-slate-100 opacity-60';
                  statusText = 'text-slate-400';
                } else if (isFullyGenerated) {
                  statusBg = 'bg-emerald-50/50 border-emerald-100';
                  statusText = 'text-emerald-700';
                } else {
                  statusBg = 'bg-amber-50/40 border-amber-200';
                  statusText = 'text-amber-800';
                }

                return (
                  <div
                    key={monthVal}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-2 transition text-xs ${statusBg}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800">{m.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold">
                        {totalAmount > 0 ? `${totalAmount.toFixed(0)}€` : ''}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {eligibleTemplates.length === 0 ? (
                        <span className="text-[10px] text-slate-400 block italic">Sin plantillas</span>
                      ) : isFullyGenerated ? (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold justify-center py-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Listo ({generatedTemplates.length})</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-amber-600 font-bold block text-center">
                            ⚠️ {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                          </span>
                          <button
                            disabled={isGenerating}
                            onClick={() => handleGenerateForSpecificMonth(monthVal, activeGeneratorYear)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] py-1 px-1 rounded-lg transition text-center shadow-3xs hover:shadow-xs active:scale-98"
                          >
                            Volcar {totalAmount.toFixed(0)}€
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(expense)}
                            className="text-slate-400 hover:text-amber-600 transition p-1.5 rounded-lg hover:bg-amber-50"
                            title="Editar gasto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50"
                            title="Eliminar gasto"
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
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Color Identificativo para Gráficos e Historial
                </label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <input
                    type="color"
                    value={editCategoryColor}
                    onChange={(e) => setEditCategoryColor(e.target.value)}
                    className="w-8 h-8 border-0 rounded-lg cursor-pointer p-0 bg-transparent shrink-0"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase">{editCategoryColor}</span>
                    <p className="text-[10px] text-slate-500">Haz clic en el cuadro de color para elegir un color personalizado.</p>
                  </div>
                </div>
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
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                  {editingCategoryIndex === idx ? (
                    <div className="flex flex-col gap-2 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1 text-xs border border-indigo-300 bg-white text-slate-800 rounded-lg p-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white" style={{ backgroundColor: cat.color || '#6366f1' }} />
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
              <label className="block text-xs font-bold text-slate-700">Añadir Nueva Categoría al Desplegable</label>
              <div className="flex flex-col sm:flex-row gap-2">
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
                <div className="flex items-center gap-2 shrink-0 justify-between">
                  <div className="flex items-center gap-1 bg-slate-150 border border-slate-300 rounded-xl p-1.5" title="Elegir Color">
                    <input
                      type="color"
                      value={editCategoryColor}
                      onChange={(e) => setEditCategoryColor(e.target.value)}
                      className="w-5 h-5 border-0 rounded-md cursor-pointer p-0 bg-transparent"
                    />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{editCategoryColor}</span>
                  </div>
                  <button
                    onClick={handleAddCategoryItem}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm shrink-0"
                  >
                    + Añadir
                  </button>
                </div>
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
