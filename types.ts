
export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  REVIEW = 'REVIEW',
}

export type CameraShape = 'circle' | 'square' | 'rect';

export type Language = 'it' | 'en';

export interface CameraConfig {
  size: number; // 0.1 to 0.5 (percentage of canvas min dimension)
  borderColor: string;
  borderWidth: number;
  shape: CameraShape;
  position: { x: number; y: number }; // 0.0 to 1.0 (percentage of canvas width/height)
}

export interface RecorderConfig {
  showCamera: boolean;
  showScreen: boolean;
  audioEnabled: boolean;
}

export interface RecordingData {
  blob: Blob;
  url: string;
  thumbnail?: string; // Base64 data URI
}
