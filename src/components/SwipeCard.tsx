import { useState, useRef, useCallback, type ReactNode } from 'react';
import { sensorySwipe } from '../lib/sensory';

interface SwipeCardProps {
  children: ReactNode;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  rightLabel?: string;
  leftLabel?: string;
}

const SWIPE_THRESHOLD = 80;

export default function SwipeCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'מכיר ✓',
  leftLabel = 'לא מכיר ✗',
}: SwipeCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const handleStart = (clientX: number, clientY: number) => {
    startX.current = clientX;
    startY.current = clientY;
    isHorizontal.current = null;
    setDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragging) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;

    if (isHorizontal.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (isHorizontal.current) {
      setOffsetX(dx);
    }
  };

  const handleEnd = useCallback(() => {
    if (offsetX > SWIPE_THRESHOLD) {
      sensorySwipe();
      onSwipeRight();
    } else if (offsetX < -SWIPE_THRESHOLD) {
      sensorySwipe();
      onSwipeLeft();
    }
    setOffsetX(0);
    setDragging(false);
    isHorizontal.current = null;
  }, [offsetX, onSwipeRight, onSwipeLeft]);

  const rotation = offsetX * 0.05;
  const rightOpacity = Math.min(1, Math.max(0, offsetX / SWIPE_THRESHOLD));
  const leftOpacity = Math.min(1, Math.max(0, -offsetX / SWIPE_THRESHOLD));

  return (
    <div className="swipe-container">
      <div className="swipe-hint swipe-hint--right" style={{ opacity: rightOpacity }}>
        {rightLabel}
      </div>
      <div className="swipe-hint swipe-hint--left" style={{ opacity: leftOpacity }}>
        {leftLabel}
      </div>

      <div
        className={`swipe-card glass ${dragging ? 'swipe-card--dragging' : ''}`}
        style={{
          transform: `translateX(${offsetX}px) rotate(${rotation}deg)`,
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => dragging && handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={() => dragging && handleEnd()}
      >
        {children}
      </div>

      <div className="swipe-actions">
        <button className="swipe-btn swipe-btn--no" onClick={() => { sensorySwipe(); onSwipeLeft(); }}>
          ✗ לא מכיר
        </button>
        <button className="swipe-btn swipe-btn--yes" onClick={() => { sensorySwipe(); onSwipeRight(); }}>
          ✓ מכיר
        </button>
      </div>
    </div>
  );
}
