
import Titlebar from './Titlebar';
import SideBar from './SideBar';
import TopBar from './TopBar';
import React, { useEffect, useState } from 'react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const SIDEBAR_MIN = 160;
    const SIDEBAR_MAX = 420;
    const SIDEBAR_COLLAPSED = 56;

    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        const stored = localStorage.getItem('sidebarWidth');
        const w = stored ? parseInt(stored, 10) : 208; // 52*4 default
        return isNaN(w) ? 208 : Math.min(Math.max(w, SIDEBAR_MIN), SIDEBAR_MAX);
    });
    const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem('sidebarCollapsed') === 'true');
    const [resizing, setResizing] = useState(false);

    useEffect(() => {
        localStorage.setItem('sidebarWidth', String(sidebarWidth));
    }, [sidebarWidth]);
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(collapsed));
    }, [collapsed]);

    useEffect(() => {
        function onMove(e: MouseEvent) {
            if (!resizing || collapsed) return;
            const next = Math.min(Math.max(e.clientX, SIDEBAR_MIN), SIDEBAR_MAX);
            setSidebarWidth(next);
        }
        function onUp() { setResizing(false); }
        if (resizing) {
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [resizing, collapsed]);

    const toggleCollapse = () => setCollapsed(c => !c);

    return (
        <div className="h-screen w-screen bg-background text-foreground overflow-hidden flex flex-col">
            <Titlebar />
            <div className="flex flex-col flex-1 min-h-0 pt-8">
                <TopBar />
                <div className="flex flex-1 min-h-0 w-full overflow-hidden">
                    <SideBar
                        width={collapsed ? SIDEBAR_COLLAPSED : sidebarWidth}
                        collapsed={collapsed}
                        onToggleCollapse={toggleCollapse}
                    />
                    {/* Drag handle */}
                    {!collapsed && (
                        <div
                            onMouseDown={() => setResizing(true)}
                            className={`w-1 cursor-col-resize bg-transparent hover:bg-primary/40 transition relative`}
                            style={{ userSelect: 'none' }}
                        >
                            <span className="absolute inset-y-0 left-0 right-0 border-r border-border/40" />
                        </div>
                    )}
                    <div className="relative flex-1 min-h-0 h-full overflow-y-auto px-4 py-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;
