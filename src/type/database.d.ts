export interface PlatformRecord {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface GameRecord {
  id: number;
  appid?: number;
  title: string;
  platform: PlatformRecord;
  genre: string;
  tags?: string[];
  release_date?: string | null;
  playtime_minutes?: number | null;
  rtime_last_played?: string | null;
  created_at?: string;
  updated_at?: string;
  installed_path?: string | null;
  application_file?: string | null;
}

export interface CollectionRecord {
  id: number;
  name: string;
  games?: GameRecord[];
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  apiKeys?: APIKeyRecord[];
  avatar?: string | null;
  avatar_path?: string | null;
  avatar_hash?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface APIKeyRecord {
  id: number;
  platform: PlatformRecord;
  client_id?: string;
  key: string;
  created_at?: string;
  updated_at?: string;
}

declare global {
  interface Window {
    electronAPI: {
      db: {
        listGames: () => Promise<GameRecord[]>;
        listDistinct: (column: 'platform' | 'genre') => Promise<string[]>;
        insertGame: (game: { title: string; platform: string; genre: string; tags?: string[] }) => Promise<GameRecord>;
        updateGame: (game: { id: number; title?: string; platform?: string; genre?: string; tags?: string[] }) => Promise<GameRecord>;
        deleteGame: (id: number) => Promise<boolean>;
        listCollections: () => Promise<CollectionRecord[]>;
        getCollection: (id: number) => Promise<CollectionRecord | null>;
        createCollection: (name: string) => Promise<CollectionRecord>;
        addGameToCollection: (collectionId: number, gameId: number) => Promise<boolean>;
        removeGameFromCollection: (collectionId: number, gameId: number) => Promise<boolean>;
  // Users
  listUsers: () => Promise<User[]>;
  createUser: (name: string) => Promise<User>;
  deleteUser: (id: number) => Promise<boolean>;
  updateUserAvatar: (id: number, avatar: string | null) => Promise<User>;
  updateUserAvatarFile: (id: number, dataUrl: string | null) => Promise<User>;
  getUserAvatarData: (id: number) => Promise<string | null>;
  // API Keys
  listApiKeys: (userId?: number) => Promise<APIKeyRecord[]>;
  createApiKey: (params: { user: string | number; platform: string; key: string; client_id?: string }) => Promise<APIKeyRecord>;
  updateApiKey: (params: { id: number; key?: string; client_id?: string }) => Promise<APIKeyRecord>;
  deleteApiKey: (id: number) => Promise<boolean>;
        // Platforms & Active User
        listPlatforms: () => Promise<PlatformRecord[]>;
        seedPlatforms: (names: string[]) => Promise<PlatformRecord[]>;
        setActiveUser: (id: number) => Promise<boolean>;
  onActiveUserChanged: (cb: (user: User | null) => void) => () => void;
        getActiveUser: () => Promise<User | null>;
        getPath: () => Promise<string>;
      };
      scan: {
        start: (platform: string) => Promise<string>; // returns scan id
        cancel: (id: string) => Promise<boolean>;
        list: () => Promise<{ id: string; platform: string; startedAt: number }[]>;
        onProgress: (cb: (p: any) => void) => () => void;
        onComplete: (cb: (r: any) => void) => () => void;
      };
    } & Record<string, any>;
  }
}

export {};