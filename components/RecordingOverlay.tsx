
import React, { useState, useRef, useEffect } from 'react';
import { StopIcon, Cog6ToothIcon, PauseIcon, PlayIcon, ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { CameraConfig, CameraShape } from '../types';

interface RecordingOverlayProps {
  elapsedTime: number;
  onStop: () => void;
  onTogglePause: () => void;
  isPaused: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isInitializing?: boolean;
  cameraConfig: CameraConfig;
  onUpdateConfig: (config: CameraConfig) => void;
}

const COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ffffff', // White
];

const RecordingOverlay: React.FC<RecordingOverlayProps> = ({ 
  elapsedTime, 
  onStop, 
  onTogglePause,
  isPaused,
  canvasRef,
  isInitializing = false,
  cameraConfig,
  onUpdateConfig
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const resizingRef = useRef<{ startY: number; initialSize: number } | null>(null);
  const [containerBounds, setContainerBounds] = useState({ width: 0, height: 0 });

  // 1. Measure Container for Pixel-Perfect Precision
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
            setContainerBounds({
                width: entry.contentRect.width,
                height: entry.contentRect.height
            });
        }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateConfig = (key: keyof CameraConfig, value: any) => {
      onUpdateConfig({ ...cameraConfig, [key]: value });
  };

  // 2. Consistent Border Radius Logic (Matches useRecorder)
  const getBorderRadius = (shape: CameraShape) => {
      switch(shape) {
          case 'circle': return '50%';
          case 'square': return '15%'; // Proportional radius
          case 'rect': return '35%';   // Proportional radius
          default: return '15%';
      }
  };

  // 3. Calculate EXACT Pixel Size of Camera Bubble
  // This ensures the overlay div is exactly the same size as the drawn canvas circle
  const minDim = Math.min(containerBounds.width || 100, containerBounds.height || 100);
  const cameraPixelSize = minDim * cameraConfig.size;

  // Dragging Logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isSettingsOpen) return;
    e.preventDefault();
    draggingRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialX: cameraConfig.position.x,
        initialY: cameraConfig.position.y
    };
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
      e.stopPropagation(); 
      e.preventDefault();
      resizingRef.current = {
          startY: e.clientY,
          initialSize: cameraConfig.size
      };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
        if (draggingRef.current && containerBounds.width > 0) {
            const { startX, startY, initialX, initialY } = draggingRef.current;
            
            // Calculate movement in percentage relative to container size
            const deltaX = (e.clientX - startX) / containerBounds.width;
            const deltaY = (e.clientY - startY) / containerBounds.height;

            // Constrain: Don't let the box go completely off screen
            // The box width in percentage is (cameraPixelSize / containerBounds.width)
            // We allow dragging up to 1.0 - boxWidth%
            const boxWidthPct = cameraPixelSize / containerBounds.width;
            const boxHeightPct = cameraPixelSize / containerBounds.height;

            const newX = Math.max(0, Math.min(1 - boxWidthPct, initialX + deltaX));
            const newY = Math.max(0, Math.min(1 - boxHeightPct, initialY + deltaY));

            updateConfig('position', { x: newX, y: newY });
        }
        
        if (resizingRef.current && containerBounds.height > 0) {
             const { startY, initialSize } = resizingRef.current;
             
             // Pulling down increases size
             // Sensitivity: 1px mouse move = 0.05% size change roughly
             // Let's normalize: moving full height doubles size? No, let's simple delta
             const delta = (e.clientY - startY) / containerBounds.height;
             
             const newSize = Math.max(0.1, Math.min(0.5, initialSize + delta));
             updateConfig('size', newSize);
        }
    };

    const handlePointerUp = () => {
        draggingRef.current = null;
        resizingRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
    };
  });

  // Determine popover position based on camera position
  const popoverPositionClass = cameraConfig.position.x > 0.5 
    ? 'right-full mr-4 origin-top-right' 
    : 'left-full ml-4 origin-top-left';

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      
      {isInitializing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
            <p className="text-lg font-medium text-white">Initializing Studio...</p>
            <p className="text-sm text-slate-400 mt-2">Select your screen to begin</p>
        </div>
      )}

      {/* Canvas Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
         <div 
            ref={containerRef}
            className={`relative inline-block shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-black/50 backdrop-blur transition-opacity duration-300 ${isPaused ? 'opacity-50 grayscale' : 'opacity-100'}`}
         >
            {/* The Real Canvas (Recorded) */}
            <canvas 
                ref={canvasRef} 
                className="max-w-full max-h-[90vh] object-contain block"
            />

            {/* Interactive Layer (Not Recorded, Visible to User) */}
            {!isInitializing && containerBounds.width > 0 && (
                <div 
                    className="absolute inset-0 z-30 pointer-events-none"
                >
                    {/* Draggable Box representing Camera */}
                    <div
                        onPointerDown={handlePointerDown}
                        className="absolute group touch-none"
                        style={{
                            left: `${cameraConfig.position.x * 100}%`,
                            top: `${cameraConfig.position.y * 100}%`,
                            // Use calculated PIXEL size to match canvas exactly
                            width: `${cameraPixelSize}px`, 
                            height: `${cameraPixelSize}px`,
                            pointerEvents: 'auto',
                            borderRadius: getBorderRadius(cameraConfig.shape),
                        }}
                    >
                        {/* Visual Selection Border & Interactive Area */}
                        <div 
                            className={`relative w-full h-full transition-all duration-200 border-2 ${isSettingsOpen ? 'border-indigo-500/50' : 'border-transparent group-hover:border-white/30 border-dashed'}`}
                            style={{ borderRadius: 'inherit' }}
                        >
                             
                             {/* Settings Trigger Button */}
                             <div className={`absolute -top-3 -right-3 transition-opacity duration-200 ${isSettingsOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                 <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className={`p-2 rounded-full shadow-lg border border-white/10 transition-all ${isSettingsOpen ? 'bg-indigo-600 text-white rotate-90' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                 >
                                     {isSettingsOpen ? <XMarkIcon className="w-4 h-4" /> : <Cog6ToothIcon className="w-4 h-4" />}
                                 </button>
                             </div>

                             {/* Resize Handle */}
                             <div 
                                onPointerDown={handleResizePointerDown}
                                className={`absolute -bottom-2 -right-2 w-6 h-6 bg-white text-indigo-600 rounded-full shadow-lg flex items-center justify-center cursor-nwse-resize transition-all duration-200 z-10 hover:scale-110 active:scale-95 ${isSettingsOpen ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
                             >
                                 <ArrowsPointingOutIcon className="w-3 h-3" />
                             </div>

                            {/* Floating Settings Menu */}
                            <div 
                                onPointerDown={(e) => e.stopPropagation()}
                                className={`absolute top-0 w-60 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-2xl p-4 flex flex-col gap-4 transition-all duration-300 ease-out ${popoverPositionClass} ${isSettingsOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 pointer-events-none'}`}
                            >
                                {/* Shape */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Shape</label>
                                    <div className="flex bg-slate-800/50 p-1 rounded-lg">
                                        {(['circle', 'square', 'rect'] as CameraShape[]).map(shape => (
                                            <button
                                                key={shape}
                                                onClick={() => updateConfig('shape', shape)}
                                                className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${cameraConfig.shape === shape ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                {shape}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Border Width */}
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                                        <span>Border</span>
                                        <span className="text-indigo-400">{cameraConfig.borderWidth}px</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="20" step="1"
                                        value={cameraConfig.borderWidth}
                                        onChange={(e) => updateConfig('borderWidth', parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* Colors */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color</label>
                                    <div className="flex justify-between gap-1">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateConfig('borderColor', color)}
                                                className={`w-6 h-6 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-110 ${cameraConfig.borderColor === color ? 'ring-white scale-110' : 'ring-transparent opacity-60 hover:opacity-100'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="bg-black/70 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white/10 shadow-2xl animate-pulse-slow">
                        <span className="text-2xl font-black tracking-widest text-amber-400">PAUSED</span>
                    </div>
                </div>
            )}
         </div>
      </div>

      {/* Bottom Controls (Floating) */}
      {!isInitializing && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in-up z-40">
            <div className={`flex items-center gap-4 bg-slate-900/90 backdrop-blur-xl border p-2 pl-6 pr-2 rounded-full shadow-2xl ring-1 ring-white/10 transition-colors ${isPaused ? 'border-amber-500/50' : 'border-slate-700/50'}`}>
                
                <div className="flex items-center gap-3">
                    {!isPaused ? (
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </div>
                    ) : (
                         <div className="relative flex h-3 w-3">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </div>
                    )}
                    <span className={`font-mono text-xl font-bold tabular-nums ${isPaused ? 'text-amber-400' : 'text-white'}`}>
                        {formatTime(elapsedTime)}
                    </span>
                </div>

                <div className="h-8 w-px bg-slate-700 mx-2"></div>

                {/* Pause Button */}
                <button
                    onClick={onTogglePause}
                    className={`p-3 rounded-full transition-all hover:scale-105 active:scale-95 ${isPaused ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                    title={isPaused ? "Resume" : "Pause"}
                >
                    {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                </button>

                {/* Stop Button */}
                <button
                    onClick={onStop}
                    className="group flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/25"
                >
                    <StopIcon className="w-5 h-5 group-hover:animate-pulse" />
                    <span>Finish</span>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default RecordingOverlay;
