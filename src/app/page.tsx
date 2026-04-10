'use client';

import { useEffect, useState } from 'react';
import Uploader from '@/components/Uploader';
import { Book, Flame, Clock, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [books, setBooks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

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

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-12 flex flex-col font-sans tracking-wide">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
        <div>
          <h1 className="text-5xl font-light tracking-tighter mb-2">Library</h1>
          <p className="text-gray-500 dark:text-gray-400 font-light text-lg">Your interactive cognitive growth space.</p>
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
                <span>Level {stats.level} <span className="text-indigo-400 ml-1">· {stats.exp % 100}/100 EXP</span></span>
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
              <span>{stats.streakDays} Day Streak · {stats.flameHealth}% Health</span>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 px-4 py-2 rounded-full shadow-sm border border-emerald-100 dark:border-emerald-500/20">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(stats.totalReadMin / 60)}h {stats.totalReadMin % 60}m</span>
            </div>
          </motion.div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Uploader onUploadSuccess={fetchBooks} />
        
        {books.map((book) => (
          <Link href={`/read/${book.id}`} key={book.id}>
            <div className="group relative border border-gray-200 dark:border-gray-800 rounded-2xl p-8 h-full flex flex-col bg-white dark:bg-[#0a0a0a] hover:shadow-xl hover:border-gray-300 transition-all duration-500 overflow-hidden cursor-pointer">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-800">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${book.progress?.progress || 0}%` }}
                />
              </div>
              <Book className="w-8 h-8 mb-6 text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors" />
              <h2 className="text-lg font-medium leading-snug mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">{book.title}</h2>
              <div className="mt-auto pt-6 flex justify-between items-center text-xs text-gray-400 uppercase tracking-wider font-semibold">
                <span>{book.format}</span>
                <span>{Math.round(book.progress?.progress || 0)}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
