import React from 'react';
import IconButton from './ui/IconButton';
import Button from './ui/Button';
import { AvatarIcon } from './ui/AvatarIcon';

interface TopBarProps {}

const TopBar: React.FC<TopBarProps> = () => {
    return (
    <div className="z-40 flex items-center justify-between h-14 px-8 bg-surface/70 backdrop-blur-md border-b border-border/40 elev-sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="flex items-center gap-4">
                <AvatarIcon size="md" />
            </div>
            <div className="flex items-center gap-3">
                <div className="w-72 mr-6">
                    <input
                        type="text"
                        placeholder="Search games..."
                        className="input"
                    />
                </div>
                <IconButton variant="primary" tooltip="Add Game">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
                    </svg>
                </IconButton>
                <IconButton tooltip="Settings" variant="ghost" onClick={() => window.location.href = '/settings'}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </IconButton>
                <Button variant="primary" size="sm" pill>Sync</Button>
            </div>
        </div>
    );
};

export default TopBar;