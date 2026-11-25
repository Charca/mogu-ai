import { z } from 'zod';

const nutrient = z.number().finite().nonnegative().nullable();
export const nutrientsSchema = z.object({
  caloriesKcal: nutrient,
  proteinG: nutrient,
  carbsG: nutrient,
  fatG: nutrient,
});
export const productSchema = z.object({
  barcode: z.string().regex(/^\d{8,14}$/),
  name: z.string().min(1).max(300),
  brand: z.string().nullable(),
  referenceQuantity: z.number().positive().finite(),
  unit: z.enum(['g', 'ml', 'serving']),
  nutrients: nutrientsSchema,
  source: z.literal('open-food-facts'),
  sourceUrl: z.url(),
  retrievedAt: z.iso.datetime(),
});
export type Product = z.infer<typeof productSchema>;

export const analysisItemSchema = z.object({
  name: z.string().min(1).max(200),
  referenceQuantity: z.number().positive().max(100000),
  consumedQuantity: z.number().positive().max(100000),
  unit: z.enum(['g', 'ml', 'serving']),
  nutrients: nutrientsSchema,
});
export const mealAnalysisSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(analysisItemSchema).min(1).max(20),
  assumptions: z.array(z.string().max(500)).max(20),
});
export type MealAnalysisDraft = z.infer<typeof mealAnalysisSchema>;
