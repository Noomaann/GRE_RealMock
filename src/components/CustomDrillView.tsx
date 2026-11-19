import React, { useMemo, useState } from 'react';
import {
  ErrorLogEntry,
  GREQuestion,
  GRETest,
  PracticeSessionConfig,
  TestAttempt,
} from '../types/gre';
import {
  classifyQuestionSubType,
  MONTH_CONFIGS,
} from '../utils/greLogic';
import {
  Play,
  Clock,
  SlidersHorizontal,
  Download,
  Upload,
  FolderPlus,
  History,
  Eye,
  Check,
} from 'lucide-react';

interface CustomDrillViewProps {
  allTestsByMonth: Record<string, GRETest[]>;
  bookmarks: string[];
  errorLog: ErrorLogEntry[];
  attempts: TestAttempt[];
  activeSubTab: 'drill' | 'history';
  onStartSession: (config: PracticeSessionConfig) => void;
  onInspectAttempt: (attempt: TestAttempt) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonText: string) => void;
  onImportCustomMonthFile: (monthId: string, tests: GRETest[]) => void;
}

const QUESTION_SUBTYPES = [
  'All Question Types',
  'Text Completion (1-Blank)',
  'Text Completion (2-Blank)',
  'Text Completion (3-Blank)',
  'Sentence Equivalence',
  'Reading Comprehension',
  'Reading Comp (Multiple Answer)',
  'Reading Comp (Select-in-Passage)',
  'Quantitative Comparison',
  'Problem Solving (Single Answer)',
  'Problem Solving (Multiple Answer)',
  'Numeric Entry',
  'Numeric Entry (Fraction)',
  'Data Interpretation',
] as const;

