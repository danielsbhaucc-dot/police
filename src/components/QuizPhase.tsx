import { useState, useMemo } from 'react';
import type { VocabEntry } from '../data/vocabulary';
import { buildQuizOptions } from '../lib/quiz';
import { sensoryCorrect, sensoryWrong } from '../lib/sensory';

interface Props {
  vocab: VocabEntry;
  challenging?: boolean;
  onAnswer: (correct: boolean) => void;
}

export default function QuizPhase({ vocab, challenging = false, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const options = useMemo(
    () => buildQuizOptions(vocab, challenging),
    [vocab, challenging]
  );

  const handleSelect = (optionId: string) => {
    if (revealed) return;
    setSelected(optionId);
    setRevealed(true);

    const isCorrect = optionId === vocab.id;
    if (isCorrect) sensoryCorrect();
    else sensoryWrong();

    setTimeout(() => onAnswer(isCorrect), isCorrect ? 700 : 1400);
  };

  return (
    <div className="quiz-card glass">
      <div className="quiz-card__question">{vocab.word}</div>
      <div className="quiz-card__hint">
        {challenging ? 'בחינת ידע – 4 אפשרויות מאתגרות' : 'בחרו את הפירוש הנכון מבין 4 אפשרויות'}
      </div>

      <div className="quiz-options">
        {options.map((opt) => {
          let className = 'quiz-option';
          if (revealed) {
            if (opt.id === vocab.id) className += ' quiz-option--correct';
            else if (opt.id === selected) className += ' quiz-option--wrong';
          }
          return (
            <button
              key={opt.id}
              className={className}
              onClick={() => handleSelect(opt.id)}
              disabled={revealed}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
