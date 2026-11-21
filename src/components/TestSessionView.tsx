import React, { useEffect, useMemo, useState } from 'react';
import {
  ErrorCategory,
  ErrorLogEntry,
  PracticeSessionConfig,
  StudyNote,
  UserAnswer,
} from '../types/gre';
import {
  classifyQuestionSubType,
  ERROR_CATEGORIES,
  evaluateQuestionAnswer,
  formatSectionLabel,
  isFractionQuestion,
  isNumericQuestion,
  NOTE_TAG_PRESETS,
} from '../utils/greLogic';
import { classifyQuestionTopic } from '../utils/topicClassifier';
import { QuestionRenderer } from './QuestionRenderer';
import { RichAnswerSummary } from './RichAnswerSummary';
import { GreCalculatorModal } from './GreCalculatorModal';
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutGrid,
  NotebookPen,
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Eye,
  EyeOff,
  Check,
  X,
  BookOpenCheck,
} from 'lucide-react';

interface TestSessionViewProps {
  session: PracticeSessionConfig;
  bookmarks: string[];
  errorLog: ErrorLogEntry[];
  notes: StudyNote[];
  onToggleBookmark: (questionId: string) => void;
  onSaveQuestionNote: (params: {
    questionId: string;
    content: string;
    tags: string[];
  }) => void;
  onLogErrorQuestion: (params: {
    questionId: string;
    category: ErrorCategory;
    reflectionNote: string;
    userAnswer?: UserAnswer;
    timeSpentMs: number;
  }) => void;
  onFinishSession: (
    answers: Record<string, UserAnswer>,
    timeSpentByQuestion: Record<string, number>
  ) => void;
  onExitWithoutSaving: () => void;
}

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const TestSessionView: React.FC<TestSessionViewProps> = ({
  session,
  bookmarks,
  errorLog,
  notes,
  onToggleBookmark,
  onSaveQuestionNote,
  onLogErrorQuestion,
  onFinishSession,
  onExitWithoutSaving,
}) => {
  const questions = session.questions;
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeSpentByQuestion, setTimeSpentByQuestion] = useState<Record<string, number>>({});
  const [elapsedTotalMs, setElapsedTotalMs] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(
    session.timeLimitMinutes * 60 * 1000
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hideTimer, setHideTimer] = useState<boolean>(false);
  const [alwaysShowAnswers, setAlwaysShowAnswers] = useState<boolean>(
    Boolean(session.alwaysShowAnswers && session.instantFeedbackAllowed)
  );
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [showPalette, setShowPalette] = useState<boolean>(false);
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'note' | 'error'>('none');
  const [confirmExit, setConfirmExit] = useState<boolean>(false);

  const currentQuestion = questions[currentIndex];

  const existingNote = useMemo(
    () => notes.find((n) => n.questionId === currentQuestion?._id),
    [notes, currentQuestion]
  );
  const existingError = useMemo(
    () => errorLog.find((e) => e.id === currentQuestion?._id),
    [errorLog, currentQuestion]
  );

  const [noteDraft, setNoteDraft] = useState<string>('');
  const [noteTagsDraft, setNoteTagsDraft] = useState<string[]>([]);
  const [noteSavedToast, setNoteSavedToast] = useState<boolean>(false);

  const [errorCategoryDraft, setErrorCategoryDraft] = useState<ErrorCategory>('Conceptual Gap');
  const [errorReflectionDraft, setErrorReflectionDraft] = useState<string>('');
  const [errorSavedToast, setErrorSavedToast] = useState<boolean>(false);

  useEffect(() => {
    if (!currentQuestion) return;
    setNoteDraft(existingNote?.content || '');
    setNoteTagsDraft(existingNote?.tags || []);
    setErrorCategoryDraft(
      existingError?.category ||
        (currentQuestion.section.startsWith('verbal') ? 'Vocabulary Gap' : 'Conceptual Gap')
    );
    setErrorReflectionDraft(existingError?.reflectionNote || '');
    setNoteSavedToast(false);
    setErrorSavedToast(false);
    setActiveDrawer('none');
  }, [currentQuestion?._id]);

  // 1-second timer tick
  useEffect(() => {
    if (isPaused || !currentQuestion) return;
    const interval = setInterval(() => {
      setElapsedTotalMs((prev) => prev + 1000);
      setTimeSpentByQuestion((prev) => ({
        ...prev,
        [currentQuestion._id]: (prev[currentQuestion._id] || 0) + 1000,
      }));
      if (session.mode === 'timed') {
        setRemainingMs((prev) => {
          if (prev <= 1000) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1000;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, currentQuestion, session.mode]);

  // Auto-submit when timed mode hits 0
  useEffect(() => {
    if (session.mode === 'timed' && remainingMs === 0) {
      onFinishSession(answers, timeSpentByQuestion);
    }
  }, [session.mode, remainingMs]);

  // Keyboard shortcuts for exam efficiency
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'c' || e.key === 'C') {
        setShowCalculator((c) => !c);
      } else if (e.key === 'm' || e.key === 'M') {
        if (!currentQuestion) return;
        setAnswers((prev) => {
          const cur = prev[currentQuestion._id] || { questionId: currentQuestion._id };
          return {
            ...prev,
            [currentQuestion._id]: { ...cur, markedForReview: !cur.markedForReview },
          };
        });
      } else if ((e.key === 'a' || e.key === 'A') && session.instantFeedbackAllowed) {
        if (!currentQuestion) return;
        setAnswers((prev) => {
          const cur = prev[currentQuestion._id] || { questionId: currentQuestion._id };
          return {
            ...prev,
            [currentQuestion._id]: { ...cur, checked: !cur.checked },
          };
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [questions.length, currentQuestion, session.instantFeedbackAllowed]);

  if (!currentQuestion) {
    return null;
  }

  const currentAns = answers[currentQuestion._id] || { questionId: currentQuestion._id };
  const isBookmarked = bookmarks.includes(currentQuestion._id);
  const isMarkedReview = Boolean(currentAns.markedForReview);
  const isSolutionVisible = Boolean(
    session.instantFeedbackAllowed && (currentAns.checked || alwaysShowAnswers)
  );
  const currentQuestionTimeMs = timeSpentByQuestion[currentQuestion._id] || 0;
  const isOverPaced = currentQuestionTimeMs >= 120000;
  const evaluation = evaluateQuestionAnswer(currentQuestion, currentAns);

  // Distinct contiguous sections in this test (only treat as multi-section ETS exam if sections aren't interleaved)
  const { sectionGroups, isContiguousMultiSection } = useMemo(() => {
    const groups: { section: string; firstIndex: number; count: number }[] = [];
    questions.forEach((q, idx) => {
      const last = groups[groups.length - 1];
      if (!last || last.section !== q.section) {
        groups.push({ section: q.section, firstIndex: idx, count: 1 });
      } else {
        last.count++;
      }
    });
    const uniqueSections = new Set(groups.map((g) => g.section));
    // True multi-section mock test: >1 section and each section appears once (not interleaved from a topic drill)
    const contiguous = groups.length > 1 && groups.length === uniqueSections.size;
    return { sectionGroups: groups, isContiguousMultiSection: contiguous };
  }, [questions]);

  // Active section range for compact inline question strip
  const activeSectionGroup = useMemo(() => {
    if (!isContiguousMultiSection) {
      return { section: currentQuestion.section, firstIndex: 0, count: questions.length };
    }
    return (
      sectionGroups.find(
        (sg) => currentIndex >= sg.firstIndex && currentIndex < sg.firstIndex + sg.count
      ) || { section: currentQuestion.section, firstIndex: 0, count: questions.length }
    );
  }, [isContiguousMultiSection, sectionGroups, currentIndex, currentQuestion.section, questions.length]);

  const handleUpdateAnswer = (next: UserAnswer) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion._id]: next,
    }));
  };

  const handleToggleMarkReview = () => {
    handleUpdateAnswer({
      ...currentAns,
      markedForReview: !currentAns.markedForReview,
    });
  };

  const handleToggleCheckAnswer = () => {
    if (alwaysShowAnswers) {
      setAlwaysShowAnswers(false);
      handleUpdateAnswer({
        ...currentAns,
        checked: false,
      });
      return;
    }
    handleUpdateAnswer({
      ...currentAns,
      checked: !currentAns.checked,
    });
  };

  const handleTransferFromCalculator = (val: string) => {
    if (!isNumericQuestion(currentQuestion) || isFractionQuestion(currentQuestion)) return;
    handleUpdateAnswer({
      ...currentAns,
      numericValue: val,
    });
  };

  const handleSaveNoteClick = () => {
    onSaveQuestionNote({
      questionId: currentQuestion._id,
      content: noteDraft,
      tags: noteTagsDraft,
    });
    setNoteSavedToast(true);
    setTimeout(() => setNoteSavedToast(false), 2000);
  };

  const handleSaveErrorClick = () => {
    onLogErrorQuestion({
      questionId: currentQuestion._id,
      category: errorCategoryDraft,
      reflectionNote: errorReflectionDraft,
      userAnswer: currentAns,
      timeSpentMs: currentQuestionTimeMs,
    });
    setErrorSavedToast(true);
    setTimeout(() => setErrorSavedToast(false), 2000);
  };

  const answeredCount = questions.filter((q) =>
    evaluateQuestionAnswer(q, answers[q._id]).isAnswered
  ).length;
  const markedCount = questions.filter((q) => Boolean(answers[q._id]?.markedForReview)).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] dark:bg-[#0E1117]">
      {/* Authentic ETS Academic Navy Exam Top Bar */}
      <header className="sticky top-0 z-30 bg-[#14243B] text-slate-100 border-b border-slate-800 px-4 lg:px-6 py-2">
        <div className="max-w-[1380px] mx-auto flex flex-wrap xl:flex-nowrap items-center justify-between gap-3">
          {/* Left: Exit + Active Exam Context */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setConfirmExit(true)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Exit
            </button>
            <div className="h-4 w-px bg-white/15 hidden sm:block shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white truncate">
                <span className="truncate">{session.title}</span>
                <span aria-hidden="true" className="text-slate-400 shrink-0">
                  ·
                </span>
                <span className="text-sky-300 whitespace-nowrap shrink-0">
                  {formatSectionLabel(currentQuestion.section)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="font-mono-tabular font-semibold text-white whitespace-nowrap">
                  Q {currentIndex + 1}/{questions.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{classifyQuestionSubType(currentQuestion)}</span>
                <span aria-hidden="true" className="hidden md:inline">·</span>
                <span className="hidden md:inline text-sky-200 truncate">
                  {classifyQuestionTopic(currentQuestion).name}
                </span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="hidden sm:inline whitespace-nowrap">
                  Diff {currentQuestion.difficulty || 3}/5
                </span>
              </div>
            </div>
          </div>

          {/* Center: Countdown / Stopwatch + Per-Question Pacing */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0D1829] border border-white/15">
              <Clock className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              {!hideTimer ? (
                <div className="flex items-center gap-1.5 text-xs font-mono-tabular">
                  <span className="text-slate-400 hidden sm:inline">
                    {session.mode === 'timed' ? 'Left:' : 'Time:'}
                  </span>
                  <span
                    className={`font-bold text-xs sm:text-sm ${
                      session.mode === 'timed' && remainingMs < 5 * 60 * 1000
                        ? 'text-rose-400'
                        : 'text-white'
                    }`}
                  >
                    {session.mode === 'timed'
                      ? formatClock(remainingMs)
                      : formatClock(elapsedTotalMs)}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span
                    className={isOverPaced ? 'text-amber-300 font-semibold' : 'text-slate-300'}
                    title="Time spent on current question (turns amber after 2:00)"
                  >
                    Q: {formatClock(currentQuestionTimeMs)}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Hidden</span>
              )}

              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="p-1 text-slate-300 hover:text-white rounded"
                title={isPaused ? 'Resume Timer' : 'Pause Timer'}
                aria-label={isPaused ? 'Resume Timer' : 'Pause Timer'}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setHideTimer((h) => !h)}
                className="p-1 text-slate-400 hover:text-white rounded"
                title={hideTimer ? 'Show Timer' : 'Hide Timer'}
                aria-label={hideTimer ? 'Show Timer' : 'Hide Timer'}
              >
                {hideTimer ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Right: ETS Exam Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowCalculator((c) => !c)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                showCalculator
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 border-white/15'
              }`}
              title="Toggle ETS Calculator (Shortcut: C)"
            >
              <Calculator className="w-3.5 h-3.5" />
              Calc
            </button>

            <button
              type="button"
              onClick={handleToggleMarkReview}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isMarkedReview
                  ? 'bg-amber-500/25 text-amber-200 border-amber-400/60'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 border-white/15'
              }`}
              title="Mark for Review (Shortcut: M)"
            >
              <Flag className="w-3.5 h-3.5" />
              {isMarkedReview ? 'Marked' : 'Mark'}
            </button>

            <button
              type="button"
              onClick={() => onToggleBookmark(currentQuestion._id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isBookmarked
                  ? 'bg-sky-500/25 text-sky-200 border-sky-400/60'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 border-white/15'
              }`}
              aria-label={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
            >
              <Bookmark className="w-3.5 h-3.5" />
              {isBookmarked ? 'Saved' : 'Save'}
            </button>

            <button
              type="button"
              onClick={() => setActiveDrawer((d) => (d === 'note' ? 'none' : 'note'))}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                activeDrawer === 'note' || existingNote
                  ? 'bg-emerald-600/25 text-emerald-200 border-emerald-400/60'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 border-white/15'
              }`}
            >
              <NotebookPen className="w-3.5 h-3.5" />
              Note
            </button>

            <button
              type="button"
              onClick={() => setActiveDrawer((d) => (d === 'error' ? 'none' : 'error'))}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                activeDrawer === 'error' || existingError
                  ? 'bg-rose-600/25 text-rose-200 border-rose-400/60'
                  : 'bg-white/10 hover:bg-white/15 text-slate-100 border-white/15'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Error
            </button>

            <button
              type="button"
              onClick={() => setShowPalette((p) => !p)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white/10 hover:bg-white/15 text-slate-100 border border-white/15 transition-colors whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Review ({answeredCount}/{questions.length})
            </button>

            <button
              type="button"
              onClick={() => onFinishSession(answers, timeSpentByQuestion)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Submit
            </button>
          </div>
        </div>

        {/* Section Quick-Jump Bar only for contiguous multi-section Mock Tests */}
        {isContiguousMultiSection && (
          <div className="max-w-[1380px] mx-auto pt-1.5 mt-1.5 border-t border-white/10 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1 shrink-0">Sections:</span>
              {sectionGroups.map((sg, idx) => {
                const isCurrentSection =
                  currentIndex >= sg.firstIndex && currentIndex < sg.firstIndex + sg.count;
                return (
                  <button
                    key={`${sg.section}-${idx}`}
                    type="button"
                    onClick={() => setCurrentIndex(sg.firstIndex)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isCurrentSection
                        ? 'bg-white text-[#14243B] font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {formatSectionLabel(sg.section)} ({sg.count})
                  </button>
                );
              })}
            </div>

            {markedCount > 0 && (
              <span className="text-[11px] text-amber-300 font-mono-tabular whitespace-nowrap shrink-0">
                {markedCount} marked for review
              </span>
            )}
          </div>
        )}
      </header>

      {/* Main Question Workspace */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 lg:px-6 py-3.5 space-y-3.5">
        {/* Compact Section Question Strip for instant 1-click navigation */}
        {activeSectionGroup.count > 1 && activeSectionGroup.count <= 30 && (
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: activeSectionGroup.count }).map((_, localIdx) => {
                const globalIdx = activeSectionGroup.firstIndex + localIdx;
                const q = questions[globalIdx];
                const qAns = answers[q._id];
                const { isAnswered, isCorrect } = evaluateQuestionAnswer(q, qAns);
                const isCurrent = globalIdx === currentIndex;
                const isMarked = Boolean(qAns?.markedForReview);
                const wasChecked = Boolean(qAns?.checked && session.instantFeedbackAllowed);

                let pillStyle =
                  'bg-white dark:bg-[#161B22] text-slate-600 dark:text-slate-400 border-[#E4E2DC] dark:border-[#262D38] hover:border-slate-400';
                if (wasChecked) {
                  pillStyle = isCorrect
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-rose-700 text-white border-rose-700';
                } else if (isAnswered) {
                  pillStyle =
                    'bg-[#1E3A5F] dark:bg-blue-600 text-white border-[#1E3A5F] dark:border-blue-600';
                }

                return (
                  <button
                    key={q._id}
                    type="button"
                    onClick={() => setCurrentIndex(globalIdx)}
                    aria-label={`Jump to Question ${globalIdx + 1}`}
                    className={`relative w-8 h-8 rounded-md border font-mono-tabular text-xs font-semibold flex items-center justify-center shrink-0 transition-colors ${pillStyle} ${
                      isCurrent
                        ? 'ring-2 ring-offset-1 ring-[#1E3A5F] dark:ring-blue-400 dark:ring-offset-[#0E1117]'
                        : ''
                    }`}
                  >
                    {localIdx + 1}
                    {isMarked && (
                      <span
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white dark:border-[#0E1117]"
                        title="Marked for review"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <span className="hidden md:inline text-[11px] text-slate-500 dark:text-slate-500 whitespace-nowrap shrink-0">
              Keys: ←/→ Navigate · M Mark · C Calc{session.instantFeedbackAllowed ? ' · A Answer' : ''}
            </span>
          </div>
        )}

        {/* Inline Study Note Drawer */}
        {activeDrawer === 'note' && (
          <div className="bg-white dark:bg-[#161B22] border border-emerald-600/50 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Personal Study Note · Question {currentIndex + 1}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Capture vocabulary nuances, Quant shortcuts, or reasoning steps. Automatically synced to Study Notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close Note Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1">Tags:</span>
              {NOTE_TAG_PRESETS.map((tag) => {
                const active = noteTagsDraft.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setNoteTagsDraft((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? 'bg-emerald-700 text-white'
                        : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              placeholder="Write your note, vocabulary meaning, or solution shortcut here..."
              className="w-full p-3 rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />

            <div className="flex items-center justify-end gap-3">
              {noteSavedToast && (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Saved to Study Notes
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveNoteClick}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
              >
                Save Study Note
              </button>
            </div>
          </div>
        )}

        {/* Inline Error Log Drawer */}
        {activeDrawer === 'error' && (
          <div className="bg-white dark:bg-[#161B22] border border-rose-600/50 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Log Question {currentIndex + 1} to Error Log
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tag the root cause so you can drill weak patterns before test day.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close Error Log Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1">Mistake Reason:</span>
              {ERROR_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setErrorCategoryDraft(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    errorCategoryDraft === cat
                      ? 'bg-rose-700 text-white'
                      : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <textarea
              value={errorReflectionDraft}
              onChange={(e) => setErrorReflectionDraft(e.target.value)}
              rows={2}
              placeholder="What trap did you fall for, or what concept/vocab needs review?"
              className="w-full p-3 rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600"
            />

            <div className="flex items-center justify-end gap-3">
              {errorSavedToast && (
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Logged to Error Log
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveErrorClick}
                className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold transition-colors"
              >
                Save to Error Log
              </button>
            </div>
          </div>
        )}

        {/* Active GRE Question */}
        <QuestionRenderer
          question={currentQuestion}
          answer={currentAns}
          onChangeAnswer={handleUpdateAnswer}
          showSolution={isSolutionVisible}
        />

        {/* Verified Official Answer Key Panel underneath the Question */}
        {isSolutionVisible && (
          <div
            className={`px-4 py-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              !evaluation.isAnswered
                ? 'bg-white dark:bg-[#161B22] border-emerald-600/50 text-slate-900 dark:text-slate-100'
                : evaluation.isCorrect
                ? 'bg-emerald-50/90 dark:bg-emerald-950/35 border-emerald-600/60 text-emerald-950 dark:text-emerald-100'
                : 'bg-rose-50/90 dark:bg-rose-950/35 border-rose-600/60 text-rose-950 dark:text-rose-100'
            }`}
          >
            <div className="space-y-1 flex-1 min-w-[260px]">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                {!evaluation.isAnswered ? (
                  <>
                    <BookOpenCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Verified Official Answer Key</span>
                  </>
                ) : evaluation.isCorrect ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Correct Answer</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                    <span>Incorrect or Incomplete</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Official Answer:
                </span>
                <RichAnswerSummary question={currentQuestion} variant="correct" />
              </div>

              {evaluation.isAnswered && !evaluation.isCorrect && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    Your Response:
                  </span>
                  <RichAnswerSummary
                    question={currentQuestion}
                    variant="user"
                    userAnswer={currentAns}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {evaluation.isAnswered && !evaluation.isCorrect && (
                <button
                  type="button"
                  onClick={() => setActiveDrawer('error')}
                  className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  Log Mistake
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveDrawer('note')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0E1117] border border-[#D8D5CC] dark:border-[#2A3240] text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Add Note
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Exam Navigation Footer */}
      <footer className="sticky bottom-0 z-30 bg-white dark:bg-[#161B22] border-t border-[#E4E2DC] dark:border-[#262D38] px-4 lg:px-6 py-2.5">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {session.instantFeedbackAllowed && (
              <>
                <button
                  type="button"
                  onClick={handleToggleCheckAnswer}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                    isSolutionVisible
                      ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white border-[#1E3A5F] dark:border-blue-600'
                      : 'bg-[#FAF9F6] dark:bg-[#0E1117] hover:bg-[#F2F0EA] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-[#D8D5CC] dark:border-[#2A3240]'
                  }`}
                >
                  <BookOpenCheck className="w-3.5 h-3.5" />
                  {isSolutionVisible ? 'Hide Answer Key' : 'Check Answer'}
                </button>

                <label className="hidden sm:inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none pl-1">
                  <input
                    type="checkbox"
                    checked={alwaysShowAnswers}
                    onChange={(e) => setAlwaysShowAnswers(e.target.checked)}
                    className="w-3.5 h-3.5 accent-emerald-700 rounded"
                  />
                  Always show answer below
                </label>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[#D8D5CC] dark:border-[#2A3240] bg-white dark:bg-[#0E1117] text-slate-800 dark:text-slate-100 hover:bg-[#F7F6F2] dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onFinishSession(answers, timeSpentByQuestion)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors whitespace-nowrap shrink-0"
              >
                Finish &amp; Grade Exam
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* On-Screen GRE Calculator */}
      <GreCalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onTransferDisplay={
          isNumericQuestion(currentQuestion) && !isFractionQuestion(currentQuestion)
            ? handleTransferFromCalculator
            : undefined
        }
      />

      {/* Question Navigator / Review Palette Modal */}
      {showPalette && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          onClick={() => setShowPalette(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Question Review Navigator"
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E4E2DC] dark:border-[#262D38] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Section Question Navigator
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {answeredCount} of {questions.length} answered · {markedCount} marked · Click any question to jump
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPalette(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                aria-label="Close Navigator"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {sectionGroups.map((sg, sIdx) => {
                const secQuestions = questions.slice(sg.firstIndex, sg.firstIndex + sg.count);
                return (
                  <div key={`${sg.section}-${sIdx}`} className="space-y-2.5">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {formatSectionLabel(sg.section)}
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {secQuestions.map((q, localIdx) => {
                        const globalIdx = sg.firstIndex + localIdx;
                        const qAns = answers[q._id];
                        const { isAnswered, isCorrect } = evaluateQuestionAnswer(q, qAns);
                        const isCurrent = globalIdx === currentIndex;
                        const isMarked = Boolean(qAns?.markedForReview);
                        const wasChecked = Boolean(qAns?.checked && session.instantFeedbackAllowed);

                        let btnClass =
                          'bg-[#F7F6F2] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 border-[#E4E2DC] dark:border-[#262D38]';
                        if (wasChecked) {
                          btnClass = isCorrect
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-rose-700 text-white border-rose-700';
                        } else if (isAnswered) {
                          btnClass = 'bg-[#1E3A5F] dark:bg-blue-600 text-white border-[#1E3A5F]';
                        }

                        return (
                          <button
                            key={q._id}
                            type="button"
                            onClick={() => {
                              setCurrentIndex(globalIdx);
                              setShowPalette(false);
                            }}
                            className={`relative h-10 rounded-lg border font-mono-tabular text-xs font-semibold flex items-center justify-center transition-transform hover:scale-105 ${btnClass} ${
                              isCurrent
                                ? 'ring-2 ring-offset-2 ring-[#1E3A5F] dark:ring-blue-400'
                                : ''
                            }`}
                          >
                            {globalIdx + 1}
                            {isMarked && (
                              <span
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border border-white dark:border-[#161B22]"
                                title="Marked for Review"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 bg-[#FAF9F6] dark:bg-[#0E1117] border-t border-[#E4E2DC] dark:border-[#262D38] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#1E3A5F] dark:bg-blue-600 inline-block" /> Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#F7F6F2] dark:bg-[#161B22] border border-[#D8D5CC] dark:border-[#2A3240] inline-block" /> Unanswered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Marked
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPalette(false);
                  onFinishSession(answers, timeSpentByQuestion);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
              >
                Submit &amp; Grade Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {confirmExit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Exit Test"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Leave Active GRE Session?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You can submit and grade the {answeredCount} questions answered so far, or exit back to the dashboard without saving.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-[#F3F1EC] dark:bg-slate-800 hover:bg-slate-200"
              >
                Keep Practicing
              </button>
              <button
                type="button"
                onClick={onExitWithoutSaving}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100"
              >
                Discard &amp; Exit
              </button>
              <button
                type="button"
                onClick={() => onFinishSession(answers, timeSpentByQuestion)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600"
              >
                Submit &amp; Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
