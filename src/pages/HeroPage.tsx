import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '../types';
import { VOCABULARY, LEARNING_PRINCIPLES } from '../data/vocabulary';
import { computeStudyPlan } from '../lib/studyPlan';
import { updateSettings } from '../lib/storage';
import ExamDateModal from '../components/ExamDateModal';

interface Props {
  state: AppState;
  updateState: (fn: (prev: AppState) => AppState) => void;
}

const TOPICS = [
  {
    id: 'vocabulary',
    icon: '📚',
    title: 'אוצר מילים',
    description: `${VOCABULARY.length} מילים וביטויים עם חזרה מרווחת חכמה`,
    active: true,
    badges: [`${VOCABULARY.length} מילים`, '4 אפשרויות', 'SRS'],
  },
  {
    id: 'math',
    icon: '🔢',
    title: 'חשבון',
    description: 'בקרוב – תרגול שאלות חשבון למבחן',
    active: false,
    badges: ['בקרוב'],
  },
  {
    id: 'logic',
    icon: '🧩',
    title: 'חשיבה לוגית',
    description: 'בקרוב – תרגול חשיבה לוגית ואנלוגיות',
    active: false,
    badges: ['בקרוב'],
  },
];

export default function HeroPage({ state, updateState }: Props) {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState('vocabulary');
  const [showExamModal, setShowExamModal] = useState(!state.settings.examDate);
  const plan = computeStudyPlan(state);

  const handleStart = () => {
    if (selectedTopic === 'vocabulary') navigate('/study/vocabulary');
  };

  const handleSaveExamDate = (date: string) => {
    updateState((prev) => updateSettings(prev, { examDate: date, onboardingComplete: true }));
    setShowExamModal(false);
  };

  return (
    <section className="hero">
      <div className="hero__glow" />
      <div className="hero__glow hero__glow--2" />

      <div className="container">
        <nav className="hero__nav animate-in">
          <div className="hero__logo">
            <div className="hero__logo-icon">🛡️</div>
            <span>הכנה למבחן משטרה</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowExamModal(true)}>
            {state.settings.examDate
              ? `📅 ${new Date(state.settings.examDate).toLocaleDateString('he-IL')}`
              : 'הגדר תאריך בחינה'}
          </button>
        </nav>

        <div className="hero__content">
          <div className="hero__badge badge badge-blue animate-in animate-delay-1">
            למידה רב-חושית • חזרה מרווחת חכמה
          </div>

          <h1 className="hero__title animate-in animate-delay-1">
            הכנה חכמה<br />למבחן משטרת ישראל
          </h1>

          <p className="hero__subtitle animate-in animate-delay-2">
            מערכת למידה עם חזרה מרווחת, התאמה לתאריך הבחינה,
            שילוב חושים ושיטות לימוד מוכחות – בדיוק כמו במבחן.
          </p>

          <div className="hero__topics animate-in animate-delay-2">
            {TOPICS.map((topic) => (
              <div
                key={topic.id}
                className={`topic-card glass ${selectedTopic === topic.id ? 'topic-card--active' : ''} ${!topic.active ? 'topic-card--disabled' : ''}`}
                onClick={() => topic.active && setSelectedTopic(topic.id)}
              >
                <div className="topic-card__icon">{topic.icon}</div>
                <div className="topic-card__title">{topic.title}</div>
                <div className="topic-card__desc">{topic.description}</div>
                <div className="topic-card__meta">
                  {topic.badges.map((b) => (
                    <span key={b} className="badge badge-blue">{b}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="hero__cta animate-in animate-delay-3">
            <button className="btn btn-primary btn-lg" onClick={handleStart}>
              התחל ללמוד ←
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/assess/vocabulary')}>
              כמה מילים כבר יודעים?
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => setShowExamModal(true)}>
              הגדר תאריך בחינה
            </button>
          </div>

          <div className="hero__stats animate-in animate-delay-3">
            <div className="stat-card glass">
              <div className="stat-card__value">{VOCABULARY.length}</div>
              <div className="stat-card__label">מילים ברשימה</div>
            </div>
            <div className="stat-card glass">
              <div className="stat-card__value">{plan.knownWords}</div>
              <div className="stat-card__label">כבר יודעים</div>
            </div>
            <div className="stat-card glass">
              <div className="stat-card__value">{plan.masteredWords}</div>
              <div className="stat-card__label">שולטים</div>
            </div>
            <div className="stat-card glass">
              <div className="stat-card__value">
                {plan.daysUntilExam !== null ? plan.daysUntilExam : '—'}
              </div>
              <div className="stat-card__label">ימים לבחינה</div>
            </div>
          </div>

          <div className="hero__principles glass animate-in animate-delay-4">
            <h3>עקרונות הלמידה</h3>
            <ul className="principles-list">
              {LEARNING_PRINCIPLES.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {showExamModal && (
        <ExamDateModal
          currentDate={state.settings.examDate}
          onSave={handleSaveExamDate}
          onClose={() => setShowExamModal(false)}
        />
      )}
    </section>
  );
}
