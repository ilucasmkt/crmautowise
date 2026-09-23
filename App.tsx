import React, { useState, useEffect } from 'react';
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
import { AjustesView } from './components/AjustesView';
import { 
  NavSection, 
  Vehicle, 
  Lead, 
  TeamMember, 
  StoreSettings, 
  LeadStage 
} from './types';
import { 
  INITIAL_VEHICLES, 
  INITIAL_LEADS, 
  INITIAL_TEAM, 
  INITIAL_SETTINGS 
} from './data/mockData';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<NavSection>('inicio');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Persistent States
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('autocrm_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
  });

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('autocrm_leads');
    if (saved) {
      try {
        const parsed: Lead[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(l => {
            if (!l.dateIso) {
              const defaultIso = l.createdAt?.includes('Hoje') ? '2026-09-21T09:00:00' :
                l.createdAt?.includes('Ontem') ? '2026-09-20T16:00:00' :
                l.createdAt?.includes('19/09') ? '2026-09-19T14:00:00' :
                l.createdAt?.includes('14/09') ? '2026-09-14T11:00:00' :
                l.createdAt?.includes('10/09') ? '2026-09-10T15:00:00' :
                new Date().toISOString();
              return { ...l, dateIso: defaultIso };
            }
            return l;
          });
        }
      } catch {
        return INITIAL_LEADS;
      }
    }
    return INITIAL_LEADS;
  });

  const [team, setTeam] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('autocrm_team');
    return saved ? JSON.parse(saved) : INITIAL_TEAM;
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('autocrm_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Save to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem('autocrm_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('autocrm_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('autocrm_team', JSON.stringify(team));
  }, [team]);

  useEffect(() => {
    localStorage.setItem('autocrm_settings', JSON.stringify(settings));
  }, [settings]);

  // Vehicle Handlers
  const handleAddVehicle = (newVehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const created: Vehicle = {
      ...newVehicle,
      id: `car-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setVehicles(prev => [created, ...prev]);
  };

  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  // Lead Handlers
  const handleAddLead = (newLead: Omit<Lead, 'id' | 'createdAt' | 'lastContactAt'>) => {
    const now = new Date();
    const formattedTime = `Hoje às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const created: Lead = {
      ...newLead,
      id: `lead-${Date.now()}`,
      createdAt: formattedTime,
      lastContactAt: formattedTime,
      dateIso: now.toISOString(),
    };
    setLeads(prev => [created, ...prev]);
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const handleDeleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLeadStage = (leadId: string, newStage: LeadStage) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          stage: newStage,
          lastContactAt: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        };
      }
      return l;
    }));
  };

  // Team Handlers
  const handleAddTeamMember = (newMember: Omit<TeamMember, 'id' | 'joinedDate'>, _password?: string) => {
    const created: TeamMember = {
      ...newMember,
      id: `team-${Date.now()}`,
      joinedDate: 'Hoje',
    };
    setTeam(prev => [...prev, created]);
  };

  const handleUpdateTeamMember = (updatedMember: TeamMember) => {
    setTeam(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
  };

  const handleDeleteTeamMember = (id: string) => {
    setTeam(prev => prev.filter(m => m.id !== id));
  };

  // Settings Handler
  const handleSaveSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
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

          {activeSection === 'equipe' && (
            <EquipeView
              team={team}
              onAddMember={handleAddTeamMember}
              onUpdateMember={handleUpdateTeamMember}
              onDeleteMember={handleDeleteTeamMember}
            />
          )}

          {activeSection === 'ajustes' && (
            <AjustesView
              settings={settings}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
