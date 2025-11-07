import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { GoChevronDown } from 'react-icons/go';

interface AvatarIconProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

// @ts-ignore
const api = window.electronAPI?.db;

export const AvatarIcon: React.FC<AvatarIconProps> = ({
    size = 'md',
    className = ''
}) => {
    const [userName, setUserName] = useState<string>('');
    const [avatarData, setAvatarData] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
    const [activeUserId, setActiveUserId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    async function load() {
        if (!api) return;
        setLoading(true);
        try {
            const [active, allUsers] = await Promise.all([
                api.getActiveUser(),
                api.listUsers(),
            ]);
            setUsers(allUsers || []);
            if (active) {
                setActiveUserId(active.id);
                setUserName(active.name);
                try {
                    const dataUrl = await api.getUserAvatarData(active.id);
                    setAvatarData(dataUrl);
                } catch {
                    setAvatarData(null);
                }
            } else {
                setActiveUserId(null);
                setUserName('');
                setAvatarData(null);
            }
        } catch (e: any) {
            setError('Failed to load user');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!open) return;
            const target = e.target as HTMLElement;
            // If click is within the dropdown portal, ignore
            if (target.closest('[data-avatar-dropdown]')) return;
            // If click is within the trigger container, ignore
            if (containerRef.current && containerRef.current.contains(target)) return;
            // Otherwise close
            setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    async function switchUser(id: number) {
        if (!api) return;
        if (id === activeUserId) { setOpen(false); return; }
        try {
            await api.setActiveUser(id);
            // Optimistic update before full reload
            const selected = users.find(u => u.id === id);
            if (selected) {
                setActiveUserId(id);
                setUserName(selected.name);
            }
            await load();
        } catch (err: any) {
            setError('Failed to switch user');
        } finally {
            setOpen(false);
        }
    }

    const sizeClasses = {
        xs: 'w-3 h-3 text-xs',
        sm: 'w-5 h-5 text-sm',
        md: 'w-8 h-8 text-base',
        lg: 'w-12 h-12 text-lg'
    };

    const getInitials = (name: string) => name
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const initials = userName ? getInitials(userName) : '?';

    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 224 });

    function computePosition() {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const width = 224; // 56 * 4 (tailwind w-56) ≈ 224px
        let top = rect.bottom + 6; // gap below trigger
        let left = rect.right - width; // right-align to trigger right edge
        // Keep inside viewport horizontally
        if (left < 8) left = 8;
        if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
        // Basic vertical flip if overflowing bottom
        const estimatedHeight = 280; // rough max height
        if (top + estimatedHeight > window.innerHeight - 8) {
            top = rect.top - estimatedHeight - 6;
            if (top < 8) top = Math.max(8, rect.top - 40); // fallback
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

    const dropdown = open ? (
        <div
            className="fixed z-[999] pointer-events-auto"
            data-avatar-dropdown
            style={{top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width}}
        >
            {/* Arrow */}
            <div className="relative">
                <span className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-b-surface/80 border-l-transparent border-r-transparent drop-shadow" />
            </div>
            <div className="w-full rounded-lg elev-4 glass backdrop-blur-md border border-border-soft/50 shadow-lg shadow-black/40 ring-1 ring-black/20 animate-fade-scale origin-top-right overflow-hidden" style={{animationDuration:'120ms'}}>
                <div className="px-2 py-2 border-b border-border-soft/40 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide opacity-60">Switch Profiles</span>
                    <span className="ml-auto text-[10px] opacity-40">{users.length}</span>
                </div>
                <div className="max-h-72 overflow-y-auto custom-scroll">
                    {users.length === 0 && (
                        <div className="px-3 py-4 text-xs opacity-50 text-center">No users found</div>
                    )}
                    {users.map(u => {
                        const active = u.id === activeUserId;
                        const initial = u.name.slice(0,1).toUpperCase();
                        const leftIcon = (
                            <div className={`flex items-center justify-center rounded-full w-6 h-6 text-[11px] font-medium bg-gradient-to-br from-primary/60 to-primary-accent/50 text-white
                                ${active ? 'ring-1 ring-primary/50 shadow-inner' : 'opacity-85 group-hover:opacity-100'}
                            `}>{initial}</div>
                        );
                        const rightIcon = active ? (
                            <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.408 0l-3.25-3.25a1 1 0 011.408-1.42l2.546 2.546 6.546-6.546a1 1 0 011.408 0z" clipRule="evenodd"/></svg>
                        ) : null;
                        return (
                            <Button
                                key={u.id}
                                variant={active ? 'primary' : 'ghost'}
                                size='sm'
                                leftIcon={leftIcon}
                                rightIcon={rightIcon}
                                onClick={() => switchUser(u.id)}
                                className={`group w-full justify-start text-left gap-2 text-xs rounded-md !px-2 !py-1.5 transition-colors ${active ? 'font-semibold' : ''}`}
                            >
                                <span className="truncate flex-1">{u.name}</span>
                            </Button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2 px-2 py-2 border-t border-border-soft/40 bg-surface/40">
                    <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => { load(); }}
                        className='ml-auto text-[10px] !px-2 !py-1 uppercase tracking-wide opacity-70 hover:opacity-100'
                    >Refresh</Button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div
            ref={containerRef}
            className={`relative flex items-center justify-center gap-2 font-semibold outline-accent ${className}`}
            title={userName || 'No active user'}
        >
            {loading && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-70">…</span>
            )}
            {!loading && (avatarData ? (
                <img
                    src={avatarData}
                    alt={userName}
                    className={`${sizeClasses[size]} rounded-full object-cover outline outline-1 outline-offset-2 cursor-pointer`}
                    draggable={false}
                />
            ) : (
                <span
                    className={`${sizeClasses[size]} flex items-center justify-center rounded-full outline outline-1 outline-offset-2 cursor-pointer bg-gradient-to-br from-secondary to-accent text-white font-light`}
                >{initials}</span>
            ))}
            {!loading && userName && (
                <Button
                    variant='ghost'
                    onClick={() => setOpen(o => !o)}
                    size='sm'
                    className="flex items-top gap-4"
                >
                    <span className='font-sm'>{userName}</span>
                    <GoChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''} ml-2 border-left-2`} />
                </Button>
            )}
            {error && (
                <span className="absolute bottom-0 left-0 right-0 bg-danger/80 text-[9px] text-white px-1 py-[1px] leading-none">!</span>
            )}
            {dropdown && createPortal(dropdown, document.body)}
        </div>
    );
};