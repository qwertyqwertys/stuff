export const UNEMPLOYED_BIGGIE_ACHIEVEMENT = {
  id: 'unemployed_biggie',
  title: 'Unemployed Biggie',
  description: 'Play all of the food games you unemployed fattie',
};

export const UNEMPLOYED_BIGGIE_STORAGE_KEY = 'capy_unemployed_biggie_played_v1';
export const UNEMPLOYED_BIGGIE_UNLOCKED_KEY = 'capy_unemployed_biggie_unlocked_v1';
export const APP_FOOD_GAMES_STORAGE_KEY = 'capy-unemployed-biggie-games';

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
  'hungry-lamu',
  'hungry-lamu-2',
];

const FOOD_GAME_LABELS = new Map([
  ['cookie-clicker', 'Cookie Clicker'],
  ['eggy-car', 'Eggy Car'],
  ['tiny-fishing', 'Tiny Fishing'],
  ['bacon-may-die', 'Bacon May Die'],
  ['crossy-road', 'Crossy Road'],
  ['google-baseball', 'Google Baseball'],
  ['growden.io', 'Growden.io'],
  ['grow-a-garden', 'Grow a Garden (Fake)'],
  ['candy-crush', 'Candy Crush (Fake)'],
  ['jelly-drift', 'Jelly Drift'],
  ['jelly-mario', 'Jelly Mario'],
  ['jelly-restraunt', 'Jelly Restaurant'],
  ['crazy-cattle-3d', 'Crazy Cattle 3D'],
  ['crazy-chicken-3d', 'Crazy Chicken 3D'],
  ['melon-playground', 'Melon Playground'],
  ['bad-ice-cream', 'Bad Ice Cream'],
  ['bad-ice-cream-2', 'Bad Ice Cream 2'],
  ['bad-ice-cream-3', 'Bad Ice Cream 3'],
  ['hungry-lamu', 'Hungry Llama'],
  ['hungry-lamu-2', 'Hungry Llama 2'],
]);

const normalizeGameName = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/\(fake\)/g, '')
    .replace(/['’]/g, '')
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const CANONICAL_LOOKUP = new Map(
  REQUIRED_FOOD_GAMES.map((game) => [normalizeGameName(game), game])
);

// Extra aliases mapped directly to canonical entries in REQUIRED_FOOD_GAMES
const ALIAS_LOOKUP = new Map([
  ['jelly restaurant', 'jelly-restraunt'],
  ['jelly restraunt', 'jelly-restraunt'],
  ['growden io', 'growden.io'],
  ['grow a garden', 'grow-a-garden'],
  ['candy crush', 'candy-crush'],
  ['hungry llama', 'hungry-lamu'],
  ['hungry llama 2', 'hungry-lamu-2'],
]);

export function formatRequiredFoodGameLabel(canonicalId) {
  return FOOD_GAME_LABELS.get(canonicalId) || canonicalId;
}

export function matchRequiredFoodGame(gameTitleOrId) {
  const normalized = normalizeGameName(gameTitleOrId);
  if (!normalized) return null;
  if (CANONICAL_LOOKUP.has(normalized)) return CANONICAL_LOOKUP.get(normalized);
  if (ALIAS_LOOKUP.has(normalized)) return ALIAS_LOOKUP.get(normalized);
  return null;
}

export function getPlayedFoodGames() {
  try {
    const rawUtil = JSON.parse(localStorage.getItem(UNEMPLOYED_BIGGIE_STORAGE_KEY) || '[]');
    const rawApp = JSON.parse(localStorage.getItem(APP_FOOD_GAMES_STORAGE_KEY) || '[]');
    const combined = [
      ...(Array.isArray(rawUtil) ? rawUtil : []),
      ...(Array.isArray(rawApp) ? rawApp : []),
    ];
    const matched = combined
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
  const remainingItems = remaining.map((id) => ({
    id,
    label: formatRequiredFoodGameLabel(id),
  }));
  const unlocked = isUnemployedBiggieUnlocked();

  return {
    ...UNEMPLOYED_BIGGIE_ACHIEVEMENT,
    played,
    remaining,
    remainingItems,
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
