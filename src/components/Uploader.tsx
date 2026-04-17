'use client';

import { useState } from 'react';
import { Upload, FilePlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Uploader({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        onUploadSuccess();
      } else {
        alert('上传失败');
      }
    } catch (err) {
      console.error(err);
      alert('上传错误');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="relative group cursor-pointer border border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center text-muted hover:text-foreground hover:border-foreground/30 transition-all duration-300 bg-surface/50 backdrop-blur-md">
      <input 
        type="file" 
        accept=".txt,.pdf,.epub" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <AnimatePresence mode="wait">
        {isUploading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-muted" />
            <p className="text-sm font-medium">正在提取您的书籍...</p>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <p className="font-semibold mb-1">添加新书</p>
            <p className="text-xs text-muted opacity-70">支持 TXT, PDF, EPUB</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
