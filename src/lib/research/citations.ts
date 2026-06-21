/** Pull every [n] citation marker out of report text, in order. */
export function extractCitations(text: string): number[] {
  return [...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
}

export interface RawClaim {
  text: string;
  sourceIds: string[];
}

/**
 * Split a report into citation-bearing claims. A "claim" is a sentence that carries at least
 * one [n] marker — exactly the statements the critic must verify against their sources.
 */
export function extractClaims(report: string): RawClaim[] {
  const prose = report.replace(/^#{1,6}\s+.*$/gm, " ").replace(/\s+/g, " ").trim();
  const sentences = prose.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [];
  const claims: RawClaim[] = [];
  for (const sentence of sentences) {
    const ids = [...new Set(extractCitations(sentence).map(String))];
    if (ids.length === 0) continue;
    const text = sentence.trim();
    if (text) claims.push({ text, sourceIds: ids });
  }
  return claims;
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
