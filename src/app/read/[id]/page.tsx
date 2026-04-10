'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause, Volume2, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Reader({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const router = useRouter();

  const [book, setBook] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [saving, setSaving] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const readStartTime = useRef<number>(Date.now());

  useEffect(() => {
    // Basic lofi ambient
    audioRef.current = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      const res = await fetch(`/api/books/${id}`);
      if (!res.ok) {
        router.push('/');
        return;
      }
      const data = await res.json();
      setBook(data.book);
      setContent(data.content);
      setProgress(data.book.progress?.progress || 0);

      // Restore scroll
      setTimeout(() => {
        if (contentRef.current) {
          const scrollPos = (data.book.progress?.progress / 100) * (document.body.scrollHeight - window.innerHeight);
          window.scrollTo(0, scrollPos);
        }
      }, 500);
    };
    fetchBook();
  }, [id, router]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log('Audio play failed', e));
    }
    setIsPlaying(!isPlaying);
  };

  const saveProgress = async (currentProgress: number) => {
    setSaving(true);
    const readMin = Math.round((Date.now() - readStartTime.current) / 60000);
    readStartTime.current = Date.now(); // Reset timer after save

    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: id,
        progress: currentProgress,
        readingTime: readMin
      })
    });
    setSaving(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      // Show UI on interaction
      setShowUI(true);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
      uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);

      const totalScroll = document.body.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      const p = totalScroll > 0 ? (currentScroll / totalScroll) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, p)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save on unmount / navigate away
  useEffect(() => {
    return () => {
      saveProgress(progress);
    };
  }, [progress, id]);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#050505]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-700 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <span className="text-gray-500">Preparing atmosphere...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-[#222] dark:text-[#ddd] transition-colors duration-1000"
      onMouseMove={() => {
        setShowUI(true);
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
      }}
    >
      {/* Floating Header */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: showUI ? 0 : -100 }}
        className="fixed top-0 left-0 w-full p-6 flex justify-between items-center bg-gradient-to-b from-[#fafafa] to-transparent dark:from-[#050505] dark:to-transparent z-50 pointer-events-none"
      >
        <button 
          onClick={() => { saveProgress(progress); router.push('/'); }} 
          className="pointer-events-auto p-3 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white dark:hover:bg-gray-900 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="pointer-events-auto flex items-center gap-4 bg-white/50 dark:bg-black/50 backdrop-blur-md px-6 py-3 rounded-full shadow-sm">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Progress</span>
            <span className="text-sm font-mono">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
          <button onClick={() => saveProgress(progress)} className="hover:text-emerald-500 transition-colors">
            <Save className={`w-5 h-5 ${saving ? 'animate-pulse text-emerald-500' : ''}`} />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
          <button onClick={toggleMusic} className="hover:text-emerald-500 transition-colors flex items-center gap-2">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <Volume2 className="w-4 h-4 opacity-50" />
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-32 font-serif text-lg leading-relaxed md:text-xl md:leading-loose">
        <h1 className="text-4xl md:text-5xl font-bold mb-16 text-center font-sans tracking-tight">{book.title}</h1>
        <div 
          ref={contentRef}
          className="whitespace-pre-wrap text-justify opacity-90"
        >
          {content}
        </div>
      </main>

      {/* Progress Bar Bottom */}
      <motion.div 
        animate={{ opacity: showUI ? 1 : 0 }}
        className="fixed bottom-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-800"
      >
        <div 
          className="h-full bg-emerald-500 transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </motion.div>
    </div>
  );
}
