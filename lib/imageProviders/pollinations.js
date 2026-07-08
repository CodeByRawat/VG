const DEFAULT_WIDTH = 1536;
const DEFAULT_HEIGHT = 1024;
const TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 2_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestImage(url) {
  let res;
  try {
    res = await fetchWithTimeout(url, TIMEOUT_MS);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Pollinations image request timed out after 60 seconds');
    }
    throw new Error(`Pollinations image request failed: ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(`Pollinations image request failed with status ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Calls Pollinations.ai's free, keyless image generation endpoint.
// Returns a PNG Buffer, matching the OpenAI provider's return shape,
// so callers don't need to know which provider produced it.
export async function generateImagePollinations(fullPrompt, options = {}) {
  const { width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, seed } = options;

  const encodedPrompt = encodeURIComponent(fullPrompt);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: 'true',
  });
  if (seed !== undefined && seed !== null) {
    params.set('seed', String(seed));
  }
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

  try {
    return await requestImage(url);
  } catch {
    await sleep(RETRY_DELAY_MS);
    try {
      return await requestImage(url);
    } catch (retryErr) {
      throw new Error(`Pollinations image generation failed after retry: ${retryErr.message}`);
    }
  }
}
