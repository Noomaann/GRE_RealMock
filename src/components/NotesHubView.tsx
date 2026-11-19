import React, { useMemo, useState } from 'react';
import { GREQuestion, StudyNote } from '../types/gre';
import {
  MONTH_CONFIGS,
  NOTE_TAG_PRESETS,
  stripHtmlToText,
} from '../utils/greLogic';
import { QuestionRenderer } from './QuestionRenderer';
import { RichAnswerSummary } from './RichAnswerSummary';
import {
  NotebookPen,
  Plus,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  X,
} from 'lucide-react';

interface NotesHubViewProps {
  notes: StudyNote[];
  onSaveStandaloneNote: (params: {
    id?: string;
    title: string;
    content: string;
    tags: string[];
    monthId?: string;
    monthLabel?: string;
  }) => void;
  onSaveQuestionNote: (params: {
    question: GREQuestion;
    monthId: string;
    monthLabel: string;
    testTitle: string;
    content: string;
    tags: string[];
  }) => void;
  onDeleteNote: (noteId: string) => void;
  onPracticeQuestion: (question: GREQuestion, title: string) => void;
}

export const NotesHubView: React.FC<NotesHubViewProps> = ({
  notes,
  onSaveStandaloneNote,
  onSaveQuestionNote,
  onDeleteNote,
  onPracticeQuestion,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [expandedQuestionNotes, setExpandedQuestionNotes] = useState<Record<string, boolean>>({});

  // Standalone note creation / editing modal state
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingNoteId, setEditingNoteId] = useState<string | undefined>(undefined);
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [draftTags, setDraftTags] = useState<string[]>(['Vocab']);
  const [draftMonthId, setDraftMonthId] = useState<string>('2026-03');

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedTag !== 'all' && !n.tags.includes(selectedTag)) return false;
      if (monthFilter !== 'all' && n.monthId !== monthFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = n.title.toLowerCase().includes(q);
        const inContent = n.content.toLowerCase().includes(q);
        const inQuestion = n.question
          ? stripHtmlToText(n.question.content).toLowerCase().includes(q)
          : false;
        if (!inTitle && !inContent && !inQuestion) return false;
      }
      return true;
    });
  }, [notes, selectedTag, monthFilter, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingNoteId(undefined);
    setDraftTitle('');
    setDraftContent('');
    setDraftTags(['Vocab']);
    setIsCreating(true);
  };

  const handleOpenEditModal = (note: StudyNote) => {
    setEditingNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftTags(note.tags);
    setDraftMonthId(note.monthId || '2026-03');
    setIsCreating(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim()) return;

    const existing = notes.find((n) => n.id === editingNoteId);
    if (existing && existing.question) {
      onSaveQuestionNote({
        question: existing.question,
        monthId: existing.monthId || '2026-03',
        monthLabel: existing.monthLabel || 'March 2026',
        testTitle: existing.testTitle || 'Mock Test',
        content: draftContent,
        tags: draftTags,
      });
    } else {
      const mObj = MONTH_CONFIGS.find((m) => m.id === draftMonthId);
      onSaveStandaloneNote({
        id: editingNoteId,
        title: draftTitle.trim() || 'GRE Study Note',
        content: draftContent,
        tags: draftTags,
        monthId: draftMonthId,
        monthLabel: mObj?.label || draftMonthId,
      });
    }
    setIsCreating(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Study Notes &amp; Vocabulary Notebook
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            All your question-specific notes, high-frequency GRE vocabulary, Quant formulas, and RC strategies in one searchable notebook.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Study / Vocab Note
        </button>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your notes, vocabulary words, formulas, or linked questions..."
              aria-label="Search Study Notes"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Filter Notes by Month"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Months</option>
            {MONTH_CONFIGS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedTag === 'all'
                  ? 'bg-slate-900 dark:bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Notes ({notes.length})
            </button>
            {NOTE_TAG_PRESETS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-slate-900 dark:bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono-tabular">
            {filteredNotes.length} notes shown
          </span>
        </div>
      </div>

      {/* Notes Grid / List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <NotebookPen className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {notes.length === 0 ? 'No Study Notes Saved Yet' : 'No Notes Match Your Filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Click the "Note" button on any question while practicing, or click "New Study / Vocab Note" above to create formula sheets and vocabulary lists.
          </p>
          {notes.length === 0 && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Note
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredNotes.map((note) => {
            const isExpanded = Boolean(expandedQuestionNotes[note.id]);

            return (
              <div
                key={note.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {note.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {note.monthLabel && (
                        <>
                          <span>{note.monthLabel}</span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      {note.tags.length > 0 && (
                        <>
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            {note.tags.join(' / ')}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>
                        Updated {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {note.question && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedQuestionNotes((prev) => ({
                              ...prev,
                              [note.id]: !prev[note.id],
                            }))
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" /> Hide Question
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" /> View Linked Question
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onPracticeQuestion(note.question!, note.title)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white"
                        >
                          <Play className="w-3 h-3" /> Practice
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(note)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Delete Note"
                      aria-label="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Note Body */}
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </div>

                {/* Linked Question Preview if toggled */}
                {note.question && isExpanded && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <QuestionRenderer
                      question={note.question}
                      answer={undefined}
                      onChangeAnswer={() => {}}
                      showSolution={true}
                      readOnly={true}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Official Answer:
                      </span>
                      <RichAnswerSummary question={note.question} variant="correct" compact />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Note Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          onClick={() => setIsCreating(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Create or Edit Study Note"
        >
          <form
            onSubmit={handleSaveModal}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingNoteId ? 'Edit Study Note' : 'New Study / Vocabulary Note'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="note-title-input" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Note Title
                </label>
                <input
                  id="note-title-input"
                  type="text"
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="e.g., High-Yield March Vocab List / Circle Geometry Shortcuts"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="note-month-select" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Month Reference
                </label>
                <select
                  id="note-month-select"
                  value={draftMonthId}
                  onChange={(e) => setDraftMonthId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {MONTH_CONFIGS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_TAG_PRESETS.map((tag) => {
                  const active = draftTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setDraftTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="note-body-textarea" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Note Content
              </label>
              <textarea
                id="note-body-textarea"
                required
                rows={6}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Write definitions, mnemonics, or problem-solving steps..."
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
