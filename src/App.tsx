import React, { useEffect, useMemo, useState } from 'react';
import {
  ErrorLogEntry,
  GRETest,
  PracticeSessionConfig,
  StudyNote,
  TestAttempt,
  UserAnswer,
} from './types/gre';
import {
  calculateSessionMetrics,
  evaluateQuestionAnswer,
  formatSectionLabel,
  getRecommendedMinutesForScope,
  MONTH_CONFIGS,
} from './utils/greLogic';
import {
  deleteStudyNote,
  exportFullBackupJson,
  importFullBackupJson,
  loadAttempts,
  loadBookmarks,
  loadCustomTests,
  loadErrorLog,
  loadStudyNotes,
  loadThemePreference,
  removeErrorLogEntry,
  saveAttempt,
  saveCustomTestsForMonth,
  saveThemePreference,
  toggleBookmarkQuestion,
  upsertErrorLogEntry,
  upsertQuestionNote,
  upsertStandaloneNote,
} from './utils/storage';
import { LaunchTestModal } from './components/LaunchTestModal';
import { TestSessionView } from './components/TestSessionView';
import { TestResultsView } from './components/TestResultsView';
import { ErrorLogView } from './components/ErrorLogView';
import { NotesHubView } from './components/NotesHubView';
import { CustomDrillView } from './components/CustomDrillView';
import { FileOpenAndGuideModal } from './components/FileOpenAndGuideModal';
import {
  Play,
  Clock,
  Search,
  Sun,
  Moon,
  RotateCcw,
  FolderOpen,
  Download,
  BookOpenCheck,
  ArrowRight,
} from 'lucide-react';

