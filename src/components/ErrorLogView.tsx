import React, { useMemo, useState } from 'react';
import {
  ErrorCategory,
  ErrorLogEntry,
  ErrorMasteryStatus,
  GREQuestion,
} from '../types/gre';
import {
  classifyQuestionSubType,
  ERROR_CATEGORIES,
  formatSectionLabel,
  getBroadSection,
  MONTH_CONFIGS,
  stripHtmlToText,
} from '../utils/greLogic';
import { QuestionRenderer } from './QuestionRenderer';
import { RichAnswerSummary } from './RichAnswerSummary';
import {
  AlertTriangle,
  Play,
  Clock,
  Search,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ErrorLogViewProps {
  errorLog: ErrorLogEntry[];
  onUpdateEntry: (params: {
    question: GREQuestion;
    monthId: string;
    monthLabel: string;
    testId: string;
    testTitle: string;
    category?: ErrorCategory;
    status?: ErrorMasteryStatus;
    reflectionNote?: string;
  }) => void;
  onRemoveEntry: (questionId: string) => void;
  onPracticeErrors: (questions: GREQuestion[], mode: 'timed' | 'untimed', title: string) => void;
}

export const ErrorLogView: React.FC<ErrorLogViewProps> = ({
  errorLog,
  onUpdateEntry,
  onRemoveEntry,
  onPracticeErrors,
}) => {
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'Verbal' | 'Quant'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ErrorMasteryStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const filteredEntries = useMemo(() => {
    return errorLog.filter((entry) => {
      if (monthFilter !== 'all' && entry.monthId !== monthFilter) return false;
      if (sectionFilter !== 'all' && getBroadSection(entry.question.section) !== sectionFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const plainQuestion = stripHtmlToText(entry.question.content).toLowerCase();
        const noteText = (entry.reflectionNote || '').toLowerCase();
        const testText = (entry.testTitle || '').toLowerCase();
        if (!plainQuestion.includes(q) && !noteText.includes(q) && !testText.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [errorLog, monthFilter, sectionFilter, categoryFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const needsReview = errorLog.filter((e) => e.status === 'needs_review').length;
    const reviewing = errorLog.filter((e) => e.status === 'reviewing').length;
    const mastered = errorLog.filter((e) => e.status === 'mastered').length;

    const catCounts: Record<string, number> = {};
    errorLog.forEach((e) => {
      catCounts[e.category] = (catCounts[e.category] || 0) + 1;
    });
    const topCategory =
      Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet';

    return { total: errorLog.length, needsReview, reviewing, mastered, topCategory };
  }, [errorLog]);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Header & Practice Actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Personal GRE Error Log &amp; Mistake Tracker
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review every missed or flagged question across all months, diagnose root causes, and launch targeted retry drills.
          </p>
        </div>

        {filteredEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                onPracticeErrors(
                  filteredEntries.map((e) => e.question),
                  'untimed',
                  `Error Log Drill (${filteredEntries.length} Questions)`
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              Practice {filteredEntries.length} Mistakes (Untimed)
            </button>

            <button
              type="button"
              onClick={() =>
                onPracticeErrors(
                  filteredEntries.map((e) => e.question),
                  'timed',
                  `Timed Error Log Drill (${filteredEntries.length} Questions)`
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Clock className="w-3.5 h-3.5" />
              Timed Retry ({filteredEntries.length})
            </button>
          </div>
        )}
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Logged Mistakes</div>
          <div className="mt-1 text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <div className="mt-1 text-xs text-slate-500">Saved locally on this PC</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Needs Active Review</div>
          <div className="mt-1 text-3xl font-bold font-mono-tabular text-rose-600 dark:text-rose-400">
            {stats.needsReview}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
            {stats.reviewing} currently in review
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Mastered Mistakes</div>
          <div className="mt-1 text-3xl font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
            {stats.mastered}
          </div>
          <div className="mt-1 text-xs text-slate-500">Resolved &amp; verified</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Primary Error Pattern</div>
          <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white truncate">
            {stats.topCategory}
          </div>
          <div className="mt-1 text-xs text-slate-500">Most frequent root cause</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question text, reflection note, or mock test..."
              aria-label="Search Error Log"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Filter Error Log by Month"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Months</option>
            {MONTH_CONFIGS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter Error Log by Mistake Reason"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Mistake Reasons</option>
            {ERROR_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ErrorMasteryStatus)}
            aria-label="Filter Error Log by Status"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="reviewing">Reviewing</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>

        {/* Section Segmented Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['all', 'Verbal', 'Quant'] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSectionFilter(sec)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  sectionFilter === sec
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {sec === 'all' ? 'All Sections' : `${sec} Only`}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono-tabular">
            Showing {filteredEntries.length} of {errorLog.length} entries
          </span>
        </div>
      </div>

      {/* Error Log List or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {errorLog.length === 0
              ? 'Your Error Log is Currently Empty'
              : 'No Error Log Entries Match Your Filters'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {errorLog.length === 0
              ? 'Whenever you miss a question in a Timed or Untimed mock test—or click "Error Log" during practice—it is automatically saved here with your answer, pacing, and root-cause analysis.'
              : 'Try clearing your search query or switching the month/category filters above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredEntries.map((entry) => {
            const isRevealed = Boolean(revealedIds[entry.id]);

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
              >
                {/* Metadata Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {entry.monthLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {entry.testTitle}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatSectionLabel(entry.question.section)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{classifyQuestionSubType(entry.question)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Missed {entry.mistakeCount}x
                      </span>
                    </div>
                  </div>

                  {/* Status & Reveal Answer Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {(
                        [
                          { id: 'needs_review', label: 'Needs Review' },
                          { id: 'reviewing', label: 'Reviewing' },
                          { id: 'mastered', label: 'Mastered' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            onUpdateEntry({
                              question: entry.question,
                              monthId: entry.monthId,
                              monthLabel: entry.monthLabel,
                              testId: entry.testId,
                              testTitle: entry.testTitle,
                              status: st.id,
                            })
                          }
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            entry.status === st.id
                              ? st.id === 'mastered'
                                ? 'bg-emerald-600 text-white'
                                : st.id === 'reviewing'
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setRevealedIds((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide Answer
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Show Official Answer
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveEntry(entry.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remove from Error Log"
                      aria-label="Remove from Error Log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Display */}
                <QuestionRenderer
                  question={entry.question}
                  answer={entry.userAnswer}
                  onChangeAnswer={() => {}}
                  showSolution={isRevealed}
                  readOnly={true}
                />

                {/* Answer Comparison Strip when revealed */}
                {isRevealed && (
                  <div className="p-4 rounded-lg bg-[#FAF9F6] dark:bg-[#0E1117] border border-[#E4E2DC] dark:border-[#262D38] flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        Your Previous Answer:
                      </span>
                      <RichAnswerSummary
                        question={entry.question}
                        variant="user"
                        userAnswer={entry.userAnswer}
                        compact
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Official Answer:
                      </span>
                      <RichAnswerSummary question={entry.question} variant="correct" compact />
                    </div>
                  </div>
                )}

                {/* Root Cause Category & Reflection Note Editor */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
                      Mistake Cause:
                    </span>
                    {ERROR_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          onUpdateEntry({
                            question: entry.question,
                            monthId: entry.monthId,
                            monthLabel: entry.monthLabel,
                            testId: entry.testId,
                            testTitle: entry.testTitle,
                            category: cat,
                          })
                        }
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          entry.category === cat
                            ? 'bg-slate-900 dark:bg-sky-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label
                      htmlFor={`reflection-${entry.id}`}
                      className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
                    >
                      Error Reflection &amp; Strategy Note (auto-saves):
                    </label>
                    <textarea
                      id={`reflection-${entry.id}`}
                      rows={2}
                      value={entry.reflectionNote}
                      onChange={(e) =>
                        onUpdateEntry({
                          question: entry.question,
                          monthId: entry.monthId,
                          monthLabel: entry.monthLabel,
                          testId: entry.testId,
                          testTitle: entry.testTitle,
                          reflectionNote: e.target.value,
                        })
                      }
                      placeholder="Write why you missed this question and how to avoid the trap next time..."
                      className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
