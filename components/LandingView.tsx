
import React, { useEffect, useRef, useState } from 'react';
import { VideoCameraIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { CameraConfig, CameraShape, Language } from '../types';

interface LandingViewProps {
  onStart: () => void;
  error?: string | null;
  cameraConfig: CameraConfig;
  onUpdateConfig: (config: CameraConfig) => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
}

const COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ffffff', // White
];

const FlagIcon: React.FC<{ lang: Language }> = ({ lang }) => {
    if (lang === 'it') {
        return (
            <svg className="w-6 h-6 rounded-full object-cover shadow-sm border border-white/10" viewBox="0 0 640 480">
                <g fillRule="evenodd" strokeWidth="1pt">
                    <path fill="#fff" d="M0 0h640v480H0z"/>
                    <path fill="#009246" d="M0 0h213.3v480H0z"/>
                    <path fill="#ce2b37" d="M426.7 0H640v480H426.7z"/>
                </g>
            </svg>
        );
    }
    return (
        <svg className="w-6 h-6 rounded-full object-cover shadow-sm border border-white/10" viewBox="0 0 640 480">
            <path fill="#012169" d="M0 0h640v480H0z"/>
            <path fill="#FFF" d="M75 0l244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/>
            <path fill="#C8102E" d="M424 294l216 163v23H506L312 336 120 480H0v-23l213-163h211zm-114-85L551 0h89L393 183l-83 26zm-94 62L0 429v-86l122-90 94 18zM328 0l-92 69-115-88 109-18 98 37zM102 226L0 150V64l184 138-82 24z"/>
            <path fill="#FFF" d="M250 0h140v480H250zM0 170h640v140H0z"/>
            <path fill="#C8102E" d="M280 0h80v480h-80zM0 200h640v80H0z"/>
        </svg>
    );
};

