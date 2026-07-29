import type { Category } from '../types/game'

export interface CategoryMeta {
  id: Category
  label: string
  description: string
  color: string
  comingSoon?: boolean
  modeOnly?: boolean
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'general_knowledge', label: 'General Knowledge', description: 'A little bit of everything', color: '#6c63ff' },
  { id: 'history',           label: 'History',           description: 'Events from the past',      color: '#F59E0B' },
  { id: 'science',           label: 'Science',           description: 'Nature and discovery',      color: '#3B82F6' },
  { id: 'sports',            label: 'Sports',            description: 'Athletes and games',         color: '#22C55E' },
  { id: 'movies_tv',         label: 'Movies & TV',       description: 'Film and television',       color: '#EC4899' },
  { id: 'geography',         label: 'Geography',         description: 'Places around the world',   color: '#14B8A6' },
  { id: 'roman_history',    label: 'Roman History',     description: 'The glory of Rome',          color: '#DC2626' },
  { id: 'harry_potter',     label: 'Harry Potter',      description: 'Wizards, spells & Hogwarts', color: '#7C3AED' },
  { id: 'famous_quotes',   label: 'Famous Quotes',     description: 'Who said it?',               color: '#0EA5E9' },
  { id: 'music',            label: 'Music',             description: 'Songs and artists',          color: '#8B5CF6' },
  { id: 'odd_one_out',      label: 'Odd One Out',       description: 'Find what does not fit',      color: '#10B981', modeOnly: true },
  // Pulled from rotation while its question bank is rebuilt — it carried more
  // near-duplicate pairs than it had questions. Server side, it is out of
  // CATEGORIES in _shared/types.ts and its rows are deactivated by migration
  // 20240068, so this flag is presentation only.
  { id: 'nfl_football',     label: 'NFL Football',      description: 'Teams, players & history',   color: '#D97706', comingSoon: true },
  { id: 'art_history',      label: 'Art History',       description: 'Masterpieces & movements',   color: '#F97316', comingSoon: true },
  { id: 'movie_quotes',     label: 'Movie Quotes',      description: 'Iconic movie moments',        color: '#EF4444', comingSoon: true },
  { id: 'pop_culture',      label: 'Pop Culture',       description: 'Trends and celebrities',      color: '#F43F5E', comingSoon: true },
]
