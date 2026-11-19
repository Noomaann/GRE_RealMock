import React, { useMemo, useState } from 'react';
import { GRETest, PracticeSessionConfig } from '../types/gre';
import {
  formatSectionLabel,
  getRecommendedMinutesForScope,
} from '../utils/greLogic';
import { Clock, Play, X, Check, BookOpenCheck } from 'lucide-react';

interface LaunchTestModalProps {
  test: GRETest | null;
  initialMode?: 'timed' | 'untimed';
  initialStudyAnswers?: boolean;
  onClose: () => void;
  onStartSession: (config: PracticeSessionConfig) => void;
}

export const LaunchTestModal: React.FC<LaunchTestModalProps> = ({
  test,
  initialMode = 'untimed',
  initialStudyAnswers = false,
  onClose,
  onStartSession,
}) => {
  const [mode, setMode] = useState<'timed' | 'untimed'>(initialMode);
  const [sectionScope, setSectionScope] = useState<string>('all');
  const [customMinutes, setCustomMinutes] = useState<number>(() =>
    test ? getRecommendedMinutesForScope(test.questions, 'all') : 118
  );
  const [allowInstantCheck, setAllowInstantCheck] = useState<boolean>(true);
  const [alwaysShowAnswers, setAlwaysShowAnswers] = useState<boolean>(initialStudyAnswers);

  const availableSections = useMemo(() => {
    if (!test) return [];
    const counts: Record<string, number> = {};
    test.questions.forEach((q) => {
      const s = q.section || 'general';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts);
  }, [test]);

  const filteredQuestions = useMemo(() => {
    if (!test) return [];
    if (sectionScope === 'all') return test.questions;
    if (sectionScope === 'no-awa') {
      return test.questions.filter((q) => q.section !== 'awa' && q.type !== 'sidebyside');
    }
    if (sectionScope === 'verbal-all') {
      return test.questions.filter((q) => q.section.startsWith('verbal'));
    }
    if (sectionScope === 'quant-all') {
      return test.questions.filter((q) => q.section.startsWith('quant'));
    }
    return test.questions.filter((q) => q.section === sectionScope);
  }, [test, sectionScope]);

  const handleScopeChange = (nextScope: string) => {
    setSectionScope(nextScope);
    if (!test) return;
    let subset = test.questions;
    if (nextScope === 'no-awa') {
      subset = test.questions.filter((q) => q.section !== 'awa' && q.type !== 'sidebyside');
    } else if (nextScope === 'verbal-all') {
      subset = test.questions.filter((q) => q.section.startsWith('verbal'));
    } else if (nextScope === 'quant-all') {
      subset = test.questions.filter((q) => q.section.startsWith('quant'));
    } else if (nextScope !== 'all') {
      subset = test.questions.filter((q) => q.section === nextScope);
    }
    setCustomMinutes(getRecommendedMinutesForScope(subset, nextScope === 'no-awa' ? 'all' : nextScope));
  };

  if (!test) return null;

  const nonAwaCount = test.questions.filter(
    (q) => q.section !== 'awa' && q.type !== 'sidebyside'
  ).length;

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredQuestions.length === 0) return;

    onStartSession({
      title: test.title,
      subtitle: `${test.monthLabel || test.monthId}`,
      monthId: test.monthId || '2026-03',
      monthLabel: test.monthLabel || 'March 2026',
      testId: test._id,
      testTitle: test.title,
      mode,
      timeLimitMinutes: mode === 'timed' ? Math.max(1, customMinutes) : 0,
      sectionFilter: sectionScope,
      questions: filteredQuestions,
      instantFeedbackAllowed: mode === 'untimed' ? allowInstantCheck || alwaysShowAnswers : false,
      alwaysShowAnswers: mode === 'untimed' ? alwaysShowAnswers : false,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Configure GRE Test Session"
    >
      <form
        onSubmit={handleLaunch}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-[#1E3A5F] dark:text-blue-400">
              {test.monthLabel}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Configure {test.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            aria-label="Close configuration modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selection: Untimed vs Timed */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            1. Select Exam Mode
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('untimed')}
              className={`p-3.5 rounded-xl border text-left transition-colors ${
                mode === 'untimed'
                  ? 'border-[#1E3A5F] bg-[#1E3A5F]/[0.05] dark:bg-blue-950/40 dark:border-blue-500'
                  : 'border-[#E4E2DC] dark:border-[#262D38] hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
                  Untimed Practice
                </span>
                {mode === 'untimed' && (
                  <Check className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Elapsed stopwatch, instant Answer Key verification, and live note-taking.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('timed')}
              className={`p-3.5 rounded-xl border text-left transition-colors ${
                mode === 'timed'
                  ? 'border-[#1E3A5F] bg-[#1E3A5F]/[0.05] dark:bg-blue-950/40 dark:border-blue-500'
                  : 'border-[#E4E2DC] dark:border-[#262D38] hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Timed GRE Exam
                </span>
                {mode === 'timed' && (
                  <Check className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Official ETS countdown timer. Answers unlock after submitting the exam.
              </p>
            </button>
          </div>
        </div>

        {/* Section Scope */}
        <div className="space-y-2">
          <label
            htmlFor="section-scope-select"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            2. Section Scope ({filteredQuestions.length} Questions)
          </label>
          <select
            id="section-scope-select"
            value={sectionScope}
            onChange={(e) => handleScopeChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
          >
            <option value="all">
              Full GRE Mock Test — All Sections ({test.questions.length} Qs · 118m ETS)
            </option>
            <option value="no-awa">
              Verbal + Quant Only — Skip AWA ({nonAwaCount} Qs · 88m ETS)
            </option>
            <option value="verbal-all">
              All Verbal Sections (
              {test.questions.filter((q) => q.section.startsWith('verbal')).length} Qs · 41m ETS)
            </option>
            <option value="quant-all">
              All Quant Sections (
              {test.questions.filter((q) => q.section.startsWith('quant')).length} Qs · 47m ETS)
            </option>
            {availableSections.map(([sec, count]) => (
              <option key={sec} value={sec}>
                {formatSectionLabel(sec)} Only ({count} Qs)
              </option>
            ))}
          </select>
        </div>

        {/* Mode-specific Options */}
        {mode === 'timed' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="custom-minutes-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                3. Countdown Timer Duration (Minutes)
              </label>
              <span className="text-[11px] text-slate-500 font-mono-tabular">
                ETS Standard: V1 18m · V2 23m · Q1 21m · Q2 26m
              </span>
            </div>
            <input
              id="custom-minutes-input"
              type="number"
              min={1}
              max={240}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value) || 30)}
              className="w-full px-3.5 py-2 text-xs font-mono-tabular font-semibold rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3 rounded-lg bg-[#FAF9F6] dark:bg-[#0E1117] border border-[#E4E2DC] dark:border-[#262D38] cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Instant “Check Answer” Verification
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reveal the official answer key under any question on demand
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowInstantCheck || alwaysShowAnswers}
                disabled={alwaysShowAnswers}
                onChange={(e) => setAllowInstantCheck(e.target.checked)}
                aria-label="Allow Instant Check Answer Button"
                className="w-4 h-4 accent-[#1E3A5F] rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-[#FAF9F6] dark:bg-[#0E1117] border border-[#E4E2DC] dark:border-[#262D38] cursor-pointer">
              <div className="flex items-start gap-2.5">
                <BookOpenCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Study / Answer Key Mode (Always Show Official Answer Underneath)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Keep the verified answer key visible below every question while reviewing
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={alwaysShowAnswers}
                onChange={(e) => setAlwaysShowAnswers(e.target.checked)}
                aria-label="Always Show Official Answer Underneath"
                className="w-4 h-4 accent-emerald-700 rounded"
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E4E2DC] dark:border-[#262D38]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors"
          >
            {mode === 'timed' ? (
              <>
                <Clock className="w-3.5 h-3.5" /> Start Timed Exam ({customMinutes}m)
              </>
            ) : alwaysShowAnswers ? (
              <>
                <BookOpenCheck className="w-3.5 h-3.5" /> Open Study &amp; Answer Key Mode
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Start Untimed Practice
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
