import React, { useMemo, useState } from 'react';
import {
  ErrorCategory,
  ErrorLogEntry,
  ErrorMasteryStatus,
  GREQuestion,
  GRETest,
  PracticeSessionConfig,
  StudyNote,
  TestAttempt,
} from '../types/gre';
import {
  classifyQuestionSubType,
  evaluateQuestionAnswer,
  MONTH_CONFIGS,
  stripHtmlToText,
} from '../utils/greLogic';
import {
  buildTopicPracticeSets,
  classifyQuestionTopic,
  getErrorsForTopic,
  getNextUncompletedSet,
  getNotesForTopic,
  getQuestionDedupKey,
  getTopicSetCompletionMap,
  RC_SINGLE_LATEST_LIMIT,
  selectLatestRcSingleQuestions,
  TOPIC_CATEGORIES,
  TOPIC_SET_SIZE,
  TopicCategoryDef,
  TopicDomain,
  TopicPracticeSet,
} from '../utils/topicClassifier';
import { QuestionRenderer } from './QuestionRenderer';
import { RichAnswerSummary } from './RichAnswerSummary';
import { CustomDrillView } from './CustomDrillView';
import { TopicNotesPanel } from './TopicNotesPanel';
import { TopicErrorLogPanel } from './TopicErrorLogPanel';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Layers,
  NotebookPen,
  Play,
  RotateCcw,
  Save,
  Search,
  X,
} from 'lucide-react';

interface TopicBankViewProps {
  allTestsByMonth: Record<string, GRETest[]>;
  bookmarks: string[];
  errorLog: ErrorLogEntry[];
  notes: StudyNote[];
  attempts: TestAttempt[];
  selectedCategoryId: string | null;
  onSelectCategoryId: (id: string | null) => void;
  onStartSession: (config: PracticeSessionConfig) => void;
  onInspectAttempt: (attempt: TestAttempt) => void;
  onSaveTopicNote: (params: {
    id?: string;
    topicId: string;
    topicName: string;
    title: string;
    content: string;
    tags: string[];
  }) => void;
  onSaveQuestionNote: (params: {
    question: GREQuestion;
    monthId?: string;
    monthLabel?: string;
    testTitle?: string;
    content: string;
    tags: string[];
  }) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateErrorEntry: (params: {
    question: GREQuestion;
    monthId: string;
    monthLabel: string;
    testId: string;
    testTitle: string;
    category?: ErrorCategory;
    status?: ErrorMasteryStatus;
    reflectionNote?: string;
  }) => void;
  onRemoveErrorEntry: (questionId: string) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonText: string) => void;
  onImportCustomMonthFile: (monthId: string, tests: GRETest[]) => void;
}

interface EnrichedCategorizedQuestion {
  question: GREQuestion;
  category: TopicCategoryDef;
  subType: string;
  dedupKey: string;
}

const QUANT_PILLARS = ['Arithmetic', 'Algebra', 'Geometry', 'Data Analysis'] as const;
const VERBAL_PILLARS = [
  'Text Completion & Sentence Equivalence',
  'Reading Comprehension & Critical Reasoning',
] as const;

const PAGE_SIZE = 20;

