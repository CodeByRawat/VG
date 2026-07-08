import { generateImageOpenAI } from './openai';
import { generateImagePollinations } from './pollinations';

const PROVIDERS = {
  openai: generateImageOpenAI,
  pollinations: generateImagePollinations,
};

// Single entry point every image-generation caller goes through. Picks
// the provider via IMAGE_PROVIDER ("openai" | "pollinations", default
// "pollinations" since it's free and needs no API key) so callers never
// need to know which one is active — same signature either way.
export async function generateImage(fullPrompt, options = {}) {
  const providerName = (process.env.IMAGE_PROVIDER || 'pollinations').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown IMAGE_PROVIDER "${providerName}" — expected "openai" or "pollinations"`);
  }
  return provider(fullPrompt, options);
}
