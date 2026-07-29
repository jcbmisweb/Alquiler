import React, { useState } from 'react';
import { X, Calculator, ShieldCheck, Percent, HelpCircle, ArrowRight } from 'lucide-react';

interface ExtraFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtraFeaturesModal: React.FC<ExtraFeaturesModalProps> = ({ isOpen, onClose }) => {
  const [totalFactura, setTotalFactura] = useState('');
  const [diasTotal, setDiasTotal] = useState('30');
  const [diasOcupados, setDiasOcupados] = useState('15');

  if (!isOpen) return null;

  const total = parseFloat(totalFactura) || 0;
  const diasTot = parseInt(diasTotal) || 30;
  const diasOcup = parseInt(diasOcupados) || 15;

  const prorrateo = diasTot > 0 ? (total / diasTot) * diasOcup : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-slate-900">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold">Herramientas & Calculadora de Prorrateos</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prorrateo de Factura por Días */}
        <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
            1. Prorrateo de Suministros por Días de Estancia
          </h4>
          <p className="text-xs text-slate-500">
            Útil si un inquilino entra o sale a mitad de mes para repartir el importe de luz o agua.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Total Factura (€)</label>
              <input
                type="number"
                placeholder="Ej: 60"
                value={totalFactura}
                onChange={(e) => setTotalFactura(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Días Mes</label>
              <input
                type="number"
                value={diasTotal}
                onChange={(e) => setDiasTotal(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Días Ocupados</label>
              <input
                type="number"
                value={diasOcupados}
                onChange={(e) => setDiasOcupados(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-100/60 rounded-lg flex items-center justify-between text-xs font-bold text-blue-900">
            <span>Importe Proporcional que le Corresponde:</span>
            <span className="text-base text-blue-700">{prorrateo.toFixed(2)} €</span>
          </div>
        </div>

        {/* Recordatorio Fianza e IPC */}
        <div className="p-4 bg-emerald-50 rounded-xl space-y-1.5 border border-emerald-100 text-xs">
          <p className="font-bold text-emerald-900 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Depósito de Fianza Legal
          </p>
          <p className="text-emerald-800">
            En alquileres de vivienda habitual en España se exige la fianza de 1 mes de renta en metálico y su depósito en el organismo oficial correspondiente.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
