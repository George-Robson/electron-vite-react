
import Titlebar from './Titlebar';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen w-screen flex flex-col bg-background text-foreground overflow-x-hidden">
            <Titlebar />
            <main className="flex-1 p-4">
                {children}
            </main>
            <footer className="text-center text-sm w-full p-2 bg-selection text-comment">
                © {new Date().getFullYear()} Arcana Library
            </footer>
        </div>
    );
};

export default Layout;
