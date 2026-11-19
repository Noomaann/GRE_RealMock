import katex from 'katex';
import {
  GREQuestion,
  MonthConfig,
  UserAnswer,
} from '../types/gre';

export const MONTH_CONFIGS: MonthConfig[] = [
  { id: '2026-03', label: 'March 2026', shortLabel: 'Mar 2026', expectedTests: 1, fileUrl: '/data/2026-03.json' },
  { id: '2026-04', label: 'April 2026', shortLabel: 'Apr 2026', expectedTests: 2, fileUrl: '/data/2026-04.json' },
  { id: '2026-05', label: 'May 2026', shortLabel: 'May 2026', expectedTests: 4, fileUrl: '/data/2026-05.json' },
  { id: '2026-06', label: 'June 2026', shortLabel: 'Jun 2026', expectedTests: 13, fileUrl: '/data/2026-06.json' },
  { id: '2026-07', label: 'July 2026', shortLabel: 'Jul 2026', expectedTests: 14, fileUrl: '/data/2026-07.json' },
  { id: '2026-08', label: 'August 2026', shortLabel: 'Aug 2026', expectedTests: 16, fileUrl: '/data/2026-08.json' },
  { id: '2026-09', label: 'September 2026', shortLabel: 'Sep 2026', expectedTests: 13, fileUrl: '/data/2026-09.json' },
  { id: '2026-10', label: 'October 2026', shortLabel: 'Oct 2026', expectedTests: 15, fileUrl: '/data/2026-10.json' },
];

export const ERROR_CATEGORIES = [
  'Conceptual Gap',
  'Calculation / Careless',
  'Vocabulary Gap',
  'Misread Question / Trap',
  'Time Pressure',
  'Formula Forgotten',
] as const;

export const NOTE_TAG_PRESETS = [
  'Vocab',
  'Quant Shortcut',
  'RC Strategy',
  'Trap Alert',
  'Formula',
  'Must Review',
] as const;

/**
 * Official ETS Shorter GRE (Post-Sept 2023) section durations in minutes.
 */
export const ETS_SECTION_MINUTES: Record<string, number> = {
  awa: 30,
  'verbal-1': 18,
  'verbal-2': 23,
  'quant-1': 21,
  'quant-2': 26,
};

export function getRecommendedMinutesForScope(
  questions: GREQuestion[],
  scope: string
): number {
  if (scope === 'verbal-all') return 41;
  if (scope === 'quant-all') return 47;
  if (ETS_SECTION_MINUTES[scope]) return ETS_SECTION_MINUTES[scope];

  if (scope === 'all') {
    const sections = new Set(questions.map((q) => q.section));
    let total = 0;
    sections.forEach((sec) => {
      if (ETS_SECTION_MINUTES[sec]) {
        total += ETS_SECTION_MINUTES[sec];
      }
    });
    if (total > 0) return total;
  }

  return Math.max(10, Math.round(questions.length * 1.55));
}

/**
 * Estimates an ETS GRE Scaled Score (130–170) from raw accuracy across
 * a 27-question Verbal or Quant section (or scaled proportionally).
 */
export function estimateGreScaledScore(correct: number, total: number): number | null {
  if (total <= 0) return null;
  const ratio = Math.max(0, Math.min(1, correct / total));
  return Math.round(130 + ratio * 40);
}

function decodeMathEntities(mathText: string): string {
  return mathText
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

/**
 * Cleans GRE HTML content, fixes double-slash image URLs, preserves currency
 * signs ($300, $2.50, $175,000, \$2.99), removes empty paragraph spacers,
 * and renders LaTeX ($...$ and $$...$$) into crisp KaTeX HTML.
 */
export function renderMathAndCleanHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml) return '';

  let html = rawHtml;

  // 1. Fix double slashes in image uploads
  html = html.replace(
    /https:\/\/api\.grequantschool\.com\/\/uploads\//g,
    'https://api.grequantschool.com/uploads/'
  );

  // 2. Remove empty <p></p> tags that create excessive blank gaps
  html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');

  // 3. Protect escaped currency dollar signs (\$2.99 -> &#36;2.99)
  html = html.replace(/\\\$/g, '&#36;');

  // 4. Render $$...$$ display math first
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, expr) => {
    const cleanedExpr = decodeMathEntities(expr).trim();
    if (!cleanedExpr) return '';
    try {
      return katex.renderToString(cleanedExpr, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return `$$${cleanedExpr}$$`;
    }
  });

  // 4b. Protect unescaped currency amounts followed by English prose (e.g. "$2.50, which...", "$175,000 and...", "$20 to $30")
  // so they never steal the opening "$" of a real inline LaTeX expression like "$x$" later in the same sentence.
  html = html.replace(/\$(\d[\d,.]*(?:[,;:]?\s+[a-zA-Z]{2,}))/g, '&#36;$1');

  // 5. Render $...$ inline math without crossing HTML tags
  html = html.replace(/\$([^$<>]+)\$/g, (match, expr) => {
    const cleanedExpr = decodeMathEntities(expr).trim();
    if (!cleanedExpr) return match;
    try {
      return katex.renderToString(cleanedExpr, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return match;
    }
  });

  return html.trim();
}

