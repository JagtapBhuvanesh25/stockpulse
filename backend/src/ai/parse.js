/**
 * LLM output parser — tolerant JSON extraction.
 * Strips markdown fences, finds first { to last }, then JSON.parse.
 * Returns null on any parse failure (caller handles fallback).
 */

/**
 * Extract and parse JSON from raw LLM text output.
 * Handles: plain JSON, ```json fences, prose + embedded JSON.
 * @param {string} rawText - Raw text from the LLM
 * @returns {Object|null} Parsed JSON object or null on failure
 */
export function parseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let text = rawText.trim();

  // Strip ```json ... ``` fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

  // Find first { and last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    console.warn('[parse] No JSON object found in LLM output:', rawText.slice(0, 200));
    return null;
  }

  const jsonStr = text.slice(start, end + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn('[parse] JSON.parse failed:', e.message, '| input:', jsonStr.slice(0, 200));
    return null;
  }
}
