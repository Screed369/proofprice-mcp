import type { Tool } from "ai";

export const BASE_URL: string;
export interface ProofPriceOptions {
  baseUrl?: string;
  /** Replace fetch, for tests. */
  fetcher?: (url: string) => Promise<{ status: number; body: string }>;
}
export function buildUrl(baseUrl: string, path: string, params?: Record<string, unknown>): string;
export function call(path: string, params: Record<string, unknown>, options?: ProofPriceOptions): Promise<string>;
export function proofpriceTools(options?: ProofPriceOptions): {
  proofpriceCoverage: Tool;
  proofpriceLookup: Tool;
  proofpriceCheckPrice: Tool;
};
