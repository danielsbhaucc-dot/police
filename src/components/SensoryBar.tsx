interface Props {
  active: string[];
}

const SENSES = [
  { id: 'see', icon: '👁️', label: 'ראייה' },
  { id: 'hear', icon: '👂', label: 'שמיעה' },
  { id: 'touch', icon: '✋', label: 'מישוש' },
  { id: 'write', icon: '✍️', label: 'כתיבה' },
  { id: 'emotion', icon: '💭', label: 'רגש' },
];

export default function SensoryBar({ active }: Props) {
  return (
    <div className="sensory-bar">
      {SENSES.map((s) => (
        <div
          key={s.id}
          className={`sensory-bar__item ${active.includes(s.id) ? 'sensory-bar__item--active' : ''}`}
        >
          <span className="sensory-bar__icon">{s.icon}</span>
          <span className="sensory-bar__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
