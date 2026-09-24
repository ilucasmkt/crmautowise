import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Car, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  Phone, 
  MessageSquare, 
  Flame, 
  PlusCircle, 
  Clock, 
  ChevronRight,
  Sparkles,
  ExternalLink,
  Filter,
  Calendar,
  CalendarDays,
  CalendarRange,
  RotateCcw,
  SlidersHorizontal,
  ArrowRight,
  Check
} from 'lucide-react';
import { Lead, Vehicle, TeamMember, NavSection, DashboardPeriod } from '../types';
import { 
  parseLeadDate, 
  calculatePeriodRange, 
  toDateInputValue, 
  getNow 
} from '../utils/dateUtils';
import { formatCurrency } from '../lib/format';

interface DashboardViewProps {
  leads: Lead[];
  vehicles: Vehicle[];
  team: TeamMember[];
  onNavigate: (section: NavSection) => void;
  onOpenNewLeadModal: () => void;
  onOpenNewCarModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads,
  vehicles,
  team,
  onNavigate,
  onOpenNewLeadModal,
  onOpenNewCarModal,
}) => {
  // Period filter state: 'dia' | 'semanal' | 'mensal' | 'anual' | 'personalizado'
  const [period, setPeriod] = useState<DashboardPeriod>('mensal');

  // Custom date range inputs (defaults to last 15 days up to today)
  const now = getNow();
  const defaultCustomStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
  const [customStartDate, setCustomStartDate] = useState<string>(toDateInputValue(defaultCustomStart));
  const [customEndDate, setCustomEndDate] = useState<string>(toDateInputValue(now));

  // Compute active period boundaries
  const periodRange = useMemo(() => {
    return calculatePeriodRange(period, customStartDate, customEndDate);
  }, [period, customStartDate, customEndDate]);

  // Filter leads by creation date within the chosen period
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const leadDate = parseLeadDate(lead);
      return leadDate.getTime() >= periodRange.start.getTime() && leadDate.getTime() <= periodRange.end.getTime();
    });
  }, [leads, periodRange]);

  // Calculated stats based on the selected period
  const totalLeads = filteredLeads.length;
  const hotLeads = filteredLeads.filter(l => l.temperature === 'quente').length;
  const activeStock = vehicles.filter(v => v.status === 'disponivel');
  const stockTotalValue = vehicles
    .filter(v => v.status !== 'vendido')
    .reduce((acc, curr) => acc + curr.price, 0);

  const wonLeadsInPeriod = filteredLeads.filter(l => l.stage === 'ganho');
  const wonVolume = wonLeadsInPeriod.reduce((acc, curr) => acc + (curr.value || curr.vehiclePrice || 0), 0);

  // Conversion rate in the period
  const conversionRate = totalLeads > 0 
    ? Math.round((wonLeadsInPeriod.length / totalLeads) * 100) 
    : 0;

  // Source distribution in the selected period
  const sourceCounts: { [key: string]: number } = {};
  filteredLeads.forEach(l => {
    sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
  });

  const channels = [
    { label: 'Meta Ads (Insta / Face)', key: 'Meta Ads', color: 'bg-brand-500' },
    { label: 'WhatsApp Direto', key: 'WhatsApp', color: 'bg-emerald-500' },
    { label: 'Google Ads', key: 'Google Ads', color: 'bg-amber-500' },
    { label: 'Webmotors / Portais', key: 'Webmotors', color: 'bg-purple-500' },
    { label: 'Site Loja', key: 'Site Loja', color: 'bg-blue-400' },
    { label: 'Indicação', key: 'Indicação', color: 'bg-indigo-400' },
  ];

  // Recent leads in this period (sorted newest first)
  const recentLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      return parseLeadDate(b).getTime() - parseLeadDate(a).getTime();
    }).slice(0, 6);
  }, [filteredLeads]);

  // Quick preset actions for custom date picker
  const setQuickRange = (daysAgo: number) => {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    setCustomStartDate(toDateInputValue(s));
    setCustomEndDate(toDateInputValue(now));
    setPeriod('personalizado');
  };

  const setPreviousMonth = () => {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    setCustomStartDate(toDateInputValue(s));
    setCustomEndDate(toDateInputValue(e));
    setPeriod('personalizado');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,rgba(12,135,235,0.25),transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Operação Comercial Ativa
              </span>
              <span className="text-xs text-slate-400">Dados analíticos e funil em tempo real</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Painel de Desempenho & Métricas
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Monitore a captação de leads das campanhas da Meta, giro do estoque de veículos e conversão de vendas por período selecionado.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="dashboard-new-lead-btn"
              onClick={onOpenNewLeadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition-all hover:translate-y-[-1px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Lead</span>
            </button>
            <button
              id="dashboard-hotsite-btn"
              onClick={() => onNavigate('hotsite')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-extrabold shadow-md transition-all hover:translate-y-[-1px]"
            >
              <Flame className="w-4 h-4" />
              <span>Hot Sites dos Carros</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Selector Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Label and Current Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900">Período de Análise</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  <Check className="w-3 h-3 text-brand-600" />
                  {periodRange.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {periodRange.formattedRange} • <strong className="text-slate-800">{totalLeads}</strong> leads registrados
              </p>
            </div>
          </div>

          {/* Period Selector Buttons: Dia > Semanal > Mensal > Anual > Personalizado */}
          <div className="bg-slate-100/90 p-1.5 rounded-xl flex items-center gap-1 flex-wrap sm:flex-nowrap border border-slate-200/70">
            <button
              id="period-btn-dia"
              type="button"
              onClick={() => setPeriod('dia')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'dia'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Dia
            </button>

            <button
              id="period-btn-semanal"
              type="button"
              onClick={() => setPeriod('semanal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'semanal'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Semanal
            </button>

            <button
              id="period-btn-mensal"
              type="button"
              onClick={() => setPeriod('mensal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'mensal'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Mensal
            </button>

            <button
              id="period-btn-anual"
              type="button"
              onClick={() => setPeriod('anual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'anual'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Anual
            </button>

            <button
              id="period-btn-personalizado"
              type="button"
              onClick={() => setPeriod('personalizado')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'personalizado'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Personalizado</span>
            </button>
          </div>
        </div>

        {/* Custom Range Picker Drawer (when 'personalizado' is active) */}
        {period === 'personalizado' && (
          <div className="mt-3 pt-3.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70 p-3 rounded-xl border border-slate-200/50">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                Intervalo de Datas:
              </span>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">De:</label>
                <input
                  id="custom-date-start"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Até:</label>
                <input
                  id="custom-date-end"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Quick Presets within Custom Mode */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => setQuickRange(15)}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                Últimos 15 dias
              </button>
              <button
                type="button"
                onClick={() => setQuickRange(30)}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                Últimos 30 dias
              </button>
              <button
                type="button"
                onClick={setPreviousMonth}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                Mês Anterior
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary KPI Grid (Reflecting filtered period) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Leads no Período */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Leads Captados</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 uppercase">
                {periodRange.badge}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalLeads}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> 
              {period === 'dia' ? 'Hoje em tempo real' : period === 'semanal' ? 'Esta semana' : 'No período'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <strong className="text-slate-700">{hotLeads}</strong> leads quentes
            </span>
            <button 
              onClick={() => onNavigate('leads')}
              className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-0.5"
            >
              Ver leads <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 2: Estoque & Giro */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Estoque de Carros</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{vehicles.length}</span>
            <span className="text-xs font-medium text-slate-500">
              ({activeStock.length} à venda)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Patrimônio: <strong className="text-slate-800">{formatCurrency(stockTotalValue)}</strong></span>
            <button 
              onClick={() => onNavigate('estoque')}
              className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-0.5"
            >
              Estoque <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 3: Vendas / Fechamentos no Período */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vendas Fechadas</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase">
                {periodRange.badge}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{wonLeadsInPeriod.length}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> 
              {wonVolume > 0 ? 'Faturamento ativo' : 'Aguardando fechamento'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Faturado: <strong className="text-emerald-700">{formatCurrency(wonVolume)}</strong></span>
            <button 
              onClick={() => onNavigate('crm')}
              className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-0.5"
            >
              Pipeline <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 4: Taxa de Conversão no Período */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversão</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 uppercase">
                {periodRange.badge}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {conversionRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({wonLeadsInPeriod.length} de {totalLeads} leads)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Período: <strong className="text-slate-800">{periodRange.label}</strong></span>
            <span className="text-emerald-600 font-semibold">{conversionRate >= 15 ? 'Alta' : 'Operando'}</span>
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Sections: Funnel & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leads received in the period */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Leads Recebidos no Período</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {totalLeads} leads
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mostrando oportunidades registradas durante o intervalo de {periodRange.label.toLowerCase()}
              </p>
            </div>
            <button
              id="dashboard-see-all-leads"
              onClick={() => onNavigate('leads')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentLeads.length === 0 ? (
            <div className="py-12 px-4 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <h3 className="text-sm font-bold text-slate-800">Nenhum lead registrado neste período</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Não foram encontrados contatos entre {periodRange.start.toLocaleDateString('pt-BR')} e {periodRange.end.toLocaleDateString('pt-BR')}.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPeriod('mensal')}
                  className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors"
                >
                  Ver Período Mensal
                </button>
                <button
                  onClick={() => setPeriod('anual')}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  Ver Período Anual
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLeads.map((lead) => {
                const cleanPhone = lead.phone.replace(/\D/g, '');
                const whatsappUrl = `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(lead.name)},%20sou%20da%20AutoPrime!%20Vi%20seu%20interesse%20no%20${encodeURIComponent(lead.interestedVehicle)}.%20Como%20posso%20te%20ajudar?`;

                return (
                  <div key={lead.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                        {lead.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{lead.name}</span>
                          {lead.temperature === 'quente' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Flame className="w-2.5 h-2.5" /> Quente
                            </span>
                          )}
                          {lead.stage === 'ganho' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Venda Ganha
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{lead.interestedVehicle}</span>
                          <span>•</span>
                          <span className="text-slate-400">{lead.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:self-center">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                        {lead.source}
                      </span>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                        title="Chamar no WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Lead Channels & Meta Ads Status in Period */}
        <div className="space-y-6">
          {/* Origin Distribution for Selected Period */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Origem dos Leads</h2>
                <p className="text-xs text-slate-400 font-medium">{periodRange.label}</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {totalLeads} no total
              </span>
            </div>

            <div className="space-y-3.5">
              {channels.map(item => {
                const count = sourceCounts[item.key] || 0;
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                      <span className="text-slate-600 font-bold">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Pixel Meta ativo no site</span>
              </div>
              <button 
                onClick={() => onNavigate('ajustes')}
                className="text-brand-600 hover:text-brand-700 font-bold"
              >
                Configurar
              </button>
            </div>
          </div>

          {/* Quick Team snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Plantão de Vendas</h2>
              <button 
                onClick={() => onNavigate('equipe')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Gerenciar
              </button>
            </div>
            <div className="space-y-2.5">
              {team.slice(0, 3).map(member => (
                <div key={member.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${member.avatarColor} text-white flex items-center justify-center font-bold text-[10px]`}>
                      {member.name[0]}
                    </div>
                    <span className="font-semibold text-slate-800">{member.name}</span>
                  </div>
                  <div className="text-slate-500">
                    <span className="font-bold text-slate-700">{member.salesCount}</span> vendas / <span className="text-slate-400">{member.leadsActive} leads</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
