import { BadRequestException } from '@nestjs/common';
import { MenuItemDto, SelectedOptionDto } from '@ore/contracts';
import { validateAndNormalizeOptions } from './cart.service';

const item: MenuItemDto = {
  id: 'item-1',
  vendorId: 'vendor-1',
  name: 'Rice bowl',
  category: 'Mains',
  pricePesewas: 2500,
  prepTimeMin: 15,
  available: true,
  addonGroups: [
    {
      id: 'size',
      name: 'Size',
      required: true,
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: 'regular', name: 'Regular', priceAdjustmentPesewas: 0 },
        { id: 'large', name: 'Large', priceAdjustmentPesewas: 500 },
      ],
    },
    {
      id: 'extras',
      name: 'Extras',
      required: false,
      minSelections: 0,
      maxSelections: 2,
      options: [
        { id: 'egg', name: 'Egg', priceAdjustmentPesewas: 300 },
        { id: 'chicken', name: 'Chicken', priceAdjustmentPesewas: 700 },
      ],
    },
  ],
};

const option = (groupId: string, optionId: string, priceAdjustmentPesewas: number): SelectedOptionDto => ({
  groupId,
  groupName: 'client supplied label',
  optionId,
  optionName: 'client supplied label',
  priceAdjustmentPesewas,
});

describe('cart variant normalization', () => {
  it('uses catalog labels and prices, then totals pesewa adjustments', () => {
    expect(validateAndNormalizeOptions(item, [
      option('size', 'large', 999999),
      option('extras', 'egg', 0),
    ])).toEqual([
      { groupId: 'size', groupName: 'Size', optionId: 'large', optionName: 'Large', priceAdjustmentPesewas: 500 },
      { groupId: 'extras', groupName: 'Extras', optionId: 'egg', optionName: 'Egg', priceAdjustmentPesewas: 300 },
    ]);
  });

  it('rejects missing required selections, unknown options, and duplicate selections', () => {
    expect(() => validateAndNormalizeOptions(item, [])).toThrow(BadRequestException);
    expect(() => validateAndNormalizeOptions(item, [option('size', 'missing', 0)])).toThrow(BadRequestException);
    expect(() => validateAndNormalizeOptions(item, [option('size', 'large', 0), option('size', 'large', 0)])).toThrow(BadRequestException);
    expect(() => validateAndNormalizeOptions(item, [option('size', 'large', 0), option('size', 'regular', 0)])).toThrow(BadRequestException);
  });

  it('rejects more than the group maximum', () => {
    expect(() => validateAndNormalizeOptions(item, [
      option('size', 'large', 0),
      option('extras', 'egg', 0),
      option('extras', 'chicken', 0),
      option('extras', 'egg', 0),
    ])).toThrow(BadRequestException);
  });
});
