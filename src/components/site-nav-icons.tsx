import {
  Camera,
  CircleHelp,
  Download,
  Film,
  Flame,
  Gift,
  Globe,
  Heart,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Minimize2,
  Music,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  type LucideIcon,
} from 'lucide-react'

/**
 * Kept out of the client nav module: the public header is a Server Component and
 * can only read values from a module that has no `'use client'` boundary. Icons
 * are stored in the database by key, so both sides look them up here.
 */
export const navIcons = {
  listChecks: ListChecks,
  sparkles: Sparkles,
  circleHelp: CircleHelp,
  minimize: Minimize2,
  download: Download,
  link: Link2,
  globe: Globe,
  star: Star,
  gift: Gift,
  tag: Tag,
  rocket: Rocket,
  play: Play,
  film: Film,
  music: Music,
  camera: Camera,
  heart: Heart,
  flame: Flame,
  layoutDashboard: LayoutDashboard,
  shieldCheck: ShieldCheck,
  logOut: LogOut,
} satisfies Record<string, LucideIcon>

export type SiteNavIcon = keyof typeof navIcons
