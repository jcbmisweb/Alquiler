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
import { PersonalExpense } from '../types';

export const personalHomeService = {
  async getPersonalExpenses(): Promise<PersonalExpense[]> {
    if (auth.currentUser) {
      const q = query(
        collection(db, 'personalExpenses'),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PersonalExpense));
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
      await setDoc(doc(db, 'personalExpenses', id), newExpense);
    }
    return newExpense;
  },

  async deletePersonalExpense(expenseId: string): Promise<void> {
    if (auth.currentUser) {
      await deleteDoc(doc(db, 'personalExpenses', expenseId));
    }
  }
};
