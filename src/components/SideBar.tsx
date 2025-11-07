import React, { useState } from 'react';
import Button from './ui/Button';
import { FiChevronRight } from 'react-icons/fi';

interface Game {
    id: string;
    title: string;
    platform: string;
    genre: string;
    collection?: string;
}

interface SideBarProps {
    children: React.ReactNode;
}

const SideBar: React.FC<SideBarProps> = ({ children }) => {
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        platforms: true,
        genres: false,
        collections: false
    });

    // Track selected filters for active styling
    const [selected, setSelected] = useState<{ platform?: string; genre?: string; collection?: string }>({});

    // Mock data - replace with actual data from your store/API
    const games: Game[] = [
        { id: '1', title: 'The Witcher 3', platform: 'PC', genre: 'RPG' },
        { id: '2', title: 'God of War', platform: 'PC', genre: 'Action' },
        { id: '3', title: 'Halo Infinite', platform: 'PC', genre: 'FPS' },
        { id: '4', title: 'Cyberpunk 2077', platform: 'PC', genre: 'RPG', collection: 'Favorites' },
    ];

    const platforms = [...new Set(games.map(game => game.platform))];
    const genres = [...new Set(games.map(game => game.genre))];
    const collections = [...new Set(games.map(game => game.collection).filter(Boolean))] as string[];

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const getGamesByCategory = (category: string, value: string) => {
        return games.filter(game => {
            switch (category) {
                case 'platform':
                    return game.platform === value;
                case 'genre':
                    return game.genre === value;
                case 'collection':
                    return game.collection === value;
                default:
                    return false;
            }
        });
    };

    const renderSection = (title: string, key: string, items: string[], category: string) => (
        <div className="mb-6">
            <Button
                variant="ghost"
                pill
                size="sm"
                onClick={() => toggleSection(key)}
                className="w-full justify-between font-normal tracking-tight sidebar-section"
            >
                <span className="font-light text-[0.85rem]">{title}</span>
                <FiChevronRight className={`transition-transform ${expandedSections[key] ? 'rotate-90' : ''}`} />
            </Button>
            {expandedSections[key] && (
                <div className="ml-1 mt-3 space-y-2 fade-in">
                    {items.map(item => {
                        const gameCount = getGamesByCategory(category, item).length;
                        const active = selected[category as keyof typeof selected] === item;
                        return (
                            <div key={item} className="group">
                                <Button
                                    variant={active ? 'primary' : 'ghost'}
                                    pill
                                    size="sm"
                                    onClick={() => setSelected(prev => ({ ...prev, [category]: item }))}
                                    className={`w-full flex justify-between font-light ${active ? 'shadow-md' : ''}`}
                                >
                                    <span>{item}</span>
                                    <span className={`text-[10px] ${active ? 'opacity-90' : 'opacity-60'}`}>{gameCount}</span>
                                </Button>
                                {active && (
                                    <div className="ml-3 mt-1 space-y-1">
                                        {getGamesByCategory(category, item).map(game => (
                                            <Button
                                                key={game.id}
                                                variant="ghost"
                                                pill
                                                size="sm"
                                                onClick={() => {/* placeholder for future navigation */}}
                                                className="w-full justify-start font-light text-[0.7rem] pl-4 opacity-80 hover:opacity-100"
                                            >
                                                {game.title}
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
        <div className="flex h-full">
            <aside className="w-52 glass elev-md p-6 flex flex-col gap-6 overflow-hidden h-full border-r border-border/40">
                <h2 className="text-lg font-light mb-4 text-[0.9rem] tracking-tight opacity-80">Library</h2>
                {renderSection('Platforms', 'platforms', platforms, 'platform')}
                {renderSection('Genres', 'genres', genres, 'genre')}
                {renderSection('Collections', 'collections', collections, 'collection')}
                <Button variant="primary" pill size="sm" className="w-full mt-2 font-medium">+ Create Collection</Button>
            </aside>
            <main className="overflow-auto bg-background w-full h-full">
                {children}
            </main>
        </div>
    );
};

export default SideBar;