export const TopicBankView: React.FC<TopicBankViewProps> = ({
  allTestsByMonth,
  bookmarks,
  errorLog,
  notes,
  attempts,
  selectedCategoryId,
  onSelectCategoryId,
  onStartSession,
  onInspectAttempt,
  onSaveTopicNote,
  onSaveQuestionNote,
  onDeleteNote,
  onUpdateErrorEntry,
  onRemoveErrorEntry,
  onExportBackup,
  onImportBackup,
  onImportCustomMonthFile,
}) => {
  const [activeDomain, setActiveDomain] = useState<TopicDomain | 'errors' | 'custom'>('quant');
  const [globalMonth, setGlobalMonth] = useState<string>('all');
  const [globalDifficulty, setGlobalDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [deduplicate, setDeduplicate] = useState<boolean>(false);

  // Slide-over Section Revision Notes Drawer (accessible right beside every Quant/Verbal section)
  const [notesDrawerTopicId, setNotesDrawerTopicId] = useState<string | null>(null);

  // Selected Category Explorer state (default to 20-question Practice Sets)
  const [explorerTab, setExplorerTab] = useState<'sets' | 'questions' | 'errors' | 'notes'>('sets');
  const [setStatusFilter, setSetStatusFilter] = useState<'all' | 'remaining' | 'completed'>('all');
  const [explorerFormat, setExplorerFormat] = useState<string>('all');
  const [explorerPool, setExplorerPool] = useState<'all' | 'errors' | 'bookmarked'>('all');
  const [explorerSearch, setExplorerSearch] = useState<string>('');
  const [sessionLength, setSessionLength] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Inline quick-note editor on individual questions inside Category Explorer
  const [inlineNoteQuestionId, setInlineNoteQuestionId] = useState<string | null>(null);
  const [inlineNoteDraft, setInlineNoteDraft] = useState<string>('');

  // Pre-classify every question once when bank changes, applying the Latest-250 RC MCQ cap
  const { canonicalBank, totalRcSingleUnfiltered } = useMemo(() => {
    const rawNonRcSingle: EnrichedCategorizedQuestion[] = [];
    const rawRcSingle: EnrichedCategorizedQuestion[] = [];

    for (const m of MONTH_CONFIGS) {
      const tests = allTestsByMonth[m.id] || [];
      for (const t of tests) {
        (t.questions || []).forEach((q, idx) => {
          const enriched: GREQuestion = {
            ...q,
            monthId: q.monthId || m.id,
            monthLabel: q.monthLabel || m.label,
            testId: q.testId || t._id,
            testTitle: q.testTitle || t.title,
            testDate: q.testDate || t.testDate,
            questionIndex: q.questionIndex ?? idx,
          };
          const category = classifyQuestionTopic(enriched);
          const item: EnrichedCategorizedQuestion = {
            question: enriched,
            category,
            subType: classifyQuestionSubType(enriched),
            dedupKey: getQuestionDedupKey(enriched),
          };
          if (category.id === 'verbal-rc-single') {
            rawRcSingle.push(item);
          } else {
            rawNonRcSingle.push(item);
          }
        });
      }
    }

    const latestRcSingle = selectLatestRcSingleQuestions(rawRcSingle, RC_SINGLE_LATEST_LIMIT);
    return {
      canonicalBank: [...rawNonRcSingle, ...latestRcSingle],
      totalRcSingleUnfiltered: rawRcSingle.length,
    };
  }, [allTestsByMonth]);

  // Apply global filters (Month, Difficulty, Optional Deduplication)
  const filteredPool = useMemo(() => {
    const seen = new Set<string>();
    const result: EnrichedCategorizedQuestion[] = [];

    for (const item of canonicalBank) {
      if (globalMonth !== 'all' && item.question.monthId !== globalMonth) continue;
      const d = item.question.difficulty || 3;
      if (globalDifficulty === 'easy' && d > 2) continue;
      if (globalDifficulty === 'medium' && d !== 3) continue;
      if (globalDifficulty === 'hard' && d < 4) continue;

      if (deduplicate) {
        if (seen.has(item.dedupKey)) continue;
        seen.add(item.dedupKey);
      }
      result.push(item);
    }
    return result;
  }, [canonicalBank, globalMonth, globalDifficulty, deduplicate]);

  // User accuracy per category from completed attempts
  const masteryByCategory = useMemo(() => {
    const stats: Record<string, { answered: number; correct: number }> = {};
    for (const att of attempts) {
      for (const q of att.questionsSnapshot || []) {
        const ans = att.answers?.[q._id];
        const ev = evaluateQuestionAnswer(q, ans);
        if (!ev.isGradable || !ev.isAnswered) continue;
        const cat = classifyQuestionTopic(q);
        if (!stats[cat.id]) stats[cat.id] = { answered: 0, correct: 0 };
        stats[cat.id].answered++;
        if (ev.isCorrect) stats[cat.id].correct++;
      }
    }
    return stats;
  }, [attempts]);

  const errorIds = useMemo(() => new Set(errorLog.map((e) => e.id)), [errorLog]);
  const bookmarkIds = useMemo(() => new Set(bookmarks), [bookmarks]);
  const notesByQuestionId = useMemo(() => {
    const map: Record<string, StudyNote> = {};
    for (const n of notes) {
      if (n.questionId) map[n.questionId] = n;
    }
    return map;
  }, [notes]);

  // Pre-group notes and errors by topicId for fast section-card badges & drawers
  const notesByTopicId = useMemo(() => {
    const map: Record<string, StudyNote[]> = {};
    for (const cat of TOPIC_CATEGORIES) {
      map[cat.id] = getNotesForTopic(notes, cat.id);
    }
    return map;
  }, [notes]);

  const errorsByTopicId = useMemo(() => {
    const map: Record<string, ErrorLogEntry[]> = {};
    for (const cat of TOPIC_CATEGORIES) {
      map[cat.id] = getErrorsForTopic(errorLog, cat.id);
    }
    return map;
  }, [errorLog]);

  // Group filtered items by category id
  const itemsByCategoryId = useMemo(() => {
    const map: Record<string, EnrichedCategorizedQuestion[]> = {};
    for (const cat of TOPIC_CATEGORIES) {
      map[cat.id] = [];
    }
    for (const item of filteredPool) {
      if (!map[item.category.id]) map[item.category.id] = [];
      map[item.category.id].push(item);
    }
    return map;
  }, [filteredPool]);

  // Pre-build 20-question sequential practice sets for every topic + completion map
  const setCompletionMap = useMemo(() => getTopicSetCompletionMap(attempts), [attempts]);

  const setsByCategoryId = useMemo(() => {
    const map: Record<string, TopicPracticeSet[]> = {};
    for (const cat of TOPIC_CATEGORIES) {
      const qs = (itemsByCategoryId[cat.id] || []).map((i) => i.question);
      map[cat.id] = buildTopicPracticeSets(cat.id, qs, TOPIC_SET_SIZE);
    }
    return map;
  }, [itemsByCategoryId]);

  const domainCounts = useMemo(() => {
    let quant = 0;
    let verbal = 0;
    let awa = 0;
    for (const item of filteredPool) {
      if (item.category.domain === 'quant') quant++;
      else if (item.category.domain === 'verbal') verbal++;
      else awa++;
    }
    return { quant, verbal, awa, total: filteredPool.length };
  }, [filteredPool]);

  const selectedCategory = useMemo(
    () => TOPIC_CATEGORIES.find((c) => c.id === selectedCategoryId) || null,
    [selectedCategoryId]
  );

  const notesDrawerCategory = useMemo(
    () => TOPIC_CATEGORIES.find((c) => c.id === notesDrawerTopicId) || null,
    [notesDrawerTopicId]
  );

  // Available formats inside selected category
  const availableFormats = useMemo(() => {
    if (!selectedCategory) return [];
    const list = itemsByCategoryId[selectedCategory.id] || [];
    return Array.from(new Set(list.map((i) => i.subType))).sort();
  }, [selectedCategory, itemsByCategoryId]);

  // Filtered questions inside selected Category Explorer
  const explorerItems = useMemo(() => {
    if (!selectedCategory) return [];
    const base = itemsByCategoryId[selectedCategory.id] || [];
    const qLower = explorerSearch.trim().toLowerCase();

    return base.filter((item) => {
      if (explorerFormat !== 'all' && item.subType !== explorerFormat) return false;
      if (explorerPool === 'errors' && !errorIds.has(item.question._id)) return false;
      if (explorerPool === 'bookmarked' && !bookmarkIds.has(item.question._id)) return false;
      if (qLower) {
        const text = stripHtmlToText(
          `${item.question.content || ''} ${item.question.optiontopcontent || ''} ${
            item.question.testTitle || ''
          } ${item.question.monthLabel || ''}`
        ).toLowerCase();
        if (!text.includes(qLower)) return false;
      }
      return true;
    });
  }, [
    selectedCategory,
    itemsByCategoryId,
    explorerFormat,
    explorerPool,
    explorerSearch,
    errorIds,
    bookmarkIds,
  ]);

  const totalPages = Math.max(1, Math.ceil(explorerItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedExplorerItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return explorerItems.slice(start, start + PAGE_SIZE);
  }, [explorerItems, safePage]);

  const launchCategorySession = (
    cat: TopicCategoryDef,
    questionsList: GREQuestion[],
    mode: 'untimed' | 'timed',
    alwaysShowAnswers = false,
    limit?: number,
    customTitle?: string
  ) => {
    if (questionsList.length === 0) return;
    const sliced = limit && limit > 0 ? questionsList.slice(0, limit) : questionsList;
    const minutesPerQ = cat.domain === 'awa' ? 30 : cat.domain === 'quant' ? 1.75 : 1.5;
    const estMinutes = Math.max(10, Math.round(sliced.length * minutesPerQ));

    onStartSession({
      title: customTitle || cat.name,
      subtitle: `${cat.pillar} · ${sliced.length} Qs`,
      monthId: globalMonth === 'all' ? 'topic-bank' : globalMonth,
      monthLabel:
        globalMonth === 'all'
          ? 'All Months'
          : MONTH_CONFIGS.find((m) => m.id === globalMonth)?.label || globalMonth,
      testId: `topic-${cat.id}-${Date.now()}`,
      testTitle: `${customTitle || cat.name} (${sliced.length} Qs)`,
      mode,
      timeLimitMinutes: mode === 'timed' ? estMinutes : 0,
      sectionFilter: cat.id,
      questions: sliced,
      instantFeedbackAllowed: mode === 'untimed',
      alwaysShowAnswers: mode === 'untimed' && alwaysShowAnswers,
    });
  };

  const launchPracticeSet = (
    cat: TopicCategoryDef,
    set: TopicPracticeSet,
    mode: 'untimed' | 'timed',
    alwaysShowAnswers = false
  ) => {
    if (set.questions.length === 0) return;
    onSelectCategoryId(cat.id);
    const minutesPerQ = cat.domain === 'awa' ? 30 : cat.domain === 'quant' ? 1.75 : 1.5;
    const estMinutes = Math.max(10, Math.round(set.questions.length * minutesPerQ));

    onStartSession({
      title: `${cat.name} — Set ${set.setNumber}`,
      subtitle: `${cat.pillar} · Q${set.startIndex}–Q${set.endIndex} (${set.questions.length} Qs)`,
      monthId: globalMonth === 'all' ? 'topic-bank' : globalMonth,
      monthLabel:
        globalMonth === 'all'
          ? 'All Months'
          : MONTH_CONFIGS.find((m) => m.id === globalMonth)?.label || globalMonth,
      testId: set.setId,
      testTitle: `${cat.name} — Set ${set.setNumber} (Q${set.startIndex}–Q${set.endIndex})`,
      mode,
      timeLimitMinutes: mode === 'timed' ? estMinutes : 0,
      sectionFilter: cat.id,
      questions: set.questions,
      instantFeedbackAllowed: mode === 'untimed',
      alwaysShowAnswers: mode === 'untimed' && alwaysShowAnswers,
    });
  };

  const launchSingleQuestionPractice = (q: GREQuestion, title: string) => {
    onStartSession({
      title: `Note Review: ${title}`,
      subtitle: q.monthLabel || 'Saved Question',
      monthId: q.monthId || 'topic-bank',
      monthLabel: q.monthLabel || 'Topic Revision',
      testId: q.testId || `single-${q._id}`,
      testTitle: title,
      mode: 'untimed',
      timeLimitMinutes: 0,
      sectionFilter: 'single',
      questions: [q],
      instantFeedbackAllowed: true,
      alwaysShowAnswers: false,
    });
  };

  const openCategoryExplorer = (
    catId: string,
    initialTab: 'sets' | 'questions' | 'errors' | 'notes' = 'sets'
  ) => {
    onSelectCategoryId(catId);
    setExplorerTab(initialTab);
    setSetStatusFilter('all');
    setExplorerFormat('all');
    setExplorerPool('all');
    setExplorerSearch('');
    setPage(1);
    setExpandedQuestionId(null);
    setInlineNoteQuestionId(null);
  };

  // ===================== SLIDE-OVER SECTION REVISION NOTES DRAWER =====================
  const renderSectionNotesDrawer = () => {
    if (!notesDrawerCategory) return null;
    const drawerNotes = notesByTopicId[notesDrawerCategory.id] || [];

    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-950/55"
        role="dialog"
        aria-modal="true"
        aria-label={`${notesDrawerCategory.name} Revision Notes`}
      >
        <div
          className="flex-1"
          onClick={() => setNotesDrawerTopicId(null)}
          aria-hidden="true"
        />
        <aside className="w-full max-w-2xl h-full bg-[#F7F6F2] dark:bg-[#0E1117] border-l border-[#E4E2DC] dark:border-[#262D38] shadow-2xl flex flex-col">
          {/* Drawer Header — Strictly scoped to this single section */}
          <div className="px-5 py-4 bg-white dark:bg-[#161B22] border-b border-[#E4E2DC] dark:border-[#262D38] shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#1E3A5F] dark:text-blue-400">
                  Section Revision Notes · {notesDrawerCategory.pillar}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug truncate">
                  {notesDrawerCategory.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {notesDrawerCategory.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotesDrawerTopicId(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-[#F3F1EC] dark:hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Close Revision Notes Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5">
            <TopicNotesPanel
              category={notesDrawerCategory}
              topicNotes={drawerNotes}
              onSaveTopicNote={onSaveTopicNote}
              onSaveQuestionNote={onSaveQuestionNote}
              onDeleteNote={onDeleteNote}
              onPracticeQuestion={(q, title) => {
                setNotesDrawerTopicId(null);
                launchSingleQuestionPractice(q, title);
              }}
              compact={true}
            />
          </div>
        </aside>
      </div>
    );
  };

  // ===================== CATEGORY QUESTION EXPLORER VIEW =====================
  if (selectedCategory) {
    const questionsForLaunch = explorerItems.map((i) => i.question);
    const topicSets = setsByCategoryId[selectedCategory.id] || [];
    const completedSetsCount = topicSets.filter((s) => Boolean(setCompletionMap[s.setId])).length;
    const nextUncompletedSet = getNextUncompletedSet(topicSets, setCompletionMap);
    const filteredTopicSets = topicSets.filter((s) => {
      const done = Boolean(setCompletionMap[s.setId]);
      if (setStatusFilter === 'completed') return done;
      if (setStatusFilter === 'remaining') return !done;
      return true;
    });
    const progressPct =
      topicSets.length > 0 ? Math.round((completedSetsCount / topicSets.length) * 100) : 0;

    const topicErrors = errorsByTopicId[selectedCategory.id] || [];
    const topicNotes = notesByTopicId[selectedCategory.id] || [];
    const isRcSingle = selectedCategory.id === 'verbal-rc-single';

    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-7 space-y-6">
        {/* Top Breadcrumb & Launch Header */}
        <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onSelectCategoryId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A5F] dark:text-blue-400 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Topic Syllabus
              </button>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="font-semibold text-[#1E3A5F] dark:text-blue-400">
                  {selectedCategory.domain === 'quant'
                    ? 'Quantitative Reasoning'
                    : selectedCategory.domain === 'verbal'
                    ? 'Verbal Reasoning'
                    : 'Analytical Writing'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedCategory.pillar}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200">
                  {explorerItems.length} Questions · {topicSets.length} Sets of {TOPIC_SET_SIZE}
                </span>
                {completedSetsCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                      {completedSetsCount} / {topicSets.length} Sets Completed
                    </span>
                  </>
                )}
                {isRcSingle && totalRcSingleUnfiltered > RC_SINGLE_LATEST_LIMIT && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Latest {RC_SINGLE_LATEST_LIMIT} of {totalRcSingleUnfiltered} (Sep–Oct 2026)
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {selectedCategory.name}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl">
                {selectedCategory.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!nextUncompletedSet}
                onClick={() =>
                  nextUncompletedSet &&
                  launchPracticeSet(selectedCategory, nextUncompletedSet, 'untimed', false)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#F3F1EC] dark:bg-[#0E1117] hover:bg-[#E7E4DC] dark:hover:bg-slate-800 border border-[#D8D5CC] dark:border-[#2A3240] text-slate-900 dark:text-white disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
                {nextUncompletedSet
                  ? `Start Set ${nextUncompletedSet.setNumber} (${nextUncompletedSet.questions.length} Qs)`
                  : 'Practice Untimed'}
              </button>

              <button
                type="button"
                disabled={!nextUncompletedSet}
                onClick={() =>
                  nextUncompletedSet &&
                  launchPracticeSet(selectedCategory, nextUncompletedSet, 'timed', false)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                <Clock className="w-3.5 h-3.5" />
                {nextUncompletedSet
                  ? `Timed Set ${nextUncompletedSet.setNumber}`
                  : 'Timed Drill'}
              </button>

              <button
                type="button"
                disabled={!nextUncompletedSet}
                onClick={() =>
                  nextUncompletedSet &&
                  launchPracticeSet(selectedCategory, nextUncompletedSet, 'untimed', true)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                <BookOpenCheck className="w-3.5 h-3.5" />
                Study Key
              </button>
            </div>
          </div>

          {/* 4-Tab Sub-Navigation: Practice Sets · All Questions · Topic Error Log · Revision Notes */}
          <div className="pt-4 border-t border-[#E4E2DC] dark:border-[#262D38] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F1EC] dark:bg-[#0E1117] overflow-x-auto">
              {(
                [
                  { id: 'sets', label: `Practice Sets (${topicSets.length})` },
                  { id: 'questions', label: `All Questions (${explorerItems.length})` },
                  { id: 'errors', label: `Topic Error Log (${topicErrors.length})` },
                  { id: 'notes', label: `Revision Notes (${topicNotes.length})` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExplorerTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    explorerTab === t.id
                      ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {explorerTab === 'sets' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {completedSetsCount}/{topicSets.length} Done ({progressPct}%)
                  </span>
                  <div className="w-24 h-1.5 rounded-full bg-[#E4E2DC] dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {explorerTab === 'questions' && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Use <span className="font-semibold text-slate-700 dark:text-slate-300">Note</span> or{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">Log Error</span> on
                any row to build your revision sheet directly.
              </div>
            )}
          </div>

          {/* Explorer Filter Bar (only when Questions tab is active) */}
          {explorerTab === 'questions' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <select
                value={globalMonth}
                onChange={(e) => {
                  setGlobalMonth(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter category by month"
                className="px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
              >
                <option value="all">
                  {isRcSingle ? 'Latest 250 (Sep–Oct)' : 'All 8 Months'}
                </option>
                {MONTH_CONFIGS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={globalDifficulty}
                onChange={(e) => {
                  setGlobalDifficulty(e.target.value as 'all' | 'easy' | 'medium' | 'hard');
                  setPage(1);
                }}
                aria-label="Filter category by difficulty"
                className="px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy (1–2)</option>
                <option value="medium">Medium (3)</option>
                <option value="hard">Hard (4–5)</option>
              </select>

              {availableFormats.length > 1 ? (
                <select
                  value={explorerFormat}
                  onChange={(e) => {
                    setExplorerFormat(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter category by question format"
                  className="px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
                >
                  <option value="all">All Formats</option>
                  {availableFormats.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={explorerPool}
                  onChange={(e) => {
                    setExplorerPool(e.target.value as 'all' | 'errors' | 'bookmarked');
                    setPage(1);
                  }}
                  aria-label="Filter by saved or error status"
                  className="px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
                >
                  <option value="all">All Questions</option>
                  <option value="errors">In Error Log Only</option>
                  <option value="bookmarked">Bookmarked Only</option>
                </select>
              )}

              <select
                value={sessionLength}
                onChange={(e) => setSessionLength(Number(e.target.value))}
                aria-label="Drill session size"
                className="px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white font-mono-tabular"
              >
                <option value={10}>Drill Size: 10 Qs</option>
                <option value={20}>Drill Size: 20 Qs</option>
                <option value={30}>Drill Size: 30 Qs</option>
                <option value={0}>Drill Size: All ({explorerItems.length})</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={explorerSearch}
                  onChange={(e) => {
                    setExplorerSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search keyword in topic..."
                  aria-label="Search questions inside this category"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sub-Tab 0 (Default): 20-Question Practice Sets Grid */}
        {explorerTab === 'sets' && (
          <section className="space-y-4">
            {/* Set Status Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38]">
                {(
                  [
                    { id: 'all', label: `All Sets (${topicSets.length})` },
                    {
                      id: 'remaining',
                      label: `Remaining (${topicSets.length - completedSetsCount})`,
                    },
                    { id: 'completed', label: `Completed (${completedSetsCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSetStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      setStatusFilter === tab.id
                        ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Each set holds up to <span className="font-mono-tabular font-semibold">{TOPIC_SET_SIZE}</span> questions · Finished sets turn green automatically
              </div>
            </div>

            {filteredTopicSets.length === 0 ? (
              <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-10 text-center space-y-2">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {setStatusFilter === 'completed'
                    ? 'No Completed Sets Yet'
                    : setStatusFilter === 'remaining'
                    ? 'All Sets Completed!'
                    : 'No Questions Available in Current Filter'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {setStatusFilter === 'completed'
                    ? 'Finish any 20-question set and submit to mark it green here.'
                    : setStatusFilter === 'remaining'
                    ? 'Great work — every practice set in this chapter is completed.'
                    : 'Try resetting Month or Difficulty filters.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTopicSets.map((set) => {
                  const completion = setCompletionMap[set.setId];
                  const isCompleted = Boolean(completion);
                  const isNextUp =
                    !isCompleted && nextUncompletedSet?.setId === set.setId;

                  let easy = 0;
                  let med = 0;
                  let hard = 0;
                  for (const q of set.questions) {
                    const d = q.difficulty || 3;
                    if (d <= 2) easy++;
                    else if (d === 3) med++;
                    else hard++;
                  }

                  return (
                    <article
                      key={set.setId}
                      data-set-number={set.setNumber}
                      data-completed={isCompleted ? 'true' : 'false'}
                      className={`rounded-xl p-5 flex flex-col justify-between gap-4 border transition-colors ${
                        isCompleted
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/35 border-emerald-500/75 dark:border-emerald-500/55'
                          : isNextUp
                          ? 'bg-white dark:bg-[#161B22] border-[#1E3A5F]/65 dark:border-blue-500/65'
                          : 'bg-white dark:bg-[#161B22] border-[#E4E2DC] dark:border-[#262D38] hover:border-[#1E3A5F]/45 dark:hover:border-blue-500/45'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span
                            className={`font-semibold inline-flex items-center gap-1.5 ${
                              isCompleted
                                ? 'text-emerald-800 dark:text-emerald-300'
                                : isNextUp
                                ? 'text-[#1E3A5F] dark:text-blue-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Completed
                              </>
                            ) : isNextUp ? (
                              'Next Up'
                            ) : (
                              `Practice Set`
                            )}
                          </span>

                          <span className="font-mono-tabular font-bold text-slate-800 dark:text-slate-200">
                            {set.questions.length} Qs
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <h3
                            className={`text-lg font-bold tracking-tight ${
                              isCompleted
                                ? 'text-emerald-950 dark:text-emerald-100'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            Set {set.setNumber}
                          </h3>
                          <span className="text-xs font-mono-tabular text-slate-600 dark:text-slate-400">
                            Q{set.startIndex} – Q{set.endIndex}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-tabular text-slate-600 dark:text-slate-400">
                          <span>Easy {easy}</span>
                          <span aria-hidden="true">·</span>
                          <span>Med {med}</span>
                          <span aria-hidden="true">·</span>
                          <span>Hard {hard}</span>
                        </div>

                        {completion && (
                          <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between text-xs">
                            <span className="font-mono-tabular font-bold text-emerald-800 dark:text-emerald-300">
                              Best: {completion.bestAccuracy}% ({completion.completedCount}x)
                            </span>
                            <button
                              type="button"
                              onClick={() => onInspectAttempt(completion.lastAttempt)}
                              className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 hover:underline font-semibold"
                            >
                              <RotateCcw className="w-3 h-3" /> Review Last
                            </button>
                          </div>
                        )}
                      </div>

                      <div
                        className={`pt-3.5 border-t flex items-center gap-1.5 ${
                          isCompleted
                            ? 'border-emerald-500/30'
                            : 'border-[#E4E2DC] dark:border-[#262D38]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            launchPracticeSet(selectedCategory, set, 'untimed', false)
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                            isCompleted
                              ? 'bg-white/90 dark:bg-[#0E1117]/80 hover:bg-white border-emerald-600/35 text-emerald-900 dark:text-emerald-200'
                              : 'bg-[#F3F1EC] dark:bg-[#0E1117] hover:bg-[#E7E4DC] dark:hover:bg-slate-800 border-[#D8D5CC] dark:border-[#2A3240] text-slate-900 dark:text-white'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          {isCompleted ? 'Redo' : 'Untimed'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            launchPracticeSet(selectedCategory, set, 'timed', false)
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            isCompleted
                              ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                              : 'bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          Timed
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            launchPracticeSet(selectedCategory, set, 'untimed', true)
                          }
                          className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-600/35 text-emerald-800 dark:text-emerald-300 transition-colors shrink-0"
                          title={`Study Set ${set.setNumber} with Official Answer Keys`}
                          aria-label={`Study Answer Key for Set ${set.setNumber}`}
                        >
                          <BookOpenCheck className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Sub-Tab 2: Topic Error Log */}
        {explorerTab === 'errors' && (
          <section className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5 lg:p-6">
            <TopicErrorLogPanel
              category={selectedCategory}
              entries={topicErrors}
              onUpdateEntry={onUpdateErrorEntry}
              onRemoveEntry={onRemoveErrorEntry}
              onPracticeErrors={(qs, mode, title) =>
                launchCategorySession(selectedCategory, qs, mode, false, qs.length, title)
              }
            />
          </section>
        )}

        {/* Sub-Tab 3: Topic Revision Notes */}
        {explorerTab === 'notes' && (
          <section className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5 lg:p-6">
            <TopicNotesPanel
              category={selectedCategory}
              topicNotes={topicNotes}
              onSaveTopicNote={onSaveTopicNote}
              onSaveQuestionNote={onSaveQuestionNote}
              onDeleteNote={onDeleteNote}
              onPracticeQuestion={launchSingleQuestionPractice}
            />
          </section>
        )}

        {/* Sub-Tab 1: Paginated Question List */}
        {explorerTab === 'questions' &&
          (explorerItems.length === 0 ? (
            <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-12 text-center space-y-2">
              <div className="text-base font-bold text-slate-900 dark:text-white">
                No Questions Match Current Filters
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try resetting Month, Difficulty, or Format filters above.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E4E2DC] dark:border-[#262D38] flex flex-wrap items-center justify-between gap-3 bg-[#FAF9F6] dark:bg-[#0E1117]/60">
                <div className="text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, explorerItems.length)} of {explorerItems.length}{' '}
                  questions
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer mr-2">
                    <input
                      type="checkbox"
                      checked={deduplicate}
                      onChange={(e) => {
                        setDeduplicate(e.target.checked);
                        setPage(1);
                      }}
                      className="w-3.5 h-3.5 accent-[#1E3A5F] rounded"
                    />
                    Hide repeated across months
                  </label>

                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-md border border-[#D8D5CC] dark:border-[#2A3240] bg-white dark:bg-[#161B22] text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono-tabular text-slate-700 dark:text-slate-300 px-1">
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-md border border-[#D8D5CC] dark:border-[#2A3240] bg-white dark:bg-[#161B22] text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[#E4E2DC] dark:divide-[#262D38]">
                {paginatedExplorerItems.map((item, idx) => {
                  const globalNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                  const q = item.question;
                  const isExpanded = expandedQuestionId === q._id;
                  const existingNote = notesByQuestionId[q._id];
                  const isErrorLogged = errorIds.has(q._id);
                  const isEditingInlineNote = inlineNoteQuestionId === q._id;
                  const previewText = stripHtmlToText(
                    q.optiontopcontent ||
                      q.content ||
                      (q.blanks?.[0]
                        ? `Quantity A: ${q.blanks[0].quantityA || ''} vs Quantity B: ${
                            q.blanks[0].quantityB || ''
                          }`
                        : '')
                  );

                  return (
                    <div key={`${q.monthId}-${q._id}-${globalNum}`} className="p-4 lg:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-[260px] space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono-tabular font-bold text-[#1E3A5F] dark:text-blue-400">
                              #{globalNum}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {q.monthLabel} · {q.testTitle}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.subType}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">Diff {q.difficulty || 3}/5</span>
                            {isErrorLogged && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-rose-700 dark:text-rose-400">
                                  In Error Log
                                </span>
                              </>
                            )}
                            {existingNote && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  Note Saved
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">
                            {previewText || '[Diagram / Visual Question — click Preview to inspect]'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingInlineNote) {
                                setInlineNoteQuestionId(null);
                              } else {
                                setInlineNoteQuestionId(q._id);
                                setInlineNoteDraft(existingNote?.content || '');
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                              existingNote || isEditingInlineNote
                                ? 'border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                                : 'border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 hover:bg-[#EFECE4] dark:hover:bg-slate-800'
                            }`}
                          >
                            <NotebookPen className="w-3.5 h-3.5" />
                            {existingNote ? 'Edit Note' : 'Note'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isErrorLogged) {
                                setExplorerTab('errors');
                              } else {
                                onUpdateErrorEntry({
                                  question: q,
                                  monthId: q.monthId || 'topic-bank',
                                  monthLabel: q.monthLabel || selectedCategory.name,
                                  testId: q.testId || selectedCategory.id,
                                  testTitle: q.testTitle || selectedCategory.name,
                                  category: 'Conceptual Gap',
                                  status: 'needs_review',
                                });
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                              isErrorLogged
                                ? 'border-rose-600/40 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                                : 'border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 hover:bg-[#EFECE4] dark:hover:bg-slate-800'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {isErrorLogged ? 'Logged' : 'Log Error'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedQuestionId(isExpanded ? null : q._id)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] hover:bg-[#EFECE4] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors whitespace-nowrap"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" /> Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" /> Preview
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              launchCategorySession(
                                selectedCategory,
                                questionsForLaunch.slice((safePage - 1) * PAGE_SIZE + idx),
                                'untimed',
                                false,
                                20
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors whitespace-nowrap"
                          >
                            <Play className="w-3 h-3" />
                            Practice
                          </button>
                        </div>
                      </div>

                      {/* Inline Quick Question Note Editor */}
                      {isEditingInlineNote && (
                        <div className="mt-3 p-3.5 rounded-lg bg-[#FAF9F6] dark:bg-[#0E1117] border border-[#D8D5CC] dark:border-[#2A3240] space-y-2.5">
                          <div className="text-[11px] font-semibold text-[#1E3A5F] dark:text-blue-400">
                            Question Note (auto-synced to {selectedCategory.name} Revision Notes)
                          </div>
                          <textarea
                            value={inlineNoteDraft}
                            onChange={(e) => setInlineNoteDraft(e.target.value)}
                            rows={3}
                            placeholder="Write your shortcut, formula, or mistake takeaway for this math question..."
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-white dark:bg-[#161B22] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setInlineNoteQuestionId(null)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-[#EFECE4] dark:hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={!inlineNoteDraft.trim()}
                              onClick={() => {
                                onSaveQuestionNote({
                                  question: q,
                                  monthId: q.monthId,
                                  monthLabel: q.monthLabel,
                                  testTitle: q.testTitle,
                                  content: inlineNoteDraft.trim(),
                                  tags: existingNote?.tags || ['Must Review'],
                                });
                                setInlineNoteQuestionId(null);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40"
                            >
                              <Save className="w-3.5 h-3.5" /> Save to Section Notes
                            </button>
                          </div>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[#E4E2DC] dark:border-[#262D38] space-y-3">
                          <QuestionRenderer
                            question={q}
                            answer={undefined}
                            onChangeAnswer={() => {}}
                            showSolution={true}
                            readOnly={true}
                          />
                          <div className="px-4 py-3 rounded-lg bg-emerald-50/85 dark:bg-emerald-950/35 border border-emerald-600/50 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">
                              Verified Official Answer:
                            </span>
                            <RichAnswerSummary question={q} variant="correct" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </main>
    );
  }

  // ===================== MAIN TOPIC BANK SYLLABUS OVERVIEW =====================
  const renderCategoryCardsForPillar = (pillar: string, domain: TopicDomain) => {
    const cats = TOPIC_CATEGORIES.filter((c) => c.domain === domain && c.pillar === pillar);
    const pillarTotal = cats.reduce(
      (sum, c) => sum + (itemsByCategoryId[c.id]?.length || 0),
      0
    );

    return (
      <section key={pillar} className="space-y-3.5">
        <div className="flex items-baseline justify-between border-b border-[#E4E2DC] dark:border-[#262D38] pb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            {pillar}
          </h2>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {pillarTotal.toLocaleString()} questions across {cats.length}{' '}
            {cats.length === 1 ? 'topic' : 'topics'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map((cat) => {
            const items = itemsByCategoryId[cat.id] || [];
            const questions = items.map((i) => i.question);
            const topicSets = setsByCategoryId[cat.id] || [];
            const completedSetsCount = topicSets.filter((s) =>
              Boolean(setCompletionMap[s.setId])
            ).length;
            const nextSet = getNextUncompletedSet(topicSets, setCompletionMap);

            let easy = 0;
            let med = 0;
            let hard = 0;

            for (const q of questions) {
              const d = q.difficulty || 3;
              if (d <= 2) easy++;
              else if (d === 3) med++;
              else hard++;
            }

            const topicNotes = notesByTopicId[cat.id] || [];
            const topicErrors = errorsByTopicId[cat.id] || [];
            const mastery = masteryByCategory[cat.id];
            const masteryPct =
              mastery && mastery.answered > 0
                ? Math.round((mastery.correct / mastery.answered) * 100)
                : null;
            const isRcSingle = cat.id === 'verbal-rc-single';
            const allSetsDone = topicSets.length > 0 && completedSetsCount === topicSets.length;

            return (
              <article
                key={cat.id}
                className={`rounded-xl p-5 flex flex-col justify-between gap-4 border transition-colors ${
                  allSetsDone
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-500/65'
                    : 'bg-white dark:bg-[#161B22] border-[#E4E2DC] dark:border-[#262D38] hover:border-[#1E3A5F]/50 dark:hover:border-blue-500/50'
                }`}
              >
                <div className="space-y-2">
                  {/* Top Row: Pillar + Question Count + Direct Section Notes Button */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#1E3A5F] dark:text-blue-400 truncate">
                      {cat.pillar}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                        {questions.length} Qs
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotesDrawerTopicId(cat.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                          topicNotes.length > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600/35 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                            : 'bg-[#F7F6F2] dark:bg-[#0E1117] border-[#D8D5CC] dark:border-[#2A3240] text-slate-700 dark:text-slate-300 hover:bg-[#ECE9E0] dark:hover:bg-slate-800'
                        }`}
                        title={`View & revise all ${cat.name} notes together`}
                      >
                        <NotebookPen className="w-3 h-3" />
                        Notes ({topicNotes.length})
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    <button
                      type="button"
                      onClick={() => openCategoryExplorer(cat.id, 'sets')}
                      className="text-left hover:text-[#1E3A5F] dark:hover:text-blue-400 transition-colors"
                    >
                      {cat.name}
                    </button>
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cat.description}
                  </p>

                  {isRcSingle && totalRcSingleUnfiltered > RC_SINGLE_LATEST_LIMIT && (
                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono-tabular">
                      Latest {RC_SINGLE_LATEST_LIMIT} of {totalRcSingleUnfiltered} (Sep–Oct 2026)
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 pt-1">
                    <span
                      className={
                        completedSetsCount > 0
                          ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 font-semibold'
                      }
                    >
                      {completedSetsCount > 0
                        ? `${completedSetsCount}/${topicSets.length} Sets Done`
                        : `${topicSets.length} Sets`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Easy {easy}</span>
                    <span aria-hidden="true">·</span>
                    <span>Med {med}</span>
                    <span aria-hidden="true">·</span>
                    <span>Hard {hard}</span>
                    {masteryPct !== null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Acc {masteryPct}%
                        </span>
                      </>
                    )}
                    {topicErrors.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => openCategoryExplorer(cat.id, 'errors')}
                          className="text-rose-700 dark:text-rose-400 font-semibold hover:underline"
                        >
                          {topicErrors.length} {topicErrors.length === 1 ? 'Error' : 'Errors'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-3.5 border-t border-[#E4E2DC] dark:border-[#262D38] flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={questions.length === 0}
                    onClick={() => openCategoryExplorer(cat.id, 'sets')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold bg-[#F3F1EC] dark:bg-[#0E1117] hover:bg-[#E7E4DC] dark:hover:bg-slate-800 border border-[#D8D5CC] dark:border-[#2A3240] text-slate-900 dark:text-white disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
                    Sets ({topicSets.length})
                  </button>

                  <button
                    type="button"
                    disabled={!nextSet}
                    onClick={() =>
                      nextSet && launchPracticeSet(cat, nextSet, 'untimed', false)
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#161B22] hover:bg-[#F7F6F2] dark:hover:bg-slate-800 border border-[#D8D5CC] dark:border-[#2A3240] text-slate-800 dark:text-slate-200 disabled:opacity-40 transition-colors whitespace-nowrap"
                    title={
                      nextSet
                        ? `Start Set ${nextSet.setNumber} (Q${nextSet.startIndex}–Q${nextSet.endIndex}) Untimed`
                        : undefined
                    }
                  >
                    <Play className="w-3 h-3 text-[#1E3A5F] dark:text-blue-400" />
                    {nextSet ? `Set ${nextSet.setNumber}` : 'Drill'}
                  </button>

                  <button
                    type="button"
                    disabled={!nextSet}
                    onClick={() =>
                      nextSet && launchPracticeSet(cat, nextSet, 'timed', false)
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white disabled:opacity-40 transition-colors whitespace-nowrap"
                    title={
                      nextSet
                        ? `Start Set ${nextSet.setNumber} (Q${nextSet.startIndex}–Q${nextSet.endIndex}) Timed`
                        : undefined
                    }
                  >
                    <Clock className="w-3 h-3" />
                    Timed
                  </button>

                  <button
                    type="button"
                    disabled={!nextSet}
                    onClick={() =>
                      nextSet && launchPracticeSet(cat, nextSet, 'untimed', true)
                    }
                    className="inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-600/30 text-emerald-800 dark:text-emerald-300 disabled:opacity-40 transition-colors shrink-0"
                    title={
                      nextSet
                        ? `Study Set ${nextSet.setNumber} with Official Answer Keys Visible`
                        : `Study ${cat.name}`
                    }
                    aria-label={`Study Answer Key for ${cat.name}`}
                  >
                    <BookOpenCheck className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  // ===================== TOPIC-WISE ERROR LOG OVERVIEW TAB =====================
  const renderTopicErrorOverview = () => {
    const topicsWithErrors = TOPIC_CATEGORIES.map((cat) => ({
      cat,
      entries: errorsByTopicId[cat.id] || [],
    })).filter((g) => g.entries.length > 0);

    if (topicsWithErrors.length === 0) {
      return (
        <section className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-12 text-center space-y-2.5">
          <div className="text-base font-bold text-slate-900 dark:text-white">
            No Topic Errors Logged Yet
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Whenever you miss a question in any Mock Test or Topic Drill—or manually click “Log Error” while browsing a Quant/Verbal topic—it will automatically organize here by exact chapter for targeted revision.
          </p>
        </section>
      );
    }

    return (
      <div className="space-y-6">
        {topicsWithErrors.map(({ cat, entries }) => {
          const activeErrors = entries.filter((e) => e.status !== 'mastered').length;
          return (
            <section
              key={cat.id}
              className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5 lg:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E4E2DC] dark:border-[#262D38]">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#1E3A5F] dark:text-blue-400">
                    {cat.domain === 'quant' ? 'Quant' : cat.domain === 'verbal' ? 'Verbal' : 'AWA'} ·{' '}
                    {cat.pillar}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {cat.name}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono-tabular text-rose-700 dark:text-rose-400 font-semibold">
                    {activeErrors} active / {entries.length} logged
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotesDrawerTopicId(cat.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-800 dark:text-slate-200 hover:bg-[#EFECE4] dark:hover:bg-slate-800"
                  >
                    <NotebookPen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    Section Notes ({(notesByTopicId[cat.id] || []).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => openCategoryExplorer(cat.id, 'errors')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1E3A5F] dark:text-blue-400 hover:underline"
                  >
                    Open Full Topic
                  </button>
                </div>
              </div>

              <TopicErrorLogPanel
                category={cat}
                entries={entries}
                onUpdateEntry={onUpdateErrorEntry}
                onRemoveEntry={onRemoveErrorEntry}
                onPracticeErrors={(qs, mode, title) =>
                  launchCategorySession(cat, qs, mode, false, qs.length, title)
                }
              />
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-7">
      {/* Slide-Over Section Revision Notes Drawer */}
      {renderSectionNotesDrawer()}

      {/* Header & Coverage Proof */}
      <section className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-[#1E3A5F] dark:text-blue-400">
              Complete GRE Syllabus · 16 Quant Chapters · 8 Verbal Sub-Types · Section Notes &amp; Error Log
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
              GRE Topic Bank &amp; Concept Mastery
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Drill every Quant math chapter and Verbal question type, track mistakes per topic, and revise all your practice question notes and chapter formulas together right beside each section.
            </p>
          </div>

          <div className="text-left sm:text-right font-mono-tabular shrink-0">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {domainCounts.total.toLocaleString()}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {' '}
                / {canonicalBank.length.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              Latest {RC_SINGLE_LATEST_LIMIT} RC MCQ · {notes.length} Notes · {errorLog.length} Errors
            </div>
          </div>
        </div>

        {/* Domain Segmented Switcher + Global Filters */}
        <div className="pt-4 border-t border-[#E4E2DC] dark:border-[#262D38] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F1EC] dark:bg-[#0E1117] overflow-x-auto">
            {(
              [
                { id: 'quant', label: `Quant Topics (${domainCounts.quant.toLocaleString()})` },
                { id: 'verbal', label: `Verbal Types (${domainCounts.verbal.toLocaleString()})` },
                { id: 'awa', label: `AWA Essays (${domainCounts.awa})` },
                { id: 'errors', label: `Topic Error Log (${errorLog.length})` },
                { id: 'custom', label: 'Custom Drill Builder' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDomain(tab.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeDomain === tab.id
                    ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeDomain !== 'custom' && activeDomain !== 'errors' && (
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={globalMonth}
                onChange={(e) => setGlobalMonth(e.target.value)}
                aria-label="Filter syllabus by month"
                className="px-3 py-1.5 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
              >
                <option value="all">All 8 Months</option>
                {MONTH_CONFIGS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={globalDifficulty}
                onChange={(e) =>
                  setGlobalDifficulty(e.target.value as 'all' | 'easy' | 'medium' | 'hard')
                }
                aria-label="Filter syllabus by difficulty"
                className="px-3 py-1.5 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy (1–2)</option>
                <option value="medium">Medium (3)</option>
                <option value="hard">Hard (4–5)</option>
              </select>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none pl-1">
                <input
                  type="checkbox"
                  checked={deduplicate}
                  onChange={(e) => setDeduplicate(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#1E3A5F] rounded"
                />
                Unique only
              </label>
            </div>
          )}
        </div>
      </section>

      {/* Active Domain Syllabus Content */}
      {activeDomain === 'quant' && (
        <div className="space-y-8">
          {QUANT_PILLARS.map((pillar) => renderCategoryCardsForPillar(pillar, 'quant'))}
        </div>
      )}

      {activeDomain === 'verbal' && (
        <div className="space-y-8">
          {VERBAL_PILLARS.map((pillar) => renderCategoryCardsForPillar(pillar, 'verbal'))}
        </div>
      )}

      {activeDomain === 'awa' && (
        <div className="space-y-8">
          {renderCategoryCardsForPillar('Analytical Writing Assessment', 'awa')}
        </div>
      )}

      {activeDomain === 'errors' && renderTopicErrorOverview()}

      {activeDomain === 'custom' && (
        <CustomDrillView
          allTestsByMonth={allTestsByMonth}
          bookmarks={bookmarks}
          errorLog={errorLog}
          attempts={attempts}
          activeSubTab="drill"
          onStartSession={onStartSession}
          onInspectAttempt={onInspectAttempt}
          onExportBackup={onExportBackup}
          onImportBackup={onImportBackup}
          onImportCustomMonthFile={onImportCustomMonthFile}
        />
      )}
    </main>
  );
};
