import React, { useEffect, useState } from 'react';
import Button from '../components/ui/Button';

interface PlatformRecord { id: number; name: string; }
interface User { id: number; name: string; avatar?: string | null; avatar_path?: string | null; avatar_hash?: string | null; }
interface APIKeyRecord { id: number; platform: PlatformRecord; client_id?: string; key: string; }

// @ts-ignore
const api = window.electronAPI?.db;

const defaultPlatforms = ['Steam', 'Epic', 'GOG', 'Itch.io'];

const Settings: React.FC = () => {
  const [platforms, setPlatforms] = useState<PlatformRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKeyRecord[]>([]);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiPlatform, setNewApiPlatform] = useState('Steam');
  const [clientId, setClientId] = useState('');

  async function refresh() {
    if (!api) return;
    const [plats, us, act, keys] = await Promise.all([
      api.listPlatforms(),
      api.listUsers(),
      api.getActiveUser(),
      api.listApiKeys()
    ]);
    setPlatforms(plats);
    setUsers(us);
    setActiveUser(act);
    if (act) {
      try { setAvatarData(await api.getUserAvatarData(act.id)); } catch { setAvatarData(null); }
    } else {
      setAvatarData(null);
    }
    setApiKeys(keys);
  }

  useEffect(() => { refresh(); }, []);

  async function seedPlat() {
    await api.seedPlatforms(defaultPlatforms);
    refresh();
  }

  async function createUser() {
    if (!newUserName.trim()) return;
    const u = await api.createUser(newUserName.trim());
    setNewUserName('');
    await api.setActiveUser(u.id);
    refresh();
  }

  async function setActive(id: number) {
    await api.setActiveUser(id);
    await refresh();
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeUser) return;
    const file = e.target.files?.[0];
    if (!file) return;
    // Read file & compress/resize via canvas
    const imgDataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(file);
    });
    const optimized = await resizeAndCompress(imgDataUrl, 256, 256, 0.85);
    await api.updateUserAvatarFile(activeUser.id, optimized);
    setAvatarData(optimized); // We already have optimized data URL
    refresh();
  }

  async function removeAvatar() {
    if (!activeUser) return;
    await api.updateUserAvatarFile(activeUser.id, null);
    setAvatarData(null);
    refresh();
  }

  async function resizeAndCompress(dataUrl: string, maxW: number, maxH: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        // Prefer webp if supported
        const webp = canvas.toDataURL('image/webp', quality);
        if (webp.length < dataUrl.length) {
          resolve(webp);
        } else {
          // fallback to jpeg
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  async function addKey() {
    if (!newApiKey.trim()) return;
    if (!activeUser) return;
    await api.createApiKey({ user: activeUser.id, platform: newApiPlatform, key: newApiKey.trim(), client_id: clientId || undefined });
    setNewApiKey('');
    setClientId('');
    refresh();
  }

  async function removeKey(id: number) {
    await api.deleteApiKey(id);
    refresh();
  }

  return (
    <div className="space-y-10">
      <section className="card-ui">
        <h2 className="mb-4">Platforms</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {platforms.map(p => (
            <span key={p.id} className="px-3 py-1 rounded-full text-xs bg-surface-alt border border-border-soft">{p.name}</span>
          ))}
        </div>
        <Button variant="ghost" size="sm" pill onClick={seedPlat}>Seed Default Platforms</Button>
      </section>
      <section className="card-ui">
        <h2 className="mb-4">Users</h2>
        <div className="flex items-center gap-2 mb-4">
          <input className="input w-48" placeholder="New user name" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
          <Button variant="primary" size="sm" pill onClick={createUser}>Create User</Button>
        </div>
        <ul className="space-y-2">
          {users.map(u => (
            <li key={u.id} className="flex items-center justify-between">
              <span className={activeUser?.id === u.id ? 'font-medium text-primary' : ''}>{u.name}</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" pill onClick={() => setActive(u.id)}>{activeUser?.id === u.id ? 'Active' : 'Set Active'}</Button>
              </div>
            </li>
          ))}
        </ul>
        {activeUser && (
          <div className="mt-6 border-t border-border-soft/40 pt-4">
            <h3 className="text-sm mb-3 opacity-80">Profile Image</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md bg-surface-alt border border-border-soft flex items-center justify-center overflow-hidden">
                {avatarData ? (
                  <img src={avatarData} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs opacity-60">None</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" onChange={onAvatarSelected} className="text-xs hidden" />
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" pill onClick={() => (document.querySelector<HTMLInputElement>('input[type=file]')?.click())}>Select</Button>
                  <Button variant="ghost" size="sm" pill disabled={!avatarData} onClick={removeAvatar}>Remove</Button>
                </div>
              </div>
            </div>
            <p className="text-[10px] opacity-50 mt-2">Images are resized (max 256x256) & stored on disk. Hash-based filenames allow dedupe. Legacy base64 still displayed if present.</p>
          </div>
        )}
      </section>
      <section className="card-ui">
        <h2 className="mb-4">API Keys {activeUser ? `(User: ${activeUser.name})` : ''}</h2>
        {!activeUser && <p className="text-xs opacity-70 mb-2">Create and select a user to manage API keys.</p>}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select className="input w-40" value={newApiPlatform} onChange={e => setNewApiPlatform(e.target.value)}>
            {platforms.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <input className="input w-56" placeholder="API Key" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} />
          <input className="input w-40" placeholder="Client ID (optional)" value={clientId} onChange={e => setClientId(e.target.value)} />
          <Button variant="primary" size="sm" pill disabled={!activeUser} onClick={addKey}>Add Key</Button>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left opacity-70">
              <th className="py-1">Platform</th>
              <th className="py-1">Client ID</th>
              <th className="py-1">Key</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {apiKeys.map(k => (
              <tr key={k.id} className="border-t border-border-soft/40">
                <td className="py-1 pr-2">{k.platform.name}</td>
                <td className="py-1 pr-2 text-xs opacity-70">{k.client_id || '—'}</td>
                <td className="py-1 pr-2 truncate max-w-[320px] font-mono text-xs">{k.key}</td>
                <td className="py-1 text-right">
                  <Button variant="ghost" size="sm" pill onClick={() => removeKey(k.id)}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Settings;