import {
  DEFAULT_ORE_OPERATING_LOCATION_ID,
  findOreLocationCode,
  formatRiderIdentifier,
  ORE_LOCATION_CODE_REGISTER,
  RIDER_IDENTIFIER_PATTERN,
} from './geo';

describe('Ore Rider ID structure', () => {
  it('formats Rider IDs as YDR-CC-YYYY-NNNN', () => {
    expect(formatRiderIdentifier('cc', 2026, 1)).toBe('YDR-CC-2026-0001');
    expect(formatRiderIdentifier('CC', 2026, 42)).toMatch(RIDER_IDENTIFIER_PATTERN);
  });

  it('resolves city codes only from the controlled Ore location register', () => {
    const location = findOreLocationCode(DEFAULT_ORE_OPERATING_LOCATION_ID);
    expect(location).toEqual(expect.objectContaining({ id: 'cape-coast', cityCode: 'CC', active: true }));
    expect(ORE_LOCATION_CODE_REGISTER.map((entry) => entry.cityCode)).toEqual(['CC']);
    expect(findOreLocationCode('CC')).toBeNull();
    expect(findOreLocationCode('not-a-real-location')).toBeNull();
  });
});
