import type { StudyPlan } from '../lib/studyPlan';

interface Props {
  plan: StudyPlan;
}

const URGENCY_LABELS: Record<StudyPlan['urgencyLevel'], { label: string; class: string }> = {
  relaxed: { label: 'קצב נוח', class: 'badge-green' },
  moderate: { label: 'קצב מאוזן', class: 'badge-blue' },
  intensive: { label: 'אינטנסיבי', class: 'badge-gold' },
  critical: { label: 'דחוף!', class: 'badge-red' },
};

export default function StudyPlanCard({ plan }: Props) {
  const urgency = URGENCY_LABELS[plan.urgencyLevel];
  const progressPercent = plan.totalWords > 0
    ? Math.round((plan.learnedWords / plan.totalWords) * 100)
    : 0;

  return (
    <div className="study-plan-card glass">
      <div className="study-plan-card__header">
        <h2>תוכנית הלימוד שלך</h2>
        <span className={`badge ${urgency.class}`}>{urgency.label}</span>
      </div>

      {plan.daysUntilExam !== null && (
        <p className="study-plan-card__exam">
          📅 {plan.daysUntilExam} ימים לבחינה
          {plan.projectedCompletionDate && !plan.reviewOnlyMode && (
            <span className="study-plan-card__projected">
              {' '}• סיום משוער: {plan.projectedCompletionDate}
            </span>
          )}
        </p>
      )}

      <p className="study-plan-card__message">{plan.message}</p>

      <div className="progress-bar" style={{ marginTop: '12px' }}>
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="session-progress__header" style={{ marginTop: '4px' }}>
        <span>התקדמות</span>
        <span>{progressPercent}%</span>
      </div>

      <div className="study-plan-card__grid">
        <div className="plan-stat">
          <div className="plan-stat__value">{plan.dailyNewTarget}</div>
          <div className="plan-stat__label">חדשות היום</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat__value">{plan.dailyReviewTarget}</div>
          <div className="plan-stat__label">חזרות</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat__value">{plan.knownWords}</div>
          <div className="plan-stat__label">כבר יודעים</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat__value">{plan.unassessedWords}</div>
          <div className="plan-stat__label">לבדיקה</div>
        </div>
      </div>

      {plan.reviewOnlyMode && (
        <div className="evening-banner" style={{ marginTop: '12px' }}>
          🌙 מצב חזרות לפני בחינה – מידע מתגבש בשינה, חזרו הערב!
        </div>
      )}
    </div>
  );
}
