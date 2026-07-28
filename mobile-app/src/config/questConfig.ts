import type { QuestCategory, QuestNode, QuestStarThresholds } from '../types/quest'
import { GAME_CONFIG } from '../constants/game'

// ─── Centralized star thresholds ─────────────────────────────────────────────

const CLASSIC_THRESHOLDS: QuestStarThresholds = { one: 0.60, two: 0.70, three: 0.90 }
const BOSS_THRESHOLDS: QuestStarThresholds    = { one: 0.80, two: 0.90, three: 1.00 }
const TIMED_THRESHOLDS: QuestStarThresholds   = { one: 10,   two: 16,   three: 22   }
const SURVIVAL_THRESHOLDS: QuestStarThresholds = { one: 0.60, two: 0.75, three: 0.90 }

// ─── Node factory helpers ─────────────────────────────────────────────────────

function classic(
  id: string, categoryId: string, title: string, description: string,
  tier: 1 | 2 | 4, difficulty: 'easy' | 'medium' | 'hard',
  rewardXp: number, requiredNodeIds: string[]
): QuestNode {
  return {
    id, categoryId, title, description, tier, type: 'standard',
    mode: 'classic', difficulty, questionCount: 10,
    rewardXp, requiredNodeIds, starThresholds: CLASSIC_THRESHOLDS,
  }
}

function timed(
  id: string, categoryId: string, title: string, description: string,
  requiredNodeIds: string[]
): QuestNode {
  return {
    id, categoryId, title, description, tier: 3, type: 'challenge',
    mode: 'timed', difficulty: 'medium', questionCount: 30,
    rewardXp: 100, requiredNodeIds, starThresholds: TIMED_THRESHOLDS,
  }
}

function survival(
  id: string, categoryId: string, title: string, description: string,
  requiredNodeIds: string[]
): QuestNode {
  return {
    id, categoryId, title, description, tier: 3, type: 'challenge',
    mode: 'survival', difficulty: 'medium', questionCount: 30,
    rewardXp: 100, requiredNodeIds, starThresholds: SURVIVAL_THRESHOLDS,
  }
}

function boss(
  id: string, categoryId: string, title: string, description: string,
  requiredNodeIds: string[]
): QuestNode {
  return {
    id, categoryId, title, description, tier: 5, type: 'boss',
    mode: 'boss', difficulty: 'hard', questionCount: 10,
    rewardXp: 250, requiredNodeIds, starThresholds: BOSS_THRESHOLDS,
  }
}

// ─── Category definitions ─────────────────────────────────────────────────────

