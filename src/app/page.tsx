'use client';

import { useEffect, useState } from 'react';
import Uploader from '@/components/Uploader';
import { Book, Clock, Pencil, Trash2, Check, X, Sun, Moon, Bookmark, Highlighter } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';

export default function Home() {
  const [books, setBooks] = useState<any[]>([]);
  const [stats, setStats] = useState<{ totalReadMin: number } | null>(null);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data.books || []);
      setStats(data.userStats || null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm('确定要删除这本书吗？')) return;
    try {
      await fetch(`/api/books/${id}`, { method: 'DELETE' });
      fetchBooks();
    } catch (error) {
      console.error(error);
    }
  };

  const startEdit = (e: React.MouseEvent, book: any) => {
    e.preventDefault();
    setEditingId(book.id);
    setEditTitle(book.title);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    setEditingId(null);
  };

  const saveEdit = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    try {
      await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle })
      });
      setEditingId(null);
      fetchBooks();
    } catch (error) {
      console.error(error);
    }
  };

  const formatReadTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} 分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
  };

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-12 flex flex-col font-sans tracking-wide">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
        <div>
          <h1 className="text-5xl font-light tracking-tighter mb-2">书库</h1>
          <p className="text-muted font-light text-lg">安静阅读，专注当下。</p>
        </div>
        
        <div className="flex items-center gap-4">
          {stats && stats.totalReadMin > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm font-medium text-muted"
            >
              <Clock className="w-4 h-4" />
              <span>累计阅读 {formatReadTime(stats.totalReadMin)}</span>
            </motion.div>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
            title={theme === 'light' ? '切换夜间模式' : '切换白天模式'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-muted" /> : <Sun className="w-4 h-4 text-muted" />}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Uploader onUploadSuccess={fetchBooks} />
        
        {books.map((book) => (
          <div key={book.id} className="relative group border border-border rounded-2xl h-full flex flex-col bg-background hover:shadow-xl hover:border-surface-hover transition-all duration-500 overflow-hidden">
            <Link href={`/read/${book.id}`} className="flex-grow p-8 flex flex-col">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-progress-bg">
                <div 
                  className="h-full bg-progress-fill transition-all duration-500"
                  style={{ width: `${book.progress?.progress || 0}%` }}
                />
              </div>
              <Book className="w-8 h-8 mb-6 text-muted opacity-60 group-hover:text-foreground group-hover:opacity-100 transition-colors" />
              
              {editingId === book.id ? (
                <div className="mb-2" onClick={(e) => e.preventDefault()}>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(e as any, book.id);
                      if (e.key === 'Escape') cancelEdit(e as any);
                    }}
                    className="w-full bg-surface border-none rounded p-1 text-sm outline-none text-foreground"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={(e) => saveEdit(e, book.id)} className="text-green-500 hover:text-green-600"><Check size={16} /></button>
                    <button onClick={cancelEdit} className="text-red-500 hover:text-red-600"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <h2 className="text-lg font-medium leading-snug mb-2 line-clamp-2 group-hover:text-muted transition-colors">{book.title}</h2>
              )}

              <div className="mt-auto pt-6 flex justify-between items-center text-xs text-muted uppercase tracking-wider font-semibold">
                <span>{book.format}</span>
                <div className="flex items-center gap-2">
                  {book.annotations?.length > 0 && (
                    <span className="flex items-center gap-1 normal-case tracking-normal font-normal">
                      <Highlighter className="w-3 h-3" />
                      {book.annotations.length}
                    </span>
                  )}
                  {book.bookmarks?.length > 0 && (
                    <span className="flex items-center gap-1 normal-case tracking-normal font-normal">
                      <Bookmark className="w-3 h-3" />
                      {book.bookmarks.length}
                    </span>
                  )}
                  <span>{Math.round(book.progress?.progress || 0)}%</span>
                </div>
              </div>

              {/* Bookmarks list */}
              {book.bookmarks?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  {book.bookmarks.slice(0, 3).map((bm: any) => (
                    <button
                      key={bm.id}
                      className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors py-0.5 w-full text-left"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const url = bm.slideIndex != null
                          ? `/read/${book.id}?slide=${bm.slideIndex}&mode=${bm.mode}`
                          : `/read/${book.id}?progress=${bm.progress}&mode=${bm.mode}`;
                        router.push(url);
                      }}
                    >
                      <Bookmark className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">
                        {bm.mode === 'paginate' && bm.slideIndex != null
                          ? `第 ${bm.slideIndex + 1} 页`
                          : `${Math.round(bm.progress)}%`
                        }
                      </span>
                    </button>
                  ))}
                  {book.bookmarks.length > 3 && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/read/${book.id}`); }}
                      className="text-[10px] text-muted hover:text-foreground transition-colors"
                    >
                      还有 {book.bookmarks.length - 3} 个书签...
                    </button>
                  )}
                </div>
              )}
            </Link>

            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => startEdit(e, book)}
                className="p-1.5 bg-surface rounded-md text-muted hover:text-foreground transition-colors"
                title="编辑标题"
              >
                <Pencil size={14} />
              </button>
              <button 
                onClick={(e) => handleDelete(e, book.id)}
                className="p-1.5 bg-surface rounded-md text-muted hover:text-red-500 transition-colors"
                title="删除书籍"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
