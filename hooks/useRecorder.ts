
import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingData, CameraConfig } from '../types';

interface UseRecorderProps {
  onStop: (data: RecordingData) => void;
  cameraConfig: CameraConfig;
}

const getSupportedMimeType = () => {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
};

export const useRecorder = ({ onStop, cameraConfig }: UseRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Keep a ref of config so the animation loop can access the latest value without restarting
  const configRef = useRef(cameraConfig);
  useEffect(() => {
    configRef.current = cameraConfig;
  }, [cameraConfig]);

  // Timer Logic
  useEffect(() => {
    let interval: number;
    if (isRecording && !isPaused) {
      interval = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startRecording = useCallback(async () => {
    setError(null);
    setElapsedTime(0);
    chunksRef.current = [];
    setIsPaused(false);
    
    try {
      // 1. Create and attach hidden video elements to DOM
      const screenVid = document.createElement('video');
      screenVid.style.display = 'none';
      screenVid.muted = true;
      screenVid.playsInline = true;
      document.body.appendChild(screenVid);
      screenVideoRef.current = screenVid;

      const camVid = document.createElement('video');
      camVid.style.display = 'none';
      camVid.muted = true;
      camVid.playsInline = true;
      document.body.appendChild(camVid);
      cameraVideoRef.current = camVid;

      // 2. Get Screen Stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: 30 
        },
        audio: true,
      });

      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording(); 
      };

      // 3. Get Camera/Mic Stream
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 }, 
            facingMode: 'user' 
        },
        audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
        }
      });

      screenVid.srcObject = screenStream;
      camVid.srcObject = userStream;

      await Promise.all([
        screenVid.play(),
        camVid.play()
      ]);

      // 4. Setup Canvas
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not initialized");
      
      const { width, height } = screenStream.getVideoTracks()[0].getSettings();
      canvas.width = width || 1920;
      canvas.height = height || 1080;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      
      const draw = () => {
        if (!ctx || !screenVideoRef.current || !cameraVideoRef.current) return;

        const { size, shape, borderColor, borderWidth, position } = configRef.current;

        // Draw Screen
        if (screenVideoRef.current.readyState >= 2) {
            ctx.drawImage(screenVideoRef.current, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw Camera (PIP)
        if (cameraVideoRef.current.readyState >= 2) {
            // Calculate dynamic size based on percentage of MIN dimension (standard behavior)
            const minDim = Math.min(canvas.width, canvas.height);
            const camDrawSize = minDim * size; 
            
            // Use config position (percentage) converted to pixels
            const x = position.x * canvas.width;
            const y = position.y * canvas.height;

            ctx.save();
            
            // 1. Define Path
            ctx.beginPath();
            if (shape === 'circle') {
                ctx.arc(x + camDrawSize / 2, y + camDrawSize / 2, camDrawSize / 2, 0, Math.PI * 2);
            } else {
                // Proportional corner radius for consistent look at any size
                // Square: 15%, Rect (Squircle): 35%
                const radius = shape === 'square' ? camDrawSize * 0.15 : camDrawSize * 0.35;
                
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, camDrawSize, camDrawSize, radius);
                } else {
                    ctx.rect(x, y, camDrawSize, camDrawSize);
                }
            }
            ctx.closePath();

            // 2. Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;

            // 3. Clip! Everything after this stays inside the shape
            ctx.clip();

            // Reset shadow for content
            ctx.shadowColor = 'transparent';
            
            // 4. Draw Video (Center Crop / Cover)
            const vw = cameraVideoRef.current.videoWidth;
            const vh = cameraVideoRef.current.videoHeight;
            const aspect = vw / vh;
            
            let drawW = camDrawSize;
            let drawH = camDrawSize;
            let offX = 0;
            let offY = 0;

            if (aspect > 1) {
                // Landscape source
                drawW = camDrawSize * aspect;
                offX = -(drawW - camDrawSize) / 2;
            } else {
                // Portrait source
                drawH = camDrawSize / aspect;
                offY = -(drawH - camDrawSize) / 2;
            }

            // Draw video at the calculated position relative to the box
            ctx.drawImage(cameraVideoRef.current, x + offX, y + offY, drawW, drawH);

            // 5. Inner Border
            // To draw a border *inside* the clipped area, we set lineWidth to double the desired width.
            // The clip clips the outer half, leaving exactly `borderWidth` visible inside.
            if (borderWidth > 0) {
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = borderWidth * 2; 
                ctx.stroke();
            }

            ctx.restore();
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };
      
      draw();

      // 5. Audio Mixing
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
          await audioContext.resume();
      }

      const destNode = audioContext.createMediaStreamDestination();
      
      if (userStream.getAudioTracks().length > 0) {
        const micSource = audioContext.createMediaStreamSource(userStream);
        micSource.connect(destNode);
      }
      
      if (screenStream.getAudioTracks().length > 0) {
        const sysSource = audioContext.createMediaStreamSource(screenStream);
        sysSource.connect(destNode);
      }

      // 6. MediaRecorder Setup
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destNode.stream.getAudioTracks()
      ]);
      
      streamRef.current = combinedStream;

      const mimeType = getSupportedMimeType();
      if (!mimeType) throw new Error("No supported video MIME type found");

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 3000000 
      });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        cleanup();

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const thumbnail = canvas.toDataURL('image/png');
        
        onStop({ blob, url, thumbnail });
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);

    } catch (err: any) {
      console.error("Error starting recording:", err);
      cleanup();
      setError(err.message || "Failed to start recording");
      throw err;
    }
  }, [onStop]);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const cleanup = () => {
    if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
        screenVideoRef.current.remove();
        screenVideoRef.current = null;
    }
    if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = null;
        cameraVideoRef.current.remove();
        cameraVideoRef.current = null;
    }

    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    error,
    startRecording,
    stopRecording,
    togglePause,
    canvasRef,
    elapsedTime
  };
};
