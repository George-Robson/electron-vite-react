
import Titlebar from './Titlebar';
import SideBar from './SideBar';
import TopBar from './TopBar';
import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
            <Titlebar />
            {/* Offset for titlebar (32px) + topbar (56px) = 88px => 5.5rem */}
            <div className="h-full pt-9 overflow-hidden">
            <TopBar />
                <div className="h-full w-full flex">
                    <SideBar>
                        <div className="h-full overflow-y-auto relative">
                            {children}
                        </div>
                    </SideBar>
                </div>
            </div>
        </div>
    );
};

export default Layout;
