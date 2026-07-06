import type { VocabEntry } from '../data/vocabulary';
import SwipeCard from './SwipeCard';
import { speakHebrew } from '../lib/sensory';

interface Props {
  vocab: VocabEntry;
  index: number;
  total: number;
  onKnow: () => void;
  onDontKnow: () => void;
}

export default function KnowCheckPhase({ vocab, index, total, onKnow, onDontKnow }: Props) {
  return (
    <div className="study-session">
      <div className="session-progress">
        <div className="session-progress__header">
          <span>{index + 1} / {total}</span>
          <span>האם מכירים?</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((index) / total) * 100}%` }} />
        </div>
      </div>

      <p className="swipe-instruction">החליקו ימינה = מכיר │ שמאלה = לא מכיר</p>

      <SwipeCard onSwipeRight={onKnow} onSwipeLeft={onDontKnow}>
        <div className="know-check">
          <div className="know-check__word">{vocab.word}</div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => { e.stopPropagation(); speakHebrew(vocab.word); }}
          >
            🔊 הקרא בקול
          </button>
          <p className="know-check__prompt">האם אתם מכירים את המילה?</p>
        </div>
      </SwipeCard>
    </div>
  );
}
