import { jsPDF } from 'jspdf';
import { MonthlyBill, Tenant } from '../types';

export function generateReceiptPDF(bill: MonthlyBill, tenant: Tenant) {
  const doc = new jsPDF();
  const primaryColor = '#1e3a8a'; // Dark blue
  const secondaryColor = '#475569'; // Slate
  const accentColor = '#10b981'; // Emerald green

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthLabel = monthNames[bill.month - 1] || `Mes ${bill.month}`;

  // Header background banner
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 38, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('RECIBO DE ALQUILER Y GASTOS', 14, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº Recibo: REC-${bill.year}-${bill.month < 10 ? '0' + bill.month : bill.month}-${tenant.id.slice(0, 5)}`, 14, 30);
  doc.text(`Fecha Emisión: ${new Date().toLocaleDateString('es-ES')}`, 130, 30);

  // Tenant Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 46, 182, 42, 3, 3, 'FD');

  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL INQUILINO Y VIVIENDA', 20, 54);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Inquilino: ${tenant.name}`, 20, 62);
  doc.text(`DNI / NIE: ${tenant.dni || 'No especificado'}`, 20, 69);
  doc.text(`Teléfono: ${tenant.phone || 'N/A'}`, 20, 76);
  doc.text(`Correo: ${tenant.email || 'N/A'}`, 20, 83);

  doc.text(`Dirección Vivienda: ${tenant.address}`, 110, 62);
  doc.text(`Periodo Correspondiente: ${monthLabel} ${bill.year}`, 110, 69);
  doc.text(`Estado del Recibo: ${bill.status === 'paid' ? 'PAGADO' : bill.status === 'partial' ? 'PAGO PARCIAL' : 'PENDIENTE'}`, 110, 76);

  // Table Headers
  let y = 98;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 10, 'F');
  
  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CONCEPTO / DESCRIPCIÓN', 20, y + 7);
  doc.text('IMPORTE (€)', 165, y + 7, { align: 'right' });

  y += 12;

  // Items
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');

  // Rent line
  doc.text(`Renta Mensual Alquiler (${monthLabel} ${bill.year})`, 20, y);
  doc.text(`${bill.rentAmount.toFixed(2)} €`, 165, y, { align: 'right' });
  doc.setDrawColor(241, 245, 249);
  doc.line(14, y + 3, 196, y + 3);
  y += 9;

  // Previous pending
  if (bill.previousPendingAmount > 0) {
    doc.setTextColor(185, 28, 28); // Red
    doc.text(`Atrasos / Pendiente de meses anteriores`, 20, y);
    doc.text(`${bill.previousPendingAmount.toFixed(2)} €`, 165, y, { align: 'right' });
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 3, 196, y + 3);
    doc.setTextColor(30, 41, 59);
    y += 9;
  }

  // Extra concepts
  if (bill.extraConcepts && bill.extraConcepts.length > 0) {
    bill.extraConcepts.forEach((extra) => {
      const lockLabel = extra.isPaid ? ' [COBRADO]' : ' [PENDIENTE]';
      const datesLabel = extra.periodStartDate && extra.periodEndDate ? ` (${extra.periodStartDate} al ${extra.periodEndDate})` : '';
      const label = extra.originMonthName ? `${extra.concept}${datesLabel} (${extra.originMonthName})${lockLabel}` : `${extra.concept}${datesLabel}${lockLabel}`;
      doc.text(`Gasto / Suministro: ${label}`, 20, y);
      doc.text(`${extra.amount.toFixed(2)} €`, 165, y, { align: 'right' });
      doc.line(14, y + 3, 196, y + 3);
      y += 9;
    });
  }

  y += 5;

  // Totals Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, y, 86, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('TOTAL A PAGAR:', 115, y + 10);
  doc.text(`${bill.totalAmount.toFixed(2)} €`, 190, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129); // Green
  doc.text('Importe Abonado:', 115, y + 19);
  doc.text(`${bill.paidAmount.toFixed(2)} €`, 190, y + 19, { align: 'right' });

  doc.setTextColor(225, 29, 72); // Rose/Red
  doc.setFont('helvetica', 'bold');
  doc.text('Pendiente Restante:', 115, y + 28);
  doc.text(`${bill.pendingAmount.toFixed(2)} €`, 190, y + 28, { align: 'right' });

  y += 48;

  // Footer / Notes
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Este documento sirve como comprobante oficial de liquidación de alquiler y gastos para la vivienda indicada.', 14, y);
  if (bill.lastPaidDate) {
    doc.text(`Última actualización de pago registrada el: ${new Date(bill.lastPaidDate).toLocaleDateString('es-ES')}`, 14, y + 6);
  }

  // Save the PDF
  const filename = `Recibo_Alquiler_${tenant.name.replace(/\s+/g, '_')}_${bill.year}_${bill.month}.pdf`;
  doc.save(filename);
}

export function generateWhatsAppLink(bill: MonthlyBill, tenant: Tenant): string {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthLabel = monthNames[bill.month - 1] || `Mes ${bill.month}`;

  let extraText = '';
  if (bill.extraConcepts && bill.extraConcepts.length > 0) {
    extraText = '\n*Gastos extras / Suministros:*\n' + 
      bill.extraConcepts.map(c => {
        const origin = c.originMonthName ? ` (${c.originMonthName})` : '';
        const status = c.isPaid ? ' ✅' : ' ⏳';
        return `• ${c.concept}${origin}: ${c.amount.toFixed(2)}€${status}`;
      }).join('\n');
  }

  let arrearsText = '';
  if (bill.previousPendingAmount > 0) {
    arrearsText = `\n• Pendiente meses anteriores: ${bill.previousPendingAmount.toFixed(2)}€`;
  }

  const message = `Hola ${tenant.name} 👋, te adjunto el resumen del recibo de alquiler correspondiente a *${monthLabel} ${bill.year}* para la vivienda *${tenant.address}*:

*Desglose:*
• Renta alquiler: ${bill.rentAmount.toFixed(2)}€${arrearsText}${extraText}

*TOTAL MES:* *${bill.totalAmount.toFixed(2)}€*
• Pagado hasta la fecha: ${bill.paidAmount.toFixed(2)}€
• *Pendiente actual:* *${bill.pendingAmount.toFixed(2)}€*

${bill.pendingAmount <= 0 ? '✅ El mes figura completamente pagado. ¡Muchas gracias!' : '📌 Por favor, avísanos en cuanto realices la transferencia o pago restante.'}

Un saludo.`;

  const cleanPhone = (tenant.phone || '').replace(/\D/g, '');
  // Add Spain prefix +34 if missing country code and length is 9
  const formattedPhone = cleanPhone.length === 9 ? `34${cleanPhone}` : cleanPhone;

  const encodedMsg = encodeURIComponent(message);
  return formattedPhone 
    ? `https://wa.me/${formattedPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;
}
