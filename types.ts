export type NavSection = 'inicio' | 'estoque' | 'leads' | 'crm' | 'hotsite' | 'equipe' | 'ajustes';

export type HotSiteIntent = 'a_vista' | 'financiamento' | 'troca';

export interface HotSiteLeadSubmission {
  vehicleId: string;
  vehicleName: string;
  intent: HotSiteIntent;
  customerName: string;
  phone: string;
  downPayment?: number; // for financing
  installments?: number; // for financing
  tradeInModel?: string; // for trade-in
  tradeInYear?: number;
  tradeInKm?: number;
  notes?: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  modelYear: number;
  mileage: number;
  price: number;
  fipePrice?: number;
  fuel: 'Flex' | 'Gasolina' | 'Diesel' | 'Híbrido' | 'Elétrico';
  transmission: 'Automático' | 'Manual' | 'CVT';
  color: string;
  plate: string;
  status: 'disponivel' | 'reservado' | 'vendido';
  imageUrl: string;
  images?: string[]; // Multiple photos gallery for slides
  features: string[];
  createdAt: string;
}

export type LeadSource = 'Meta Ads' | 'Google Ads' | 'WhatsApp' | 'Site Loja' | 'Webmotors' | 'Indicação';

export type LeadTemperature = 'quente' | 'morno' | 'frio';

export type LeadStage = 
  | 'novo'
  | 'contato'
  | 'sem_resposta'
  | 'agendamento'
  | 'proposta'
  | 'negociacao'
  | 'ganho'
  | 'perdido';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  interestedVehicle: string;
  vehiclePrice?: number;
  source: LeadSource;
  stage: LeadStage;
  temperature: LeadTemperature;
  assignedTo: string; // Team member name
  notes: string;
  createdAt: string;
  lastContactAt: string;
  value?: number;
  dateIso?: string; // Formato ISO 8601 YYYY-MM-DDTHH:mm:ss para filtros temporais precisos
}

export type DashboardPeriod = 'dia' | 'semanal' | 'mensal' | 'anual' | 'personalizado';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Administrador' | 'Gerente de Vendas' | 'Consultor de Vendas' | 'Atendimento / BDC';
  status: 'ativo' | 'inativo';
  salesCount: number;
  leadsActive: number;
  targetSales: number;
  avatarColor: string;
  joinedDate: string;
  whatsappStatus?: 'conectado' | 'desconectado' | 'sincronizando';
  whatsappConnectedNumber?: string;
  whatsappSessionId?: string;
  whatsappBattery?: number;
  whatsappConnectedAt?: string;
}

export interface WorkingDayHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface StoreSettings {
  storeName: string;
  legalName: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  logoUrl?: string; // Logotipo da concessionária para o Hot Site e sistema
  metaPixelId: string;
  metaAccessToken: string;
  googleTagManagerId: string;
  enablePixelEvents: boolean;
  workingHours: WorkingDayHours[];
}
