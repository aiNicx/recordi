
import React, { useState } from 'react';
import { AppState, RecordingData, CameraConfig, Language } from './types';
import { useRecorder } from './hooks/useRecorder';
import LandingView from './components/LandingView';
import RecordingOverlay from './components/RecordingOverlay';
import ReviewView from './components/ReviewView';

const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  size: 0.2, // 20% of screen
  borderColor: '#6366f1', // Indigo-500
  borderWidth: 8,
  shape: 'circle',
  position: { x: 0.05, y: 0.7 } // Bottom-left area
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [recordingData, setRecordingData] = useState<RecordingData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(DEFAULT_CAMERA_CONFIG);
  const [language, setLanguage] = useState<Language>('it');

  const handleRecordingStop = (data: RecordingData) => {
    setRecordingData(data);
    setAppState(AppState.REVIEW);
  };

  const { 
    startRecording, 
    stopRecording, 
    togglePause,
    isPaused,
    canvasRef, 
    elapsedTime, 
    isRecording 
  } = useRecorder({
    onStop: handleRecordingStop,
    cameraConfig: cameraConfig
  });

  const handleStart = async () => {
    setErrorMessage(null);
    setAppState(AppState.RECORDING);
    
    try {
        await startRecording();
    } catch (error: any) {
        console.error("Recording failed:", error);
        setAppState(AppState.IDLE);
        setErrorMessage(error.message || "Failed to start recording. Please check permissions.");
    }
  };

  const handleStop = () => {
    stopRecording();
  };

  const handleReset = () => {
    setRecordingData(null);
    setAppState(AppState.IDLE);
    setErrorMessage(null);
  };

  return (
    <>
      {appState === AppState.IDLE && (
        <LandingView 
            onStart={handleStart} 
            error={errorMessage}
            cameraConfig={cameraConfig}
            onUpdateConfig={setCameraConfig}
            language={language}
            onSetLanguage={setLanguage}
        />
      )}
      
      {appState === AppState.RECORDING && (
        <RecordingOverlay 
          elapsedTime={elapsedTime} 
          onStop={handleStop}
          onTogglePause={togglePause}
          isPaused={isPaused}
          canvasRef={canvasRef}
          isInitializing={!isRecording}
          cameraConfig={cameraConfig}
          onUpdateConfig={setCameraConfig}
        />
      )}

      {appState === AppState.REVIEW && recordingData && (
        <ReviewView 
            data={recordingData} 
            onReset={handleReset} 
            language={language}
        />
      )}
    </>
  );
};

export default App;
