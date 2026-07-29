import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Tenant, MonthlyBill, PaymentRecord, RentStatus, ExtraConcept } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice/Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Key for LocalStorage fallback
const LOCAL_STORAGE_TENANTS_KEY = 'alquiler_tenants_db_v1';
const LOCAL_STORAGE_BILLS_KEY = 'alquiler_bills_db_v1';
const LOCAL_STORAGE_PAYMENTS_KEY = 'alquiler_payments_db_v1';

const monthNumberMap: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

const borjaRawPayments = [
  { amountPaid: 0, electricityAmount: 47.26, month: "agosto", waterPeriodTo: "", electricityTotalInvoice: 94.52, waterAmount: 0, rentAmount: 250, totalToPay: 297.26, paymentDate: "", electricityPercentage: 50, year: 2023, waterPercentage: 50, electricityPeriodFrom: "2023-07-03", waterTotalInvoice: 0, electricityPeriodTo: "2023-08-02", isPaid: false, id: "091vd19n6", otherExpenses: 0, notes: "", waterPeriodFrom: "", tenantId: "67m7v846p" },
  { year: 2024, waterPercentage: 50, electricityTotalInvoice: 82.02, month: "septiembre", isPaid: false, waterPeriodTo: "", id: "0yvcxk6fe", otherExpenses: 0, rentAmount: 250, tenantId: "67m7v846p", waterTotalInvoice: 66.97, waterPeriodFrom: "", amountPaid: 0, paymentDate: "", notes: "", electricityPeriodTo: "", waterAmount: 33.48, electricityPeriodFrom: "", electricityAmount: 41.01, electricityPercentage: 50 },
  { waterPercentage: 50, electricityPercentage: 50, electricityPeriodFrom: "", year: 2024, notes: "", tenantId: "67m7v846p", otherExpenses: 0, electricityTotalInvoice: 90.88, waterPeriodFrom: "", id: "2o1j57gm0", waterPeriodTo: "", paymentDate: "", electricityAmount: 45.44, electricityPeriodTo: "", waterTotalInvoice: 0, isPaid: false, amountPaid: 0, waterAmount: 0, month: "junio", rentAmount: 250 },
  { year: 2026, waterPercentage: 50, electricityTotalInvoice: 108, month: "marzo", isPaid: false, waterPeriodTo: "2026-03-11", id: "3co94n213", otherExpenses: 24.22, rentAmount: 250, totalToPay: 274.12, tenantId: "67m7v846p", waterTotalInvoice: 85.4, waterPeriodFrom: "", paymentDate: "2026-04-09", amountPaid: 1100, notes: "", electricityPeriodTo: "2026-03-24", waterAmount: 42.7, electricityPeriodFrom: "2026-02-24", electricityAmount: 54, electricityPercentage: 50 },
  { electricityTotalInvoice: 80.82, notes: "", electricityAmount: 40.41, isPaid: false, electricityPercentage: 50, waterTotalInvoice: 0, electricityPeriodTo: "2023-10-03", year: 2023, waterPeriodTo: "", electricityPeriodFrom: "2023-09-03", id: "3g7davdwo", waterPeriodFrom: "", otherExpenses: 0, paymentDate: "2023-10-26", tenantId: "67m7v846p", waterAmount: 0, totalToPay: 290.41, rentAmount: 250, amountPaid: 910.18, waterPercentage: 50, month: "octubre" },
  { electricityPeriodTo: "", year: 2024, id: "3ubu9hino", month: "julio", waterPercentage: 50, amountPaid: 0, isPaid: false, rentAmount: 250, waterPeriodTo: "", paymentDate: "", tenantId: "67m7v846p", electricityPercentage: 50, otherExpenses: 0, electricityPeriodFrom: "", electricityAmount: 36.02, electricityTotalInvoice: 72.04, waterTotalInvoice: 80.16, waterPeriodFrom: "", notes: "", waterAmount: 40.08 },
  { electricityPeriodFrom: "2022-05-02", otherExpenses: 0, isPaid: false, waterPeriodFrom: "", electricityPercentage: 50, electricityAmount: 113.58, waterTotalInvoice: 0, year: 2022, id: "4fpunuadq", month: "agosto", electricityPeriodTo: "2022-08-05", notes: "", waterPercentage: 50, paymentDate: "2022-08-30", tenantId: "67m7v846p", amountPaid: 884.23, waterAmount: 0, electricityTotalInvoice: 227.17, totalToPay: 363.58, rentAmount: 250, waterPeriodTo: "" },
  { month: "mayo", id: "4s6vbc9wb", otherExpenses: 0, isPaid: false, waterPercentage: 50, electricityPeriodFrom: "", electricityPercentage: 50, electricityTotalInvoice: 111.86, rentAmount: 250, paymentDate: "", electricityAmount: 55.93, amountPaid: 0, year: 2024, waterPeriodFrom: "", waterAmount: 40.3, waterPeriodTo: "", waterTotalInvoice: 80.6, electricityPeriodTo: "", tenantId: "67m7v846p", notes: "" },
  { paymentDate: "", electricityTotalInvoice: 79.74, electricityPercentage: 50, waterPeriodTo: "", electricityPeriodFrom: "2023-05-03", year: 2023, waterAmount: 0, electricityPeriodTo: "2023-06-01", waterPeriodFrom: "", month: "junio", amountPaid: 0, waterTotalInvoice: 0, notes: "", isPaid: false, id: "4t7km05z6", rentAmount: 250, tenantId: "67m7v846p", electricityAmount: 39.87, waterPercentage: 50, otherExpenses: 0 },
  { waterPeriodTo: "", waterPercentage: 50, electricityTotalInvoice: 109.44, electricityAmount: 54.72, paymentDate: "", electricityPeriodTo: "2024-01-03", month: "enero", waterAmount: 39.15, isPaid: false, waterTotalInvoice: 78.29, rentAmount: 250, waterPeriodFrom: "", notes: "", year: 2024, amountPaid: 0, electricityPercentage: 50, tenantId: "67m7v846p", otherExpenses: 0, id: "69wr2ir92", electricityPeriodFrom: "2023-12-03" },
  { waterAmount: 37.22, electricityPeriodFrom: "", id: "6j21lykkl", electricityPercentage: 50, waterPeriodFrom: "", otherExpenses: 0, paymentDate: "", month: "julio", electricityTotalInvoice: 145.19, year: 2025, electricityAmount: 72.59, waterPeriodTo: "", electricityPeriodTo: "", isPaid: false, notes: "", waterPercentage: 50, amountPaid: 0, tenantId: "67m7v846p", waterTotalInvoice: 74.43, rentAmount: 250 },
  { electricityPeriodTo: "2022-09-01", tenantId: "67m7v846p", otherExpenses: 0, electricityPeriodFrom: "2022-05-03", paymentDate: "", electricityPercentage: 50, month: "septiembre", waterAmount: 29.58, waterPercentage: 50, id: "88fh69opo", totalToPay: 412.56, electricityTotalInvoice: 265.96, rentAmount: 250, waterTotalInvoice: 59.16, amountPaid: 0, isPaid: false, notes: "", waterPeriodTo: "", electricityAmount: 132.98, year: 2022, waterPeriodFrom: "" },
  { electricityTotalInvoice: 0, amountPaid: 0, waterPercentage: 50, rentAmount: 250, totalToPay: 250, notes: "", id: "8l8gsbq1l", tenantId: "67m7v846p", waterPeriodTo: "2022-07-11", waterAmount: 32.41, otherExpenses: 0, electricityPercentage: 50, waterTotalInvoice: 64.82, isPaid: false, waterPeriodFrom: "2022-05-10", electricityPeriodTo: "", electricityPeriodFrom: "", month: "julio", year: 2022, electricityAmount: 0, paymentDate: "" },
  { isPaid: false, waterTotalInvoice: 0, waterPeriodFrom: "", waterPeriodTo: "", rentAmount: 250, totalToPay: 287.66, amountPaid: 1200.49, notes: "", electricityPeriodTo: "", electricityAmount: 37.66, month: "diciembre", paymentDate: "2024-12-11", year: 2024, waterPercentage: 50, electricityTotalInvoice: 75.33, tenantId: "67m7v846p", id: "8z4pj2bp6", otherExpenses: 0, electricityPeriodFrom: "", waterAmount: 0, electricityPercentage: 50 },
  { electricityTotalInvoice: 152.12, otherExpenses: 0, tenantId: "67m7v846p", month: "febrero", waterPeriodFrom: "", year: 2022, isPaid: false, electricityPeriodTo: "2022-02-01", paymentDate: "2022-02-22", amountPaid: 326.06, rentAmount: 250, waterPercentage: 50, electricityAmount: 76.06, waterTotalInvoice: 0, waterPeriodTo: "", electricityPercentage: 50, id: "9pldi2s73", notes: "", waterAmount: 0, electricityPeriodFrom: "2022-01-03" },
  { waterTotalInvoice: 62.93, id: "acw96d4m3", isPaid: false, otherExpenses: 0, waterPeriodFrom: "2023-01-11", electricityPeriodTo: "2023-03-01", month: "marzo", electricityAmount: 70.15, notes: "", year: 2023, electricityPercentage: 50, paymentDate: "", amountPaid: 0, waterPercentage: 50, tenantId: "67m7v846p", rentAmount: 250, electricityPeriodFrom: "2023-02-01", electricityTotalInvoice: 140.3, waterAmount: 31.46, waterPeriodTo: "2023-03-10" },
  { notes: "", waterPercentage: 50, waterTotalInvoice: 74.51, waterPeriodTo: "", id: "afm9z646s", electricityPeriodFrom: "", year: 2025, electricityAmount: 61.22, electricityPercentage: 50, electricityPeriodTo: "", electricityTotalInvoice: 122.43, waterPeriodFrom: "", paymentDate: "2025-01-31", isPaid: false, waterAmount: 37.26, otherExpenses: 0, rentAmount: 250, tenantId: "67m7v846p", amountPaid: 348.48, month: "enero" },
  { waterTotalInvoice: 0, month: "octubre", waterPeriodTo: "", waterPercentage: 50, tenantId: "67m7v846p", electricityAmount: 72.92, electricityPeriodTo: "", waterAmount: 0, electricityTotalInvoice: 145.85, rentAmount: 250, notes: "", year: 2025, electricityPeriodFrom: "", otherExpenses: 0, isPaid: false, waterPeriodFrom: "", paymentDate: "", electricityPercentage: 50, amountPaid: 0, id: "aqiq311xt" },
  { waterAmount: 39.99, totalToPay: 347.23, electricityPercentage: 50, rentAmount: 250, electricityPeriodFrom: "", amountPaid: 658.63, electricityPeriodTo: "", otherExpenses: 0, waterPeriodFrom: "", paymentDate: "2025-03-27", notes: "", isPaid: false, month: "marzo", year: 2025, waterTotalInvoice: 79.99, electricityTotalInvoice: 114.49, waterPeriodTo: "", electricityAmount: 57.24, waterPercentage: 50, tenantId: "67m7v846p", id: "b36q5f0ea" },
  { waterPercentage: 50, tenantId: "67m7v846p", year: 2022, notes: "", electricityPercentage: 50, isPaid: false, otherExpenses: 0, amountPaid: 309.43, rentAmount: 250, electricityPeriodTo: "2022-04-03", electricityPeriodFrom: "2022-03-03", id: "b8jjdzigt", waterPeriodFrom: "", waterPeriodTo: "", electricityAmount: 59.43, paymentDate: "2022-05-04", waterAmount: 0, waterTotalInvoice: 0, month: "abril", electricityTotalInvoice: 118.86 },
  { waterPeriodFrom: "2022-01-11", year: 2022, electricityAmount: 67.28, paymentDate: "2022-03-28", month: "marzo", waterPeriodTo: "2022-03-10", waterAmount: 44.35, electricityPercentage: 50, electricityPeriodFrom: "2022-02-01", isPaid: false, waterTotalInvoice: 88.71, waterPercentage: 50, notes: "", otherExpenses: 0, id: "bfles5qde", tenantId: "67m7v846p", electricityTotalInvoice: 134.55, amountPaid: 361.63, electricityPeriodTo: "2022-03-01", rentAmount: 250, totalToPay: 361.63 },
  { id: "bv58xapqe", electricityPeriodTo: "2023-11-03", otherExpenses: 0, year: 2023, waterAmount: 32.41, electricityTotalInvoice: 79.04, electricityAmount: 39.52, waterTotalInvoice: 64.82, amountPaid: 321.93, notes: "", paymentDate: "2023-12-01", waterPeriodFrom: "", rentAmount: 250, totalToPay: 321.93, tenantId: "67m7v846p", month: "noviembre", electricityPeriodFrom: "2023-10-03", waterPercentage: 50, electricityPercentage: 50, waterPeriodTo: "", isPaid: false },
  { electricityPercentage: 50, id: "cp639owlz", month: "mayo", paymentDate: "", electricityPeriodFrom: "2026-04-24", waterPercentage: 50, waterAmount: 39.01, otherExpenses: 0, year: 2026, waterTotalInvoice: 78.01, waterPeriodTo: "2026-05-12", electricityPeriodTo: "2026-05-24", isPaid: false, electricityTotalInvoice: 80.32, amountPaid: 0, tenantId: "67m7v846p", waterPeriodFrom: "", rentAmount: 250, totalToPay: 289.01, notes: "", electricityAmount: 40.16 },
  { electricityTotalInvoice: 122.8, waterTotalInvoice: 0, electricityAmount: 61.4, year: 2025, electricityPercentage: 50, electricityPeriodTo: "", notes: "", id: "cyuli0g1j", electricityPeriodFrom: "", otherExpenses: 0, waterPercentage: 50, isPaid: false, month: "febrero", waterPeriodTo: "", waterAmount: 0, tenantId: "67m7v846p", rentAmount: 250, paymentDate: "", amountPaid: 0, waterPeriodFrom: "" },
  { waterAmount: 26.94, notes: "", electricityTotalInvoice: 161.01, tenantId: "67m7v846p", waterPeriodTo: "", id: "d3qv0il1b", waterPercentage: 100, year: 2026, paymentDate: "", rentAmount: 250, totalToPay: 381.67, electricityAmount: 80.5, electricityPeriodTo: "2026-02-24", amountPaid: 0, otherExpenses: 0, electricityPeriodFrom: "2026-01-24", waterPeriodFrom: "", isPaid: false, waterTotalInvoice: 26.94, electricityPercentage: 50, month: "febrero" },
  { notes: "", waterPeriodFrom: "2021-09-08", waterPeriodTo: "2021-11-09", electricityTotalInvoice: 64.36, tenantId: "67m7v846p", paymentDate: "2021-11-22", id: "ebd8kwgl2", waterTotalInvoice: 88.71, waterPercentage: 50, year: 2021, electricityPeriodTo: "2021-11-07", totalToPay: 326.53, rentAmount: 250, isPaid: false, electricityPeriodFrom: "2021-10-03", month: "noviembre", electricityPercentage: 50, electricityAmount: 32.18, amountPaid: 326.54, waterAmount: 44.35, otherExpenses: 0 },
  { waterPercentage: 50, electricityPeriodTo: "", otherExpenses: 0, paymentDate: "", amountPaid: 0, waterAmount: 0, month: "abril", year: 2025, id: "gpb4e2lv8", rentAmount: 250, tenantId: "67m7v846p", electricityAmount: 54.05, notes: "", waterPeriodFrom: "", electricityTotalInvoice: 108.11, electricityPeriodFrom: "", waterPeriodTo: "", electricityPercentage: 50, isPaid: false, waterTotalInvoice: 0 },
  { waterTotalInvoice: 62.93, waterPeriodTo: "", paymentDate: "2022-12-14", id: "haztefihe", electricityPeriodTo: "", waterPercentage: 50, amountPaid: 333.62, isPaid: false, rentAmount: 250, notes: "", electricityAmount: 52.16, waterAmount: 31.46, month: "diciembre", tenantId: "67m7v846p", electricityTotalInvoice: 104.33, electricityPercentage: 50, year: 2022, waterPeriodFrom: "", electricityPeriodFrom: "", otherExpenses: 0 },
  { tenantId: "67m7v846p", electricityPercentage: 50, notes: "", waterPeriodFrom: "", electricityPeriodFrom: "2022-11-02", waterPeriodTo: "2023-01-16", amountPaid: 0, waterPercentage: 50, waterAmount: 33.35, otherExpenses: 0, year: 2023, totalToPay: 344.26, waterTotalInvoice: 66.7, rentAmount: 250, electricityTotalInvoice: 121.83, electricityAmount: 60.91, id: "hl1vd8ih7", paymentDate: "", electricityPeriodTo: "2023-01-10", month: "enero", isPaid: false },
  { waterPeriodFrom: "", paymentDate: "", electricityPeriodFrom: "", electricityPercentage: 50, isPaid: false, waterPeriodTo: "", notes: "", electricityTotalInvoice: 74.4, electricityAmount: 37.2, waterTotalInvoice: 0, tenantId: "67m7v846p", waterAmount: 0, electricityPeriodTo: "", waterPercentage: 50, otherExpenses: 0, amountPaid: 0, month: "octubre", id: "hnuu6fva7", year: 2024, rentAmount: 250 },
  { electricityPeriodFrom: "2023-11-03", waterPercentage: 50, electricityPercentage: 50, otherExpenses: 0, amountPaid: 294.63, rentAmount: 250, month: "diciembre", id: "i04cxf7n1", paymentDate: "2023-12-19", waterPeriodFrom: "", electricityPeriodTo: "2023-12-03", notes: "", electricityAmount: 44.63, isPaid: false, tenantId: "67m7v846p", waterPeriodTo: "", year: 2023, electricityTotalInvoice: 89.25, waterTotalInvoice: 0, waterAmount: 0 },
  { waterTotalInvoice: 0, waterAmount: 0, electricityTotalInvoice: 167.16, waterPeriodTo: "", waterPercentage: 50, amountPaid: 1025.77, year: 2025, notes: "", paymentDate: "2025-12-03", rentAmount: 250, totalToPay: 250, electricityAmount: 83.58, month: "diciembre", isPaid: false, electricityPeriodTo: "", waterPeriodFrom: "", electricityPercentage: 50, otherExpenses: 0, id: "ia02rgzwl", electricityPeriodFrom: "", tenantId: "67m7v846p" },
  { tenantId: "67m7v846p", waterPeriodTo: "", electricityAmount: 35.2, amountPaid: 285.2, totalToPay: 285.2, rentAmount: 250, waterPercentage: 50, electricityPeriodTo: "2021-12-06", month: "diciembre", waterTotalInvoice: 0, id: "jq2sko5as", isPaid: false, electricityPercentage: 50, notes: "", year: 2021, electricityTotalInvoice: 70.4, electricityPeriodFrom: "2021-11-07", waterAmount: 0, waterPeriodFrom: "", paymentDate: "2026-05-12", otherExpenses: 0 },
  { tenantId: "67m7v846p", electricityTotalInvoice: 83.96, waterPercentage: 50, otherExpenses: 0, year: 2023, month: "septiembre", rentAmount: 250, electricityPeriodFrom: "2023-08-02", electricityPercentage: 50, amountPaid: 0, waterAmount: 30.53, waterPeriodFrom: "", id: "jw9dcfh9x", electricityAmount: 41.98, electricityPeriodTo: "2023-09-30", waterPeriodTo: "", isPaid: false, waterTotalInvoice: 61.06, notes: "", paymentDate: "" },
  { paymentDate: "2026-07-29", electricityTotalInvoice: 143.43, otherExpenses: 0, waterPeriodFrom: "", amountPaid: 0, isPaid: false, totalToPay: 371.72, rentAmount: 300, notes: "", electricityPeriodTo: "2026-07-24", waterAmount: 42.7, waterTotalInvoice: 85.4, tenantId: "67m7v846p", month: "julio", id: "kwzunqv8a", year: 2026, waterPeriodTo: "2026-07-13", electricityPeriodFrom: "2026-06-24", waterPercentage: 50, electricityPercentage: 50, electricityAmount: 71.72 },
  { waterPeriodFrom: "", waterAmount: 18, waterPeriodTo: "", year: 2021, waterTotalInvoice: 36, month: "septiembre", electricityPeriodFrom: "2021-07-31", electricityAmount: 42.55, paymentDate: "2021-09-10", id: "ldgp2vw77", electricityPercentage: 50, waterPercentage: 50, electricityPeriodTo: "2021-09-01", amountPaid: 310.55, electricityTotalInvoice: 85.1, rentAmount: 250, totalToPay: 310.55, tenantId: "67m7v846p", notes: "", isPaid: false, otherExpenses: 0 },
  { otherExpenses: 0, waterAmount: 38.13, notes: "", paymentDate: "2025-06-02", waterPeriodFrom: "", electricityPeriodFrom: "", id: "mqz17b2of", electricityPercentage: 50, electricityAmount: 31.52, tenantId: "67m7v846p", electricityTotalInvoice: 63.03, amountPaid: 623.7, waterPercentage: 50, month: "mayo", waterPeriodTo: "", waterTotalInvoice: 76.26, year: 2025, rentAmount: 250, totalToPay: 319.65, electricityPeriodTo: "" },
  { notes: "", electricityAmount: 20.66, waterPercentage: 50, id: "mse8not3a", isPaid: true, electricityTotalInvoice: 41.32, otherExpenses: 0, waterTotalInvoice: 0, waterPeriodTo: "", year: 2022, paymentDate: "2026-05-12", electricityPercentage: 50, electricityPeriodFrom: "2022-04-19", waterPeriodFrom: "", tenantId: "67m7v846p", updatedAt: "", electricityPeriodTo: "2022-05-20", rentAmount: 250, amountPaid: 0, month: "junio", waterAmount: 0 },
  { waterPeriodTo: "", rentAmount: 250, amountPaid: 0, waterPeriodFrom: "", id: "nbfa2fg4a", month: "noviembre", isPaid: false, electricityPeriodTo: "", year: 2024, notes: "", waterAmount: 36.31, electricityAmount: 44.77, tenantId: "67m7v846p", paymentDate: "", waterTotalInvoice: 72.63, electricityTotalInvoice: 89.53, waterPercentage: 50, electricityPeriodFrom: "", electricityPercentage: 50, otherExpenses: 0 },
  { paymentDate: "2025-09-10", waterPeriodFrom: "", electricityAmount: 75, otherExpenses: 0, electricityPercentage: 50, electricityPeriodTo: "", electricityTotalInvoice: 149.99, waterTotalInvoice: 72.62, waterAmount: 36.31, notes: "", electricityPeriodFrom: "", totalToPay: 361.31, rentAmount: 250, isPaid: false, month: "septiembre", year: 2025, amountPaid: 1327.6, waterPercentage: 50, id: "nttmvyu4q", waterPeriodTo: "", tenantId: "67m7v846p" },
  { month: "mayo", waterAmount: 34.29, isPaid: false, amountPaid: 303.24, waterPercentage: 50, waterPeriodTo: "2022-05-10", paymentDate: "2026-05-12", rentAmount: 250, electricityTotalInvoice: 37.9, tenantId: "67m7v846p", year: 2022, otherExpenses: 0, electricityPeriodTo: "2022-04-19", waterTotalInvoice: 68.58, id: "p4eh866y5", electricityPeriodFrom: "2022-04-03", waterPeriodFrom: "2022-03-10", electricityPercentage: 50, electricityAmount: 18.95, notes: "" },
  { electricityTotalInvoice: 162.98, month: "noviembre", rentAmount: 250, electricityPercentage: 50, id: "p6c17le53", electricityPeriodFrom: "", waterPeriodFrom: "", waterTotalInvoice: 75.57, amountPaid: 0, isPaid: false, electricityAmount: 81.49, year: 2025, otherExpenses: 0, waterPeriodTo: "", electricityPeriodTo: "", waterPercentage: 50, waterAmount: 37.78, tenantId: "67m7v846p", paymentDate: "", notes: "" },
  { electricityPercentage: 50, electricityPeriodFrom: "2026-03-24", waterPeriodTo: "", tenantId: "67m7v846p", notes: "", electricityPeriodTo: "2026-04-24", waterPeriodFrom: "", id: "pcw79p0vg", electricityTotalInvoice: 94.8, electricityAmount: 47.4, otherExpenses: 0, month: "abril", waterAmount: 0, paymentDate: "2026-05-12", amountPaid: 0, rentAmount: 250, waterPercentage: 50, waterTotalInvoice: 0, isPaid: false, year: 2026 },
  { notes: "", waterPercentage: 50, waterPeriodTo: "", paymentDate: "2022-11-07", isPaid: false, electricityPeriodFrom: "2022-10-03", tenantId: "67m7v846p", year: 2022, electricityTotalInvoice: 106.56, waterAmount: 0, electricityPercentage: 50, id: "px8l8j3tk", waterPeriodFrom: "", waterTotalInvoice: 0, otherExpenses: 0, amountPaid: 1044.2, electricityAmount: 53.28, electricityPeriodTo: "2022-11-02", rentAmount: 250, month: "noviembre", totalToPay: 303.28 },
  { id: "qnz1xlvdn", waterTotalInvoice: 0, tenantId: "67m7v846p", notes: "", electricityPeriodTo: "", year: 2024, isPaid: false, amountPaid: 659.1, electricityAmount: 65.23, totalToPay: 315.23, rentAmount: 250, otherExpenses: 0, waterPercentage: 50, electricityPeriodFrom: "", waterPeriodTo: "", waterAmount: 0, electricityPercentage: 50, electricityTotalInvoice: 130.46, month: "febrero", paymentDate: "2024-03-03", waterPeriodFrom: "" },
  { rentAmount: 250, waterTotalInvoice: 100.29, waterPeriodTo: "2022-01-11", electricityPeriodTo: "2022-01-03", amountPaid: 336.55, paymentDate: "2022-12-31", waterAmount: 50.15, electricityPeriodFrom: "2021-12-06", year: 2022, electricityPercentage: 50, electricityAmount: 36.4, notes: "", waterPeriodFrom: "2021-11-09", id: "qrv6c0pgx", month: "enero", tenantId: "67m7v846p", electricityTotalInvoice: 72.8, isPaid: false, waterPercentage: 50, otherExpenses: 0 },
  { waterPeriodTo: "", waterPercentage: 50, waterPeriodFrom: "", month: "julio", electricityAmount: 0, paymentDate: "2021-07-28", waterAmount: 0, amountPaid: 0, id: "r2ev7l543", electricityPeriodFrom: "", waterTotalInvoice: 0, electricityPeriodTo: "", electricityTotalInvoice: 0, year: 2021, otherExpenses: 0, isPaid: false, electricityPercentage: 50, notes: "", tenantId: "67m7v846p", rentAmount: 0 },
  { waterPercentage: 50, notes: "", waterPeriodTo: "", paymentDate: "", isPaid: false, electricityPeriodFrom: "2023-04-01", tenantId: "67m7v846p", year: 2023, electricityTotalInvoice: 86.66, waterAmount: 31.46, electricityPercentage: 50, id: "rat6wpqtl", waterPeriodFrom: "", waterTotalInvoice: 62.93, otherExpenses: 0, amountPaid: 0, electricityAmount: 43.33, electricityPeriodTo: "2023-05-03", month: "mayo", rentAmount: 250 },
  { waterTotalInvoice: 0, waterAmount: 0, month: "agosto", electricityPeriodTo: "", otherExpenses: 0, year: 2024, electricityAmount: 52.29, tenantId: "67m7v846p", waterPercentage: 50, paymentDate: "2024-08-01", electricityTotalInvoice: 104.58, electricityPeriodFrom: "", electricityPercentage: 50, waterPeriodTo: "", isPaid: false, amountPaid: 1300, id: "rk369yj1d", rentAmount: 250, waterPeriodFrom: "", notes: "" },
  { rentAmount: 250, waterPeriodTo: "", electricityTotalInvoice: 123.69, notes: "", waterAmount: 39.15, electricityPeriodTo: "", amountPaid: 0, tenantId: "67m7v846p", id: "rngia182r", electricityPercentage: 50, electricityPeriodFrom: "", paymentDate: "", waterPeriodFrom: "", year: 2024, waterTotalInvoice: 78.29, isPaid: false, electricityAmount: 61.84, otherExpenses: 0, month: "marzo", waterPercentage: 50 },
  { electricityAmount: 55.3, month: "abril", electricityPeriodTo: "", amountPaid: 656.29, totalToPay: 305.3, paymentDate: "2024-03-24", tenantId: "67m7v846p", rentAmount: 250, id: "sux3s1tuv", waterPeriodFrom: "", waterAmount: 0, otherExpenses: 0, waterTotalInvoice: 0, electricityPeriodFrom: "", waterPeriodTo: "", year: 2024, electricityPercentage: 50, waterPercentage: 50, isPaid: false, electricityTotalInvoice: 110.61, notes: "" },
  { amountPaid: 0, year: 2025, waterPeriodTo: "", notes: "", isPaid: false, electricityAmount: 44.63, rentAmount: 250, id: "ufytzp90t", waterTotalInvoice: 0, electricityTotalInvoice: 89.25, tenantId: "67m7v846p", waterPeriodFrom: "", waterAmount: 0, electricityPercentage: 50, electricityPeriodFrom: "", otherExpenses: 0, month: "junio", waterPercentage: 50, paymentDate: "", electricityPeriodTo: "" },
  { electricityTotalInvoice: 120.24, otherExpenses: 0, month: "abril", electricityAmount: 60.12, isPaid: false, waterPeriodFrom: "", tenantId: "67m7v846p", electricityPercentage: 50, electricityPeriodTo: "2023-04-01", totalToPay: 310.12, rentAmount: 250, id: "ux984h3p9", waterTotalInvoice: 0, amountPaid: 661.73, electricityPeriodFrom: "2023-03-01", year: 2023, waterPercentage: 50, waterAmount: 0, paymentDate: "2023-05-03", waterPeriodTo: "", notes: "" },
  { id: "v4sxsfcpx", notes: "", isPaid: false, electricityPercentage: 50, waterPercentage: 50, year: 2021, electricityAmount: 0, waterPeriodFrom: "", electricityPeriodFrom: "", otherExpenses: 0, paymentDate: "2021-08-30", electricityPeriodTo: "", rentAmount: 250, waterAmount: 0, waterPeriodTo: "", electricityTotalInvoice: 0, month: "agosto", waterTotalInvoice: 0, amountPaid: 250, tenantId: "67m7v846p" },
  { waterPeriodFrom: "", year: 2025, electricityAmount: 61.85, paymentDate: "", month: "agosto", waterAmount: 0, electricityPercentage: 50, electricityPeriodFrom: "", isPaid: false, waterTotalInvoice: 0, waterPercentage: 50, notes: "", otherExpenses: 0, tenantId: "67m7v846p", id: "vhplz5noq", electricityTotalInvoice: 123.7, amountPaid: 0, electricityPeriodTo: "", rentAmount: 250, totalToPay: 311.85 },
  { waterAmount: 39.05, electricityTotalInvoice: 245.27, waterPercentage: 50, isPaid: false, tenantId: "67m7v846p", notes: "", waterTotalInvoice: 78.1, electricityAmount: 122.64, rentAmount: 250, waterPeriodTo: "", amountPaid: 0, paymentDate: "", electricityPercentage: 50, otherExpenses: 0, waterPeriodFrom: "", electricityPeriodFrom: "", month: "enero", electricityPeriodTo: "", id: "wz1o3rky0", year: 2026 },
  { otherExpenses: 0, electricityPeriodTo: "2021-10-03", isPaid: false, tenantId: "67m7v846p", electricityTotalInvoice: 59.24, paymentDate: "2021-10-19", waterPercentage: 50, waterAmount: 0, electricityPercentage: 50, notes: "", electricityPeriodFrom: "2021-09-01", electricityAmount: 29.62, month: "octubre", id: "yablrtclp", waterPeriodFrom: "", rentAmount: 250, totalToPay: 279.62, year: 2021, amountPaid: 279.62, waterPeriodTo: "", waterTotalInvoice: 0 },
  { waterPercentage: 50, id: "za8090ied", amountPaid: 950, month: "junio", paymentDate: "2026-05-13", waterPeriodTo: "", rentAmount: 250, totalToPay: 317.8, waterTotalInvoice: 0, electricityAmount: 67.8, electricityPercentage: 50, waterAmount: 0, year: 2026, electricityPeriodFrom: "2026-05-24", waterPeriodFrom: "", tenantId: "67m7v846p", isPaid: false, electricityTotalInvoice: 135.59, otherExpenses: 0, electricityPeriodTo: "2026-06-24", notes: "" },
  { waterPeriodFrom: "", electricityPeriodTo: "2022-10-03", isPaid: false, year: 2022, otherExpenses: 0, tenantId: "67m7v846p", notes: "", electricityPercentage: 50, electricityTotalInvoice: 156.72, electricityPeriodFrom: "2022-09-01", id: "zgll5ldco", waterPercentage: 50, amountPaid: 0, waterTotalInvoice: 0, rentAmount: 250, waterPeriodTo: "", totalToPay: 328.36, month: "octubre", paymentDate: "", waterAmount: 0, includedChargeIds: [], electricityAmount: 78.36 },
  { electricityPercentage: 50, waterPeriodTo: "", id: "zxzm5vgdh", month: "julio", electricityPeriodFrom: "2023-06-01", waterPercentage: 50, amountPaid: 953.79, isPaid: false, rentAmount: 250, totalToPay: 339.13, paymentDate: "2023-07-13", tenantId: "67m7v846p", waterTotalInvoice: 61.06, electricityAmount: 58.6, electricityTotalInvoice: 117.2, notes: "", waterPeriodFrom: "", year: 2023, electricityPeriodTo: "2023-07-03", waterAmount: 30.53, otherExpenses: 0 },
  { electricityAmount: 67.89, tenantId: "67m7v846p", waterPeriodFrom: "", electricityPeriodTo: "2023-02-01", otherExpenses: 0, isPaid: false, notes: "", waterTotalInvoice: 0, waterPeriodTo: "", electricityPeriodFrom: "2023-12-20", id: "zym8zyfwu", month: "febrero", waterAmount: 0, year: 2023, electricityPercentage: 50, waterPercentage: 50, electricityTotalInvoice: 135.78, rentAmount: 250, totalToPay: 317.89, paymentDate: "2023-02-20", amountPaid: 662.15 }
];

