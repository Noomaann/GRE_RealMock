import { ErrorLogEntry, GREQuestion, StudyNote } from '../types/gre';

export type TopicDomain = 'quant' | 'verbal' | 'awa';

export interface TopicCategoryDef {
  id: string;
  name: string;
  domain: TopicDomain;
  pillar: string;
  description: string;
  order: number;
}

export const TOPIC_CATEGORIES: TopicCategoryDef[] = [
  // ===================== QUANTITATIVE REASONING (16 Detailed Categories across 4 ETS Pillars) =====================
  // Pillar 1: Arithmetic
  {
    id: 'quant-number-properties',
    name: 'Number Properties',
    domain: 'quant',
    pillar: 'Arithmetic',
    description: 'Primes, factors, divisibility, remainders, odd/even, digits, GCD/LCM, consecutive integers',
    order: 1,
  },
  {
    id: 'quant-fractions-ratios',
    name: 'Fractions, Decimals & Ratios',
    domain: 'quant',
    pillar: 'Arithmetic',
    description: 'Fractions, reciprocals, decimals, place value, ratios, proportions, direct & inverse variation',
    order: 2,
  },
  {
    id: 'quant-percentages-interest',
    name: 'Percentages, Profit & Interest',
    domain: 'quant',
    pillar: 'Arithmetic',
    description: 'Percent increase/decrease, discounts, tax, profit/loss, simple & compound interest',
    order: 3,
  },
  {
    id: 'quant-exponents-roots',
    name: 'Exponents & Roots',
    domain: 'quant',
    pillar: 'Arithmetic',
    description: 'Powers, negative & fractional exponents, radicals, square/cube roots, scientific notation',
    order: 4,
  },

  // Pillar 2: Algebra
  {
    id: 'quant-linear-algebra',
    name: 'Linear Equations & Algebra',
    domain: 'quant',
    pillar: 'Algebra',
    description: 'Linear equations, systems of equations, algebraic expressions, substitution & word translation',
    order: 5,
  },
  {
    id: 'quant-quadratics-polynomials',
    name: 'Quadratics & Polynomials',
    domain: 'quant',
    pillar: 'Algebra',
    description: 'Quadratic equations, roots, factoring, algebraic identities, binomial expansion & polynomials',
    order: 6,
  },
  {
    id: 'quant-inequalities-abs',
    name: 'Inequalities & Absolute Value',
    domain: 'quant',
    pillar: 'Algebra',
    description: 'Linear/compound inequalities, absolute value equations, min/max bounds & constraints',
    order: 7,
  },
  {
    id: 'quant-functions-sequences',
    name: 'Functions & Sequences',
    domain: 'quant',
    pillar: 'Algebra',
    description: 'Function notation, custom symbol operators, arithmetic/geometric & recursive sequences',
    order: 8,
  },
  {
    id: 'quant-word-problems',
    name: 'Word Problems: Rates, Work & Mixtures',
    domain: 'quant',
    pillar: 'Algebra',
    description: 'Distance-rate-time, average speed, combined work rates, solutions/mixtures & applied problems',
    order: 9,
  },

  // Pillar 3: Geometry
  {
    id: 'quant-geometry-triangles',
    name: 'Geometry: Lines, Angles & Triangles',
    domain: 'quant',
    pillar: 'Geometry',
    description: 'Parallel lines, angles, triangles, Pythagorean theorem, special right triangles & similarity',
    order: 10,
  },
  {
    id: 'quant-geometry-polygons-circles',
    name: 'Geometry: Polygons & Circles',
    domain: 'quant',
    pillar: 'Geometry',
    description: 'Quadrilaterals, regular polygons, circles, circumference, arcs, sectors, chords & inscribed figures',
    order: 11,
  },
  {
    id: 'quant-coordinate-geometry',
    name: 'Coordinate Geometry',
    domain: 'quant',
    pillar: 'Geometry',
    description: 'xy-plane, slope, intercepts, line equations, midpoint, distance formula, quadrants & parabolas',
    order: 12,
  },
  {
    id: 'quant-3d-geometry',
    name: '3D Geometry (Solid Figures)',
    domain: 'quant',
    pillar: 'Geometry',
    description: 'Cubes, rectangular solids, cylinders, spheres, cones, prisms, volume & surface area',
    order: 13,
  },

  // Pillar 4: Data Analysis
  {
    id: 'quant-statistics',
    name: 'Statistics & Data Analysis',
    domain: 'quant',
    pillar: 'Data Analysis',
    description: 'Mean, median, mode, range, standard deviation, normal distribution, quartiles & percentiles',
    order: 14,
  },
  {
    id: 'quant-counting-probability',
    name: 'Counting, Sets & Probability',
    domain: 'quant',
    pillar: 'Data Analysis',
    description: 'Permutations, combinations, probability, independent events, Venn diagrams & overlapping sets',
    order: 15,
  },
  {
    id: 'quant-data-interpretation',
    name: 'Data Interpretation (Charts & Tables)',
    domain: 'quant',
    pillar: 'Data Analysis',
    description: 'Multi-question bar graphs, line charts, pie charts, scatterplots & tabular data sets',
    order: 16,
  },

  // ===================== VERBAL REASONING (8 Detailed Categories across 2 ETS Pillars) =====================
  // Pillar 1: Vocabulary & Text Completion
  {
    id: 'verbal-tc-single',
    name: 'Text Completion — Single Blank (1-Blank)',
    domain: 'verbal',
    pillar: 'Text Completion & Sentence Equivalence',
    description: 'One-blank contextual vocabulary & logical contrast/support completion (5 choices)',
    order: 101,
  },
  {
    id: 'verbal-tc-double',
    name: 'Text Completion — Double Blank (2-Blank)',
    domain: 'verbal',
    pillar: 'Text Completion & Sentence Equivalence',
    description: 'Two interdependent blanks requiring cohesive sentence logic (3 choices per blank)',
    order: 102,
  },
  {
    id: 'verbal-tc-triple',
    name: 'Text Completion — Triple Blank (3-Blank)',
    domain: 'verbal',
    pillar: 'Text Completion & Sentence Equivalence',
    description: 'Multi-sentence passage completion with three coordinated blanks (3 choices each)',
    order: 103,
  },
  {
    id: 'verbal-se',
    name: 'Sentence Equivalence (SE)',
    domain: 'verbal',
    pillar: 'Text Completion & Sentence Equivalence',
    description: 'Select the exact 2 synonym choices out of 6 that produce equivalent sentence meanings',
    order: 104,
  },

  // Pillar 2: Reading Comprehension & Critical Reasoning
  {
    id: 'verbal-rc-single',
    name: 'Reading Comp — Single Choice (RC MCQ)',
    domain: 'verbal',
    pillar: 'Reading Comprehension & Critical Reasoning',
    description: 'Primary purpose, inference, detail, tone, passage organization & vocabulary-in-context',
    order: 105,
  },
  {
    id: 'verbal-rc-cr',
    name: 'Critical Reasoning & Argument Analysis',
    domain: 'verbal',
    pillar: 'Reading Comprehension & Critical Reasoning',
    description: 'Weaken, strengthen, assumption, flaw, paradox/reconcile, boldface role & logical completion',
    order: 106,
  },
  {
    id: 'verbal-rc-multi',
    name: 'Reading Comp — Multiple Answer (Select All)',
    domain: 'verbal',
    pillar: 'Reading Comprehension & Critical Reasoning',
    description: 'Select one, two, or all three statements supported by the passage (no partial credit)',
    order: 107,
  },
  {
    id: 'verbal-rc-select-passage',
    name: 'Reading Comp — Select-in-Passage',
    domain: 'verbal',
    pillar: 'Reading Comprehension & Critical Reasoning',
    description: 'Click the exact sentence inside the passage that fulfills the specified rhetorical role',
    order: 108,
  },

  // ===================== ANALYTICAL WRITING =====================
  {
    id: 'awa-issue-essay',
    name: 'Analytical Writing (Analyze an Issue)',
    domain: 'awa',
    pillar: 'Analytical Writing Assessment',
    description: 'Official 30-minute GRE Issue Essay prompts with ETS 6-point scoring rubric checklist',
    order: 201,
  },
];

