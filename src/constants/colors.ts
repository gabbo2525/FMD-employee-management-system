/**
 * Global design tokens — single source of truth for the entire app.
 * Import as: import { C, STATUS } from '@/constants/colors';
 */

// ─── Brand palette ────────────────────────────────────────────────────────────
export const C = {
  // Primary (purple)
  primary:       '#7C3AED',
  primaryLight:  '#8B5CF6',
  primaryFaint:  '#F5F3FF',
  primaryBorder: '#DDD6FE',

  // Semantic
  success:       '#10B981',
  successFaint:  '#ECFDF5',
  successBorder: '#A7F3D0',

  warning:       '#F59E0B',
  warningFaint:  '#FFFBEB',
  warningBorder: '#FDE68A',

  danger:        '#EF4444',
  dangerFaint:   '#FEF2F2',
  dangerBorder:  '#FECACA',

  info:          '#3B82F6',
  infoFaint:     '#EFF6FF',
  infoBorder:    '#BFDBFE',

  pink:          '#EC4899',
  pinkFaint:     '#FDF2F8',
  pinkBorder:    '#FBCFE8',

  // Neutrals
  bg:            '#F8FAFC',
  card:          '#FFFFFF',
  border:        '#E2E8F0',
  borderLight:   '#F1F5F9',

  // Text
  text:          '#0F172A',
  textMid:       '#475569',
  textSoft:      '#64748B',
  textMuted:     '#94A3B8',
} as const;

// ─── Status badge configs ─────────────────────────────────────────────────────
export const STATUS = {
  Present:   { bg: '#10B98115', border: '#10B98130', text: '#10B981', dot: '#10B981' },
  Late:      { bg: '#F59E0B15', border: '#F59E0B30', text: '#F59E0B', dot: '#F59E0B' },
  Absent:    { bg: '#EF444415', border: '#EF444430', text: '#EF4444', dot: '#EF4444' },
  'On Leave':{ bg: '#7C3AED15', border: '#7C3AED30', text: '#7C3AED', dot: '#7C3AED' },
  Active:    { bg: '#10B98115', border: '#10B98130', text: '#10B981', dot: '#10B981' },
  Inactive:  { bg: '#EF444415', border: '#EF444430', text: '#EF4444', dot: '#EF4444' },
  Pending:   { bg: '#F59E0B15', border: '#F59E0B30', text: '#F59E0B', dot: '#F59E0B' },
  Approved:  { bg: '#10B98115', border: '#10B98130', text: '#10B981', dot: '#10B981' },
  Rejected:  { bg: '#EF444415', border: '#EF444430', text: '#EF4444', dot: '#EF4444' },
} as const;

// ─── Shared shadow presets ────────────────────────────────────────────────────
export const SHADOW = {
  sm: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  primary: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

// ─── Avatar colour pool ───────────────────────────────────────────────────────
export const AVATAR_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B',
  '#7C3AED', '#EC4899', '#06B6D4', '#EF4444',
] as const;

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}
