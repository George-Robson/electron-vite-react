import React, { useState } from 'react';
import Button from './ui/Button';
import { FiChevronRight } from 'react-icons/fi';

interface Game { id: string; title: string; platform: string; genre: string; collection?: string; }

interface SideBarProps { width?: number; collapsed?: boolean; onToggleCollapse?: () => void; className?: string; }

const SideBar: React.FC<SideBarProps> = ({ width = 208, collapsed = false, onToggleCollapse, className = '' }) => {
    // Mock data (replace later with real data / props)
    const games: Game[] = [
        { id: '1', title: 'The Witcher 3', platform: 'Steam', genre: 'RPG' },
        { id: '2', title: 'God of War', platform: 'Steam', genre: 'Action' },
        { id: '3', title: 'Halo Infinite', platform: 'Steam', genre: 'FPS' },
        { id: '4', title: 'Cyberpunk 2077', platform: 'Steam', genre: 'RPG', collection: 'Favorites' },
    ];
    const platforms = [...new Set(games.map(g => g.platform))];
    const genres = [...new Set(games.map(g => g.genre))];
    const collections = [...new Set(games.map(g => g.collection).filter(Boolean))] as string[];

    const [expanded, setExpanded] = useState<{[k:string]:boolean}>({ platforms: true, genres: false, collections: false });
    const [selected, setSelected] = useState<{ platform?: string; genre?: string; collection?: string }>({});

    const toggle = (key:string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    const countFor = (category:string, value:string) => games.filter(g => (category==='platform'?g.platform:category==='genre'?g.genre:g.collection) === value).length;
    const listFor = (category:string, value:string) => games.filter(g => (category==='platform'?g.platform:category==='genre'?g.genre:g.collection) === value);

    const renderSection = (label:string, key:string, items:string[], category:string) => (
        <div className="mb-5" key={key}>
            <Button
                variant="ghost"
                pill
                size="sm"
                onClick={() => toggle(key)}
                className="w-full justify-between font-normal tracking-tight"
            >
                <span className="font-light text-[0.75rem] uppercase opacity-80">{label}</span>
                <FiChevronRight className={`transition-transform ${expanded[key] ? 'rotate-90' : ''}`} />
            </Button>
            {expanded[key] && (
                <div className="mt-3 space-y-2 ml-1">
                    {items.map(item => {
                        const active = selected[category as keyof typeof selected] === item;
                        const gameCount = countFor(category, item);
                        return (
                            <div key={item}>
                                <Button
                                    variant={active ? 'primary' : 'ghost'}
                                    pill
                                    size="sm"
                                    onClick={() => setSelected(p => ({ ...p, [category]: item }))}
                                    className={`w-full flex justify-between font-light ${active ? 'shadow-md' : ''}`}
                                >
                                    <span>{item}</span>
                                    <span className={`text-[10px] ${active ? 'opacity-90' : 'opacity-60'}`}>{gameCount}</span>
                                </Button>
                                {active && (
                                    <div className="ml-3 mt-1 space-y-1">
                                        {listFor(category, item).map(g => (
                                            <Button key={g.id} variant="ghost" pill size="sm" className="w-full justify-start font-light text-[0.65rem] pl-4 opacity-80 hover:opacity-100">
                                                {g.title}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <aside
            className={`glass elev-md flex flex-col overflow-hidden h-full border-r border-border/40 shrink-0 transition-[width] duration-150 ease-out ${className}`}
            style={{ width: collapsed ? 56 : width }}
        >
            <div className="flex items-center justify-between px-3 py-3">
                <h2 className={`font-light tracking-tight opacity-80 text-[0.8rem] ${collapsed ? 'hidden' : ''}`}>Library</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    pill
                    onClick={onToggleCollapse}
                    className="!px-2 !py-1 text-[10px]"
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >{collapsed ? '›' : '‹'}</Button>
            </div>
            {!collapsed && (
                <div className="px-3 pb-3 overflow-y-auto min-h-0 flex-1 custom-scroll">
                    {renderSection('Platforms', 'platforms', platforms, 'platform')}
                    {renderSection('Genres', 'genres', genres, 'genre')}
                    {renderSection('Collections', 'collections', collections, 'collection')}
                    <Button variant="primary" pill size="sm" className="w-full mt-2 font-medium">+ Create Collection</Button>
                </div>
            )}
            {collapsed && (
                <div className="flex flex-col items-center gap-2 py-4 text-[10px] opacity-60 flex-1">
                    <span className="rotate-90 tracking-wide">LIB</span>
                </div>
            )}
        </aside>
    );
};

export default SideBar;