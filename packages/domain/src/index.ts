export const nutrientKeys = ['caloriesKcal', 'proteinG', 'carbsG', 'fatG'] as const;
export type NutrientKey = (typeof nutrientKeys)[number];
export type Nutrients = Record<NutrientKey, number | null>;
export type Unit = 'g' | 'ml' | 'serving';
export const categories = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealCategory = (typeof categories)[number];
export type Source = 'manual' | 'gemini' | 'open-food-facts';

export interface MealItem {
  id: string;
  name: string;
  referenceQuantity: number;
  consumedQuantity: number;
  unit: Unit;
  nutrients: Nutrients;
  source: Source;
}

export interface Meal {
  id: string;
  userId: string;
  title: string;
  category: MealCategory;
  occurredAt: string;
  localDate: string;
  timeZone: string;
  items: MealItem[];
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface LocalUser {
  id: string;
  displayName: string;
  onboardedAt: string | null;
}

export interface GoalVersion {
  id: string;
  userId: string;
  effectiveLocalDate: string;
  nutrients: Nutrients;
  source: 'manual' | 'calculated';
  inputs: ProfileInput | null;
}

export interface WeightEntry {
  id: string;
  userId: string;
  weightKg: number;
  localDate: string;
  measuredAt: string;
  timeZone: string;
}

export interface ProfileInput {
  age: number;
  weightKg: number;
  heightCm: number;
  coefficient: 'male' | 'female';
  activity: 'sedentary' | 'light' | 'moderate' | 'very';
  goal: 'maintain' | 'lose' | 'gain';
}

export function assertAmount(value: number, label: string, positive = false): void {
  if (!Number.isFinite(value) || value < 0 || (positive && value === 0)) {
    throw new Error(`${label} must be a ${positive ? 'positive' : 'nonnegative'} number.`);
  }
}

export function validateNutrients(nutrients: Nutrients, requireCalories = false): void {
  for (const key of nutrientKeys) {
    const value = nutrients[key];
    if (value !== null) assertAmount(value, key);
  }
  if (requireCalories && nutrients.caloriesKcal === null)
    throw new Error('Enter calories before saving.');
}

export function scaleItem(item: MealItem): Nutrients {
  assertAmount(item.referenceQuantity, 'Reference quantity', true);
  assertAmount(item.consumedQuantity, 'Portion', true);
  validateNutrients(item.nutrients);
  const ratio = item.consumedQuantity / item.referenceQuantity;
  return Object.fromEntries(
    nutrientKeys.map((key) => {
      const value = item.nutrients[key];
      const result = value === null ? null : value * ratio;
      if (result !== null) assertAmount(result, key);
      return [key, result];
    }),
  ) as Nutrients;
}

export interface NutritionTotal {
  values: Record<NutrientKey, number>;
  incomplete: Record<NutrientKey, boolean>;
}

export function sumNutrition(items: MealItem[]): NutritionTotal {
  const total: NutritionTotal = {
    values: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    incomplete: { caloriesKcal: false, proteinG: false, carbsG: false, fatG: false },
  };
  for (const item of items) {
    const scaled = scaleItem(item);
    for (const key of nutrientKeys) {
      if (scaled[key] === null) total.incomplete[key] = true;
      else total.values[key] += scaled[key];
    }
  }
  return total;
}

export function calculateTargets(input: ProfileInput): Nutrients {
  assertAmount(input.weightKg, 'Weight', true);
  assertAmount(input.heightCm, 'Height', true);
  if (!Number.isInteger(input.age) || input.age < 18 || input.age > 120) {
    throw new Error(
      'Calculated targets require an adult age between 18 and 120. You can set targets manually.',
    );
  }
  const activity = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 }[input.activity];
  const adjustment = { maintain: 1, lose: 0.9, gain: 1.1 }[input.goal];
  if (!activity || !adjustment || !['male', 'female'].includes(input.coefficient))
    throw new Error('Choose a formula, activity level, and goal.');
  const resting =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.age +
    (input.coefficient === 'male' ? 5 : -161);
  const caloriesKcal = Math.round((resting * activity * adjustment) / 10) * 10;
  const proteinG = input.weightKg * 1.2;
  const fatG = (caloriesKcal * 0.3) / 9;
  const carbsG = (caloriesKcal - proteinG * 4 - fatG * 9) / 4;
  const result = { caloriesKcal, proteinG, carbsG, fatG };
  validateNutrients(result, true);
  assertAmount(caloriesKcal, 'Calculated calories', true);
  return result;
}

export function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateOffset(value: string, offset: number): string {
  if (!isLocalDate(value)) throw new Error('Enter a valid date as YYYY-MM-DD.');
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return localDate(date);
}

export function goalForDate(goals: GoalVersion[], date: string): GoalVersion | undefined {
  return goals
    .filter((goal) => goal.effectiveLocalDate <= date)
    .sort((a, b) => b.effectiveLocalDate.localeCompare(a.effectiveLocalDate))[0];
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export interface DiaryRepository {
  listMeals(userId: string): Promise<Meal[]>;
  saveMeal(userId: string, meal: Meal): Promise<void>;
  deleteMeal(userId: string, mealId: string): Promise<void>;
  listGoals(userId: string): Promise<GoalVersion[]>;
}
