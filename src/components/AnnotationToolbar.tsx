'use client';

import { useState, useEffect, useCallback } from 'react';
import { Highlighter, MessageSquareText, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnnotationToolbarProps {
  onHighlight: (color: string) => void;
  onNote: (color: string) => void;
  visible: boolean;
  position: { top: number; left: number };
}

const HIGHLIGHT_COLORS = [
  { key: 'yellow', label: '黄色' },
  { key: 'green', label: '绿色' },
  { key: 'blue', label: '蓝色' },
  { key: 'pink', label: '粉色' },
  { key: 'orange', label: '橙色' },
];

const COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-400',
  green: 'bg-green-400',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400',
  orange: 'bg-orange-400',
};

export default function AnnotationToolbar({ onHighlight, onNote, visible, position }: AnnotationToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const [selectedColor, setSelectedColor] = useState('yellow');

  // Reset color picker when toolbar hides
  useEffect(() => {
    if (!visible) { setShowColors(false); setSelectedColor('yellow'); }
  }, [visible]);

  const handleHighlight = useCallback(() => {
    if (showColors) {
      // Color picker already open — do nothing, user picks a color
      return;
    }
    // Use selected color (or default yellow)
    onHighlight(selectedColor);
  }, [showColors, onHighlight, selectedColor]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[200] flex flex-col items-center"
          style={{
            top: position.top - (showColors ? 52 : 44),
            left: position.left,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-1 bg-foreground text-background px-2 py-1.5 rounded-xl shadow-2xl">
            <button
              onClick={handleHighlight}
              onMouseEnter={() => setShowColors(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-background/20 transition-colors text-sm font-medium"
              title="标注"
            >
              <Highlighter className="w-4 h-4" />
              <span className="hidden md:inline">标注</span>
            </button>

            <button
              onClick={() => onNote(selectedColor)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-background/20 transition-colors text-sm font-medium"
              title="笔记"
            >
              <MessageSquareText className="w-4 h-4" />
              <span className="hidden md:inline">笔记</span>
            </button>

            <button
              onMouseEnter={() => setShowColors(true)}
              className="p-1.5 rounded-lg hover:bg-background/20 transition-colors"
              title="颜色"
            >
              <Palette className="w-4 h-4" />
            </button>
          </div>

          {/* Color picker */}
          <AnimatePresence>
            {showColors && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mt-1 flex items-center gap-1.5 bg-foreground text-background px-3 py-2 rounded-xl shadow-2xl"
                onMouseLeave={() => setShowColors(false)}
              >
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => { setSelectedColor(c.key); onHighlight(c.key); setShowColors(false); }}
                    className={`w-6 h-6 rounded-full ${COLOR_CLASSES[c.key]} hover:scale-125 transition-transform border-2 ${selectedColor === c.key ? 'border-foreground/50' : 'border-transparent'} hover:border-foreground/30`}
                    title={c.label}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
