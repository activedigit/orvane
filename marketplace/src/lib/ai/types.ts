export interface AiCategoryOption { id: string; slug: string; name_ar: string; keywords: string[]; subcategories: { id: string; slug: string; name_ar: string; keywords: string[] }[] }
export interface AiCityOption { id: string; slug: string; name_ar: string }

export interface AnalyzeContext { categories: AiCategoryOption[]; cities: AiCityOption[] }

export interface RequestAnalysis {
  title: string;
  categoryId: string | null;
  subcategoryId: string | null;
  cityId: string | null;
  urgency: 'normal' | 'urgent';
  budgetMin: number | null;
  budgetMax: number | null;
  projectType: string | null;
  /** Fields the questionnaire still needs to ask about. */
  missing: ('city' | 'category' | 'subcategory' | 'budget' | 'timeline' | 'details')[];
  confidence: number; // 0..1
  provider: string;
  categoryCandidates: { id: string; score: number }[];
}

export interface ContactSharingVerdict { score: number; reasons: string[] }

export interface SupplierSummaryInput {
  title: string; description: string; category: string | null; subcategory: string | null; city: string | null;
  budgetLabel: string | null; timeline: string | null; urgency: string; details: Record<string, unknown>;
}

/**
 * AI abstraction. `rules` works offline; an LLM provider can be plugged in
 * for better understanding. Every method must degrade gracefully.
 */
export interface AiProvider {
  readonly name: string;
  analyzeRequest(text: string, ctx: AnalyzeContext): Promise<RequestAnalysis>;
  detectContactSharing(text: string): Promise<ContactSharingVerdict>;
  detectSpam(text: string): Promise<{ isSpam: boolean; reasons: string[] }>;
  summarizeForSupplier(input: SupplierSummaryInput): Promise<string>;
  suggestQuotationStructure(input: SupplierSummaryInput): Promise<string[]>;
}
