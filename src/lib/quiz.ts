import type { VocabEntry } from '../data/vocabulary';
import { VOCABULARY } from '../data/vocabulary';

function similarityScore(a: string, b: string): number {
  const wordsA = new Set(a.split(/[\s,;]+/).filter(Boolean));
  const wordsB = new Set(b.split(/[\s,;]+/).filter(Boolean));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  const lenDiff = Math.abs(a.length - b.length);
  return overlap * 3 - lenDiff * 0.1;
}

/** בוחר מסיחים מאתגרים – משמעויות דומות או באורך דומה */
export function getChallengingDistractors(correct: VocabEntry, count: number): VocabEntry[] {
  const others = VOCABULARY.filter((v) => v.id !== correct.id);
  const scored = others.map((v) => ({
    entry: v,
    score: similarityScore(correct.meaning, v.meaning) + Math.random() * 0.5,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.entry);
}

export function buildQuizOptions(correct: VocabEntry, challenging: boolean) {
  const distractors = challenging
    ? getChallengingDistractors(correct, 3)
    : VOCABULARY.filter((v) => v.id !== correct.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

  const all = [
    { id: correct.id, text: correct.meaning },
    ...distractors.map((d) => ({ id: d.id, text: d.meaning })),
  ];
  return all.sort(() => Math.random() - 0.5);
}
