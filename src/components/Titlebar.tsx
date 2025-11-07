
import React, { useEffect, useState } from 'react';
import { VscChromeMaximize, VscChromeRestore, VscChromeMinimize, VscClose } from 'react-icons/vsc';



const Titlebar: React.FC = () => {
  // @ts-ignore
  const electronAPI = window.electronAPI;
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!electronAPI) return;
    // Initial state
    electronAPI.isMaximized().then(setIsMaximized);
    // Listen for maximize/unmaximize events
    const handleMax = () => setIsMaximized(true);
    const handleUnmax = () => setIsMaximized(false);
    electronAPI.onWindowMaximize(handleMax);
    electronAPI.onWindowUnmaximize(handleUnmax);
    return () => {
      electronAPI.off && electronAPI.off('window:maximized', handleMax);
      electronAPI.off && electronAPI.off('window:unmaximized', handleUnmax);
    };
  }, [electronAPI]);

  return (
    <div
      className="fixed top-0 left-0 right-0 w-screen flex items-center flex justify-between h-8 glass elev-sm border-b border-border/40 select-none z-50"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={() => electronAPI?.maximize()}
    >
      <div className="flex items-center gap-2 pl-2 h-full">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70 shadow-sm" />
        <span className="text-[11px] tracking-wide font-medium text-text-soft">Arcana</span>
      </div>
      <div className="flex justify-end items-center gap-0.5 h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          className="group w-7 h-7 bg-transparent border-none hover:bg-surface-alt text-text-mute hover:text-text transition cursor-pointer"
          title="Minimize"
          aria-label="Minimize window"
          onClick={() => electronAPI?.minimize()}
        >
          <VscChromeMinimize className="text-slate-400 group-hover:text-slate-100" />
        </button>
        <button
          className="group w-7 h-7 bg-transparent border-none hover:bg-surface-alt text-text-mute hover:text-text transition cursor-pointer"
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          onClick={() => electronAPI?.maximize()}
        >
          {isMaximized ? (
            <VscChromeRestore className="text-slate-400 group-hover:text-slate-100" />
          ) : (
            <VscChromeMaximize className="text-slate-400 group-hover:text-slate-100" />
          )}
        </button>
        <button
          className="group w-7 h-7 bg-transparent border-none hover:bg-danger/20 text-text-mute hover:text-danger transition cursor-pointer"
          title="Close"
          aria-label="Close window"
          onClick={() => electronAPI?.close()}
        >
          <VscClose className="text-slate-400 group-hover:text-slate-100" />
        </button>
      </div>
    </div>
  );
};

export default Titlebar;
