import { Tenant, MonthlyBill, PaymentRecord, Property } from '../types';
import { rentService } from '../services/rentService';

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

export interface RestoreResult {
  tenantsCount: number;
  billsCount: number;
  paymentsCount: number;
  propertiesCount: number;
  tenantNames: string[];
}

/**
 * Restores tenants, bills, payments, and properties from any JSON backup file
 * (both full app backups and individual tenant dossier exports).
 */
export async function restoreJSONData(data: any): Promise<RestoreResult> {
  const tenantsToSave: Tenant[] = [];
  const billsToSave: MonthlyBill[] = [];
  const paymentsToSave: PaymentRecord[] = [];
  const propertiesToSave: Property[] = [];

  // Helper to parse percentages ("50%" or 50 -> 50)
  const parsePct = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val.replace('%', '').trim());
      return isNaN(num) ? 50 : num;
    }
    return 50;
  };

  // Case 1: Raw tenant embedded in single-tenant JSON export (rawTenant / rawBills / rawPayments)
  if (data.rawTenant || data.tenant) {
    const t = data.rawTenant || data.tenant;
    if (t && t.id && t.name) {
      tenantsToSave.push(t);
    }
    if (Array.isArray(data.rawBills || data.bills)) {
      billsToSave.push(...(data.rawBills || data.bills));
    }
    if (Array.isArray(data.rawPayments || data.payments)) {
      paymentsToSave.push(...(data.rawPayments || data.payments));
    }
  }

  // Case 2: Human-readable Expediente JSON (expedienteInquilino)
  if (data.expedienteInquilino) {
    const exp = data.expedienteInquilino;
    const tenantId = exp.id || `tenant-${Date.now()}`;

    const status: 'active' | 'past' =
      exp.estadoInquilino === 'Finalizado/Histórico' || exp.estadoInquilino === 'past' ? 'past' : 'active';

    const reconstructedTenant: Tenant = {
      id: tenantId,
      userId: exp.userId || 'demo-user',
      name: exp.nombre || exp.name || 'Inquilino Restaurado',
      dni: exp.dni || '',
      address: exp.direccion || exp.address || '',
      phone: exp.telefono || exp.phone || '',
      email: exp.email || '',
      monthlyRentAmount: Number(exp.rentaMensualBase ?? exp.monthlyRentAmount ?? 0),
      rentPaymentStatus: exp.estadoCobro || exp.rentPaymentStatus || 'pendiente',
      leaseStartDate: exp.inicioContrato || exp.leaseStartDate || new Date().toISOString().split('T')[0],
      leaseEndDate: exp.finContrato === 'Indefinido' ? undefined : (exp.finContrato || exp.leaseEndDate),
      status,
      electricityPercentage: parsePct(exp.porcentajeLuzImputable),
      waterPercentage: parsePct(exp.porcentajeAguaImputable),
      hasDeposit: exp.fianzaGarantia?.tieneFianza === 'Sí' || exp.hasDeposit === true,
      depositAmount: Number(exp.fianzaGarantia?.importeFianza ?? exp.depositAmount ?? 0),
      depositDate: exp.fianzaGarantia?.fechaFianza === 'N/A' ? undefined : exp.fianzaGarantia?.fechaFianza || exp.depositDate,
      depositNotes: exp.fianzaGarantia?.notasFianza || exp.depositNotes || '',
      emergencyContact: exp.contactoEmergencia || exp.emergencyContact || {},
      notes: exp.notas || exp.notes || '',
      documents: exp.documentosAdjuntos || exp.documents || [],
      createdAt: exp.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!tenantsToSave.some((t) => t.id === reconstructedTenant.id)) {
      tenantsToSave.push(reconstructedTenant);
    }

    // Reconstruct bills if any
    if (Array.isArray(data.historialFacturasMesAMes)) {
      data.historialFacturasMesAMes.forEach((b: any, idx: number) => {
        const billId = b.id || `bill-${tenantId}-${b.año || b.year}-${b.mes || b.month}-${idx}`;
        const extraConcepts = Array.isArray(b.conceptosExtras)
          ? b.conceptosExtras.map((e: any, eIdx: number) => ({
              id: e.id || `extra-${Date.now()}-${eIdx}`,
              concept: e.concepto || e.concept || 'Suministro',
              amount: typeof e.importeCobrado === 'number' ? e.importeCobrado : parseFloat(e.amount || '0'),
              totalInvoiceAmount: typeof e.facturaOriginalTotal === 'number' ? e.facturaOriginalTotal : undefined,
              percentageShare: parsePct(e.porcentajeAplicado),
              category: e.categoria || 'suministro',
              isPaid: e.pagado === 'Sí' || e.isPaid === true
            }))
          : [];

        const billObj: MonthlyBill = {
          id: billId,
          userId: b.userId || 'demo-user',
          tenantId: tenantId,
          tenantName: b.tenantName || reconstructedTenant.name,
          year: Number(b.año || b.year || new Date().getFullYear()),
          month: Number(b.mes || b.month || new Date().getMonth() + 1),
          rentAmount: Number(b.rentaBase ?? b.rentAmount ?? reconstructedTenant.monthlyRentAmount),
          extraConcepts,
          totalAmount: Number(b.totalFacturado ?? b.totalAmount ?? 0),
          paidAmount: Number(b.totalPagado ?? b.paidAmount ?? 0),
          pendingAmount: Number(b.pendiente ?? b.pendingAmount ?? 0),
          previousPendingAmount: Number(b.previousPendingAmount || 0),
          status: b.estadoMes || b.status || 'pending',
          lastPaidDate: b.fechaUltimoPago === 'Sin registro' ? undefined : b.fechaUltimoPago || b.lastPaidDate,
          notes: b.notasMes || b.notes || '',
          createdAt: b.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (!billsToSave.some((existing) => existing.id === billObj.id)) {
          billsToSave.push(billObj);
        }
      });
    }

    // Reconstruct payments if any
    if (Array.isArray(data.historialPagosRecibidos)) {
      data.historialPagosRecibidos.forEach((p: any, pIdx: number) => {
        const payId = p.idPago || p.id || `pay-${tenantId}-${pIdx}`;
        const payObj: PaymentRecord = {
          id: payId,
          userId: p.userId || 'demo-user',
          tenantId: tenantId,
          monthlyBillId: p.monthlyBillId || p.billId || '',
          paymentDate: p.fecha || p.paymentDate || new Date().toISOString().split('T')[0],
          amount: Number(p.importe ?? p.amount ?? 0),
          concept: p.concepto || p.concept || 'Cobro de Alquiler',
          method: p.metodo || p.method || 'transferencia',
          notes: p.notes || '',
          createdAt: p.createdAt || new Date().toISOString()
        };
        if (!paymentsToSave.some((existing) => existing.id === payObj.id)) {
          paymentsToSave.push(payObj);
        }
      });
    }
  }

  // Case 3: Standard backup arrays ({ tenants: [...], bills: [...], payments: [...], properties: [...] })
  if (Array.isArray(data.tenants)) {
    data.tenants.forEach((t: Tenant) => {
      if (t && t.id && !tenantsToSave.some((existing) => existing.id === t.id)) {
        tenantsToSave.push(t);
      }
    });
  }
  if (Array.isArray(data.bills)) {
    data.bills.forEach((b: MonthlyBill) => {
      if (b && b.id && !billsToSave.some((existing) => existing.id === b.id)) {
        billsToSave.push(b);
      }
    });
  }
  if (Array.isArray(data.payments)) {
    data.payments.forEach((p: PaymentRecord) => {
      if (p && p.id && !paymentsToSave.some((existing) => existing.id === p.id)) {
        paymentsToSave.push(p);
      }
    });
  }
  if (Array.isArray(data.properties)) {
    data.properties.forEach((prop: Property) => {
      if (prop && prop.id && !propertiesToSave.some((existing) => existing.id === prop.id)) {
        propertiesToSave.push(prop);
      }
    });
  }

  // Case 4: Single tenant object directly at root
  if (!data.expedienteInquilino && !data.tenants && data.name && data.address) {
    if (!tenantsToSave.some((t) => t.id === data.id)) {
      tenantsToSave.push(data as Tenant);
    }
  }

  // Save all entities through rentService
  for (const t of tenantsToSave) {
    await rentService.saveTenant(t);
  }
  for (const b of billsToSave) {
    await rentService.saveMonthlyBill(b);
  }
  for (const prop of propertiesToSave) {
    await rentService.saveProperty(prop);
  }

  return {
    tenantsCount: tenantsToSave.length,
    billsCount: billsToSave.length,
    paymentsCount: paymentsToSave.length,
    propertiesCount: propertiesToSave.length,
    tenantNames: tenantsToSave.map((t) => t.name)
  };
}

