import { VOCABULARY } from '../data/vocabulary';
import type { AppState, CardProgress } from '../types';
import { MAX_SESSION_MINUTES, REVIEW_ONLY_DAYS_BEFORE_EXAM, SESSION_NEW_WORDS_TARGET } from '../types';
import { getDueCards, sortByPriority, countKnown } from './srs';

const AVG_SECONDS_PER_CARD = 45;

export interface StudyPlan {
  daysUntilExam: number | null;
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
  knownWords: number;
  remainingWords: number;
  unassessedWords: number;
  dailyNewTarget: number;
  dailyReviewTarget: number;
  sessionCardLimit: number;
  sessionMinutesLimit: number;
  urgencyLevel: 'relaxed' | 'moderate' | 'intensive' | 'critical';
  message: string;
  onTrack: boolean;
  reviewOnlyMode: boolean;
  weeklyTarget: number;
  projectedCompletionDate: string | null;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function countLearned(cards: Record<string, CardProgress>): number {
  return Object.values(cards).filter((c) => c.state !== 'new').length;
}

function countMastered(cards: Record<string, CardProgress>): number {
  return Object.values(cards).filter(
    (c) => c.state === 'review' && c.repetitions >= 3 && c.interval >= 7
  ).length;
}

function countUnassessed(cards: Record<string, CardProgress>): number {
  return Object.values(cards).filter((c) => c.state === 'new' && !c.introduced).length;
}

export function computeStudyPlan(state: AppState, now = new Date()): StudyPlan {
  const totalWords = VOCABULARY.length;
  const allCards = Object.values(state.cards);
  const learnedWords = countLearned(state.cards);
  const masteredWords = countMastered(state.cards);
  const knownWords = countKnown(state.cards);
  const unassessedWords = countUnassessed(state.cards);
  const remainingNew = Object.values(state.cards).filter(
    (c) => c.state === 'new' && c.introduced
  ).length;
  const remainingWords = totalWords - learnedWords;

  let daysUntilExam: number | null = null;
  if (state.settings.examDate) {
    daysUntilExam = daysBetween(now, new Date(state.settings.examDate));
  }

  const reviewOnlyMode = daysUntilExam !== null && daysUntilExam <= REVIEW_ONLY_DAYS_BEFORE_EXAM;

  let dailyNewTarget: number;
  let urgencyLevel: StudyPlan['urgencyLevel'];
  let message: string;

  if (reviewOnlyMode) {
    dailyNewTarget = 0;
    urgencyLevel = 'critical';
    message = `נשארו ${daysUntilExam} ימים לבחינה – מצב חזרות בלבד! התמקדו במילים שלמדתם`;
  } else if (state.settings.dailyGoalOverride) {
    dailyNewTarget = state.settings.dailyGoalOverride;
    urgencyLevel = 'moderate';
    message = `יעד יומי: ${dailyNewTarget} מילים חדשות + חזרות`;
  } else if (daysUntilExam === null) {
    dailyNewTarget = SESSION_NEW_WORDS_TARGET;
    urgencyLevel = 'relaxed';
    message = 'הגדירו תאריך בחינה לתוכנית מותאמת אישית';
  } else if (daysUntilExam === 0) {
    dailyNewTarget = 0;
    urgencyLevel = 'critical';
    message = 'היום יום הבחינה! חזרו על המילים שלמדתם';
  } else {
    const effectiveRemaining = remainingNew + unassessedWords;
    const studyDays = Math.max(1, daysUntilExam - REVIEW_ONLY_DAYS_BEFORE_EXAM);
    dailyNewTarget = Math.ceil(effectiveRemaining / studyDays);

    if (daysUntilExam <= 7) {
      urgencyLevel = 'critical';
      message = `נשארו ${daysUntilExam} ימים – ${dailyNewTarget} מילים חדשות היום + חזרות`;
    } else if (daysUntilExam <= 30) {
      urgencyLevel = 'intensive';
      message = `${daysUntilExam} ימים לבחינה – קצב אינטנסיבי: ${dailyNewTarget} מילים ביום`;
    } else if (daysUntilExam <= 60) {
      urgencyLevel = 'moderate';
      message = `${daysUntilExam} ימים – קצב מאוזן: ${dailyNewTarget} מילים ביום`;
    } else {
      urgencyLevel = 'relaxed';
      dailyNewTarget = Math.max(3, dailyNewTarget);
      message = `${daysUntilExam} ימים – קצב נוח: ${dailyNewTarget} מילים ביום`;
    }
  }

  const dueReviews = getDueCards(allCards.filter((c) => c.state !== 'new')).length;
  const dailyReviewTarget = Math.min(dueReviews, Math.max(15, Math.ceil(dueReviews * 0.8)));

  const sessionCardLimit = Math.min(
    dailyNewTarget + dailyReviewTarget,
    Math.floor((MAX_SESSION_MINUTES * 60) / AVG_SECONDS_PER_CARD)
  );

  const weeklyTarget = dailyNewTarget * 7;
  let projectedCompletionDate: string | null = null;
  if (daysUntilExam !== null && dailyNewTarget > 0) {
    const daysNeeded = Math.ceil((remainingNew + unassessedWords) / dailyNewTarget);
    const projected = new Date(now);
    projected.setDate(projected.getDate() + daysNeeded);
    projectedCompletionDate = projected.toLocaleDateString('he-IL');
  }

  const onTrack =
    daysUntilExam === null ||
    remainingWords === 0 ||
    (dailyNewTarget > 0 && dailyNewTarget <= Math.ceil((remainingNew + unassessedWords) / Math.max(1, daysUntilExam - REVIEW_ONLY_DAYS_BEFORE_EXAM)) + 1);

  return {
    daysUntilExam,
    totalWords,
    learnedWords,
    masteredWords,
    knownWords,
    remainingWords,
    unassessedWords,
    dailyNewTarget,
    dailyReviewTarget,
    sessionCardLimit,
    sessionMinutesLimit: MAX_SESSION_MINUTES,
    urgencyLevel,
    message,
    onTrack,
    reviewOnlyMode,
    weeklyTarget,
    projectedCompletionDate,
  };
}

export interface SessionQueue {
  newCards: CardProgress[];
  reviewCards: CardProgress[];
  total: number;
}

export function buildSessionQueue(state: AppState, now = Date.now()): SessionQueue {
  const plan = computeStudyPlan(state);
  const allCards = Object.values(state.cards);
  const due = sortByPriority(getDueCards(allCards, now), now);

  const reviewCards = due
    .filter((c) => c.state !== 'new')
    .slice(0, plan.dailyReviewTarget);

  const newCards = plan.reviewOnlyMode
    ? []
    : due
        .filter((c) => c.state === 'new')
        .slice(0, Math.max(0, SESSION_NEW_WORDS_TARGET - state.todayNewCount));

  const combined = [...reviewCards, ...newCards].slice(0, plan.sessionCardLimit);

  return {
    newCards: combined.filter((c) => c.state === 'new'),
    reviewCards: combined.filter((c) => c.state !== 'new'),
    total: combined.length,
  };
}

export function buildAssessmentQueue(state: AppState): CardProgress[] {
  return Object.values(state.cards)
    .filter((c) => c.state === 'new' && !c.introduced)
    .sort(() => Math.random() - 0.5);
}

export function isEveningReviewTime(now = new Date()): boolean {
  const hour = now.getHours();
  return hour >= 20 && hour < 23;
}

export function shouldShowEveningReview(state: AppState, now = new Date()): boolean {
  if (!state.settings.eveningReviewEnabled) return false;
  if (!isEveningReviewTime(now)) return false;
  return countLearned(state.cards) > 0;
}

export function buildEveningQueue(state: AppState): CardProgress[] {
  const learned = Object.values(state.cards).filter((c) => c.state !== 'new');
  return learned
    .sort((a, b) => a.lastReview! - b.lastReview!)
    .slice(0, 20);
}
