export const UNEMPLOYED_BIGGIE_ACHIEVEMENT = {
  id: 'unemployed_biggie',
  title: 'Unemployed Biggie',
  description: 'Play all of the food games you unemployed fattie',
};

export const UNEMPLOYED_BIGGIE_STORAGE_KEY = 'capy_unemployed_biggie_played_v1';
export const UNEMPLOYED_BIGGIE_UNLOCKED_KEY = 'capy_unemployed_biggie_unlocked_v1';

// Canonical list of all 20 required games
export const REQUIRED_FOOD_GAMES = [
  'cookie-clicker',
  'eggy-car',
  'tiny-fishing',
  'bacon-may-die',
  'crossy-road',
  'google-baseball',
  'growden.io',
  'grow-a-garden',
  'candy-crush',
  'jelly-drift',
  'jelly-mario',
  'jelly-restraunt',
  'crazy-cattle-3d',
  'crazy-chicken-3d',
  'melon-playground',
  'bad-ice-cream',
  'bad-ice-cream-2',
  'bad-ice-cream-3',
  'hungry-llama',
  'hungry-llama 2',
];

const normalizeGameName = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const CANONICAL_LOOKUP = new Map(
  REQUIRED_FOOD_GAMES.map((game) => [normalizeGameName(game), game])
);

// Extra aliases in case a game's title has minor spelling/punctuation variations
const ALIAS_LOOKUP = new Map([
  ['jelly restaurant', 'jelly restraunt'],
  ['growden io', 'growden.io'],
  ['grow a garden', 'grow a garden (fake)'],
  ['candy crush', 'candy crush (fake)'],
]);

export function matchRequiredFoodGame(gameTitleOrId) {
  const normalized = normalizeGameName(gameTitleOrId);
  if (!normalized) return null;
  if (CANONICAL_LOOKUP.has(normalized)) return CANONICAL_LOOKUP.get(normalized);
  if (ALIAS_LOOKUP.has(normalized)) return ALIAS_LOOKUP.get(normalized);
  return null;
}

export function getPlayedFoodGames() {
  try {
    const raw = JSON.parse(localStorage.getItem(UNEMPLOYED_BIGGIE_STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    const matched = raw
      .map((entry) => matchRequiredFoodGame(entry))
      .filter(Boolean);
    return Array.from(new Set(matched));
  } catch (err) {
    console.warn('[Unemployed Biggie] Failed to read played games:', err);
    return [];
  }
}

export function isUnemployedBiggieUnlocked() {
  try {
    if (localStorage.getItem(UNEMPLOYED_BIGGIE_UNLOCKED_KEY) === 'true') {
      return true;
    }
    return getPlayedFoodGames().length >= REQUIRED_FOOD_GAMES.length;
  } catch (err) {
    return false;
  }
}

export function getUnemployedBiggieProgress() {
  const played = getPlayedFoodGames();
  const playedSet = new Set(played);
  const remaining = REQUIRED_FOOD_GAMES.filter((game) => !playedSet.has(game));
  const unlocked = isUnemployedBiggieUnlocked();

  return {
    ...UNEMPLOYED_BIGGIE_ACHIEVEMENT,
    played,
    remaining,
    completedCount: played.length,
    totalCount: REQUIRED_FOOD_GAMES.length,
    unlocked,
  };
}

/**
 * Call this whenever a user launches or opens a game.
 * Returns { matchedGame, progress, newlyUnlocked }.
 */
export function recordGamePlayedForUnemployedBiggie(gameTitleOrId) {
  const matchedGame = matchRequiredFoodGame(gameTitleOrId);
  const currentProgress = getUnemployedBiggieProgress();

  if (!matchedGame) {
    return {
      matchedGame: null,
      progress: currentProgress,
      newlyUnlocked: false,
    };
  }

  const wasAlreadyUnlocked = currentProgress.unlocked;
  const updatedSet = new Set(currentProgress.played);
  updatedSet.add(matchedGame);
  const updatedList = Array.from(updatedSet);
  const nowUnlocked = wasAlreadyUnlocked || updatedList.length >= REQUIRED_FOOD_GAMES.length;

  try {
    localStorage.setItem(UNEMPLOYED_BIGGIE_STORAGE_KEY, JSON.stringify(updatedList));
    if (nowUnlocked) {
      localStorage.setItem(UNEMPLOYED_BIGGIE_UNLOCKED_KEY, 'true');
    }
  } catch (err) {
    console.warn('[Unemployed Biggie] Failed to save progress:', err);
  }

  const newlyUnlocked = !wasAlreadyUnlocked && nowUnlocked;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('capy-achievement-updated', {
        detail: {
          achievementId: UNEMPLOYED_BIGGIE_ACHIEVEMENT.id,
          matchedGame,
          newlyUnlocked,
        },
      })
    );
  }

  return {
    matchedGame,
    progress: getUnemployedBiggieProgress(),
    newlyUnlocked,
  };
}
