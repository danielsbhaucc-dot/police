import { useState } from 'react';
import type { VocabEntry } from '../data/vocabulary';
import type { CardProgress } from '../types';
import { speakHebrew, haptic } from '../lib/sensory';

interface Props {
  vocab: VocabEntry;
  card: CardProgress;
  onSavePersonal: (sentence: string, experience: string) => void;
}

export default function WordLearningPhase({ vocab, card, onSavePersonal }: Props) {
  const [sentence, setSentence] = useState(card.personalSentence);
  const [experience, setExperience] = useState(card.personalExperience);
  const [step, setStep] = useState<'hear' | 'sentence' | 'experience'>('hear');
  const [readCount, setReadCount] = useState(0);

  const speakWord = () => {
    speakHebrew(vocab.word);
    setReadCount((c) => c + 1);
    haptic('light');
  };

  const speakSentence = () => {
    if (sentence.trim()) {
      speakHebrew(sentence);
      haptic('light');
    }
  };

  const handleFinish = () => {
    onSavePersonal(sentence, experience);
  };

  if (step === 'hear') {
    return (
      <div className="learn-step glass">
        <div className="learn-step__badge">👂 שמיעה</div>
        <div className="word-card__word">{vocab.word}</div>
        <div className="word-card__meaning">{vocab.meaning}</div>

        {vocab.relatedWords && (
          <p className="learn-step__meta">מילים קשורות: {vocab.relatedWords.join(' • ')}</p>
        )}
        {vocab.exampleHint && (
          <p className="learn-step__example">דוגמה: {vocab.exampleHint}</p>
        )}

        <button className="btn btn-primary btn-lg sensory-btn" onClick={speakWord}>
          🔊 קרא בקול רם {readCount > 0 && `(${readCount}×)`}
        </button>
        <p className="learn-step__tip">קראו לפחות פעמיים כדי לערב את חוש השמיעה</p>

        <button
          className="btn btn-secondary"
          disabled={readCount < 1}
          onClick={() => setStep('sentence')}
        >
          המשך ←
        </button>
      </div>
    );
  }

  if (step === 'sentence') {
    return (
      <div className="learn-step glass">
        <div className="learn-step__badge">✍️ כתיבה + שמיעה</div>
        <h3>שבצו את "{vocab.word}" במשפט</h3>
        <textarea
          className="textarea"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={`לדוגמה: היום ראיתי ${vocab.word}...`}
        />
        <div className="learn-step__actions">
          <button className="btn btn-secondary" onClick={speakSentence} disabled={!sentence.trim()}>
            🔊 הקרא את המשפט
          </button>
          <button
            className="btn btn-primary"
            disabled={!sentence.trim()}
            onClick={() => setStep('experience')}
          >
            המשך ←
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="learn-step glass">
      <div className="learn-step__badge">💭 רגש + זיכרון</div>
      <h3>קשרו לחוויה אישית</h3>
      <textarea
        className="textarea"
        value={experience}
        onChange={(e) => setExperience(e.target.value)}
        placeholder="מתי פגשתם מילה דומה? מה זה מזכיר לכם?"
      />
      <p className="learn-step__tip">קישור רגשי מחזק את הזיכרון לטווח ארוך</p>
      <button className="btn btn-primary btn-lg" onClick={handleFinish}>
        המשך למבחן ←
      </button>
    </div>
  );
}
