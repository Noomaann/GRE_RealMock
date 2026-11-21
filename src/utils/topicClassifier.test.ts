import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GREQuestion, GRETest } from '../types/gre';
import {
  classifyQuestionTopic,
  TOPIC_CATEGORIES,
  getTopicCategoryById,
} from './topicClassifier';

test('classifies representative Quant questions into exact syllabus categories', () => {
  const cases: { q: Partial<GREQuestion>; expectedId: string }[] = [
    {
      q: {
        section: 'quant-1',
        type: 'mcq',
        content: '<p>In the $xy$-plane, line $\\ell$ passes through $(3, 3)$ and has slope $2$.</p>',
      },
      expectedId: 'quant-coordinate-geometry',
    },
    {
      q: {
        section: 'quant-1',
        type: 'mcq',
        content: '<p>If $n$ is a positive integer divisible by $6$ and leaves a remainder of $2$ when divided by $5$, what is the least prime factor of $n$?</p>',
      },
      expectedId: 'quant-number-properties',
    },
    {
      q: {
        section: 'quant-2',
        type: 'fill-blank-another',
        quantity: true,
        content: '<p>A right circular cylinder has radius $4$ and height $10$.</p>',
        blanks: [{ options: null, correctAnswerIndex: null, quantityA: 'Volume of cylinder', quantityB: '$150\\pi$' }],
      },
      expectedId: 'quant-3d-geometry',
    },
    {
      q: {
        section: 'quant-1',
        type: 'mcq',
        content: '<p>A circle with circumference $12\\pi$ is inscribed in a square. What is the perimeter of the square?</p>',
      },
      expectedId: 'quant-geometry-polygons-circles',
    },
    {
      q: {
        section: 'quant-1',
        type: 'mcq',
        content: '<p>In right triangle $ABC$, the hypotenuse is $13$ and one leg is $5$. Find angle $A$.</p>',
      },
      expectedId: 'quant-geometry-triangles',
    },
    {
      q: {
        section: 'quant-2',
        type: 'mcq',
        content: '<p>The standard deviation of a normal distribution of 500 scores is 8 and the arithmetic mean is 72.</p>',
      },
      expectedId: 'quant-statistics',
    },
    {
      q: {
        section: 'quant-2',
        type: 'mcq',
        content: '<p>How many different committees of 3 people can be chosen from 8 candidates?</p>',
      },
      expectedId: 'quant-counting-probability',
    },
    {
      q: {
        section: 'quant-1',
        type: 'fill-blank-another',
        quantity: true,
        content: '<p>$$\\vert{}6 - 2x\\vert{} = 8$$</p>',
        blanks: [{ options: null, correctAnswerIndex: null, quantityA: '$x$', quantityB: '5' }],
      },
      expectedId: 'quant-inequalities-abs',
    },
    {
      q: {
        section: 'quant-1',
        type: 'fill-blank-another',
        quantity: true,
        content: '',
        blanks: [{ options: null, correctAnswerIndex: null, quantityA: '$(0.375)^{59} - (0.375)^{58}$', quantityB: '0' }],
      },
      expectedId: 'quant-exponents-roots',
    },
    {
      q: {
        section: 'quant-2',
        type: 'data-interpretation',
        content: '<p>Bar chart of annual sales</p>',
        optiontopcontent: '<p>What was the percent increase from 2010 to 2012?</p>',
      },
      expectedId: 'quant-data-interpretation',
    },
  ];

  for (const c of cases) {
    const res = classifyQuestionTopic({
      _id: 'test-id',
      difficulty: 3,
      section: c.q.section || 'quant-1',
      type: c.q.type || 'mcq',
      content: c.q.content || '',
      ...c.q,
    } as GREQuestion);
    assert.equal(res.id, c.expectedId, `Expected ${c.expectedId}, got ${res.id} for ${c.q.content}`);
  }
});

function makeQ(partial: Partial<GREQuestion>): GREQuestion {
  return {
    _id: 'test-q',
    section: 'verbal-1',
    type: 'mcq',
    difficulty: 3,
    content: '',
    options: null,
    correctAnswerIndices: null,
    correctAnswerFraction: null,
    blanks: null,
    ...partial,
  };
}

