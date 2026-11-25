import type { MealAnalysisDraft } from '@mogu/contracts';

// Provider implementations belong here; credentials are supplied at call time,
// never stored on a serializable model or sent through the Mogu API.
export interface AIProvider {
  readonly id: string;
  readonly capabilities: { text: boolean; image: boolean };
  validateCredential(key: string, signal?: AbortSignal): Promise<void>;
  analyzeMeal(input: {
    text?: string;
    image?: { base64: string; mimeType: 'image/jpeg' };
    getCredential: () => Promise<string>;
    signal?: AbortSignal;
  }): Promise<MealAnalysisDraft>;
}
