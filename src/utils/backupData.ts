import { Tenant, MonthlyBill, PaymentRecord, Property } from '../types';

/**
 * Exports all application data (tenants, bills, payments, properties) to a JSON file.
 */
export function exportAllData(
  tenants: Tenant[],
  bills: MonthlyBill[],
  payments: PaymentRecord[],
  properties: Property[]
) {
  const exportData = {
    tenants,
    bills,
    payments,
    properties,
    exportedAt: new Date().toISOString()
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_alquileres_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