/**
 * Strips HTML tags for plain-text previews, search indexing, and option summaries.
 */
export function stripHtmlToText(rawHtml: string | null | undefined): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\\$/g, '$')
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatSectionLabel(section: string): string {
  switch (section) {
    case 'verbal-1':
      return 'Verbal Section 1';
    case 'verbal-2':
      return 'Verbal Section 2';
    case 'quant-1':
      return 'Quant Section 1';
    case 'quant-2':
      return 'Quant Section 2';
    case 'awa':
      return 'Analytical Writing';
    default:
      return section.toUpperCase();
  }
}

export function getBroadSection(section: string): 'Verbal' | 'Quant' | 'AWA' {
  if (section.startsWith('verbal')) return 'Verbal';
  if (section.startsWith('quant')) return 'Quant';
  return 'AWA';
}

export function classifyQuestionSubType(q: GREQuestion): string {
  if (q.type === 'sidebyside' || q.section === 'awa') {
    return 'Analytical Writing (Issue Essay)';
  }
  if (q.type === 'fill-blank') {
    const count = q.blanks?.length || 1;
    return `Text Completion (${count}-Blank)`;
  }
  if (q.type === 'fill-blank-another' || q.quantity) {
    return 'Quantitative Comparison';
  }
  if (q.type === 'line-select') {
    return 'Reading Comp (Select-in-Passage)';
  }
  if (q.type === 'data-interpretation') {
    if (q.correctAnswerFraction || q.diSubType === 'numeric-single') {
      return 'Data Interpretation (Numeric)';
    }
    if (q.singleormultiple) {
      return 'Data Interpretation (Multiple Answer)';
    }
    return 'Data Interpretation';
  }
  if (q.type === 'frequency' || q.correctAnswerFraction) {
    const isFrac = isFractionQuestion(q);
    return isFrac ? 'Numeric Entry (Fraction)' : 'Numeric Entry';
  }
  if (q.type === 'mcq') {
    if (q.section.startsWith('verbal')) {
      if (
        q.singleormultiple &&
        q.options?.length === 6 &&
        q.correctAnswerIndices?.length === 2 &&
        !q.optiontopcontent
      ) {
        return 'Sentence Equivalence';
      }
      if (q.singleormultiple) {
        return 'Reading Comp (Multiple Answer)';
      }
      return 'Reading Comprehension';
    } else {
      return q.singleormultiple
        ? 'Problem Solving (Multiple Answer)'
        : 'Problem Solving (Single Answer)';
    }
  }
  return 'Standard Question';
}

export function isFractionQuestion(q: GREQuestion): boolean {
  return Boolean(
    q.correctAnswerFraction &&
      q.correctAnswerFraction.denominator !== null &&
      q.correctAnswerFraction.denominator !== undefined &&
      q.correctAnswerFraction.denominator !== 0
  );
}

export function isNumericQuestion(q: GREQuestion): boolean {
  return Boolean(
    q.type === 'frequency' ||
      (q.correctAnswerFraction !== null && q.correctAnswerFraction !== undefined)
  );
}

/**
 * Resolves exact prefix & suffix symbols for Numeric Entry questions.
 * Verified across all 202 numeric questions in the 2026 bank:
 * - `diPrefix` / `diSuffix` apply to Data Interpretation numeric questions.
 * - `textalign === false` puts `textsymbol` on the LEFT (prefix: e.g. `$x =$`, `\$`, `$$a+b=$$`).
 * - `textalign === true` puts `textsymbol` on the RIGHT (suffix: e.g. `minutes`, `%`, `$$\text{inches}$$`).
 */
