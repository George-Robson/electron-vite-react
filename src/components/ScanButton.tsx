import React, { useEffect, useRef, useState } from 'react';
import Button from './ui/Button';
import IconButton from './ui/IconButton';
import { PlatformRecord } from '../type/database'; // type-only import

interface ActiveScanInfo { id: string; platform: string; startedAt: number }

const ScanButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [platforms, setPlatforms] = useState<PlatformRecord[]>([]);
  const [activeScans, setActiveScans] = useState<ActiveScanInfo[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Fetch platforms on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingPlatforms(true);
        const data = await (window as any).electronAPI.db.listPlatforms();
        if (mounted) setPlatforms(data);
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoadingPlatforms(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Position + resize/scroll listeners
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 256 });
  function computePosition() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = 256;
    let top = rect.bottom + 6;
    let left = rect.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    const estimatedHeight = 320;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = rect.top - estimatedHeight - 6;
      if (top < 8) top = Math.max(8, rect.top - 40);
    }
    setDropdownPos({ top, left, width });
  }
  useEffect(() => {
    if (open) {
      computePosition();
      const rePos = () => computePosition();
      window.addEventListener('resize', rePos);
      window.addEventListener('scroll', rePos, true);
      return () => {
        window.removeEventListener('resize', rePos);
        window.removeEventListener('scroll', rePos, true);
      };
    }
  }, [open]);

  // Outside click close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Active scans refresh on progress / completion
  const refreshActiveScans = async () => {
    try {
      const list = await (window as any).electronAPI.scan.list();
      setActiveScans(list);
    } catch {/* ignore */}
  };
  useEffect(() => {
    const unsubP = (window as any).electronAPI.scan.onProgress((p: any) => { if (p.done) refreshActiveScans(); });
    const unsubC = (window as any).electronAPI.scan.onComplete((_r: any) => { refreshActiveScans(); });
    refreshActiveScans();
    return () => { unsubP && unsubP(); unsubC && unsubC(); };
  }, []);

  const isPlatformScanning = (name: string) => activeScans.some(s => s.platform === name);
  const startScan = async (platform: string) => {
    if (isPlatformScanning(platform)) return; // prevent duplicate
    try {
      await (window as any).electronAPI.scan.start(platform);
      refreshActiveScans();
    } catch (e) {
      // surface minimal error; could expand later
      setError(`Failed to start scan: ${(e as any).message || String(e)}`);
    }
  };
  const cancelScan = async (platform: string) => {
    const task = activeScans.find(t => t.platform === platform);
    if (!task) return;
    try {
      await (window as any).electronAPI.scan.cancel(task.id);
      refreshActiveScans();
    } catch {/* ignore */}
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="primary" size="sm" pill onClick={() => setOpen(o => !o)}>Scan</Button>
      {open && (
        <div
          className="fixed z-[999] pointer-events-auto"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          data-scan-dropdown
        >
          <div className="relative">
            <span className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-b-surface/80 border-l-transparent border-r-transparent drop-shadow" />
          </div>
          <div className="w-full rounded-lg elev-4 glass backdrop-blur-md border border-border-soft/50 shadow-lg shadow-black/40 ring-1 ring-black/20 animate-fade-scale origin-top-right overflow-hidden" style={{ animationDuration: '120ms' }}>
            <div className="px-2 py-2 border-b border-border-soft/40 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide opacity-60">Scan Platforms</span>
              <span className="ml-auto text-[10px] opacity-40">{platforms.length}</span>
            </div>
            <div className="max-h-72 overflow-y-auto custom-scroll">
              {loadingPlatforms && <div className="px-3 py-4 text-xs opacity-60">Loading...</div>}
              {error && <div className="px-3 py-2 text-xs text-danger/80">{error}</div>}
              {!loadingPlatforms && !error && platforms.length === 0 && (
                <div className="px-3 py-4 text-xs opacity-50 text-center">No platforms</div>
              )}
              {platforms.map(p => {
                const scanning = isPlatformScanning(p.name);
                const leftIcon = (
                  <div className={`flex items-center justify-center rounded-full w-6 h-6 text-[11px] font-medium bg-gradient-to-br from-primary/60 to-primary-accent/50 text-white ${scanning ? 'ring-1 ring-primary/60 shadow-inner' : 'opacity-85 group-hover:opacity-100'}`}>{p.name.slice(0,1).toUpperCase()}</div>
                );
                const rightIcon = scanning ? (
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    <IconButton
                      variant="ghost"
                      size="sm"
                      tooltip="Cancel scan"
                      onClick={(e) => { e.stopPropagation(); cancelScan(p.name); }}
                      className="w-6 h-6"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </IconButton>
                  </div>
                ) : null;
                const base = 'group w-full justify-start text-left gap-2 text-xs rounded-md !px-2 !py-1.5 transition-colors';
                const bg = scanning
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90'
                  : 'bg-surfaceAlt/40 hover:bg-surfaceAlt/70 text-text';
                return (
                  <Button
                    key={p.id}
                    variant={scanning ? 'primary' : 'ghost'}
                    size='sm'
                    leftIcon={leftIcon}
                    rightIcon={rightIcon}
                    onClick={() => scanning ? null : startScan(p.name)}
                    className={`${base} ${bg} ${scanning ? 'font-semibold' : ''}`}
                    title={scanning ? 'Scanning (click X to cancel)' : 'Start scan'}
                  >
                    <span className="truncate flex-1">{p.name}</span>
                    {scanning && <span className="text-[10px] opacity-80">Scanning…</span>}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 px-2 py-2 border-t border-border-soft/40 bg-surface/40">
              <Button
                variant='ghost'
                size='sm'
                onClick={() => { refreshActiveScans(); setOpen(false); }}
                className='ml-auto text-[10px] !px-2 !py-1 uppercase tracking-wide opacity-70 hover:opacity-100'
              >Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanButton;