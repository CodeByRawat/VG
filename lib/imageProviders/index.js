import { generateImageOpenAI } from './openai';
import { generateImageNanoBanana } from './nanoBanana';

const PROVIDERS = {
  openai: generateImageOpenAI,
  nanobanana: generateImageNanoBanana,
};

// Single entry point every image-generation caller goes through.
// options.provider ("openai" | "nanobanana") picks the backend — set
// per-request from the UI dropdown, falling back to the IMAGE_PROVIDER
// env var, then "openai" — so callers never need to know which one is
// active, and the same call site works for either.
export async function generateImage(fullPrompt, options = {}) {
  const providerName = (options.provider || process.env.IMAGE_PROVIDER || 'openai').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown image provider "${providerName}" — expected "openai" or "nanobanana"`);
  }
  return provider(fullPrompt, options);
}
