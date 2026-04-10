'use client';

import { useEffect, useState } from 'react';
import Uploader from '@/components/Uploader';
import { Book, Flame, Clock, Sparkles, Pencil, Trash2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [books, setBooks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
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

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-12 flex flex-col font-sans tracking-wide">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
        <div>
          <h1 className="text-5xl font-light tracking-tighter mb-2">书库</h1>
          <p className="text-gray-500 dark:text-gray-400 font-light text-lg">你的交互式认知成长空间。</p>
        </div>
        
        {stats && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-4 text-sm font-medium"
          >
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 px-4 py-2 rounded-full shadow-sm border border-indigo-100 dark:border-indigo-500/20">
                <Sparkles className="w-4 h-4" />
                <span>等级 {stats.level} <span className="text-indigo-400 ml-1">· {stats.exp % 100}/100 经验</span></span>
              </div>
              <div className="h-1 w-full bg-indigo-100 dark:bg-indigo-950 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.exp % 100}%` }}
                  className="h-full bg-indigo-500" 
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-orange-50 text-orange-600 dark:bg-orange-500/10 px-4 py-2 rounded-full shadow-sm border border-orange-100 dark:border-orange-500/20">
              <Flame className={`w-4 h-4 ${stats.flameHealth < 30 ? 'animate-pulse' : ''}`} />
              <span>连续阅读 {stats.streakDays} 天 · {stats.flameHealth}% 健康值</span>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 px-4 py-2 rounded-full shadow-sm border border-emerald-100 dark:border-emerald-500/20">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(stats.totalReadMin / 60)}小时 {stats.totalReadMin % 60}分钟</span>
            </div>
          </motion.div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Uploader onUploadSuccess={fetchBooks} />
        
        {books.map((book) => (
          <div key={book.id} className="relative group border border-gray-200 dark:border-gray-800 rounded-2xl h-full flex flex-col bg-white dark:bg-[#0a0a0a] hover:shadow-xl hover:border-gray-300 transition-all duration-500 overflow-hidden">
            <Link href={`/read/${book.id}`} className="flex-grow p-8 flex flex-col">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${book.progress?.progress || 0}%` }}
                />
              </div>
              <Book className="w-8 h-8 mb-6 text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors" />
              
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
                    className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-1 text-sm outline-none text-black dark:text-white"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={(e) => saveEdit(e, book.id)} className="text-green-500 hover:text-green-600"><Check size={16} /></button>
                    <button onClick={cancelEdit} className="text-red-500 hover:text-red-600"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <h2 className="text-lg font-medium leading-snug mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">{book.title}</h2>
              )}

              <div className="mt-auto pt-6 flex justify-between items-center text-xs text-gray-400 uppercase tracking-wider font-semibold">
                <span>{book.format}</span>
                <span>{Math.round(book.progress?.progress || 0)}%</span>
              </div>
            </Link>

            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => startEdit(e, book)}
                className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-600 hover:text-indigo-600 transition-colors"
                title="编辑标题"
              >
                <Pencil size={14} />
              </button>
              <button 
                onClick={(e) => handleDelete(e, book.id)}
                className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-600 hover:text-red-600 transition-colors"
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