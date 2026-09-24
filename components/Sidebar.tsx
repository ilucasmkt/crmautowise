import React from 'react';
import {
  LayoutDashboard,
  Car,
  Users,
  Kanban,
  UserCheck,
  Settings,
  ChevronRight,
  Flame,
  Store,
  Sparkles,
  ExternalLink,
  Globe,
  LogOut,
  MessageSquare
} from 'lucide-react';
import { NavSection, TeamMember } from '../types';
import { getVisibleSections } from '../lib/permissions';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  leadsCount: number;
  stockCount: number;
  teamCount: number;
  storeName: string;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  role: TeamMember['role'];
  userName: string;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  leadsCount,
  stockCount,
  teamCount,
  storeName,
  isMobileOpen,
  onCloseMobile,
  role,
  userName,
  onSignOut,
}) => {
  const navItems: { id: NavSection; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    {
      id: 'inicio',
      label: 'Início',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'estoque',
      label: 'Estoque',
      icon: <Car className="w-5 h-5" />,
      badge: stockCount,
      badgeColor: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'leads',
      label: 'LEADS',
      icon: <Users className="w-5 h-5" />,
      badge: leadsCount,
      badgeColor: 'bg-emerald-500 text-white animate-pulse',
    },
    {
      id: 'crm',
      label: 'CRM',
      icon: <Kanban className="w-5 h-5" />,
      badge: 'Funil',
      badgeColor: 'bg-brand-500 text-white',
    },
    {
      id: 'hotsite',
      label: 'Hot Site',
      icon: <Globe className="w-5 h-5" />,
      badge: 'Landpages',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold',
    },
    {
      id: 'conversas',
      label: 'Conversas',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      id: 'equipe',
      label: 'Equipe',
      icon: <UserCheck className="w-5 h-5" />,
      badge: teamCount,
      badgeColor: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'ajustes',
      label: 'Ajustes',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const visibleSections = getVisibleSections(role);
  const visibleNavItems = navItems.filter((item) => visibleSections.includes(item.id));

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div 
          id="sidebar-backdrop"
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
              <Car className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-white tracking-tight">Auto Wise</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">CRM</span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[140px]" title={storeName}>
                {storeName || 'Loja de Veículos'}
              </p>
            </div>
          </div>
        </div>

        {/* Store Active Status Card */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">Meta Ads Conectado</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              Pixel Ativo
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Menu Principal
          </div>

          {visibleNavItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold leading-tight ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-brand-200" />}
                </div>
              </button>
            );
          })}

          <div className="pt-4 px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ações Rápidas
          </div>

          <div className="space-y-1 px-1">
            <button 
              id="quick-add-lead-btn"
              onClick={() => {
                onSelectSection('leads');
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Leads Quentes</span>
            </button>
            <button 
              id="quick-inventory-btn"
              onClick={() => {
                onSelectSection('estoque');
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            >
              <Store className="w-3.5 h-3.5 text-blue-400" />
              <span>Verificar Estoque</span>
            </button>
          </div>
        </div>

        {/* User Account & Store Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {userName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate">{role}</p>
            </div>
            {visibleSections.includes('ajustes') && (
              <button
                id="user-settings-shortcut"
                onClick={() => {
                  onSelectSection('ajustes');
                  onCloseMobile();
                }}
                title="Ajustes da conta"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              id="sign-out-btn"
              onClick={onSignOut}
              title="Sair"
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
