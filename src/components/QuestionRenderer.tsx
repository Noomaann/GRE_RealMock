import React from 'react';
import { GREQuestion, UserAnswer } from '../types/gre';
import {
  classifyQuestionSubType,
  evaluateQuestionAnswer,
  getNumericAffixes,
  getOptionLetter,
  isFractionQuestion,
  isNumericQuestion,
  stripHtmlToText,
} from '../utils/greLogic';
import { RichHtml } from './RichHtml';
import { RichAnswerSummary } from './RichAnswerSummary';
import { Check, X, EyeOff, Eye } from 'lucide-react';

interface QuestionRendererProps {
  question: GREQuestion;
  answer: UserAnswer | undefined;
  onChangeAnswer: (next: UserAnswer) => void;
  showSolution?: boolean;
  readOnly?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  answer,
  onChangeAnswer,
  showSolution = false,
  readOnly = false,
}) => {
  const currentAns: UserAnswer = answer || { questionId: question._id };
  const subType = classifyQuestionSubType(question);
  const evaluation = evaluateQuestionAnswer(question, currentAns);

  // Toggle option selection (single vs multiple)
  const handleSelectOption = (idx: number) => {
    if (readOnly) return;
    const prev = currentAns.selectedIndices || [];
    let next: number[];
    if (question.singleormultiple) {
      if (prev.includes(idx)) {
        next = prev.filter((i) => i !== idx);
      } else {
        next = [...prev, idx];
      }
    } else {
      next = prev.includes(idx) ? [] : [idx];
    }
    onChangeAnswer({
      ...currentAns,
      selectedIndices: next,
    });
  };

  // Toggle option cross-out / elimination
  const handleToggleEliminate = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    const prev = currentAns.eliminatedIndices || [];
    const next = prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx];
    onChangeAnswer({
      ...currentAns,
      eliminatedIndices: next,
    });
  };

  // Select blank option for fill-blank
  const handleSelectBlank = (blankIdx: number, optIdx: number) => {
    if (readOnly) return;
    const prev = currentAns.blankSelections || {};
    const next = { ...prev };
    if (next[blankIdx] === optIdx) {
      delete next[blankIdx];
    } else {
      next[blankIdx] = optIdx;
    }
    onChangeAnswer({
      ...currentAns,
      blankSelections: next,
    });
  };

  // Toggle blank option elimination
  const handleToggleBlankEliminate = (blankIdx: number, optIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    const prevMap = currentAns.eliminatedBlanks || {};
    const prevList = prevMap[blankIdx] || [];
    const nextList = prevList.includes(optIdx)
      ? prevList.filter((i) => i !== optIdx)
      : [...prevList, optIdx];
    onChangeAnswer({
      ...currentAns,
      eliminatedBlanks: {
        ...prevMap,
        [blankIdx]: nextList,
      },
    });
  };

  // Determine if this is a Reading Comprehension split-view question
  const isReadingCompSplit =
    question.section.startsWith('verbal') &&
    ((question.type === 'mcq' && Boolean(question.optiontopcontent)) ||
      question.type === 'line-select');

  // Determine if this is a Data Interpretation split-view question
  const isDataInterpretationSplit =
    question.type === 'data-interpretation' &&
    Boolean(question.content) &&
    Boolean(question.optiontopcontent);

  // Reusable Numeric Entry input block (shared between standalone frequency and DI numeric)
  const renderNumericEntryBlock = () => {
    const isFrac = isFractionQuestion(question);
    const { prefix, suffix } = getNumericAffixes(question);

    return (
      <div className="pt-4 border-t border-[#E4E2DC] dark:border-[#262D38]">
        <div className="text-xs text-slate-600 dark:text-slate-400 mb-3.5">
          {isFrac
            ? 'Enter your answer as a fraction in the two boxes below (numerator over denominator). Equivalent fractions are accepted.'
            : 'Enter your answer as an integer or a decimal in the answer box. Commas and equivalent decimals are accepted.'}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {prefix && (
            <span className="text-base font-medium text-slate-900 dark:text-slate-100">
              <RichHtml html={prefix} inline />
            </span>
          )}

          {isFrac ? (
            <div className="inline-flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[#F7F6F2] dark:bg-[#0E1117] border border-[#D8D5CC] dark:border-[#2A3240]">
              <input
                type="text"
                inputMode="numeric"
                disabled={readOnly}
                aria-label="Fraction Numerator"
                placeholder="Numerator"
                value={currentAns.numericNumerator || ''}
                onChange={(e) =>
                  onChangeAnswer({
                    ...currentAns,
                    numericNumerator: e.target.value,
                  })
                }
                className="w-32 px-3 py-1.5 text-center font-mono-tabular text-base font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#161B22] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] dark:focus:ring-blue-500"
              />
              <div className="w-full h-0.5 bg-slate-900 dark:bg-slate-200" />
              <input
                type="text"
                inputMode="numeric"
                disabled={readOnly}
                aria-label="Fraction Denominator"
                placeholder="Denominator"
                value={currentAns.numericDenominator || ''}
                onChange={(e) =>
                  onChangeAnswer({
                    ...currentAns,
                    numericDenominator: e.target.value,
                  })
                }
                className="w-32 px-3 py-1.5 text-center font-mono-tabular text-base font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#161B22] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] dark:focus:ring-blue-500"
              />
            </div>
          ) : (
            <input
              type="text"
              inputMode="decimal"
              disabled={readOnly}
              aria-label="Numeric Entry Answer"
              placeholder="Enter value..."
              value={currentAns.numericValue || ''}
              onChange={(e) =>
                onChangeAnswer({
                  ...currentAns,
                  numericValue: e.target.value,
                })
              }
              className="w-44 px-3.5 py-2.5 font-mono-tabular text-base font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0E1117] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] dark:focus:ring-blue-500"
            />
          )}

          {suffix && (
            <span className="text-base font-medium text-slate-800 dark:text-slate-200">
              <RichHtml html={suffix} inline />
            </span>
          )}
        </div>

        {showSolution && (
          <div
            className={`mt-4 p-4 rounded-lg border text-sm flex flex-wrap items-center justify-between gap-3 ${
              evaluation.isCorrect
                ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-600/60 text-emerald-950 dark:text-emerald-100'
                : 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-600/60 text-rose-950 dark:text-rose-100'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {evaluation.isCorrect ? (
                <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
              )}
              <span>
                {evaluation.isCorrect ? 'Correct Numeric Entry' : 'Incorrect or Unanswered'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400">Official Answer:</span>
              <RichAnswerSummary question={question} variant="correct" />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render MCQ / QC / Multi-Select Options List
  const renderOptionsList = () => {
    if (!question.options || question.options.length === 0) return null;
    const selected = currentAns.selectedIndices || [];
    const eliminated = currentAns.eliminatedIndices || [];
    const correctIndices = question.correctAnswerIndices || [];
    const isMulti = Boolean(question.singleormultiple);

    return (
      <div className="space-y-2 mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 mb-1.5">
          <span className="font-medium">
            {isMulti
              ? subType === 'Sentence Equivalence'
                ? `Select exactly 2 answer choices (${selected.length}/2 selected)`
                : `Select one or more answer choices (${selected.length} selected)`
              : 'Select one answer choice'}
          </span>
          {!readOnly && (
            <span className="text-[11px] text-slate-500 dark:text-slate-500">
              Use the eye icon to strike through eliminated choices
            </span>
          )}
        </div>

        {question.options.map((opt, idx) => {
          const isSelected = selected.includes(idx);
          const isEliminated = eliminated.includes(idx);
          const isCorrectOption = correctIndices.includes(idx);
          const letter = getOptionLetter(idx);

          let borderAndBg =
            'border-[#E4E2DC] dark:border-[#262D38] bg-white dark:bg-[#161B22] hover:border-slate-400 dark:hover:border-slate-600';

          if (showSolution) {
            if (isCorrectOption && isSelected) {
              borderAndBg =
                'border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/35 dark:border-emerald-500';
            } else if (isCorrectOption && !isSelected) {
              borderAndBg =
                'border-emerald-600 border-dashed bg-emerald-50/45 dark:bg-emerald-950/20 dark:border-emerald-500';
            } else if (!isCorrectOption && isSelected) {
              borderAndBg =
                'border-rose-700 bg-rose-50/80 dark:bg-rose-950/35 dark:border-rose-500';
            }
          } else if (isSelected) {
            borderAndBg =
              'border-[#1E3A5F] bg-[#1E3A5F]/[0.05] dark:bg-blue-950/40 dark:border-blue-500 ring-1 ring-[#1E3A5F]/20 dark:ring-blue-500/30';
          }

          return (
            <div
              key={opt._id || idx}
              className={`group flex items-start gap-3 px-3.5 py-2.5 rounded-lg border transition-colors ${borderAndBg} ${
                isEliminated && !isSelected ? 'opacity-50' : ''
              }`}
            >
              <button
                type="button"
                disabled={readOnly}
                onClick={() => handleSelectOption(idx)}
                className="flex-1 flex items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] rounded"
              >
                <span
                  className={`mt-0.5 w-6 h-6 shrink-0 flex items-center justify-center text-xs font-mono-tabular font-bold transition-colors ${
                    isMulti ? 'rounded-md' : 'rounded-full'
                  } ${
                    showSolution && isCorrectOption
                      ? 'bg-emerald-700 text-white'
                      : showSolution && isSelected && !isCorrectOption
                      ? 'bg-rose-700 text-white'
                      : isSelected
                      ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                      : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 border border-[#D8D5CC] dark:border-[#303846]'
                  }`}
                >
                  {letter}
                </span>

                <div
                  className={`flex-1 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 ${
                    isEliminated && !isSelected ? 'line-through text-slate-400 dark:text-slate-500' : ''
                  }`}
                >
                  <RichHtml html={opt.content} inline />
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {showSolution && isCorrectOption && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    Correct
                  </span>
                )}
                {showSolution && isSelected && !isCorrectOption && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400">
                    <X className="w-3.5 h-3.5" />
                    Your Choice
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => handleToggleEliminate(idx, e)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                    title={isEliminated ? 'Restore choice' : 'Cross out choice'}
                    aria-label={isEliminated ? `Restore option ${letter}` : `Cross out option ${letter}`}
                  >
                    {isEliminated ? (
                      <Eye className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 1. AWA Essay (sidebyside)
  if (question.type === 'sidebyside' || question.section === 'awa') {
    const essayText = currentAns.essayText || '';
    const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#1E3A5F] dark:text-blue-400 mb-3">
              Analytical Writing · Analyze an Issue
            </div>
            {question.contentnote && (
              <div className="p-4 rounded-lg bg-[#F7F6F2] dark:bg-[#0E1117] border border-[#E4E2DC] dark:border-[#262D38] font-serif-passage text-base text-slate-900 dark:text-slate-100 mb-4 leading-relaxed">
                <RichHtml html={question.contentnote} />
              </div>
            )}
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <RichHtml html={question.content} />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[#E4E2DC] dark:border-[#262D38] text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              ETS Scoring Rubric Checklist (Target 5.0–6.0):
            </p>
            <p>1. Take a clear, nuanced position addressing the exact prompt instructions.</p>
            <p>2. Support with 2–3 concrete historical, scientific, or policy examples.</p>
            <p>3. Address a strong counterargument and aim for 450–600 well-edited words.</p>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <label
              htmlFor={`awa-editor-${question._id}`}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Essay Response Editor
            </label>
            <span className="text-xs font-mono-tabular text-slate-600 dark:text-slate-400">
              Word Count: <strong className="text-slate-900 dark:text-white">{wordCount}</strong> words
            </span>
          </div>
          <textarea
            id={`awa-editor-${question._id}`}
            disabled={readOnly}
            value={essayText}
            onChange={(e) =>
              onChangeAnswer({
                ...currentAns,
                essayText: e.target.value,
              })
            }
            placeholder="Compose your GRE Analytical Writing essay response here..."
            className="w-full flex-1 min-h-[380px] p-4 rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-slate-100 font-serif-passage text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] dark:focus:ring-blue-500 resize-y"
          />
        </div>
      </div>
    );
  }

  // 2. Reading Comprehension Split View (including Select-in-Passage line-select)
  if (isReadingCompSplit) {
    const selectedIdx = currentAns.selectedIndices?.[0];
    const correctIdx = question.correctAnswerIndices?.[0];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Passage */}
        <div className="lg:col-span-6 bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 lg:max-h-[680px] lg:overflow-y-auto">
          {question.contentnote && (
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 pb-3 mb-4 border-b border-[#E4E2DC] dark:border-[#262D38]">
              <RichHtml html={question.contentnote} inline />
            </div>
          )}

          {question.type === 'line-select' && question.options ? (
            <div>
              <div className="text-xs font-semibold text-[#1E3A5F] dark:text-blue-400 mb-3.5">
                Select-in-Passage · Click any sentence in the passage below to select your answer:
              </div>
              <div className="font-serif-passage text-[16.5px] leading-[1.9] text-slate-900 dark:text-slate-100">
                {question.options.map((sentOpt, idx) => {
                  const isSelected = selectedIdx === idx;
                  const isCorrect = correctIdx === idx;
                  const cleanText = stripHtmlToText(sentOpt.content);

                  let highlightClass =
                    'hover:bg-[#1E3A5F]/10 dark:hover:bg-blue-900/40 rounded px-1 py-0.5 transition-colors cursor-pointer';
                  if (showSolution) {
                    if (isCorrect) {
                      highlightClass =
                        'bg-emerald-200/90 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100 font-medium rounded px-1 py-0.5 underline decoration-emerald-700';
                    } else if (isSelected && !isCorrect) {
                      highlightClass =
                        'bg-rose-200/90 dark:bg-rose-900/80 text-rose-950 dark:text-rose-100 rounded px-1 py-0.5 line-through';
                    }
                  } else if (isSelected) {
                    highlightClass =
                      'bg-[#1E3A5F]/15 dark:bg-blue-800/70 text-slate-950 dark:text-white font-medium rounded px-1 py-0.5 ring-1 ring-[#1E3A5F] dark:ring-blue-400';
                  }

                  return (
                    <span
                      key={sentOpt._id || idx}
                      role="button"
                      tabIndex={readOnly ? -1 : 0}
                      onClick={() => handleSelectOption(idx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectOption(idx);
                        }
                      }}
                      className={highlightClass}
                    >
                      {cleanText}{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="font-serif-passage text-[16.5px] leading-[1.9] text-slate-900 dark:text-slate-100">
              <RichHtml html={question.content} />
            </div>
          )}

          {question.bottomcontent && (
            <div className="mt-4 pt-3 border-t border-[#E4E2DC] dark:border-[#262D38] text-xs text-slate-500 dark:text-slate-400">
              <RichHtml html={question.bottomcontent} />
            </div>
          )}
        </div>

        {/* Right Pane: Question Stem & Options (or Selected Sentence Status for line-select) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 space-y-4">
          {question.optiontopcontent && (
            <div className="text-[16px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
              <RichHtml html={question.optiontopcontent} />
            </div>
          )}

          {question.type === 'line-select' && question.options ? (
            <div className="space-y-4 pt-2 border-t border-[#E4E2DC] dark:border-[#262D38]">
              <div className="p-4 rounded-lg bg-[#F7F6F2] dark:bg-[#0E1117] border border-[#E4E2DC] dark:border-[#262D38] space-y-1.5">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Your Selected Sentence {selectedIdx !== undefined ? `(Sentence ${selectedIdx + 1})` : ''}
                </div>
                {selectedIdx !== undefined && question.options[selectedIdx] ? (
                  <p className="font-serif-passage text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                    “{stripHtmlToText(question.options[selectedIdx].content)}”
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No sentence selected yet. Click directly on a sentence in the passage on the left.
                  </p>
                )}
              </div>

              {showSolution && correctIdx !== undefined && question.options[correctIdx] && (
                <div className="p-4 rounded-lg bg-emerald-50/85 dark:bg-emerald-950/35 border border-emerald-600/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Check className="w-4 h-4" />
                    Official Answer · Sentence {correctIdx + 1}
                  </div>
                  <p className="font-serif-passage text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed">
                    “{stripHtmlToText(question.options[correctIdx].content)}”
                  </p>
                </div>
              )}
            </div>
          ) : (
            renderOptionsList()
          )}
        </div>
      </div>
    );
  }

  // 3. Data Interpretation Split View (Chart/Table Left · Question & Options/Numeric Right)
  if (isDataInterpretationSplit) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 lg:max-h-[700px] lg:overflow-y-auto">
          <div className="text-xs font-semibold text-[#1E3A5F] dark:text-blue-400 pb-3 mb-4 border-b border-[#E4E2DC] dark:border-[#262D38]">
            Data Interpretation · Reference Figure &amp; Data Set
          </div>
          {question.contentnote && (
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              <RichHtml html={question.contentnote} inline />
            </div>
          )}
          <div className="text-[15.5px] text-slate-900 dark:text-slate-100 leading-relaxed">
            <RichHtml html={question.content} />
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 space-y-4">
          <div className="text-[16px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
            <RichHtml html={question.optiontopcontent} />
          </div>
          {isNumericQuestion(question) ? renderNumericEntryBlock() : renderOptionsList()}
        </div>
      </div>
    );
  }

  // 4. Text Completion (fill-blank with 1, 2, or 3 blanks)
  if (question.type === 'fill-blank' && question.blanks && question.blanks.length > 0) {
    const blanks = question.blanks;
    const selections = currentAns.blankSelections || {};
    const eliminatedMap = currentAns.eliminatedBlanks || {};
    const romanLabels = ['Blank (i)', 'Blank (ii)', 'Blank (iii)'];

    return (
      <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 lg:p-7 space-y-6">
        <div className="text-xs text-slate-600 dark:text-slate-400 pb-3 border-b border-[#E4E2DC] dark:border-[#262D38]">
          For each blank, select one entry from the corresponding column of choices. Fill all blanks in the way that best completes the text.
        </div>

        {/* Main Sentence Stem */}
        <div className="font-serif-passage text-[17.5px] leading-[1.9] text-slate-900 dark:text-slate-100 max-w-4xl">
          <RichHtml html={question.content} />
        </div>

        {/* Blank Columns */}
        <div
          className={`grid grid-cols-1 ${
            blanks.length === 2
              ? 'md:grid-cols-2'
              : blanks.length >= 3
              ? 'md:grid-cols-3'
              : 'max-w-xl'
          } gap-5 pt-2`}
        >
          {blanks.map((blank, bIdx) => {
            const selectedOptIdx = selections[bIdx];
            const correctOptIdx = blank.correctAnswerIndex?.[0];
            const eliminatedList = eliminatedMap[bIdx] || [];

            return (
              <div
                key={bIdx}
                className="border border-[#E4E2DC] dark:border-[#262D38] rounded-lg overflow-hidden bg-[#FAF9F6] dark:bg-[#0E1117]"
              >
                <div className="px-4 py-2.5 bg-[#F2F0EA] dark:bg-[#1C222B] border-b border-[#E4E2DC] dark:border-[#262D38] flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {blanks.length > 1 ? romanLabels[bIdx] || `Blank ${bIdx + 1}` : 'Answer Choices'}
                  </span>
                  {selectedOptIdx !== undefined && (
                    <span className="text-[11px] font-mono-tabular font-semibold text-[#1E3A5F] dark:text-blue-400">
                      Choice {getOptionLetter(selectedOptIdx, blanks.length, bIdx)}
                    </span>
                  )}
                </div>

                <div className="p-2.5 space-y-2">
                  {(blank.options || []).map((opt, optIdx) => {
                    const isSelected = selectedOptIdx === optIdx;
                    const isCorrect = correctOptIdx === optIdx;
                    const isEliminated = eliminatedList.includes(optIdx);
                    const letter = getOptionLetter(optIdx, blanks.length, bIdx);

                    let itemClass =
                      'border-[#E4E2DC] dark:border-[#262D38] bg-white dark:bg-[#161B22] hover:border-slate-400 dark:hover:border-slate-600';

                    if (showSolution) {
                      if (isCorrect && isSelected) {
                        itemClass =
                          'border-emerald-700 bg-emerald-50/85 dark:bg-emerald-950/40 dark:border-emerald-500';
                      } else if (isCorrect && !isSelected) {
                        itemClass =
                          'border-emerald-600 border-dashed bg-emerald-50/45 dark:bg-emerald-950/20';
                      } else if (!isCorrect && isSelected) {
                        itemClass =
                          'border-rose-700 bg-rose-50/85 dark:bg-rose-950/40 dark:border-rose-500';
                      }
                    } else if (isSelected) {
                      itemClass =
                        'border-[#1E3A5F] bg-[#1E3A5F]/[0.05] dark:bg-blue-950/50 dark:border-blue-500 ring-1 ring-[#1E3A5F]/20';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border transition-colors ${itemClass} ${
                          isEliminated && !isSelected ? 'opacity-45' : ''
                        }`}
                      >
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleSelectBlank(bIdx, optIdx)}
                          className="flex-1 flex items-center gap-2.5 text-left focus:outline-none"
                        >
                          <span
                            className={`w-5 h-5 rounded text-[11px] font-mono-tabular font-bold flex items-center justify-center shrink-0 ${
                              showSolution && isCorrect
                                ? 'bg-emerald-700 text-white'
                                : showSolution && isSelected && !isCorrect
                                ? 'bg-rose-700 text-white'
                                : isSelected
                                ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                                : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-700 dark:text-slate-300 border border-[#D8D5CC] dark:border-[#303846]'
                            }`}
                          >
                            {letter}
                          </span>
                          <span
                            className={`text-sm font-medium text-slate-900 dark:text-slate-100 ${
                              isEliminated && !isSelected ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            <RichHtml html={opt.content} inline />
                          </span>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {showSolution && isCorrect && (
                            <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          )}
                          {showSolution && isSelected && !isCorrect && (
                            <X className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                          )}
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleBlankEliminate(bIdx, optIdx, e)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                              title={isEliminated ? 'Restore choice' : 'Cross out choice'}
                              aria-label={isEliminated ? `Restore choice ${letter}` : `Cross out choice ${letter}`}
                            >
                              {isEliminated ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. Quantitative Comparison (fill-blank-another or quantity === true)
  if (question.type === 'fill-blank-another' || question.quantity) {
    const qcBlank = question.blanks?.[0];
    const qtyA = qcBlank?.quantityA || qcBlank?.optioncontent || '';
    const qtyB = qcBlank?.quantityB || qcBlank?.optioncontent2 || '';

    return (
      <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5 lg:p-6 space-y-4">
        <div className="text-xs text-slate-600 dark:text-slate-400 pb-2.5 border-b border-[#E4E2DC] dark:border-[#262D38]">
          Compare Quantity A and Quantity B, using additional information centered above the two quantities if such information is given, and select one of the four answer choices.
        </div>

        {/* Given Information / Figure */}
        {question.content &&
          question.content.trim() !== '' &&
          question.content.trim() !== '<p></p>' && (
            <div className="text-[15.5px] text-slate-900 dark:text-slate-100 leading-relaxed max-w-3xl mx-auto text-center">
              <RichHtml html={question.content} />
            </div>
          )}

        {/* Quantity A vs Quantity B Table */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 border border-[#D8D5CC] dark:border-[#2A3240] rounded-xl overflow-hidden bg-[#FAF9F6] dark:bg-[#0E1117]">
          <div className="p-4 sm:border-r border-b sm:border-b-0 border-[#D8D5CC] dark:border-[#2A3240] flex flex-col items-center justify-center text-center">
            <div className="text-xs font-bold tracking-wide text-[#1E3A5F] dark:text-blue-400 underline underline-offset-4 mb-2">
              Quantity A
            </div>
            <div className="text-base text-slate-900 dark:text-slate-100">
              <RichHtml html={qtyA} />
            </div>
          </div>

          <div className="p-4 flex flex-col items-center justify-center text-center">
            <div className="text-xs font-bold tracking-wide text-[#1E3A5F] dark:text-blue-400 underline underline-offset-4 mb-2">
              Quantity B
            </div>
            <div className="text-base text-slate-900 dark:text-slate-100">
              <RichHtml html={qtyB} />
            </div>
          </div>
        </div>

        {/* 4 Standard QC Options */}
        <div className="max-w-3xl mx-auto">{renderOptionsList()}</div>
      </div>
    );
  }

  // 6. Numeric Entry (standalone frequency or DI numeric without split)
  if (isNumericQuestion(question)) {
    return (
      <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-6 lg:p-7 space-y-6">
        {question.contentnote && (
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 pb-3 border-b border-[#E4E2DC] dark:border-[#262D38]">
            <RichHtml html={question.contentnote} inline />
          </div>
        )}

        {question.content && (
          <div className="text-[16px] text-slate-900 dark:text-slate-100 leading-relaxed">
            <RichHtml html={question.content} />
          </div>
        )}

        {question.optiontopcontent && (
          <div className="text-[16px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
            <RichHtml html={question.optiontopcontent} />
          </div>
        )}

        {renderNumericEntryBlock()}
      </div>
    );
  }

  // 7. Standard MCQ, Sentence Equivalence, Single-Column Data Interpretation
  return (
    <div className="bg-white dark:bg-[#161B22] border border-[#E4E2DC] dark:border-[#262D38] rounded-xl p-5 lg:p-6 space-y-4">
      {question.contentnote && (
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 pb-2.5 border-b border-[#E4E2DC] dark:border-[#262D38]">
          <RichHtml html={question.contentnote} inline />
        </div>
      )}

      {question.content && (
        <div
          className={`${
            question.section.startsWith('verbal')
              ? 'font-serif-passage text-[17px] leading-[1.85]'
              : 'text-[15.5px] leading-relaxed'
          } text-slate-900 dark:text-slate-100`}
        >
          <RichHtml html={question.content} />
        </div>
      )}

      {question.optiontopcontent && (
        <div className="text-[15.5px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed pt-2.5 border-t border-[#E4E2DC] dark:border-[#262D38]">
          <RichHtml html={question.optiontopcontent} />
        </div>
      )}

      {renderOptionsList()}
    </div>
  );
};
