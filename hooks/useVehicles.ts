import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Vehicle } from '../types';

interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  model_year: number;
  mileage: number;
  price: number;
  fipe_price: number | null;
  fuel: Vehicle['fuel'];
  transmission: Vehicle['transmission'];
  color: string;
  plate: string;
  status: Vehicle['status'];
  image_url: string;
  images: string[] | null;
  features: string[] | null;
  created_at: string;
}

function fromRow(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    version: row.version,
    year: row.year,
    modelYear: row.model_year,
    mileage: row.mileage,
    price: row.price,
    fipePrice: row.fipe_price ?? undefined,
    fuel: row.fuel,
    transmission: row.transmission,
    color: row.color,
    plate: row.plate,
    status: row.status,
    imageUrl: row.image_url,
    images: row.images ?? undefined,
    features: row.features ?? [],
    createdAt: row.created_at,
  };
}

export function useVehicles(storeId: string) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setVehicles((data as VehicleRow[]).map(fromRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addVehicle = useCallback(
    async (newVehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          store_id: storeId,
          brand: newVehicle.brand,
          model: newVehicle.model,
          version: newVehicle.version,
          year: newVehicle.year,
          model_year: newVehicle.modelYear,
          mileage: newVehicle.mileage,
          price: newVehicle.price,
          fipe_price: newVehicle.fipePrice ?? null,
          fuel: newVehicle.fuel,
          transmission: newVehicle.transmission,
          color: newVehicle.color,
          plate: newVehicle.plate,
          status: newVehicle.status,
          image_url: newVehicle.imageUrl,
          images: newVehicle.images ?? [],
          features: newVehicle.features,
        })
        .select()
        .single();
      if (!error && data) setVehicles((prev) => [fromRow(data as VehicleRow), ...prev]);
    },
    [storeId]
  );

  const updateVehicle = useCallback(async (updated: Vehicle) => {
    const { error } = await supabase
      .from('vehicles')
      .update({
        brand: updated.brand,
        model: updated.model,
        version: updated.version,
        year: updated.year,
        model_year: updated.modelYear,
        mileage: updated.mileage,
        price: updated.price,
        fipe_price: updated.fipePrice ?? null,
        fuel: updated.fuel,
        transmission: updated.transmission,
        color: updated.color,
        plate: updated.plate,
        status: updated.status,
        image_url: updated.imageUrl,
        images: updated.images ?? [],
        features: updated.features,
      })
      .eq('id', updated.id);
    if (!error) setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return { vehicles, loading, addVehicle, updateVehicle, deleteVehicle };
}
