export interface GREOption {
  _id?: string;
  content: string;
}

export interface GREBlank {
  options: GREOption[] | null;
  correctAnswerIndex: number[] | null;
  optioncontent?: string;
  quantityA?: string | null;
  quantityB?: string | null;
  optioncontent2?: string | null;
}

export interface GREFraction {
  numerator: number;
  denominator: number;
  _id?: string;
}

export type GRESection = 'verbal-1' | 'verbal-2' | 'quant-1' | 'quant-2' | 'awa' | string;

export type GREQuestionType =
  | 'fill-blank'
  | 'mcq'
  | 'fill-blank-another'
  | 'frequency'
  | 'data-interpretation'
  | 'sidebyside'
  | 'line-select';

export interface GREQuestion {
  _id: string;
  type: GREQuestionType;
  content: string;
  bottomcontent?: string;
  contentnote?: string;
  optiontopcontent?: string;
  optionbottomcontent?: string;
  optionnote?: string;
  copypast?: boolean;
  quantity?: boolean;
  singleormultiple?: boolean;
  optionstype?: 'horizontal' | 'vertical' | string;
  textorsymbol?: boolean;
  textsymbol?: string;
  textalign?: boolean;
  options: GREOption[] | null;
  correctAnswerIndices: number[] | null;
  correctAnswerFraction: GREFraction | null;
  blanks: GREBlank[] | null;
  diLayout?: string | null;
  diSubType?: string | null;
  diPrefix?: string | null;
  diSuffix?: string | null;
  section: GRESection;
  difficulty: number;
  // Attached metadata at runtime
  monthId?: string;
  monthLabel?: string;
  testId?: string;
  testTitle?: string;
  testDate?: string;
  questionIndex?: number;
}

export interface GRETest {
  _id: string;
  title: string;
  testDate?: string;
  questions: GREQuestion[];
  monthId?: string;
  monthLabel?: string;
}

export interface MonthConfig {
  id: string;
  label: string;
  shortLabel: string;
  expectedTests: number;
  fileUrl: string;
}

export interface UserAnswer {
  questionId: string;
  // For MCQ, QC, Line-Select, DI-MCQ
  selectedIndices?: number[];
  // For fill-blank (map from blank index 0,1,2 to selected option index)
  blankSelections?: Record<number, number>;
  // For numeric entry (frequency / DI numeric)
  numericValue?: string;
  numericNumerator?: string;
  numericDenominator?: string;
  // For AWA essay
  essayText?: string;
  // Eliminated (crossed-out) options
  eliminatedIndices?: number[];
  eliminatedBlanks?: Record<number, number[]>;
  // Marked for review flag
  markedForReview?: boolean;
  // Instant check revealed in untimed mode
  checked?: boolean;
}

export type ErrorCategory =
  | 'Conceptual Gap'
  | 'Calculation / Careless'
  | 'Vocabulary Gap'
  | 'Misread Question / Trap'
  | 'Time Pressure'
  | 'Formula Forgotten';

export type ErrorMasteryStatus = 'needs_review' | 'reviewing' | 'mastered';

export interface ErrorLogEntry {
  id: string; // questionId
  question: GREQuestion;
  monthId: string;
  monthLabel: string;
  testId: string;
  testTitle: string;
  userAnswer?: UserAnswer;
  category: ErrorCategory;
  status: ErrorMasteryStatus;
  reflectionNote: string;
  timeSpentMs: number;
  loggedAt: string;
  updatedAt: string;
  mistakeCount: number;
}

export interface StudyNote {
  id: string;
  questionId?: string; // Optional: linked to a specific question, or standalone/topic note
  question?: GREQuestion;
  topicId?: string; // Linked Quant/Verbal syllabus topic ID
  topicName?: string; // Human-readable topic name for revision grouping
  monthId?: string;
  monthLabel?: string;
  testTitle?: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
  createdAt: string;
}

export interface TestAttempt {
  id: string;
  monthId: string;
  monthLabel: string;
  testId: string;
  testTitle: string;
  mode: 'timed' | 'untimed';
  sectionFilter: string;
  startedAt: string;
  completedAt?: string;
  totalQuestions: number;
  GradableQuestions: number;
  correctCount: number;
  answeredCount: number;
  accuracyPercent: number;
  totalTimeMs: number;
  answers: Record<string, UserAnswer>;
  timeSpentByQuestion: Record<string, number>;
  questionsSnapshot: GREQuestion[];
}

export interface PracticeSessionConfig {
  title: string;
  subtitle: string;
  monthId: string;
  monthLabel: string;
  testId: string;
  testTitle: string;
  mode: 'timed' | 'untimed';
  timeLimitMinutes: number;
  sectionFilter: string;
  questions: GREQuestion[];
  instantFeedbackAllowed: boolean;
  alwaysShowAnswers?: boolean;
}
