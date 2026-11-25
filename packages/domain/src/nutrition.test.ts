import { describe, expect, it } from 'vitest';
import {
  calculateTargets,
  dateOffset,
  goalForDate,
  isLocalDate,
  scaleItem,
  sumNutrition,
  type GoalVersion,
  type MealItem,
} from './index';

const item: MealItem = {
  id: 'one',
  name: 'Rice',
  referenceQuantity: 100,
  consumedQuantity: 150,
  unit: 'g',
  nutrients: { caloriesKcal: 200, proteinG: 4, carbsG: 40, fatG: null },
  source: 'manual',
};

describe('nutrition arithmetic', () => {
  it('scales from a reference without changing the original or inventing missing values', () => {
    expect(scaleItem(item)).toEqual({ caloriesKcal: 300, proteinG: 6, carbsG: 60, fatG: null });
    expect(scaleItem({ ...item, consumedQuantity: 100 }).caloriesKcal).toBe(200);
    expect(item.nutrients.caloriesKcal).toBe(200);
    const total = sumNutrition([item, { ...item, id: 'two', consumedQuantity: 50 }]);
    expect(total.values.caloriesKcal).toBe(400);
    expect(total.incomplete.fatG).toBe(true);
    expect(total.incomplete.proteinG).toBe(false);
  });
  it('supports volume and servings without assuming a mass conversion', () => {
    expect(
      scaleItem({ ...item, unit: 'ml', referenceQuantity: 100, consumedQuantity: 250 })
        .caloriesKcal,
    ).toBe(500);
    expect(
      scaleItem({ ...item, unit: 'serving', referenceQuantity: 1, consumedQuantity: 0.5 })
        .caloriesKcal,
    ).toBe(100);
  });
  it('rejects zero denominators, invalid quantities, negative nutrition and overflow', () => {
    expect(() => scaleItem({ ...item, referenceQuantity: 0 })).toThrow();
    expect(() => scaleItem({ ...item, consumedQuantity: NaN })).toThrow();
    expect(() => scaleItem({ ...item, nutrients: { ...item.nutrients, fatG: -1 } })).toThrow();
    expect(() => scaleItem({ ...item, consumedQuantity: Number.MAX_VALUE })).toThrow();
  });
});

describe('goals and calendar policy', () => {
  it('calculates the specified resting estimate, activity and modest goal adjustment', () => {
    const input = {
      age: 30,
      weightKg: 70,
      heightCm: 175,
      coefficient: 'male',
      activity: 'sedentary',
      goal: 'maintain',
    } as const;
    expect(calculateTargets(input).caloriesKcal).toBe(1980);
    expect(calculateTargets({ ...input, goal: 'lose' }).caloriesKcal).toBe(1780);
    expect(calculateTargets(input).proteinG).toBe(84);
    expect(() => calculateTargets({ ...input, age: 17 })).toThrow();
    expect(() => calculateTargets({ ...input, heightCm: Infinity })).toThrow();
  });
  it('resolves dated goals without rewriting the past', () => {
    const old = { id: 'old', effectiveLocalDate: '2026-11-01' } as GoalVersion;
    const next = { id: 'next', effectiveLocalDate: '2026-11-25' } as GoalVersion;
    expect(goalForDate([next, old], '2026-11-24')?.id).toBe('old');
    expect(goalForDate([old, next], '2026-11-25')?.id).toBe('next');
    expect(goalForDate([old, next], '2026-10-31')).toBeUndefined();
  });
  it('validates calendar dates and crosses leap and DST boundaries by date', () => {
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('invalid')).toBe(false);
    expect(dateOffset('2028-02-28', 1)).toBe('2028-02-29');
    expect(dateOffset('2026-03-08', 1)).toBe('2026-03-09');
    expect(dateOffset('2026-11-01', -1)).toBe('2026-10-31');
  });
});
