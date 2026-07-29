import { Tenant, MonthlyBill, PaymentRecord } from '../types';

/**
 * Downloads full tenant data, bills and payment history as a JSON file.
 */
export function downloadTenantJSON(
  tenant: Tenant,
  bills: MonthlyBill[] = [],
  payments: PaymentRecord[] = []
) {
  const tenantBills = bills.filter((b) => b.tenantId === tenant.id);
  const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);

  const exportData = {
    expedienteInquilino: {
      id: tenant.id,
      nombre: tenant.name,
      dni: tenant.dni,
      direccion: tenant.address,
      telefono: tenant.phone,
      email: tenant.email,
      rentaMensualBase: tenant.monthlyRentAmount,
      estadoCobro: tenant.rentPaymentStatus,
      inicioContrato: tenant.leaseStartDate,
      finContrato: tenant.leaseEndDate || 'Indefinido',
      estadoInquilino: tenant.status === 'active' ? 'Activo' : 'Finalizado/Histórico',
      porcentajeLuzImputable: `${tenant.electricityPercentage ?? 50}%`,
      porcentajeAguaImputable: `${tenant.waterPercentage ?? 50}%`,
      fianzaGarantia: {
        tieneFianza: tenant.hasDeposit ? 'Sí' : 'No',
        importeFianza: tenant.depositAmount ?? 0,
        fechaFianza: tenant.depositDate || 'N/A',
        notasFianza: tenant.depositNotes || ''
      },
      contactoEmergencia: tenant.emergencyContact || {},
      notas: tenant.notes || '',
      documentosAdjuntos: tenant.documents || [],
      fechaExportacion: new Date().toLocaleDateString('es-ES')
    },
    historialFacturasMesAMes: tenantBills.map((b) => ({
      año: b.year,
      mes: b.month,
      rentaBase: b.rentAmount,
      conceptosExtras: b.extraConcepts.map((e) => ({
        concepto: e.concept,
        importeCobrado: e.amount,
        facturaOriginalTotal: e.totalInvoiceAmount ?? e.amount,
        porcentajeAplicado: e.percentageShare ? `${e.percentageShare}%` : '100%',
        categoria: e.category || 'otro',
        pagado: e.isPaid ? 'Sí' : 'No'
      })),
      totalFacturado: b.totalAmount,
      totalPagado: b.paidAmount,
      pendiente: b.pendingAmount,
      estadoMes: b.status,
      fechaUltimoPago: b.lastPaidDate || 'Sin registro',
      notasMes: b.notes || ''
    })),
    historialPagosRecibidos: tenantPayments.map((p) => ({
      idPago: p.id,
      fecha: p.paymentDate,
      concepto: p.concept,
      importe: p.amount,
      metodo: p.method,
      notes: p.notes || ''
    }))
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = tenant.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `expediente_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads full tenant billing history as an Excel-compatible CSV.
 */
export function downloadTenantCSV(
  tenant: Tenant,
  bills: MonthlyBill[] = [],
  payments: PaymentRecord[] = []
) {
  const tenantBills = bills.filter((b) => b.tenantId === tenant.id);

  const monthNames = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // CSV Headers
  const headers = [
    'Año',
    'Mes',
    'Inquilino',
    'DNI',
    'Renta Base (€)',
    'Luz Inquilino (€)',
    'Agua Inquilino (€)',
    'Otros Extras (€)',
    'Total Mes (€)',
    'Pagado (€)',
    'Pendiente (€)',
    'Estado',
    'Fecha Pago',
    'Notas'
  ];

  const rows = tenantBills.map((b) => {
    const luzExtra = b.extraConcepts
      .filter((e) => e.concept.toLowerCase().includes('luz') || e.concept.toLowerCase().includes('elec') || e.category === 'suministro' && e.concept.toLowerCase().includes('luz'))
      .reduce((sum, e) => sum + e.amount, 0);

    const aguaExtra = b.extraConcepts
      .filter((e) => e.concept.toLowerCase().includes('agua'))
      .reduce((sum, e) => sum + e.amount, 0);

    const otrosExtras = b.extraConcepts
      .filter((e) => !e.concept.toLowerCase().includes('luz') && !e.concept.toLowerCase().includes('agua'))
      .reduce((sum, e) => sum + e.amount, 0);

    return [
      b.year,
      `"${monthNames[b.month] || b.month}"`,
      `"${tenant.name.replace(/"/g, '""')}"`,
      `"${tenant.dni}"`,
      b.rentAmount.toFixed(2),
      luzExtra.toFixed(2),
      aguaExtra.toFixed(2),
      otrosExtras.toFixed(2),
      b.totalAmount.toFixed(2),
      b.paidAmount.toFixed(2),
      b.pendingAmount.toFixed(2),
      `"${b.status === 'paid' ? 'Pagado' : b.status === 'partial' ? 'Parcial' : 'Pendiente'}"`,
      `"${b.lastPaidDate || ''}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = tenant.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `historial_${safeName}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a clean printable window / PDF export report for the tenant.
 */
