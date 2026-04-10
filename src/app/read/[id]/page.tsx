'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Flame, ChevronRight, ChevronLeft, Gift, Zap, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chunkText, identifyKeywords } from '@/lib/reader-utils';
import { useGameStore } from '@/lib/store';
import confetti from 'canvas-confetti';

export default function Reader({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const router = useRouter();

  const [book, setBook] = useState<any>(null);
  const [slides, setSlides] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Memory Game State
  const [hiddenKeywords, setHiddenKeywords] = useState<string[]>([]);
  const [revealedKeywords, setRevealedKeywords] = useState<Set<string>>(new Set());
  const [showRecallGame, setShowRecallGame] = useState(false);

  // Warmup Game State (Ebbinghaus Forgetting Curve)
  const [showWarmupGame, setShowWarmupGame] = useState(false);
  const [warmupKeywords, setWarmupKeywords] = useState<string[]>([]);
  const [warmupRevealed, setWarmupRevealed] = useState<Set<string>>(new Set());

  // Cliffhanger State (Zeigarnik Effect)
  const [showCliffhanger, setShowCliffhanger] = useState(false);
  const [cliffhangerResolved, setCliffhangerResolved] = useState(false);

  const { setStats, level, exp, receiveDrop, activeDrop, clearDrop } = useGameStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const readStartTime = useRef<number>(Date.now());

  useEffect(() => {
    audioRef.current = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.2;
    return () => audioRef.current?.pause();
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      const res = await fetch(`/api/books/${id}`);
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      setBook(data.book);
      
      const chunks = chunkText(data.content, 180); // Memory Chunks
      setSlides(chunks);
      
      const savedIndex = Math.floor(((data.book.progress?.progress || 0) / 100) * chunks.length);
      setCurrentSlideIndex(Math.min(savedIndex, chunks.length - 1));
      
      // Trigger Warmup if returning to read
      if (data.book.progress?.progress > 0 && savedIndex < chunks.length - 1) {
        const prevText = chunks.slice(Math.max(0, savedIndex - 5), savedIndex).join(' ');
        const keys = identifyKeywords(prevText, 5);
        if (keys.length > 0) {
          setWarmupKeywords(keys);
          setShowWarmupGame(true);
        }
      }

      if (data.userStats) setStats(data.userStats);
    };
    fetchBook();
  }, [id, router, setStats]);

  const reportAction = async (idx: number, action?: string) => {
    const p = ((idx + 1) / (slides.length || 1)) * 100;
    setProgress(p);
    
    const readMin = Math.round((Date.now() - readStartTime.current) / 60000);
    readStartTime.current = Date.now();

    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: id, progress: p, readingTime: readMin, action })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.userStats) setStats(data.userStats);
      if (data.activeDrop) receiveDrop(data.activeDrop);
    }
  };

  const nextSlide = () => {
    // Zeigarnik Effect: Cliffhanger Lock at 98% (or last slide)
    if (currentSlideIndex === slides.length - 2 && !cliffhangerResolved) {
       setShowCliffhanger(true);
       return;
    }

    if (currentSlideIndex < slides.length - 1) {
      const nextIdx = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIdx);
      reportAction(nextIdx, 'slide_read');
      
      // Setup Recall Game for every 3rd slide
      if ((nextIdx + 1) % 3 === 0) {
        setupRecallGame(slides[nextIdx]);
      } else {
        setShowRecallGame(false);
      }
    } else {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const setupRecallGame = (text: string) => {
    const keys = identifyKeywords(text, 2);
    setHiddenKeywords(keys);
    setRevealedKeywords(new Set());
    setShowRecallGame(true);
  };

  const handleKeywordCapture = (word: string) => {
    const newRevealed = new Set(revealedKeywords);
    newRevealed.add(word);
    setRevealedKeywords(newRevealed);
    
    reportAction(currentSlideIndex, 'keyword_capture');
    
    if (newRevealed.size === hiddenKeywords.length) {
      confetti({ particleCount: 50, spread: 30, origin: { y: 0.8 } });
    }
  };

  const handleWarmupCapture = (word: string) => {
    const newRev = new Set(warmupRevealed);
    newRev.add(word);
    setWarmupRevealed(newRev);
    if (newRev.size === warmupKeywords.length) {
       reportAction(currentSlideIndex, 'warmup_complete');
       setShowWarmupGame(false);
       confetti({ particleCount: 100, spread: 60, origin: { y: 0.5 } });
    }
  };

  const handleClearDrop = () => {
    if (activeDrop?.rarity === 'legendary') {
       confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 }, colors: ['#fbbf24', '#f59e0b', '#d97706'] });
    }
    clearDrop();
  };

  if (!book || slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#050505]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <span className="text-gray-400 font-light tracking-widest uppercase text-xs">正在同步神经通路...</span>
        </motion.div>
      </div>
    );
  }

  const currentContent = slides[currentSlideIndex];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-[#111] dark:text-[#eee] overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
         <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-emerald-400/20 blur-[120px] rounded-full" 
         />
      </div>

      {/* Interactive Header */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-40 pointer-events-none"
      >
        <div className="flex items-center gap-6 pointer-events-auto">
          <button onClick={() => router.push('/')} className="hover:scale-110 transition-transform p-2 bg-white/50 dark:bg-black/50 backdrop-blur-xl rounded-full border border-gray-200 dark:border-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 bg-white/50 dark:bg-black/50 backdrop-blur-xl px-5 py-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
             <div className="flex items-center gap-2 text-emerald-600 font-mono text-xs font-bold">
               <Sparkles className="w-3 h-3" />
               <span>等级 {level}</span>
             </div>
             <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
             <div className="flex items-center gap-2 text-orange-500 font-mono text-xs font-bold">
               <Flame className="w-3 h-3" />
               <span>{exp % 100}%</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto bg-white/50 dark:bg-black/50 backdrop-blur-xl px-5 py-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm text-xs font-medium tracking-tighter uppercase text-gray-500">
          进度 {currentSlideIndex + 1} / {slides.length}
        </div>
      </motion.nav>

      {/* Main Memory Slide Container */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center max-w-4xl mx-auto px-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideIndex}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 1.05 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="w-full"
          >
            <div className="font-serif text-2xl md:text-3xl leading-[1.8] text-center md:text-left selection:bg-emerald-500 selection:text-white">
              {currentContent.split(/\s+/).map((word, i) => {
                const pureWord = word.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '');
                const lowerWord = pureWord.toLowerCase();
                const isHidden = hiddenKeywords.includes(pureWord);
                const isRevealed = revealedKeywords.has(pureWord);
                
                return (
                  <motion.span 
                    key={i}
                    layout
                    whileHover={{ scale: 1.1, color: "#10b981" }}
                    className={`inline-block mr-3 transition-all duration-500 ${
                      isHidden && !isRevealed 
                        ? 'blur-md cursor-help scale-95 opacity-50 select-none' 
                        : isRevealed ? 'text-emerald-500 font-bold' : ''
                    }`}
                    onClick={() => isHidden && !isRevealed && handleKeywordCapture(pureWord)}
                  >
                    {word}
                  </motion.span>
                );
              })}
            </div>
            
            {showRecallGame && revealedKeywords.size < hiddenKeywords.length && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-16 p-4 border border-dashed border-emerald-500/30 rounded-2xl bg-emerald-500/5 text-center"
              >
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-600 mb-2 flex items-center justify-center gap-2">
                   <Sparkles className="w-4 h-4" /> 需要神经锚点
                </p>
                <p className="text-sm text-gray-400">寻找并捕获 {hiddenKeywords.length - revealedKeywords.size} 个关键神经触发器以稳定此记忆。</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="fixed bottom-12 left-0 w-full flex justify-center items-center gap-12 z-40">
           <button 
             onClick={prevSlide} 
             disabled={currentSlideIndex === 0}
             className="p-4 rounded-full bg-white dark:bg-gray-900 shadow-xl disabled:opacity-30 border border-gray-100 dark:border-gray-800 hover:scale-110 transition-all active:scale-95"
           >
             <ChevronLeft className="w-6 h-6" />
           </button>

           <button 
             onClick={nextSlide} 
             className="group relative p-6 rounded-full bg-emerald-500 text-white shadow-[0_20px_50px_-15px_rgba(16,185,129,0.5)] hover:scale-110 transition-all active:scale-95 overflow-hidden"
           >
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
             <ChevronRight className="w-8 h-8 relative z-10" />
           </button>
        </div>
      </main>

      {/* Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-900 overflow-hidden z-50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
          className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]"
        />
      </div>

      {/* Zeigarnik Cliffhanger Modal */}
      <AnimatePresence>
        {showCliffhanger && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#111] border border-gray-800 p-10 rounded-3xl max-w-lg w-full text-center relative overflow-hidden"
            >
              <Lock className="w-12 h-12 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">悬念锁定</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                您已经阅读了本章节的 98%。接下来会发生什么？神经通路必须冷却后才能继续。
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                     reportAction(currentSlideIndex, 'unlock_cliffhanger');
                     setCliffhangerResolved(true);
                     setShowCliffhanger(false);
                     nextSlide();
                  }}
                  className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-colors"
                >
                  解除锁定 (消耗 50 经验)
                </button>
                <button 
                  onClick={() => router.push('/')}
                  className="w-full py-4 rounded-xl bg-transparent border border-gray-700 text-gray-300 font-bold hover:bg-gray-800 transition-colors"
                >
                  返回书库
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-read Warmup Modal */}
      <AnimatePresence>
        {showWarmupGame && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 p-8 rounded-3xl max-w-2xl w-full"
            >
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6 text-orange-500" />
                <h2 className="text-2xl font-bold">神经热身</h2>
              </div>
              <p className="text-gray-500 mb-8">重新激活上次阅读会话中的记忆通路，以避免艾宾浩斯遗忘曲线惩罚。</p>
              
              <div className="flex flex-wrap gap-4 mb-8">
                {warmupKeywords.map((word, i) => {
                  const isRevealed = warmupRevealed.has(word);
                  return (
                    <motion.button
                      key={i}
                      whileHover={!isRevealed ? { scale: 1.05 } : {}}
                      whileTap={!isRevealed ? { scale: 0.95 } : {}}
                      onClick={() => !isRevealed && handleWarmupCapture(word)}
                      className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                        isRevealed 
                        ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-400 hover:text-emerald-500 hover:border-emerald-500/50 border border-transparent'
                      }`}
                    >
                      {word}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                 <span className="text-sm font-mono text-gray-400">已捕获 {warmupRevealed.size} / {warmupKeywords.length}</span>
                 <button 
                   onClick={() => {
                     reportAction(currentSlideIndex, 'skip_warmup');
                     setShowWarmupGame(false);
                   }}
                   className="text-xs uppercase tracking-widest text-gray-500 hover:text-red-500"
                 >
                   跳过 (扣除经验)
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Modal (Loot Box) */}
      <AnimatePresence>
        {activeDrop && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50, rotate: -5 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
            >
              {/* Rarity Background Glow */}
              <div className={`absolute inset-0 opacity-20 ${
                activeDrop.rarity === 'legendary' ? 'bg-gradient-to-tr from-yellow-500 to-amber-300' :
                activeDrop.rarity === 'epic' ? 'bg-gradient-to-tr from-purple-500 to-fuchsia-400' :
                activeDrop.rarity === 'rare' ? 'bg-gradient-to-tr from-blue-500 to-cyan-400' :
                'bg-gradient-to-tr from-gray-300 to-gray-100'
              }`} />

              <div className="relative z-10 flex flex-col items-center">
                <div className={`p-4 rounded-full mb-6 ${
                  activeDrop.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  activeDrop.rarity === 'epic' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                  activeDrop.rarity === 'rare' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  <Gift className="w-12 h-12" />
                </div>
                
                <h3 className="text-2xl font-bold mb-2">{activeDrop.name}</h3>
                <p className="text-sm font-medium uppercase tracking-widest text-gray-400 mb-4">{activeDrop.rarity}</p>
                <p className="text-gray-600 dark:text-gray-400 mb-8">{activeDrop.description}</p>
                
                <button 
                  onClick={handleClearDrop}
                  className="w-full py-4 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-black font-semibold hover:scale-105 active:scale-95 transition-all"
                >
                  收集
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
