// Simple demo utility to fetch and log games from the database
export async function logGames() {
  // @ts-ignore
  const api = window.electronAPI;
  if (!api?.db) {
    console.warn('DB API not available');
    return;
  }
  const games = await api.db.listGames();
  console.table(games);
}

// Example insert
export async function addDemoGame() {
  // @ts-ignore
  const api = window.electronAPI;
  await api.db.insertGame({ title: 'New Game ' + Date.now(), platform: 'PC', genre: 'Indie' });
  await logGames();
}