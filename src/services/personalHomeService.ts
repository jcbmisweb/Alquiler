import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { PersonalExpense, PersonalHouse, PersonalIncome } from '../types';

const DEFAULT_HOUSE: PersonalHouse = {
  id: 'house-principal',
  userId: 'demo-user',
  name: 'Casa Principal',
  address: 'Dirección Principal',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const personalHomeService = {
  async getPersonalHouses(): Promise<PersonalHouse[]> {
    if (auth.currentUser) {
      try {
        const q = query(
          collection(db, 'personalHouses'),
          where('userId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const houses = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PersonalHouse));
        if (houses.length > 0) return houses;
      } catch (err) {
        console.error('Error cargando casas de Firestore:', err);
      }
    }
    // Fallback to localStorage
    try {
      const saved = localStorage.getItem('app_personal_houses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [DEFAULT_HOUSE];
  },

  async savePersonalHouse(house: Omit<PersonalHouse, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<PersonalHouse> {
    const userId = auth.currentUser ? auth.currentUser.uid : 'demo-user';
    const now = new Date().toISOString();
    const id = house.id || `house-${Date.now()}`;

    const newHouse: PersonalHouse = {
      ...house,
      id,
      userId,
      createdAt: house.id ? (house as any).createdAt || now : now,
      updatedAt: now
    };

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'personalHouses', id), newHouse);
      } catch (err) {
        console.error('Error guardando casa en Firestore:', err);
      }
    }

    // Also update localStorage cache
    try {
      const current = await this.getPersonalHouses();
      const existingIdx = current.findIndex(h => h.id === id);
      if (existingIdx >= 0) {
        current[existingIdx] = newHouse;
      } else {
        current.push(newHouse);
      }
      localStorage.setItem('app_personal_houses', JSON.stringify(current));
    } catch (e) {
      console.error(e);
    }

    return newHouse;
  },

  async deletePersonalHouse(houseId: string): Promise<void> {
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'personalHouses', houseId));
      } catch (err) {
        console.error('Error eliminando casa en Firestore:', err);
      }
    }

    try {
      const current = await this.getPersonalHouses();
      const updated = current.filter(h => h.id !== houseId);
      localStorage.setItem('app_personal_houses', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  },

  async getPersonalExpenses(): Promise<PersonalExpense[]> {
    if (auth.currentUser) {
      try {
        const q = query(
          collection(db, 'personalExpenses'),
          where('userId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PersonalExpense));
        if (docs.length > 0) return docs;
      } catch (err) {
        console.error('Error cargando gastos de Firestore:', err);
      }
    }

    // Local storage fallback
    try {
      const saved = localStorage.getItem('app_personal_expenses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  async savePersonalExpense(expense: Omit<PersonalExpense, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<PersonalExpense> {
    const userId = auth.currentUser ? auth.currentUser.uid : 'demo-user';
    const now = new Date().toISOString();
    const id = expense.id || `expense-${Date.now()}`;

    const newExpense: PersonalExpense = {
      ...expense,
      id,
      userId,
      createdAt: expense.id ? (expense as any).createdAt || now : now,
      updatedAt: now
    };

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'personalExpenses', id), newExpense);
      } catch (err) {
        console.error('Error guardando gasto en Firestore:', err);
      }
    }

    try {
      const current = await this.getPersonalExpenses();
      const existingIdx = current.findIndex(e => e.id === id);
      if (existingIdx >= 0) {
        current[existingIdx] = newExpense;
      } else {
        current.push(newExpense);
      }
      localStorage.setItem('app_personal_expenses', JSON.stringify(current));
    } catch (e) {
      console.error(e);
    }

    return newExpense;
  },

  async deletePersonalExpense(expenseId: string): Promise<void> {
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'personalExpenses', expenseId));
      } catch (err) {
        console.error('Error eliminando gasto en Firestore:', err);
      }
    }

    try {
      const current = await this.getPersonalExpenses();
      const updated = current.filter(e => e.id !== expenseId);
      localStorage.setItem('app_personal_expenses', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  },

  async getPersonalIncomes(): Promise<PersonalIncome[]> {
    if (auth.currentUser) {
      try {
        const q = query(
          collection(db, 'personalIncomes'),
          where('userId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PersonalIncome));
        if (docs.length > 0) return docs;
      } catch (err) {
        console.error('Error cargando ingresos de Firestore:', err);
      }
    }

    // Local storage fallback
    try {
      const saved = localStorage.getItem('app_personal_incomes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  async savePersonalIncome(income: Omit<PersonalIncome, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string; userId?: string }): Promise<PersonalIncome> {
    const userId = auth.currentUser ? auth.currentUser.uid : 'demo-user';
    const now = new Date().toISOString();
    const id = income.id || `income-${Date.now()}`;

    const newIncome: PersonalIncome = {
      ...income,
      id,
      userId,
      createdAt: income.id ? (income as any).createdAt || now : now,
      updatedAt: now
    };

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'personalIncomes', id), newIncome);
      } catch (err) {
        console.error('Error guardando ingreso en Firestore:', err);
      }
    }

    try {
      const current = await this.getPersonalIncomes();
      const existingIdx = current.findIndex(i => i.id === id);
      if (existingIdx >= 0) {
        current[existingIdx] = newIncome;
      } else {
        current.push(newIncome);
      }
      localStorage.setItem('app_personal_incomes', JSON.stringify(current));
    } catch (e) {
      console.error(e);
    }

    return newIncome;
  },

  async deletePersonalIncome(incomeId: string): Promise<void> {
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'personalIncomes', incomeId));
      } catch (err) {
        console.error('Error eliminando ingreso en Firestore:', err);
      }
    }

    try {
      const current = await this.getPersonalIncomes();
      const updated = current.filter(i => i.id !== incomeId);
      localStorage.setItem('app_personal_incomes', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }
};