type MainTab = 'tests' | 'errors' | 'notes' | 'drill' | 'history';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadThemePreference());
  const [activeTab, setActiveTab] = useState<MainTab>('tests');
  const [selectedMonthId, setSelectedMonthId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Loaded monthly test banks
  const [testsByMonth, setTestsByMonth] = useState<Record<string, GRETest[]>>({});
  const [isLoadingBank, setIsLoadingBank] = useState<boolean>(true);

  // User study state persisted in localStorage
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>(() => loadErrorLog());
  const [notes, setNotes] = useState<StudyNote[]>(() => loadStudyNotes());
  const [attempts, setAttempts] = useState<TestAttempt[]>(() => loadAttempts());
  const [bookmarks, setBookmarks] = useState<string[]>(() => loadBookmarks());

  // Modal & Active Session state
  const [launchModalTarget, setLaunchModalTarget] = useState<{
    test: GRETest;
    mode: 'timed' | 'untimed';
    studyAnswers?: boolean;
  } | null>(null);
  const [activeSession, setActiveSession] = useState<PracticeSessionConfig | null>(null);
  const [inspectingAttempt, setInspectingAttempt] = useState<TestAttempt | null>(null);
  const [showFileGuideModal, setShowFileGuideModal] = useState<boolean>(false);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  // Load all 8 monthly JSON files (or embedded data for standalone offline HTML)
  useEffect(() => {
    let cancelled = false;
    async function fetchAllMonths() {
      setIsLoadingBank(true);
      const customMap = loadCustomTests();
      const loaded: Record<string, GRETest[]> = {};

      const embeddedBank = (
        window as unknown as { __EMBEDDED_GRE_DATA__?: Record<string, GRETest[]> }
      ).__EMBEDDED_GRE_DATA__;

      await Promise.all(
        MONTH_CONFIGS.map(async (m) => {
          try {
            let rawTests: GRETest[] | null = null;
            if (embeddedBank && Array.isArray(embeddedBank[m.id])) {
              rawTests = embeddedBank[m.id];
            } else {
              const res = await fetch(m.fileUrl);
              if (res.ok) {
                rawTests = (await res.json()) as GRETest[];
              }
            }
            if (!rawTests) {
              loaded[m.id] = customMap[m.id] || [];
              return;
            }
            const enriched = rawTests.map((t) => ({
              ...t,
              monthId: m.id,
              monthLabel: m.label,
              questions: (t.questions || []).map((q, qIdx) => ({
                ...q,
                monthId: m.id,
                monthLabel: m.label,
                testId: t._id,
                testTitle: t.title,
                questionIndex: qIdx,
              })),
            }));
            loaded[m.id] = customMap[m.id]
              ? [...enriched, ...customMap[m.id]]
              : enriched;
          } catch {
            loaded[m.id] = customMap[m.id] || [];
          }
        })
      );

      if (!cancelled) {
        setTestsByMonth(loaded);
        setIsLoadingBank(false);
      }
    }
    fetchAllMonths();
    return () => {
      cancelled = true;
    };
  }, []);

  // Flatten and filter tests for the Monthly Test Bank view
  const displayedTests = useMemo(() => {
    const all: GRETest[] = [];
    for (const m of MONTH_CONFIGS) {
      if (selectedMonthId !== 'all' && m.id !== selectedMonthId) continue;
      const list = testsByMonth[m.id] || [];
      all.push(...list);
    }
    if (!searchQuery.trim()) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.monthLabel || '').toLowerCase().includes(q)
    );
  }, [testsByMonth, selectedMonthId, searchQuery]);

  // Overall bank metrics
  const bankSummary = useMemo(() => {
    let totalTests = 0;
    let totalQuestions = 0;
    let gradableQuestions = 0;
    let awaCount = 0;
    for (const m of MONTH_CONFIGS) {
      const list = testsByMonth[m.id] || [];
      totalTests += list.length;
      for (const t of list) {
        totalQuestions += t.questions.length;
        for (const q of t.questions) {
          if (q.section === 'awa' || q.type === 'sidebyside') awaCount++;
          else gradableQuestions++;
        }
      }
    }
    return { totalTests, totalQuestions, gradableQuestions, awaCount };
  }, [testsByMonth]);

  // Map testId -> latest/best attempt
  const attemptsByTestId = useMemo(() => {
    const map: Record<string, { count: number; bestAccuracy: number; lastAttempt: TestAttempt }> =
      {};
    for (const att of attempts) {
      const existing = map[att.testId];
      if (!existing) {
        map[att.testId] = {
          count: 1,
          bestAccuracy: att.accuracyPercent,
          lastAttempt: att,
        };
      } else {
        existing.count++;
        if (att.accuracyPercent > existing.bestAccuracy) {
          existing.bestAccuracy = att.accuracyPercent;
        }
      }
    }
    return map;
  }, [attempts]);

  // Latest readiness snapshot for Hero Right Panel
  const readinessSnapshot = useMemo(() => {
    const allTests: GRETest[] = [];
    for (const m of MONTH_CONFIGS) {
      allTests.push(...(testsByMonth[m.id] || []));
    }
    const nextUnattempted = allTests.find((t) => !attemptsByTestId[t._id]) || allTests[0] || null;
    const completedUniqueTests = Object.keys(attemptsByTestId).length;
    const avgAccuracy =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.accuracyPercent, 0) / attempts.length)
        : null;

    let latestScaled: { verbal: number | null; quant: number | null; total: number | null } = {
      verbal: null,
      quant: null,
      total: null,
    };
    if (attempts[0]) {
      const m = calculateSessionMetrics(
        attempts[0].questionsSnapshot,
        attempts[0].answers,
        attempts[0].timeSpentByQuestion
      );
      latestScaled = {
        verbal: m.estimatedVerbalScore,
        quant: m.estimatedQuantScore,
        total:
          m.estimatedVerbalScore !== null && m.estimatedQuantScore !== null
            ? m.estimatedVerbalScore + m.estimatedQuantScore
            : null,
      };
    }

    return { nextUnattempted, completedUniqueTests, avgAccuracy, latestScaled };
  }, [testsByMonth, attemptsByTestId, attempts]);

  const handleToggleBookmark = (questionId: string) => {
    setBookmarks(toggleBookmarkQuestion(questionId));
  };

  const handleFinishSession = (
    answers: Record<string, UserAnswer>,
    timeSpentByQuestion: Record<string, number>
  ) => {
    if (!activeSession) return;
    const metrics = calculateSessionMetrics(
      activeSession.questions,
      answers,
      timeSpentByQuestion
    );

    const newAttempt: TestAttempt = {
      id: `attempt-${Date.now()}`,
      monthId: activeSession.monthId,
      monthLabel: activeSession.monthLabel,
      testId: activeSession.testId,
      testTitle: activeSession.testTitle,
      mode: activeSession.mode,
      sectionFilter: activeSession.sectionFilter,
      startedAt: new Date(Date.now() - metrics.totalTimeMs).toISOString(),
      completedAt: new Date().toISOString(),
      totalQuestions: metrics.totalQuestions,
      GradableQuestions: metrics.gradableQuestions,
      correctCount: metrics.correctCount,
      answeredCount: metrics.answeredCount,
      accuracyPercent: metrics.accuracyPercent,
      totalTimeMs: metrics.totalTimeMs,
      answers,
      timeSpentByQuestion,
      questionsSnapshot: activeSession.questions,
    };

    const updatedAttempts = saveAttempt(newAttempt);
    setAttempts(updatedAttempts);

    // Automatically log any answered-incorrect questions into Error Log
    let latestErrorLog = errorLog;
    for (const q of activeSession.questions) {
      const qAns = answers[q._id];
      const { isAnswered, isCorrect, isGradable } = evaluateQuestionAnswer(q, qAns);
      if (isGradable && isAnswered && !isCorrect) {
        latestErrorLog = upsertErrorLogEntry({
          question: q,
          monthId: q.monthId || activeSession.monthId,
          monthLabel: q.monthLabel || activeSession.monthLabel,
          testId: q.testId || activeSession.testId,
          testTitle: q.testTitle || activeSession.testTitle,
          userAnswer: qAns,
          timeSpentMs: timeSpentByQuestion[q._id] || 0,
          incrementMistake: true,
        });
      }
    }
    setErrorLog(latestErrorLog);
    setActiveSession(null);
    setInspectingAttempt(newAttempt);
  };

  // Full-screen Active Test Session
  if (activeSession) {
    return (
      <TestSessionView
        session={activeSession}
        bookmarks={bookmarks}
        errorLog={errorLog}
        notes={notes}
        onToggleBookmark={handleToggleBookmark}
        onSaveQuestionNote={({ questionId, content, tags }) => {
          const qObj = activeSession.questions.find((q) => q._id === questionId);
          if (!qObj) return;
          setNotes(
            upsertQuestionNote({
              question: qObj,
              monthId: qObj.monthId || activeSession.monthId,
              monthLabel: qObj.monthLabel || activeSession.monthLabel,
              testTitle: qObj.testTitle || activeSession.testTitle,
              content,
              tags,
            })
          );
        }}
        onLogErrorQuestion={({ questionId, category, reflectionNote, userAnswer, timeSpentMs }) => {
          const qObj = activeSession.questions.find((q) => q._id === questionId);
          if (!qObj) return;
          setErrorLog(
            upsertErrorLogEntry({
              question: qObj,
              monthId: qObj.monthId || activeSession.monthId,
              monthLabel: qObj.monthLabel || activeSession.monthLabel,
              testId: qObj.testId || activeSession.testId,
              testTitle: qObj.testTitle || activeSession.testTitle,
              userAnswer,
              category,
              reflectionNote,
              timeSpentMs,
            })
          );
        }}
        onFinishSession={handleFinishSession}
        onExitWithoutSaving={() => setActiveSession(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] dark:bg-[#0E1117] text-[#14181F] dark:text-[#ECF0F5]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 lg:px-8 py-4 bg-white dark:bg-[#161B22] border-b border-[#E4E2DC] dark:border-[#262D38]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setInspectingAttempt(null);
            setActiveTab('tests');
          }}
          className="text-lg font-bold tracking-tight text-[#1E3A5F] dark:text-white whitespace-nowrap shrink-0"
        >
          GRE Prep Studio
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setInspectingAttempt(null);
              setActiveTab('tests');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'tests' && !inspectingAttempt
                ? 'text-[#1E3A5F] dark:text-white underline underline-offset-8 decoration-2 decoration-[#1E3A5F] dark:decoration-blue-500 font-semibold'
                : ''
            }`}
          >
            Mock Tests
          </button>

          <button
            type="button"
            onClick={() => {
              setInspectingAttempt(null);
              setActiveTab('errors');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'errors' && !inspectingAttempt
                ? 'text-[#1E3A5F] dark:text-white underline underline-offset-8 decoration-2 decoration-[#1E3A5F] dark:decoration-blue-500 font-semibold'
                : ''
            }`}
          >
            Error Log ({errorLog.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setInspectingAttempt(null);
              setActiveTab('notes');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'notes' && !inspectingAttempt
                ? 'text-[#1E3A5F] dark:text-white underline underline-offset-8 decoration-2 decoration-[#1E3A5F] dark:decoration-blue-500 font-semibold'
                : ''
            }`}
          >
            Study Notes ({notes.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setInspectingAttempt(null);
              setActiveTab('drill');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'drill' && !inspectingAttempt
                ? 'text-[#1E3A5F] dark:text-white underline underline-offset-8 decoration-2 decoration-[#1E3A5F] dark:decoration-blue-500 font-semibold'
                : ''
            }`}
          >
            Topic Drills
          </button>

          <button
            type="button"
            onClick={() => {
              setInspectingAttempt(null);
              setActiveTab('history');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'history' && !inspectingAttempt
                ? 'text-[#1E3A5F] dark:text-white underline underline-offset-8 decoration-2 decoration-[#1E3A5F] dark:decoration-blue-500 font-semibold'
                : ''
            }`}
          >
            History
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              const target =
                readinessSnapshot.nextUnattempted || displayedTests[0] || testsByMonth['2026-03']?.[0];
              if (target) {
                setLaunchModalTarget({ test: target, mode: 'timed' });
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Start Mock Test
          </button>
        </div>
      </header>

      {/* Post-Test Results Inspector */}
      {inspectingAttempt ? (
        <TestResultsView
          attempt={inspectingAttempt}
          errorLog={errorLog}
          notes={notes}
          onBackToDashboard={() => setInspectingAttempt(null)}
          onRetryQuestions={(qs, mode, title) => {
            setInspectingAttempt(null);
            setActiveSession({
              title,
              subtitle: inspectingAttempt.monthLabel,
              monthId: inspectingAttempt.monthId,
              monthLabel: inspectingAttempt.monthLabel,
              testId: inspectingAttempt.testId,
              testTitle: title,
              mode,
              timeLimitMinutes: mode === 'timed' ? Math.max(10, Math.round(qs.length * 1.55)) : 0,
              sectionFilter: 'retry',
              questions: qs,
              instantFeedbackAllowed: mode === 'untimed',
            });
          }}
          onSaveQuestionNote={({ question, content, tags }) => {
            setNotes(
              upsertQuestionNote({
                question,
                monthId: question.monthId || inspectingAttempt.monthId,
                monthLabel: question.monthLabel || inspectingAttempt.monthLabel,
                testTitle: question.testTitle || inspectingAttempt.testTitle,
                content,
                tags,
              })
            );
          }}
          onUpdateErrorEntry={({ question, category, reflectionNote }) => {
            setErrorLog(
              upsertErrorLogEntry({
                question,
                monthId: question.monthId || inspectingAttempt.monthId,
                monthLabel: question.monthLabel || inspectingAttempt.monthLabel,
                testId: question.testId || inspectingAttempt.testId,
                testTitle: question.testTitle || inspectingAttempt.testTitle,
                category,
                reflectionNote,
              })
            );
          }}
        />
      ) : activeTab === 'errors' ? (
        <ErrorLogView
          errorLog={errorLog}
          onUpdateEntry={(params) => setErrorLog(upsertErrorLogEntry(params))}
          onRemoveEntry={(id) => setErrorLog(removeErrorLogEntry(id))}
          onPracticeErrors={(qs, mode, title) =>
            setActiveSession({
              title,
              subtitle: 'Error Log Practice',
              monthId: 'error-log',
              monthLabel: 'Error Log Review',
              testId: `error-drill-${Date.now()}`,
              testTitle: title,
              mode,
              timeLimitMinutes: mode === 'timed' ? Math.max(10, Math.round(qs.length * 1.55)) : 0,
              sectionFilter: 'errors',
              questions: qs,
              instantFeedbackAllowed: mode === 'untimed',
            })
          }
        />
      ) : activeTab === 'notes' ? (
        <NotesHubView
          notes={notes}
          onSaveStandaloneNote={(params) => setNotes(upsertStandaloneNote(params))}
          onSaveQuestionNote={(params) => setNotes(upsertQuestionNote(params))}
          onDeleteNote={(id) => setNotes(deleteStudyNote(id))}
          onPracticeQuestion={(q, title) =>
            setActiveSession({
              title: `Note Review: ${title}`,
              subtitle: q.monthLabel || 'Saved Question',
              monthId: q.monthId || '2026-03',
              monthLabel: q.monthLabel || 'March 2026',
              testId: q.testId || 'single-q',
              testTitle: title,
              mode: 'untimed',
              timeLimitMinutes: 0,
              sectionFilter: 'single',
              questions: [q],
              instantFeedbackAllowed: true,
              alwaysShowAnswers: true,
            })
          }
        />
      ) : activeTab === 'drill' || activeTab === 'history' ? (
        <CustomDrillView
          allTestsByMonth={testsByMonth}
          bookmarks={bookmarks}
          errorLog={errorLog}
          attempts={attempts}
          activeSubTab={activeTab}
          onStartSession={(cfg) => setActiveSession(cfg)}
          onInspectAttempt={(att) => setInspectingAttempt(att)}
          onExportBackup={() => {
            const json = exportFullBackupJson();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gre-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onImportBackup={(raw) => {
            const restored = importFullBackupJson(raw);
            setErrorLog(restored.errorLog);
            setNotes(restored.notes);
            setAttempts(restored.attempts);
            setBookmarks(restored.bookmarks);
          }}
          onImportCustomMonthFile={(mId, importedTests) => {
            const mConfig = MONTH_CONFIGS.find((m) => m.id === mId);
            const enriched = importedTests.map((t) => ({
              ...t,
              monthId: mId,
              monthLabel: mConfig?.label || mId,
              questions: (t.questions || []).map((q, qIdx) => ({
                ...q,
                monthId: mId,
                monthLabel: mConfig?.label || mId,
                testId: t._id,
                testTitle: t.title,
                questionIndex: qIdx,
              })),
            }));
            saveCustomTestsForMonth(mId, enriched);
            setTestsByMonth((prev) => ({
              ...prev,
              [mId]: [...(prev[mId] || []), ...enriched],
            }));
          }}
        />
      ) : (
        /* Main GRE Mock Test Suite Dashboard */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-7">
          {/* 2-Column Balanced Hero & Readiness Split */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-8 bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 lg:p-7 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#1E3A5F] dark:text-blue-400">
                  ETS Shorter GRE Format · Verbal · Quant · Analytical Writing
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                  2026 Monthly GRE Mock Test Suite
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Practice full-length timed simulations or untimed study sessions across all eight monthly banks. Every question’s official answer key is audited, math-typeset with KaTeX, and linked directly to your personal Error Log and Study Notes.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200">
                    {bankSummary.totalTests} Full Mock Tests
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                    {bankSummary.gradableQuestions.toLocaleString()} Verified Answer Keys
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-slate-700 dark:text-slate-300">
                    {bankSummary.awaCount} AWA Prompts
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>March – October 2026</span>
                </div>
              </div>

              {/* Workspace Utility Bar */}
              <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-[#E4E2DC] dark:border-[#262D38]">
                <a
                  href="/GRE-Studio-Full.html"
                  download="GRE-Studio-All-78-Tests.html"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Offline HTML
                </a>

                <button
                  type="button"
                  onClick={() => setShowFileGuideModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F1EC] dark:bg-[#0E1117] hover:bg-[#E7E4DC] dark:hover:bg-slate-800 border border-[#D8D5CC] dark:border-[#2A3240] text-slate-800 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
                  Open Local JSON / Guide
                </button>

                <button
                  type="button"
                  onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-white dark:bg-[#0E1117] border border-[#D8D5CC] dark:border-[#2A3240] text-slate-700 dark:text-slate-300 hover:bg-[#F7F6F2] dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  aria-label="Toggle Light or Dark Theme"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="w-3.5 h-3.5" /> Dark Mode
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" /> Light Mode
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Readiness & Next Test Panel */}
            <div className="lg:col-span-4 bg-[#14243B] text-white rounded-xl p-6 lg:p-7 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-medium text-sky-300">
                  Exam Readiness Overview
                </div>
                {readinessSnapshot.latestScaled.total ? (
                  <div>
                    <div className="text-3xl font-bold font-mono-tabular tracking-tight">
                      {readinessSnapshot.latestScaled.total}
                      <span className="text-sm font-normal text-slate-300"> / 340 est.</span>
                    </div>
                    <div className="text-xs text-slate-300 font-mono-tabular mt-1">
                      Verbal {readinessSnapshot.latestScaled.verbal} · Quant{' '}
                      {readinessSnapshot.latestScaled.quant}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold font-mono-tabular tracking-tight">
                      {readinessSnapshot.completedUniqueTests} / {bankSummary.totalTests || 78}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Mock tests completed · Official 1h 58m ETS pacing ready
                    </div>
                  </div>
                )}
              </div>

              {readinessSnapshot.nextUnattempted && (
                <div className="pt-4 border-t border-white/15 space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-300">Recommended Next Mock</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {readinessSnapshot.nextUnattempted.title} ·{' '}
                      <span className="text-sky-300 font-normal">
                        {readinessSnapshot.nextUnattempted.monthLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLaunchModalTarget({
                          test: readinessSnapshot.nextUnattempted!,
                          mode: 'timed',
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-[#14243B] hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                      Launch Timed
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLaunchModalTarget({
                          test: readinessSnapshot.nextUnattempted!,
                          mode: 'untimed',
                          studyAnswers: true,
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-colors whitespace-nowrap"
                      title="Open in Answer Key Study Mode"
                    >
                      <BookOpenCheck className="w-3.5 h-3.5" />
                      Study Key
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Full-Width 4-Column KPI Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Filtered Mock Tests</div>
              <div className="mt-1 text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                {displayedTests.length}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {selectedMonthId === 'all'
                  ? 'Across all 8 months (Mar–Oct)'
                  : MONTH_CONFIGS.find((m) => m.id === selectedMonthId)?.label}
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Completed Sessions</div>
              <div className="mt-1 text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                {attempts.length}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                {readinessSnapshot.avgAccuracy !== null
                  ? `Average accuracy: ${readinessSnapshot.avgAccuracy}%`
                  : 'No completed mocks yet'}
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Active Error Queue</div>
              <div className="mt-1 text-2xl font-bold font-mono-tabular text-rose-700 dark:text-rose-400">
                {errorLog.filter((e) => e.status !== 'mastered').length}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {errorLog.length} total ·{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('errors')}
                  className="text-[#1E3A5F] dark:text-blue-400 hover:underline font-semibold"
                >
                  Review Errors
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">Study Notes &amp; Saved</div>
              <div className="mt-1 text-2xl font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400">
                {notes.length}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {bookmarks.length} bookmarked ·{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className="text-[#1E3A5F] dark:text-blue-400 hover:underline font-semibold"
                >
                  Open Notebook
                </button>
              </div>
            </div>
          </section>

          {/* Month Filter Bar & Live Search */}
          <section className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl px-4 py-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 xl:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedMonthId('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    selectedMonthId === 'all'
                      ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                      : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 hover:bg-[#E7E4DC] dark:hover:bg-slate-800'
                  }`}
                >
                  All ({bankSummary.totalTests})
                </button>

                {MONTH_CONFIGS.map((m) => {
                  const count = testsByMonth[m.id]?.length ?? m.expectedTests;
                  const active = selectedMonthId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMonthId(m.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white font-semibold'
                          : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 hover:bg-[#E7E4DC] dark:hover:bg-slate-800'
                      }`}
                    >
                      {m.shortLabel} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full xl:w-56 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search test # or month..."
                  aria-label="Filter mock test by title"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] dark:focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Monthly Test Cards Grid */}
          {isLoadingBank ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-48 rounded-xl bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] p-5 animate-pulse flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="h-3 w-24 bg-[#EAE7DF] dark:bg-slate-800 rounded" />
                    <div className="h-5 w-40 bg-[#EAE7DF] dark:bg-slate-800 rounded" />
                  </div>
                  <div className="h-9 w-full bg-[#F3F1EC] dark:bg-slate-800 rounded-lg" />
                </div>
              ))}
            </div>
          ) : displayedTests.length === 0 ? (
            <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-12 text-center space-y-2">
              <div className="text-base font-bold text-slate-900 dark:text-white">
                No Mock Tests Match “{searchQuery}”
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try clearing the search input or selecting “All Months” above.
              </p>
            </div>
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedTests.map((test) => {
                const verbalCount = test.questions.filter((q) =>
                  q.section.startsWith('verbal')
                ).length;
                const quantCount = test.questions.filter((q) =>
                  q.section.startsWith('quant')
                ).length;
                const awaCount = test.questions.filter(
                  (q) => q.section === 'awa' || q.type === 'sidebyside'
                ).length;
                const etsMinutes = getRecommendedMinutesForScope(test.questions, 'all');
                const attemptStat = attemptsByTestId[test._id];
                const distinctSections = Array.from(new Set(test.questions.map((q) => q.section)));

                return (
                  <article
                    key={`${test.monthId}-${test._id}`}
                    className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5 flex flex-col justify-between hover:border-[#1E3A5F]/50 dark:hover:border-blue-500/50 transition-colors"
                  >
                    <div className="space-y-2.5">
                      {/* Clean unboxed editorial kicker */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">
                          {test.monthLabel}
                        </span>
                        <span className="font-mono-tabular">
                          {test.questions.length} Qs · {etsMinutes}m
                        </span>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        {test.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
                        <span>{verbalCount} Verbal</span>
                        <span aria-hidden="true">·</span>
                        <span>{quantCount} Quant</span>
                        {awaCount > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{awaCount} AWA</span>
                          </>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-500 truncate">
                        {distinctSections.map(formatSectionLabel).join(' / ')}
                      </div>

                      {attemptStat && (
                        <div className="pt-2.5 border-t border-[#E4E2DC] dark:border-[#262D38] flex items-center justify-between text-xs">
                          <span className="text-emerald-700 dark:text-emerald-400 font-mono-tabular font-semibold">
                            Best: {attemptStat.bestAccuracy}% ({attemptStat.count}x)
                          </span>
                          <button
                            type="button"
                            onClick={() => setInspectingAttempt(attemptStat.lastAttempt)}
                            className="inline-flex items-center gap-1 text-[#1E3A5F] dark:text-blue-400 hover:underline font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" /> Review Last
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Row: Untimed · Timed Exam · Study Key */}
                    <div className="pt-4 mt-4 border-t border-[#E4E2DC] dark:border-[#262D38] flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLaunchModalTarget({ test, mode: 'untimed' })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-[#F3F1EC] dark:bg-[#0E1117] hover:bg-[#E7E4DC] dark:hover:bg-slate-800 border border-[#D8D5CC] dark:border-[#2A3240] text-slate-900 dark:text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
                        Untimed
                      </button>

                      <button
                        type="button"
                        onClick={() => setLaunchModalTarget({ test, mode: 'timed' })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Timed
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setLaunchModalTarget({ test, mode: 'untimed', studyAnswers: true })
                        }
                        className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-600/30 text-emerald-800 dark:text-emerald-300 transition-colors shrink-0"
                        title="Open with Official Answer Keys Always Visible Underneath"
                        aria-label={`Study Answer Key for ${test.title}`}
                      >
                        <BookOpenCheck className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </main>
      )}

      {/* Launch Configuration Modal */}
      {launchModalTarget && (
        <LaunchTestModal
          test={launchModalTarget.test}
          initialMode={launchModalTarget.mode}
          initialStudyAnswers={Boolean(launchModalTarget.studyAnswers)}
          onClose={() => setLaunchModalTarget(null)}
          onStartSession={(config) => {
            setLaunchModalTarget(null);
            setActiveSession(config);
          }}
        />
      )}

      {/* Local File Opener & Setup Guide Modal */}
      <FileOpenAndGuideModal
        isOpen={showFileGuideModal}
        onClose={() => setShowFileGuideModal(false)}
        onImportTests={(mId, importedTests, autoLaunchFirst) => {
          const mConfig = MONTH_CONFIGS.find((m) => m.id === mId);
          const enriched = importedTests.map((t) => ({
            ...t,
            monthId: mId,
            monthLabel: mConfig?.label || mId,
            questions: (t.questions || []).map((q, qIdx) => ({
              ...q,
              monthId: mId,
              monthLabel: mConfig?.label || mId,
              testId: t._id,
              testTitle: t.title,
              questionIndex: qIdx,
            })),
          }));
          saveCustomTestsForMonth(mId, enriched);
          setTestsByMonth((prev) => ({
            ...prev,
            [mId]: [...(prev[mId] || []), ...enriched],
          }));
          setSelectedMonthId(mId);
          if (autoLaunchFirst && enriched[0]) {
            setShowFileGuideModal(false);
            setLaunchModalTarget({ test: enriched[0], mode: 'untimed' });
          }
        }}
      />
    </div>
  );
}
