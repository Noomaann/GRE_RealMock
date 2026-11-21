import React, { useMemo, useState } from 'react';
import {
  ErrorCategory,
  ErrorLogEntry,
  ErrorMasteryStatus,
  GREQuestion,
} from '../types/gre';
import { ERROR_CATEGORIES, stripHtmlToText } from '../utils/greLogic';
import { TopicCategoryDef } from '../utils/topicClassifier';
import { QuestionRenderer } from './QuestionRenderer';
import { RichAnswerSummary } from './RichAnswerSummary';
import {
  Clock,
  Eye,
  EyeOff,
  Play,
  Trash2,
} from 'lucide-react';

interface TopicErrorLogPanelProps {
  category: TopicCategoryDef;
  entries: ErrorLogEntry[];
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

export const TopicErrorLogPanel: React.FC<TopicErrorLogPanelProps> = ({
  category,
  entries,
  onUpdateEntry,
  onRemoveEntry,
  onPracticeErrors,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | ErrorMasteryStatus>('all');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const filteredEntries = useMemo(() => {
    if (statusFilter === 'all') return entries;
    return entries.filter((e) => e.status === statusFilter);
  }, [entries, statusFilter]);

  const activeCount = entries.filter((e) => e.status !== 'mastered').length;
  const masteredCount = entries.length - activeCount;

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {/* Header & Practice Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F1EC] dark:bg-[#0E1117]">
            {(
              [
                { id: 'all', label: `All (${entries.length})` },
                {
                  id: 'needs_review',
                  label: `Needs Review (${entries.filter((e) => e.status === 'needs_review').length})`,
                },
                {
                  id: 'reviewing',
                  label: `Reviewing (${entries.filter((e) => e.status === 'reviewing').length})`,
                },
                { id: 'mastered', label: `Mastered (${masteredCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {entries.length > 0 && (
            <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
              {activeCount} active to fix
            </span>
          )}
        </div>

        {filteredEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onPracticeErrors(
                  filteredEntries.map((e) => e.question),
                  'untimed',
                  `${category.name} — Error Drill`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F1EC] dark:bg-[#0E1117] hover:bg-[#E7E4DC] dark:hover:bg-slate-800 border border-[#D8D5CC] dark:border-[#2A3240] text-slate-900 dark:text-white transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
              Practice Topic Errors ({filteredEntries.length})
            </button>
            <button
              type="button"
              onClick={() =>
                onPracticeErrors(
                  filteredEntries.map((e) => e.question),
                  'timed',
                  `${category.name} — Timed Error Drill`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors whitespace-nowrap"
            >
              <Clock className="w-3.5 h-3.5" />
              Timed Redo
            </button>
          </div>
        )}
      </div>

      {/* Empty State or Error Entries */}
      {filteredEntries.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117]/60 text-center space-y-2">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {entries.length === 0
              ? `No Mistakes Logged in ${category.name} Yet`
              : 'No Mistakes in This Status Filter'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {entries.length === 0
              ? 'Any question you miss in this topic during a Mock Test or Topic Drill is logged here automatically, or you can click “Log Error” on any question in the Questions tab.'
              : 'Switch the status filter above to see your other logged mistakes in this topic.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isRevealed = Boolean(revealedIds[entry.id]);
            const snippet = stripHtmlToText(
              entry.question.optiontopcontent ||
                entry.question.content ||
                (entry.question.blanks?.[0]
                  ? `Quantity A: ${entry.question.blanks[0].quantityA || ''} vs Quantity B: ${
                      entry.question.blanks[0].quantityB || ''
                    }`
                  : '')
            );

            return (
              <article
                key={entry.id}
                className="rounded-xl border border-[#E4E2DC] dark:border-[#262D38] bg-white dark:bg-[#161B22] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">
                        {entry.monthLabel} · {entry.testTitle}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Missed {entry.mistakeCount}x
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          entry.status === 'mastered'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : entry.status === 'reviewing'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {entry.status === 'mastered'
                          ? 'Mastered'
                          : entry.status === 'reviewing'
                          ? 'Reviewing'
                          : 'Needs Review'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">
                      {snippet || '[Visual / Math Question — click Show Question to inspect]'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleReveal(entry.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] hover:bg-[#EFECE4] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hide Question
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Show Question &amp; Key
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveEntry(entry.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Remove from Error Log"
                      aria-label="Remove from Error Log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Mistake Category, Mastery Status & Reflection Note */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2 border-t border-[#E4E2DC] dark:border-[#262D38]">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Mistake Reason
                    </label>
                    <select
                      value={entry.category}
                      onChange={(e) =>
                        onUpdateEntry({
                          question: entry.question,
                          monthId: entry.monthId,
                          monthLabel: entry.monthLabel,
                          testId: entry.testId,
                          testTitle: entry.testTitle,
                          category: e.target.value as ErrorCategory,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
                    >
                      {ERROR_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Mastery Status
                    </label>
                    <select
                      value={entry.status}
                      onChange={(e) =>
                        onUpdateEntry({
                          question: entry.question,
                          monthId: entry.monthId,
                          monthLabel: entry.monthLabel,
                          testId: entry.testId,
                          testTitle: entry.testTitle,
                          status: e.target.value as ErrorMasteryStatus,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
                    >
                      <option value="needs_review">Needs Review</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="mastered">Mastered</option>
                    </select>
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Why did I miss this? (Takeaway)
                    </label>
                    <input
                      type="text"
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
                      placeholder="Write the exact trap or formula to remember next time..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Expandable Full Question + Verified Answer */}
                {isRevealed && (
                  <div className="pt-3 border-t border-[#E4E2DC] dark:border-[#262D38] space-y-3">
                    <QuestionRenderer
                      question={entry.question}
                      answer={entry.userAnswer}
                      onChangeAnswer={() => {}}
                      showSolution={true}
                      readOnly={true}
                    />
                    <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50/85 dark:bg-emerald-950/35 border border-emerald-600/50 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        Verified Official Answer:
                      </span>
                      <RichAnswerSummary question={entry.question} variant="correct" />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
