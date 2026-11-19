import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyQuestionSubType,
  estimateGreScaledScore,
  evaluateQuestionAnswer,
  getCorrectAnswerParts,
  getNumericAffixes,
  getRecommendedMinutesForScope,
  renderMathAndCleanHtml,
} from './greLogic';
import { GREQuestion } from '../types/gre';

test('renderMathAndCleanHtml protects currency prose and renders LaTeX math', () => {
  const currency1 = renderMathAndCleanHtml(
    '<p>If the price is $2.50, which of the following could be the value of $x$?</p>'
  );
  assert.ok(currency1.includes('&#36;2.50, which of the following'), 'Should not mangle $2.50 prose');
  assert.ok(currency1.includes('katex'), 'Should render $x$ with KaTeX');

  const currency2 = renderMathAndCleanHtml(
    '<p>The average price in 1992 was $175,000 and the average price in 1993 was $200,000.</p>'
  );
  assert.ok(currency2.includes('&#36;175,000 and the average price'), 'Should preserve $175,000 prose');

  const mathInequality = renderMathAndCleanHtml('<p>Given $0 &lt; x &lt; 1$ and $\\frac{rs}{50}$.</p>');
  assert.ok(mathInequality.includes('katex'), 'Should render math inequality and fraction with KaTeX');

  const imgFix = renderMathAndCleanHtml('<img src="https://api.grequantschool.com//uploads/test.png">');
  assert.ok(
    imgFix.includes('https://api.grequantschool.com/uploads/test.png'),
    'Should normalize double-slash upload URLs'
  );
});

test('getNumericAffixes maps textalign false to prefix and true to suffix', () => {
  const prefixQ: GREQuestion = {
    _id: 'n1',
    type: 'frequency',
    content: '',
    options: null,
    correctAnswerIndices: null,
    correctAnswerFraction: { numerator: 12, denominator: 0 },
    blanks: null,
    section: 'quant-1',
    difficulty: 3,
    textalign: false,
    textsymbol: '$$a + b =$$',
  };
  assert.deepEqual(getNumericAffixes(prefixQ), { prefix: '$$a + b =$$', suffix: '' });

  const suffixQ: GREQuestion = {
    ...prefixQ,
    _id: 'n2',
    textalign: true,
    textsymbol: '$$\\text{inches}$$',
  };
  assert.deepEqual(getNumericAffixes(suffixQ), { prefix: '', suffix: '$$\\text{inches}$$' });

  const bareDollarQ: GREQuestion = {
    ...prefixQ,
    _id: 'n3',
    textalign: false,
    textsymbol: '$',
  };
  assert.deepEqual(getNumericAffixes(bareDollarQ), { prefix: '&#36;', suffix: '' });
});

test('evaluateQuestionAnswer handles comma numbers, fractions, multi-blank, and multi-select strictly', () => {
  // Comma-formatted numeric answer
  const numQ: GREQuestion = {
    _id: 'q-num',
    type: 'data-interpretation',
    content: '',
    options: null,
    correctAnswerIndices: null,
    correctAnswerFraction: { numerator: 1320, denominator: 0 },
    blanks: null,
    section: 'quant-1',
    difficulty: 3,
    diSubType: 'numeric-single',
    diSuffix: 'homeowners',
  };
  assert.equal(
    evaluateQuestionAnswer(numQ, { questionId: 'q-num', numericValue: '1,320' }).isCorrect,
    true
  );
  assert.equal(
    evaluateQuestionAnswer(numQ, { questionId: 'q-num', numericValue: '1321' }).isCorrect,
    false
  );

  // Fraction equivalence (6/10 == 3/5)
  const fracQ: GREQuestion = {
    _id: 'q-frac',
    type: 'frequency',
    content: '',
    options: null,
    correctAnswerIndices: null,
    correctAnswerFraction: { numerator: 3, denominator: 5 },
    blanks: null,
    section: 'quant-2',
    difficulty: 4,
  };
  assert.equal(
    evaluateQuestionAnswer(fracQ, {
      questionId: 'q-frac',
      numericNumerator: '6',
      numericDenominator: '10',
    }).isCorrect,
    true
  );

  // Strict 2-blank Text Completion
  const tcQ: GREQuestion = {
    _id: 'q-tc',
    type: 'fill-blank',
    content: 'Test',
    options: null,
    correctAnswerIndices: null,
    correctAnswerFraction: null,
    blanks: [
      { options: [{ content: 'a' }, { content: 'b' }, { content: 'c' }], correctAnswerIndex: [1] },
      { options: [{ content: 'd' }, { content: 'e' }, { content: 'f' }], correctAnswerIndex: [2] },
    ],
    section: 'verbal-1',
    difficulty: 3,
  };
  assert.equal(
    evaluateQuestionAnswer(tcQ, { questionId: 'q-tc', blankSelections: { 0: 1, 1: 2 } }).isCorrect,
    true
  );
  assert.equal(
    evaluateQuestionAnswer(tcQ, { questionId: 'q-tc', blankSelections: { 0: 1, 1: 0 } }).isCorrect,
    false
  );

  // Rich answer parts for TC preserve exact ETS letters (B and F)
  const parts = getCorrectAnswerParts(tcQ);
  assert.equal(parts[0].letter, 'B');
  assert.equal(parts[1].letter, 'F');
});

test('ETS recommended timings and GRE scaled score estimator', () => {
  assert.equal(getRecommendedMinutesForScope([], 'verbal-1'), 18);
  assert.equal(getRecommendedMinutesForScope([], 'verbal-2'), 23);
  assert.equal(getRecommendedMinutesForScope([], 'quant-1'), 21);
  assert.equal(getRecommendedMinutesForScope([], 'quant-2'), 26);
  assert.equal(getRecommendedMinutesForScope([], 'awa'), 30);
  assert.equal(getRecommendedMinutesForScope([], 'verbal-all'), 41);
  assert.equal(getRecommendedMinutesForScope([], 'quant-all'), 47);

  assert.equal(estimateGreScaledScore(27, 27), 170);
  assert.equal(estimateGreScaledScore(0, 27), 130);
  assert.equal(estimateGreScaledScore(20, 27), 160);
  assert.equal(estimateGreScaledScore(0, 0), null);
});

test('classifyQuestionSubType detects Sentence Equivalence, QC, and DI accurately', () => {
  const seQ: GREQuestion = {
    _id: 'se1',
    type: 'mcq',
    content: 'Sentence with ____',
    options: Array.from({ length: 6 }, (_, i) => ({ content: `word${i}` })),
    correctAnswerIndices: [0, 4],
    correctAnswerFraction: null,
    blanks: null,
    section: 'verbal-1',
    difficulty: 3,
    singleormultiple: true,
  };
  assert.equal(classifyQuestionSubType(seQ), 'Sentence Equivalence');
});
