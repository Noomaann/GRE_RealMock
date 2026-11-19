import React from 'react';
import { GREQuestion, UserAnswer } from '../types/gre';
import { getCorrectAnswerParts, getUserAnswerParts } from '../utils/greLogic';
import { RichHtml } from './RichHtml';

interface RichAnswerSummaryProps {
  question: GREQuestion;
  variant: 'correct' | 'user';
  userAnswer?: UserAnswer;
  compact?: boolean;
}

/**
 * Renders structured GRE official answers or user answers with full KaTeX math,
 * fraction formatting, option letter badges, and inline diagram/chart support.
 */
export const RichAnswerSummary: React.FC<RichAnswerSummaryProps> = ({
  question,
  variant,
  userAnswer,
  compact = false,
}) => {
  const parts =
    variant === 'correct'
      ? getCorrectAnswerParts(question)
      : getUserAnswerParts(question, userAnswer);

  const badgeClass =
    variant === 'correct'
      ? 'bg-emerald-700 text-white dark:bg-emerald-600'
      : 'bg-[#1E3A5F] text-white dark:bg-blue-600';

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 align-middle">
      {parts.map((part, idx) => (
        <span key={idx} className="inline-flex items-center gap-1.5 flex-wrap">
          {idx > 0 && (
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600 mr-1">
              ·
            </span>
          )}
          {part.label && (
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {part.label}:
            </span>
          )}
          {part.letter && (
            <span
              className={`inline-flex items-center justify-center px-1.5 min-w-[22px] h-[22px] rounded text-[11px] font-mono-tabular font-bold shrink-0 ${badgeClass}`}
            >
              {part.letter}
            </span>
          )}
          <span
            className={`${
              compact ? 'text-xs' : 'text-sm'
            } text-slate-900 dark:text-slate-100 font-medium leading-snug`}
          >
            <RichHtml html={part.html} inline />
          </span>
        </span>
      ))}
    </span>
  );
};
