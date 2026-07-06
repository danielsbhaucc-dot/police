import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AppState, CardProgress, Rating, StudySession } from '../types';
import { getVocabById } from '../data/vocabulary';
import { computeStudyPlan, buildSessionQueue, buildEveningQueue } from '../lib/studyPlan';
import { applyRating, sortByPriority, getDueCards, masteryPercent } from '../lib/srs';
import { updateCard, recordSession, savePersonalData, markCardKnown, markCardIntroduced } from '../lib/storage';
import { MAX_SESSION_MINUTES } from '../types';
import StudyPlanCard from '../components/StudyPlanCard';
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

export default function StudyPage({ state, updateState }: Props) {
  const [searchParams] = useSearchParams();
  const isEvening = searchParams.get('mode') === 'evening';

  const [phase, setPhase] = useState<Phase>('intro');
  const [queue, setQueue] = useState<CardProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, studied: 0, new: 0, review: 0 });
  const [claimedKnow, setClaimedKnow] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const sessionStart = useRef(Date.now());

  const plan = computeStudyPlan(state);
  const currentCard = queue[currentIndex];
  const currentVocab = currentCard ? getVocabById(currentCard.vocabId) : undefined;
  const isNewCard = currentCard?.state === 'new';

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - sessionStart.current) / 60000));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getInitialPhase = (card: CardProgress): Phase => {
    if (card.state === 'new' && !card.introduced) return 'check';
    if (card.state === 'new') return 'learn';
    return 'quiz';
  };

  const startSession = useCallback(() => {
    let cards: CardProgress[];
    if (isEvening) {
      cards = buildEveningQueue(state);
    } else {
      const sq = buildSessionQueue(state);
      cards = [...sq.reviewCards, ...sq.newCards];
      if (cards.length === 0) {
        const due = sortByPriority(getDueCards(Object.values(state.cards)));
        cards = due.slice(0, 15);
      }
    }
    if (cards.length === 0) {
      setPhase('complete');
      return;
    }
    sessionStart.current = Date.now();
    setQueue(cards);
    setCurrentIndex(0);
    setSessionStats({ correct: 0, studied: 0, new: 0, review: 0 });
    setPhase(getInitialPhase(cards[0]));
  }, [state, isEvening]);

  const advanceCard = useCallback(() => {
    if (currentIndex + 1 >= queue.length) {
      const session: StudySession = {
        startedAt: sessionStart.current,
        cardsStudied: sessionStats.studied + 1,
        newCardsStudied: sessionStats.new,
        reviewCardsStudied: sessionStats.review,
        correctCount: sessionStats.correct,
        type: isEvening ? 'evening' : 'study',
      };
      updateState((prev) => recordSession(prev, session));
      setPhase('complete');
    } else {
      const next = queue[currentIndex + 1];
      setCurrentIndex((i) => i + 1);
      setClaimedKnow(false);
      setPhase(getInitialPhase(next));
    }
  }, [currentIndex, queue, sessionStats, updateState, isEvening]);

  const handleKnow = () => {
    setClaimedKnow(true);
    setPhase('verify-quiz');
  };

  const handleDontKnow = () => {
    if (!currentCard) return;
    updateState((prev) => markCardIntroduced(prev, currentCard.vocabId));
    setPhase('learn');
  };

  const handleVerifyQuiz = (correct: boolean) => {
    if (!currentCard) return;

    if (correct && claimedKnow) {
      updateState((prev) => markCardKnown(prev, currentCard.vocabId));
      setSessionStats((s) => ({
        ...s,
        studied: s.studied + 1,
        correct: s.correct + 1,
        new: s.new + 1,
      }));
      advanceCard();
    } else {
      updateState((prev) => markCardIntroduced(prev, currentCard.vocabId));
      setPhase('learn');
    }
  };

  const handleQuizAnswer = (correct: boolean) => {
    if (correct) setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
    setPhase('rate');
  };

  const handleRating = (rating: Rating) => {
    if (!currentCard) return;
    const wasNew = currentCard.state === 'new';
    const updated = applyRating(currentCard, rating);
    updateState((prev) => updateCard(prev, updated));
    setSessionStats((s) => ({
      ...s,
      studied: s.studied + 1,
      new: wasNew ? s.new + 1 : s.new,
      review: !wasNew ? s.review + 1 : s.review,
    }));
    advanceCard();
  };

  const handleSavePersonal = (sentence: string, experience: string) => {
    if (!currentCard) return;
    updateState((prev) => savePersonalData(prev, currentCard.vocabId, { sentence, experience }));
    setPhase('quiz');
  };

  const timeWarning = elapsedMinutes >= MAX_SESSION_MINUTES - 5;
  const timeExceeded = elapsedMinutes >= MAX_SESSION_MINUTES;

  return (
    <div className="study-page">
      <div className="container">
        <header className="study-header">
          <Link to="/" className="study-header__back">→ חזרה לדף הבית</Link>
          {phase !== 'intro' && phase !== 'complete' && (
            <div className={`session-timer ${timeWarning ? 'session-timer--warning' : ''}`}>
              ⏱️ {elapsedMinutes}/{MAX_SESSION_MINUTES} דק׳
              {timeExceeded && ' – הפסקה!'}
            </div>
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
                היום: {plan.dailyNewTarget} חדשות + {plan.dailyReviewTarget} חזרות
                • מקס׳ {plan.sessionMinutesLimit} דקות
              </p>
            )}
            <button className="btn btn-primary btn-lg" onClick={startSession}>
              {isEvening ? 'התחל חזרת ערב' : 'התחל סשן לימוד'}
            </button>
          </div>
        )}

        {phase === 'check' && currentVocab && (
          <KnowCheckPhase
            vocab={currentVocab}
            index={currentIndex}
            total={queue.length}
            onKnow={handleKnow}
            onDontKnow={handleDontKnow}
          />
        )}

        {phase === 'verify-quiz' && currentVocab && (
          <div className="study-session">
            <QuizPhase vocab={currentVocab} challenging onAnswer={handleVerifyQuiz} />
          </div>
        )}

        {phase === 'learn' && currentVocab && currentCard && (
          <div className="study-session">
            <div className="session-progress">
              <div className="session-progress__header">
                <span>{currentIndex + 1}/{queue.length}</span>
                <span>{masteryPercent(currentCard)}% שליטה</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(currentIndex / queue.length) * 100}%` }} />
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
              <button className="rating-btn rating-btn--again" onClick={() => handleRating('again')}>
                שוב<span>&lt;1 דק׳</span>
              </button>
              <button className="rating-btn rating-btn--hard" onClick={() => handleRating('hard')}>
                קשה<span>~10 דק׳</span>
              </button>
              <button className="rating-btn rating-btn--good" onClick={() => handleRating('good')}>
                טוב<span>1 יום</span>
              </button>
              <button className="rating-btn rating-btn--easy" onClick={() => handleRating('easy')}>
                קל<span>4 ימים</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <SessionComplete stats={sessionStats} plan={plan} onRestart={startSession} />
        )}
      </div>
    </div>
  );
}
