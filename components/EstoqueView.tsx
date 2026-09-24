import React, { useState, useRef } from 'react';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Gauge, 
  Calendar, 
  Fuel, 
  Layers, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Edit3, 
  ExternalLink,
  DollarSign,
  Tag,
  LayoutGrid,
  List,
  Sparkles,
  X,
  Share2,
  Globe,
  Flame,
  Upload,
  Image as ImageIcon,
  Star,
  Check
} from 'lucide-react';
import { Vehicle } from '../types';
import { FipeVehiclePicker, FipeFillResult } from './FipeVehiclePicker';

interface EstoqueViewProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onOpenHotSite?: (carId: string) => void;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onOpenHotSite,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [brandFilter, setBrandFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form states
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [year, setYear] = useState(2023);
  const [modelYear, setModelYear] = useState(2024);
  const [mileage, setMileage] = useState(25000);
  const [price, setPrice] = useState(135000);
  const [fipePrice, setFipePrice] = useState(140000);
  const [fuel, setFuel] = useState<'Flex' | 'Gasolina' | 'Diesel' | 'Híbrido' | 'Elétrico'>('Flex');
  const [transmission, setTransmission] = useState<'Automático' | 'Manual' | 'CVT'>('Automático');
  const [color, setColor] = useState('Branco Pérola');
  const [plate, setPlate] = useState('');
  const [status, setStatus] = useState<'disponivel' | 'reservado' | 'vendido'>('disponivel');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [photoInputMode, setPhotoInputMode] = useState<'upload' | 'url'>('upload');
  const [featuresText, setFeaturesText] = useState('Bancos em couro, Câmera de ré, Sensor de estacionamento, Multimídia');
  const [fillMode, setFillMode] = useState<'fipe' | 'manual'>('fipe');
  const [fipeCode, setFipeCode] = useState('');
  const [fipeReferenceMonth, setFipeReferenceMonth] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-configured car photos suggestions for easy adding
  const carPhotoPresets = [
    { label: 'SUV Cinza', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80' },
    { label: 'Sedan Branco', url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80' },
    { label: 'Hatch / Crossover Azul', url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80' },
    { label: 'Premium Preto', url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80' },
    { label: 'SUV Prata', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' },
  ];

  // Handler for uploading files directly from the computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setUploadedPhotos((prev) => {
            const next = [...prev, result];
            if (!imageUrl || prev.length === 0) {
              setImageUrl(result);
            }
            return next;
          });
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input value so same files can be re-added if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setUploadedPhotos((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length > 0) {
        setImageUrl(next[0]);
      } else {
        setImageUrl('');
      }
      return next;
    });
  };

  const handleSetMainPhoto = (index: number) => {
    setUploadedPhotos((prev) => {
      const target = prev[index];
      const remainder = prev.filter((_, idx) => idx !== index);
      const next = [target, ...remainder];
      setImageUrl(target);
      return next;
    });
  };

  const handleFipeFill = (result: FipeFillResult) => {
    setBrand(result.brand);
    setModel(result.model);
    setVersion(result.version);
    setYear(result.modelYear);
    setModelYear(result.modelYear);
    setFuel(result.fuel);
    setFipePrice(result.fipePrice);
    setFipeCode(result.fipeCode);
    setFipeReferenceMonth(result.fipeReferenceMonth);
  };

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setBrand('');
    setModel('');
    setVersion('');
    setYear(2023);
    setModelYear(2024);
    setMileage(28000);
    setPrice(129000);
    setFipePrice(134000);
    setFuel('Flex');
    setTransmission('Automático');
    setColor('Prata');
    setPlate('ABC-1D23');
    setStatus('disponivel');
    setImageUrl(carPhotoPresets[0].url);
    setUploadedPhotos([carPhotoPresets[0].url]);
    setPhotoInputMode('upload');
    setFeaturesText('Ar condicionado digital, Direção elétrica, Central multimídia com Apple CarPlay, Câmera de ré, Rodas de liga leve');
    setFillMode('fipe');
    setFipeCode('');
    setFipeReferenceMonth('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setBrand(v.brand);
    setModel(v.model);
    setVersion(v.version);
    setYear(v.year);
    setModelYear(v.modelYear);
    setMileage(v.mileage);
    setPrice(v.price);
    setFipePrice(v.fipePrice || v.price);
    setFuel(v.fuel);
    setTransmission(v.transmission);
    setColor(v.color);
    setPlate(v.plate);
    setStatus(v.status);
    setImageUrl(v.imageUrl);
    const photos = v.images && v.images.length > 0 ? v.images : (v.imageUrl ? [v.imageUrl] : []);
    setUploadedPhotos(photos);
    setPhotoInputMode(photos.length > 0 ? 'upload' : 'url');
    setFeaturesText(v.features.join(', '));
    setFillMode('manual');
    setFipeCode(v.fipeCode ?? '');
    setFipeReferenceMonth(v.fipeReferenceMonth ?? '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featuresList = featuresText
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);

    const finalPhotos = uploadedPhotos.length > 0 
      ? uploadedPhotos 
      : (imageUrl.trim() ? [imageUrl.trim()] : [carPhotoPresets[0].url]);

    const vehicleData = {
      brand: brand.trim() || 'Marca',
      model: model.trim() || 'Modelo',
      version: version.trim() || 'Versão Completa',
      year: Number(year) || 2023,
      modelYear: Number(modelYear) || 2024,
      mileage: Number(mileage) || 0,
      price: Number(price) || 0,
      fipePrice: Number(fipePrice) || Number(price),
      fipeCode: fipeCode || undefined,
      fipeReferenceMonth: fipeReferenceMonth || undefined,
      fuel,
      transmission,
      color: color.trim() || 'Branco',
      plate: plate.toUpperCase().trim() || 'BRA-1A23',
      status,
      imageUrl: finalPhotos[0],
      images: finalPhotos,
      features: featuresList.length > 0 ? featuresList : ['Completo de fábrica'],
    };

    if (editingVehicle) {
      onUpdateVehicle({
        ...vehicleData,
        id: editingVehicle.id,
        createdAt: editingVehicle.createdAt,
      });
    } else {
      onAddVehicle(vehicleData);
    }

    setIsModalOpen(false);
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.version.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || v.status === statusFilter;
    const matchesBrand = brandFilter === 'todos' || v.brand.toLowerCase() === brandFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesBrand;
  });

  const availableCount = vehicles.filter(v => v.status === 'disponivel').length;
  const reservedCount = vehicles.filter(v => v.status === 'reservado').length;
  const soldCount = vehicles.filter(v => v.status === 'vendido').length;
  const totalStockValue = vehicles
    .filter(v => v.status !== 'vendido')
    .reduce((acc, curr) => acc + curr.price, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const allBrands = Array.from(new Set(vehicles.map(v => v.brand)));

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-brand-600" />
            <span>Estoque de Veículos</span>
          </h1>
          <p className="text-sm text-slate-500">
            Cadastre, edite e gerencie todos os carros à venda da sua loja
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="add-vehicle-btn"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-600/25 transition-all hover:translate-y-[-1px]"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Veículo</span>
          </button>
        </div>
      </div>

      {/* Stock Summary Mini Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total em Estoque</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{vehicles.length} carros</div>
          <span className="text-xs text-slate-500 font-medium">Patrimônio: {formatCurrency(totalStockValue)}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Disponíveis</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{availableCount} carros</div>
          <span className="text-xs text-emerald-700/80 font-medium">Prontos p/ entrega</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-amber-600">Reservados</span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{reservedCount} carros</div>
          <span className="text-xs text-amber-700/80 font-medium">Em negociação</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-slate-500">Vendidos no Mês</span>
          <div className="text-xl font-extrabold text-slate-700 mt-1">{soldCount} carros</div>
          <span className="text-xs text-slate-500 font-medium">Faturamento fechado</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-vehicle-input"
            type="text"
            placeholder="Buscar por marca, modelo, versão ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="todos">Status: Todos</option>
            <option value="disponivel">Apenas Disponíveis</option>
            <option value="reservado">Apenas Reservados</option>
            <option value="vendido">Apenas Vendidos</option>
          </select>

          {/* Brand Select */}
          <select
            id="filter-brand-select"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="todos">Marca: Todas</option>
            {allBrands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              id="view-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="view-table-btn"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Vehicles Grid / Table View */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum veículo encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Tente mudar o termo da busca ou cadastre um novo carro no estoque da loja.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-xs hover:bg-brand-700"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Veículo Agora
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((car) => {
            const isDiscount = car.fipePrice && car.fipePrice > car.price;
            const discountAmount = car.fipePrice ? car.fipePrice - car.price : 0;

            return (
              <div 
                key={car.id} 
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
              >
                {/* Image Container */}
                <div className="relative h-48 bg-slate-900 overflow-hidden">
                  <img
                    src={car.imageUrl}
                    alt={`${car.brand} ${car.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    {car.status === 'disponivel' && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Disponível
                      </span>
                    )}
                    {car.status === 'reservado' && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Reservado
                      </span>
                    )}
                    {car.status === 'vendido' && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-700 text-slate-200 shadow-sm">
                        Vendido
                      </span>
                    )}
                  </div>

                  {/* Placa Badge */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-mono font-bold text-slate-900 border border-slate-300">
                    {car.plate}
                  </div>

                  {/* Bottom Image Overlay: Year & Fuel */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-white font-medium">
                    <span className="bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded">
                      {car.year}/{car.modelYear}
                    </span>
                    <span className="bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded">
                      {car.mileage.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                          {car.brand}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {car.model}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-slate-900">
                          {formatCurrency(car.price)}
                        </div>
                        {car.fipePrice && (
                          <div className="text-[11px] text-slate-400 line-through">
                            FIPE: {formatCurrency(car.fipePrice)}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={car.version}>
                      {car.version}
                    </p>

                    {/* Features Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {car.transmission}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {car.fuel}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {car.color}
                      </span>
                    </div>

                    {isDiscount && (
                      <div className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{formatCurrency(discountAmount)} abaixo da FIPE</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Status switcher quick */}
                    <select
                      value={car.status}
                      onChange={(e) => onUpdateVehicle({ ...car, status: e.target.value as any })}
                      className="text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="disponivel">🟢 Disponível</option>
                      <option value="reservado">🟡 Reservado</option>
                      <option value="vendido">⚫ Vendido</option>
                    </select>

                    <div className="flex items-center gap-1">
                      {onOpenHotSite && (
                        <button
                          onClick={() => onOpenHotSite(car.id)}
                          title="Ver Hot Site / Landpage deste Carro"
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Flame className="w-4 h-4" />
                          <span className="text-[10px] font-extrabold hidden sm:inline">Hot Site</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(car)}
                        title="Editar Veículo"
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir o veículo ${car.brand} ${car.model} do estoque?`)) {
                            onDeleteVehicle(car.id);
                          }
                        }}
                        title="Excluir Veículo"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Placa / Ano</th>
                  <th className="px-4 py-3">KM</th>
                  <th className="px-4 py-3">Combustível/Câmbio</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map(car => (
                  <tr key={car.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={car.imageUrl} 
                          alt="" 
                          className="w-12 h-9 object-cover rounded-lg shrink-0 border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{car.brand} {car.model}</div>
                          <div className="text-xs text-slate-500">{car.version}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-mono font-bold text-slate-800">{car.plate}</div>
                      <div className="text-slate-500">{car.year}/{car.modelYear}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">
                      {car.mileage.toLocaleString('pt-BR')} km
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{car.fuel}</div>
                      <div className="text-slate-400">{car.transmission}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{formatCurrency(car.price)}</div>
                      {car.fipePrice && (
                        <div className="text-[11px] text-slate-400 line-through">FIPE: {formatCurrency(car.fipePrice)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        car.status === 'disponivel' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : car.status === 'reservado'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {car.status === 'disponivel' ? 'Disponível' : car.status === 'reservado' ? 'Reservado' : 'Vendido'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(car)}
                          className="p-1 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir ${car.model}?`)) onDeleteVehicle(car.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Vehicle */}
      {isModalOpen && (
        <div 
          id="vehicle-modal-backdrop"
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingVehicle ? 'Editar Veículo no Estoque' : 'Adicionar Carro ao Estoque'}
                </h2>
              </div>
              <button
                id="close-vehicle-modal"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {editingVehicle && fipeCode && fillMode === 'manual' && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Sincronizado com a FIPE (código {fipeCode}, referência {fipeReferenceMonth})
                  </span>
                  <button
                    type="button"
                    onClick={() => setFillMode('fipe')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Atualizar da FIPE
                  </button>
                </div>
              )}

              <FipeVehiclePicker mode={fillMode} onModeChange={setFillMode} onFill={handleFipeFill} />

              {fillMode === 'manual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Marca do Veículo *
                    </label>
                    <input
                      id="car-brand-input"
                      type="text"
                      required
                      placeholder="Ex: Toyota, Honda, Jeep..."
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Modelo *
                    </label>
                    <input
                      id="car-model-input"
                      type="text"
                      required
                      placeholder="Ex: Corolla, Compass, Nivus..."
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Versão Detalhada
                </label>
                <input
                  id="car-version-input"
                  type="text"
                  placeholder="Ex: 2.0 Altis Premium Flex Automático"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Ano Fab.</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Ano Mod.</label>
                  <input
                    type="number"
                    value={modelYear}
                    onChange={(e) => setModelYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">KM Rodados</label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Placa</label>
                  <input
                    type="text"
                    placeholder="ABC-1D23"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    id="car-price-input"
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold text-brand-700 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Preço Tabela FIPE (R$)
                  </label>
                  <input
                    type="number"
                    value={fipePrice}
                    onChange={(e) => setFipePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Combustível</label>
                  <select
                    value={fuel}
                    onChange={(e) => setFuel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Flex">Flex</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Elétrico">Elétrico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Câmbio</label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Automático">Automático</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                  </select>
                </div>
              </div>

              {/* Photo selection with PC upload and gallery */}
              <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-brand-600" />
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Fotos do Veículo ({uploadedPhotos.length} foto{uploadedPhotos.length === 1 ? '' : 's'})
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPhotoInputMode('upload')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        photoInputMode === 'upload'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Upload do PC
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoInputMode('url')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        photoInputMode === 'url'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Link Web (URL)
                    </button>
                  </div>
                </div>

                {/* Hidden file input for PC upload */}
                <input
                  type="file"
                  id="car-file-upload-input"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {photoInputMode === 'upload' ? (
                  <div className="space-y-3">
                    {/* Big upload dropzone button */}
                    <div
                      id="car-upload-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-brand-300 hover:border-brand-500 bg-white hover:bg-brand-50/50 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-extrabold text-brand-700 group-hover:underline block">
                          Selecionar Fotos do Computador (PC)
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Clique aqui ou arraste arquivos (JPG, PNG, WEBP). Suporta adicionar múltiplas fotos para o carrossel do hot site.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="mt-1 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        Buscar no Computador
                      </button>
                    </div>

                    {/* Uploaded Photos Thumbnails Gallery */}
                    {uploadedPhotos.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Fotos Adicionadas ({uploadedPhotos.length}):</span>
                          <span className="text-[10px] text-brand-600">A 1ª foto é a capa principal do carro</span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {uploadedPhotos.map((photoUrl, idx) => (
                            <div 
                              key={idx}
                              className={`relative group rounded-xl overflow-hidden border-2 bg-slate-900 aspect-4/3 ${
                                idx === 0 ? 'border-brand-500 ring-2 ring-brand-400/30' : 'border-slate-200'
                              }`}
                            >
                              <img 
                                src={photoUrl} 
                                alt={`Foto ${idx + 1}`} 
                                className="w-full h-full object-cover"
                              />

                              {/* Cover badge */}
                              {idx === 0 && (
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-brand-600 text-white shadow-xs">
                                  Capa
                                </span>
                              )}

                              {/* Hover actions */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                {idx !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetMainPhoto(idx)}
                                    title="Tornar Foto Principal"
                                    className="p-1 rounded bg-white text-slate-800 hover:text-brand-600 text-[10px] font-bold"
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(idx)}
                                  title="Remover Foto"
                                  className="p-1 rounded bg-red-600 text-white hover:bg-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        URL Direta da Foto
                      </label>
                      <input
                        id="car-image-url"
                        type="url"
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          if (e.target.value && !uploadedPhotos.includes(e.target.value)) {
                            setUploadedPhotos([e.target.value, ...uploadedPhotos.slice(1)]);
                          }
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-slate-400">Sugestões rápidas:</span>
                      {carPhotoPresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setImageUrl(preset.url);
                            setUploadedPhotos([preset.url]);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-white hover:bg-brand-50 hover:text-brand-700 text-slate-600 border border-slate-200 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Opcionais e Destaques (separados por vírgula)
                </label>
                <textarea
                  rows={2}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Ex: Teto solar, Bancos em couro, Câmera de ré, Piloto automático"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="save-car-submit-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
                >
                  {editingVehicle ? 'Atualizar Veículo' : 'Salvar no Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
