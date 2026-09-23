import { Lead, DashboardPeriod } from '../types';

/**
 * Retorna a data atual de referência da aplicação
 */
export const getNow = (): Date => {
  return new Date();
};

/**
 * Converte data para string no formato YYYY-MM-DD para inputs HTML
 */
export const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converte string YYYY-MM-DD para objeto Date
 */
export const fromDateInputValue = (str: string, isEndOfDay = false): Date => {
  if (!str) return getNow();
  const parts = str.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  if (isEndOfDay) {
    return new Date(year, month, day, 23, 59, 59, 999);
  }
  return new Date(year, month, day, 0, 0, 0, 0);
};

/**
 * Converte e interpreta a data de criação de um Lead para um objeto Date
 */
export const parseLeadDate = (lead: Lead): Date => {
  if (lead.dateIso) {
    const d = new Date(lead.dateIso);
    if (!isNaN(d.getTime())) return d;
  }

  const str = lead.createdAt || '';
  const now = getNow();
  const currentYear = now.getFullYear();

  if (str.includes('Hoje')) {
    const d = new Date(now);
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
    }
    return d;
  }

  if (str.includes('Ontem')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
    }
    return d;
  }

  // Padrão DD/MM ou DD/MM/AAAA
  const dateMatch = str.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = dateMatch[3]
      ? dateMatch[3].length === 2
        ? 2000 + parseInt(dateMatch[3], 10)
        : parseInt(dateMatch[3], 10)
      : currentYear;

    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    const hours = timeMatch ? parseInt(timeMatch[1], 10) : 12;
    const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    return new Date(year, month, day, hours, minutes, 0, 0);
  }

  // Tenta parse direto
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  return now;
};

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
  badge: string;
  formattedRange: string;
}

/**
 * Calcula intervalo de datas para cada período selecionado
 */
export const calculatePeriodRange = (
  period: DashboardPeriod,
  customStartDate?: string,
  customEndDate?: string
): PeriodRange => {
  const now = getNow();

  switch (period) {
    case 'dia': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const dayStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      return {
        start,
        end,
        label: 'Hoje (Dia)',
        badge: 'Diário',
        formattedRange: `${dayStr} (00:00 às 23:59)`
      };
    }

    case 'semanal': {
      // Últimos 7 dias completos até o final do dia de hoje
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: 'Semanal (Últimos 7 dias)',
        badge: 'Semanal',
        formattedRange: `${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`
      };
    }

    case 'mensal': {
      // Início do mês atual até o final do dia de hoje
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const monthName = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return {
        start,
        end,
        label: 'Mensal (Este Mês)',
        badge: 'Mensal',
        formattedRange: `01/${String(start.getMonth() + 1).padStart(2, '0')} até ${end.toLocaleDateString('pt-BR')} (${monthName})`
      };
    }

    case 'anual': {
      // Início do ano atual até o final do dia de hoje
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Anual (${now.getFullYear()})`,
        badge: 'Anual',
        formattedRange: `01/01/${now.getFullYear()} até ${end.toLocaleDateString('pt-BR')}`
      };
    }

    case 'personalizado': {
      const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 0, 0, 0, 0);
      const start = customStartDate ? fromDateInputValue(customStartDate, false) : defaultStart;
      const end = customEndDate ? fromDateInputValue(customEndDate, true) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      return {
        start,
        end,
        label: 'Personalizado',
        badge: 'Personalizado',
        formattedRange: `${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`
      };
    }

    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: 'Mensal',
        badge: 'Mensal',
        formattedRange: `${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`
      };
    }
  }
};
