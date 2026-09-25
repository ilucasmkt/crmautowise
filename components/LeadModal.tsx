import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { Lead, LeadSource, LeadStage, LeadTemperature, Vehicle, TeamMember } from '../types';

export type LeadPayload = Omit<Lead, 'id' | 'createdAt' | 'lastContactAt'>;

interface LeadModalProps {
  lead: Lead | null;
  vehicles: Vehicle[];
  team: TeamMember[];
  onSave: (payload: LeadPayload) => void;
  onClose: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ lead, vehicles, team, onSave, onClose }) => {
  const [name, setName] = useState(lead?.name ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '(11) 9');
  const [email, setEmail] = useState(lead?.email ?? '');
  const [interestedVehicle, setInterestedVehicle] = useState(
    lead?.interestedVehicle ?? (vehicles[0] ? `${vehicles[0].brand} ${vehicles[0].model}` : 'Veículo em Estoque')
  );
  const [vehiclePrice, setVehiclePrice] = useState(lead?.vehiclePrice ?? lead?.value ?? vehicles[0]?.price ?? 120000);
  const [source, setSource] = useState<LeadSource>(lead?.source ?? 'Meta Ads');
  const [stage, setStage] = useState<LeadStage>(lead?.stage ?? 'novo');
  const [temperature, setTemperature] = useState<LeadTemperature>(lead?.temperature ?? 'quente');
  const [assignedTo, setAssignedTo] = useState(lead?.assignedTo ?? team[0]?.name ?? 'Carlos Eduardo');
  const [notes, setNotes] = useState(
    lead?.notes ?? 'Lead vindo de anúncio no Instagram. Interessado em simulação de troca com troco.'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      name: name.trim() || 'Lead sem nome',
      phone: phone.trim() || '(11) 99999-9999',
      email: email.trim(),
      interestedVehicle: interestedVehicle.trim() || 'Veículo a consultar',
      vehiclePrice: Number(vehiclePrice) || 0,
      value: Number(vehiclePrice) || 0,
      source,
      stage,
      temperature,
      assignedTo: assignedTo.trim() || 'Plantão',
      notes: notes.trim(),
    });
  };

  return (
    <div
      id="lead-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {lead ? 'Editar Lead' : 'Cadastrar Novo Lead'}
            </h2>
          </div>
          <button
            id="close-lead-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Nome do Cliente *
            </label>
            <input
              id="lead-name-input"
              type="text"
              required
              placeholder="Nome completo do interessado"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Telefone / WhatsApp *
              </label>
              <input
                id="lead-phone-input"
                type="text"
                required
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                E-mail
              </label>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Veículo de Interesse *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Corolla Altis, Compass, Nivus..."
                value={interestedVehicle}
                onChange={(e) => setInterestedVehicle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                value={vehiclePrice}
                onChange={(e) => setVehiclePrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Canal Origem</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="Meta Ads">Meta Ads</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Webmotors">Webmotors</option>
                <option value="Site Loja">Site Loja</option>
                <option value="Indicação">Indicação</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Temperatura</label>
              <select
                value={temperature}
                onChange={(e) => setTemperature(e.target.value as LeadTemperature)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="quente">🔥 Quente</option>
                <option value="morno">⚡ Morno</option>
                <option value="frio">❄️ Frio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Etapa Inicial</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as LeadStage)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="novo">Novo Lead</option>
                <option value="contato">Em Contato</option>
                <option value="sem_resposta">Não Atendeu / Sem Resposta</option>
                <option value="agendamento">Test Drive</option>
                <option value="proposta">Proposta</option>
                <option value="negociacao">Negociação</option>
                <option value="ganho">Venda Ganha</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Atendente Responsável
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {team.map(t => (
                <option key={t.id} value={t.name}>{t.name} ({t.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Observações / Histórico de Negociação
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes sobre o interesse, veículo na troca, condição de pagamento..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="save-lead-submit-btn"
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
            >
              {lead ? 'Atualizar Lead' : 'Salvar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
