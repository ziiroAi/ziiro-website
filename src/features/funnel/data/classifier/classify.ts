// §5.2: their words and chips become the problem, the second problem and the phrases that matched.
import { CHIP_BUCKET, LIMITS } from "../contract";
import type { Bucket, ChipId, Classification } from "../contract";
import { tokens } from "./normalise";
import { CLAUSE_BREAK, CLAUSE_CONJUNCTIONS, NEGATORS, PHRASES } from "./phrases";
import type { Problem } from "./phrases";

/** Saved with every plan (§9 classifier_version). Bump it whenever a phrase or a rule in this folder changes. */
export const CLASSIFIER_VERSION = "kw-1";

const MAX_PHRASE_WEIGHT = 3; // rule 2
const NEGATION_WINDOW = 4; // rule 3
const DECIDING_CHIP_SCORE = 6; // rule 4
const OTHER_CHIP_SCORE = 5;
const MIN_WORDS = 4; // rule 6

interface Token {
  word: string;
  clause: number;
}

interface Match {
  bucket: Problem;
  phrase: string;
  start: number;
  end: number;
  weight: number;
}

const PROBLEMS = Object.keys(PHRASES) as Problem[];
const PATTERNS = PROBLEMS.flatMap((bucket) => PHRASES[bucket].map((phrase) => ({ bucket, phrase, words: tokens(phrase) })));
const NEGATOR_WORDS = NEGATORS.map(tokens);

/** Their words as tokens, each tagged with its clause. Punctuation and "but" start a new clause. */
export function clauseTokens(text: string): Token[] {
  const start = { out: [] as Token[], clause: 0 };
  return text.split(CLAUSE_BREAK).reduce((acc, part) => {
    const inPart = tokens(part).reduce((inner, word) => {
      const clause = CLAUSE_CONJUNCTIONS.has(word) ? inner.clause + 1 : inner.clause;
      return { out: [...inner.out, { word, clause }], clause };
    }, acc);
    return { out: inPart.out, clause: inPart.clause + 1 };
  }, start).out;
}

const startsAt = (words: readonly string[], pattern: readonly string[], i: number): boolean =>
  i + pattern.length <= words.length && pattern.every((w, k) => words[i + k] === w);

const occurrences = (words: readonly string[], pattern: readonly string[]): number[] =>
  words.flatMap((_, i) => (startsAt(words, pattern, i) ? [i] : []));

const overlaps = (a: Match, b: Match): boolean => a.start < b.end && b.start < a.end;

/** Rule 2: every phrase found, the longest first, each one using up its words. Returned in text order. */
function findMatches(words: readonly string[]): Match[] {
  const candidates = PATTERNS.flatMap((p) =>
    occurrences(words, p.words).map((start) => ({
      bucket: p.bucket,
      phrase: p.phrase,
      start,
      end: start + p.words.length,
      weight: Math.min(MAX_PHRASE_WEIGHT, p.words.length),
    })),
  );
  const longestFirst = [...candidates].sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  return longestFirst
    .reduce<Match[]>((kept, c) => (kept.some((k) => overlaps(k, c)) ? kept : [...kept, c]), [])
    .sort((a, b) => a.start - b.start);
}

/** Rule 3, kept inside one clause (D35). */
function isNegated(match: Match, toks: readonly Token[]): boolean {
  const words = toks.map((t) => t.word);
  return NEGATOR_WORDS.some((negator) =>
    occurrences(words, negator).some((s) => {
      const gap = Math.max(s - match.end, match.start - (s + negator.length));
      return gap <= NEGATION_WINDOW && toks[s].clause === toks[match.start].clause;
    }),
  );
}

export function classify(problemText: string, chips: readonly ChipId[]): Classification {
  const toks = clauseTokens(problemText);
  const words = toks.map((t) => t.word);
  const matches = findMatches(words).filter((m) => !isNegated(m, toks));
  const scoreOf = (b: Bucket): number =>
    matches.filter((m) => m.bucket === b).reduce((sum, m) => sum + m.weight, 0) +
    chips.reduce((sum, chip, i) => sum + (CHIP_BUCKET[chip] === b ? (i === 0 ? DECIDING_CHIP_SCORE : OTHER_CHIP_SCORE) : 0), 0);
  const scored: Bucket[] = PROBLEMS.filter((b) => scoreOf(b) > 0);
  const bucketScores = Object.fromEntries(scored.map((b) => [b, scoreOf(b)])) as Partial<Record<Bucket, number>>;
  const matchedPhrases = matches.slice(0, LIMITS.matchedPhrases).map((m) => m.phrase);

  if (chips.length === 0 && (words.length < MIN_WORDS || matches.length === 0)) {
    return { bucketPrimary: "unclassified", bucketSecondary: null, bucketScores, matchedPhrases };
  }

  const firstMention = (b: Bucket): number => {
    const inText = matches.find((m) => m.bucket === b);
    if (inText) return inText.start;
    const chipIndex = chips.findIndex((c) => CHIP_BUCKET[c] === b);
    return chipIndex < 0 ? Number.POSITIVE_INFINITY : words.length + chipIndex;
  };
  const ranked = (candidates: readonly Bucket[]): Bucket[] =>
    [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a) || firstMention(a) - firstMention(b));
  const bucketPrimary: Bucket = chips.length > 0 ? CHIP_BUCKET[chips[0]] : ranked(scored)[0];
  const runnerUp: Bucket | undefined = ranked(scored.filter((b) => b !== bucketPrimary))[0];
  const bucketSecondary = runnerUp !== undefined && scoreOf(runnerUp) * 2 >= scoreOf(bucketPrimary) ? runnerUp : null;
  return { bucketPrimary, bucketSecondary, bucketScores, matchedPhrases };
}
