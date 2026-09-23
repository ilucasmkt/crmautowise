import { describe, it, expect } from 'vitest';
import {
  canAccessSection,
  getVisibleSections,
  canEditStoreSettings,
  canDeleteTeamMember,
} from './permissions';

describe('canAccessSection', () => {
  it('allows Consultor de Vendas into leads but not equipe', () => {
    expect(canAccessSection('Consultor de Vendas', 'leads')).toBe(true);
    expect(canAccessSection('Consultor de Vendas', 'equipe')).toBe(false);
  });

  it('allows Administrador everywhere', () => {
    expect(canAccessSection('Administrador', 'ajustes')).toBe(true);
    expect(canAccessSection('Administrador', 'equipe')).toBe(true);
  });

  it('blocks Atendimento / BDC from ajustes and equipe', () => {
    expect(canAccessSection('Atendimento / BDC', 'ajustes')).toBe(false);
    expect(canAccessSection('Atendimento / BDC', 'equipe')).toBe(false);
  });

  it('allows Gerente de Vendas into equipe and ajustes', () => {
    expect(canAccessSection('Gerente de Vendas', 'equipe')).toBe(true);
    expect(canAccessSection('Gerente de Vendas', 'ajustes')).toBe(true);
  });
});

describe('getVisibleSections', () => {
  it('excludes equipe and ajustes for Consultor de Vendas', () => {
    const sections = getVisibleSections('Consultor de Vendas');
    expect(sections).not.toContain('equipe');
    expect(sections).not.toContain('ajustes');
    expect(sections).toContain('inicio');
    expect(sections).toContain('estoque');
    expect(sections).toContain('leads');
    expect(sections).toContain('crm');
    expect(sections).toContain('hotsite');
  });

  it('includes every section for Administrador', () => {
    expect(getVisibleSections('Administrador')).toHaveLength(7);
  });
});

describe('canEditStoreSettings', () => {
  it('only Administrador can edit', () => {
    expect(canEditStoreSettings('Administrador')).toBe(true);
    expect(canEditStoreSettings('Gerente de Vendas')).toBe(false);
    expect(canEditStoreSettings('Consultor de Vendas')).toBe(false);
  });
});

describe('canDeleteTeamMember', () => {
  it('only Administrador can delete', () => {
    expect(canDeleteTeamMember('Administrador')).toBe(true);
    expect(canDeleteTeamMember('Gerente de Vendas')).toBe(false);
  });
});