const LandingView: React.FC<LandingViewProps> = ({ 
    onStart, 
    error, 
    cameraConfig, 
    onUpdateConfig,
    language,
    onSetLanguage
}) => {
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewBounds, setPreviewBounds] = useState({ width: 0, height: 0 });

  // Track container size to render preview exactly like the real recorder
  useEffect(() => {
      if (!containerRef.current) return;
      const observer = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (entry) {
              setPreviewBounds({
                  width: entry.contentRect.width,
                  height: entry.contentRect.height
              });
          }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false
            });
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }
            setHasPermission(true);
        } catch (err) {
            console.error("Camera permission denied for preview", err);
            setHasPermission(false);
        }
    };

    initCamera();

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  const updateConfig = (key: keyof CameraConfig, value: any) => {
    onUpdateConfig({ ...cameraConfig, [key]: value });
  };

  // Calculate Pixel Size based on Min Dimension (same logic as recorder)
  const minDim = Math.min(previewBounds.width || 100, previewBounds.height || 100);
  const cameraPixelSize = minDim * cameraConfig.size;

  const getBorderRadius = (shape: CameraShape) => {
      switch(shape) {
          case 'circle': return '50%';
          case 'square': return '15%';
          case 'rect': return '35%';
          default: return '15%';
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative">
      
      {/* Language Selector (Top Right) */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-slate-900/50 backdrop-blur-md p-1.5 rounded-full border border-slate-800 shadow-lg">
        <button 
            onClick={() => onSetLanguage('it')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm font-medium ${language === 'it' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
            <FlagIcon lang="it" />
            <span>ITA</span>
        </button>
        <button 
            onClick={() => onSetLanguage('en')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm font-medium ${language === 'en' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
            <FlagIcon lang="en" />
            <span>ENG</span>
        </button>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Intro & Controls */}
        <div className="space-y-8">
            <div>
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-4">
                    LoomClone AI
                </h1>
                <p className="text-slate-400 text-lg">
                    {language === 'it' 
                        ? "Configura il tuo studio. Quando sei pronto, inizia a condividere lo schermo." 
                        : "Configure your recording studio. When you're ready, start sharing your screen."}
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-200">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0 text-red-500" />
                    <div>
                        <p className="font-bold text-red-400">{language === 'it' ? "Registrazione Fallita" : "Recording Failed"}</p>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                </div>
            )}

            {/* Configuration Controls */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6 backdrop-blur-sm">
                
                {/* Shape Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {language === 'it' ? "Forma Fotocamera" : "Camera Shape"}
                    </label>
                    <div className="flex gap-3">
                        {(['circle', 'square', 'rect'] as CameraShape[]).map(shape => (
                            <button
                                key={shape}
                                onClick={() => updateConfig('shape', shape)}
                                className={`flex-1 py-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                                    cameraConfig.shape === shape 
                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                                    : 'bg-slate-800 border-transparent text-slate-500 hover:bg-slate-800/80'
                                }`}
                            >
                                <div className={`w-6 h-6 border-2 ${cameraConfig.shape === shape ? 'border-indigo-400' : 'border-slate-500'} ${shape === 'circle' ? 'rounded-full' : shape === 'square' ? 'rounded-sm' : 'rounded-lg'}`} />
                                <span className="text-xs font-bold capitalize">{shape}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sliders Row */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-500 uppercase">{language === 'it' ? "Dimensione" : "Size"}</span>
                            <span className="text-indigo-400">{Math.round(cameraConfig.size * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0.1" max="0.5" step="0.01" 
                            value={cameraConfig.size}
                            onChange={(e) => updateConfig('size', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-500 uppercase">{language === 'it' ? "Bordo" : "Border"}</span>
                            <span className="text-indigo-400">{cameraConfig.borderWidth}px</span>
                        </div>
                        <input 
                            type="range" min="0" max="20" step="1" 
                            value={cameraConfig.borderWidth}
                            onChange={(e) => updateConfig('borderWidth', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                </div>

                {/* Color Picker */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {language === 'it' ? "Colore Bordo" : "Border Color"}
                    </label>
                    <div className="flex gap-3">
                        {COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => updateConfig('borderColor', color)}
                                className={`w-8 h-8 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-110 ${
                                    cameraConfig.borderColor === color ? 'ring-white scale-110' : 'ring-transparent opacity-50 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <button
                onClick={onStart}
                disabled={hasPermission === false}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-2xl text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transform transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
                <VideoCameraIcon className="w-6 h-6" />
                {language === 'it' ? "Avvia Registrazione" : "Start Recording"}
            </button>
        </div>

        {/* Right Side: Live Preview */}
        <div ref={containerRef} className="relative aspect-video bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center group">
            
            {/* Mock Screen Background */}
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center opacity-50">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-slate-700 rounded-xl mx-auto mb-2"></div>
                    <div className="w-32 h-2 bg-slate-700 rounded mx-auto"></div>
                    <div className="w-24 h-2 bg-slate-700 rounded mx-auto"></div>
                </div>
            </div>

            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]"></div>
            
            <div className="absolute top-6 left-6 right-6 h-8 bg-slate-800 rounded-lg flex items-center px-3 gap-2 border border-white/5">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                </div>
                <div className="flex-1 h-4 bg-slate-900 rounded text-[10px] text-slate-500 flex items-center px-2 font-mono">
                    https://loom-clone.ai/studio
                </div>
            </div>

            {/* The Camera Bubble Preview */}
            {previewBounds.width > 0 && (
                <div 
                    className="absolute z-10 overflow-hidden transition-all duration-300 ease-out shadow-2xl"
                    style={{
                        width: `${cameraPixelSize}px`,
                        height: `${cameraPixelSize}px`,
                        left: `${cameraConfig.position.x * 100}%`,
                        top: `${cameraConfig.position.y * 100}%`,
                        borderRadius: getBorderRadius(cameraConfig.shape),
                        borderWidth: `${cameraConfig.borderWidth}px`,
                        borderColor: cameraConfig.borderColor,
                        boxShadow: `0 10px 30px -10px rgba(0,0,0,0.5)`
                    }}
                >
                    {hasPermission === false ? (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500">
                            <VideoCameraIcon className="w-8 h-8 opacity-50" />
                        </div>
                    ) : (
                        <video
                            ref={videoPreviewRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
            )}

            {/* Instructions overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="bg-black/50 backdrop-blur px-4 py-2 rounded-full text-sm font-medium border border-white/10 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-indigo-400" /> {language === 'it' ? "Anteprima" : "Preview Mode"}
                </span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default LandingView;
