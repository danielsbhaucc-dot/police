import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { AppState } from './types';
import { loadState, saveState } from './lib/storage';
import HeroPage from './pages/HeroPage';
import StudyPage from './pages/StudyPage';
import AssessmentPage from './pages/AssessmentPage';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => updater(prev));
  }, []);

  return (
    <>
      <div className="app-bg" />
      <Routes>
        <Route path="/" element={<HeroPage state={state} updateState={updateState} />} />
        <Route path="/study/vocabulary" element={<StudyPage state={state} updateState={updateState} />} />
        <Route path="/assess/vocabulary" element={<AssessmentPage state={state} updateState={updateState} />} />
      </Routes>
    </>
  );
}