test('classifies all Verbal sub-types accurately (TC 1/2/3, SE, RC MCQ, CR, RC Multi, Select-in-Passage)', () => {
  const tc1 = classifyQuestionTopic(
    makeQ({
      _id: 'v1',
      section: 'verbal-1',
      type: 'fill-blank',
      content: '___',
      blanks: [{ options: [], correctAnswerIndex: [0] }],
    })
  );
  assert.equal(tc1.id, 'verbal-tc-single');

  const tc2 = classifyQuestionTopic(
    makeQ({
      _id: 'v2',
      section: 'verbal-1',
      type: 'fill-blank',
      content: '___ ___',
      blanks: [
        { options: [], correctAnswerIndex: [0] },
        { options: [], correctAnswerIndex: [0] },
      ],
    })
  );
  assert.equal(tc2.id, 'verbal-tc-double');

  const tc3 = classifyQuestionTopic(
    makeQ({
      _id: 'v3',
      section: 'verbal-2',
      type: 'fill-blank',
      difficulty: 4,
      content: '___ ___ ___',
      blanks: [
        { options: [], correctAnswerIndex: [0] },
        { options: [], correctAnswerIndex: [0] },
        { options: [], correctAnswerIndex: [0] },
      ],
    })
  );
  assert.equal(tc3.id, 'verbal-tc-triple');

  const se = classifyQuestionTopic(
    makeQ({
      _id: 'v4',
      section: 'verbal-1',
      type: 'mcq',
      singleormultiple: true,
      content: 'Sentence...',
      options: Array.from({ length: 6 }, (_, i) => ({ _id: String(i), content: `w${i}` })),
      correctAnswerIndices: [0, 3],
    })
  );
  assert.equal(se.id, 'verbal-se');

  const cr = classifyQuestionTopic(
    makeQ({
      _id: 'v5',
      section: 'verbal-2',
      type: 'mcq',
      singleormultiple: false,
      difficulty: 4,
      content: 'Argument passage...',
      optiontopcontent: 'Which of the following, if true, most seriously weakens the argument?',
    })
  );
  assert.equal(cr.id, 'verbal-rc-cr');

  const rcMulti = classifyQuestionTopic(
    makeQ({
      _id: 'v6',
      section: 'verbal-2',
      type: 'mcq',
      singleormultiple: true,
      difficulty: 4,
      content: 'Passage...',
      optiontopcontent: 'Consider each of the choices separately and select all that apply.',
    })
  );
  assert.equal(rcMulti.id, 'verbal-rc-multi');

  const lineSel = classifyQuestionTopic(
    makeQ({
      _id: 'v7',
      section: 'verbal-1',
      type: 'line-select',
      content: '',
      optiontopcontent: 'Select the sentence in the passage that illustrates a paradox.',
    })
  );
  assert.equal(lineSel.id, 'verbal-rc-select-passage');
});

test('100% coverage audit across all 8 monthly GRE JSON files (4,291 questions, 0 missed)', () => {
  const dataDir = path.resolve(process.cwd(), 'public/data');
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  assert.equal(files.length, 8, 'Expected 8 monthly JSON files');

  let total = 0;
  let quantCount = 0;
  let verbalCount = 0;
  let awaCount = 0;
  const countsById: Record<string, number> = {};

  for (const file of files) {
    const tests = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) as GRETest[];
    for (const t of tests) {
      for (const q of t.questions || []) {
        total++;
        const cat = classifyQuestionTopic(q);
        assert.ok(cat && getTopicCategoryById(cat.id), `Invalid category returned for question ${q._id}`);
        countsById[cat.id] = (countsById[cat.id] || 0) + 1;
        if (cat.domain === 'quant') quantCount++;
        else if (cat.domain === 'verbal') verbalCount++;
        else if (cat.domain === 'awa') awaCount++;
      }
    }
  }

  assert.equal(total, 4291, 'Should process all 4,291 questions');
  assert.equal(quantCount + verbalCount + awaCount, total, 'Zero questions missed');
  assert.equal(quantCount, 2106, 'All 2,106 Quant questions categorized');
  assert.equal(verbalCount, 2106, 'All 2,106 Verbal questions categorized');
  assert.equal(awaCount, 79, 'All 79 AWA prompts categorized');

  // Ensure every defined category in TOPIC_CATEGORIES is populated with real questions
  for (const cat of TOPIC_CATEGORIES) {
    assert.ok(
      (countsById[cat.id] || 0) > 0,
      `Category ${cat.id} (${cat.name}) should have at least 1 question`
    );
  }
});

