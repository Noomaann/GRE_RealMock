import React, { useMemo, useState } from 'react';
import { GREQuestion, StudyNote } from '../types/gre';
import { TopicCategoryDef } from '../utils/topicClassifier';
import { stripHtmlToText } from '../utils/greLogic';
import { QuestionRenderer } from './QuestionRenderer';
import { RichAnswerSummary } from './RichAnswerSummary';
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const NOTE_TAG_PRESETS = [
  'Formula',
  'Quant Shortcut',
  'Trap Alert',
  'Must Review',
  'Vocab',
  'RC Strategy',
];

interface TopicNotesPanelProps {
  category: TopicCategoryDef;
  topicNotes: StudyNote[];
  onSaveTopicNote: (params: {
    id?: string;
    topicId: string;
    topicName: string;
    title: string;
    content: string;
    tags: string[];
  }) => void;
  onSaveQuestionNote: (params: {
    question: GREQuestion;
    monthId?: string;
    monthLabel?: string;
    testTitle?: string;
    content: string;
    tags: string[];
  }) => void;
  onDeleteNote: (noteId: string) => void;
  onPracticeQuestion: (question: GREQuestion, title: string) => void;
  compact?: boolean;
}

export const TopicNotesPanel: React.FC<TopicNotesPanelProps> = ({
  category,
  topicNotes,
  onSaveTopicNote,
  onSaveQuestionNote,
  onDeleteNote,
  onPracticeQuestion,
  compact = false,
}) => {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'question' | 'chapter'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestionNoteId, setExpandedQuestionNoteId] = useState<string | null>(null);

  // Add new chapter note form
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState<string[]>(['Formula']);

  // Inline edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  const questionNotesCount = useMemo(
    () => topicNotes.filter((n) => Boolean(n.questionId)).length,
    [topicNotes]
  );
  const chapterNotesCount = topicNotes.length - questionNotesCount;

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return topicNotes.filter((n) => {
      if (sourceFilter === 'question' && !n.questionId) return false;
      if (sourceFilter === 'chapter' && Boolean(n.questionId)) return false;
      if (q) {
        const hay = `${n.title} ${n.content} ${n.tags.join(' ')} ${n.testTitle || ''} ${
          n.monthLabel || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [topicNotes, sourceFilter, searchQuery]);

  const toggleTag = (list: string[], tag: string, setter: (v: string[]) => void) => {
    if (list.includes(tag)) setter(list.filter((t) => t !== tag));
    else setter([...list, tag]);
  };

  const handleSaveNewChapterNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onSaveTopicNote({
      topicId: category.id,
      topicName: category.name,
      title: newTitle.trim() || `${category.name} — Revision Summary`,
      content: newContent.trim(),
      tags: newTags,
    });
    setNewTitle('');
    setNewContent('');
    setNewTags(['Formula']);
    setIsAdding(false);
  };

  const startEditing = (note: StudyNote) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags || []);
  };

  const handleSaveEdit = (note: StudyNote) => {
    if (!editContent.trim()) return;
    if (note.questionId && note.question) {
      onSaveQuestionNote({
        question: note.question,
        monthId: note.monthId,
        monthLabel: note.monthLabel,
        testTitle: note.testTitle,
        content: editContent.trim(),
        tags: editTags,
      });
    } else {
      onSaveTopicNote({
        id: note.id,
        topicId: category.id,
        topicName: category.name,
        title: editTitle.trim() || `${category.name} — Revision Summary`,
        content: editContent.trim(),
        tags: editTags,
      });
    }
    setEditingNoteId(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
          <span className="font-semibold text-slate-900 dark:text-white">
            {topicNotes.length} {topicNotes.length === 1 ? 'Note' : 'Notes'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{questionNotesCount} From Practice Questions</span>
          <span aria-hidden="true">·</span>
          <span>{chapterNotesCount} Chapter Summary</span>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162C49] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors whitespace-nowrap"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isAdding ? 'Cancel' : 'Add Chapter Note'}
        </button>
      </div>

      {/* Inline Add Chapter Revision Note Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveNewChapterNote}
          className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#0E1117] border border-[#D8D5CC] dark:border-[#2A3240] space-y-3"
        >
          <div className="text-xs font-bold text-[#1E3A5F] dark:text-blue-400">
            New Revision Note for {category.name}
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Note title (e.g., Divisibility Rules, Slope Traps, Key Formulas)..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-white dark:bg-[#161B22] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          />

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            required
            placeholder="Write formulas, shortcuts, or common GRE traps for this chapter..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-white dark:bg-[#161B22] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] leading-relaxed"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {NOTE_TAG_PRESETS.map((tag) => {
                const active = newTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(newTags, tag, setNewTags)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                        : 'bg-white dark:bg-[#161B22] border border-[#D8D5CC] dark:border-[#2A3240] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Chapter Note
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Row (shown when notes exist) */}
      {topicNotes.length > 0 && (
        <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'justify-between'}`}>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F1EC] dark:bg-[#0E1117]">
            {(
              [
                { id: 'all', label: `All (${topicNotes.length})` },
                { id: 'question', label: `Question Notes (${questionNotesCount})` },
                { id: 'chapter', label: `Chapter Notes (${chapterNotesCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  sourceFilter === tab.id
                    ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter notes in this section..."
              aria-label="Filter notes in this section"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-white dark:bg-[#0E1117] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            />
          </div>
        </div>
      )}

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117]/60 text-center space-y-2">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {topicNotes.length === 0
              ? `No Revision Notes for ${category.name} Yet`
              : 'No Notes Match Your Filter'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {topicNotes.length === 0
              ? 'Any note you write while solving questions in this section (during Mock Tests or Topic Drills) automatically appears here alongside chapter summaries for easy revision.'
              : 'Try clearing the search query or switching back to All notes.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const isQuestionNote = Boolean(note.questionId && note.question);
            const isExpanded = expandedQuestionNoteId === note.id;
            const snippet = note.question
              ? stripHtmlToText(
                  note.question.optiontopcontent ||
                    note.question.content ||
                    (note.question.blanks?.[0]
                      ? `Quantity A: ${note.question.blanks[0].quantityA || ''} vs Quantity B: ${
                          note.question.blanks[0].quantityB || ''
                        }`
                      : '')
                )
              : '';

            return (
              <article
                key={note.id}
                className="rounded-xl border border-[#E4E2DC] dark:border-[#262D38] bg-white dark:bg-[#161B22] p-4 space-y-3"
              >
                {/* Header Metadata */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span
                        className={`font-semibold ${
                          isQuestionNote
                            ? 'text-[#1E3A5F] dark:text-blue-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isQuestionNote ? 'Question Note (From Practice)' : 'Chapter Revision Note'}
                      </span>
                      {note.monthLabel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{note.monthLabel}</span>
                        </>
                      )}
                      {note.testTitle && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{note.testTitle}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {!isEditing && (
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {note.title}
                      </h4>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditing(note)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-[#F3F1EC] dark:hover:bg-slate-800 transition-colors"
                        title="Edit note"
                        aria-label="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete note"
                        aria-label="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Body or Inline Editor */}
                {isEditing ? (
                  <div className="space-y-2.5 pt-1">
                    {!isQuestionNote && (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white"
                      />
                    )}
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] text-slate-900 dark:text-white leading-relaxed"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {NOTE_TAG_PRESETS.map((tag) => {
                          const active = editTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(editTags, tag, setEditTags)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                active
                                  ? 'bg-[#1E3A5F] dark:bg-blue-600 text-white'
                                  : 'bg-[#F3F1EC] dark:bg-[#0E1117] text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-[#F3F1EC] dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-[#1E3A5F] dark:bg-blue-600 text-white"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-[#FAF9F6] dark:bg-[#0E1117]/70 px-3.5 py-3 rounded-lg border border-[#EAE8E1] dark:border-[#222936]">
                      {note.content}
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {note.tags.map((t) => (
                          <span key={t} className="font-medium text-slate-600 dark:text-slate-300">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Linked Question Preview & Practice Actions */}
                    {isQuestionNote && note.question && (
                      <div className="pt-2 border-t border-[#E4E2DC] dark:border-[#262D38] space-y-2.5">
                        {!isExpanded && snippet && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                            “{snippet}”
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedQuestionNoteId(isExpanded ? null : note.id)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#D8D5CC] dark:border-[#2A3240] bg-[#FAF9F6] dark:bg-[#0E1117] hover:bg-[#EFECE4] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" /> Hide Question &amp; Answer
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" /> Show Question &amp; Official Answer
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onPracticeQuestion(
                                note.question!,
                                note.testTitle || category.name
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1E3A5F] dark:text-blue-400 hover:underline"
                          >
                            <Play className="w-3 h-3" /> Re-Solve Question
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="pt-2 space-y-3">
                            <QuestionRenderer
                              question={note.question}
                              answer={undefined}
                              onChangeAnswer={() => {}}
                              showSolution={true}
                              readOnly={true}
                            />
                            <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50/85 dark:bg-emerald-950/35 border border-emerald-600/50 flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                Verified Official Answer:
                              </span>
                              <RichAnswerSummary question={note.question} variant="correct" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
