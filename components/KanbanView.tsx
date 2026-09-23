import React, { useState } from 'react';
import { 
  Kanban, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  MessageSquare, 
  Car, 
  Flame, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trophy,
  XCircle,
  PhoneOff,
  RotateCcw,
  Sparkles,
  Archive,
  Eye
} from 'lucide-react';
import { Lead, LeadStage, TeamMember } from '../types';

interface KanbanViewProps {
  leads: Lead[];
  team: TeamMember[];
  onUpdateLeadStage: (leadId: string, newStage: LeadStage) => void;
  onOpenNewLeadModal: (stage?: LeadStage) => void;
  onSelectLead: (lead: Lead) => void;
}

interface ColumnConfig {
  id: LeadStage;
  title: string;
  badgeColor: string;
  borderColor: string;
  dotColor: string;
  description: string;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  leads,
  team,
  onUpdateLeadStage,
  onOpenNewLeadModal,
  onSelectLead,
}) => {
  const [selectedSeller, setSelectedSeller] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'funil' | 'ganhos' | 'perdidos'>('funil');
  const [showClosedColumnsInBoard, setShowClosedColumnsInBoard] = useState<boolean>(false);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [hoverDropZone, setHoverDropZone] = useState<'ganho' | 'perdido' | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'ganho' | 'perdido' } | null>(null);

  // Funnel main stages
  const activeColumns: ColumnConfig[] = [
    {
      id: 'novo',
      title: 'Novos Leads',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      borderColor: 'border-blue-400',
      dotColor: 'bg-blue-500',
      description: 'Chegados via Hot Site, Meta Ads ou Site',
    },
    {
      id: 'contato',
      title: 'Em Atendimento',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      borderColor: 'border-indigo-400',
      dotColor: 'bg-indigo-500',
      description: 'Conversando no WhatsApp ou ligação',
    },
    {
      id: 'sem_resposta',
      title: 'Não Atendeu / Sem Resposta',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      borderColor: 'border-rose-400',
      dotColor: 'bg-rose-500',
      description: 'Tentativas de contato sem retorno do cliente',
    },
    {
      id: 'agendamento',
      title: 'Test Drive / Visita',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      borderColor: 'border-purple-400',
      dotColor: 'bg-purple-500',
      description: 'Cliente com visita agendada na loja',
    },
    {
      id: 'proposta',
      title: 'Proposta Enviada',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      borderColor: 'border-amber-400',
      dotColor: 'bg-amber-500',
      description: 'Simulação de troca/financiamento entregue',
    },
    {
      id: 'negociacao',
      title: 'Financiamento / Negociação',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      borderColor: 'border-orange-400',
      dotColor: 'bg-orange-500',
      description: 'Fase final de aprovação bancária e fechamento',
    },
  ];

  // Optional columns for Ganho / Perdido
  const closedColumns: ColumnConfig[] = [
    {
      id: 'ganho',
      title: 'Vendas Concluídas 🎉',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderColor: 'border-emerald-400',
      dotColor: 'bg-emerald-500',
      description: 'Carro faturado e entregue com sucesso',
    },
    {
      id: 'perdido',
      title: 'Leads Perdidos / Arquivados',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      borderColor: 'border-slate-400',
      dotColor: 'bg-slate-500',
      description: 'Desistiu, comprou outro ou reprovou crédito',
    },
  ];

  const displayedColumns = showClosedColumnsInBoard 
    ? [...activeColumns, ...closedColumns] 
    : activeColumns;

  const stageOrder: LeadStage[] = [
    'novo', 
    'contato', 
    'sem_resposta', 
    'agendamento', 
    'proposta', 
    'negociacao', 
    'ganho', 
    'perdido'
  ];

  const handleMoveStage = (lead: Lead, direction: 'prev' | 'next') => {
    const currentIndex = stageOrder.indexOf(lead.stage);
    if (direction === 'next' && currentIndex < stageOrder.length - 1) {
      onUpdateLeadStage(lead.id, stageOrder[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      onUpdateLeadStage(lead.id, stageOrder[currentIndex - 1]);
    }
  };

  const filteredLeads = leads.filter(l => {
    if (selectedSeller === 'todos') return true;
    return l.assignedTo === selectedSeller;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    setDraggedLeadId(leadId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedLeadId(null);
    setHoverDropZone(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToColumn = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      onUpdateLeadStage(leadId, targetStage);
    }
    setIsDragging(false);
    setDraggedLeadId(null);
    setHoverDropZone(null);
  };

  const handleDropToSpecial = (targetStage: 'ganho' | 'perdido') => {
    const leadId = draggedLeadId;
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      const leadName = lead ? lead.name : 'Lead';
      const vehicle = lead ? lead.interestedVehicle : 'veículo';
      
      onUpdateLeadStage(leadId, targetStage);

      if (targetStage === 'ganho') {
        setFeedbackToast({
          message: `🎉 Parabéns! Venda de "${vehicle}" para ${leadName} foi registrada como GANHO!`,
          type: 'ganho',
        });
      } else {
        setFeedbackToast({
          message: `Lead ${leadName} (${vehicle}) arquivado na etapa Perdido.`,
          type: 'perdido',
        });
      }

      setTimeout(() => {
        setFeedbackToast(null);
      }, 4500);
    }

    setIsDragging(false);
    setDraggedLeadId(null);
    setHoverDropZone(null);
  };

  const totalPipelineValue = filteredLeads
    .filter(l => l.stage !== 'perdido' && l.stage !== 'ganho')
    .reduce((acc, curr) => acc + (curr.value || curr.vehiclePrice || 0), 0);

  const totalGanhosValue = filteredLeads
    .filter(l => l.stage === 'ganho')
    .reduce((acc, curr) => acc + (curr.value || curr.vehiclePrice || 0), 0);

  const wonLeads = filteredLeads.filter(l => l.stage === 'ganho');
  const lostLeads = filteredLeads.filter(l => l.stage === 'perdido');

  const draggedLead = leads.find(l => l.id === draggedLeadId);

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Toast de Confirmação Ganho / Perdido */}
      {feedbackToast && (
        <div
          id="kanban-toast-feedback"
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg border animate-in fade-in slide-in-from-top-3 duration-300 ${
            feedbackToast.type === 'ganho'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
              : 'bg-slate-800 text-white border-slate-700 shadow-slate-900/30'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedbackToast.type === 'ganho' ? (
              <Trophy className="w-6 h-6 text-amber-300 shrink-0 animate-bounce" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-300 shrink-0" />
            )}
            <span className="text-sm font-bold">{feedbackToast.message}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-3 py-1 bg-black/20 hover:bg-black/30 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header com Filtros e Modos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Kanban className="w-6 h-6 text-brand-600" />
            <span>CRM Pipeline (Funil de Vendas)</span>
          </h1>
          <p className="text-sm text-slate-500">
            Arraste os cards entre as etapas do funil ou solte na barra inferior para marcar <strong className="text-emerald-700">GANHO</strong> ou <strong className="text-rose-700">PERCA</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Alternar Visualização: Funil, Ganhos ou Perdidos */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('funil')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'funil' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-brand-600" />
              <span>Funil Ativo</span>
            </button>
            <button
              onClick={() => setViewMode('ganhos')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'ganhos' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Ganhos ({wonLeads.length})</span>
            </button>
            <button
              onClick={() => setViewMode('perdidos')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'perdidos' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Perdidos ({lostLeads.length})</span>
            </button>
          </div>

          {/* Filter by seller */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Vendedor:</span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
            >
              <option value="todos">Todos da Equipe</option>
              {team.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            id="kanban-add-lead-btn"
            onClick={() => onOpenNewLeadModal('novo')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Lead</span>
          </button>
        </div>
      </div>

      {/* Pipeline Summary Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Em Negociação:</span>
            <span className="text-lg font-extrabold text-brand-700">{formatCurrency(totalPipelineValue)}</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vendas Ganhas:</span>
            <span className="text-base font-extrabold text-emerald-600">{formatCurrency(totalGanhosValue)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Novos: {filteredLeads.filter(l => l.stage === 'novo').length}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Em Atend.: {filteredLeads.filter(l => l.stage === 'contato').length}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sem Resposta: {filteredLeads.filter(l => l.stage === 'sem_resposta').length}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span> Visitas: {filteredLeads.filter(l => l.stage === 'agendamento').length}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ganho: {wonLeads.length}
          </span>
        </div>
      </div>

      {/* DOCK FLUTUANTE QUE APARECE NA HORA QUE O USUÁRIO PEGA O CARD COM O MOUSE */}
      {isDragging && (
        <div 
          id="kanban-floating-drag-dock"
          className="fixed bottom-6 inset-x-0 mx-auto z-50 w-full max-w-2xl px-4 pointer-events-auto transition-all animate-in slide-in-from-bottom-6 duration-200"
        >
          <div className="bg-slate-950/95 backdrop-blur-md rounded-3xl p-3.5 border-2 border-slate-700 shadow-2xl shadow-slate-950/90 flex flex-col sm:flex-row items-center gap-3">
            <div className="text-xs text-slate-300 font-bold hidden sm:block shrink-0 px-2 text-center max-w-[130px]">
              <span className="block text-[10px] text-slate-400 uppercase tracking-widest">Movendo:</span>
              <span className="truncate text-brand-300 block font-semibold">{draggedLead?.name || 'Lead'}</span>
            </div>

            {/* Zona de Drop: GANHO (VENDIDO) */}
            <div
              id="kanban-dropzone-ganho"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setHoverDropZone('ganho');
              }}
              onDragLeave={() => setHoverDropZone(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropToSpecial('ganho');
              }}
              className={`flex-1 w-full p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-3.5 cursor-pointer ${
                hoverDropZone === 'ganho'
                  ? 'bg-emerald-600 border-emerald-300 text-white scale-105 shadow-2xl shadow-emerald-500/60 ring-4 ring-emerald-400/50'
                  : 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              <Trophy className={`w-8 h-8 shrink-0 ${hoverDropZone === 'ganho' ? 'text-amber-200 animate-bounce' : 'text-amber-400'}`} />
              <div className="text-left">
                <div className="font-black text-sm sm:text-base flex items-center gap-1.5 leading-tight">
                  <span>SOLTAR PARA GANHO (VENDA)</span>
                  <span>🎉</span>
                </div>
                <p className="text-[11px] opacity-85 leading-tight mt-0.5">
                  Concluir negociação com sucesso
                </p>
              </div>
            </div>

            {/* Zona de Drop: PERDA (PERDIDO) */}
            <div
              id="kanban-dropzone-perdido"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setHoverDropZone('perdido');
              }}
              onDragLeave={() => setHoverDropZone(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropToSpecial('perdido');
              }}
              className={`flex-1 w-full p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-3.5 cursor-pointer ${
                hoverDropZone === 'perdido'
                  ? 'bg-rose-600 border-rose-300 text-white scale-105 shadow-2xl shadow-rose-500/60 ring-4 ring-rose-400/50'
                  : 'bg-rose-950/60 border-rose-500/70 text-rose-300 hover:bg-rose-900/60'
              }`}
            >
              <XCircle className={`w-8 h-8 shrink-0 ${hoverDropZone === 'perdido' ? 'text-rose-200 animate-pulse' : 'text-rose-400'}`} />
              <div className="text-left">
                <div className="font-black text-sm sm:text-base leading-tight">
                  <span>SOLTAR PARA PERCA (PERDIDO)</span>
                </div>
                <p className="text-[11px] opacity-85 leading-tight mt-0.5">
                  Descartar ou arquivar oportunidade
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Funil Normal (com a nova etapa Não Atendeu / Sem Resposta) */}
      {viewMode === 'funil' && (
        <>
          {/* Instruções Sutis & Toggle de colunas extras */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Dica: Ao segurar qualquer card para arrastar, a barra de <strong>Ganho</strong> e <strong>Perca</strong> surge automaticamente na tela!</span>
            </span>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showClosedColumnsInBoard}
                onChange={(e) => setShowClosedColumnsInBoard(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Exibir colunas Ganho e Perdido no quadro</span>
            </label>
          </div>

          {/* Kanban Board Horizontal Scroll */}
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[600px]">
            {displayedColumns.map((col) => {
              const colLeads = filteredLeads.filter(l => l.stage === col.id);
              const colValue = colLeads.reduce((acc, curr) => acc + (curr.value || curr.vehiclePrice || 0), 0);

              return (
                <div
                  key={col.id}
                  id={`kanban-column-${col.id}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToColumn(e, col.id)}
                  className="w-80 shrink-0 bg-slate-100/90 rounded-2xl border border-slate-200/80 p-3.5 flex flex-col max-h-[780px] transition-all"
                >
                  {/* Column Header */}
                  <div className="pb-3 border-b border-slate-200/80 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">{col.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 shadow-2xs border border-slate-200">
                          {colLeads.length}
                        </span>
                      </div>

                      <button
                        onClick={() => onOpenNewLeadModal(col.id)}
                        title="Adicionar lead nesta etapa"
                        className="p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {col.description}
                    </p>
                  </div>

                  {/* Stage Value Metric */}
                  <div className="text-[11px] font-semibold text-slate-500 mb-3 px-1 flex justify-between">
                    <span>Total da etapa:</span>
                    <span className="font-bold text-slate-700">{formatCurrency(colValue)}</span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {colLeads.length === 0 ? (
                      <div className="h-28 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center p-3 text-slate-400 text-xs bg-white/40">
                        {col.id === 'sem_resposta' ? (
                          <div className="flex flex-col items-center">
                            <PhoneOff className="w-5 h-5 text-slate-300 mb-1" />
                            <span>Nenhum lead sem resposta</span>
                          </div>
                        ) : (
                          <span>Nenhum lead nesta etapa</span>
                        )}
                        <button
                          onClick={() => onOpenNewLeadModal(col.id)}
                          className="mt-1.5 text-brand-600 hover:underline font-bold text-[11px]"
                        >
                          + Adicionar Lead
                        </button>
                      </div>
                    ) : (
                      colLeads.map((lead) => {
                        const cleanPhone = lead.phone.replace(/\D/g, '');
                        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(lead.name)},%20aqui%20%C3%A9%20${encodeURIComponent(lead.assignedTo)}%20da%20Auto%20Wise!%20Como%20est%C3%A1%20seu%20interesse%20no%20${encodeURIComponent(lead.interestedVehicle)}?`;

                        return (
                          <div
                            key={lead.id}
                            id={`kanban-card-${lead.id}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            className={`bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-3.5 cursor-grab active:cursor-grabbing group relative ${
                              draggedLeadId === lead.id ? 'opacity-40 border-brand-400 scale-95 ring-2 ring-brand-400/30' : ''
                            }`}
                          >
                            {/* Card Top: Name & Temperature */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => onSelectLead(lead)}
                                  className="font-bold text-slate-900 text-sm hover:text-brand-600 transition-colors text-left"
                                >
                                  {lead.name}
                                </button>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <span>{lead.phone}</span>
                                  {lead.stage === 'sem_resposta' && (
                                    <span className="inline-flex items-center text-[10px] text-rose-600 font-bold bg-rose-50 px-1 rounded">
                                      <Clock className="w-2.5 h-2.5 mr-0.5" /> Sem retorno
                                    </span>
                                  )}
                                </div>
                              </div>

                              {lead.temperature === 'quente' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 flex items-center gap-0.5 shrink-0">
                                  <Flame className="w-2.5 h-2.5 text-amber-600" /> Quente
                                </span>
                              )}
                            </div>

                            {/* Interested Car */}
                            <div className="mt-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                                <Car className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                <span className="truncate">{lead.interestedVehicle}</span>
                              </div>
                              {lead.vehiclePrice ? (
                                <span className="font-bold text-slate-900 shrink-0 ml-1">
                                  {formatCurrency(lead.vehiclePrice)}
                                </span>
                              ) : null}
                            </div>

                            {/* Notes preview if exists */}
                            {lead.notes && (
                              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 italic bg-amber-50/40 p-1.5 rounded border border-amber-100/50">
                                "{lead.notes}"
                              </p>
                            )}

                            {/* Card Footer */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                  {lead.source}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {lead.assignedTo.split(' ')[0]}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Botão Rápido Ganho */}
                                <button
                                  type="button"
                                  onClick={() => onUpdateLeadStage(lead.id, 'ganho')}
                                  title="Marcar como Ganho (Vendido)"
                                  className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                >
                                  <Trophy className="w-3.5 h-3.5" />
                                </button>

                                {/* Botão Rápido Perdido */}
                                <button
                                  type="button"
                                  onClick={() => onUpdateLeadStage(lead.id, 'perdido')}
                                  title="Marcar como Perca (Perdido)"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>

                                {/* WhatsApp Button */}
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Chamar no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>

                                {/* Move Left */}
                                <button
                                  onClick={() => handleMoveStage(lead, 'prev')}
                                  disabled={col.id === 'novo'}
                                  title="Voltar Etapa"
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>

                                {/* Move Right */}
                                <button
                                  onClick={() => handleMoveStage(lead, 'next')}
                                  disabled={col.id === 'ganho'}
                                  title="Avançar Etapa"
                                  className="p-1 text-brand-600 hover:bg-brand-50 rounded font-bold"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* VIEW: Vendas Concluídas (Ganhos) */}
      {viewMode === 'ganhos' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Vendas Ganhas & Concluídas 🎉</h2>
                <p className="text-xs text-slate-500">Leads que concluíram a compra e faturamento do veículo</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-semibold block uppercase">Volume Vendido</span>
              <span className="text-xl font-black text-emerald-600">{formatCurrency(totalGanhosValue)}</span>
            </div>
          </div>

          {wonLeads.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-700">Nenhuma venda registrada ainda</p>
              <p className="text-xs mt-1">Ao arrastar um card no funil para a área de Ganho, ele aparecerá aqui comemoração!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wonLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className="p-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>
                      <p className="text-xs text-slate-500">{lead.phone}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Vendido
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Car className="w-4 h-4 text-emerald-600" />
                      <span>{lead.interestedVehicle}</span>
                    </div>
                    <span className="font-extrabold text-emerald-700">
                      {formatCurrency(lead.vehiclePrice || lead.value || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Vendedor: <strong>{lead.assignedTo}</strong></span>
                    <button
                      type="button"
                      onClick={() => onUpdateLeadStage(lead.id, 'negociacao')}
                      className="text-brand-600 hover:text-brand-700 font-bold text-[11px] flex items-center gap-1 hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" /> Reabrir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: Leads Perdidos */}
      {viewMode === 'perdidos' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Leads Perdidos & Arquivados</h2>
                <p className="text-xs text-slate-500">Oportunidades que não fecharam ou foram descartadas</p>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {lostLeads.length} leads arquivados
            </span>
          </div>

          {lostLeads.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Archive className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-700">Nenhum lead marcado como perdido</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lostLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{lead.name}</h4>
                      <p className="text-xs text-slate-500">{lead.phone}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Perdido
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 truncate">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{lead.interestedVehicle}</span>
                    </div>
                    {lead.vehiclePrice ? (
                      <span className="font-semibold text-slate-500">
                        {formatCurrency(lead.vehiclePrice)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80">
                    <span className="text-slate-400 text-[11px]">Resp: {lead.assignedTo}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateLeadStage(lead.id, 'novo')}
                      className="text-brand-600 hover:text-brand-700 font-bold text-xs flex items-center gap-1 hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reativar Lead
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
