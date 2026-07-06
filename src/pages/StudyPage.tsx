import { useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AppState, CardProgress, Rating, StudySession } from '../types';
import { SESSION_NEW_WORDS_TARGET } from '../types';
import { getVocabById } from '../data/vocabulary';
import { computeStudyPlan, buildEveningQueue } from '../lib/studyPlan';
import { buildSessionSetup, pullNextNewWord } from '../lib/sessionQueue';
import { applyRating, masteryPercent } from '../lib/srs';
import { updateCard, recordSession, savePersonalData, markCardSkipped, markCardIntroduced } from '../lib/storage';
import StudyPlanCard from '../components/StudyPlanCard';
import SessionTimer from '../components/SessionTimer';
import KnowCheckPhase from '../components/KnowCheckPhase';
import WordLearningPhase from '../components/WordLearningPhase';
import QuizPhase from '../components/QuizPhase';
import SessionComplete from '../components/SessionComplete';
import EveningReviewBanner from '../components/EveningReviewBanner';

interface Props {
  state: AppState;
  updateState: (fn: (prev: AppState) => AppState) => void;
}

type Phase = 'intro' | 'check' | 'learn' | 'verify-quiz' | 'quiz' | 'rate' | 'complete';
type SessionMode = 'reviews' | 'new-words';

