export interface AudioFile {
  id: string;
  name: string;
  path: string;
  size: number;
  extension: string;
  source?: 'manual' | 'watch';
}

export interface AudioInfo {
  success: boolean;
  file?: string;
  filename?: string;
  sample_rate?: number;
  duration?: number;
  duration_formatted?: string;
  channels?: number;
  file_size?: number;
  bit_depth?: number;
  rms_dbfs?: number;
  peak_dbfs?: number;
  peak?: number;
  error?: string;
}

export interface WaveformData {
  success: boolean;
  file?: string;
  sample_rate?: number;
  duration?: number;
  channels?: number;
  total_samples?: number;
  peaks?: number[];
  num_peaks?: number;
  error?: string;
}

export interface ProgressData {
  type: string;
  percent: number;
  message: string;
}

export interface MergeResult {
  success: boolean;
  cancelled?: boolean;
  output_path?: string;
  sample_rate?: number;
  channels?: number;
  duration?: number;
  total_samples?: number;
  tracks_merged?: number;
  error?: string;
}

export interface CancelResult {
  success: boolean;
  killed?: boolean;
  message?: string;
}

export interface FolderWatchEntry {
  id: string;
  type: 'added' | 'system' | 'error' | 'failed';
  filePath: string;
  name: string;
  time: number;
  note?: string;
}

export interface FolderWatchStatus {
  watched: boolean;
  path: string | null;
  detectedCount: number;
  autoEnqueue: boolean;
  recent: FolderWatchEntry[];
}

export interface FolderWatchStartResult {
  success: boolean;
  status?: FolderWatchStatus;
  error?: string;
}

export interface ElectronAPI {
  selectAudioFiles: () => Promise<AudioFile[]>;
  selectOutputDirectory: () => Promise<string | null>;
  selectFolderDialog: (title?: string) => Promise<string | null>;
  saveFileDialog: (defaultName?: string) => Promise<string | null>;

  analyzeWaveform: (filePath: string) => Promise<WaveformData>;
  getAudioInfo: (filePath: string) => Promise<AudioInfo>;
  mergeAudioTracks: (config: unknown) => Promise<MergeResult>;
  cancelMerge: () => Promise<CancelResult>;

  folderWatchStart: (folderPath: string, options?: { autoEnqueue?: boolean; scanExisting?: boolean }) => Promise<FolderWatchStartResult>;
  folderWatchStop: () => Promise<{ success: boolean; status: FolderWatchStatus }>;
  folderWatchStatus: () => Promise<FolderWatchStatus>;
  folderWatchRescan: () => Promise<{ success: boolean; scanned: number; status: FolderWatchStatus }>;
  folderWatchSetAutoEnqueue: (value: boolean) => Promise<{ success: boolean; status: FolderWatchStatus }>;
  folderWatchClearProcessed: () => Promise<{ success: boolean; status: FolderWatchStatus }>;

  onMergeProgress: (callback: (progress: ProgressData) => void) => () => void;
  removeMergeProgressListener: () => void;

  onWatchedNewFile: (callback: (fileInfo: AudioFile) => void) => () => void;
  onWatchedStatusChange: (callback: (status: FolderWatchStatus) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
