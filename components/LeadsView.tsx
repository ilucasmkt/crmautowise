import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MessageSquare, 
  Mail, 
  Flame, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  Car,
  Filter,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Lead, LeadSource, LeadStage, LeadTemperature, Vehicle, TeamMember } from '../types';
import { formatCurrency } from '../lib/format';

interface LeadsViewProps {
  leads: Lead[];
  vehicles: Vehicle[];
  team: TeamMember[];
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'lastContactAt'>) => void;
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  vehicles,
  team,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('todos');
  const [tempFilter, setTempFilter] = useState<string>('todos');
  const [stageFilter, setStageFilter] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interestedVehicle, setInterestedVehicle] = useState('');
  const [vehiclePrice, setVehiclePrice] = useState(130000);
  const [source, setSource] = useState<LeadSource>('Meta Ads');
  const [stage, setStage] = useState<LeadStage>('novo');
  const [temperature, setTemperature] = useState<LeadTemperature>('quente');
  const [assignedTo, setAssignedTo] = useState('Carlos Eduardo');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingLead(null);
    setName('');
    setPhone('(11) 9');
    setEmail('');
    setInterestedVehicle(vehicles[0] ? `${vehicles[0].brand} ${vehicles[0].model}` : 'Veículo em Estoque');
    setVehiclePrice(vehicles[0]?.price || 120000);
    setSource('Meta Ads');
    setStage('novo');
    setTemperature('quente');
    setAssignedTo(team[0]?.name || 'Carlos Eduardo');
    setNotes('Lead vindo de anúncio no Instagram. Interessado em simulação de troca com troco.');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setName(lead.name);
    setPhone(lead.phone);
    setEmail(lead.email);
    setInterestedVehicle(lead.interestedVehicle);
    setVehiclePrice(lead.vehiclePrice || lead.value || 0);
    setSource(lead.source);
    setStage(lead.stage);
    setTemperature(lead.temperature);
    setAssignedTo(lead.assignedTo);
    setNotes(lead.notes);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const leadPayload = {
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
    };

    if (editingLead) {
      onUpdateLead({
        ...leadPayload,
        id: editingLead.id,
        createdAt: editingLead.createdAt,
        lastContactAt: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      onAddLead(leadPayload);
    }

    setIsModalOpen(false);
  };

  // Filter leads
  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      l.interestedVehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === 'todos' || l.source === sourceFilter;
    const matchesTemp = tempFilter === 'todos' || l.temperature === tempFilter;
    const matchesStage = stageFilter === 'todos' || l.stage === stageFilter;

    return matchesSearch && matchesSource && matchesTemp && matchesStage;
  });

  const stageLabels: { [key in LeadStage]: { label: string; color: string } } = {
    novo: { label: 'Novo Lead', color: 'bg-blue-100 text-blue-800' },
    contato: { label: 'Em Contato', color: 'bg-indigo-100 text-indigo-800' },
    sem_resposta: { label: 'Não Atendeu / Sem Resposta', color: 'bg-rose-100 text-rose-800' },
    agendamento: { label: 'Test Drive Agendado', color: 'bg-purple-100 text-purple-800' },
    proposta: { label: 'Proposta Enviada', color: 'bg-amber-100 text-amber-800' },
    negociacao: { label: 'Em Negociação', color: 'bg-orange-100 text-orange-800' },
    ganho: { label: 'Venda Concluída', color: 'bg-emerald-100 text-emerald-800' },
    perdido: { label: 'Perdido', color: 'bg-slate-200 text-slate-700' },
  };

  const sourceBadges: { [key in LeadSource]: string } = {
    'Meta Ads': 'bg-blue-50 text-blue-700 border-blue-200',
    'Google Ads': 'bg-amber-50 text-amber-700 border-amber-200',
    'WhatsApp': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Site Loja': 'bg-sky-50 text-sky-700 border-sky-200',
    'Webmotors': 'bg-red-50 text-red-700 border-red-200',
    'Indicação': 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            <span>Lista de LEADS Recentes</span>
          </h1>
          <p className="text-sm text-slate-500">
            Todos os clientes que entraram em contato via anúncios da Meta, WhatsApp e portal
          </p>
        </div>

        <button
          id="add-lead-btn"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-600/25 transition-all hover:translate-y-[-1px]"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Lead Manual</span>
        </button>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total de Leads</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{leads.length}</div>
          <span className="text-xs text-slate-500 font-medium">Cadastrados na base</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-amber-600">Leads Quentes</span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">
            {leads.filter(l => l.temperature === 'quente').length}
          </div>
          <span className="text-xs text-amber-700/80 font-medium">Alta intenção de compra</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-brand-600">Meta Ads</span>
          <div className="text-xl font-extrabold text-brand-600 mt-1">
            {leads.filter(l => l.source === 'Meta Ads').length}
          </div>
          <span className="text-xs text-brand-700/80 font-medium">Instagram & Facebook</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Vendas Fechadas</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {leads.filter(l => l.stage === 'ganho').length}
          </div>
          <span className="text-xs text-emerald-700/80 font-medium">Leads convertidos</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-leads-input"
            type="text"
            placeholder="Buscar por nome, telefone, veículo ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter */}
          <select
            id="filter-lead-source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="todos">Origem: Todas</option>
            <option value="Meta Ads">Meta Ads (Insta/Face)</option>
            <option value="WhatsApp">WhatsApp Direto</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Webmotors">Webmotors</option>
            <option value="Site Loja">Site Loja</option>
            <option value="Indicação">Indicação</option>
          </select>

          {/* Temperature Filter */}
          <select
            id="filter-lead-temp"
            value={tempFilter}
            onChange={(e) => setTempFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="todos">Temperatura: Todas</option>
            <option value="quente">🔥 Quente</option>
            <option value="morno">⚡ Morno</option>
            <option value="frio">❄️ Frio</option>
          </select>

          {/* Stage Filter */}
          <select
            id="filter-lead-stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="todos">Etapa: Todas</option>
            <option value="novo">Novo Lead</option>
            <option value="contato">Em Contato</option>
            <option value="sem_resposta">Não Atendeu / Sem Resposta</option>
            <option value="agendamento">Test Drive / Visita</option>
            <option value="proposta">Proposta Enviada</option>
            <option value="negociacao">Negociação</option>
            <option value="ganho">Venda Ganha</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum lead encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Ajuste os filtros de busca ou adicione um novo lead recebido manualmente.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-xs hover:bg-brand-700"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Lead
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const cleanPhone = lead.phone.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(lead.name)},%20sou%20da%20AutoPrime!%20Recebemos%20seu%20contato%20sobre%20o%20${encodeURIComponent(lead.interestedVehicle)}.%20Como%20posso%20te%20ajudar%20hoje?`;

            return (
              <div
                key={lead.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left side: Lead Identity & Car */}
                <div className="flex items-start sm:items-center gap-4 min-w-[280px]">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold text-base border border-slate-200 shrink-0">
                    {lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{lead.name}</h3>
                      
                      {lead.temperature === 'quente' && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                          <Flame className="w-3 h-3 text-amber-600" /> QUENTE
                        </span>
                      )}
                      {lead.temperature === 'morno' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          Morno
                        </span>
                      )}
                      {lead.temperature === 'frio' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          Frio
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Phone className="w-3 h-3 text-slate-400" /> {lead.phone}
                      </span>
                      {lead.email && (
                        <span className="hidden sm:flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" /> {lead.email}
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px]">
                        Entrou: {lead.createdAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Interested Car & Source */}
                <div className="flex-1 min-w-[200px] bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Veículo de Interesse</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Car className="w-3.5 h-3.5 text-brand-600" /> {lead.interestedVehicle}
                    </span>
                    {lead.vehiclePrice ? (
                      <span className="text-[11px] text-brand-700 font-semibold">
                        Valor est.: {formatCurrency(lead.vehiclePrice)}
                      </span>
                    ) : null}
                  </div>

                  <div className="sm:text-right">
                    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${sourceBadges[lead.source] || 'bg-slate-100 text-slate-700'}`}>
                      {lead.source}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Resp: <strong className="text-slate-700">{lead.assignedTo}</strong>
                    </p>
                  </div>
                </div>

                {/* Right side: Pipeline Stage & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
                  {/* Stage Dropdown Selector */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Etapa Funil</span>
                    <select
                      value={lead.stage}
                      onChange={(e) => onUpdateLead({ ...lead, stage: e.target.value as LeadStage })}
                      className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-brand-500"
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

                  {/* WhatsApp Quick Button */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
                    title="Chamar no WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(lead)}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
                      title="Editar Informações do Lead"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover o lead de ${lead.name}?`)) onDeleteLead(lead.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Excluir Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Lead */}
      {isModalOpen && (
        <div 
          id="lead-modal-backdrop"
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingLead ? 'Editar Lead' : 'Cadastrar Novo Lead'}
                </h2>
              </div>
              <button
                id="close-lead-modal"
                onClick={() => setIsModalOpen(false)}
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="save-lead-submit-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
                >
                  {editingLead ? 'Atualizar Lead' : 'Salvar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