const CATEGORY_MAP: Record<string, TopicCategoryDef> = Object.fromEntries(
  TOPIC_CATEGORIES.map((c) => [c.id, c])
);

export function getTopicCategoryById(id: string): TopicCategoryDef | undefined {
  return CATEGORY_MAP[id];
}

function stripKeepLatex(rawHtml: string | null | undefined): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQuantCoreText(q: GREQuestion): string {
  const isQC = q.type === 'fill-blank-another' || Boolean(q.quantity);
  const parts: (string | null | undefined)[] = [
    q.content,
    q.contentnote,
    q.optiontopcontent,
    q.bottomcontent,
    q.textsymbol,
    ...(q.blanks || []).flatMap((b) => [
      b.quantityA,
      b.quantityB,
      b.optioncontent,
      b.optioncontent2,
    ]),
    // Exclude standard 4 QC boilerplate option sentences so they don't add noise
    ...(isQC ? [] : (q.options || []).map((o) => o.content)),
  ];
  return stripKeepLatex(parts.filter(Boolean).join(' '));
}

function classifyQuantCategoryId(q: GREQuestion): string {
  if (q.type === 'data-interpretation') {
    return 'quant-data-interpretation';
  }

  const raw = getQuantCoreText(q);
  const t = raw.toLowerCase();
  const hasImg = [
    q.content,
    q.optiontopcontent,
    ...(q.blanks || []).map((b) => `${b.quantityA || ''} ${b.quantityB || ''}`),
  ].some((s) => String(s || '').includes('<img'));

  const scores: Record<string, number> = {
    'quant-coordinate-geometry': 0,
    'quant-3d-geometry': 0,
    'quant-geometry-polygons-circles': 0,
    'quant-geometry-triangles': 0,
    'quant-counting-probability': 0,
    'quant-statistics': 0,
    'quant-word-problems': 0,
    'quant-percentages-interest': 0,
    'quant-functions-sequences': 0,
    'quant-exponents-roots': 0,
    'quant-quadratics-polynomials': 0,
    'quant-inequalities-abs': 0,
    'quant-number-properties': 0,
    'quant-fractions-ratios': 0,
    'quant-linear-algebra': 0,
  };

  const add = (id: string, pts: number, re: RegExp) => {
    if (re.test(t)) scores[id] += pts;
  };
  const addRaw = (id: string, pts: number, re: RegExp) => {
    if (re.test(raw)) scores[id] += pts;
  };

  // 1. Coordinate Geometry
  add(
    'quant-coordinate-geometry',
    18,
    /\b(xy\s*-\s*plane|xy plane|coordinate plane|rectangular coordinate|x\s*-\s*axis|y\s*-\s*axis|x\s*-\s*intercept|y\s*-\s*intercept|quadrant|quadrants|slope|slopes|parabola|collinear|origin\s*\(\s*0\s*,\s*0\s*\))\b/
  );
  add(
    'quant-coordinate-geometry',
    13,
    /\bcoordinates?\b.*\([-\d\w\s,/.]+\)|\bpoints?\s+[a-z]?\s*\(\s*[-\d\w.]+\s*,\s*[-\d\w.]+\s*\)|\bline\s+([a-z]|\\ell)\b.*\b(passes through|point\s*\(|slope|intercept)/
  );
  add(
    'quant-coordinate-geometry',
    11,
    /\by\s*=\s*[-+]?\s*\d*\.?\d*\s*x\s*[-+]|y\s*=\s*mx\s*\+\s*b|\bmidpoint\b|\bdistance between (the )?points\b|\bgraph of (the equation|y\s*=|f\s*\(\s*x\s*\))\b|\breflection across\b|\bnumber line\b/
  );

  // 2. 3D Geometry (Solids)
  add(
    'quant-3d-geometry',
    16,
    /\b(cylinder|cylindrical|sphere|spherical|cone|conical|prism|pyramid|rectangular solid|cube|cubes|cubical|surface area|volume of|cubic (inch|inches|feet|foot|meter|meters|centimeter|centimeters|unit|units)|solid figure|faces? of (a|the) cube|edges? of (a|the) cube|right circular)\b/
  );
  add(
    'quant-3d-geometry',
    11,
    /\b(volume|lateral surface|hollow box|water tank|aquarium|dimensions?\s+\d+\s*(by|x|\\times)\s*\d+\s*(by|x|\\times)\s*\d+)\b/
  );

  // 3. Geometry: Polygons & Circles
  add(
    'quant-geometry-polygons-circles',
    15,
    /\b(circle|circles|circular|circumference|radius|radii|diameter|semicircle|chord|arc\b|arcs\b|sector|tangent to|concentric|inscribed|circumscribed|annulus)\b/
  );
  add(
    'quant-geometry-polygons-circles',
    14,
    /\b(polygon|polygons|quadrilateral|parallelogram|rectangle|rectangles|rectangular|square\b|squares\b|trapezoid|rhombus|pentagon|hexagon|octagon|decagon|diagonal|diagonals|perimeter|interior angle|exterior angle|regular \w+gon)\b/
  );
  add('quant-geometry-polygons-circles', 7, /\\pi\b|\bpi\b/);

  // 4. Geometry: Lines, Angles & Triangles
  add(
    'quant-geometry-triangles',
    15,
    /\b(triangle|triangles|triangular|hypotenuse|pythagorean|isosceles|equilateral|scalene|right angle|acute angle|obtuse angle|vertical angles?|supplementary|complementary|bisect|bisector|parallel lines?|perpendicular|line segment|degree measure|degrees?|angle\s+[a-z]{1,3}\b|\\angle|\\triangle|\\perp|\\parallel|\^\\circ|due north|due south|due east|due west)\b/
  );
  add(
    'quant-geometry-triangles',
    8,
    /\b(altitude|base and height|area of (the )?(shaded|region|figure)|shaded region|figure above|figure shown|not drawn to scale|vertices|vertex|congruent|similar figures?)\b/
  );
  addRaw('quant-geometry-triangles', 10, /\b[A-Z]{2}\s*=\s*(\d*[A-Z]{2}|\d+)/);
  if (hasImg) {
    add(
      'quant-geometry-triangles',
      6,
      /\b(length|area|angle|side|sides|point|points|line|lines|region|figure)\b/
    );
  }

  // 5. Counting, Sets & Probability
  add(
    'quant-counting-probability',
    16,
    /\b(probability|probable|randomly selected|selected at random|chosen at random|at random|independent events?|mutually exclusive|fair coin|coins? (is|are) (tossed|flipped)|dice|die\b|deck of.*random|cards? drawn|marbles?|urn|expected value)\b/
  );
  add(
    'quant-counting-probability',
    16,
    /\b(permutation|permutations|combination|combinations|how many different ways|how many ways|how many different (groups|committees|teams|pairs|codes|passwords|orders|arrangements|triples|subsets|sums|products|values)|arrangements?|committee|committees|subsets?|factorial|choose\s+\d+|license plate|password|passcode|codes? can be formed|ordered pairs?)\b/
  );
  add(
    'quant-counting-probability',
    14,
    /\b(venn diagram|overlapping|neither\b.*\bnor\b|both\s+\w+\s+and\s+\w+.*neither|union|intersection|disjoint|at least one of the two|members belong to|enrolled in both|study both|speak both|answered either yes or no|taking \w+ and \d+ are taking|two questions|of the \d+ \w+.*,\s*\d+ .* and \d+ )\b/
  );
  add(
    'quant-counting-probability',
    12,
    /\b(selected from set|chosen from set|members of set|elements of set|set [a-z]\s*=\s*\\?\{|\bset [a-z]\b.*\bset [a-z]\b)/
  );

  // 6. Statistics & Data Analysis
  add(
    'quant-statistics',
    16,
    /\b(standard deviation|variance|normal distribution|normally distributed|bell curve|quartile|quartiles|interquartile|percentile|percentiles|boxplot|box plot|frequency distribution|histogram|dot plot|scatter ?plot|correlation)\b/
  );
  add(
    'quant-statistics',
    15,
    /\b(arithmetic mean|median|mode\b|weighted average|average \(arithmetic mean\)|mean of the|range of the (numbers|set|list|data|scores|values|measurements|ages|weights|heights|prices|temperatures)|distribution of|data set|list of \d+ numbers|set of \d+ numbers|average of the)\b/
  );
  add(
    'quant-statistics',
    9,
    /\b(average|mean\b|least value|greatest value|frequency table|survey|poll of \d+|distribution|graphs? above|table above|chart above)\b/
  );

  // 7. Word Problems: Rates, Work & Mixtures
  add(
    'quant-word-problems',
    16,
    /\b(miles per hour|kilometers per hour|mph|km\/h|meters per second|constant rates?|average speed|traveling at|drove|driving|bicycle|train|car\b.*miles|distance between|round trip|upstream|downstream|speed of)\b/
  );
  add(
    'quant-word-problems',
    16,
    /\b(working together|working alone|at the same constant rate|machines? working|machine [a-z]\b.*rate|pumps? fill|pipe|pipes|faucet|drain|hours to complete|days to complete|job together|rate of \d+|hourly rate|fixed fee)\b/
  );
  add(
    'quant-word-problems',
    16,
    /\b(mixture|mixtures|solution|concentration|saline|alcohol|acid|alloy|pure water|evaporat|blended|mixed with|ounces of.*percent|liters of.*percent)\b/
  );
  add(
    'quant-word-problems',
    10,
    /\b(years old|older than|younger than|twice as old|cost per|price per|dollars per|per hour|per minute|per second|per gallon|per pound|per mile|per day|per week|per month|packages? of|hotdogs|buns|tickets?|coins?.*cents|dimes|nickels|quarters|pennies|books? as|apples|oranges|widgets)\b/
  );

  // 8. Percentages, Profit & Interest
  add(
    'quant-percentages-interest',
    15,
    /\b(percent|percentage|%|compound interest|simple interest|annual interest|compounded|discount|markup|markdown|profit|revenue|sales tax|commission|depreciat|appreciat|original price|sale price|retail price|wholesale)\b/
  );
  add(
    'quant-percentages-interest',
    11,
    /\b(increased by|decreased by|percent increase|percent decrease|percent change|percent greater|percent less|percent of)\b/
  );

  // 9. Functions & Sequences
  add(
    'quant-functions-sequences',
    16,
    /\b(sequence|sequences|nth term|n-th term|a_n|a_1|a_2|a_\{n|s_n|t_n|arithmetic sequence|geometric sequence|recursive|terms? of (a|the) sequence|first term|each term after the first|each month after the first|each year after the first|each week after the first|each day after the first|and so on in (increasing|decreasing) order)\b/
  );
  add(
    'quant-functions-sequences',
    16,
    /\b(function|functions|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\)|h\s*\(\s*x\s*\)|f\s*\(\s*\d|g\s*\(\s*\d|domain of|range of the function|defined for all.*by|defined as|for all numbers.*let\s+[a-z]|\\diamond|\\odot|\\oplus|\\star|\\otimes)\b/
  );

  // 10. Exponents & Roots
  add(
    'quant-exponents-roots',
    15,
    /\b(square root|cube root|radical|exponent|exponents|scientific notation|power of \d+|powers of|\\sqrt)\b/
  );
  add(
    'quant-exponents-roots',
    12,
    /\b(2|3|4|5|6|7|8|9|10)\^\{?[-+]?[a-z0-9+-\s]{1,10}\}?|\)\^\{?[-+]?\d+|\b[a-z]\^\{?[-+]?[a-z]\b|\b[a-z]\^\{?-[0-9]|\b[a-z]\^\{?[3-9]/
  );

  // 11. Quadratics & Polynomials
  add(
    'quant-quadratics-polynomials',
    15,
    /\b(quadratic|polynomial|factor of\s+\(?x|roots? of (the )?equation|discriminant|binomial|trinomial|in the expansion of|coefficient of|like terms)\b/
  );
  add(
    'quant-quadratics-polynomials',
    12,
    /[a-z]\^\{?2\}?|\([a-z]\s*[+-]\s*\d+\)\([a-z]\s*[+-]\s*\d+\)|\([a-z]\s*[+-]\s*[a-z]\)\^\{?2\}?/
  );

  // 12. Inequalities & Absolute Value
  add(
    'quant-inequalities-abs',
    16,
    /\b(absolute value|inequality|inequalities)\b|\|[a-z0-9\s+-]+\||\\lvert|\\rvert|\\vert/
  );
  add(
    'quant-inequalities-abs',
    12,
    /\\le|\\ge|\\leq|\\geq|<=|>=|[a-z0-9)]\s*[<>]\s*[-\d\w]/
  );
  add(
    'quant-inequalities-abs',
    9,
    /\b(no more than|at most|at least|maximum possible|minimum possible|greatest possible|least possible|less than \d+|greater than \d+|more than \d+|fewer than \d+)\b/
  );

  // 13. Number Properties
  add(
    'quant-number-properties',
    15,
    /\b(prime number|prime factor|prime factorization|divisible by|divisor|divisors|remainder|multiple of|multiples of|greatest common|least common|gcd|lcm|even integer|odd integer|consecutive integer|consecutive even|consecutive odd|units digit|tens digit|hundreds digit|digit integer|two-digit|three-digit|positive integer|negative integer|nonzero integer|product of the integers|sum of the integers|factors? of \d+|prime integers?|same number of.*(cards|left over)|distributed.*one at a time)\b/
  );
  add('quant-number-properties', 12, /\d+!|\b[a-z]!\b/);
  add(
    'quant-number-properties',
    8,
    /\b(integer|integers|prime|odd|even|digit|digits|factor|factors|multiple|nonzero|positive numbers?|negative numbers?)\b/
  );

  // 14. Fractions, Decimals & Ratios
  add(
    'quant-fractions-ratios',
    15,
    /\b(ratio of|ratios|proportion|proportional|directly proportional|inversely proportional|reciprocal|decimal|decimals|tenths|hundredths|thousandths|terminating decimal|repeating decimal|fraction|fractions|numerator|denominator|reduced to lowest|mixed number)\b/
  );
  add(
    'quant-fractions-ratios',
    9,
    /\\frac\{|\\dfrac\{|\b\d+\s*:\s*\d+\b|\b(one-half|one-third|two-thirds|one-fourth|three-fourths|one-fifth|half of|third of|fourth of|quarter of)\b/
  );

  // 15. Linear Equations & Algebra
  add(
    'quant-linear-algebra',
    10,
    /\b(equation|equations|solve for|value of|in terms of|algebraic|expression|system of|linear|substitute|simplify|equivalent to|more than the number of|twice as many|total of \d+|total price of)\b/
  );
  add(
    'quant-linear-algebra',
    9,
    /[a-z]\s*=\s*[-+]?\d|[-+]?\d*\s*\(?[a-z0-9\s+-]+\)?\s*=\s*[-+]?\d|[a-z]\s*[+-]\s*\d+.*=|\d+\s*\([a-z]\s*[+-]\s*\d+\)|\d[\d,]*[a-z]\s*[+-]\s*\d+/
  );

  let bestId = 'quant-linear-algebra';
  let bestScore = 0;
  for (const [id, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  if (bestScore === 0) {
    return hasImg ? 'quant-geometry-triangles' : 'quant-linear-algebra';
  }
  return bestId;
}

function classifyVerbalCategoryId(q: GREQuestion): string {
  if (q.type === 'fill-blank') {
    const n = q.blanks?.length || 1;
    if (n === 1) return 'verbal-tc-single';
    if (n === 2) return 'verbal-tc-double';
    return 'verbal-tc-triple';
  }

  if (q.type === 'line-select') {
    return 'verbal-rc-select-passage';
  }

  if (q.type === 'mcq') {
    if (q.singleormultiple && !q.optiontopcontent) {
      return 'verbal-se';
    }
    if (q.singleormultiple && q.optiontopcontent) {
      return 'verbal-rc-multi';
    }
    const stem = stripKeepLatex(q.optiontopcontent || q.content).toLowerCase();
    const isCriticalReasoning =
      /\b(weaken|weakens|strengthen|strengthens|assumption|assumes|assumed|boldface|boldfaced|flaw|paradox|discrepancy|reconcile|logically completes|most seriously undermines|cast doubt|casts doubt|call into question|evaluate the argument|reasoning in the argument|vulnerable to criticism|argument depends on)\b/.test(
        stem
      );
    if (isCriticalReasoning) {
      return 'verbal-rc-cr';
    }
    return 'verbal-rc-single';
  }

  return 'verbal-rc-single';
}

/**
 * Deterministically assigns EVERY GRE question (Quant, Verbal, or AWA) to an exact
 * detailed study category. Guarantees 100% coverage with zero uncategorized questions.
 */
export function classifyQuestionTopic(q: GREQuestion): TopicCategoryDef {
  if (q.section === 'awa' || q.type === 'sidebyside') {
    return CATEGORY_MAP['awa-issue-essay'];
  }
  if (q.section && q.section.startsWith('verbal')) {
    const id = classifyVerbalCategoryId(q);
    return CATEGORY_MAP[id] || CATEGORY_MAP['verbal-rc-single'];
  }
  const id = classifyQuantCategoryId(q);
  return CATEGORY_MAP[id] || CATEGORY_MAP['quant-linear-algebra'];
}

/**
 * Generates a normalized deduplication signature so learners can optionally hide
 * repeated questions that appear across multiple monthly mocks.
 */
export function getQuestionDedupKey(q: GREQuestion): string {
  const core = stripKeepLatex(
    `${q.content || ''} ${q.optiontopcontent || ''} ${(q.blanks || [])
      .map((b) => `${b.quantityA || ''} ${b.quantityB || ''}`)
      .join(' ')}`
  )
    .toLowerCase()
    .slice(0, 220);
  return `${q.section.slice(0, 5)}::${q.type}::${core}`;
}

export const RC_SINGLE_LATEST_LIMIT = 250;

/**
 * Sorts Reading Comprehension Single-Choice (RC MCQ) items newest-first by testDate
 * (falling back to monthId) and keeps the latest `limit` questions (default 250).
 * Within the same test, preserves original ascending questionIndex order.
 */
export function selectLatestRcSingleQuestions<T extends { question: GREQuestion }>(
  items: T[],
  limit = RC_SINGLE_LATEST_LIMIT
): T[] {
  const sorted = [...items].sort((a, b) => {
    const dateA = a.question.testDate || `${a.question.monthId || '0000-00'}-01T00:00:00.000Z`;
    const dateB = b.question.testDate || `${b.question.monthId || '0000-00'}-01T00:00:00.000Z`;
    if (dateA !== dateB) return dateB.localeCompare(dateA);

    const monthA = a.question.monthId || '';
    const monthB = b.question.monthId || '';
    if (monthA !== monthB) return monthB.localeCompare(monthA);

    const titleA = a.question.testTitle || '';
    const titleB = b.question.testTitle || '';
    if (titleA !== titleB) return titleB.localeCompare(titleA);

    return (a.question.questionIndex ?? 0) - (b.question.questionIndex ?? 0);
  });

  return sorted.slice(0, Math.max(0, limit));
}

/**
 * Resolves the canonical Topic Bank category ID for any StudyNote:
 * - Uses explicit `note.topicId` if present (chapter revision notes & newly saved question notes)
 * - Falls back to classifying `note.question` so pre-existing question notes also aggregate
 *   automatically under their exact Quant/Verbal section.
 */
export function resolveNoteTopicId(note: StudyNote): string | null {
  if (note.topicId) return note.topicId;
  if (note.question) return classifyQuestionTopic(note.question).id;
  return null;
}

/**
 * Returns all chapter-level AND question-level study notes belonging to a specific topic,
 * sorted with most recently updated notes first.
 */
export function getNotesForTopic(notes: StudyNote[], topicId: string): StudyNote[] {
  return notes
    .filter((n) => resolveNoteTopicId(n) === topicId)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

/**
 * Returns all Error Log entries whose underlying question belongs to the given topic,
 * sorted with most recently updated entries first.
 */
export function getErrorsForTopic(errorLog: ErrorLogEntry[], topicId: string): ErrorLogEntry[] {
  return errorLog
    .filter((e) => e.question && classifyQuestionTopic(e.question).id === topicId)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

