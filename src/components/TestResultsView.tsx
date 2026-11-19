import React, { useMemo, useState } from 'react';
import {
  ErrorCategory,
  ErrorLogEntry,
  GREQuestion,
  StudyNote,
  TestAttempt,
} from '../types/gre';
import {
  calculateSessionMetrics,
  classifyQuestionSubType,
  ERROR_CATEGORIES,
  evaluateQuestionAnswer,
  formatSectionLabel,
  NOTE_TAG_PRESETS,
} from '../utils/greLogic';
import { QuestionRenderer } from './QuestionRenderer';
import { RichAnswerSummary } from './RichAnswerSummary';
import {
  ArrowLeft,
  Check,
  X,
  RotateCcw,
  NotebookPen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TestResultsViewProps {
  attempt: TestAttempt;
  errorLog: ErrorLogEntry[];
  notes: StudyNote[];
  onBackToDashboard: () => void;
  onRetryQuestions: (questions: GREQuestion[], mode: 'timed' | 'untimed', title: string) => void;
  onSaveQuestionNote: (params: {
    question: GREQuestion;
    content: string;
    tags: string[];
  }) => void;
  onUpdateErrorEntry: (params: {
    question: GREQuestion;
    category: ErrorCategory;
    reflectionNote: string;
  }) => void;
}

function formatSeconds(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export const TestResultsView: React.FC<TestResultsViewProps> = ({
  attempt,
  errorLog,
  notes,
  onBackToDashboard,
  onRetryQuestions,
  onSaveQuestionNote,
  onUpdateErrorEntry,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'incorrect' | 'correct' | 'unanswered'>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    attempt.questionsSnapshot[0]?._id || null
  );
  const [editingNoteQId, setEditingNoteQId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteTags, setNoteTags] = useState<string[]>([]);

  const metrics = useMemo(
    () =>
      calculateSessionMetrics(
        attempt.questionsSnapshot,
        attempt.answers,
        attempt.timeSpentByQuestion
      ),
    [attempt]
  );

  const combinedScaledScore =
    metrics.estimatedVerbalScore !== null && metrics.estimatedQuantScore !== null
      ? metrics.estimatedVerbalScore + metrics.estimatedQuantScore
      : null;

  const filteredQuestions = useMemo(() => {
    return attempt.questionsSnapshot.filter((q) => {
      const { isAnswered, isCorrect, isGradable } = evaluateQuestionAnswer(
        q,
        attempt.answers[q._id]
      );
      if (filterStatus === 'incorrect') return isGradable && (!isAnswered || !isCorrect);
      if (filterStatus === 'correct') return isGradable && isAnswered && isCorrect;
      if (filterStatus === 'unanswered') return !isAnswered;
      return true;
    });
  }, [attempt, filterStatus]);

  const missedQuestions = useMemo(() => {
    return attempt.questionsSnapshot.filter((q) => {
      const { isCorrect, isGradable } = evaluateQuestionAnswer(q, attempt.answers[q._id]);
      return isGradable && !isCorrect;
    });
  }, [attempt]);

  const handleOpenNoteEditor = (q: GREQuestion) => {
    const existing = notes.find((n) => n.questionId === q._id);
    setEditingNoteQId(q._id);
    setNoteContent(existing?.content || '');
    setNoteTags(existing?.tags || ['Must Review']);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Mock Test Suite
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
            {attempt.testTitle} — Score Report &amp; Verified Answer Review
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>{attempt.monthLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Mode: {attempt.mode === 'timed' ? 'Timed GRE Exam' : 'Untimed Practice'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">Total Time: {formatSeconds(metrics.totalTimeMs)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {missedQuestions.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onRetryQuestions(
                  missedQuestions,
                  'untimed',
                  `${attempt.testTitle} (Missed Questions Retry)`
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-700 hover:bg-rose-600 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry {missedQuestions.length} Missed Questions
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              onRetryQuestions(attempt.questionsSnapshot, attempt.mode, attempt.testTitle)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retake Test
          </button>
        </div>
      </div>

      {/* Estimated ETS GRE Score Report Card + KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {combinedScaledScore ? 'Estimated GRE Scaled Score' : 'Overall Accuracy'}
          </div>
          <div className="mt-1 text-3xl font-bold font-mono-tabular text-[#1E3A5F] dark:text-blue-400">
            {combinedScaledScore ? `${combinedScaledScore}` : `${metrics.accuracyPercent}%`}
            {combinedScaledScore && (
              <span className="text-sm font-normal text-slate-400"> / 340</span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
            {combinedScaledScore
              ? `V ${metrics.estimatedVerbalScore} · Q ${metrics.estimatedQuantScore} (${metrics.accuracyPercent}%)`
              : `${metrics.correctCount} / ${metrics.gradableQuestions} correct`}
          </div>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Raw Score &amp; Completion</div>
          <div className="mt-1 text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {metrics.correctCount}
            <span className="text-base font-normal text-slate-400">
              {' '}
              / {metrics.gradableQuestions}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
            {metrics.answeredCount} answered · {metrics.unansweredCount} skipped
          </div>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Average Pacing</div>
          <div className="mt-1 text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {formatSeconds(metrics.avgTimePerQuestionMs)}
          </div>
          <div className="mt-1 text-xs text-slate-500">per question (ETS avg ~1m 35s)</div>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Auto-Logged to Error Log</div>
          <div className="mt-1 text-3xl font-bold font-mono-tabular text-rose-700 dark:text-rose-400">
            {metrics.incorrectCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            incorrect answers saved for review
          </div>
        </div>
      </div>

      {/* Section & Subtype Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Section-by-Section Performance
          </h2>
          <div className="divide-y divide-[#E4E2DC] dark:divide-[#262D38]">
            {Object.entries(metrics.bySection).map(([sec, stats]) => {
              const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              return (
                <div key={sec} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatSectionLabel(sec)}
                  </span>
                  <div className="flex items-center gap-4 font-mono-tabular text-slate-600 dark:text-slate-400">
                    <span>
                      {stats.total > 0
                        ? `${stats.correct}/${stats.total} (${pct}%)`
                        : stats.answered > 0
                        ? 'Essay Written'
                        : 'Essay (Optional)'}
                    </span>
                    <span>{formatSeconds(stats.timeMs)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Accuracy by GRE Question Type
          </h2>
          <div className="divide-y divide-[#E4E2DC] dark:divide-[#262D38]">
            {Object.entries(metrics.bySubType).map(([subType, stats]) => {
              const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              return (
                <div key={subType} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {subType}
                  </span>
                  <div className="flex items-center gap-4 font-mono-tabular text-slate-600 dark:text-slate-400">
                    <span>
                      {stats.correct}/{stats.total} ({pct}%)
                    </span>
                    <span>
                      Avg {formatSeconds(Math.round(stats.timeMs / Math.max(1, stats.total)))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Question-by-Question Solution & Note Inspector */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Question-by-Question Answer Key Review ({filteredQuestions.length})
          </h2>

          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#EAE7DF] dark:bg-[#1C222B] rounded-lg">
            {(
              [
                { id: 'all', label: `All (${attempt.questionsSnapshot.length})` },
                { id: 'incorrect', label: `Missed (${missedQuestions.length})` },
                { id: 'correct', label: `Correct (${metrics.correctCount})` },
                { id: 'unanswered', label: `Skipped (${metrics.unansweredCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filterStatus === tab.id
                    ? 'bg-white dark:bg-[#0E1117] text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredQuestions.map((q) => {
            const qAns = attempt.answers[q._id];
            const { isCorrect, isGradable } = evaluateQuestionAnswer(q, qAns);
            const isExpanded = expandedQuestionId === q._id;
            const timeMs = attempt.timeSpentByQuestion[q._id] || 0;
            const existingError = errorLog.find((e) => e.id === q._id);
            const existingNote = notes.find((n) => n.questionId === q._id);
            const qNumber = (q.questionIndex ?? attempt.questionsSnapshot.indexOf(q)) + 1;

            return (
              <div
                key={q._id}
                className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl overflow-hidden"
              >
                {/* Row Header */}
                <button
                  type="button"
                  onClick={() => setExpandedQuestionId(isExpanded ? null : q._id)}
                  className="w-full px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-left hover:bg-[#FAF9F6] dark:hover:bg-[#1C222B]/60 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                    <span
                      className={`mt-0.5 w-7 h-7 rounded-lg font-mono-tabular text-xs font-bold flex items-center justify-center shrink-0 ${
                        !isGradable
                          ? 'bg-[#EAE7DF] dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : isCorrect
                          ? 'bg-emerald-700 text-white'
                          : 'bg-rose-700 text-white'
                      }`}
                    >
                      {isCorrect ? (
                        <Check className="w-4 h-4" />
                      ) : !isGradable ? (
                        'AWA'
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <span>Question {qNumber}</span>
                        <span aria-hidden="true" className="text-slate-400">
                          ·
                        </span>
                        <span>{formatSectionLabel(q.section)}</span>
                        <span aria-hidden="true" className="text-slate-400">
                          ·
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-normal">
                          {classifyQuestionSubType(q)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span>Your Answer:</span>
                          <RichAnswerSummary question={q} variant="user" userAnswer={qAns} compact />
                        </span>
                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            Official Answer:
                          </span>
                          <RichAnswerSummary question={q} variant="correct" compact />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                    {existingError && (
                      <span className="text-rose-700 dark:text-rose-400 font-medium">
                        Error Log: {existingError.category}
                      </span>
                    )}
                    {existingNote && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        Has Note
                      </span>
                    )}
                    <span className="font-mono-tabular">{formatSeconds(timeMs)}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Question + Error Log & Note Controls */}
                {isExpanded && (
                  <div className="px-5 pb-6 pt-3 border-t border-[#E4E2DC] dark:border-[#262D38] space-y-4 bg-[#FAF9F6] dark:bg-[#0E1117]">
                    <QuestionRenderer
                      question={q}
                      answer={qAns}
                      onChangeAnswer={() => {}}
                      showSolution={true}
                      readOnly={true}
                    />

                    {/* Quick Error Log & Note Bar */}
                    <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Error Log Reason:
                        </span>
                        {ERROR_CATEGORIES.map((cat) => {
                          const isSelectedCat = existingError?.category === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() =>
                                onUpdateErrorEntry({
                                  question: q,
                                  category: cat,
                                  reflectionNote: existingError?.reflectionNote || '',
                                })
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                isSelectedCat
                                  ? 'bg-rose-700 text-white'
                                  : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenNoteEditor(q)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                      >
                        <NotebookPen className="w-3.5 h-3.5" />
                        {existingNote ? 'Edit Question Note' : 'Add Question Note'}
                      </button>
                    </div>

                    {editingNoteQId === q._id && (
                      <div className="bg-white dark:bg-[#161B22] border border-emerald-600/50 rounded-xl p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Study Note · Question {qNumber}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {NOTE_TAG_PRESETS.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() =>
                                  setNoteTags((prev) =>
                                    prev.includes(tag)
                                      ? prev.filter((t) => t !== tag)
                                      : [...prev, tag]
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  noteTags.includes(tag)
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          rows={3}
                          placeholder="Write your takeaway, vocabulary note, or solution steps..."
                          className="w-full p-3 rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-sm text-slate-900 dark:text-slate-100"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNoteQId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSaveQuestionNote({
                                question: q,
                                content: noteContent,
                                tags: noteTags,
                              });
                              setEditingNoteQId(null);
                            }}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-600"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
