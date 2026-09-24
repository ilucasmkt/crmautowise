import React, { useEffect, useState } from 'react';
import { Search, PenLine, Loader2 } from 'lucide-react';
import { FipeOption, parseFipePrice, mapFipeFuel, splitFipeModel } from '../lib/fipe';
import { fetchFipeBrands, fetchFipeModels, fetchFipeYears, fetchFipeDetail } from '../lib/fipeClient';
import { Vehicle } from '../types';

export interface FipeFillResult {
  brand: string;
  model: string;
  version: string;
  modelYear: number;
  fuel: Vehicle['fuel'];
  fipePrice: number;
  fipeCode: string;
  fipeReferenceMonth: string;
}

interface FipeVehiclePickerProps {
  mode: 'fipe' | 'manual';
  onModeChange: (mode: 'fipe' | 'manual') => void;
  onFill: (result: FipeFillResult) => void;
}

export const FipeVehiclePicker: React.FC<FipeVehiclePickerProps> = ({ mode, onModeChange, onFill }) => {
  const [brands, setBrands] = useState<FipeOption[]>([]);
  const [models, setModels] = useState<FipeOption[]>([]);
  const [years, setYears] = useState<FipeOption[]>([]);
  const [brandCode, setBrandCode] = useState('');
  const [modelCode, setModelCode] = useState('');
  const [yearCode, setYearCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchFipeBrands()
      .then((data) => {
        if (!cancelled) {
          setBrands(data);
          setStatus('idle');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar marcas da FIPE');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBrandChange = async (code: string) => {
    setBrandCode(code);
    setModelCode('');
    setYearCode('');
    setModels([]);
    setYears([]);
    if (!code) return;
    setStatus('loading');
    try {
      const data = await fetchFipeModels(code);
      setModels(data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar modelos da FIPE');
    }
  };

  const handleModelChange = async (code: string) => {
    setModelCode(code);
    setYearCode('');
    setYears([]);
    if (!code) return;
    setStatus('loading');
    try {
      const data = await fetchFipeYears(brandCode, code);
      setYears(data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar anos da FIPE');
    }
  };

  const handleYearChange = async (code: string) => {
    setYearCode(code);
    if (!code) return;
    setStatus('loading');
    try {
      const detail = await fetchFipeDetail(brandCode, modelCode, code);
      const { model, version } = splitFipeModel(detail.model);
      onFill({
        brand: brands.find((b) => b.code === brandCode)?.name ?? detail.brand,
        model,
        version,
        modelYear: detail.modelYear,
        fuel: mapFipeFuel(detail.fuel),
        fipePrice: parseFipePrice(detail.price),
        fipeCode: detail.codeFipe,
        fipeReferenceMonth: detail.referenceMonth,
      });
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao consultar a FIPE');
    }
  };

  return (
    <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Marca e Modelo
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onModeChange('fipe')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              mode === 'fipe'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Search className="w-3 h-3" /> Buscar na FIPE
          </button>
          <button
            type="button"
            onClick={() => onModeChange('manual')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              mode === 'manual'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PenLine className="w-3 h-3" /> Preencher manualmente
          </button>
        </div>
      </div>

      {mode === 'fipe' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              id="fipe-brand-select"
              value={brandCode}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
            >
              <option value="">Marca...</option>
              {brands.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            <select
              id="fipe-model-select"
              value={modelCode}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={!brandCode}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Modelo...</option>
              {models.map((m) => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </select>
            <select
              id="fipe-year-select"
              value={yearCode}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={!modelCode}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Ano...</option>
              {years.map((y) => (
                <option key={y.code} value={y.code}>{y.name}</option>
              ))}
            </select>
          </div>
          {status === 'loading' && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Consultando a FIPE...
            </p>
          )}
          {status === 'error' && (
            <p className="text-[11px] text-red-600">
              {errorMessage || 'Não foi possível consultar a FIPE agora.'} Tente novamente ou preencha manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
