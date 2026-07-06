import type { VocabEntry } from '../data/vocabulary';
import { VOCABULARY } from '../data/vocabulary';

export interface QuizOption {
  id: string;
  text: string;
}

function normalizeMeaning(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s,]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** בודק אם שתי משמעויות זהות או כמעט זהות */
export function meaningsAreDuplicate(a: string, b: string): boolean {
  const na = normalizeMeaning(a);
  const nb = normalizeMeaning(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const partsA = new Set(na.split(',').map((p) => p.trim()).filter(Boolean));
  const partsB = new Set(nb.split(',').map((p) => p.trim()).filter(Boolean));
  if (partsA.size === partsB.size && partsA.size > 0) {
    let match = 0;
    for (const p of partsA) if (partsB.has(p)) match++;
    if (match === partsA.size) return true;
  }

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  if (longer.includes(shorter) && shorter.length / longer.length > 0.75) return true;

  return false;
}

function wordOverlapRatio(a: string, b: string): number {
  const wordsA = new Set(normalizeMeaning(a).split(/[\s,]+/).filter((w) => w.length > 1));
  const wordsB = new Set(normalizeMeaning(b).split(/[\s,]+/).filter((w) => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

function isSynonymEntry(correct: VocabEntry, candidate: VocabEntry): boolean {
  if (candidate.id === correct.id) return true;
  if (meaningsAreDuplicate(correct.meaning, candidate.meaning)) return true;
  if (correct.relatedWords?.includes(candidate.word)) return true;
  if (candidate.relatedWords?.includes(correct.word)) return true;
  return false;
}

function lengthDistance(a: string, b: string): number {
  return Math.abs(a.length - b.length);
}

function isTooSimilarToAny(text: string, existing: string[], maxOverlap = 0.55): boolean {
  return existing.some((e) => meaningsAreDuplicate(e, text) || wordOverlapRatio(e, text) > maxOverlap);
}

function pickDistractors(correct: VocabEntry, count: number, challenging: boolean): VocabEntry[] {
  const pool = VOCABULARY.filter((v) => !isSynonymEntry(correct, v));
  const usedTexts: string[] = [correct.meaning];
  const picked: VocabEntry[] = [];

  const scored = pool.map((entry) => {
    const lenDist = lengthDistance(correct.meaning, entry.meaning);
    const overlap = wordOverlapRatio(correct.meaning, entry.meaning);
    let score: number;

    if (challenging) {
      // מאתגר: אורך דומה, חפיפת מילים בינונית – לא זהה ולא רחוק מדי
      const lenScore = Math.max(0, 40 - lenDist * 0.5);
      const overlapScore = overlap >= 0.15 && overlap <= 0.45 ? 25 : overlap < 0.15 ? 10 : 0;
      score = lenScore + overlapScore + Math.random() * 8;
    } else {
      // רגיל: אורך דומה, חפיפה נמוכה
      const lenScore = Math.max(0, 30 - lenDist * 0.4);
      const overlapPenalty = overlap * 40;
      score = lenScore - overlapPenalty + Math.random() * 15;
    }

    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);

  for (const { entry } of scored) {
    if (picked.length >= count) break;
    if (isTooSimilarToAny(entry.meaning, usedTexts)) continue;
    picked.push(entry);
    usedTexts.push(entry.meaning);
  }

  // גיבוי: אם לא מצאנו מספיק – כל מי שלא כפול טקסט
  if (picked.length < count) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const entry of shuffled) {
      if (picked.length >= count) break;
      if (picked.some((p) => p.id === entry.id)) continue;
      if (isTooSimilarToAny(entry.meaning, usedTexts, 0.85)) continue;
      picked.push(entry);
      usedTexts.push(entry.meaning);
    }
  }

  return picked.slice(0, count);
}

/** בונה 4 אפשרויות ייחודיות ללא כפילויות וללא מילים נרדפות */
export function buildQuizOptions(correct: VocabEntry, challenging = false): QuizOption[] {
  const distractors = pickDistractors(correct, 3, challenging);

  const options: QuizOption[] = [
    { id: correct.id, text: correct.meaning },
    ...distractors.map((d) => ({ id: d.id, text: d.meaning })),
  ];

  // וידוא סופי – אין טקסטים כפולים
  const unique: QuizOption[] = [];
  const seen = new Set<string>();
  for (const opt of options) {
    const key = normalizeMeaning(opt.text);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(opt);
  }

  // אם חסרות אפשרויות – השלמה
  if (unique.length < 4) {
    const extras = VOCABULARY.filter(
      (v) =>
        !isSynonymEntry(correct, v) &&
        !unique.some((u) => u.id === v.id) &&
        !isTooSimilarToAny(v.meaning, unique.map((u) => u.text))
    ).sort(() => Math.random() - 0.5);

    for (const e of extras) {
      if (unique.length >= 4) break;
      unique.push({ id: e.id, text: e.meaning });
    }
  }

  return unique.slice(0, 4).sort(() => Math.random() - 0.5);
}

/** @deprecated – השתמשו ב-buildQuizOptions */
export function getChallengingDistractors(correct: VocabEntry, count: number): VocabEntry[] {
  return pickDistractors(correct, count, true);
}
