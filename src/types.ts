export type RentStatus = 'al_dia' | 'pendiente' | 'atrasado';
export type TenantStatus = 'active' | 'past';
export type BillStatus = 'paid' | 'partial' | 'pending';
export type PaymentMethod = 'transferencia' | 'efectivo' | 'bizum' | 'otro';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface TenantDocument {
  id: string;
  title: string;
  uploadDate: string;
  fileUrl?: string; // Base64 data URL for PDFs
  fileName?: string;
  fileSize?: string;
}

export interface PersonalHouse {
  id: string;
  userId: string;
  name: string; // e.g. "Casa Principal", "Piso Playa Alicante"
  address: string; // Calle, número, piso
  city?: string; // Ciudad / Municipio
  cadastralReference?: string; // Referencia Catastral
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalExpense {
  id: string;
  userId: string;
  houseId?: string; // Reference to PersonalHouse
  concept: string; // e.g., 'Factura Luz Julio', 'IBI Anual'
  amount: number;
  date: string;
  category: string; // e.g., 'Luz', 'Agua', 'Gas', 'Seguros', 'IBI', 'Comunidad', or custom category
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isRecurring?: boolean; // If true, this is a recurring template
  recurrenceDay?: number; // Day of the month to generate, e.g. 1
  recurrencePeriod?: 'mensual' | 'trimestral' | 'anual'; // Frequency of recurrence
  recurrenceStartMonth?: number; // Starting/due month (1-12) for quarterly/annual expenses
  originalRecurringId?: string; // Points to the recurring template this was generated from
}

export interface PersonalIncome {
  id: string;
  userId: string;
  concept: string; // e.g., 'Nómina', 'Regalo', 'Venta'
  amount: number;
  date: string;
  category: string; // e.g., 'Nómina', 'Extra', 'Regalos', 'Otros'
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  userId: string;
  name: string; // e.g., 'Apartamento Centro', 'Casa Playa'
  address: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  userId: string;
  propertyId?: string; // Add this
  name: string;
  dni: string;
  address: string;
  phone: string;
  email: string;
  monthlyRentAmount: number;
  rentPaymentStatus: RentStatus;
  leaseStartDate: string;
  leaseEndDate?: string;
  status: TenantStatus;
  emergencyContact: EmergencyContact;
  notes?: string;
  lastPaymentDate?: string;
  // Fianza (Deposit)
  hasDeposit?: boolean;
  depositAmount?: number;
  depositDate?: string;
  depositNotes?: string;
  // Suministros (%)
  electricityPercentage?: number;
  waterPercentage?: number;
  // Signed Documents (PDF)
  documents?: TenantDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtraConcept {
  id: string;
  concept: string; // e.g., 'Agua', 'Luz', 'Reparación de grifo', 'Gas'
  amount: number; // Importe cobrado al inquilino (tras aplicar %)
  totalInvoiceAmount?: number; // Importe total de la factura original
  percentageShare?: number; // Porcentaje aplicado (ej: 50%)
  isPaid: boolean;
  category?: 'suministro' | 'reparacion' | 'comunidad' | 'otro';
  periodMonth?: number;
  periodYear?: number;
  originMonthName?: string;
  isLocked?: boolean;
  paymentDate?: string;
  // Fechas del consumo (Desde / Hasta)
  periodStartDate?: string;
  periodEndDate?: string;
  originalConceptId?: string;
  originalBillId?: string;
}

export interface MonthlyBill {
  id: string;
  userId: string;
  tenantId: string;
  propertyId?: string; // Add this
  tenantName: string;
  year: number;
  month: number; // 1 to 12
  rentAmount: number;
  extraConcepts: ExtraConcept[];
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  previousPendingAmount: number;
  status: BillStatus;
  lastPaidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  tenantId: string;
  monthlyBillId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  concept: string;
  notes?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