export default function StudyPage({ state, updateState }: Props) {
  const [searchParams] = useSearchParams();
  const isEvening = searchParams.get('mode') === 'evening';

  const [phase, setPhase] = useState<Phase>('intro');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>('new-words');
  const [reviewQueue, setReviewQueue] = useState<CardProgress[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [newWordPool, setNewWordPool] = useState<CardProgress[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [currentCard, setCurrentCard] = useState<CardProgress | null>(null);
  const [newWordsCompleted, setNewWordsCompleted] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, studied: 0, new: 0, review: 0 });
  const [claimedKnow, setClaimedKnow] = useState(false);
  const sessionStart = useRef(Date.now());

  const plan = computeStudyPlan(state);
  const currentVocab = currentCard ? getVocabById(currentCard.vocabId) : undefined;
  const isNewCard = currentCard?.state === 'new';

  const beginNewWord = useCallback((pool: CardProgress[], used: Set<string>) => {
    const next = pullNextNewWord(pool, used);
    if (!next) {
      setPhase('complete');
      setSessionActive(false);
      return false;
    }
    setUsedIds(new Set([...used, next.vocabId]));
    setCurrentCard(next);
    setPhase(next.introduced ? 'learn' : 'check');
    setClaimedKnow(false);
    return true;
  }, []);

  const startSession = useCallback(() => {
    sessionStart.current = Date.now();
    setSessionStats({ correct: 0, studied: 0, new: 0, review: 0 });
    setNewWordsCompleted(0);
    setSkippedCount(0);
    setUsedIds(new Set());
    setSessionActive(true);

    if (isEvening) {
      const cards = buildEveningQueue(state);
      if (cards.length === 0) { setPhase('complete'); setSessionActive(false); return; }
      setSessionMode('reviews');
      setReviewQueue(cards);
      setReviewIndex(0);
      setCurrentCard(cards[0]);
      setPhase('quiz');
      return;
    }

    const setup = buildSessionSetup(state);
    setNewWordPool(setup.newWordPool);

    if (setup.reviewQueue.length > 0) {
      setSessionMode('reviews');
      setReviewQueue(setup.reviewQueue);
      setReviewIndex(0);
      setCurrentCard(setup.reviewQueue[0]);
      setPhase('quiz');
    } else {
      setSessionMode('new-words');
      beginNewWord(setup.newWordPool, new Set());
    }
  }, [state, isEvening, beginNewWord]);

  const finishSession = useCallback(() => {
    const session: StudySession = {
      startedAt: sessionStart.current,
      cardsStudied: sessionStats.studied,
      newCardsStudied: newWordsCompleted,
      reviewCardsStudied: sessionStats.review,
      correctCount: sessionStats.correct,
      type: isEvening ? 'evening' : 'study',
    };
    updateState((prev) => recordSession(prev, session));
    setPhase('complete');
    setSessionActive(false);
  }, [sessionStats, newWordsCompleted, updateState, isEvening]);

  const tryCompleteOrNextNew = useCallback(() => {
    if (newWordsCompleted >= SESSION_NEW_WORDS_TARGET) {
      finishSession();
      return;
    }
    const ok = beginNewWord(newWordPool, usedIds);
    if (!ok && newWordsCompleted < SESSION_NEW_WORDS_TARGET) {
      finishSession();
    }
  }, [newWordsCompleted, newWordPool, usedIds, beginNewWord, finishSession]);

  const advanceReview = useCallback(() => {
    const nextIdx = reviewIndex + 1;
    if (nextIdx < reviewQueue.length) {
      setReviewIndex(nextIdx);
      setCurrentCard(reviewQueue[nextIdx]);
      setPhase('quiz');
    } else if (!isEvening) {
      setSessionMode('new-words');
      beginNewWord(newWordPool, usedIds);
    } else {
      finishSession();
    }
  }, [reviewIndex, reviewQueue, isEvening, newWordPool, usedIds, beginNewWord, finishSession]);

  const handleKnow = () => {
    setClaimedKnow(true);
    setPhase('verify-quiz');
  };

  const handleDontKnow = () => {
    if (!currentCard) return;
    updateState((prev) => markCardIntroduced(prev, currentCard.vocabId));
    setCurrentCard({ ...currentCard, introduced: true });
    setPhase('learn');
  };

  const handleVerifyQuiz = (correct: boolean) => {
    if (!currentCard) return;

    if (correct && claimedKnow) {
      updateState((prev) => markCardSkipped(prev, currentCard.vocabId));
      setSkippedCount((s) => s + 1);
      tryCompleteOrNextNew();
    } else {
      updateState((prev) => markCardIntroduced(prev, currentCard.vocabId));
      setCurrentCard({ ...currentCard, introduced: true });
      setPhase('learn');
    }
  };

  const handleQuizAnswer = (correct: boolean) => {
    if (correct) setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
    setPhase('rate');
  };

  const handleRating = (rating: Rating) => {
    if (!currentCard) return;

    if (sessionMode === 'reviews' || isEvening) {
      const updated = applyRating(currentCard, rating);
      updateState((prev) => updateCard(prev, updated));
      setSessionStats((s) => ({ ...s, studied: s.studied + 1, review: s.review + 1 }));
      advanceReview();
      return;
    }

    const wasNew = currentCard.state === 'new';
    const updated = applyRating(currentCard, rating);
    updateState((prev) => updateCard(prev, updated));
    const completed = newWordsCompleted + 1;
    setNewWordsCompleted(completed);
    setSessionStats((s) => ({
      ...s,
      studied: s.studied + 1,
      new: wasNew ? s.new + 1 : s.new,
    }));

    if (completed >= SESSION_NEW_WORDS_TARGET) {
      finishSession();
    } else {
      tryCompleteOrNextNew();
    }
  };

  const handleSavePersonal = (sentence: string, experience: string) => {
    if (!currentCard) return;
    updateState((prev) => savePersonalData(prev, currentCard.vocabId, { sentence, experience }));
    setPhase('quiz');
  };

  const newProgressLabel = `${newWordsCompleted}/${SESSION_NEW_WORDS_TARGET} מילים חדשות`;

  return (
    <div className="study-page">
      <div className="container">
        <header className="study-header">
          <Link to="/" className="study-header__back">→ חזרה לדף הבית</Link>
          {sessionActive && (
            <SessionTimer active={sessionActive} startedAt={sessionStart.current} />
          )}
        </header>

        <StudyPlanCard plan={plan} />
        {phase === 'intro' && <EveningReviewBanner state={state} />}

        {phase === 'intro' && (
          <div className="intro-panel glass">
            <h2>{isEvening ? '🌙 חזרת ערב' : 'מוכנים לתרגל?'}</h2>
            <p>{isEvening ? 'חזרו על מילים שלמדתם – מידע מתגבש בשינה' : plan.message}</p>
            {!isEvening && (
              <p className="intro-panel__meta">
                כל שיעור: {SESSION_NEW_WORDS_TARGET} מילים חדשות ללמידה
                {plan.dailyReviewTarget > 0 && ` + ${plan.dailyReviewTarget} חזרות`}
                • מקס׳ 30 דקות
              </p>
            )}
            <button className="btn btn-primary btn-lg" onClick={startSession}>
              {isEvening ? 'התחל חזרת ערב' : 'התחל סשן לימוד'}
            </button>
          </div>
        )}

        {sessionMode === 'new-words' && phase !== 'intro' && phase !== 'complete' && !isEvening && (
          <div className="session-new-progress glass">
            <span>{newProgressLabel}</span>
            {skippedCount > 0 && (
              <span className="session-new-progress__skipped">{skippedCount} דולגו (כבר ידועות)</span>
            )}
          </div>
        )}

        {phase === 'check' && currentVocab && (
          <KnowCheckPhase
            vocab={currentVocab}
            index={newWordsCompleted}
            total={SESSION_NEW_WORDS_TARGET}
            onKnow={handleKnow}
            onDontKnow={handleDontKnow}
          />
        )}

        {phase === 'verify-quiz' && currentVocab && (
          <div className="study-session">
            <p className="swipe-instruction">הוכחתם שאתם מכירים – בחינה קצרה (לא נספרת בשיעור)</p>
            <QuizPhase vocab={currentVocab} challenging onAnswer={handleVerifyQuiz} />
          </div>
        )}

        {phase === 'learn' && currentVocab && currentCard && (
          <div className="study-session">
            <div className="session-progress">
              <div className="session-progress__header">
                <span>{newProgressLabel}</span>
                <span>{masteryPercent(currentCard)}% שליטה</span>
              </div>
            </div>
            <WordLearningPhase
              vocab={currentVocab}
              card={currentCard}
              onSavePersonal={handleSavePersonal}
            />
          </div>
        )}

        {phase === 'quiz' && currentVocab && (
          <div className="study-session">
            <QuizPhase
              vocab={currentVocab}
              challenging={!isNewCard || claimedKnow}
              onAnswer={handleQuizAnswer}
            />
          </div>
        )}

        {phase === 'rate' && currentVocab && (
          <div className="study-session">
            <div className="word-card glass">
              <div className="word-card__label">עד כמה זכרתם?</div>
              <div className="word-card__word">{currentVocab.word}</div>
              <div className="word-card__meaning">{currentVocab.meaning}</div>
            </div>
            <div className="rating-buttons">
              <button className="rating-btn rating-btn--again" onClick={() => handleRating('again')}>שוב<span>&lt;1 דק׳</span></button>
              <button className="rating-btn rating-btn--hard" onClick={() => handleRating('hard')}>קשה<span>~10 דק׳</span></button>
              <button className="rating-btn rating-btn--good" onClick={() => handleRating('good')}>טוב<span>1 יום</span></button>
              <button className="rating-btn rating-btn--easy" onClick={() => handleRating('easy')}>קל<span>4 ימים</span></button>
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <SessionComplete
            stats={{ ...sessionStats, new: newWordsCompleted }}
            plan={plan}
            skippedCount={skippedCount}
            onRestart={startSession}
          />
        )}
      </div>
    </div>
  );
}
