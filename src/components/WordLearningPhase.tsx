import { useState } from 'react';
import type { VocabEntry } from '../data/vocabulary';
import type { CardProgress } from '../types';
import { speakHebrew, haptic, flashScreen } from '../lib/sensory';
import SensoryBar from './SensoryBar';

interface Props {
  vocab: VocabEntry;
  card: CardProgress;
  onSavePersonal: (sentence: string, experience: string) => void;
}

type Step = 'see' | 'hear' | 'write' | 'speak' | 'touch' | 'emotion';

export default function WordLearningPhase({ vocab, card, onSavePersonal }: Props) {
  const [sentence, setSentence] = useState(card.personalSentence);
  const [experience, setExperience] = useState(card.personalExperience);
  const [step, setStep] = useState<Step>('see');
  const [readCount, setReadCount] = useState(0);
  const [meaningRevealed, setMeaningRevealed] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [senses, setSenses] = useState<string[]>([]);

  const activateSense = (id: string) => {
    setSenses((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const revealMeaning = () => {
    setMeaningRevealed(true);
    activateSense('see');
    flashScreen('rgba(59, 130, 246, 0.2)', 300);
    haptic('light');
  };

  const speakWord = () => {
    speakHebrew(vocab.word);
    setReadCount((c) => c + 1);
    activateSense('hear');
    haptic('medium');
  };

  const speakSentence = () => {
    if (sentence.trim()) {
      speakHebrew(sentence);
      activateSense('speak');
      haptic('medium');
    }
  };

  const handleTouch = () => {
    setTapCount((c) => c + 1);
    activateSense('touch');
    haptic('light');
    flashScreen('rgba(251, 191, 36, 0.15)', 150);
  };

  const handleFinish = () => {
    activateSense('emotion');
    onSavePersonal(sentence, experience);
  };

  if (step === 'see') {
    return (
      <div className="learn-step glass">
        <SensoryBar active={senses} />
        <div className="learn-step__badge">👁️ ראייה – קראו את המילה בעיניים</div>
        <div className="word-display word-display--pulse">{vocab.word}</div>

        {!meaningRevealed ? (
          <button className="btn btn-primary btn-lg sensory-btn" onClick={revealMeaning}>
            👁️ גלו את המשמעות
          </button>
        ) : (
          <>
            <div className="word-card__meaning word-card__meaning--reveal">{vocab.meaning}</div>
            {vocab.exampleHint && (
              <p className="learn-step__example">דוגמה: {vocab.exampleHint}</p>
            )}
            <button className="btn btn-primary" onClick={() => { setStep('hear'); activateSense('see'); }}>
              המשך לשמיעה ←
            </button>
          </>
        )}
      </div>
    );
  }

  if (step === 'hear') {
    return (
      <div className="learn-step glass">
        <SensoryBar active={senses} />
        <div className="learn-step__badge">👂 שמיעה – הקשיבו וקראו בקול</div>
        <div className="word-card__word">{vocab.word}</div>
        <div className="word-card__meaning">{vocab.meaning}</div>
        <button className="btn btn-primary btn-lg sensory-btn" onClick={speakWord}>
          🔊 קרא בקול רם {readCount > 0 && `(${readCount}×)`}
        </button>
        <p className="learn-step__tip">לפחות 2 קריאות בקול – שילוב שמיעה ודיבור</p>
        <button
          className="btn btn-secondary"
          disabled={readCount < 2}
          onClick={() => setStep('write')}
        >
          המשך לכתיבה ←
        </button>
      </div>
    );
  }

  if (step === 'write') {
    return (
      <div className="learn-step glass">
        <SensoryBar active={senses} />
        <div className="learn-step__badge">✍️ כתיבה – שבצו במשפט</div>
        <h3>כתבו משפט עם "{vocab.word}"</h3>
        <textarea
          className="textarea"
          value={sentence}
          onChange={(e) => { setSentence(e.target.value); activateSense('write'); }}
          placeholder={`לדוגמה: היום ראיתי ${vocab.word}...`}
        />
        <button
          className="btn btn-primary"
          disabled={!sentence.trim()}
          onClick={() => setStep('speak')}
        >
          המשך לדיבור ←
        </button>
      </div>
    );
  }

  if (step === 'speak') {
    return (
      <div className="learn-step glass">
        <SensoryBar active={senses} />
        <div className="learn-step__badge">🗣️ דיבור – הקראו את המשפט</div>
        <p className="learn-step__sentence-preview">"{sentence}"</p>
        <button className="btn btn-primary btn-lg sensory-btn" onClick={speakSentence}>
          🔊 הקרא את המשפט בקול
        </button>
        <p className="learn-step__tip">הקריאו את המשפט לעצמכם מספר פעמים</p>
        <button className="btn btn-secondary" onClick={() => setStep('touch')}>
          המשך ←
        </button>
      </div>
    );
  }

  if (step === 'touch') {
    return (
      <div className="learn-step glass">
        <SensoryBar active={senses} />
        <div className="learn-step__badge">✋ מישוש – לחצו והרגישו את המילה</div>
        <button className="touch-word-btn" onClick={handleTouch}>
          <span className="touch-word-btn__word">{vocab.word}</span>
          <span className="touch-word-btn__hint">לחצו {tapCount < 3 ? `${3 - tapCount} פעמים נוספות` : '✓'}</span>
        </button>
        <button
          className="btn btn-primary"
          disabled={tapCount < 3}
          onClick={() => setStep('emotion')}
        >
          המשך לקישור רגשי ←
        </button>
      </div>
    );
  }

  return (
    <div className="learn-step glass">
      <SensoryBar active={senses} />
      <div className="learn-step__badge">💭 רגש – קשרו לחוויה אישית</div>
      <h3>מה המילה מזכירה לכם?</h3>
      <textarea
        className="textarea"
        value={experience}
        onChange={(e) => { setExperience(e.target.value); activateSense('emotion'); }}
        placeholder="חוויה, זיכרון, רגש – כל קשר אישי מחזק את הזיכרון"
      />
      <p className="learn-step__tip">קישור רגשי = למידה עמוקה שמתגבשת גם בשינה</p>
      <button className="btn btn-primary btn-lg" disabled={!experience.trim()} onClick={handleFinish}>
        סיימתי – המשך למבחן ←
      </button>
    </div>
  );
}
