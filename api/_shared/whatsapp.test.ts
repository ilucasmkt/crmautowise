import { describe, it, expect } from 'vitest';
import { instanceNameFor, parseInstanceName } from './whatsapp';

describe('parseInstanceName', () => {
  it('roundtrips with instanceNameFor', () => {
    const storeId = '2f3677e9-23a4-44da-9305-76a34a636512';
    const teamMemberId = '29e511e5-96d9-4a8e-8adc-3d88a7c414f4';
    const name = instanceNameFor(storeId, teamMemberId);
    expect(parseInstanceName(name)).toEqual({ storeId, teamMemberId });
  });

  it('returns null for an instance name that does not start with crm_', () => {
    expect(parseInstanceName('mrveiculoscasabranca')).toBeNull();
  });

  it('returns null for a malformed instance name', () => {
    expect(parseInstanceName('crm_apenas-uma-parte')).toBeNull();
    expect(parseInstanceName('crm_a_b_c')).toBeNull();
  });
});
