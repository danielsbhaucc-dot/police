/** משוב רב-חושי: רטט, צליל, קריאה קולית */
export function haptic(type: 'light' | 'medium' | 'success' | 'error'): void {
  if (!('vibrate' in navigator)) return;
  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 25,
    success: [10, 50, 10],
    error: [30, 40, 30],
  };
  navigator.vibrate(patterns[type]);
}

export function speakHebrew(text: string, rate = 0.85): void {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'he-IL';
  utterance.rate = rate;
  speechSynthesis.speak(utterance);
}

export function flashScreen(color: string, durationMs = 200): void {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;inset:0;z-index:9999;pointer-events:none;
    background:${color};opacity:0.25;
    animation:flashFade ${durationMs}ms ease-out forwards;
  `;
  if (!document.getElementById('flash-style')) {
    const style = document.createElement('style');
    style.id = 'flash-style';
    style.textContent = `@keyframes flashFade{from{opacity:.25}to{opacity:0}}`;
    document.head.appendChild(style);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

export function sensoryCorrect(): void {
  haptic('success');
  flashScreen('rgba(34,197,94,0.3)');
}

export function sensoryWrong(): void {
  haptic('error');
  flashScreen('rgba(239,68,68,0.3)');
}

export function sensorySwipe(): void {
  haptic('light');
}
