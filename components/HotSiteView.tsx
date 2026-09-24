import React, { useState } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Copy, 
  Check, 
  Smartphone, 
  Laptop, 
  Car, 
  Flame, 
  MessageSquare, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  DollarSign, 
  Calculator, 
  RefreshCw, 
  Send, 
  ChevronRight, 
  ChevronLeft,
  ArrowRight, 
  X,
  Share2,
  Calendar,
  Fuel,
  Gauge,
  Tag,
  Phone,
  HelpCircle,
  Eye,
  Maximize2,
  Layers,
  Link as LinkIcon,
  Sliders,
  Settings as SettingsIcon,
  HelpCircle as HelpIcon,
  Activity,
  Code
} from 'lucide-react';
import { Vehicle, Lead, StoreSettings, HotSiteIntent } from '../types';
import { formatCurrency } from '../lib/format';

interface HotSiteViewProps {
  vehicles: Vehicle[];
  settings: StoreSettings;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'lastContactAt'>) => void;
  onNavigateToLeads: () => void;
}

export const HotSiteView: React.FC<HotSiteViewProps> = ({
  vehicles,
  settings,
  onAddLead,
  onNavigateToLeads,
}) => {
  // Currently selected car for the Hot Site preview
  const [selectedCarId, setSelectedCarId] = useState<string>(vehicles[0]?.id || '');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('desktop');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isFullPageTabOpen, setIsFullPageTabOpen] = useState<boolean>(false);

  // Live Landing Page Lead Modal
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<HotSiteIntent | null>(null);

  // Form states for the 3 branches
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Branch: Financiamento
  const [downPayment, setDownPayment] = useState<number>(30000);
  const [installments, setInstallments] = useState<number>(48);

  // Branch: Troca
  const [tradeInCar, setTradeInCar] = useState('Hyundai HB20 1.0 Comfort');
  const [tradeInYear, setTradeInYear] = useState(2021);
  const [tradeInKm, setTradeInKm] = useState('42.000');
  const [tradeInDebt, setTradeInDebt] = useState('Quitado');

  // Success Feedback
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [generatedWhatsAppUrl, setGeneratedWhatsAppUrl] = useState<string>('');
  const [metaPixelFired, setMetaPixelFired] = useState<boolean>(false);

  // Campaign UTM & Link Generator Builder State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignCarForModal, setCampaignCarForModal] = useState<Vehicle | null>(null);
  const [utmSource, setUtmSource] = useState('meta_ads');
  const [utmMedium, setUtmMedium] = useState('instagram_feed');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('video_reels_01');

  const selectedCar = vehicles.find(v => v.id === selectedCarId) || vehicles[0];

  // Generate clean slug for the landing page
  const getCarSlug = (car: Vehicle) => {
    return `${car.brand.toLowerCase()}-${car.model.toLowerCase()}-${car.year}`.replace(/[^a-z0-9]/g, '-');
  };

  const getHotSiteUrl = (car: Vehicle, customCampaign?: string, customMedium?: string, customSource?: string, customContent?: string) => {
    const slug = getCarSlug(car);
    const source = customSource || 'meta_ads';
    const medium = customMedium || 'instagram_feed';
    const campaign = customCampaign || `hotsite_${car.brand.toLowerCase()}_${car.model.toLowerCase()}`;
    const content = customContent ? `&utm_content=${encodeURIComponent(customContent)}` : '';
    return `https://autowise.app/lp/${slug}?utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}${content}`;
  };

  const handleOpenCampaignModal = (car: Vehicle) => {
    setCampaignCarForModal(car);
    setUtmCampaign(`hotsite_${car.brand.toLowerCase()}_${car.model.toLowerCase()}`);
    setIsCampaignModalOpen(true);
  };

  const handleCopyLink = (car: Vehicle) => {
    const url = getHotSiteUrl(car);
    navigator.clipboard.writeText(url);
    setCopiedSlug(car.id);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // Financing calculation helper
  const calculateInstallment = (carPrice: number, down: number, months: number) => {
    const loanAmount = Math.max(1000, carPrice - down);
    // Typical Brazilian auto loan monthly rate ~1.49% a.m.
    const monthlyRate = 0.0149;
    const factor = (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const installmentValue = loanAmount * factor;
    return Math.round(installmentValue);
  };

  const currentMonthlyInstallment = selectedCar 
    ? calculateInstallment(selectedCar.price, downPayment, installments)
    : 0;

  // Trigger when customer clicks CTA on Hot Site
  const handleOpenQualification = () => {
    setSelectedIntent(null);
    setCustomerName('');
    setCustomerPhone('(11) 9');
    setSubmissionSuccess(false);
    setMetaPixelFired(false);
    setIsLeadModalOpen(true);
  };

  // Handle final submission of questionnaire
  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCar || !selectedIntent) return;

    let intentDescription = '';
    let notes = '';
    let messageText = '';

    if (selectedIntent === 'a_vista') {
      intentDescription = 'Compra À VISTA';
      notes = `Lead do Hot Site interessado em comprar À VISTA com proposta de desconto. Valor do carro: ${formatCurrency(selectedCar.price)}.`;
      messageText = `Olá! Vi o anúncio no Hot Site da Auto Wise sobre o *${selectedCar.brand} ${selectedCar.model}* (${selectedCar.year}) anunciado por ${formatCurrency(selectedCar.price)}. Gostaria de comprar *À VISTA*, quais as condições especiais e disponibilidade do carro?`;
    } else if (selectedIntent === 'financiamento') {
      intentDescription = `Financiamento (${installments}x de ${formatCurrency(currentMonthlyInstallment)})`;
      notes = `Simulação no Hot Site: Entrada de ${formatCurrency(downPayment)} + ${installments} parcelas estimadas de ${formatCurrency(currentMonthlyInstallment)}/mês.`;
      messageText = `Olá! Vi o Hot Site do *${selectedCar.brand} ${selectedCar.model}*. Fiz uma simulação dando *${formatCurrency(downPayment)} de entrada* e gostaria de financiar em *${installments}x*. Poderiam analisar meu crédito? Meu nome é ${customerName}.`;
    } else if (selectedIntent === 'troca') {
      intentDescription = `Troca com ${tradeInCar}`;
      notes = `Interessado em dar veículo na troca: ${tradeInCar} (${tradeInYear}, ${tradeInKm} km, ${tradeInDebt}).`;
      messageText = `Olá! Vi o Hot Site da Auto Wise sobre o *${selectedCar.brand} ${selectedCar.model}*. Quero oferecer meu *${tradeInCar} (${tradeInYear}, ${tradeInKm} km)* na troca. Como funciona a avaliação?`;
    }

    // 1. Create Lead in CRM
    onAddLead({
      name: customerName.trim() || 'Lead Hot Site',
      phone: customerPhone.trim() || '(11) 98888-0000',
      email: '',
      interestedVehicle: `${selectedCar.brand} ${selectedCar.model} ${selectedCar.version}`,
      vehiclePrice: selectedCar.price,
      value: selectedCar.price,
      source: 'Meta Ads',
      stage: 'novo',
      temperature: 'quente',
      assignedTo: 'Juliana Ferreira',
      notes: `[HOT SITE - ${intentDescription}]\n${notes}`,
    });

    // 2. Prepare WhatsApp Link
    const cleanStorePhone = settings.whatsapp ? settings.whatsapp.replace(/\D/g, '') : '11998765432';
    const waUrl = `https://wa.me/55${cleanStorePhone}?text=${encodeURIComponent(messageText)}`;
    setGeneratedWhatsAppUrl(waUrl);

    // 3. Fire Real and Visual Meta Pixel Events
    try {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: `${selectedCar.brand} ${selectedCar.model}`,
          content_category: 'Veículos',
          value: selectedCar.price,
          currency: 'BRL',
          intent: selectedIntent,
        });
      }
    } catch (err) {
      console.warn('Meta Pixel fbq error:', err);
    }

    setMetaPixelFired(true);
    setSubmissionSuccess(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border border-slate-700/60 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.25),transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Hot Site & Landing Pages
              </span>
              <span className="text-xs text-slate-400">Páginas dedicadas para campanhas de anúncios</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Páginas de Alta Conversão por Veículo
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              O Auto Wise gera automaticamente um <strong>Hot Site</strong> exclusivo para cada carro do seu estoque. Quando o cliente clica no anúncio da Meta ou Google, ele cai na página com o questionário de qualificação que já envia o lead pronto pro seu CRM.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const el = document.getElementById('hotsite-preview-anchor');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-extrabold shadow-md transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Ver Landing Page Ao Vivo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catalog of Generated Landing Pages */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-brand-600" />
              <span>Landing Pages Geradas ({vehicles.length} Veículos)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Copie o link com parâmetros UTM para colar nas suas campanhas do Gerenciador de Anúncios da Meta
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-600 font-semibold">Todas as {vehicles.length} páginas com Pixel ativo</span>
          </div>
        </div>

        {/* Carousel / Cards of cars with Hot Sites */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((car) => {
            const isSelected = car.id === selectedCar?.id;
            const isCopied = copiedSlug === car.id;

            return (
              <div
                key={car.id}
                onClick={() => setSelectedCarId(car.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={car.imageUrl}
                    alt={car.model}
                    className="w-16 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-brand-600 tracking-wider">
                        {car.brand}
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-white">
                          Ativo no Preview
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{car.model}</h3>
                    <p className="text-xs text-slate-600 font-bold">{formatCurrency(car.price)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[170px]">
                    /lp/{getCarSlug(car)}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCampaignModal(car);
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 flex items-center gap-1 transition-colors shrink-0"
                    title="Configurar UTM e Link para Meta Ads"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    <span>Gerar Link Meta Ads</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLink(car);
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors shrink-0"
                    title="Copiar Link Rápido com UTM Padrão"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Landing Page Preview Section */}
      <div id="hotsite-preview-anchor" className="space-y-4">
        {/* Preview Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulação da Landpage:</span>
            <span className="text-sm font-extrabold text-slate-900">
              {selectedCar?.brand} {selectedCar?.model} ({selectedCar?.year})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Switch Device Mode */}
            {/* Switch Device Mode & Open New Tab Link */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  deviceMode === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  deviceMode === 'mobile' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>

            <button
              id="open-hotsite-tab-btn"
              onClick={() => setIsFullPageTabOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Abrir Hot Site em visualização de aba / tela cheia"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Hot Site em Nova Aba</span>
            </button>

            <button
              onClick={() => handleOpenCampaignModal(selectedCar)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Configurar Parâmetros de Campanha Meta Ads e Copiar Link"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Gerar Link Meta Ads</span>
            </button>

            <button
              onClick={() => handleCopyLink(selectedCar)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Link Rápido</span>
            </button>
          </div>
        </div>

        {/* The Actual Simulated Landing Page Frame */}
        <div className={`mx-auto transition-all duration-300 ${
          deviceMode === 'mobile' ? 'max-w-md' : 'w-full'
        }`}>
          <div className="bg-white rounded-3xl border-2 border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            {/* Fake Browser / Ad Bar */}
            <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-white text-xs border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-[11px] text-slate-400 truncate max-w-[240px]">
                  autowise.app/lp/{getCarSlug(selectedCar)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullPageTabOpen(true)}
                  className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Expandir Aba</span>
                </button>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  SSL Seguro • Pixel Ativo
                </span>
              </div>
            </div>

            {/* Landing Page Content - ORDER: Barra com Nome/Logo -> Slides das Fotos -> Botão Verde WhatsApp -> Infos do Carro */}
            {(() => {
              const carPhotos = (selectedCar?.images && selectedCar.images.length > 0)
                ? selectedCar.images
                : [
                    selectedCar?.imageUrl,
                    'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'
                  ].filter(Boolean) as string[];

              const activeIdx = currentSlideIndex % carPhotos.length;
              const activePhoto = carPhotos[activeIdx] || selectedCar?.imageUrl;

              return (
                <div className="bg-slate-50 text-slate-900">
                  {/* 1. BARRA COM NOME E LOGO COMO JÁ ESTÁ */}
                  <header className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt={settings.storeName}
                          className="h-10 max-w-[130px] object-contain rounded-lg border border-slate-100 p-0.5 bg-white shadow-2xs"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
                          <Car className="w-5 h-5 text-amber-400" />
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-black text-slate-900 tracking-tight block">
                          {settings.storeName}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Consultores Online no WhatsApp
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Plantão da Loja</span>
                      <span className="text-xs font-extrabold text-slate-800">{settings.whatsapp || '(11) 99876-5432'}</span>
                    </div>
                  </header>

                  <div className="p-5 sm:p-6 space-y-4">
                    {/* 2. SLIDES DAS FOTOS DO CARRO */}
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden shadow-xl bg-slate-950 h-72 sm:h-96 group">
                        {/* Current slide photo */}
                        <img
                          src={activePhoto}
                          alt={`${selectedCar.brand} ${selectedCar.model} - Foto ${activeIdx + 1}`}
                          className="w-full h-full object-cover transition-all duration-500 ease-in-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />

                        {/* Slide Badges */}
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Oportunidade Única
                          </span>
                        </div>

                        {/* Photo counter badge */}
                        <div className="absolute top-4 right-4 z-10">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-950/80 text-white border border-white/20 backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <span>Foto {activeIdx + 1} de {carPhotos.length}</span>
                          </span>
                        </div>

                        {/* Navigation Arrows for Slides */}
                        {carPhotos.length > 1 && (
                          <>
                            <button
                              id="hotsite-prev-slide-btn"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : carPhotos.length - 1));
                              }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-lg hover:scale-110 z-10 border border-white/20"
                              title="Foto Anterior"
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </button>

                            <button
                              id="hotsite-next-slide-btn"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentSlideIndex((prev) => (prev < carPhotos.length - 1 ? prev + 1 : 0));
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-lg hover:scale-110 z-10 border border-white/20"
                              title="Próxima Foto"
                            >
                              <ChevronRight className="w-6 h-6" />
                            </button>
                          </>
                        )}

                        {/* Quick Car Title Overlay in Slide Bottom */}
                        <div className="absolute bottom-4 left-4 right-4 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-2 z-10">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                              {selectedCar.brand}
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black leading-tight drop-shadow-md">
                              {selectedCar.model}
                            </h2>
                            <p className="text-xs text-slate-200 drop-shadow-xs">{selectedCar.version}</p>
                          </div>

                          <div className="sm:text-right">
                            <span className="text-[11px] text-slate-300 block font-medium">Preço à Vista</span>
                            <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                              {formatCurrency(selectedCar.price)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Thumbnail navigation strip */}
                      {carPhotos.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                          {carPhotos.map((photo, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => setCurrentSlideIndex(pIdx)}
                              className={`relative rounded-lg overflow-hidden border-2 h-14 w-20 shrink-0 transition-all ${
                                pIdx === activeIdx
                                  ? 'border-emerald-500 ring-2 ring-emerald-400/40 scale-105 shadow-xs'
                                  : 'border-slate-300 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={photo} alt="" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white bg-black/70 px-1 rounded">
                                {pIdx + 1}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. BOTÃO NA COR VERDE COM A LOGO DO WHATSAPP (MAIS PERTO DAS FOTOS) */}
                    <div className="pt-1 pb-1">
                      <button
                        id="hotsite-whatsapp-primary-cta"
                        onClick={handleOpenQualification}
                        className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-base sm:text-lg font-black shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 group border-2 border-emerald-400/40"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Phone className="w-5 h-5 fill-white text-white" />
                        </div>
                        <div className="text-center">
                          <span className="block leading-tight font-black tracking-tight text-white drop-shadow-xs">
                            Falar Conosco no WhatsApp
                          </span>
                          <span className="text-[11px] font-medium text-emerald-100 block">
                            Comprar à vista, simular parcelas ou carro na troca
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-semibold mt-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Resposta rápida garantida pela equipe da loja</span>
                      </div>
                    </div>

                    {/* 4. INFOS COMO JÁ ESTÁ */}
                    {/* Key Specs Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs text-center">
                        <Calendar className="w-4 h-4 text-brand-600 mx-auto mb-1" />
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Ano</span>
                        <span className="text-sm font-bold text-slate-900">{selectedCar.year}/{selectedCar.modelYear}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs text-center">
                        <Gauge className="w-4 h-4 text-brand-600 mx-auto mb-1" />
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Quilometragem</span>
                        <span className="text-sm font-bold text-slate-900">{selectedCar.mileage.toLocaleString('pt-BR')} km</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs text-center">
                        <Fuel className="w-4 h-4 text-brand-600 mx-auto mb-1" />
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Combustível</span>
                        <span className="text-sm font-bold text-slate-900">{selectedCar.fuel}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs text-center">
                        <Car className="w-4 h-4 text-brand-600 mx-auto mb-1" />
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Câmbio</span>
                        <span className="text-sm font-bold text-slate-900">{selectedCar.transmission}</span>
                      </div>
                    </div>

                    {/* Dealer Guarantee & Trust Badges */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Garantia & Procedência {settings.storeName}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Laudo Cautelar 100% Aprovado</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>1 Ano de Garantia de Motor e Câmbio</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>IPVA 2024 Totalmente Pago</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Aceitamos seu veículo usado na troca</span>
                        </div>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Equipamentos & Opcionais
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCar.features.map(f => (
                          <span key={f} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800">
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Secondary WhatsApp CTA Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white text-center shadow-xl space-y-4">
                      <span className="text-amber-400 font-extrabold text-xs tracking-wider uppercase">
                        Condições Especiais Para Este {selectedCar.model}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black">
                        Negocie direto com nosso consultor no WhatsApp
                      </h3>
                      <p className="text-xs text-slate-300 max-w-md mx-auto">
                        Escolha se quer comprar à vista com desconto, simular parcelas do financiamento ou avaliar seu carro na troca.
                      </p>

                      <button
                        id="hotsite-secondary-cta-btn"
                        onClick={handleOpenQualification}
                        className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-base font-black shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mx-auto"
                      >
                        <Phone className="w-5 h-5 fill-white" />
                        <span>Falar Conosco no WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* LP Footer */}
                  <footer className="bg-white border-t border-slate-200 p-6 text-center text-xs text-slate-500">
                    {settings.logoUrl && (
                      <img
                        src={settings.logoUrl}
                        alt={settings.storeName}
                        className="h-8 max-w-[120px] object-contain mx-auto mb-2 opacity-90"
                      />
                    )}
                    <p className="font-bold text-slate-800">{settings.storeName} • Auto Wise</p>
                    <p className="mt-1">{settings.address} - {settings.city}/{settings.state}</p>
                    <p className="text-[11px] text-slate-400 mt-2">© {new Date().getFullYear()} Todos os direitos reservados.</p>
                  </footer>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Full Page Landing Page View (Modo Nova Aba) */}
      {isFullPageTabOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-y-auto">
          {/* Top Browser Simulation Bar */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 text-white flex items-center justify-between sticky top-0 z-30 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIsFullPageTabOpen(false)}
                  className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors"
                  title="Fechar Aba"
                />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>

              <div className="bg-slate-900 px-4 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 text-xs font-mono text-slate-300">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>https://autowise.app/lp/{getCarSlug(selectedCar)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCopyLink(selectedCar)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Link</span>
              </button>

              <button
                onClick={() => setIsFullPageTabOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Voltar ao Painel</span>
              </button>
            </div>
          </div>

          {/* Full Screen LP Content */}
          <div className="bg-slate-100 flex-1">
            <div className="max-w-4xl mx-auto bg-white min-h-screen shadow-2xl">
              {(() => {
                const carPhotos = (selectedCar?.images && selectedCar.images.length > 0)
                  ? selectedCar.images
                  : [
                      selectedCar?.imageUrl,
                      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
                      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'
                    ].filter(Boolean) as string[];

                const activeIdx = currentSlideIndex % carPhotos.length;
                const activePhoto = carPhotos[activeIdx] || selectedCar?.imageUrl;

                return (
                  <div className="bg-slate-50 text-slate-900 pb-16">
                    {/* 1. BARRA COM NOME E LOGO COMO JÁ ESTÁ */}
                    <header className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-xs">
                      <div className="flex items-center gap-3">
                        {settings.logoUrl ? (
                          <img
                            src={settings.logoUrl}
                            alt={settings.storeName}
                            className="h-11 max-w-[150px] object-contain rounded-lg border border-slate-100 p-0.5 bg-white shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
                            <Car className="w-5 h-5 text-amber-400" />
                          </div>
                        )}
                        <div>
                          <span className="text-base font-black text-slate-900 tracking-tight block">
                            {settings.storeName}
                          </span>
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Consultores de Plantão Online no WhatsApp
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">WhatsApp da Loja</span>
                        <span className="text-sm font-extrabold text-slate-800">{settings.whatsapp || '(11) 99876-5432'}</span>
                      </div>
                    </header>

                    <div className="p-6 sm:p-8 space-y-5 max-w-3xl mx-auto">
                      {/* 2. SLIDES DAS FOTOS DO CARRO */}
                      <div className="space-y-3">
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-slate-950 h-80 sm:h-[460px] group">
                          <img
                            src={activePhoto}
                            alt={`${selectedCar.brand} ${selectedCar.model}`}
                            className="w-full h-full object-cover transition-all duration-500 ease-in-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                          {/* Slide Badges */}
                          <div className="absolute top-5 left-5 flex flex-wrap gap-2 z-10">
                            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-md flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" /> Oferta Especial
                            </span>
                          </div>

                          {/* Photo counter */}
                          <div className="absolute top-5 right-5 z-10">
                            <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-slate-950/80 text-white border border-white/20 backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                              <Layers className="w-4 h-4 text-amber-400" />
                              <span>Foto {activeIdx + 1} de {carPhotos.length}</span>
                            </span>
                          </div>

                          {/* Navigation Arrows */}
                          {carPhotos.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : carPhotos.length - 1))}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-xl hover:scale-110 z-10 border border-white/20"
                                title="Foto Anterior"
                              >
                                <ChevronLeft className="w-7 h-7" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setCurrentSlideIndex((prev) => (prev < carPhotos.length - 1 ? prev + 1 : 0))}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-xl hover:scale-110 z-10 border border-white/20"
                                title="Próxima Foto"
                              >
                                <ChevronRight className="w-7 h-7" />
                              </button>
                            </>
                          )}

                          {/* Car model overlay */}
                          <div className="absolute bottom-5 left-5 right-5 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3 z-10">
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                {selectedCar.brand}
                              </span>
                              <h1 className="text-3xl sm:text-4xl font-black leading-tight drop-shadow-md">
                                {selectedCar.model}
                              </h1>
                              <p className="text-sm text-slate-200">{selectedCar.version}</p>
                            </div>

                            <div className="sm:text-right">
                              <span className="text-xs text-slate-300 block font-semibold">Valor À Vista</span>
                              <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">
                                {formatCurrency(selectedCar.price)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Thumbnails */}
                        {carPhotos.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                            {carPhotos.map((photo, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setCurrentSlideIndex(pIdx)}
                                className={`relative rounded-xl overflow-hidden border-2 h-16 w-24 shrink-0 transition-all ${
                                  pIdx === activeIdx
                                    ? 'border-emerald-500 ring-2 ring-emerald-400/40 scale-105 shadow-md'
                                    : 'border-slate-300 opacity-70 hover:opacity-100'
                                }`}
                              >
                                <img src={photo} alt="" className="w-full h-full object-cover" />
                                <span className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/75 px-1.5 py-0.5 rounded">
                                  {pIdx + 1}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 3. BOTÃO NA COR VERDE COM A LOGO DO WHATSAPP (MAIS PERTO DAS FOTOS) */}
                      <div className="pt-2 pb-2">
                        <button
                          onClick={handleOpenQualification}
                          className="w-full py-5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-lg sm:text-xl font-black shadow-2xl shadow-emerald-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 group border-2 border-emerald-400/40"
                        >
                          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Phone className="w-6 h-6 fill-white text-white" />
                          </div>
                          <div className="text-center">
                            <span className="block leading-tight font-black tracking-tight text-white drop-shadow-xs">
                              Falar Conosco no WhatsApp
                            </span>
                            <span className="text-xs font-medium text-emerald-100 block">
                              Comprar à vista, simular parcelas ou carro na troca
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-semibold mt-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>Atendimento imediato direto com o vendedor responsável</span>
                        </div>
                      </div>

                      {/* 4. INFOS COMO JÁ ESTÁ */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <Calendar className="w-5 h-5 text-brand-600 mx-auto mb-1" />
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Ano</span>
                          <span className="text-base font-bold text-slate-900">{selectedCar.year}/{selectedCar.modelYear}</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <Gauge className="w-5 h-5 text-brand-600 mx-auto mb-1" />
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Km</span>
                          <span className="text-base font-bold text-slate-900">{selectedCar.mileage.toLocaleString('pt-BR')} km</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <Fuel className="w-5 h-5 text-brand-600 mx-auto mb-1" />
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Combustível</span>
                          <span className="text-base font-bold text-slate-900">{selectedCar.fuel}</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <Car className="w-5 h-5 text-brand-600 mx-auto mb-1" />
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Câmbio</span>
                          <span className="text-base font-bold text-slate-900">{selectedCar.transmission}</span>
                        </div>
                      </div>

                      {/* Procedência */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Garantia & Procedência {settings.storeName}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Laudo Cautelar 100% Aprovado</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>1 Ano de Garantia de Motor e Câmbio</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>IPVA 2024 Totalmente Pago</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Aceitamos seu veículo usado na troca</span>
                          </div>
                        </div>
                      </div>

                      {/* Opcionais */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Equipamentos & Opcionais
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedCar.features.map(f => (
                            <span key={f} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800">
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <footer className="bg-white border-t border-slate-200 p-8 text-center text-xs text-slate-500 mt-10">
                      {settings.logoUrl && (
                        <img
                          src={settings.logoUrl}
                          alt={settings.storeName}
                          className="h-10 max-w-[140px] object-contain mx-auto mb-3 opacity-90"
                        />
                      )}
                      <p className="font-bold text-slate-800 text-sm">{settings.storeName} • Auto Wise</p>
                      <p className="mt-1">{settings.address} - {settings.city}/{settings.state}</p>
                      <p className="text-[11px] text-slate-400 mt-2">© {new Date().getFullYear()} Todos os direitos reservados.</p>
                    </footer>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Qualification Modal - Triggered when LEAD clicks CTA */}
      {isLeadModalOpen && (
        <div
          id="qualification-modal-backdrop"
          className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Interesse no {selectedCar.brand} {selectedCar.model}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">{formatCurrency(selectedCar.price)}</span>
                </div>
              </div>
              <button
                onClick={() => setIsLeadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {!submissionSuccess ? (
                <>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      Como você gostaria de negociar?
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Selecione a opção desejada para receber o atendimento personalizado:
                    </p>
                  </div>

                  {/* The 3 Intent Selection Cards */}
                  <div className="grid grid-cols-1 gap-3">
                    {/* Option 1: A Vista */}
                    <button
                      type="button"
                      onClick={() => setSelectedIntent('a_vista')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                        selectedIntent === 'a_vista'
                          ? 'border-brand-600 ring-2 ring-brand-600/20 bg-brand-50/40'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedIntent === 'a_vista' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">Gostaria de comprar À Vista</span>
                          {selectedIntent === 'a_vista' && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Quero negociar desconto especial e entrega imediata do veículo.
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Financiamento */}
                    <button
                      type="button"
                      onClick={() => setSelectedIntent('financiamento')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                        selectedIntent === 'financiamento'
                          ? 'border-brand-600 ring-2 ring-brand-600/20 bg-brand-50/40'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedIntent === 'financiamento' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <Calculator className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">Quero simular financiamento</span>
                          {selectedIntent === 'financiamento' && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Simular parcelas com ou sem entrada pelos principais bancos.
                        </p>
                      </div>
                    </button>

                    {/* Option 3: Troca */}
                    <button
                      type="button"
                      onClick={() => setSelectedIntent('troca')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                        selectedIntent === 'troca'
                          ? 'border-brand-600 ring-2 ring-brand-600/20 bg-brand-50/40'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedIntent === 'troca' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">Quero oferecer meu carro na Troca</span>
                          {selectedIntent === 'troca' && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Avaliação justa do meu veículo atual com troco na troca ou abatimento.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Branch Specific Form Details */}
                  {selectedIntent && (
                    <form onSubmit={handleSubmitLead} className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
                      {/* Form Details: Financiamento */}
                      {selectedIntent === 'financiamento' && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Valor de Entrada Sugerido:</span>
                            <span className="text-xs font-extrabold text-brand-700 font-mono">
                              {formatCurrency(downPayment)}
                            </span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max={selectedCar.price * 0.8}
                            step="5000"
                            value={downPayment}
                            onChange={(e) => setDownPayment(Number(e.target.value))}
                            className="w-full accent-brand-600"
                          />

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Número de Parcelas:
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                              {[24, 36, 48, 60].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setInstallments(m)}
                                  className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    installments === m
                                      ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {m}x
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-medium">Parcela Estimada:</span>
                            <span className="text-sm font-black text-slate-900">
                              {installments}x de {formatCurrency(currentMonthlyInstallment)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Form Details: Troca */}
                      {selectedIntent === 'troca' && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                          <span className="text-xs font-bold text-slate-800 block">
                            Dados do Seu Veículo na Troca:
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Modelo do seu carro</label>
                              <input
                                type="text"
                                required
                                value={tradeInCar}
                                onChange={(e) => setTradeInCar(e.target.value)}
                                placeholder="Ex: HB20 1.0, Onix, Ka..."
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Ano</label>
                              <input
                                type="number"
                                required
                                value={tradeInYear}
                                onChange={(e) => setTradeInYear(Number(e.target.value))}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">KM aproximado</label>
                              <input
                                type="text"
                                value={tradeInKm}
                                onChange={(e) => setTradeInKm(e.target.value)}
                                placeholder="Ex: 50.000"
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Situação</label>
                              <select
                                value={tradeInDebt}
                                onChange={(e) => setTradeInDebt(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              >
                                <option value="Quitado">Quitado</option>
                                <option value="Financiado">Financiado</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Common: Name & Phone */}
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Seu Nome Completo *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Como podemos te chamar?"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Seu WhatsApp *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="(11) 98765-4321"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold"
                          />
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            Enviaremos a simulação e resposta imediatamente pelo WhatsApp
                          </span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        id="submit-qualification-btn"
                        type="submit"
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>Enviar Proposta & Abrir WhatsApp</span>
                      </button>
                    </form>
                  )}
                </>
              ) : (
                /* Success State */
                <div className="py-6 text-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      Proposta Recebida com Sucesso!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      O lead já foi cadastrado no funil do Auto Wise e nossa equipe comercial já está de plantão.
                    </p>
                  </div>

                  {/* Pixel confirmation badge */}
                  {metaPixelFired && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Meta Pixel Disparado: Evento "Lead" ({settings.metaPixelId})</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col gap-2">
                    <a
                      href={generatedWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Conversar Agora no WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setIsLeadModalOpen(false);
                        onNavigateToLeads();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                    >
                      Ver Lead Cadastrado na Aba "LEADS"
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Meta Ads Campaign Link Generator Modal */}
      {isCampaignModalOpen && campaignCarForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Gerador de Link para Meta Ads & Tracking
                  </h3>
                  <p className="text-xs text-slate-500">
                    {campaignCarForModal.brand} {campaignCarForModal.model} ({campaignCarForModal.year})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Educational Alert: Confirmation about Meta Ads & Event Firing */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sim, o link e o evento LEAD funcionam perfeitamente!</span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  <strong>1. Coloque este link no anúncio:</strong> Cole a URL gerada abaixo no campo "URL do Site" da sua campanha no Meta Ads (Facebook/Instagram).<br />
                  <strong>2. Disparo do Evento LEAD:</strong> Assim que o cliente acessar o Hot Site, responder as perguntas e clicar no botão de proposta, o evento padrão <code>fbq('track', 'Lead')</code> é disparado imediatamente para o seu Pixel <strong>{settings.metaPixelId}</strong> e o lead é salvo no CRM.
                </p>
              </div>

              {/* UTM Customization Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Origem (utm_source)
                  </label>
                  <select
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="meta_ads">meta_ads (Instagram / Facebook)</option>
                    <option value="google_ads">google_ads (Google Ads)</option>
                    <option value="tiktok_ads">tiktok_ads (TikTok)</option>
                    <option value="whatsapp">whatsapp (Campanha WhatsApp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Posicionamento (utm_medium)
                  </label>
                  <select
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="instagram_feed">instagram_feed (Feed do Instagram)</option>
                    <option value="instagram_story">instagram_story (Stories)</option>
                    <option value="instagram_reels">instagram_reels (Reels)</option>
                    <option value="facebook_feed">facebook_feed (Feed Facebook)</option>
                    <option value="carrossel">carrossel (Anúncio Carrossel)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome da Campanha (utm_campaign)
                  </label>
                  <input
                    type="text"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="ex: hotsite_corolla_feirao"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Identificador do Criativo (utm_content)
                  </label>
                  <input
                    type="text"
                    value={utmContent}
                    onChange={(e) => setUtmContent(e.target.value)}
                    placeholder="ex: video_reels_01 ou foto_frente"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Generated URL Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  URL Final para Colar no Gerenciador de Anúncios Meta:
                </label>
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 font-mono text-xs text-amber-300 break-all select-all flex items-center justify-between gap-3">
                  <span className="truncate">
                    {getHotSiteUrl(campaignCarForModal, utmCampaign, utmMedium, utmSource, utmContent)}
                  </span>
                </div>
              </div>

              {/* Meta Pixel verification snippet */}
              <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Pixel ID Vinculado: {settings.metaPixelId}</div>
                  <div className="text-[11px] text-blue-700 leading-normal">
                    Ao finalizar o envio das respostas no botão <em>"Enviar Proposta & Abrir WhatsApp"</em>, a página dispara o evento:
                    <code className="block mt-1 p-1 bg-blue-100 rounded text-blue-950 font-mono">
                      fbq('track', 'Lead', &#123; content_name: '{campaignCarForModal.brand} {campaignCarForModal.model}', value: {campaignCarForModal.price}, currency: 'BRL' &#125;)
                    </code>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const finalUrl = getHotSiteUrl(campaignCarForModal, utmCampaign, utmMedium, utmSource, utmContent);
                    navigator.clipboard.writeText(finalUrl);
                    setCopiedSlug(campaignCarForModal.id);
                    setTimeout(() => setCopiedSlug(null), 2500);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
                >
                  {copiedSlug === campaignCarForModal.id ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>Link Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Link para Campanha</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
