'use client';

import { useEffect, useState, useRef, useCallback, useMemo, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronRight, ChevronLeft, BookOpen, ScrollText, Sun, Moon, Bookmark, X, Highlighter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chunkText, parseParagraphs, isCJK } from '@/lib/reader-utils';
import { computeSegments, getHighlightClass, getSelectionContext } from '@/lib/highlight-utils';
import type { AnnotationData } from '@/lib/highlight-utils';
import { useTheme } from '@/components/ThemeProvider';
import AnnotationToolbar from '@/components/AnnotationToolbar';
import AnnotationPanel from '@/components/AnnotationPanel';

type ReadMode = 'paginate' | 'scroll';

function ReaderInner({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [book, setBook] = useState<{ title: string; format: string; progress?: { progress: number } | null } | null>(null);
  const [fullText, setFullText] = useState('');
  const [slides, setSlides] = useState<string[][]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [readMode, setReadMode] = useState<ReadMode>('paginate');
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [bookmarks, setBookmarks] = useState<{ id: string; progress: number; label: string | null; mode: string; slideIndex: number | null; createdAt: string }[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkFlash, setBookmarkFlash] = useState(false);

  // Annotation state
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [noteAnnotation, setNoteAnnotation] = useState<{ color: string; selectedText: string; prefix: string; suffix: string } | null>(null); // Pending note creation (carries toolbar color)
  const [noteText, setNoteText] = useState(''); // Controlled textarea for inline note input
  const [focusedAnnotationId, setFocusedAnnotationId] = useState<string | null>(null); // Auto-scroll target in panel

  const { theme, toggleTheme } = useTheme();

  // Parse paragraphs for scroll mode (memoized)
  const paragraphs = useMemo(() => parseParagraphs(fullText), [fullText]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bookmarkPanelRef = useRef<HTMLDivElement>(null);
  const readStartTime = useRef<number>(Date.now());
  const lastReportedProgress = useRef<number>(0);
  const urlParamProgress = useRef<number | null>(null); // For bookmark jump from URL params

  // Fetch book data
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await fetch(`/api/books/${id}`);
        if (!res.ok) { router.push('/'); return; }
        const data = await res.json();
        setBook(data.book);
        setFullText(data.content || '');

        const chunks = chunkText(data.content, 180);
        setSlides(chunks);

        const savedProgress = data.book.progress?.progress || 0;
        const savedIndex = Math.floor((savedProgress / 100) * chunks.length);
        setCurrentSlideIndex(Math.min(savedIndex, chunks.length - 1));
        lastReportedProgress.current = savedProgress;

        // Load bookmarks
        if (data.book.bookmarks) {
          setBookmarks(data.book.bookmarks);
        }

        // Load annotations
        if (data.book.annotations) {
          setAnnotations(data.book.annotations);
        }

        // Handle bookmark jump from URL params (from home page)
        const paramSlide = searchParams.get('slide');
        const paramMode = searchParams.get('mode');
        const paramProgress = searchParams.get('progress');
        if (paramMode === 'paginate' && paramSlide != null) {
          setReadMode('paginate');
          const slideIdx = parseInt(paramSlide, 10);
          if (!isNaN(slideIdx) && slideIdx >= 0 && slideIdx < chunks.length) {
            setCurrentSlideIndex(slideIdx);
            lastReportedProgress.current = ((slideIdx + 1) / chunks.length) * 100;
          }
        } else if (paramMode === 'scroll' && paramProgress != null) {
          setReadMode('scroll');
          const p = parseFloat(paramProgress);
          if (!isNaN(p)) {
            urlParamProgress.current = p;
            lastReportedProgress.current = p;
          }
        }
      } catch (e) {
        console.error(e);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, router]);

  // Report progress to server
  const reportProgress = useCallback(async (progressPercent: number) => {
    // Only report if progress increased by at least 1%
    if (progressPercent - lastReportedProgress.current < 1) return;
    lastReportedProgress.current = progressPercent;

    const readMin = Math.round((Date.now() - readStartTime.current) / 60000);
    if (readMin > 0) {
      readStartTime.current = Date.now();
    }

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: id, progress: progressPercent, readingTime: readMin })
      });
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  // Paginate navigation
  const nextSlide = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      const nextIdx = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIdx);
      const p = ((nextIdx + 1) / slides.length) * 100;
      reportProgress(p);
    }
  }, [currentSlideIndex, slides.length, reportProgress]);

  const prevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  }, [currentSlideIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readMode === 'paginate') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          nextSlide();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevSlide();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readMode, nextSlide, prevSlide]);

  // Scroll mode: track progress based on scroll position
  useEffect(() => {
    if (readMode !== 'scroll' || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollPercent = Math.max(0, Math.min(100, scrollTop / (scrollHeight - clientHeight) * 100));
      setScrollProgress(scrollPercent); // Smooth visual update
      reportProgress(scrollPercent); // Server reporting (throttled by 1% threshold)
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [readMode, reportProgress]);

  // Scroll mode: restore scroll position from saved progress or URL params
  useEffect(() => {
    if (readMode !== 'scroll' || !scrollContainerRef.current || !fullText) return;
    // Prioritize URL param progress (bookmark jump), then server-saved progress
    const targetProgress = urlParamProgress.current ?? book?.progress?.progress ?? 0;
    if (targetProgress > 0) {
      // Use requestAnimationFrame to ensure content is rendered
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const targetScroll = (targetProgress / 100) * (container.scrollHeight - container.clientHeight);
          container.scrollTop = targetScroll;
        }
      });
      // Clear URL param after using it
      urlParamProgress.current = null;
    }
  }, [readMode, fullText, book]);

  // Toggle read mode
  const toggleMode = () => {
    setReadMode(prev => prev === 'paginate' ? 'scroll' : 'paginate');
  };

  // Bookmark actions
  const addBookmark = async () => {
    const progress = readMode === 'paginate'
      ? ((currentSlideIndex + 1) / slides.length) * 100
      : scrollProgress;
    const slideIdx = readMode === 'paginate' ? currentSlideIndex : null;

    // Prevent duplicate: skip if a bookmark already exists within 1% or at same slide
    const isDuplicate = bookmarks.some(bm => {
      if (readMode === 'paginate' && bm.mode === 'paginate' && bm.slideIndex != null && slideIdx != null) {
        return bm.slideIndex === slideIdx;
      }
      return Math.abs(bm.progress - progress) < 1;
    });
    if (isDuplicate) return;

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: id,
          progress: Math.round(progress * 10) / 10,
          mode: readMode,
          slideIndex: slideIdx,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarks(prev => [...prev, data.bookmark].sort((a, b) => a.progress - b.progress));
        // Visual feedback: flash animation
        setBookmarkFlash(true);
        setTimeout(() => setBookmarkFlash(false), 400);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteBookmark = async (bookmarkId: string) => {
    try {
      const res = await fetch(`/api/bookmarks?id=${bookmarkId}`, { method: 'DELETE' });
      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const jumpToBookmark = (bookmark: typeof bookmarks[0]) => {
    setShowBookmarks(false);
    if (bookmark.mode === 'paginate' && bookmark.slideIndex != null) {
      setReadMode('paginate');
      setCurrentSlideIndex(bookmark.slideIndex);
    } else if (bookmark.mode === 'scroll') {
      // Set urlParamProgress before mode switch so scroll-restore effect picks it up
      urlParamProgress.current = bookmark.progress;
      setReadMode('scroll');
    } else {
      // Fallback: use progress to calculate position
      if (readMode === 'paginate') {
        const targetIndex = Math.floor((bookmark.progress / 100) * slides.length);
        setCurrentSlideIndex(Math.min(targetIndex, slides.length - 1));
      } else {
        urlParamProgress.current = bookmark.progress;
        setReadMode('scroll');
      }
    }
  };

  // ===== Annotation actions =====

  const saveAnnotation = async (params: {
    text: string;
    prefix: string;
    suffix: string;
    color: string;
    note?: string | null;
  }) => {
    const progress = readMode === 'paginate'
      ? ((currentSlideIndex + 1) / slides.length) * 100
      : scrollProgress;
    const slideIdx = readMode === 'paginate' ? currentSlideIndex : null;

    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: id,
          text: params.text,
          prefix: params.prefix,
          suffix: params.suffix,
          note: params.note || null,
          color: params.color,
          progress: Math.round(progress * 10) / 10,
          mode: readMode,
          slideIndex: slideIdx,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnotations(prev => [...prev, data.annotation as AnnotationData].sort((a, b) => a.progress - b.progress));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addAnnotationFromSelection = async (color: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const textOffset = fullText.indexOf(selectedText);
    const startOffset = textOffset !== -1 ? textOffset : 0;
    const { prefix, suffix } = getSelectionContext(fullText, selectedText, startOffset);

    await saveAnnotation({ text: selectedText, prefix, suffix, color });

    selection.removeAllRanges();
    setToolbarVisible(false);
  };

  const deleteAnnotation = async (annotationId: string) => {
    try {
      const res = await fetch(`/api/annotations?id=${annotationId}`, { method: 'DELETE' });
      if (res.ok) {
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateAnnotationNote = async (annotationId: string, note: string) => {
    try {
      const res = await fetch('/api/annotations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: annotationId, note }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnotations(prev => prev.map(a => a.id === annotationId ? { ...a, note: data.annotation.note } : a));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const jumpToAnnotation = (ann: AnnotationData) => {
    setShowAnnotations(false);
    if (ann.mode === 'paginate' && ann.slideIndex != null) {
      setReadMode('paginate');
      setCurrentSlideIndex(ann.slideIndex);
    } else if (ann.mode === 'scroll') {
      urlParamProgress.current = ann.progress;
      setReadMode('scroll');
    } else {
      if (readMode === 'paginate') {
        const targetIndex = Math.floor((ann.progress / 100) * slides.length);
        setCurrentSlideIndex(Math.min(targetIndex, slides.length - 1));
      } else {
        urlParamProgress.current = ann.progress;
        setReadMode('scroll');
      }
    }
  };

  const exportAnnotations = async () => {
    try {
      const res = await fetch(`/api/annotations/export?bookId=${id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${book?.title || '笔记'}_笔记.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Text selection detection → show annotation toolbar
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
        setToolbarVisible(false);
        return;
      }

      // Only show toolbar when selection is within our text content
      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;
      const textContainer = document.getElementById('reader-content');
      if (!textContainer || !textContainer.contains(anchorNode)) {
        setToolbarVisible(false);
        return;
      }

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setToolbarPosition({
          top: rect.top,
          left: rect.left + rect.width / 2,
        });
        setToolbarVisible(true);
      } catch {
        // Range access can fail in edge cases
      }
    };

    // Debounce selection change events
    let timer: ReturnType<typeof setTimeout>;
    const debouncedHandler = () => {
      clearTimeout(timer);
      timer = setTimeout(handleSelectionChange, 150);
    };

    document.addEventListener('selectionchange', debouncedHandler);
    return () => {
      document.removeEventListener('selectionchange', debouncedHandler);
      clearTimeout(timer);
    };
  }, []);

  // Handle clicking on a highlighted segment to show/edit note
  const handleHighlightClick = (annotationId: string) => {
    setFocusedAnnotationId(annotationId);
    setShowAnnotations(true);
  };

  // Render a paragraph with highlight segments
  const renderHighlightedParagraph = (paraText: string, key: string | number, isCjk: boolean) => {
    const segments = computeSegments(paraText, annotations);
    return (
      <p key={key} className={isCjk ? 'cjk-indent' : ''}>
        {segments.map((seg, i) => {
          if (seg.annotationId) {
            return (
              <mark
                key={i}
                className={`${getHighlightClass(seg.color || 'yellow')} rounded-sm px-0.5 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => handleHighlightClick(seg.annotationId!)}
                title="点击查看笔记"
              >
                {seg.text}
              </mark>
            );
          }
          return <span key={i}>{seg.text}</span>;
        })}
      </p>
    );
  };

  // Close bookmark panel on outside click (but not from our own trigger buttons)
  useEffect(() => {
    if (!showBookmarks) return;
    const handleClick = (e: MouseEvent) => {
      if (bookmarkPanelRef.current && !bookmarkPanelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('[data-bookmark-trigger]')) return; // don't close from our own buttons
        setShowBookmarks(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showBookmarks]);

  // Calculate current progress for display
  const currentProgress = readMode === 'paginate'
    ? ((currentSlideIndex + 1) / slides.length) * 100
    : scrollProgress;

  if (loading || !book || slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-muted rounded-full animate-spin" />
          <span className="text-muted text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-surface-hover">

      {/* Minimal Header */}
      <nav className="fixed top-0 left-0 w-full px-4 md:px-8 py-3 flex justify-between items-center z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
            title="返回书库"
          >
            <ArrowLeft className="w-5 h-5 text-muted" />
          </button>
          <span className="text-sm text-muted hidden md:inline truncate max-w-[200px]">
            {book.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
            title={theme === 'light' ? '切换夜间模式' : '切换白天模式'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-muted" /> : <Sun className="w-4 h-4 text-muted" />}
          </button>

          {/* Mode Toggle */}
          <button
            onClick={toggleMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted hover:bg-surface transition-colors"
            title={readMode === 'paginate' ? '切换到滚动模式' : '切换到翻页模式'}
          >
            {readMode === 'paginate' ? <ScrollText className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{readMode === 'paginate' ? '滚动' : '翻页'}</span>
          </button>

          {/* Annotation panel toggle */}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className="p-2 rounded-lg hover:bg-surface transition-colors relative"
            title="笔记与标注"
          >
            <Highlighter className="w-4 h-4 text-muted" />
            {annotations.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-surface rounded-full text-[8px] flex items-center justify-center text-muted font-bold px-0.5">
                {annotations.length}
              </span>
            )}
          </button>

          {/* Bookmark: click to add, click badge to open list */}
          <div className="relative flex items-center">
            <button
              onClick={addBookmark}
              className={`p-2 rounded-lg hover:bg-surface transition-all ${bookmarkFlash ? 'scale-125 text-foreground' : 'scale-100'}`}
              title="添加书签"
              data-bookmark-trigger
            >
              <Bookmark className={`w-4 h-4 transition-colors ${bookmarkFlash ? 'text-foreground' : 'text-muted'}`} />
            </button>
            {bookmarks.length > 0 && (
              <button
                onClick={() => setShowBookmarks(!showBookmarks)}
                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-surface rounded-full text-[8px] flex items-center justify-center text-muted font-bold px-0.5 hover:bg-surface-hover transition-colors"
                title="查看书签列表"
                data-bookmark-trigger
              >
                {bookmarks.length}
              </button>
            )}
          </div>

          {/* Progress */}
          <span className="text-xs font-mono text-muted tabular-nums">
            {readMode === 'paginate'
              ? `${currentSlideIndex + 1} / ${slides.length}`
              : `${Math.round(currentProgress)}%`
            }
          </span>
        </div>

        {/* Bookmark Panel */}
        <AnimatePresence>
          {showBookmarks && (
            <motion.div
              ref={bookmarkPanelRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-4 md:right-8 mt-1 w-72 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">书签</span>
                <button
                  onClick={() => setShowBookmarks(false)}
                  className="p-1 rounded hover:bg-surface transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {bookmarks.length === 0 ? (
                  <p className="p-4 text-sm text-muted text-center">暂无书签</p>
                ) : (
                  bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => jumpToBookmark(bm)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-surface transition-colors text-left group border-b border-border last:border-b-0"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {bm.label || `${Math.round(bm.progress)}%`}
                        </p>
                        <p className="text-xs text-muted">
                          {bm.mode === 'paginate' && bm.slideIndex != null
                            ? `第 ${bm.slideIndex + 1} 页`
                            : `滚动 ${Math.round(bm.progress)}%`
                          }
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteBookmark(bm.id); }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
                        title="删除书签"
                      >
                        <X className="w-3 h-3 text-muted" />
                      </button>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-progress-bg z-50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${currentProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="h-full bg-progress-fill"
        />
      </div>

      {/* Main Content Area */}
      {readMode === 'paginate' ? (
        /* ========== PAGINATE MODE ========== */
        <main className="pt-14 min-h-screen flex flex-col items-center justify-center max-w-2xl mx-auto px-6 md:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <div id="reader-content" className="font-serif text-xl md:text-2xl text-center md:text-left text-foreground prose-reader">
                {slides[currentSlideIndex].map((para, i) => (
                  renderHighlightedParagraph(para, i, isCJK(para))
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Paginate Navigation */}
          <div className="fixed inset-y-0 left-0 flex items-center pl-3 md:pl-6 z-40">
            <button
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
              className="p-2 rounded-full hover:bg-surface transition-all active:scale-95 disabled:opacity-0 disabled:pointer-events-none text-muted"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="fixed inset-y-0 right-0 flex items-center pr-3 md:pr-6 z-40">
            <button
              onClick={nextSlide}
              disabled={currentSlideIndex === slides.length - 1}
              className="p-2 rounded-full hover:bg-surface transition-all active:scale-95 disabled:opacity-0 disabled:pointer-events-none text-muted"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </main>
      ) : (
        /* ========== SCROLL MODE ========== */
        <main
          ref={scrollContainerRef}
          className="pt-14 h-screen overflow-y-auto scroll-smooth"
        >
          <div className="max-w-2xl mx-auto px-6 md:px-12 py-12">
            <div id="reader-content" className="font-serif text-xl md:text-2xl text-foreground prose-reader">
              {paragraphs.map((p, i) => (
                renderHighlightedParagraph(p, i, isCJK(p))
              ))}
            </div>
            {/* End padding so last section is reachable */}
            <div className="h-[50vh]" />
          </div>
        </main>
      )}
      {/* Annotation Toolbar (floating, on text selection) */}
      <AnnotationToolbar
        onHighlight={(color) => addAnnotationFromSelection(color)}
        onNote={(color) => {
          // Capture selection info before it's lost, then show inline note input
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) return;
          const selectedText = selection.toString().trim();
          if (!selectedText) return;
          const textOffset = fullText.indexOf(selectedText);
          const startOffset = textOffset !== -1 ? textOffset : 0;
          const { prefix, suffix } = getSelectionContext(fullText, selectedText, startOffset);
          // Carry the toolbar's current color selection to the note
          setNoteAnnotation({ color, selectedText, prefix, suffix });
          setNoteText('');
          // Clear selection and hide toolbar
          selection.removeAllRanges();
          setToolbarVisible(false);
        }}
        visible={toolbarVisible}
        position={toolbarPosition}
      />

      {/* Inline note input (shown when user clicked "笔记" in toolbar) */}
      <AnimatePresence>
        {noteAnnotation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-background border-t border-border p-4 shadow-2xl"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">添加笔记</span>
                <button
                  onClick={() => setNoteAnnotation(null)}
                  className="p-1 rounded hover:bg-surface transition-colors"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
              <p className={`text-sm mb-3 px-1 rounded-sm ${getHighlightClass(noteAnnotation.color)}`}>
                {noteAnnotation.selectedText.length > 80
                  ? noteAnnotation.selectedText.slice(0, 80) + '…'
                  : noteAnnotation.selectedText
                }
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    saveAnnotation({
                      text: noteAnnotation!.selectedText,
                      prefix: noteAnnotation!.prefix,
                      suffix: noteAnnotation!.suffix,
                      color: noteAnnotation!.color,
                      note: noteText.trim() || null,
                    });
                    setNoteAnnotation(null);
                    setNoteText('');
                  }
                }}
                placeholder="写下你的想法..."
                className="w-full text-sm bg-surface border border-border rounded-lg p-3 text-foreground placeholder-muted/50 resize-none outline-none focus:ring-1 focus:ring-border"
                rows={3}
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted/50">⌘+Enter 保存</span>
                <button
                  onClick={() => {
                    saveAnnotation({
                      text: noteAnnotation.selectedText,
                      prefix: noteAnnotation.prefix,
                      suffix: noteAnnotation.suffix,
                      color: noteAnnotation.color,
                      note: noteText.trim() || null,
                    });
                    setNoteAnnotation(null);
                    setNoteText('');
                  }}
                  className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  保存笔记
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotation Panel (side drawer) */}
      <AnnotationPanel
        annotations={annotations}
        visible={showAnnotations}
        focusedId={focusedAnnotationId}
        onClose={() => { setShowAnnotations(false); setFocusedAnnotationId(null); }}
        onJump={jumpToAnnotation}
        onDelete={deleteAnnotation}
        onUpdateNote={updateAnnotationNote}
        onExport={exportAnnotations}
      />
    </div>
  );
}

export default function Reader({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-muted rounded-full animate-spin" />
          <span className="text-muted text-sm">加载中...</span>
        </div>
      </div>
    }>
      <ReaderInner params={params} />
    </Suspense>
  );
}