export const CustomDrillView: React.FC<CustomDrillViewProps> = ({
  allTestsByMonth,
  bookmarks,
  errorLog,
  attempts,
  activeSubTab,
  onStartSession,
  onInspectAttempt,
  onExportBackup,
  onImportBackup,
  onImportCustomMonthFile,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<'all' | 'verbal' | 'quant'>('all');
  const [selectedSubType, setSelectedSubType] = useState<string>('All Question Types');
  const [difficultyRange, setDifficultyRange] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [poolSource, setPoolSource] = useState<'all' | 'bookmarked' | 'errors'>('all');
  const [questionLimit, setQuestionLimit] = useState<number>(20);
  const [mode, setMode] = useState<'untimed' | 'timed'>('untimed');
  const [importStatus, setImportStatus] = useState<string>('');
  const [targetImportMonth, setTargetImportMonth] = useState<string>('2026-10');

  const allQuestionsPool = useMemo(() => {
    const list: GREQuestion[] = [];
    for (const [mId, tests] of Object.entries(allTestsByMonth)) {
      const mConfig = MONTH_CONFIGS.find((m) => m.id === mId);
      for (const t of tests) {
        t.questions.forEach((q, idx) => {
          list.push({
            ...q,
            monthId: mId,
            monthLabel: mConfig?.label || mId,
            testId: t._id,
            testTitle: t.title,
            questionIndex: idx,
          });
        });
      }
    }
    return list;
  }, [allTestsByMonth]);

  const matchingQuestions = useMemo(() => {
    const errorIds = new Set(errorLog.map((e) => e.id));
    const bookmarkIds = new Set(bookmarks);

    return allQuestionsPool.filter((q) => {
      if (q.section === 'awa' || q.type === 'sidebyside') return false;
      if (selectedMonth !== 'all' && q.monthId !== selectedMonth) return false;
      if (selectedSection === 'verbal' && !q.section.startsWith('verbal')) return false;
      if (selectedSection === 'quant' && !q.section.startsWith('quant')) return false;
      if (selectedSubType !== 'All Question Types' && classifyQuestionSubType(q) !== selectedSubType) {
        return false;
      }
      const d = q.difficulty || 3;
      if (difficultyRange === 'easy' && d > 2) return false;
      if (difficultyRange === 'medium' && d !== 3) return false;
      if (difficultyRange === 'hard' && d < 4) return false;

      if (poolSource === 'bookmarked' && !bookmarkIds.has(q._id)) return false;
      if (poolSource === 'errors' && !errorIds.has(q._id)) return false;

      return true;
    });
  }, [
    allQuestionsPool,
    selectedMonth,
    selectedSection,
    selectedSubType,
    difficultyRange,
    poolSource,
    bookmarks,
    errorLog,
  ]);

  const handleLaunchDrill = (launchMode: 'untimed' | 'timed') => {
    if (matchingQuestions.length === 0) return;
    setMode(launchMode);
    const sliced = matchingQuestions.slice(0, questionLimit);
    const estMinutes = Math.max(10, Math.round(sliced.length * 1.55));

    onStartSession({
      title:
        selectedSubType !== 'All Question Types'
          ? `${launchMode === 'timed' ? 'Timed' : 'Untimed'} Drill: ${selectedSubType}`
          : `${launchMode === 'timed' ? 'Timed' : 'Untimed'} ${
              selectedSection === 'all' ? 'GRE' : selectedSection.toUpperCase()
            } Drill`,
      subtitle: `${sliced.length} Questions`,
      monthId: selectedMonth === 'all' ? 'custom' : selectedMonth,
      monthLabel:
        selectedMonth === 'all'
          ? 'All Months Combined'
          : MONTH_CONFIGS.find((m) => m.id === selectedMonth)?.label || selectedMonth,
      testId: `drill-${launchMode}-${Date.now()}`,
      testTitle:
        selectedSubType !== 'All Question Types'
          ? `${selectedSubType} Drill (${sliced.length} Qs)`
          : `Custom Practice Drill (${sliced.length} Qs)`,
      mode: launchMode,
      timeLimitMinutes: launchMode === 'timed' ? estMinutes : 0,
      sectionFilter: selectedSection,
      questions: sliced,
      instantFeedbackAllowed: launchMode === 'untimed',
    });
  };

  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImportBackup(String(reader.result || ''));
        setImportStatus('Backup restored successfully!');
        setTimeout(() => setImportStatus(''), 3000);
      } catch {
        setImportStatus('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleMonthTestsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (Array.isArray(parsed)) {
          onImportCustomMonthFile(targetImportMonth, parsed);
          setImportStatus(`Loaded ${parsed.length} tests into ${targetImportMonth}!`);
          setTimeout(() => setImportStatus(''), 3000);
        } else {
          setImportStatus('File must be a valid _all-tests.json array.');
        }
      } catch {
        setImportStatus('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  if (activeSubTab === 'history') {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Test Attempt History &amp; Local PC Data Manager
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review past Timed and Untimed mock test sessions, export backups of your Error Log and Study Notes, or load additional JSON files from your PC.
          </p>
        </div>

        {/* Local PC Backup & JSON Importer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Backup &amp; Restore Study Progress (Error Log, Notes &amp; Scores)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Save a complete copy of your Error Log, Study Notes, Bookmarks, and Test Attempts to your computer so you never lose your work.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Progress Backup (.json)
              </button>

              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Restore Backup File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleBackupFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Load Additional Local `_all-tests.json` File
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              All 8 months (March–October 2026, 78 Mock Tests) are already pre-loaded. If you download new `_all-tests.json` files to your PC, import them here.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <select
                value={targetImportMonth}
                onChange={(e) => setTargetImportMonth(e.target.value)}
                aria-label="Target Month for JSON Import"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {MONTH_CONFIGS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors">
                <FolderPlus className="w-3.5 h-3.5" />
                Select `_all-tests.json` from PC
                <input
                  type="file"
                  accept=".json"
                  onChange={handleMonthTestsUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {importStatus && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {importStatus}
          </div>
        )}

        {/* Attempt History Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-sky-600" />
              Completed Test &amp; Practice Sessions ({attempts.length})
            </h2>
          </div>

          {attempts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No completed test attempts yet. Start any Timed or Untimed mock test to track your history here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
                    <th className="py-3 px-5 font-semibold">Test Title</th>
                    <th className="py-3 px-4 font-semibold">Month</th>
                    <th className="py-3 px-4 font-semibold">Mode</th>
                    <th className="py-3 px-4 font-semibold text-right">Score</th>
                    <th className="py-3 px-4 font-semibold text-right">Accuracy</th>
                    <th className="py-3 px-4 font-semibold text-right">Date</th>
                    <th className="py-3 px-5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {attempts.map((att) => (
                    <tr
                      key={att.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-5 font-semibold text-slate-900 dark:text-white">
                        {att.testTitle}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {att.monthLabel}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {att.mode === 'timed' ? 'Timed Exam' : 'Untimed'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-800 dark:text-slate-200">
                        {att.correctCount} / {att.GradableQuestions}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-bold text-slate-900 dark:text-white">
                        {att.accuracyPercent}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-500">
                        {new Date(att.completedAt || att.startedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => onInspectAttempt(att)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-md font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Custom Topic, Question Type &amp; Difficulty Drill Builder
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Build targeted Timed or Untimed practice sets across all 4,291 GRE questions by specific question type (TC, SE, RC, QC, Numeric, DI), difficulty level, or saved bookmarks.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Month Source */}
          <div>
            <label
              htmlFor="drill-month-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              1. Month Pool
            </label>
            <select
              id="drill-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="all">All 8 Months (March – October 2026)</option>
              {MONTH_CONFIGS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label
              htmlFor="drill-section-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              2. GRE Section
            </label>
            <select
              id="drill-section-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value as 'all' | 'verbal' | 'quant')}
              className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              <option value="all">Both Verbal &amp; Quantitative</option>
              <option value="verbal">Verbal Reasoning Only</option>
              <option value="quant">Quantitative Reasoning Only</option>
            </select>
          </div>

          {/* Specific Question SubType */}
          <div>
            <label
              htmlFor="drill-subtype-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              3. Question Format
            </label>
            <select
              id="drill-subtype-select"
              value={selectedSubType}
              onChange={(e) => setSelectedSubType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {QUESTION_SUBTYPES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Difficulty */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              4. Difficulty Tier
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'easy', label: 'Easy (1-2)' },
                  { id: 'medium', label: 'Med (3)' },
                  { id: 'hard', label: 'Hard (4-5)' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficultyRange(d.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    difficultyRange === d.id
                      ? 'bg-slate-900 dark:bg-sky-600 text-white border-slate-900 dark:border-sky-500'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pool Filter */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              5. Question Pool Filter
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Qs' },
                  { id: 'bookmarked', label: `Saved (${bookmarks.length})` },
                  { id: 'errors', label: `Errors (${errorLog.length})` },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPoolSource(p.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    poolSource === p.id
                      ? 'bg-slate-900 dark:bg-sky-600 text-white border-slate-900 dark:border-sky-500'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Questions */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              6. Session Length
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 20, 27, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionLimit(num)}
                  className={`py-2 px-2 rounded-lg text-xs font-mono-tabular font-semibold border transition-colors ${
                    questionLimit === num
                      ? 'bg-slate-900 dark:bg-sky-600 text-white border-slate-900 dark:border-sky-500'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {num} Qs
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary & Launch */}
        <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-5 h-5 text-sky-600" />
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono-tabular">
                {matchingQuestions.length} matching GRE questions available
              </div>
              <div className="text-xs text-slate-500">
                Will launch {Math.min(questionLimit, matchingQuestions.length)} questions
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={matchingQuestions.length === 0}
              onClick={() => handleLaunchDrill('untimed')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#F3F1EC] dark:bg-slate-800 hover:bg-[#E7E4DC] dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-[#D8D5CC] dark:border-slate-700 disabled:opacity-40 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-blue-400" />
              Start Untimed Drill
            </button>

            <button
              type="button"
              disabled={matchingQuestions.length === 0}
              onClick={() => handleLaunchDrill('timed')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white disabled:opacity-40 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Start Timed Drill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