export function getNumericAffixes(q: GREQuestion): { prefix: string; suffix: string } {
  if (q.diPrefix || q.diSuffix) {
    return {
      prefix: q.diPrefix?.trim() || '',
      suffix: q.diSuffix?.trim() || '',
    };
  }
  const rawSym = q.textsymbol?.trim() || '';
  if (!rawSym) {
    return { prefix: '', suffix: '' };
  }
  // Normalize bare '$' or '\$' to HTML dollar entity so KaTeX doesn't misread it
  const normalizedSym = rawSym === '$' || rawSym === '\\$' || rawSym === '$\\$$' ? '&#36;' : rawSym;

  if (q.textalign === true) {
    return { prefix: '', suffix: normalizedSym };
  }
  if (q.textalign === false) {
    return { prefix: normalizedSym, suffix: '' };
  }
  // Fallback if textalign is undefined
  if (rawSym.includes('=') || rawSym === '$' || rawSym === '\\$') {
    return { prefix: normalizedSym, suffix: '' };
  }
  return { prefix: '', suffix: normalizedSym };
}

function parseFlexibleNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, '').replace(/\s+/g, '').trim();
  if (!cleaned) return Number.NaN;
  const direct = Number(cleaned);
  if (!Number.isNaN(direct)) return direct;
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 2) {
      const n = Number(parts[0]);
      const d = Number(parts[1]);
      if (!Number.isNaN(n) && !Number.isNaN(d) && d !== 0) {
        return n / d;
      }
    }
  }
  return Number.NaN;
}

/**
 * Evaluates a user's answer against the official GRE question key.
 * Follows strict ETS GRE grading (no partial credit for multi-blank or multi-select).
 */