const mappedBorjaBills: MonthlyBill[] = borjaRawPayments.map((p) => {
  const m = monthNumberMap[p.month] || 1;
  const extraConcepts: ExtraConcept[] = [];

  if (p.electricityAmount > 0 || p.electricityTotalInvoice > 0) {
    extraConcepts.push({
      id: `ext-elec-${p.id}`,
      concept: 'Electricidad (Luz)',
      amount: p.electricityAmount || 0,
      totalInvoiceAmount: p.electricityTotalInvoice || undefined,
      percentageShare: p.electricityPercentage || 50,
      isPaid: p.isPaid || (p.amountPaid > 0 && p.amountPaid >= (p.totalToPay || 0)),
      category: 'suministro',
      periodStartDate: p.electricityPeriodFrom || undefined,
      periodEndDate: p.electricityPeriodTo || undefined,
      periodMonth: m,
      periodYear: p.year
    });
  }

  if (p.waterAmount > 0 || p.waterTotalInvoice > 0) {
    extraConcepts.push({
      id: `ext-wat-${p.id}`,
      concept: 'Agua',
      amount: p.waterAmount || 0,
      totalInvoiceAmount: p.waterTotalInvoice || undefined,
      percentageShare: p.waterPercentage || 50,
      isPaid: p.isPaid || (p.amountPaid > 0 && p.amountPaid >= (p.totalToPay || 0)),
      category: 'suministro',
      periodStartDate: p.waterPeriodFrom || undefined,
      periodEndDate: p.waterPeriodTo || undefined,
      periodMonth: m,
      periodYear: p.year
    });
  }

  if (p.otherExpenses > 0) {
    extraConcepts.push({
      id: `ext-oth-${p.id}`,
      concept: 'Otros Gastos',
      amount: p.otherExpenses,
      isPaid: p.isPaid,
      category: 'otro'
    });
  }

  const extrasSum = extraConcepts.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAmount = (p.rentAmount || 250) + extrasSum;
  const paidAmount = p.amountPaid || 0;
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  let status: 'paid' | 'partial' | 'pending' = 'pending';
  if (pendingAmount <= 0.05) status = 'paid';
  else if (paidAmount > 0) status = 'partial';

  return {
    id: `bill-${p.id}`,
    userId: 'demo-user',
    tenantId: '67m7v846p',
    tenantName: 'Borja Álvarez',
    year: p.year,
    month: m,
    rentAmount: p.rentAmount || 250,
    extraConcepts,
    totalAmount,
    paidAmount,
    pendingAmount,
    previousPendingAmount: 0,
    status,
    lastPaidDate: p.paymentDate || undefined,
    notes: p.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
});

// Initial sample data for demonstration if DB is empty
export const initialSampleTenants: Tenant[] = [
  {
    id: '67m7v846p',
    userId: 'demo-user',
    name: 'Borja Álvarez',
    dni: '12345678B',
    address: 'Calle Mayor 12, 1ºA, Madrid',
    phone: '664 00 57 34',
    email: 'borja.alvarez@email.com',
    monthlyRentAmount: 300,
    rentPaymentStatus: 'pendiente',
    leaseStartDate: '2021-07-28',
    status: 'active',
    electricityPercentage: 50,
    waterPercentage: 50,
    hasDeposit: true,
    depositAmount: 100,
    depositDate: '2021-07-28',
    depositNotes: '100€ inicial + 250€ adelanto fianza (19/10/2021)',
    emergencyContact: {
      name: 'Candelaria',
      phone: '637400934',
      relationship: 'Madre'
    },
    notes: 'Inquilino registrado con historial completo importado (2021 - 2026).',
    lastPaymentDate: '2026-07-29',
    createdAt: '2021-07-28T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tenant-001',
    userId: 'demo-user',
    name: 'Carlos Mendoza García',
    dni: '48291039B',
    address: 'Calle Mayor 14, 2ºA, Madrid',
    phone: '612345678',
    email: 'carlos.mendoza@email.com',
    monthlyRentAmount: 750,
    rentPaymentStatus: 'al_dia',
    leaseStartDate: '2025-01-01',
    leaseEndDate: '2026-12-31',
    status: 'active',
    electricityPercentage: 50,
    waterPercentage: 50,
    emergencyContact: {
      name: 'María Mendoza García',
      phone: '699887766',
      relationship: 'Hermana'
    },
    notes: 'Inquilino puntual. Contrato de 2 años renovable.',
    lastPaymentDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tenant-002',
    userId: 'demo-user',
    name: 'Elena Rodríguez Sánchez',
    dni: '53910284K',
    address: 'Avenida de la Constitución 8, 1ºB',
    phone: '677112233',
    email: 'elena.rodriguez@email.com',
    monthlyRentAmount: 820,
    rentPaymentStatus: 'pendiente',
    leaseStartDate: '2024-06-01',
    leaseEndDate: '2026-05-31',
    status: 'active',
    electricityPercentage: 50,
    waterPercentage: 50,
    emergencyContact: {
      name: 'Roberto Rodríguez',
      phone: '655443322',
      relationship: 'Padre'
    },
    notes: 'Pendiente de abonar la factura de suministro de agua de este mes.',
    lastPaymentDate: '2026-06-05',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialSampleBills: MonthlyBill[] = [
  ...mappedBorjaBills,
  {
    id: 'bill-2026-06-002',
    userId: 'demo-user',
    tenantId: 'tenant-002',
    tenantName: 'Elena Rodríguez Sánchez',
    year: 2026,
    month: 6,
    rentAmount: 820,
    extraConcepts: [
      { id: 'ext-june-luz', concept: 'Luz (Factura tardía)', amount: 48.50, totalInvoiceAmount: 97.00, percentageShare: 50, isPaid: false, category: 'suministro', periodMonth: 6, periodYear: 2026, originMonthName: 'Junio 2026', isLocked: false },
      { id: 'ext-june-agua', concept: 'Agua Bimensual (Mayo-Junio)', amount: 32.00, totalInvoiceAmount: 64.00, percentageShare: 50, isPaid: false, category: 'suministro', periodMonth: 6, periodYear: 2026, originMonthName: 'Junio 2026', isLocked: false }
    ],
    totalAmount: 900.50,
    paidAmount: 820.00,
    pendingAmount: 80.50,
    previousPendingAmount: 0,
    status: 'partial',
    lastPaidDate: '2026-06-05',
    notes: 'Junio: Se cobró la renta (820€). Pendiente de cobrar luz y agua recibidos a fin de mes.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bill-2026-07-001',
    userId: 'demo-user',
    tenantId: 'tenant-001',
    tenantName: 'Carlos Mendoza García',
    year: 2026,
    month: 7,
    rentAmount: 750,
    extraConcepts: [
      { id: 'ext-1', concept: 'Consumo Agua (Junio)', amount: 34.50, isPaid: true, isLocked: true, category: 'suministro', originMonthName: 'Junio 2026' },
      { id: 'ext-2', concept: 'Electricidad (Luz)', amount: 48.20, isPaid: true, isLocked: true, category: 'suministro', originMonthName: 'Julio 2026' }
    ],
    totalAmount: 832.70,
    paidAmount: 832.70,
    pendingAmount: 0,
    previousPendingAmount: 0,
    status: 'paid',
    lastPaidDate: '2026-07-03',
    notes: 'Pagado íntegramente por Bizum.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bill-2026-07-002',
    userId: 'demo-user',
    tenantId: 'tenant-002',
    tenantName: 'Elena Rodríguez Sánchez',
    year: 2026,
    month: 7,
    rentAmount: 820,
    extraConcepts: [
      { id: 'ext-3', concept: 'Lectura Agua Trimestral', amount: 55.00, isPaid: false, category: 'suministro', originMonthName: 'Julio 2026' },
      { id: 'ext-4', concept: 'Reparación cerradura portal (parte)', amount: 25.00, isPaid: false, category: 'reparacion', originMonthName: 'Julio 2026' }
    ],
    totalAmount: 900.00,
    paidAmount: 820.00,
    pendingAmount: 80.00,
    previousPendingAmount: 80.50,
    status: 'partial',
    lastPaidDate: '2026-07-05',
    notes: 'Julio: Renta de 820€ abonada.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper functions for LocalStorage
function getLocalData<T>(key: string, defaultData: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

function setLocalData<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

// API Methods
export const rentService = {
  // TENANTS
  async getTenants(): Promise<Tenant[]> {
    if (auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

        const q = query(
          collection(db, 'tenants'),
          where('userId', '==', uid)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Tenant));

        if (userDocSnap.exists()) {
          // User is already initialized in Firestore. Respect exact database state (even if empty).
          setLocalData(LOCAL_STORAGE_TENANTS_KEY, list);
          return list;
        } else {
          // First time this user logs in: create user doc and seed sample data once
          await setDoc(userDocRef, { initialized: true, createdAt: new Date().toISOString() });

          const seededTenants: Tenant[] = [];
          for (const sample of initialSampleTenants) {
            const userTenantId = `${uid}_${sample.id}`;
            const userTenant: Tenant = {
              ...sample,
              id: userTenantId,
              userId: uid,
              updatedAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'tenants', userTenantId), userTenant);
              seededTenants.push(userTenant);
            } catch (e) {
              console.warn('Error seeding sample tenant into Firestore:', e);
            }
          }

          // Also seed sample bills
          for (const sampleBill of initialSampleBills) {
            let targetTenantId = sampleBill.tenantId;
            if (sampleBill.tenantId === '67m7v846p' || sampleBill.tenantId === 'tenant-001' || sampleBill.tenantId === 'tenant-002') {
              targetTenantId = `${uid}_${sampleBill.tenantId}`;
            }
            const userBill: MonthlyBill = {
              ...sampleBill,
              id: `${uid}_${sampleBill.id}`,
              tenantId: targetTenantId,
              userId: uid,
              updatedAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'monthlyBills', userBill.id), userBill);
            } catch (e) {
              console.warn('Error seeding sample bill into Firestore:', e);
            }
          }

          setLocalData(LOCAL_STORAGE_TENANTS_KEY, seededTenants);
          return seededTenants;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'tenants');
      }
    }
    return getLocalData<Tenant[]>(LOCAL_STORAGE_TENANTS_KEY, initialSampleTenants);
  },

  async saveTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Tenant> {
    const userId = auth.currentUser ? auth.currentUser.uid : 'demo-user';
    const now = new Date().toISOString();
    const id = tenantData.id || `tenant-${Date.now()}`;

    const newTenant: Tenant = {
      ...tenantData,
      id,
      userId,
      createdAt: tenantData.id ? (tenantData as any).createdAt || now : now,
      updatedAt: now
    };

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'tenants', id), newTenant);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tenants/${id}`);
      }
    }

    // Always keep local state synchronized
    const localTenants = getLocalData<Tenant[]>(LOCAL_STORAGE_TENANTS_KEY, initialSampleTenants);
    const existingIndex = localTenants.findIndex(t => t.id === id);
    if (existingIndex >= 0) {
      localTenants[existingIndex] = newTenant;
    } else {
      localTenants.unshift(newTenant);
    }
    setLocalData(LOCAL_STORAGE_TENANTS_KEY, localTenants);

    return newTenant;
  },

  async updateTenantPaymentStatus(tenantId: string, status: RentStatus, paymentDate?: string): Promise<void> {
    const today = paymentDate || new Date().toISOString().split('T')[0];
    const localTenants = getLocalData<Tenant[]>(LOCAL_STORAGE_TENANTS_KEY, initialSampleTenants);
    const idx = localTenants.findIndex(t => t.id === tenantId);
    if (idx >= 0) {
      localTenants[idx].rentPaymentStatus = status;
      localTenants[idx].lastPaymentDate = today;
      localTenants[idx].updatedAt = new Date().toISOString();
      setLocalData(LOCAL_STORAGE_TENANTS_KEY, localTenants);
    }

    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'tenants', tenantId), {
          rentPaymentStatus: status,
          lastPaymentDate: today,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tenants/${tenantId}`);
      }
    }
  },

  async deleteTenant(tenantId: string): Promise<void> {
    // 1. Update local storage immediately
    const localTenants = getLocalData<Tenant[]>(LOCAL_STORAGE_TENANTS_KEY, initialSampleTenants);
    setLocalData(LOCAL_STORAGE_TENANTS_KEY, localTenants.filter(t => t.id !== tenantId));

    const localBills = getLocalData<MonthlyBill[]>(LOCAL_STORAGE_BILLS_KEY, initialSampleBills);
    setLocalData(LOCAL_STORAGE_BILLS_KEY, localBills.filter(b => b.tenantId !== tenantId));

    const localPayments = getLocalData<PaymentRecord[]>(LOCAL_STORAGE_PAYMENTS_KEY, []);
    setLocalData(LOCAL_STORAGE_PAYMENTS_KEY, localPayments.filter(p => p.tenantId !== tenantId));

    // 2. Remove from Firestore
    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      try {
        await deleteDoc(doc(db, 'tenants', tenantId));

        // Clean associated bills
        const billsQuery = query(
          collection(db, 'monthlyBills'),
          where('userId', '==', uid),
          where('tenantId', '==', tenantId)
        );
        const billsSnap = await getDocs(billsQuery);
        const billDeletes = billsSnap.docs.map(bDoc => deleteDoc(doc(db, 'monthlyBills', bDoc.id)));

        // Clean associated payment records
        const paymentsQuery = query(
          collection(db, 'paymentRecords'),
          where('userId', '==', uid),
          where('tenantId', '==', tenantId)
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        const paymentDeletes = paymentsSnap.docs.map(pDoc => deleteDoc(doc(db, 'paymentRecords', pDoc.id)));

        await Promise.all([...billDeletes, ...paymentDeletes]);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tenants/${tenantId}`);
      }
    }
  },

  // MONTHLY BILLS / GESTIÓN MENSUAL DE GASTOS
  async getMonthlyBills(): Promise<MonthlyBill[]> {
    if (auth.currentUser) {
      try {
        const q = query(
          collection(db, 'monthlyBills'),
          where('userId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MonthlyBill));
        setLocalData(LOCAL_STORAGE_BILLS_KEY, list);
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'monthlyBills');
      }
    }
    return getLocalData<MonthlyBill[]>(LOCAL_STORAGE_BILLS_KEY, initialSampleBills);
  },

  async saveMonthlyBill(bill: MonthlyBill): Promise<MonthlyBill> {
    const userId = auth.currentUser ? auth.currentUser.uid : 'demo-user';
    const updatedBill: MonthlyBill = {
      ...bill,
      userId,
      updatedAt: new Date().toISOString()
    };

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'monthlyBills', updatedBill.id), updatedBill);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `monthlyBills/${updatedBill.id}`);
      }
    }

    const localBills = getLocalData<MonthlyBill[]>(LOCAL_STORAGE_BILLS_KEY, initialSampleBills);
    const idx = localBills.findIndex(b => b.id === updatedBill.id);
    if (idx >= 0) {
      localBills[idx] = updatedBill;
    } else {
      localBills.unshift(updatedBill);
    }
    setLocalData(LOCAL_STORAGE_BILLS_KEY, localBills);

    return updatedBill;
  },

  // PAYMENT RECORDS
  async getPaymentRecords(): Promise<PaymentRecord[]> {
    if (auth.currentUser) {
      try {
        const q = query(
          collection(db, 'paymentRecords'),
          where('userId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PaymentRecord));
        setLocalData(LOCAL_STORAGE_PAYMENTS_KEY, list);
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'paymentRecords');
      }
    }
    return getLocalData<PaymentRecord[]>(LOCAL_STORAGE_PAYMENTS_KEY, []);
  },

  async registerPayment(record: Omit<PaymentRecord, 'id' | 'createdAt' | 'userId'>): Promise<PaymentRecord> {
    const userId = auth.currentUser ? auth.currentUser.uid : 'demo-user';
    const now = new Date().toISOString();
    const newRecord: PaymentRecord = {
      ...record,
      id: `pay-${Date.now()}`,
      userId,
      createdAt: now
    };

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'paymentRecords', newRecord.id), newRecord);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `paymentRecords/${newRecord.id}`);
      }
    }

    const localPayments = getLocalData<PaymentRecord[]>(LOCAL_STORAGE_PAYMENTS_KEY, []);
    localPayments.unshift(newRecord);
    setLocalData(LOCAL_STORAGE_PAYMENTS_KEY, localPayments);

    return newRecord;
  }
};