test('selectLatestRcSingleQuestions keeps exactly the latest 250 RC MCQ questions (Oct + latest Sep 2026)', async () => {
  const { selectLatestRcSingleQuestions, RC_SINGLE_LATEST_LIMIT } = await import('./topicClassifier');
  const dataDir = path.resolve(process.cwd(), 'public/data');
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();

  const allRcSingle: { question: GREQuestion }[] = [];
  for (const file of files) {
    const monthId = file.replace('.json', '');
    const tests = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) as GRETest[];
    for (const t of tests) {
      (t.questions || []).forEach((q, idx) => {
        const enriched: GREQuestion = {
          ...q,
          monthId,
          testId: t._id,
          testTitle: t.title,
          testDate: t.testDate,
          questionIndex: idx,
        };
        if (classifyQuestionTopic(enriched).id === 'verbal-rc-single') {
          allRcSingle.push({ question: enriched });
        }
      });
    }
  }

  assert.equal(allRcSingle.length, 816, 'Expected 816 total RC MCQ questions across all 8 months');

  const latest250 = selectLatestRcSingleQuestions(allRcSingle, RC_SINGLE_LATEST_LIMIT);
  assert.equal(latest250.length, 250, 'Should cap RC MCQ to exactly 250 questions');

  const octCount = latest250.filter((i) => i.question.monthId === '2026-10').length;
  const sepCount = latest250.filter((i) => i.question.monthId === '2026-09').length;
  const olderCount = latest250.filter(
    (i) => i.question.monthId !== '2026-10' && i.question.monthId !== '2026-09'
  ).length;

  assert.equal(octCount, 155, 'All 155 October RC MCQ questions must be included');
  assert.equal(sepCount, 95, 'Latest 95 September RC MCQ questions must be included');
  assert.equal(olderCount, 0, 'No older March–August RC MCQ questions should appear in latest 250');

  // Verify descending date order
  for (let i = 1; i < latest250.length; i++) {
    const prevDate = latest250[i - 1].question.testDate || '';
    const currDate = latest250[i].question.testDate || '';
    assert.ok(prevDate >= currDate, `Expected newest-first ordering at index ${i}`);
  }
});

test('getNotesForTopic aggregates both chapter notes and question-level notes under the exact Quant section', async () => {
  const { getNotesForTopic, getErrorsForTopic } = await import('./topicClassifier');

  const numPropQ = makeQ({
    _id: 'q-np-1',
    section: 'quant-1',
    type: 'mcq',
    content: '<p>If integer $n$ is divisible by $6$ and leaves remainder $2$ when divided by $5$, what is the least prime factor?</p>',
  });

  const coordGeoQ = makeQ({
    _id: 'q-cg-1',
    section: 'quant-2',
    type: 'mcq',
    content: '<p>In the $xy$-plane, line $k$ has slope $-3$ and passes through $(2, 5)$.</p>',
  });

  const notes = [
    {
      id: 'topic-note-1',
      topicId: 'quant-number-properties',
      topicName: 'Number Properties & Divisibility',
      title: 'Remainder shortcut formula',
      content: 'Always test n = k*d + r for divisibility traps.',
      tags: ['Formula'],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-05T00:00:00.000Z',
    },
    {
      // Legacy question note without explicit topicId — must still resolve via question classification
      id: 'qnote-q-np-1',
      questionId: numPropQ._id,
      question: numPropQ,
      title: 'Practice Question Note',
      content: 'Remember 2 is the only even prime.',
      tags: ['Trap Alert'],
      createdAt: '2026-10-02T00:00:00.000Z',
      updatedAt: '2026-10-06T00:00:00.000Z',
    },
    {
      id: 'qnote-q-cg-1',
      questionId: coordGeoQ._id,
      question: coordGeoQ,
      topicId: 'quant-coordinate-geometry',
      topicName: 'Coordinate Geometry',
      title: 'Slope note',
      content: 'Perpendicular slopes are negative reciprocals.',
      tags: ['Formula'],
      createdAt: '2026-10-02T00:00:00.000Z',
      updatedAt: '2026-10-04T00:00:00.000Z',
    },
  ];

  const npNotes = getNotesForTopic(notes, 'quant-number-properties');
  assert.equal(npNotes.length, 2, 'Should aggregate both chapter note and question note for Number Properties');
  assert.equal(npNotes[0].id, 'qnote-q-np-1', 'Most recently updated note should be first');

  const cgNotes = getNotesForTopic(notes, 'quant-coordinate-geometry');
  assert.equal(cgNotes.length, 1);
  assert.equal(cgNotes[0].id, 'qnote-q-cg-1');

  const errors = [
    {
      id: numPropQ._id,
      question: numPropQ,
      monthId: '2026-10',
      monthLabel: 'October 2026',
      testId: 't1',
      testTitle: 'Mock Test 1',
      category: 'Conceptual Gap' as const,
      status: 'needs_review' as const,
      reflectionNote: 'Missed prime edge case',
      timeSpentMs: 45000,
      loggedAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-03T00:00:00.000Z',
      mistakeCount: 1,
    },
    {
      id: coordGeoQ._id,
      question: coordGeoQ,
      monthId: '2026-10',
      monthLabel: 'October 2026',
      testId: 't1',
      testTitle: 'Mock Test 1',
      category: 'Formula Forgotten' as const,
      status: 'reviewing' as const,
      reflectionNote: 'Forgot slope-intercept sign',
      timeSpentMs: 60000,
      loggedAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
      mistakeCount: 1,
    },
  ];

  const npErrors = getErrorsForTopic(errors, 'quant-number-properties');
  assert.equal(npErrors.length, 1);
  assert.equal(npErrors[0].id, numPropQ._id);

  const cgErrors = getErrorsForTopic(errors, 'quant-coordinate-geometry');
  assert.equal(cgErrors.length, 1);
  assert.equal(cgErrors[0].id, coordGeoQ._id);
});

