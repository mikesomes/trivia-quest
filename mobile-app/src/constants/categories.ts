import type { Category } from '../types/game'

export interface CategoryMeta {
  id: Category
  label: string
  emoji: string
  description: string
  color: string
  comingSoon?: boolean
  modeOnly?: boolean
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'general_knowledge', label: 'General Knowledge', emoji: '🧠', description: 'A little bit of everything', color: '#6c63ff' },
  { id: 'history',           label: 'History',           emoji: '📜', description: 'Events from the past',      color: '#F59E0B' },
  { id: 'science',           label: 'Science',           emoji: '🔬', description: 'Nature and discovery',      color: '#3B82F6' },
  { id: 'sports',            label: 'Sports',            emoji: '⚽', description: 'Athletes and games',         color: '#22C55E' },
  { id: 'movies_tv',         label: 'Movies & TV',       emoji: '🎬', description: 'Film and television',       color: '#EC4899' },
  { id: 'geography',         label: 'Geography',         emoji: '🌍', description: 'Places around the world',   color: '#14B8A6' },
  { id: 'nfl_football',     label: 'NFL Football',      emoji: '🏈', description: 'Teams, players & history',  color: '#D97706' },
  { id: 'roman_history',    label: 'Roman History',     emoji: '🏛️', description: 'The glory of Rome',          color: '#DC2626' },
  { id: 'harry_potter',     label: 'Harry Potter',      emoji: '🪄', description: 'Wizards, spells & Hogwarts', color: '#7C3AED' },
  { id: 'famous_quotes',   label: 'Famous Quotes',     emoji: '💬', description: 'Who said it?',               color: '#0EA5E9' },
  { id: 'music',            label: 'Music',             emoji: '🎵', description: 'Songs and artists',          color: '#8B5CF6' },
  { id: 'odd_one_out',      label: 'Odd One Out',       emoji: '🧩', description: 'Find what does not fit',      color: '#10B981', modeOnly: true },
  { id: 'art_history',      label: 'Art History',       emoji: '🎨', description: 'Masterpieces & movements',   color: '#F97316', comingSoon: true },
  { id: 'movie_quotes',     label: 'Movie Quotes',      emoji: '🎞️', description: 'Iconic movie moments',        color: '#EF4444', comingSoon: true },
  { id: 'pop_culture',      label: 'Pop Culture',       emoji: '⭐', description: 'Trends and celebrities',      color: '#F43F5E', comingSoon: true },
]
