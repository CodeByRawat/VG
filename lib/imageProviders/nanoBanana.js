const MODEL = 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Calls Google's Gemini 2.5 Flash Image model ("Nano Banana") via the
// generateContent API. Returns a PNG Buffer, matching every other
// provider's return shape. Note: image generation is not included in
// the Gemini API free tier — the associated Google Cloud project needs
// billing enabled, or every call fails with a 429 quota error.
export async function generateImageNanoBanana(fullPrompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  let res;
  try {
    res = await fetchWithTimeout(
      ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      },
      TIMEOUT_MS
    );
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Nano Banana image request timed out after 60 seconds');
    }
    throw new Error(`Nano Banana image request failed: ${err.message}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Nano Banana returned a non-JSON response');
  }

  if (!res.ok) {
    throw new Error(data.error?.message || `Nano Banana image generation failed (${res.status})`);
  }

  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart) {
    throw new Error('No image data returned from Nano Banana');
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}
