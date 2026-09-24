import React, { useState } from 'react';
import {
  Menu,
  X,
  Car,
  Bell,
  Search,
  Plus,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EstoqueView } from './components/EstoqueView';
import { LeadsView } from './components/LeadsView';
import { KanbanView } from './components/KanbanView';
import { HotSiteView } from './components/HotSiteView';
import { EquipeView } from './components/EquipeView';
import { ConversasView } from './components/ConversasView';
import { AjustesView } from './components/AjustesView';
import { LoginView } from './components/LoginView';
import {
  NavSection,
  Vehicle,
  Lead,
  TeamMember,
  StoreSettings,
  LeadStage
} from './types';
import { useAuth } from './contexts/AuthContext';
import type { Profile } from './contexts/AuthContext';
import { canEditStoreSettings, canDeleteTeamMember } from './lib/permissions';
import { useVehicles } from './hooks/useVehicles';
import { useLeads } from './hooks/useLeads';
import { useTeam } from './hooks/useTeam';
import { useStoreSettings } from './hooks/useStoreSettings';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
    Carregando...
  </div>
);

const AuthenticatedApp: React.FC<{ profile: Profile }> = ({ profile }) => {
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('inicio');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { vehicles, loading: vehiclesLoading, addVehicle, updateVehicle, deleteVehicle } =
    useVehicles(profile.storeId);
  const { leads, loading: leadsLoading, addLead, updateLead, deleteLead, updateLeadStage } =
    useLeads(profile.storeId);
  const { team, loading: teamLoading, addMember, updateMember, deleteMember } =
    useTeam(profile.storeId);
  const { settings, loading: settingsLoading, saveSettings } = useStoreSettings(profile.storeId);

  if (vehiclesLoading || leadsLoading || teamLoading || settingsLoading || !settings) {
    return <LoadingScreen />;
  }

  const handleAddVehicle = (newVehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    addVehicle(newVehicle);
  };

  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    updateVehicle(updatedVehicle);
  };

  const handleDeleteVehicle = (id: string) => {
    deleteVehicle(id);
  };

  const handleAddLead = (newLead: Omit<Lead, 'id' | 'createdAt' | 'lastContactAt'>) => {
    addLead(newLead);
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    updateLead(updatedLead);
  };

  const handleDeleteLead = (id: string) => {
    deleteLead(id);
  };

  const handleUpdateLeadStage = (leadId: string, newStage: LeadStage) => {
    updateLeadStage(leadId, newStage);
  };

  const handleAddTeamMember = async (newMember: Omit<TeamMember, 'id' | 'joinedDate'>) => {
    try {
      await addMember(newMember);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao convidar usuário.');
    }
  };

  const handleUpdateTeamMember = (updatedMember: TeamMember) => {
    updateMember(updatedMember);
  };

  const handleDeleteTeamMember = (id: string) => {
    deleteMember(id);
  };

  const handleSaveSettings = (newSettings: StoreSettings) => {
    saveSettings(newSettings);
  };

  const sectionTitles: { [key in NavSection]: { title: string; subtitle: string } } = {
    inicio: {
      title: 'Início & Dashboard',
      subtitle: 'Visão geral da operação comercial, leads e faturamento',
    },
    estoque: {
      title: 'Estoque de Veículos',
      subtitle: 'Controle de carros disponíveis, valores e fichas técnicas',
    },
    leads: {
      title: 'Gestão de LEADS',
      subtitle: 'Lista detalhada de contatos recentes via Meta Ads e canais',
    },
    crm: {
      title: 'Pipeline CRM',
      subtitle: 'Funil de vendas e movimentação de etapas em Kanban',
    },
    hotsite: {
      title: 'Hot Site & Landing Pages',
      subtitle: 'Páginas individuais para anúncios de cada veículo com qualificação imediata',
    },
    conversas: {
      title: 'Conversas',
      subtitle: 'Leia e responda as conversas do WhatsApp direto do CRM',
    },
    equipe: {
      title: 'Equipe de Vendas',
      subtitle: 'Cadastro de colaboradores com login e senha próprios',
    },
    ajustes: {
      title: 'Ajustes da Loja',
      subtitle: 'Perfil cadastral, horário de funcionamento e Meta Pixel',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => setActiveSection(sec)}
        leadsCount={leads.length}
        stockCount={vehicles.length}
        teamCount={team.length}
        storeName={settings.storeName}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        role={profile.role}
        userName={profile.name}
        onSignOut={signOut}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  {sectionTitles[activeSection].title}
                </h1>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  {settings.storeName}
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500">
                {sectionTitles[activeSection].subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Badge */}
            <div className="relative">
              <button
                id="notifications-btn"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors relative"
                title="Notificações de novos leads"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
              </button>
            </div>

            {/* Quick Action Button based on section */}
            <button
              onClick={() => {
                if (activeSection === 'estoque') {
                  const addBtn = document.getElementById('add-vehicle-btn');
                  if (addBtn) addBtn.click();
                } else if (activeSection === 'equipe') {
                  const teamBtn = document.getElementById('add-team-member-btn');
                  if (teamBtn) teamBtn.click();
                } else {
                  setActiveSection('leads');
                  setTimeout(() => {
                    const leadBtn = document.getElementById('add-lead-btn');
                    if (leadBtn) leadBtn.click();
                  }, 50);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
        </header>

        {/* Dynamic Section View */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeSection === 'inicio' && (
            <DashboardView
              leads={leads}
              vehicles={vehicles}
              team={team}
              onNavigate={(sec) => setActiveSection(sec)}
              onOpenNewLeadModal={() => {
                setActiveSection('leads');
                setTimeout(() => {
                  const btn = document.getElementById('add-lead-btn');
                  if (btn) btn.click();
                }, 50);
              }}
              onOpenNewCarModal={() => {
                setActiveSection('estoque');
                setTimeout(() => {
                  const btn = document.getElementById('add-vehicle-btn');
                  if (btn) btn.click();
                }, 50);
              }}
            />
          )}

          {activeSection === 'estoque' && (
            <EstoqueView
              vehicles={vehicles}
              onAddVehicle={handleAddVehicle}
              onUpdateVehicle={handleUpdateVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              onOpenHotSite={(carId) => {
                setActiveSection('hotsite');
              }}
            />
          )}

          {activeSection === 'leads' && (
            <LeadsView
              leads={leads}
              vehicles={vehicles}
              team={team}
              onAddLead={handleAddLead}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
            />
          )}

          {activeSection === 'crm' && (
            <KanbanView
              leads={leads}
              team={team}
              onUpdateLeadStage={handleUpdateLeadStage}
              onOpenNewLeadModal={(stage) => {
                setActiveSection('leads');
                setTimeout(() => {
                  const btn = document.getElementById('add-lead-btn');
                  if (btn) btn.click();
                }, 50);
              }}
              onSelectLead={(lead) => {
                setActiveSection('leads');
              }}
            />
          )}

          {activeSection === 'hotsite' && (
            <HotSiteView
              vehicles={vehicles}
              settings={settings}
              onAddLead={handleAddLead}
              onNavigateToLeads={() => setActiveSection('leads')}
            />
          )}

          {activeSection === 'conversas' && (
            <ConversasView teamMemberId={profile.id} />
          )}

          {activeSection === 'equipe' && (
            <EquipeView
              team={team}
              onAddMember={handleAddTeamMember}
              onUpdateMember={handleUpdateTeamMember}
              onDeleteMember={handleDeleteTeamMember}
              canDelete={canDeleteTeamMember(profile.role)}
            />
          )}

          {activeSection === 'ajustes' && (
            <AjustesView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              readOnly={!canEditStoreSettings(profile.role)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return <LoginView />;
  }

  return <AuthenticatedApp profile={profile} />;
};

export default App;
