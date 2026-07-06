import { Link } from 'react-router-dom';
import type { StudyPlan } from '../lib/studyPlan';

interface Props {
  stats: { correct: number; studied: number; new: number; review: number };
  plan: StudyPlan;
  onRestart: () => void;
}

export default function SessionComplete({ stats, plan, onRestart }: Props) {
  const accuracy = stats.studied > 0 ? Math.round((stats.correct / stats.studied) * 100) : 0;

  return (
    <div className="session-complete glass-strong">
      <div className="session-complete__icon">🎉</div>
      <h2>כל הכבוד! סיימתם את הסשן</h2>
      <p>
        זכרו: המטרה היא לא להספיק לעבור על כמה שיותר מילים
        אלא להטמיע היטב את המילים שלמדתם.
        {plan.remainingWords > 0 && ' מומלץ לחזור על המילים סמוך לשעת השינה.'}
      </p>

      <div className="session-complete__stats">
        <div className="plan-stat">
          <div className="plan-stat__value">{stats.studied}</div>
          <div className="plan-stat__label">מילים בתרגול</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat__value">{accuracy}%</div>
          <div className="plan-stat__label">דיוק במבחן</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat__value">{stats.new}</div>
          <div className="plan-stat__label">מילים חדשות</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-lg" onClick={onRestart}>
          סשן נוסף
        </button>
        <Link to="/" className="btn btn-secondary btn-lg">
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
