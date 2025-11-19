
import React, { useState, useEffect } from 'react';
import { RecordingData, Language } from '../types';
import { ArrowDownTrayIcon, SparklesIcon, ArrowPathIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { generateVideoMetadata } from '../services/geminiService';

interface ReviewViewProps {
  data: RecordingData;
  onReset: () => void;
  language: Language;
}

const ReviewView: React.FC<ReviewViewProps> = ({ data, onReset, language }) => {
  const [meta, setMeta] = useState<{ title: string; description: string } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = data.url;
    // Use webm or mp4 based on mime type source if possible, defaulting to webm for now
    const ext = data.blob.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${meta?.title.replace(/\s+/g, '_') || 'loom_clone_recording'}.${ext}`;
    a.click();
  };

  const generateMagic = async () => {
    if (!data.thumbnail) return;
    setIsLoadingAi(true);
    const result = await generateVideoMetadata(data.thumbnail, language);
    setMeta(result);
    setIsLoadingAi(false);
  };

  useEffect(() => {
    if (data.thumbnail) {
        generateMagic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
                <VideoCameraIcon className="w-6 h-6" />
                <span className="font-bold tracking-tight">LoomClone AI</span>
            </div>
            <button 
                onClick={onReset}
                className="text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
             >
                <ArrowPathIcon className="w-4 h-4" /> 
                {language === 'it' ? "Nuova Registrazione" : "New Recording"}
             </button>
        </div>
      </header>

      <div className="flex-1 p-6 md:p-10 flex flex-col items-center">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            
            {/* Main Content: Video */}
            <div className="lg:col-span-2 space-y-4">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black aspect-video group">
                    <video 
                        src={data.url} 
                        controls 
                        playsInline
                        className="w-full h-full object-contain" 
                        autoPlay
                    />
                </div>
                <div className="flex items-center justify-between px-1">
                    <div className="text-sm text-slate-500">
                        {language === 'it' ? "Registrato il " : "Recorded on "} {new Date().toLocaleDateString()}
                    </div>
                    <div className="text-xs font-mono text-slate-600 bg-slate-900 px-2 py-1 rounded">
                        {(data.blob.size / 1024 / 1024).toFixed(1)} MB • {data.blob.type}
                    </div>
                </div>
            </div>

            {/* Sidebar: AI & Actions */}
            <div className="space-y-6">
                
                {/* AI Card */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                    
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                            <SparklesIcon className="w-5 h-5 text-indigo-400" />
                            {language === 'it' ? "Riepilogo AI" : "AI Summary"}
                        </h2>
                        {isLoadingAi && (
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                    </div>

                    {meta ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                    {language === 'it' ? "Titolo" : "Title"}
                                </label>
                                <div className="text-xl font-semibold text-white leading-snug">
                                    {meta.title}
                                </div>
                            </div>
                            <div className="w-full h-px bg-slate-800"></div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {language === 'it' ? "Descrizione" : "Description"}
                                </label>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {meta.description}
                                </p>
                            </div>
                            <button 
                                onClick={generateMagic}
                                disabled={isLoadingAi}
                                className="pt-2 text-xs text-slate-500 hover:text-indigo-300 transition-colors flex items-center gap-1"
                            >
                                <ArrowPathIcon className="w-3 h-3" /> 
                                {language === 'it' ? "Rigenera" : "Regenerate"}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-600 text-sm">
                            {language === 'it' ? "In attesa della magia dell'AI..." : "Waiting for AI magic..."}
                        </div>
                    )}
                </div>

                {/* Download Card */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
                    <button
                        onClick={handleDownload}
                        className="w-full group relative flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-3.5 px-4 rounded-xl transition-all hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5 text-indigo-600" />
                        {language === 'it' ? "Scarica Video" : "Download Video"}
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-3">
                        {language === 'it' ? "Il video viene elaborato localmente nel tuo browser." : "Your video is processed locally in your browser."}
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewView;
