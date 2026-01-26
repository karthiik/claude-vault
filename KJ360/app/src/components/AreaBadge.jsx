import React from 'react'
import {
  Heart, Users, Rocket, DollarSign, GraduationCap,
  Palette, Home, Star, HelpCircle
} from 'lucide-react'
import { LIFE_AREAS, getAreaFromThingsArea, getAreaFromProjectName } from '../constants/areas'

// Icon mapping
const ICON_MAP = {
  Heart: Heart,
  Users: Users,
  Rocket: Rocket,
  DollarSign: DollarSign,
  GraduationCap: GraduationCap,
  Palette: Palette,
  Home: Home,
  Star: Star,
}

/**
 * AreaBadge - Visual indicator for Life Areas
 *
 * @param {string} areaId - Direct area ID (health, career, etc.)
 * @param {string} thingsArea - Things 3 area name to match
 * @param {string} projectName - Project name to infer area from
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} showLabel - Show text label
 * @param {boolean} showEmoji - Show emoji instead of icon
 * @param {string} variant - 'default' | 'pill' | 'dot' | 'icon-only'
 */
export default function AreaBadge({
  areaId,
  thingsArea,
  projectName,
  size = 'sm',
  showLabel = false,
  showEmoji = false,
  variant = 'default'
}) {
  // Resolve area
  let area = null

  if (areaId && LIFE_AREAS[areaId]) {
    area = LIFE_AREAS[areaId]
  } else if (thingsArea) {
    area = getAreaFromThingsArea(thingsArea)
  } else if (projectName) {
    area = getAreaFromProjectName(projectName)
  }

  if (!area) {
    // Unknown area - show subtle indicator
    if (variant === 'dot') {
      return <div className="w-2 h-2 rounded-full bg-gray-600" />
    }
    return null
  }

  const Icon = ICON_MAP[area.icon] || HelpCircle

  // Size classes
  const sizeClasses = {
    sm: {
      icon: 10,
      text: 'text-xs',
      padding: 'px-1.5 py-0.5',
      dot: 'w-2 h-2',
      iconOnly: 'w-5 h-5',
    },
    md: {
      icon: 14,
      text: 'text-sm',
      padding: 'px-2 py-1',
      dot: 'w-3 h-3',
      iconOnly: 'w-6 h-6',
    },
    lg: {
      icon: 18,
      text: 'text-base',
      padding: 'px-3 py-1.5',
      dot: 'w-4 h-4',
      iconOnly: 'w-8 h-8',
    },
  }

  const s = sizeClasses[size]

  // Dot variant - just a colored circle
  if (variant === 'dot') {
    return (
      <div
        className={`${s.dot} rounded-full ${area.bgColor}`}
        title={area.name}
      />
    )
  }

  // Icon-only variant
  if (variant === 'icon-only') {
    return (
      <div
        className={`${s.iconOnly} rounded-full ${area.bgColorMuted} flex items-center justify-center`}
        title={area.name}
      >
        {showEmoji ? (
          <span className={s.text}>{area.emoji}</span>
        ) : (
          <Icon size={s.icon} className={area.textColor} />
        )}
      </div>
    )
  }

  // Pill variant - rounded full
  if (variant === 'pill') {
    return (
      <span
        className={`inline-flex items-center gap-1 ${s.padding} rounded-full ${area.bgColorMuted} ${area.textColor} ${s.text}`}
        title={area.name}
      >
        {showEmoji ? (
          <span>{area.emoji}</span>
        ) : (
          <Icon size={s.icon} />
        )}
        {showLabel && <span>{area.shortName}</span>}
      </span>
    )
  }

  // Default variant - rounded corners
  return (
    <span
      className={`inline-flex items-center gap-1 ${s.padding} rounded ${area.bgColorMuted} ${area.textColor} ${s.text}`}
      title={area.name}
    >
      {showEmoji ? (
        <span>{area.emoji}</span>
      ) : (
        <Icon size={s.icon} />
      )}
      {showLabel && <span>{area.shortName}</span>}
    </span>
  )
}

/**
 * AreaDot - Simple colored dot indicator
 */
export function AreaDot({ areaId, thingsArea, projectName, size = 'sm' }) {
  return (
    <AreaBadge
      areaId={areaId}
      thingsArea={thingsArea}
      projectName={projectName}
      size={size}
      variant="dot"
    />
  )
}

/**
 * AreaIcon - Icon with background circle
 */
export function AreaIcon({ areaId, thingsArea, projectName, size = 'md', showEmoji = false }) {
  return (
    <AreaBadge
      areaId={areaId}
      thingsArea={thingsArea}
      projectName={projectName}
      size={size}
      variant="icon-only"
      showEmoji={showEmoji}
    />
  )
}

/**
 * AreaPill - Full badge with optional label
 */
export function AreaPill({ areaId, thingsArea, projectName, size = 'sm', showLabel = true, showEmoji = true }) {
  return (
    <AreaBadge
      areaId={areaId}
      thingsArea={thingsArea}
      projectName={projectName}
      size={size}
      variant="pill"
      showLabel={showLabel}
      showEmoji={showEmoji}
    />
  )
}
