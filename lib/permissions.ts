import { NavSection, TeamMember } from '../types';

export type Role = TeamMember['role'];

const SECTION_ACCESS: Record<NavSection, Role[]> = {
  inicio: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  estoque: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  leads: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  crm: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  hotsite: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  conversas: ['Administrador', 'Gerente de Vendas', 'Consultor de Vendas', 'Atendimento / BDC'],
  equipe: ['Administrador', 'Gerente de Vendas'],
  ajustes: ['Administrador', 'Gerente de Vendas'],
};

export function canAccessSection(role: Role, section: NavSection): boolean {
  return SECTION_ACCESS[section].includes(role);
}

export function getVisibleSections(role: Role): NavSection[] {
  return (Object.keys(SECTION_ACCESS) as NavSection[]).filter((section) =>
    canAccessSection(role, section)
  );
}

export function canEditStoreSettings(role: Role): boolean {
  return role === 'Administrador';
}

export function canDeleteTeamMember(role: Role): boolean {
  return role === 'Administrador';
}
