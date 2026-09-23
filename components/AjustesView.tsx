import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  Clock, 
  Share2, 
  Save, 
  Check, 
  Copy, 
  CheckCircle2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Flame, 
  Sparkles,
  Layers,
  Send,
  Code,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { StoreSettings, WorkingDayHours } from '../types';

interface AjustesViewProps {
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
  readOnly?: boolean;
}

export const AjustesView: React.FC<AjustesViewProps> = ({
  settings,
  onSaveSettings,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'horarios' | 'meta'>('perfil');

  // Form State
  const [storeName, setStoreName] = useState(settings.storeName);
  const [legalName, setLegalName] = useState(settings.legalName);
  const [cnpj, setCnpj] = useState(settings.cnpj);
  const [phone, setPhone] = useState(settings.phone);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [city, setCity] = useState(settings.city);
  const [state, setState] = useState(settings.state);
  const [zipCode, setZipCode] = useState(settings.zipCode);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [logoBgPreview, setLogoBgPreview] = useState<'light' | 'dark'>('light');

  // Pixel State
  const [metaPixelId, setMetaPixelId] = useState(settings.metaPixelId);
  const [metaAccessToken, setMetaAccessToken] = useState(settings.metaAccessToken);
  const [googleTagManagerId, setGoogleTagManagerId] = useState(settings.googleTagManagerId);
  const [enablePixelEvents, setEnablePixelEvents] = useState(settings.enablePixelEvents);

  // Working Hours State
  const [workingHours, setWorkingHours] = useState<WorkingDayHours[]>(settings.workingHours);

  // Test Event Feedback
  const [testSuccess, setTestSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleHourToggle = (index: number) => {
    const updated = [...workingHours];
    updated[index].isOpen = !updated[index].isOpen;
    setWorkingHours(updated);
  };

  const handleTimeChange = (index: number, field: 'openTime' | 'closeTime', value: string) => {
    const updated = [...workingHours];
    updated[index][field] = value;
    setWorkingHours(updated);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Por favor escolha uma imagem de até 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: StoreSettings = {
      storeName,
      legalName,
      cnpj,
      phone,
      whatsapp,
      email,
      address,
      city,
      state,
      zipCode,
      logoUrl,
      metaPixelId,
      metaAccessToken,
      googleTagManagerId,
      enablePixelEvents,
      workingHours,
    };

    onSaveSettings(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleTestMetaPixel = () => {
    setIsTesting(true);
    setTestSuccess(false);
    setTimeout(() => {
      setIsTesting(false);
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 4000);
    }, 1200);
  };

  const generatedPixelSnippet = `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId || 'SEU_PIXEL_ID'}');
fbq('track', 'PageView');
</script>
<!-- End Meta Pixel Code -->`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPixelSnippet);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-600" />
            <span>Ajustes & Configurações da Loja</span>
          </h1>
          <p className="text-sm text-slate-500">
            Perfil comercial, horários de atendimento da concessionária e integração com o Meta Pixel
          </p>
        </div>

        <button
          id="save-settings-top-btn"
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-600/25 transition-all hover:translate-y-[-1px]"
        >
          {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Configurações Salvas!' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold shadow-xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Dados do perfil, horários e integração do Meta Pixel salvos com sucesso!</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          id="tab-perfil-btn"
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'perfil'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Perfil da Loja</span>
        </button>

        <button
          id="tab-horarios-btn"
          onClick={() => setActiveTab('horarios')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'horarios'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Horário de Funcionamento</span>
        </button>

        <button
          id="tab-meta-btn"
          onClick={() => setActiveTab('meta')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'meta'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Share2 className="w-4 h-4 text-brand-500" />
          <span>Integração Meta Pixel & Anúncios</span>
        </button>
      </div>

      {/* Tab 1: Perfil da Loja */}
      {activeTab === 'perfil' && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
        <fieldset disabled={readOnly} className="contents">
          {/* Seção Logotipo da Loja para o Hot Site */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 p-5 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-brand-600" />
                  <span>Logotipo da Empresa (Hot Site & Landing Pages)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta logo será exibida com destaque no topo e rodapé de todos os Hot Sites de veículos nos anúncios da Meta/Google
                </p>
              </div>

              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors self-start sm:self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover Logo</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
              {/* Preview Box */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center justify-between w-full max-w-[260px] mb-1.5 px-1 text-[11px] text-slate-500 font-medium">
                  <span>Pré-visualização:</span>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setLogoBgPreview('light')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        logoBgPreview === 'light' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoBgPreview('dark')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        logoBgPreview === 'dark' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Escuro
                    </button>
                  </div>
                </div>

                <div className={`w-full max-w-[260px] h-28 rounded-2xl border-2 border-dashed flex items-center justify-center p-3 transition-colors ${
                  logoBgPreview === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                }`}>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo da Concessionária"
                      className="max-h-20 max-w-[220px] object-contain transition-all"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1 opacity-50" />
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Sem logo cadastrada
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload & Direct URL Controls */}
              <div className="lg:col-span-2 space-y-3">
                {/* Upload Button */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    1. Enviar arquivo de imagem (PNG, JPG, SVG, WebP):
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="store-logo-file-input"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all hover:translate-y-[-1px]"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Selecionar Imagem do Computador</span>
                    </label>
                    <input
                      id="store-logo-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                    <span className="text-[11px] text-slate-500">
                      Recomendado fundo transparente (PNG/SVG) até 5MB
                    </span>
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Ou insira a URL direta da imagem da Logo:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="setting-logo-url-input"
                      type="url"
                      placeholder="https://sua-empresa.com.br/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                    />
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Preset Suggestions */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Exemplos rápidos:</span>
                  <button
                    type="button"
                    onClick={() => setLogoUrl('https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=200&h=200&q=80')}
                    className="text-[11px] font-bold text-brand-600 hover:underline px-2 py-0.5 bg-brand-50 rounded-md"
                  >
                    Exemplo Automotivo 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoUrl('https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=200&h=200&q=80')}
                    className="text-[11px] font-bold text-brand-600 hover:underline px-2 py-0.5 bg-brand-50 rounded-md"
                  >
                    Exemplo Esportivo 2
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Identificação da Concessionária</h2>
            <p className="text-xs text-slate-500">Dados cadastrais que aparecem nos contratos, propostas e cabeçalhos</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nome Fantasia da Loja *
              </label>
              <input
                id="setting-store-name"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                CNPJ
              </label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                WhatsApp Comercial (Recepção) *
              </label>
              <input
                type="text"
                required
                placeholder="(11) 98765-4321"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-semibold text-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Telefone Fixo
              </label>
              <input
                type="text"
                placeholder="(11) 3456-7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              E-mail Comercial de Atendimento
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-600" /> Endereço Físico do Showroom
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Logradouro e Número
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. das Nações Unidas, 14.261"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              Salvar Dados do Perfil
            </button>
          </div>
        </fieldset>
        </form>
      )}

      {/* Tab 2: Horário de Funcionamento */}
      {activeTab === 'horarios' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Grade de Horários da Loja</h2>
              <p className="text-xs text-slate-500">
                Define quando sua loja recebe visitas para test drive e atendimento presencial
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Loja Aberta Agora</span>
            </div>
          </div>

          <div className="space-y-3">
            {workingHours.map((wh, idx) => (
              <div
                key={wh.day}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  wh.isOpen ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200/60 opacity-65'
                }`}
              >
                <div className="flex items-center gap-3 min-w-[160px]">
                  <input
                    type="checkbox"
                    id={`day-check-${idx}`}
                    checked={wh.isOpen}
                    onChange={() => handleHourToggle(idx)}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                  />
                  <label htmlFor={`day-check-${idx}`} className="text-sm font-bold text-slate-800 cursor-pointer">
                    {wh.day}
                  </label>
                </div>

                {wh.isOpen ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Abre às:</span>
                    <input
                      type="time"
                      value={wh.openTime}
                      onChange={(e) => handleTimeChange(idx, 'openTime', e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold"
                    />
                    <span className="text-xs text-slate-400">até</span>
                    <input
                      type="time"
                      value={wh.closeTime}
                      onChange={(e) => handleTimeChange(idx, 'closeTime', e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold"
                    />
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 italic">
                    Fechado o dia todo
                  </span>
                )}

                <div className="text-right">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    wh.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {wh.isOpen ? 'Atendimento Ativo' : 'Fechado'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              Salvar Horários
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Integração Meta Pixel */}
      {activeTab === 'meta' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                f
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Integração com o Meta Pixel (Facebook / Instagram Ads)</h2>
                <p className="text-xs text-slate-500">
                  Rastreie visualizações de carros no estoque e conversões de novos leads que chamam no WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  ID do Meta Pixel *
                </label>
                <div className="relative">
                  <input
                    id="meta-pixel-id-input"
                    type="text"
                    required
                    placeholder="Ex: 1048293847291038"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Encontrado no Gerenciador de Eventos da Meta &gt; Configurações do Pixel
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Token da API de Conversões (CAPI)
                </label>
                <input
                  type="password"
                  placeholder="EAAGm0PX4ZB9wBAO..."
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Garante mensuração mesmo com bloqueadores de anúncio e iOS 14+
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Google Tag Manager ID (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="GTM-XXXXXXX"
                  value={googleTagManagerId}
                  onChange={(e) => setGoogleTagManagerId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              {/* Event toggle */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Disparar Evento "Lead" Automaticamente</span>
                  <span className="text-[11px] text-slate-500">Quando cliente clica no WhatsApp ou envia formulário</span>
                </div>
                <input
                  type="checkbox"
                  checked={enablePixelEvents}
                  onChange={(e) => setEnablePixelEvents(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
              </div>

              {/* Test button */}
              <div className="pt-2">
                <button
                  type="button"
                  id="test-pixel-btn"
                  onClick={handleTestMetaPixel}
                  disabled={isTesting}
                  className="w-full py-2.5 px-4 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'Disparando evento de teste...' : 'Testar Disparo do Pixel (Evento Lead)'}</span>
                </button>

                {testSuccess && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Evento "Lead" enviado com sucesso para o Pixel {metaPixelId}! (HTTP 200 OK)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Code Preview */}
            <div className="bg-slate-900 rounded-xl p-4 text-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                    <Code className="w-4 h-4 text-brand-400" /> Código Injetado
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
                  >
                    {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="mt-3 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {generatedPixelSnippet}
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Status: <span className="text-emerald-400 font-bold">Pixel Vinculado aos Formulários de Captação</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              Salvar Integração Meta Pixel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
