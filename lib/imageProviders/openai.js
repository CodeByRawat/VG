const DEFAULT_SIZE = '1536x1024';

// Calls OpenAI's gpt-image-1 endpoint. Returns a PNG Buffer, matching
// every other provider's return shape, so callers don't need to know
// which one produced it.
export async function generateImageOpenAI(fullPrompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const { quality = 'medium', size = DEFAULT_SIZE } = options;

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      size,
      quality,
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('OpenAI returned a non-JSON response');
  }

  if (!res.ok) {
    throw new Error(data.error?.message || 'OpenAI image generation failed');
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('No image data returned from OpenAI');
  }

  return Buffer.from(b64, 'base64');
}
