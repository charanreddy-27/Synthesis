/** Pull every [n] citation marker out of report text, in order. */
export function extractCitations(text: string): number[] {
  return [...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
}

/**
 * Verify that every [n] in the report maps to a real source (1..sourceCount).
 * This is the seed of the critic's job: citations must point at something real.
 */
export function checkCitationIntegrity(
  text: string,
  sourceCount: number,
): { valid: boolean; cited: number[]; invalid: number[] } {
  const cited = [...new Set(extractCitations(text))].sort((a, b) => a - b);
  const invalid = cited.filter((n) => n < 1 || n > sourceCount);
  return { valid: invalid.length === 0, cited, invalid };
}
