/**
 * Full Circle Life Areas
 *
 * The 8 areas of life that require ongoing attention.
 * No end date — these are maintained, not completed.
 *
 * Source: Jamie's Full Circle framework
 * Philosophy: No part of life exists in a vacuum. By nurturing each area
 * with equal intentionality, we move from "fragmented effort" to "harmonious flow."
 */

// Area definitions with visual identifiers
export const LIFE_AREAS = {
  health: {
    id: 'health',
    name: 'Health – Mind, Body & Spirit',
    shortName: 'Health',
    emoji: '🏃',
    icon: 'Heart', // Lucide icon name
    color: '#10B981', // Emerald green
    bgColor: 'bg-emerald-500',
    bgColorMuted: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500',
    intention: 'Transforming my body to be lean and energized, sharpening focus and clarity, grounding in mindfulness over materialism',
    thingsAreaMatch: ['Health', 'Mind', 'Body', 'Spirit', 'Fitness', 'Wellness'],
    tags: ['#area/health', '#health'],
  },

  relationships: {
    id: 'relationships',
    name: 'Relationships & Social Life',
    shortName: 'Relationships',
    emoji: '💛',
    icon: 'Heart', // or 'Users'
    color: '#F59E0B', // Amber/Yellow
    bgColor: 'bg-amber-500',
    bgColorMuted: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500',
    intention: 'Deepening bonds with family, showing up fully for loved ones, finding rhythm that honors work, family, and partnership',
    thingsAreaMatch: ['Relationships', 'Social', 'Family', 'Friends'],
    tags: ['#area/relationships', '#relationships'],
  },

  career: {
    id: 'career',
    name: 'Career & Purpose',
    shortName: 'Career',
    emoji: '🚀',
    icon: 'Rocket',
    color: '#3B82F6', // Blue
    bgColor: 'bg-blue-500',
    bgColorMuted: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500',
    intention: 'Emerging as a thought leader who balances optimism with realism in the AI revolution',
    thingsAreaMatch: ['Career', 'Work', 'Purpose', 'Professional', 'Lockton'],
    tags: ['#area/career', '#career', '#work'],
  },

  finances: {
    id: 'finances',
    name: 'Finances & Security',
    shortName: 'Finances',
    emoji: '💰',
    icon: 'DollarSign',
    color: '#22C55E', // Green
    bgColor: 'bg-green-500',
    bgColorMuted: 'bg-green-500/20',
    textColor: 'text-green-400',
    borderColor: 'border-green-500',
    intention: 'Building toward freedom at 55-60 — travel, stay active, pursue passion projects, leave a legacy',
    thingsAreaMatch: ['Finance', 'Money', 'Security', 'Investment', 'Budget'],
    tags: ['#area/finance', '#finances', '#money'],
  },

  learning: {
    id: 'learning',
    name: 'Education & Learning',
    shortName: 'Learning',
    emoji: '📚',
    icon: 'GraduationCap',
    color: '#8B5CF6', // Purple
    bgColor: 'bg-purple-500',
    bgColorMuted: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500',
    intention: 'Growing into a well-rounded leader who communicates with clarity and treats people with empathy',
    thingsAreaMatch: ['Education', 'Learning', 'MIT', 'Study', 'Growth'],
    tags: ['#area/learning', '#education', '#learning'],
  },

  joy: {
    id: 'joy',
    name: 'Joy, Creativity & Play',
    shortName: 'Joy',
    emoji: '🎨',
    icon: 'Palette',
    color: '#EC4899', // Pink
    bgColor: 'bg-pink-500',
    bgColorMuted: 'bg-pink-500/20',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500',
    intention: 'Chasing aliveness — through problem-solving, motorcycle adventures, and immersing in nature',
    thingsAreaMatch: ['Joy', 'Creativity', 'Play', 'Fun', 'Recreation', 'Hobby', 'Motorcycle'],
    tags: ['#area/recreation', '#joy', '#play'],
  },

  home: {
    id: 'home',
    name: 'Home & Environment',
    shortName: 'Home',
    emoji: '🏠',
    icon: 'Home',
    color: '#06B6D4', // Cyan
    bgColor: 'bg-cyan-500',
    bgColorMuted: 'bg-cyan-500/20',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500',
    intention: 'Creating a home that sparks creativity and encourages healthy living — a comfortable safe haven',
    thingsAreaMatch: ['Home', 'Environment', 'House', 'Apartment', 'Space'],
    tags: ['#area/environment', '#home'],
  },

  contribution: {
    id: 'contribution',
    name: 'Contribution & Legacy',
    shortName: 'Legacy',
    emoji: '🌟',
    icon: 'Star',
    color: '#F97316', // Orange
    bgColor: 'bg-orange-500',
    bgColorMuted: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500',
    intention: 'Contributing to community by sharing learnings, being the one who looks around the corner into the future',
    thingsAreaMatch: ['Contribution', 'Legacy', 'Community', 'Mentoring', 'Giving', 'Indy Hall'],
    tags: ['#area/contribution', '#legacy', '#community'],
  },
}

// Array for iteration
export const AREAS_LIST = Object.values(LIFE_AREAS)

// Helper to find area from Things 3 area name
export function getAreaFromThingsArea(thingsAreaName) {
  if (!thingsAreaName) return null
  const lowerName = thingsAreaName.toLowerCase()

  for (const area of AREAS_LIST) {
    if (area.thingsAreaMatch.some(match => lowerName.includes(match.toLowerCase()))) {
      return area
    }
  }
  return null
}

// Helper to find area from tags
export function getAreaFromTags(tags) {
  if (!tags || !Array.isArray(tags)) return null

  for (const tag of tags) {
    const lowerTag = tag.toLowerCase()
    for (const area of AREAS_LIST) {
      if (area.tags.some(areaTag => lowerTag.includes(areaTag.replace('#', '')))) {
        return area
      }
    }
  }
  return null
}

// Helper to find area from project name (heuristic matching)
export function getAreaFromProjectName(projectName) {
  if (!projectName) return null
  const lowerName = projectName.toLowerCase()

  for (const area of AREAS_LIST) {
    if (area.thingsAreaMatch.some(match => lowerName.includes(match.toLowerCase()))) {
      return area
    }
  }
  return null
}

// Full Circle diagram relationships
export const AREA_CONNECTIONS = {
  health: { enables: ['career'], supports: [] },
  career: { enables: ['finances'], supports: ['learning'] },
  finances: { enables: ['home'], supports: [] },
  home: { enables: [], supports: ['health'] },
  relationships: { enables: ['joy'], supports: [] },
  learning: { enables: ['career'], supports: [] },
  joy: { enables: [], supports: ['relationships'] },
  contribution: { enables: [], supports: ['relationships'] },
}

// Default target percentages for balanced life
export const DEFAULT_AREA_TARGETS = {
  health: 15,
  relationships: 15,
  career: 15,
  finances: 10,
  learning: 10,
  joy: 15,
  home: 10,
  contribution: 10,
}

export default LIFE_AREAS
