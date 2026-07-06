import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { AppState } from '../types';
import { getVocabById } from '../data/vocabulary';
import { buildAssessmentQueue, computeStudyPlan } from '../lib/studyPlan';
import { markCardKnown, markCardIntroduced, recordSession, updateSettings } from '../lib/storage';
import KnowCheckPhase from '../components/KnowCheckPhase';
import QuizPhase from '../components/QuizPhase';
import StudyPlanCard from '../components/StudyPlanCard';

interface Props {
  state: AppState;
  updateState: (fn: (prev: AppState) => AppState) => void;
}

type Phase = 'intro' | 'check' | 'verify' | 'done';

export default function AssessmentPage({ state, updateState }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ known: 0, learning: 0, tested: 0 });

  const plan = computeStudyPlan(state);
  const currentId = queue[index];
  const currentVocab = currentId ? getVocabById(currentId) : undefined;

  const start = useCallback(() => {
    const cards = buildAssessmentQueue(state);
    if (cards.length === 0) {
      setPhase('done');
      return;
    }
    setQueue(cards.map((c) => c.vocabId));
    setIndex(0);
    setStats({ known: 0, learning: 0, tested: 0 });
    setPhase('check');
  }, [state]);

  const advance = () => {
    if (index + 1 >= queue.length) {
      updateState((prev) => {
        const updated = updateSettings(prev, { assessmentDone: true });
        return recordSession(updated, {
          startedAt: Date.now(),
          cardsStudied: stats.tested + 1,
          newCardsStudied: stats.known,
          reviewCardsStudied: 0,
          correctCount: stats.known,
          type: 'assessment',
        });
      });
      setPhase('done');
    } else {
      setIndex((i) => i + 1);
      setPhase('check');
    }
  };

  const handleKnow = () => setPhase('verify');

  const handleDontKnow = () => {
    if (!currentId) return;
    updateState((prev) => markCardIntroduced(prev, currentId));
    setStats((s) => ({ ...s, learning: s.learning + 1, tested: s.tested + 1 }));
    advance();
  };

  const handleVerify = (correct: boolean) => {
    if (!currentId) return;
    if (correct) {
      updateState((prev) => markCardKnown(prev, currentId));
      setStats((s) => ({ ...s, known: s.known + 1, tested: s.tested + 1 }));
    } else {
      updateState((prev) => markCardIntroduced(prev, currentId));
      setStats((s) => ({ ...s, learning: s.learning + 1, tested: s.tested + 1 }));
    }
    advance();
  };

  return (
    <div className="study-page">
      <div className="container">
        <header className="study-header">
          <Link to="/" className="study-header__back">→ חזרה לדף הבית</Link>
        </header>

        <StudyPlanCard plan={plan} />

        {phase === 'intro' && (
          <div className="intro-panel glass">
            <h2>🎯 כמה מילים כבר יודעים?</h2>
            <p>
              עברו על המילים והחליקו: מכירים או לא.
              מילים שתדעו יסולקו מהלימוד ויקלו על העומס.
            </p>
            <p className="intro-panel__meta">
              {plan.unassessedWords} מילים לבדיקה • {plan.knownWords} כבר מסומנות כידועות
            </p>
            <button className="btn btn-primary btn-lg" onClick={start}>
              התחל בדיקת ידע
            </button>
          </div>
        )}

        {phase === 'check' && currentVocab && (
          <KnowCheckPhase
            vocab={currentVocab}
            index={index}
            total={queue.length}
            onKnow={handleKnow}
            onDontKnow={handleDontKnow}
          />
        )}

        {phase === 'verify' && currentVocab && (
          <div className="study-session">
            <p className="swipe-instruction">הוכחתם שאתם מכירים – עכשיו בחינה!</p>
            <QuizPhase vocab={currentVocab} challenging onAnswer={handleVerify} />
          </div>
        )}

        {phase === 'done' && (
          <div className="session-complete glass-strong">
            <div className="session-complete__icon">✅</div>
            <h2>בדיקת הידע הושלמה!</h2>
            <div className="session-complete__stats">
              <div className="plan-stat">
                <div className="plan-stat__value">{stats.known}</div>
                <div className="plan-stat__label">כבר יודעים</div>
              </div>
              <div className="plan-stat">
                <div className="plan-stat__value">{stats.learning}</div>
                <div className="plan-stat__label">ללמוד</div>
              </div>
              <div className="plan-stat">
                <div className="plan-stat__value">{stats.tested}</div>
                <div className="plan-stat__label">נבדקו</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/study/vocabulary" className="btn btn-primary btn-lg">התחל ללמוד</Link>
              <Link to="/" className="btn btn-secondary btn-lg">חזרה לדף הבית</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
