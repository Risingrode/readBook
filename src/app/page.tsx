'use client';

import { useEffect, useState } from 'react';
import Uploader from '@/components/Uploader';
import { Book, Flame, Clock } from 'lucide-react';
import Link from 'next/link';

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
      <header className="flex justify-between items-end mb-16">
        <div>
          <h1 className="text-4xl font-light tracking-tight mb-2">Library</h1>
          <p className="text-gray-500 dark:text-gray-400 font-light">Your minimalist reading space.</p>
        </div>
        
        {stats && (
          <div className="flex gap-6 text-sm font-medium">
            <div className="flex items-center gap-2 bg-orange-50 text-orange-600 dark:bg-orange-500/10 px-4 py-2 rounded-full shadow-sm">
              <Flame className="w-4 h-4" />
              <span>{stats.streakDays} Day Streak</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 px-4 py-2 rounded-full shadow-sm">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(stats.totalReadMin / 60)}h {stats.totalReadMin % 60}m</span>
            </div>
          </div>
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
