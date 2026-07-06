import { Link } from 'react-router-dom';
import { shouldShowEveningReview } from '../lib/studyPlan';
import type { AppState } from '../types';

interface Props {
  state: AppState;
}

export default function EveningReviewBanner({ state }: Props) {
  if (!shouldShowEveningReview(state)) return null;

  return (
    <div className="evening-banner glass">
      <div>
        <strong>🌙 חזרה לפני שינה</strong>
        <p>מידע חדש מתגבש במוח במהלך השינה – זמן מצוין לחזור על מילים שלמדתם היום</p>
      </div>
      <Link to="/study/vocabulary?mode=evening" className="btn btn-primary btn-sm">
        התחל חזרת ערב
      </Link>
    </div>
  );
}