export function evaluateQuestionAnswer(
  q: GREQuestion,
  ans?: UserAnswer
): { isAnswered: boolean; isCorrect: boolean; isGradable: boolean } {
  if (q.type === 'sidebyside' || q.section === 'awa') {
    const hasEssay = Boolean(ans?.essayText && ans.essayText.trim().length > 0);
    return { isAnswered: hasEssay, isCorrect: hasEssay, isGradable: false };
  }

  // 1. Text Completion (fill-blank with blanks array)
  if (q.type === 'fill-blank' && q.blanks && q.blanks.length > 0) {
    const selections = ans?.blankSelections || {};
    const answeredBlanks = Object.keys(selections).length;
    if (answeredBlanks === 0) {
      return { isAnswered: false, isCorrect: false, isGradable: true };
    }
    const allBlanksAnswered = q.blanks.every(
      (_b, idx) => selections[idx] !== undefined && selections[idx] !== null
    );
    if (!allBlanksAnswered) {
      return { isAnswered: true, isCorrect: false, isGradable: true };
    }
    const allCorrect = q.blanks.every((b, idx) => {
      const expected = b.correctAnswerIndex?.[0];
      return expected !== undefined && selections[idx] === expected;
    });
    return { isAnswered: true, isCorrect: allCorrect, isGradable: true };
  }

  // 2. Numeric Entry (frequency or DI with correctAnswerFraction)
  if (isNumericQuestion(q) && q.correctAnswerFraction) {
    const frac = q.correctAnswerFraction;
    if (isFractionQuestion(q)) {
      const rawNum = ans?.numericNumerator?.replace(/,/g, '').trim() ?? '';
      const rawDen = ans?.numericDenominator?.replace(/,/g, '').trim() ?? '';
      if (!rawNum && !rawDen) {
        return { isAnswered: false, isCorrect: false, isGradable: true };
      }
      const uNum = Number(rawNum);
      const uDen = Number(rawDen);
      if (!rawNum || !rawDen || Number.isNaN(uNum) || Number.isNaN(uDen) || uDen === 0) {
        return { isAnswered: true, isCorrect: false, isGradable: true };
      }
      const expectedRatio = frac.numerator / frac.denominator;
      const userRatio = uNum / uDen;
      const isCorrect = Math.abs(expectedRatio - userRatio) < 1e-5;
      return { isAnswered: true, isCorrect, isGradable: true };
    } else {
      const rawVal = ans?.numericValue?.trim() ?? '';
      if (!rawVal) {
        return { isAnswered: false, isCorrect: false, isGradable: true };
      }
      const parsedVal = parseFlexibleNumber(rawVal);
      if (Number.isNaN(parsedVal)) {
        return { isAnswered: true, isCorrect: false, isGradable: true };
      }
      const isCorrect = Math.abs(parsedVal - frac.numerator) < 1e-5;
      return { isAnswered: true, isCorrect, isGradable: true };
    }
  }

  // 3. Option-based questions (mcq, fill-blank-another / QC, data-interpretation MCQ, line-select)
  if (q.correctAnswerIndices && q.correctAnswerIndices.length > 0) {
    const selected = ans?.selectedIndices || [];
    if (selected.length === 0) {
      return { isAnswered: false, isCorrect: false, isGradable: true };
    }
    const sortedExpected = [...q.correctAnswerIndices].sort((a, b) => a - b);
    const sortedSelected = [...selected].sort((a, b) => a - b);
    const isCorrect =
      sortedExpected.length === sortedSelected.length &&
      sortedExpected.every((val, idx) => val === sortedSelected[idx]);
    return { isAnswered: true, isCorrect, isGradable: true };
  }

  return { isAnswered: false, isCorrect: false, isGradable: false };
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function getOptionLetter(index: number, totalBlanks = 1, blankIdx = 0): string {
  if (totalBlanks > 1) {
    const offset = blankIdx * 3 + index;
    return OPTION_LETTERS[offset] || String(index + 1);
  }
  return OPTION_LETTERS[index] || String(index + 1);
}

export interface StructuredAnswerPart {
  label?: string;
  letter?: string;
  html: string;
}

/**
 * Returns structured rich-HTML parts for the official correct answer so UI
 * components can render KaTeX formulas, fractions, and option images accurately.
 */
export function getCorrectAnswerParts(q: GREQuestion): StructuredAnswerPart[] {
  if (q.type === 'sidebyside' || q.section === 'awa') {
    return [{ html: 'Analytical Writing Response (Self / ETS Rubric Graded)' }];
  }
  if (q.type === 'fill-blank' && q.blanks && q.blanks.length > 0) {
    const roman = ['i', 'ii', 'iii'];
    return q.blanks.map((b, bIdx) => {
      const cIdx = b.correctAnswerIndex?.[0] ?? 0;
      const letter = getOptionLetter(cIdx, q.blanks!.length, bIdx);
      return {
        label: q.blanks!.length > 1 ? `Blank (${roman[bIdx] || bIdx + 1})` : undefined,
        letter,
        html: b.options?.[cIdx]?.content || '',
      };
    });
  }
  if (isNumericQuestion(q) && q.correctAnswerFraction) {
    const f = q.correctAnswerFraction;
    const { prefix, suffix } = getNumericAffixes(q);
    const valueHtml = isFractionQuestion(q)
      ? `$\\dfrac{${f.numerator}}{${f.denominator}}$`
      : `<strong>${f.numerator}</strong>`;
    const combined = [prefix, valueHtml, suffix].filter(Boolean).join(' ');
    return [{ html: combined }];
  }
  if (q.correctAnswerIndices && q.options) {
    return q.correctAnswerIndices.map((idx) => {
      const letter = q.type === 'line-select' ? `Sentence ${idx + 1}` : OPTION_LETTERS[idx] || `#${idx + 1}`;
      return {
        letter,
        html: q.options?.[idx]?.content || '',
      };
    });
  }
  return [{ html: 'N/A' }];
}

/**
 * Returns structured rich-HTML parts for the user's submitted answer.
 */
export function getUserAnswerParts(q: GREQuestion, ans?: UserAnswer): StructuredAnswerPart[] {
  if (!ans) return [{ html: 'Unanswered' }];
  if (q.type === 'sidebyside' || q.section === 'awa') {
    const words = ans.essayText?.trim().split(/\s+/).filter(Boolean).length || 0;
    return [{ html: words > 0 ? `Essay written (${words} words)` : 'Unanswered' }];
  }
  if (q.type === 'fill-blank' && q.blanks && q.blanks.length > 0) {
    const sel = ans.blankSelections || {};
    if (Object.keys(sel).length === 0) return [{ html: 'Unanswered' }];
    const roman = ['i', 'ii', 'iii'];
    return q.blanks.map((b, bIdx) => {
      const sIdx = sel[bIdx];
      const label = q.blanks!.length > 1 ? `Blank (${roman[bIdx] || bIdx + 1})` : undefined;
      if (sIdx === undefined) return { label, html: '—' };
      const letter = getOptionLetter(sIdx, q.blanks!.length, bIdx);
      return {
        label,
        letter,
        html: b.options?.[sIdx]?.content || '',
      };
    });
  }
  if (isNumericQuestion(q)) {
    if (isFractionQuestion(q)) {
      if (!ans.numericNumerator && !ans.numericDenominator) return [{ html: 'Unanswered' }];
      return [{ html: `$\\dfrac{${ans.numericNumerator || '?'}}{${ans.numericDenominator || '?'}}$` }];
    }
    if (!ans.numericValue?.trim()) return [{ html: 'Unanswered' }];
    return [{ html: `<strong>${ans.numericValue.trim()}</strong>` }];
  }
  if (ans.selectedIndices && ans.selectedIndices.length > 0 && q.options) {
    return [...ans.selectedIndices]
      .sort((a, b) => a - b)
      .map((idx) => ({
        letter: q.type === 'line-select' ? `Sentence ${idx + 1}` : OPTION_LETTERS[idx] || `#${idx + 1}`,
        html: q.options?.[idx]?.content || '',
      }));
  }
  return [{ html: 'Unanswered' }];
}

export function formatCorrectAnswerSummary(q: GREQuestion): string {
  if (q.type === 'sidebyside' || q.section === 'awa') {
    return 'Analytical Writing Response (Self/Rubric Graded)';
  }
  if (q.type === 'fill-blank' && q.blanks && q.blanks.length > 0) {
    return q.blanks
      .map((b, bIdx) => {
        const cIdx = b.correctAnswerIndex?.[0] ?? 0;
        const optText = stripHtmlToText(b.options?.[cIdx]?.content || '');
        const label = q.blanks!.length > 1 ? `Blank (${['i', 'ii', 'iii'][bIdx] || bIdx + 1}): ` : '';
        return `${label}${optText}`;
      })
      .join(' · ');
  }
  if (isNumericQuestion(q) && q.correctAnswerFraction) {
    const f = q.correctAnswerFraction;
    const { suffix } = getNumericAffixes(q);
    const cleanSuffix = stripHtmlToText(suffix);
    if (isFractionQuestion(q)) {
      return `${f.numerator} / ${f.denominator}${cleanSuffix ? ' ' + cleanSuffix : ''}`;
    }
    return `${f.numerator}${cleanSuffix ? ' ' + cleanSuffix : ''}`;
  }
  if (q.correctAnswerIndices && q.options) {
    return q.correctAnswerIndices
      .map((idx) => {
        const letter = OPTION_LETTERS[idx] || `#${idx + 1}`;
        const raw = q.options?.[idx]?.content || '';
        const text = raw.includes('<img') ? '[Diagram Choice]' : stripHtmlToText(raw);
        const shortText = text.length > 70 ? text.slice(0, 67) + '...' : text;
        return `${letter}) ${shortText}`;
      })
      .join(' | ');
  }
  return 'N/A';
}

export function formatUserAnswerSummary(q: GREQuestion, ans?: UserAnswer): string {
  if (!ans) return 'Unanswered';
  if (q.type === 'sidebyside' || q.section === 'awa') {
    const words = ans.essayText?.trim().split(/\s+/).filter(Boolean).length || 0;
    return words > 0 ? `Essay written (${words} words)` : 'Unanswered';
  }
  if (q.type === 'fill-blank' && q.blanks && q.blanks.length > 0) {
    const sel = ans.blankSelections || {};
    if (Object.keys(sel).length === 0) return 'Unanswered';
    return q.blanks
      .map((b, bIdx) => {
        const sIdx = sel[bIdx];
        const label = q.blanks!.length > 1 ? `Blank (${['i', 'ii', 'iii'][bIdx] || bIdx + 1}): ` : '';
        if (sIdx === undefined) return `${label}—`;
        const optText = stripHtmlToText(b.options?.[sIdx]?.content || '');
        return `${label}${optText}`;
      })
      .join(' · ');
  }
  if (isNumericQuestion(q)) {
    if (isFractionQuestion(q)) {
      if (!ans.numericNumerator && !ans.numericDenominator) return 'Unanswered';
      return `${ans.numericNumerator || '?'} / ${ans.numericDenominator || '?'}`;
    }
    if (!ans.numericValue?.trim()) return 'Unanswered';
    return ans.numericValue.trim();
  }
  if (ans.selectedIndices && ans.selectedIndices.length > 0 && q.options) {
    return ans.selectedIndices
      .map((idx) => {
        const letter = OPTION_LETTERS[idx] || `#${idx + 1}`;
        const raw = q.options?.[idx]?.content || '';
        const text = raw.includes('<img') ? '[Diagram Choice]' : stripHtmlToText(raw);
        const shortText = text.length > 70 ? text.slice(0, 67) + '...' : text;
        return `${letter}) ${shortText}`;
      })
      .join(' | ');
  }
  return 'Unanswered';
}

export interface SessionAnalyticsSummary {
  totalQuestions: number;
  gradableQuestions: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracyPercent: number;
  totalTimeMs: number;
  avgTimePerQuestionMs: number;
  verbalCorrect: number;
  verbalTotal: number;
  quantCorrect: number;
  quantTotal: number;
  estimatedVerbalScore: number | null;
  estimatedQuantScore: number | null;
  bySection: Record<
    string,
    { total: number; correct: number; answered: number; timeMs: number }
  >;
  bySubType: Record<
    string,
    { total: number; correct: number; timeMs: number }
  >;
  byDifficulty: Record<
    number,
    { total: number; correct: number }
  >;
}

export function calculateSessionMetrics(
  questions: GREQuestion[],
  answers: Record<string, UserAnswer>,
  timeSpentByQuestion: Record<string, number>
): SessionAnalyticsSummary {
  let gradableQuestions = 0;
  let answeredCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let totalTimeMs = 0;
  let verbalCorrect = 0;
  let verbalTotal = 0;
  let quantCorrect = 0;
  let quantTotal = 0;

  const bySection: Record<string, { total: number; correct: number; answered: number; timeMs: number }> = {};
  const bySubType: Record<string, { total: number; correct: number; timeMs: number }> = {};
  const byDifficulty: Record<number, { total: number; correct: number }> = {};

  for (const q of questions) {
    const ans = answers[q._id];
    const tMs = timeSpentByQuestion[q._id] || 0;
    totalTimeMs += tMs;

    const { isAnswered, isCorrect, isGradable } = evaluateQuestionAnswer(q, ans);
    const secKey = q.section || 'general';
    if (!bySection[secKey]) {
      bySection[secKey] = { total: 0, correct: 0, answered: 0, timeMs: 0 };
    }
    bySection[secKey].timeMs += tMs;

    if (!isGradable) {
      if (isAnswered) answeredCount++;
      continue;
    }

    gradableQuestions++;
    bySection[secKey].total++;

    const broad = getBroadSection(secKey);
    if (broad === 'Verbal') verbalTotal++;
    if (broad === 'Quant') quantTotal++;

    const subType = classifyQuestionSubType(q);
    if (!bySubType[subType]) {
      bySubType[subType] = { total: 0, correct: 0, timeMs: 0 };
    }
    bySubType[subType].total++;
    bySubType[subType].timeMs += tMs;

    const diff = q.difficulty || 3;
    if (!byDifficulty[diff]) {
      byDifficulty[diff] = { total: 0, correct: 0 };
    }
    byDifficulty[diff].total++;

    if (isAnswered) {
      answeredCount++;
      bySection[secKey].answered++;
      if (isCorrect) {
        correctCount++;
        bySection[secKey].correct++;
        bySubType[subType].correct++;
        byDifficulty[diff].correct++;
        if (broad === 'Verbal') verbalCorrect++;
        if (broad === 'Quant') quantCorrect++;
      } else {
        incorrectCount++;
      }
    } else {
      unansweredCount++;
    }
  }

  const accuracyPercent =
    gradableQuestions > 0 ? Math.round((correctCount / gradableQuestions) * 100) : 0;
  const avgTimePerQuestionMs =
    questions.length > 0 ? Math.round(totalTimeMs / questions.length) : 0;

  return {
    totalQuestions: questions.length,
    gradableQuestions,
    answeredCount,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracyPercent,
    totalTimeMs,
    avgTimePerQuestionMs,
    verbalCorrect,
    verbalTotal,
    quantCorrect,
    quantTotal,
    estimatedVerbalScore: estimateGreScaledScore(verbalCorrect, verbalTotal),
    estimatedQuantScore: estimateGreScaledScore(quantCorrect, quantTotal),
    bySection,
    bySubType,
    byDifficulty,
  };
}
