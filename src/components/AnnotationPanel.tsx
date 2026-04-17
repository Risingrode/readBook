'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Trash2, MessageSquareText, Download, Highlighter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnnotationData } from '@/lib/highlight-utils';
import { getHighlightClass } from '@/lib/highlight-utils';

interface AnnotationPanelProps {
  annotations: AnnotationData[];
  visible: boolean;
  focusedId?: string | null; // ID of annotation to scroll to and auto-edit
  onClose: () => void;
  onJump: (annotation: AnnotationData) => void;
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onExport: () => void;
}

export default function AnnotationPanel({
  annotations,
  visible,
  focusedId,
  onClose,
  onJump,
  onDelete,
  onUpdateNote,
  onExport,
}: AnnotationPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const startEditNote = (ann: AnnotationData) => {
    setEditingId(ann.id);
    setEditText(ann.note || '');
  };

  const saveNote = (id: string) => {
    onUpdateNote(id, editText);
    setEditingId(null);
    setEditText('');
  };

  // Auto-scroll to focused annotation and open its edit mode when panel opens
  useEffect(() => {
    if (visible && focusedId) {
      const el = itemRefs.current.get(focusedId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const ann = annotations.find(a => a.id === focusedId);
      if (ann && !ann.note) {
        setEditingId(focusedId);
        setEditText('');
      }
    }
  }, [visible, focusedId, annotations]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-80 md:w-96 bg-background border-l border-border z-[60] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Highlighter className="w-4 h-4 text-muted" />
              <h2 className="text-sm font-semibold">笔记与标注</h2>
              <span className="text-xs text-muted bg-surface px-1.5 py-0.5 rounded-full">
                {annotations.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {annotations.length > 0 && (
                <button
                  onClick={onExport}
                  className="p-1.5 rounded-lg hover:bg-surface transition-colors"
                  title="导出笔记"
                >
                  <Download className="w-4 h-4 text-muted" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface transition-colors"
                title="关闭"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>

          {/* Annotation List */}
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {annotations.length === 0 ? (
              <div className="p-8 text-center">
                <Highlighter className="w-8 h-8 text-muted/40 mx-auto mb-3" />
                <p className="text-sm text-muted">暂无标注</p>
                <p className="text-xs text-muted/60 mt-1">选中文字即可添加标注或笔记</p>
              </div>
            ) : (
              annotations.map((ann) => (
                <div
                  key={ann.id}
                  ref={(el) => { if (el) itemRefs.current.set(ann.id, el); }}
                  className={`p-4 border-b border-border hover:bg-surface/50 transition-colors group ${focusedId === ann.id ? 'bg-surface/50 ring-1 ring-inset ring-foreground/10' : ''}`}
                >
                  {/* Highlighted text */}
                  <button
                    onClick={() => onJump(ann)}
                    className="w-full text-left"
                  >
                    <span className={`inline rounded-sm px-0.5 ${getHighlightClass(ann.color)}`}>
                      {ann.text.length > 100 ? ann.text.slice(0, 100) + '…' : ann.text}
                    </span>
                  </button>

                  {/* Note display / edit */}
                  {editingId === ann.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder="写下你的想法..."
                        className="w-full text-sm bg-surface border border-border rounded-lg p-2 text-foreground placeholder-muted/50 resize-none outline-none focus:ring-1 focus:ring-border"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={() => saveNote(ann.id)}
                          className="text-xs px-2.5 py-1 bg-foreground text-background rounded-md hover:opacity-80 transition-opacity"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs px-2.5 py-1 text-muted hover:text-foreground transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    ann.note && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <MessageSquareText className="w-3 h-3 text-muted mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted leading-relaxed">{ann.note}</p>
                      </div>
                    )
                  )}

                  {/* Metadata row */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted/60">
                      {ann.mode === 'paginate' && ann.slideIndex != null
                        ? `第 ${ann.slideIndex + 1} 页`
                        : `${Math.round(ann.progress)}%`
                      }
                      {' · '}
                      {new Date(ann.createdAt).toLocaleDateString('zh-CN')}
                    </span>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!ann.note && editingId !== ann.id && (
                        <button
                          onClick={() => startEditNote(ann)}
                          className="p-1 rounded hover:bg-surface-hover transition-colors"
                          title="添加笔记"
                        >
                          <MessageSquareText className="w-3 h-3 text-muted" />
                        </button>
                      )}
                      {ann.note && editingId !== ann.id && (
                        <button
                          onClick={() => startEditNote(ann)}
                          className="p-1 rounded hover:bg-surface-hover transition-colors"
                          title="编辑笔记"
                        >
                          <MessageSquareText className="w-3 h-3 text-muted" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(ann.id)}
                        className="p-1 rounded hover:bg-surface-hover hover:text-red-500 transition-colors"
                        title="删除标注"
                      >
                        <Trash2 className="w-3 h-3 text-muted" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with export */}
          {annotations.length > 0 && (
            <div className="p-3 border-t border-border">
              <button
                onClick={onExport}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-sm text-muted hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                导出全部笔记
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