export const QUEST_CATEGORIES: QuestCategory[] = [
  {
    id: 'general_knowledge',
    name: 'General Knowledge',
    color: '#4F7BF7',
    category: 'general_knowledge',
    nodes: [
      classic('gk-1', 'general_knowledge', 'First Steps',    'Kickstart your quest with everyday trivia.',        1, 'easy',   50,  []),
      classic('gk-2', 'general_knowledge', 'Getting Serious', 'A broader test of what you know.',                 2, 'medium', 75,  ['gk-1']),
      timed  ('gk-3', 'general_knowledge', 'Race the Clock',  `Answer as many as you can in ${GAME_CONFIG.BLITZ_SECONDS} seconds.`, ['gk-2']),
      classic('gk-4', 'general_knowledge', 'Expert Ground',  'Only the well-read survive here.',                 4, 'hard',  150, ['gk-3']),
      boss   ('gk-5', 'general_knowledge', 'Grand Master',   'The ultimate general knowledge challenge.',        ['gk-4']),
    ],
  },
  {
    id: 'history',
    name: 'History',
    color: '#C2872C',
    category: 'history',
    nodes: [
      classic ('hi-1', 'history', 'Ancient Echoes',    'Famous moments from the ancient world.',              1, 'easy',   50,  []),
      classic ('hi-2', 'history', 'Rise of Empires',   'From Rome to the Mongols — empires rise and fall.',  2, 'medium', 75,  ['hi-1']),
      survival('hi-3', 'history', 'No Mistakes',       'One wrong answer and the timeline breaks.',           ['hi-2']),
      classic ('hi-4', 'history', 'Modern Era',        'The last two centuries of world history.',            4, 'hard',  150, ['hi-3']),
      boss    ('hi-5', 'history', 'Historian\'s Trial', 'The complete test of historical mastery.',           ['hi-4']),
    ],
  },
  {
    id: 'science',
    name: 'Science',
    color: '#2BAB6F',
    category: 'science',
    nodes: [
      classic('sc-1', 'science', 'Lab Basics',       'Fundamental science — atoms, cells, forces.',        1, 'easy',   50,  []),
      classic('sc-2', 'science', 'Deeper Research',  'Physics, chemistry, and biology get harder.',        2, 'medium', 75,  ['sc-1']),
      timed  ('sc-3', 'science', 'Speed Science',    'How many scientific facts can you recall in time?',  ['sc-2']),
      classic('sc-4', 'science', 'Advanced Study',   'Graduate-level science trivia.',                      4, 'hard',  150, ['sc-3']),
      boss   ('sc-5', 'science', 'Nobel Tier',       'Questions that would stump most scientists.',         ['sc-4']),
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    color: '#E84E3C',
    category: 'sports',
    nodes: [
      classic ('sp-1', 'sports', 'Rookie Season',    'Easy sports trivia for beginners.',                   1, 'easy',   50,  []),
      classic ('sp-2', 'sports', 'Varsity Level',    'Records, champions, and classic moments.',            2, 'medium', 75,  ['sp-1']),
      survival('sp-3', 'sports', 'Sudden Death',     'Keep your streak alive or it\'s game over.',         ['sp-2']),
      classic ('sp-4', 'sports', 'Hall of Fame',     'Only the sports obsessed will ace this.',             4, 'hard',  150, ['sp-3']),
      boss    ('sp-5', 'sports', 'Championship Run', 'The ultimate sports knowledge gauntlet.',             ['sp-4']),
    ],
  },
  {
    id: 'movies_tv',
    name: 'Movies & TV',
    color: '#9B59B6',
    category: 'movies_tv',
    nodes: [
      classic('mv-1', 'movies_tv', 'Opening Credits',  'Box office hits and beloved classics.',              1, 'easy',   50,  []),
      classic('mv-2', 'movies_tv', 'Director\'s Cut',  'Deeper cuts from cinema and television.',           2, 'medium', 75,  ['mv-1']),
      timed  ('mv-3', 'movies_tv', 'Scene Stealer',    `How many films can you recall in ${GAME_CONFIG.BLITZ_SECONDS} seconds?`, ['mv-2']),
      classic('mv-4', 'movies_tv', 'Critic\'s Pick',   'From cult classics to award-winners.',              4, 'hard',  150, ['mv-3']),
      boss   ('mv-5', 'movies_tv', 'Cinephile\'s Test','The ultimate screen knowledge challenge.',           ['mv-4']),
    ],
  },
  {
    id: 'geography',
    name: 'Geography',
    color: '#27AE60',
    category: 'geography',
    nodes: [
      classic ('ge-1', 'geography', 'Local Knowledge',   'Capitals, continents, and famous landmarks.',        1, 'easy',   50,  []),
      classic ('ge-2', 'geography', 'World Traveler',    'Rivers, mountains, and country deep-cuts.',          2, 'medium', 75,  ['ge-1']),
      survival('ge-3', 'geography', 'Uncharted Waters',  'Don\'t get lost — one wrong turn ends it.',         ['ge-2']),
      classic ('ge-4', 'geography', 'Atlas Expert',      'Obscure borders, populations, and terrain.',         4, 'hard',  150, ['ge-3']),
      boss    ('ge-5', 'geography', 'Cartographer',      'The definitive geography mastery test.',             ['ge-4']),
    ],
  },
  {
    id: 'nfl_football',
    name: 'NFL Football',
    color: '#1A5C2A',
    category: 'nfl_football',
    nodes: [
      classic('nf-1', 'nfl_football', 'Coin Toss',       'Basic NFL knowledge for casual fans.',               1, 'easy',   50,  []),
      classic('nf-2', 'nfl_football', 'Playbook',         'Stats, records, and team histories.',                2, 'medium', 75,  ['nf-1']),
      timed  ('nf-3', 'nfl_football', 'Two-Minute Drill', `Score as many points as you can in ${GAME_CONFIG.BLITZ_SECONDS} seconds.`, ['nf-2']),
      classic('nf-4', 'nfl_football', 'Film Study',       'Deep-cut NFL trivia for true fans.',                 4, 'hard',  150, ['nf-3']),
      boss   ('nf-5', 'nfl_football', 'Super Bowl IQ',    'Only the biggest football brains pass this.',       ['nf-4']),
    ],
  },
  {
    id: 'roman_history',
    name: 'Roman History',
    color: '#8B4513',
    category: 'roman_history',
    nodes: [
      classic ('ro-1', 'roman_history', 'SPQR',          'The founding and rise of Rome.',                     1, 'easy',   50,  []),
      classic ('ro-2', 'roman_history', 'The Republic',   'Senate, legions, and the Punic Wars.',              2, 'medium', 75,  ['ro-1']),
      survival('ro-3', 'roman_history', 'Et Tu, Brute?',  'Survive the political treachery of Rome.',          ['ro-2']),
      classic ('ro-4', 'roman_history', 'The Empire',     'From Caesar to Constantine — imperial Rome.',        4, 'hard',  150, ['ro-3']),
      boss    ('ro-5', 'roman_history', 'Praetorian Test','The final trial of Roman knowledge.',               ['ro-4']),
    ],
  },
  {
    id: 'harry_potter',
    name: 'Harry Potter',
    color: '#7B2FBE',
    category: 'harry_potter',
    nodes: [
      classic('hp-1', 'harry_potter', 'Year One',       'Platform 9¾ and first-year spells.',                1, 'easy',   50,  []),
      classic('hp-2', 'harry_potter', 'Sorting Hat',    'Houses, professors, and Hogwarts lore.',             2, 'medium', 75,  ['hp-1']),
      timed  ('hp-3', 'harry_potter', 'Expelliarmus!',  'How much do you know before time runs out?',         ['hp-2']),
      classic('hp-4', 'harry_potter', 'Deathly Hallows','Deep lore from all seven books.',                    4, 'hard',  150, ['hp-3']),
      boss   ('hp-5', 'harry_potter', 'Dumbledore\'s Army','The ultimate wizarding knowledge test.',         ['hp-4']),
    ],
  },
  {
    id: 'famous_quotes',
    name: 'Famous Quotes',
    color: '#2980B9',
    category: 'famous_quotes',
    nodes: [
      classic ('fq-1', 'famous_quotes', 'Words of Wisdom', 'Well-known quotes from iconic figures.',           1, 'easy',   50,  []),
      classic ('fq-2', 'famous_quotes', 'Who Said That?',  'Match the quote to the person.',                   2, 'medium', 75,  ['fq-1']),
      survival('fq-3', 'famous_quotes', 'Don\'t Misquote', 'One wrong attribution ends your streak.',         ['fq-2']),
      classic ('fq-4', 'famous_quotes', 'Rare Gems',       'Obscure and lesser-known famous quotes.',          4, 'hard',  150, ['fq-3']),
      boss    ('fq-5', 'famous_quotes', 'Quote Master',    'The definitive test of quote knowledge.',          ['fq-4']),
    ],
  },
  {
    id: 'music',
    name: 'Music',
    color: '#E91E8C',
    category: 'music',
    nodes: [
      classic('mu-1', 'music', 'First Note',      'Pop hits, legendary bands, and chart toppers.',     1, 'easy',   50,  []),
      classic('mu-2', 'music', 'Album Deep Cuts', 'Beyond the singles — artists and music history.',   2, 'medium', 75,  ['mu-1']),
      timed  ('mu-3', 'music', 'Name That Tune',  'How many artists can you name before time\'s up?', ['mu-2']),
      classic('mu-4', 'music', 'Studio Sessions', 'Music theory, history, and obscure trivia.',        4, 'hard',  150, ['mu-3']),
      boss   ('mu-5', 'music', 'Rock Hall Test',  'The ultimate music knowledge gauntlet.',             ['mu-4']),
    ],
  },
]

export const QUEST_CATEGORY_MAP = new Map(QUEST_CATEGORIES.map(c => [c.id, c]))

export const QUEST_NODE_MAP = new Map(
  QUEST_CATEGORIES.flatMap(c => c.nodes.map(n => [n.id, n]))
)
