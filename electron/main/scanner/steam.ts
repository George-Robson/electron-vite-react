import { PlatformScanner, ScannedGameCandidate } from './types';

// Dummy Steam scanner: you will replace internals with real API calls / Steam Web API usage.
export const steamScanner: PlatformScanner = {
  name: 'Steam',
  async canRun() {
    // TODO: check for required API key from DB or environment
    return true;
  },
  async scan(progress) {
    progress({ phase: 'init', message: 'Starting Steam scan' });
    // Simulate phases
    const fakeLibrary = ['Half-Life', 'Portal', 'Cyberpunk 2077'];
    const candidates: ScannedGameCandidate[] = [];
    const total = fakeLibrary.length;
    for (let i = 0; i < total; i++) {
      const title = fakeLibrary[i];
      progress({ phase: 'fetch', current: i + 1, total, message: `Fetching ${title}` });
      // Simulate network latency
      await new Promise(r => setTimeout(r, 150));
      candidates.push({
        title,
        platform: 'Steam',
        genre: 'Unknown',
        tags: [],
        release_date: null,
      });
    }
    progress({ phase: 'finalize', message: 'Assembling results' });
    await new Promise(r => setTimeout(r, 100));
    return candidates;
  }
};