export function printTenantReport(
  tenant: Tenant,
  bills: MonthlyBill[] = [],
  payments: PaymentRecord[] = []
) {
  const tenantBills = bills
    .filter((b) => b.tenantId === tenant.id)
    .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));

  const tenantPayments = payments
    .filter((p) => p.tenantId === tenant.id)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  const monthNames = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const totalCharged = tenantBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalPaid = tenantBills.reduce((acc, b) => acc + b.paidAmount, 0);
  const totalPending = tenantBills.reduce((acc, b) => acc + b.pendingAmount, 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para generar el informe en PDF o impresión.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe Completo - ${tenant.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 28px; font-size: 13px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
        .title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0; }
        .subtitle { color: #64748b; font-size: 12px; margin-top: 4px; }
        .badge { background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; font-weight: bold; border: 1px solid #bfdbfe; display: inline-block; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
        .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 11px; font-weight: 700; color: #334155; border-bottom: 1px solid #cbd5e1; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #fafafa; }
        
        .kpi-container { display: flex; gap: 12px; margin-bottom: 20px; }
        .kpi { flex: 1; background: #fff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; }
        .kpi-num { font-size: 18px; font-weight: 800; }
        .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        
        .paid { color: #15803d; font-weight: bold; }
        .pending { color: #b91c1c; font-weight: bold; }
        .partial { color: #b45309; font-weight: bold; }
        
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div className="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">🖨️ Imprimir / Guardar como PDF</button>
      </div>

      <div class="header">
        <div>
          <h1 class="title">Expediente Completo del Inquilino</h1>
          <p class="subtitle">Informe detallado de contrato, suministros e historial de pagos</p>
        </div>
        <div>
          <span class="badge">Fecha: ${new Date().toLocaleDateString('es-ES')}</span>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Datos Personales y Ubicación</div>
          <p><strong>Nombre:</strong> ${tenant.name}</p>
          <p><strong>DNI / NIE:</strong> ${tenant.dni || 'N/A'}</p>
          <p><strong>Dirección Inmueble:</strong> ${tenant.address}</p>
          <p><strong>Teléfono:</strong> ${tenant.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${tenant.email || 'N/A'}</p>
        </div>

        <div class="card">
          <div class="card-title">Condiciones de Contrato y Suministros</div>
          <p><strong>Renta Mensual Base:</strong> ${tenant.monthlyRentAmount} €</p>
          <p><strong>Inicio Contrato:</strong> ${tenant.leaseStartDate}</p>
          <p><strong>% Luz Imputable:</strong> ${tenant.electricityPercentage ?? 50}%</p>
          <p><strong>% Agua Imputable:</strong> ${tenant.waterPercentage ?? 50}%</p>
          <p><strong>Fianza Depositada:</strong> ${tenant.hasDeposit ? `${tenant.depositAmount || tenant.monthlyRentAmount} €` : 'Sin fianza registrada'}</p>
          ${tenant.emergencyContact?.name ? `<p><strong>Contacto Emergencia:</strong> ${tenant.emergencyContact.name} (${tenant.emergencyContact.phone}) - ${tenant.emergencyContact.relationship}</p>` : ''}
        </div>
      </div>

      <div class="kpi-container">
        <div class="kpi">
          <div class="kpi-num" style="color: #2563eb;">${totalCharged.toFixed(2)} €</div>
          <div class="kpi-label">Total Facturado Histórico</div>
        </div>
        <div class="kpi">
          <div class="kpi-num" style="color: #16a34a;">${totalPaid.toFixed(2)} €</div>
          <div class="kpi-label">Total Cobrado</div>
        </div>
        <div class="kpi">
          <div class="kpi-num" style="color: #dc2626;">${totalPending.toFixed(2)} €</div>
          <div class="kpi-label">Pendiente Acumulado</div>
        </div>
      </div>

      <h3 style="margin-top: 24px; font-size: 14px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Historial de Recibos y Mensualidades (${tenantBills.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Año/Mes</th>
            <th>Renta Base</th>
            <th>Conceptos Extras (Luz/Agua/Otros)</th>
            <th>Total Mes</th>
            <th>Cobrado</th>
            <th>Pendiente</th>
            <th>Estado</th>
            <th>Último Pago</th>
          </tr>
        </thead>
        <tbody>
          ${tenantBills.map((b) => {
            const extrasFormatted = b.extraConcepts.map((e) => {
              const info = e.totalInvoiceAmount ? ` (${e.percentageShare}% de ${e.totalInvoiceAmount}€)` : '';
              return `${e.concept}: ${e.amount.toFixed(2)}€${info}`;
            }).join(', ');

            const statusClass = b.status === 'paid' ? 'paid' : b.status === 'partial' ? 'partial' : 'pending';
            const statusLabel = b.status === 'paid' ? 'PAGADO' : b.status === 'partial' ? 'PARCIAL' : 'PENDIENTE';

            return `
              <tr>
                <td><strong>${monthNames[b.month]} ${b.year}</strong></td>
                <td>${b.rentAmount.toFixed(2)} €</td>
                <td>${extrasFormatted || '<span style="color:#94a3b8;">Sin extras</span>'}</td>
                <td><strong>${b.totalAmount.toFixed(2)} €</strong></td>
                <td style="color:#16a34a;">${b.paidAmount.toFixed(2)} €</td>
                <td style="color:${b.pendingAmount > 0 ? '#dc2626' : '#64748b'};">${b.pendingAmount.toFixed(2)} €</td>
                <td class="${statusClass}">${statusLabel}</td>
                <td>${b.lastPaidDate || '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      ${tenantPayments.length > 0 ? `
        <h3 style="margin-top: 28px; font-size: 14px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Registro de Ingresos / Abonos (${tenantPayments.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Importe Ingresado</th>
              <th>Método de Pago</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            ${tenantPayments.map((p) => `
              <tr>
                <td>${p.paymentDate}</td>
                <td>${p.concept}</td>
                <td><strong style="color:#16a34a;">+${p.amount.toFixed(2)} €</strong></td>
                <td>${p.method.toUpperCase()}</td>
                <td>${p.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div style="margin-top: 40px; border-top: 1px solid #cbd5e1; pt-12px; font-size: 10px; color: #94a3b8; text-align: center;">
        Documento generado automáticamente por el Gestor de Alquileres. Válido como justificante interno.
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
