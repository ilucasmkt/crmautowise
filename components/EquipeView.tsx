import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  ShieldCheck,
  Mail,
  Phone,
  Key,
  Award,
  TrendingUp,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  UserPlus,
  Lock,
  Sparkles,
  QrCode,
  Wifi,
  WifiOff,
  Smartphone,
  Battery,
  RefreshCw,
  Send,
  CheckCircle2,
  Zap,
  Globe,
  MessageSquare
} from 'lucide-react';
import { TeamMember } from '../types';

interface EquipeViewProps {
  team: TeamMember[];
  onAddMember: (member: Omit<TeamMember, 'id' | 'joinedDate'>) => void;
  onUpdateMember: (member: TeamMember) => void;
  onDeleteMember: (id: string) => void;
  canDelete: boolean;
}

export const EquipeView: React.FC<EquipeViewProps> = ({
  team,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  canDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Administrador' | 'Gerente de Vendas' | 'Consultor de Vendas' | 'Atendimento / BDC'>('Consultor de Vendas');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [targetSales, setTargetSales] = useState(10);

  // Colors for avatars
  const avatarColors = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-indigo-600',
    'bg-amber-600',
    'bg-purple-600',
    'bg-rose-600',
    'bg-slate-800'
  ];

  // WhatsApp Sync State
  const [whatsappSyncMember, setWhatsappSyncMember] = useState<TeamMember | null>(null);
  const [syncTab, setSyncTab] = useState<'qrcode' | 'api'>('qrcode');
  const [qrTimer, setQrTimer] = useState<number>(45);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [apiInstanceName, setApiInstanceName] = useState<string>('');
  const [apiEndpoint, setApiEndpoint] = useState<string>('https://api.autowise.com/v1/instance');
  const [apiKey, setApiKey] = useState<string>('');
  const [testNumber, setTestNumber] = useState<string>('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // QR Code refresh timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (whatsappSyncMember && syncTab === 'qrcode') {
      interval = setInterval(() => {
        setQrTimer((prev) => (prev > 1 ? prev - 1 : 45));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [whatsappSyncMember, syncTab]);

  const handleOpenWhatsAppSync = (member: TeamMember) => {
    setWhatsappSyncMember(member);
    setSyncTab('qrcode');
    setQrTimer(45);
    setSyncSuccessMsg(null);
    setApiInstanceName(`vendedor_${member.name.toLowerCase().replace(/\s+/g, '_')}`);
    setApiKey(`wise_live_${member.id.replace(/-/g, '')}_${Math.random().toString(36).substring(7)}`);
    setTestNumber(member.phone || '(11) 98112-9900');
    setTestStatus('idle');
  };

  const handleSimulateQRScan = () => {
    if (!whatsappSyncMember) return;
    setIsConnecting(true);

    setTimeout(() => {
      setIsConnecting(false);
      const updated: TeamMember = {
        ...whatsappSyncMember,
        whatsappStatus: 'conectado',
        whatsappConnectedNumber: whatsappSyncMember.phone,
        whatsappSessionId: `sess_${whatsappSyncMember.id}_${Date.now()}`,
        whatsappBattery: 92,
        whatsappConnectedAt: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      onUpdateMember(updated);
      setWhatsappSyncMember(updated);
      setSyncSuccessMsg(`WhatsApp de ${updated.name} sincronizado com sucesso via QR Code!`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    }, 1200);
  };

  const handleDisconnectWhatsApp = (member: TeamMember) => {
    const updated: TeamMember = {
      ...member,
      whatsappStatus: 'desconectado',
      whatsappSessionId: undefined,
      whatsappConnectedAt: undefined,
      whatsappBattery: undefined,
    };
    onUpdateMember(updated);
    setWhatsappSyncMember(updated);
    setSyncSuccessMsg(`Sessão de WhatsApp de ${member.name} desconectada.`);
    setTimeout(() => setSyncSuccessMsg(null), 3000);
  };

  const handleSendTestMessage = () => {
    setTestStatus('sending');
    setTimeout(() => {
      setTestStatus('sent');
      setTimeout(() => setTestStatus('idle'), 3500);
    }, 1000);
  };

  const handleOpenAdd = () => {
    setEditingMember(null);
    setName('');
    setEmail('');
    setPhone('(11) 9');
    setRole('Consultor de Vendas');
    setStatus('ativo');
    setTargetSales(10);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: TeamMember) => {
    setEditingMember(m);
    setName(m.name);
    setEmail(m.email);
    setPhone(m.phone);
    setRole(m.role);
    setStatus(m.status);
    setTargetSales(m.targetSales);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    if (editingMember) {
      onUpdateMember({
        ...editingMember,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        status,
        targetSales: Number(targetSales) || 0,
      });
    } else {
      onAddMember({
        name: name.trim() || 'Novo Colaborador',
        email: email.trim() || 'usuario@autocrm.com.br',
        phone: phone.trim(),
        role,
        status,
        salesCount: 0,
        leadsActive: 0,
        targetSales: Number(targetSales) || 10,
        avatarColor: randomColor,
        whatsappStatus: 'desconectado',
      });
    }

    setIsModalOpen(false);
  };

  const filteredTeam = team.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'todos' || m.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalSales = team.reduce((acc, curr) => acc + curr.salesCount, 0);
  const totalLeadsActive = team.reduce((acc, curr) => acc + curr.leadsActive, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-600" />
            <span>Gestão da Equipe & Acessos</span>
          </h1>
          <p className="text-sm text-slate-500">
            Cadastre novos vendedores e gerentes com login e senha individuais no CRM
          </p>
        </div>

        <button
          id="add-team-member-btn"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-600/25 transition-all hover:translate-y-[-1px]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Adicionar Novo Usuário</span>
        </button>
      </div>

      {/* Team Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total de Colaboradores</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{team.length} usuários</div>
          <span className="text-xs text-emerald-600 font-semibold">
            {team.filter(t => t.status === 'ativo').length} ativos no sistema
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vendas da Equipe no Mês</span>
          <div className="text-2xl font-extrabold text-brand-700 mt-1">{totalSales} carros</div>
          <span className="text-xs text-slate-500 font-medium">Meta global da loja: 35 carros</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Leads em Atendimento Ativo</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{totalLeadsActive} leads</div>
          <span className="text-xs text-slate-500 font-medium">Distribuídos entre consultores</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-team-input"
            type="text"
            placeholder="Buscar por nome, email ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="todos">Todos os Cargos</option>
            <option value="Administrador">Administrador</option>
            <option value="Gerente de Vendas">Gerente de Vendas</option>
            <option value="Consultor de Vendas">Consultor de Vendas</option>
            <option value="Atendimento / BDC">Atendimento / BDC</option>
          </select>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeam.map((member) => {
          const progressPercent = member.targetSales > 0 
            ? Math.min(100, Math.round((member.salesCount / member.targetSales) * 100))
            : 100;

          return (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* User Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${member.avatarColor} text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0`}>
                      {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{member.name}</h3>
                      <span className="inline-block px-2 py-0.5 mt-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                        {member.role}
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    member.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {member.status}
                  </span>
                </div>

                {/* Contact info & credentials */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] pt-1">
                    <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Login próprio com senha criptografada</span>
                  </div>
                </div>

                {/* WhatsApp Vendedor Sincronização Card */}
                <div className={`mt-3 p-3 rounded-xl border text-xs transition-all ${
                  member.whatsappStatus === 'conectado'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <span className={`w-2 h-2 rounded-full ${
                        member.whatsappStatus === 'conectado' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`} />
                      <span>WhatsApp Individual</span>
                    </div>

                    {member.whatsappStatus === 'conectado' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Battery className="w-3 h-3 text-emerald-600" /> {member.whatsappBattery || 92}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {member.whatsappStatus === 'conectado' ? (
                        <div>
                          <span className="text-[11px] font-bold text-emerald-800 block truncate">
                            {member.whatsappConnectedNumber || member.phone}
                          </span>
                          <span className="text-[10px] text-emerald-600">Sincronizado p/ responder Leads</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-800 font-medium block leading-tight">
                          Desconectado. Sincronize via QR Code para atendimento direto.
                        </span>
                      )}
                    </div>

                    <button
                      id={`sync-whatsapp-btn-${member.id}`}
                      onClick={() => handleOpenWhatsAppSync(member)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs transition-all shrink-0 ${
                        member.whatsappStatus === 'conectado'
                          ? 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{member.whatsappStatus === 'conectado' ? 'Ajustar' : 'QR Code'}</span>
                    </button>
                  </div>
                </div>

                {/* Sales Targets & Progress */}
                {member.role.includes('Vendas') && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-brand-600" /> Vendas no Mês
                      </span>
                      <span className="text-slate-900 font-bold">
                        {member.salesCount} / {member.targetSales} carros ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progressPercent >= 100 ? 'bg-emerald-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Membro desde {member.joinedDate}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    title="Editar Usuário"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (confirm(`Remover o usuário ${member.name}?`)) onDeleteMember(member.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit User */}
      {isModalOpen && (
        <div 
          id="team-modal-backdrop"
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingMember ? 'Editar Colaborador' : 'Cadastrar Usuário da Equipe'}
                </h2>
              </div>
              <button
                id="close-team-modal"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  id="user-name-input"
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  E-mail de Login *
                </label>
                <input
                  id="user-email-input"
                  type="email"
                  required
                  placeholder="joao@autoprime.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Este e-mail será usado para acessar o painel do CRM
                </span>
              </div>

              {!editingMember && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-brand-600" />
                    Acesso ao Sistema
                  </label>
                  <span className="text-[11px] text-slate-500 block">
                    Um e-mail de convite será enviado para {email || 'o colaborador'} definir a própria senha de acesso.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
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
                    Cargo / Nível de Acesso
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="Consultor de Vendas">Consultor de Vendas</option>
                    <option value="Gerente de Vendas">Gerente de Vendas</option>
                    <option value="Atendimento / BDC">Atendimento / BDC</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Status do Acesso</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="ativo">Ativo (Acesso Liberado)</option>
                    <option value="inativo">Inativo (Bloqueado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Meta Mensal (Carros)</label>
                  <input
                    type="number"
                    value={targetSales}
                    onChange={(e) => setTargetSales(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
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
                  id="save-team-submit-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
                >
                  {editingMember ? 'Salvar Alterações' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp QR Code & API Synchronization Modal */}
      {whatsappSyncMember && (
        <div
          id="whatsapp-sync-modal-backdrop"
          className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    Sincronizar WhatsApp do Vendedor
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    {whatsappSyncMember.name} • {whatsappSyncMember.role}
                  </span>
                </div>
              </div>
              <button
                id="close-whatsapp-sync-modal"
                onClick={() => setWhatsappSyncMember(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification toast if any */}
            {syncSuccessMsg && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
              <button
                onClick={() => setSyncTab('qrcode')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  syncTab === 'qrcode'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Escanear QR Code</span>
              </button>
              <button
                onClick={() => setSyncTab('api')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  syncTab === 'api'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Configuração de API & Webhook</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {syncTab === 'qrcode' ? (
                <div className="space-y-4 text-center">
                  {whatsappSyncMember.whatsappStatus === 'conectado' ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-emerald-950">WhatsApp Sincronizado e Ativo</h4>
                        <p className="text-xs text-emerald-700 mt-1">
                          Número conectado: <strong className="font-bold">{whatsappSyncMember.whatsappConnectedNumber || whatsappSyncMember.phone}</strong>
                        </p>
                        <p className="text-[11px] text-emerald-600 mt-0.5">
                          Conectado em: {whatsappSyncMember.whatsappConnectedAt || 'Hoje'} • Bateria: {whatsappSyncMember.whatsappBattery || 92}%
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 bg-white/70 p-3 rounded-xl border border-emerald-100">
                        Quando este vendedor responder a um LEAD, o CRM enviará a mensagem diretamente pelo WhatsApp particular deste vendedor!
                      </p>

                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDisconnectWhatsApp(whatsappSyncMember)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Desconectar Sessão
                        </button>
                        <button
                          type="button"
                          onClick={handleSimulateQRScan}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                        >
                          Reconectar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Abra o WhatsApp no aparelho de {whatsappSyncMember.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Escaneie o QR Code abaixo para sincronizar a conta do vendedor com o CRM
                        </p>
                      </div>

                      {/* QR Code Container */}
                      <div className="relative inline-block p-4 bg-white rounded-3xl border-2 border-emerald-500/40 shadow-xl mx-auto">
                        {/* Mock QR Pattern in SVG with WhatsApp Center Logo */}
                        <div className="relative w-52 h-52 bg-slate-950 rounded-2xl p-2 flex items-center justify-center overflow-hidden">
                          {/* Stylized QR Grid */}
                          <svg className="w-full h-full text-white" viewBox="0 0 200 200" fill="currentColor">
                            {/* Corner anchors */}
                            <rect x="15" y="15" width="45" height="45" rx="6" fill="#10b981" />
                            <rect x="25" y="25" width="25" height="25" rx="3" fill="#020617" />
                            <rect x="32" y="32" width="11" height="11" fill="#10b981" />

                            <rect x="140" y="15" width="45" height="45" rx="6" fill="#10b981" />
                            <rect x="150" y="25" width="25" height="25" rx="3" fill="#020617" />
                            <rect x="157" y="32" width="11" height="11" fill="#10b981" />

                            <rect x="15" y="140" width="45" height="45" rx="6" fill="#10b981" />
                            <rect x="25" y="150" width="25" height="25" rx="3" fill="#020617" />
                            <rect x="32" y="157" width="11" height="11" fill="#10b981" />

                            {/* Data points */}
                            <rect x="75" y="20" width="12" height="12" rx="2" />
                            <rect x="95" y="20" width="12" height="12" rx="2" />
                            <rect x="115" y="20" width="12" height="12" rx="2" />
                            <rect x="75" y="40" width="12" height="12" rx="2" />
                            <rect x="115" y="40" width="12" height="12" rx="2" />

                            <rect x="20" y="75" width="12" height="12" rx="2" />
                            <rect x="40" y="75" width="12" height="12" rx="2" />
                            <rect x="20" y="95" width="12" height="12" rx="2" />
                            <rect x="40" y="115" width="12" height="12" rx="2" />

                            <rect x="145" y="75" width="12" height="12" rx="2" />
                            <rect x="165" y="95" width="12" height="12" rx="2" />
                            <rect x="145" y="115" width="12" height="12" rx="2" />

                            <rect x="75" y="145" width="12" height="12" rx="2" />
                            <rect x="95" y="145" width="12" height="12" rx="2" />
                            <rect x="115" y="165" width="12" height="12" rx="2" />
                            <rect x="145" y="145" width="12" height="12" rx="2" />
                            <rect x="165" y="165" width="12" height="12" rx="2" />
                          </svg>

                          {/* Center WhatsApp icon */}
                          <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-slate-950">
                            <Phone className="w-6 h-6 fill-white" />
                          </div>
                        </div>

                        {/* QR Code timer badge */}
                        <div className="mt-2 text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '3s' }} />
                          <span>Atualiza em {qrTimer}s</span>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 text-slate-700">
                        <span className="font-bold text-slate-900 block mb-1">Como conectar:</span>
                        <p>1. No celular do vendedor, abra o aplicativo <strong>WhatsApp</strong>.</p>
                        <p>2. Toque em <strong>Configurações</strong> ou nos <strong>três pontinhos</strong> no topo.</p>
                        <p>3. Selecione <strong>Aparelhos Conectados</strong> e toque em <strong>Conectar um Aparelho</strong>.</p>
                        <p>4. Aponte a câmera para este QR Code.</p>
                      </div>

                      {/* Action to simulate immediate connection */}
                      <div className="pt-2">
                        <button
                          id="simulate-scan-qr-btn"
                          type="button"
                          disabled={isConnecting}
                          onClick={handleSimulateQRScan}
                          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Lendo QR Code e pareando dispositivo...</span>
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-4 h-4" />
                              <span>Simular Leitura no Celular & Conectar Agora</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                    <span className="font-bold text-slate-900 block">Integração Direta via API (Evolution / Baileys)</span>
                    <p>
                      Cada usuário pode ser mapeado para sua respectiva instância dedicada na API de WhatsApp para disparo e recebimento autônomo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Identificador da Instância (Instance Name)
                    </label>
                    <input
                      type="text"
                      value={apiInstanceName}
                      onChange={(e) => setApiInstanceName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Endpoint da API WhatsApp
                    </label>
                    <input
                      type="text"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Token de Autenticação / API Key
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  {/* Test message trigger */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Testar Conexão com Disparo</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testNumber}
                        onChange={(e) => setTestNumber(e.target.value)}
                        placeholder="(11) 98112-9900"
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestMessage}
                        disabled={testStatus === 'sending'}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                      >
                        {testStatus === 'sending' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : testStatus === 'sent' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{testStatus === 'sent' ? 'Enviado!' : 'Testar API'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Sessão segura criptografada ponta a ponta
              </span>
              <button
                type="button"
                onClick={() => setWhatsappSyncMember(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
