import {
  ErrorCategory,
  ErrorLogEntry,
  ErrorMasteryStatus,
  GREQuestion,
  GRETest,
  StudyNote,
  TestAttempt,
  UserAnswer,
} from '../types/gre';
import { classifyQuestionTopic } from './topicClassifier';

const KEYS = {
  ERROR_LOG: 'gre_studio_error_log_v1',
  NOTES: 'gre_studio_notes_v1',
  ATTEMPTS: 'gre_studio_attempts_v1',
  BOOKMARKS: 'gre_studio_bookmarks_v1',
  CUSTOM_TESTS: 'gre_studio_custom_tests_v1',
  THEME: 'gre_studio_theme_v1',
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadErrorLog(): ErrorLogEntry[] {
  return safeRead<ErrorLogEntry[]>(KEYS.ERROR_LOG, []);
}

export function saveErrorLog(entries: ErrorLogEntry[]): void {
  safeWrite(KEYS.ERROR_LOG, entries);
}

export function upsertErrorLogEntry(params: {
  question: GREQuestion;
  monthId: string;
  monthLabel: string;
  testId: string;
  testTitle: string;
  userAnswer?: UserAnswer;
  category?: ErrorCategory;
  status?: ErrorMasteryStatus;
  reflectionNote?: string;
  timeSpentMs?: number;
  incrementMistake?: boolean;
}): ErrorLogEntry[] {
  const list = loadErrorLog();
  const idx = list.findIndex((e) => e.id === params.question._id);
  const now = new Date().toISOString();

  if (idx >= 0) {
    const existing = list[idx];
    const updated: ErrorLogEntry = {
      ...existing,
      question: params.question,
      userAnswer: params.userAnswer ?? existing.userAnswer,
      category: params.category ?? existing.category,
      status: params.status ?? existing.status,
      reflectionNote:
        params.reflectionNote !== undefined ? params.reflectionNote : existing.reflectionNote,
      timeSpentMs: params.timeSpentMs ?? existing.timeSpentMs,
      updatedAt: now,
      mistakeCount: params.incrementMistake ? existing.mistakeCount + 1 : existing.mistakeCount,
    };
    list[idx] = updated;
  } else {
    const defaultCat: ErrorCategory = params.question.section.startsWith('verbal')
      ? params.question.type === 'fill-blank'
        ? 'Vocabulary Gap'
        : 'Misread Question / Trap'
      : 'Conceptual Gap';

    const created: ErrorLogEntry = {
      id: params.question._id,
      question: params.question,
      monthId: params.monthId,
      monthLabel: params.monthLabel,
      testId: params.testId,
      testTitle: params.testTitle,
      userAnswer: params.userAnswer,
      category: params.category ?? defaultCat,
      status: params.status ?? 'needs_review',
      reflectionNote: params.reflectionNote ?? '',
      timeSpentMs: params.timeSpentMs ?? 0,
      loggedAt: now,
      updatedAt: now,
      mistakeCount: 1,
    };
    list.unshift(created);
  }

  saveErrorLog(list);
  return list;
}

export function removeErrorLogEntry(questionId: string): ErrorLogEntry[] {
  const next = loadErrorLog().filter((e) => e.id !== questionId);
  saveErrorLog(next);
  return next;
}

export function loadStudyNotes(): StudyNote[] {
  return safeRead<StudyNote[]>(KEYS.NOTES, []);
}

export function saveStudyNotes(notes: StudyNote[]): void {
  safeWrite(KEYS.NOTES, notes);
}

export function upsertQuestionNote(params: {
  question: GREQuestion;
  monthId: string;
  monthLabel: string;
  testTitle: string;
  title?: string;
  content: string;
  tags: string[];
}): StudyNote[] {
  const notes = loadStudyNotes();
  const idx = notes.findIndex((n) => n.questionId === params.question._id);
  const now = new Date().toISOString();

  if (!params.content.trim() && idx >= 0) {
    // Delete if emptied
    const filtered = notes.filter((n) => n.questionId !== params.question._id);
    saveStudyNotes(filtered);
    return filtered;
  }

  if (!params.content.trim()) {
    return notes;
  }

  const defaultTitle =
    params.title?.trim() ||
    `${params.testTitle} · ${params.question.section.toUpperCase()} Q${(params.question.questionIndex ?? 0) + 1}`;
  const topicMeta = classifyQuestionTopic(params.question);

  if (idx >= 0) {
    notes[idx] = {
      ...notes[idx],
      title: defaultTitle,
      content: params.content,
      tags: params.tags,
      question: params.question,
      topicId: topicMeta.id,
      topicName: topicMeta.name,
      updatedAt: now,
    };
  } else {
    notes.unshift({
      id: `note-${params.question._id}`,
      questionId: params.question._id,
      question: params.question,
      topicId: topicMeta.id,
      topicName: topicMeta.name,
      monthId: params.monthId,
      monthLabel: params.monthLabel,
      testTitle: params.testTitle,
      title: defaultTitle,
      content: params.content,
      tags: params.tags,
      createdAt: now,
      updatedAt: now,
    });
  }

  saveStudyNotes(notes);
  return notes;
}

export function upsertTopicNote(params: {
  id?: string;
  topicId: string;
  topicName: string;
  title: string;
  content: string;
  tags: string[];
}): StudyNote[] {
  const notes = loadStudyNotes();
  const now = new Date().toISOString();
  if (!params.content.trim()) return notes;

  if (params.id) {
    const idx = notes.findIndex((n) => n.id === params.id);
    if (idx >= 0) {
      notes[idx] = {
        ...notes[idx],
        topicId: params.topicId,
        topicName: params.topicName,
        title: params.title.trim() || `${params.topicName} Revision Note`,
        content: params.content,
        tags: params.tags,
        updatedAt: now,
      };
      saveStudyNotes(notes);
      return notes;
    }
  }

  notes.unshift({
    id: `topic-note-${params.topicId}-${Date.now()}`,
    topicId: params.topicId,
    topicName: params.topicName,
    title: params.title.trim() || `${params.topicName} Revision Note`,
    content: params.content,
    tags: params.tags,
    createdAt: now,
    updatedAt: now,
  });
  saveStudyNotes(notes);
  return notes;
}

export function upsertStandaloneNote(params: {
  id?: string;
  title: string;
  content: string;
  tags: string[];
  monthId?: string;
  monthLabel?: string;
  topicId?: string;
  topicName?: string;
}): StudyNote[] {
  const notes = loadStudyNotes();
  const now = new Date().toISOString();
  if (params.id) {
    const idx = notes.findIndex((n) => n.id === params.id);
    if (idx >= 0) {
      notes[idx] = {
        ...notes[idx],
        title: params.title,
        content: params.content,
        tags: params.tags,
        topicId: params.topicId ?? notes[idx].topicId,
        topicName: params.topicName ?? notes[idx].topicName,
        updatedAt: now,
      };
      saveStudyNotes(notes);
      return notes;
    }
  }
  notes.unshift({
    id: `custom-note-${Date.now()}`,
    title: params.title || 'Untitled Study Note',
    content: params.content,
    tags: params.tags,
    monthId: params.monthId,
    monthLabel: params.monthLabel,
    topicId: params.topicId,
    topicName: params.topicName,
    createdAt: now,
    updatedAt: now,
  });
  saveStudyNotes(notes);
  return notes;
}

export function deleteStudyNote(noteId: string): StudyNote[] {
  const next = loadStudyNotes().filter((n) => n.id !== noteId);
  saveStudyNotes(next);
  return next;
}

export function loadAttempts(): TestAttempt[] {
  return safeRead<TestAttempt[]>(KEYS.ATTEMPTS, []);
}

export function saveAttempt(attempt: TestAttempt): TestAttempt[] {
  const list = loadAttempts();
  const idx = list.findIndex((a) => a.id === attempt.id);
  if (idx >= 0) {
    list[idx] = attempt;
  } else {
    list.unshift(attempt);
  }
  // Keep latest 100 attempts to avoid localStorage bloat
  const trimmed = list.slice(0, 100);
  safeWrite(KEYS.ATTEMPTS, trimmed);
  return trimmed;
}

export function loadBookmarks(): string[] {
  return safeRead<string[]>(KEYS.BOOKMARKS, []);
}

export function toggleBookmarkQuestion(questionId: string): string[] {
  const current = loadBookmarks();
  const exists = current.includes(questionId);
  const next = exists ? current.filter((id) => id !== questionId) : [...current, questionId];
  safeWrite(KEYS.BOOKMARKS, next);
  return next;
}

export function loadCustomTests(): Record<string, GRETest[]> {
  return safeRead<Record<string, GRETest[]>>(KEYS.CUSTOM_TESTS, {});
}

export function saveCustomTestsForMonth(monthId: string, tests: GRETest[]): Record<string, GRETest[]> {
  const current = loadCustomTests();
  current[monthId] = tests;
  safeWrite(KEYS.CUSTOM_TESTS, current);
  return current;
}

export function exportFullBackupJson(): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    errorLog: loadErrorLog(),
    notes: loadStudyNotes(),
    attempts: loadAttempts(),
    bookmarks: loadBookmarks(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importFullBackupJson(rawJson: string): {
  errorLog: ErrorLogEntry[];
  notes: StudyNote[];
  attempts: TestAttempt[];
  bookmarks: string[];
} {
  const parsed = JSON.parse(rawJson);
  if (Array.isArray(parsed.errorLog)) saveErrorLog(parsed.errorLog);
  if (Array.isArray(parsed.notes)) saveStudyNotes(parsed.notes);
  if (Array.isArray(parsed.attempts)) safeWrite(KEYS.ATTEMPTS, parsed.attempts);
  if (Array.isArray(parsed.bookmarks)) safeWrite(KEYS.BOOKMARKS, parsed.bookmarks);
  return {
    errorLog: loadErrorLog(),
    notes: loadStudyNotes(),
    attempts: loadAttempts(),
    bookmarks: loadBookmarks(),
  };
}

export function loadThemePreference(): 'light' | 'dark' {
  return safeRead<'light' | 'dark'>(KEYS.THEME, 'light');
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  safeWrite(KEYS.THEME, theme);
}
