
import React, { useEffect, useState } from 'react';
import { MdMinimize } from 'react-icons/md';
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
      className="flex items-center justify-between h-6 px-2 bg-selection border-b border-border select-none shadow-sm"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 pl-2">
        <span className="text-stone-300 text-xs font-medium">Arcana</span>
      </div>
      <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          className="group p-1.5 mt-1 rounded-md bg-transparent transition border-none cursor-pointer"
          title="Minimize"
          onClick={() => electronAPI?.minimize()}
        >
          <VscChromeMinimize className='text-stone-400 group-hover:text-stone-100' />
        </button>
        <button
          className="group p-1.5 mt-1 rounded-md bg-transparent transition border-none cursor-pointer"
          title={isMaximized ? 'Restore' : 'Maximize'}
          onClick={() => electronAPI?.maximize()}
        >
          {isMaximized ? (
            <VscChromeRestore className='text-stone-400 group-hover:text-stone-100' />
          ) : (
            <VscChromeMaximize className='text-stone-400 group-hover:text-stone-100' />
          )}
        </button>
        <button
          className="group p-1.5 mt-1 rounded-md bg-transparent transition border-none cursor-pointer"
          title="Close"
          onClick={() => electronAPI?.close()}
        >
          <VscClose className='text-stone-400 group-hover:text-stone-100' />
        </button>
      </div>
    </div>
  );
};

export default Titlebar;
