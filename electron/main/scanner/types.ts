import type { BrowserWindow } from 'electron';
import type { PlatformRecord } from '../db';

export interface ScanProgress {
  id: string;                // unique scan id
  platform: string;          // platform being scanned
  phase?: string;            // current phase label
  current?: number;          // current item processed
  total?: number;            // total items (if known)
  message?: string;          // status text
  done?: boolean;            // marks completion when true
  error?: string;            // error message if failed
}

export interface ScannedGameCandidate {
  title: string;
  platform: string; // platform name
  genre?: string;
  tags?: string[];
  release_date?: string | null;
}

export interface ScanResult {
  id: string;                   // scan id
  platform: string;             // scanned platform
  added: number;                // number of games inserted
  candidates: ScannedGameCandidate[]; // raw candidate list
  durationMs: number;           // total duration
}

export interface PlatformScanner {
  name: string; // e.g. 'Steam'
  // Determine if scanner can run (e.g., API key present). Throw or return false to block.
  canRun(): boolean | Promise<boolean>;
  // Perform scan and yield progress events via callback; returns candidates list.
  scan(progress: (p: Partial<ScanProgress>) => void): Promise<ScannedGameCandidate[]>;
}

export type ScannerMap = Record<string, PlatformScanner>;

export interface ScanTaskState {
  id: string;
  platform: string;
  startedAt: number;
  cancelled: boolean;
}

export function emitProgress(win: BrowserWindow | null, data: ScanProgress) {
  if (!win) return;
  win.webContents.send('scan-progress', data);
}

export function emitComplete(win: BrowserWindow | null, result: ScanResult) {
  if (!win) return;
  win.webContents.send('scan-complete', result);
}
