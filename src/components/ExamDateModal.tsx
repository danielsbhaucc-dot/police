interface Props {
  currentDate: string | null;
  onSave: (date: string) => void;
  onClose: () => void;
}

export default function ExamDateModal({ currentDate, onSave, onClose }: Props) {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minStr = minDate.toISOString().slice(0, 10);

  const defaultDate = currentDate ?? (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().slice(0, 10);
  })();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const date = form.get('examDate') as string;
    if (date) onSave(date);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-strong" onClick={(e) => e.stopPropagation()}>
        <h2>מתי הבחינה שלך?</h2>
        <p>
          נתאים את קצב הלימוד, מספר המילים היומי ועוצמת החזרות
          לפי הזמן שנשאר – בדיוק כמו Duocards.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="label" htmlFor="examDate">תאריך הבחינה</label>
          <input
            id="examDate"
            name="examDate"
            type="date"
            className="input"
            defaultValue={defaultDate}
            min={minStr}
            required
          />
          <div className="modal__actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              אחר כך
            </button>
            <button type="submit" className="btn btn-primary">
              שמור והתאם תוכנית
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
