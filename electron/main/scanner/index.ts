import crypto from 'node:crypto';
import { BrowserWindow } from 'electron';
import { insertGame } from '../db';
import { steamScanner } from './steam';
import { PlatformScanner, ScannerMap, ScanTaskState, emitProgress, emitComplete, ScanProgress, ScanResult } from './types';

const scanners: ScannerMap = {
  Steam: steamScanner,
  // Add new platform implementations here, e.g. Epic: epicScanner
};

const activeTasks = new Map<string, ScanTaskState>();

export function startScan(win: BrowserWindow | null, platform: string) {
  const scanner = scanners[platform];
  if (!scanner) throw new Error(`No scanner registered for platform: ${platform}`);
  const id = crypto.randomUUID();
  const state: ScanTaskState = { id, platform, startedAt: Date.now(), cancelled: false };
  activeTasks.set(id, state);
  (async () => {
    const canRun = await scanner.canRun();
    if (!canRun) {
      emitProgress(win, { id, platform, error: 'Scanner prerequisites not met', done: true });
      activeTasks.delete(id);
      return;
    }
    emitProgress(win, { id, platform, phase: 'start', message: 'Scan started' });
    const t0 = Date.now();
    try {
      const candidates = await scanner.scan(p => {
        if (state.cancelled) return; // ignore further progress
        emitProgress(win, { id, platform, ...p } as ScanProgress);
      });
      if (state.cancelled) {
        emitProgress(win, { id, platform, phase: 'cancelled', message: 'Scan cancelled', done: true });
        activeTasks.delete(id);
        return;
      }
      // Basic insertion (dedupe check can be added later)
      let added = 0;
      for (const c of candidates) {
        try {
          // Insert minimal record; platform string is acceptable (internally resolved)
          insertGame({ title: c.title, platform: c.platform as any, genre: c.genre || 'Unknown', tags: c.tags });
          added++;
        } catch (e) {
          // ignore duplicates or platform resolution errors
        }
      }
      const durationMs = Date.now() - t0;
      emitProgress(win, { id, platform, phase: 'done', message: `Added ${added} games`, done: true });
      emitComplete(win, { id, platform, added, candidates, durationMs } as ScanResult);
    } catch (err: any) {
      emitProgress(win, { id, platform, error: err.message || String(err), done: true });
    } finally {
      activeTasks.delete(id);
    }
  })();
  return id;
}

export function cancelScan(id: string) {
  const task = activeTasks.get(id);
  if (task) {
    task.cancelled = true;
    activeTasks.delete(id);
    return true;
  }
  return false;
}

export function listActiveScans() {
  return Array.from(activeTasks.values()).map(t => ({ id: t.id, platform: t.platform, startedAt: t.startedAt }));
}
