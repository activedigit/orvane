import 'server-only';
import { config } from '@/lib/config';
import { rulesAiProvider } from './rules';
import type { AiProvider } from './types';

export type * from './types';

export async function getAiProvider(): Promise<AiProvider> {
  if (config.ai.provider === 'anthropic' && config.ai.anthropicApiKey) {
    const { anthropicAiProvider } = await import('./anthropic');
    return anthropicAiProvider;
  }
  return rulesAiProvider;
}
