/**
 * LLM Gateway — raw text only; parsing/validation/fallback live in aiStrategy.js
 * Supports: gemini | groq | ollama (env-selected)
 */
import { env } from '../config/env.js';

/**
 * Call the configured LLM provider and return raw text response.
 * Throws on network error, non-OK status, or timeout — caller handles fallback.
 * @param {string} prompt - The prompt to send to the LLM
 * @returns {Promise<string>} Raw text from the LLM
 */
export async function callLLM(prompt) {
  const provider = env.llmProvider.toLowerCase();

  if (provider === 'gemini') return callGemini(prompt);
  if (provider === 'groq') return callOpenAICompatible(prompt, `${env.llmBaseUrl}/openai/v1/chat/completions`);
  if (provider === 'ollama') return callOpenAICompatible(prompt, `${env.llmBaseUrl}/v1/chat/completions`);

  throw new Error(`Unknown LLM provider: ${provider}`);
}

/**
 * Call Google Gemini API
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callGemini(prompt) {
  const model = env.llmModel || 'gemini-1.5-flash';
  const url = `${env.llmBaseUrl}/v1beta/models/${model}:generateContent?key=${env.llmApiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(env.aiTimeoutMs),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/**
 * Call an OpenAI-compatible API (Groq, Ollama)
 * @param {string} prompt
 * @param {string} url
 * @returns {Promise<string>}
 */
async function callOpenAICompatible(prompt, url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.llmApiKey && { Authorization: `Bearer ${env.llmApiKey}` }),
    },
    signal: AbortSignal.timeout(env.aiTimeoutMs),
    body: JSON.stringify({
      model: env.llmModel,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Call Gemini with streaming support (for SSE endpoint)
 * Calls the streamGenerateContent endpoint and yields text chunks.
 * @param {string} prompt
 * @param {function} onChunk - Called with each text chunk
 * @returns {Promise<string>} Full accumulated response
 */
export async function callLLMStream(prompt, onChunk) {
  const provider = env.llmProvider.toLowerCase();

  if (provider === 'gemini') {
    return callGeminiStream(prompt, onChunk);
  }

  // Fallback: non-streaming providers just call once and emit as single chunk
  const text = await callLLM(prompt);
  onChunk(text);
  return text;
}

/**
 * Streaming Gemini call
 */
async function callGeminiStream(prompt, onChunk) {
  const model = env.llmModel || 'gemini-1.5-flash';
  const url = `${env.llmBaseUrl}/v1beta/models/${model}:streamGenerateContent?key=${env.llmApiKey}&alt=sse`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(env.aiTimeoutMs),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini stream ${res.status}: ${text}`);
  }

  let accumulated = '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // SSE format: "data: {...}\n\n"
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (text) {
            accumulated += text;
            onChunk(text);
          }
        } catch {
          // Ignore parse errors for partial chunks
        }
      }
    }
  }

  return accumulated;
}
