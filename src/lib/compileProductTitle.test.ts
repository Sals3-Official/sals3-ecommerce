import { describe, expect, it } from 'vitest';

import { compileProductTitle } from './compileProductTitle';

describe('compileProductTitle', () => {
  it('compiles the pants SKU (spec sample matrix)', () => {
    const result = compileProductTitle({
      brand: 'SALS3',
      itemCategory: 'Tactical Pants',
      material: 'Ripstop',
      specs: ['10 Pockets'],
    });

    expect(result.seoTitle).toBe('SALS3 Tactical Pants Ripstop 10 Pockets');
    expect(result.cardTitle).toBe('SALS3 Tactical Pants – Ripstop, 10 Pockets');
    expect(result.checkoutTitle.length).toBeLessThanOrEqual(35);
    expect(result.checkoutTitle).toBe('Tactical Pants – Ripstop, 10…');
  });

  it('compiles the shorts SKU (spec sample matrix)', () => {
    const result = compileProductTitle({
      brand: 'SALS3',
      itemCategory: 'Tactical Shorts',
      material: 'Twill',
      specs: ['10 Pockets'],
    });

    expect(result.seoTitle).toBe('SALS3 Tactical Shorts Twill 10 Pockets');
    expect(result.cardTitle).toBe('SALS3 Tactical Shorts – Twill, 10 Pockets');
    expect(result.checkoutTitle.length).toBeLessThanOrEqual(35);
    expect(result.checkoutTitle).toBe('Tactical Shorts – Twill, 10 Pockets');
  });

  it('drops empty variant parts instead of leaving stray separators', () => {
    const result = compileProductTitle({
      brand: 'SALS3',
      itemCategory: 'Everyday Cap',
    });

    expect(result.seoTitle).toBe('SALS3 Everyday Cap');
    expect(result.cardTitle).toBe('SALS3 Everyday Cap');
    expect(result.checkoutTitle).toBe('Everyday Cap');
  });

  it('hard-truncates checkoutTitle at a safe word boundary, never mid-word', () => {
    const result = compileProductTitle({
      brand: 'SALS3',
      itemCategory: 'Heavy Duty Waterproof Expedition Backpack',
      material: 'Ballistic Nylon',
      fit: 'Adjustable Torso',
    });

    expect(result.checkoutTitle.length).toBeLessThanOrEqual(35);
    expect(result.checkoutTitle.endsWith('…')).toBe(true);
    expect(result.checkoutTitle).not.toMatch(/\s…$/);
  });

  it('caps cardTitle so a long spec list still fits a 2-line clamp', () => {
    const result = compileProductTitle({
      brand: 'SALS3',
      itemCategory: 'Modular Tactical Vest',
      material: 'Ripstop Cotton Blend',
      specs: ['12 Pockets', 'MOLLE Webbing', 'Removable Hydration Pouch'],
      fit: 'Adjustable Unisex Fit',
    });

    expect(result.cardTitle.length).toBeLessThanOrEqual(60);
  });
});
