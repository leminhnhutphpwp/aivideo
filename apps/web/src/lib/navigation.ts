import {
  LayoutDashboard,
  Wand2,
  Briefcase,
  Library,
  BarChart3,
  Settings,
  ScrollText,
  History,
  Image,
  UserRound,
  Film,
  Smile,
  FolderOpen,
  Video,
  Music,
  Clapperboard,
  Globe,
  Compass,
  Trophy,
  Heart,
  Gift,
} from 'lucide-react';
import { t } from '@/lib/i18n';

export type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: { title: string; href: string; icon: React.ElementType }[];
};

export const NAVIGATION_ITEMS: NavItem[] = [
  { title: t('nav.overview'), href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Cộng đồng',
    href: '/community',
    icon: Globe,
    children: [
      { title: 'Khám phá', href: '/community', icon: Compass },
      { title: 'Bảng xếp hạng', href: '/community/trending', icon: Trophy },
      { title: 'Đã lưu', href: '/community/likes', icon: Heart },
    ],
  },
  {
    title: t('nav.studio'),
    href: '/studio',
    icon: Wand2,
    children: [
      { title: 'Text-to-Video', href: '/studio/video/text-to-video', icon: Wand2 },
      { title: 'Image-to-Video', href: '/studio/video/image-to-video', icon: Image },
      { title: 'Reference-to-Video', href: '/studio/video/reference-to-video', icon: UserRound },
      { title: 'Video Editing', href: '/studio/video/video-edit', icon: Film },
      { title: 'Character Animation', href: '/studio/video/character-animation', icon: Smile },
      { title: 'Storyboard', href: '/studio/storyboard', icon: Clapperboard },
    ],
  },
  {
    title: t('nav.projects'),
    href: '/projects',
    icon: Briefcase,
    children: [
      { title: t('projects.all'), href: '/projects', icon: FolderOpen },
      { title: t('studio.video'), href: '/projects?type=video', icon: Video },
      { title: t('studio.audio'), href: '/projects?type=audio', icon: Music },
    ],
  },
  { title: t('nav.processing'), href: '/jobs', icon: History },
  {
    title: t('nav.library'),
    href: '/assets',
    icon: Library,
    children: [
      { title: t('projects.all'), href: '/assets', icon: Image },
      { title: t('studio.video'), href: '/assets?type=video', icon: Video },
      { title: t('studio.image'), href: '/assets?type=image', icon: Image },
      { title: t('studio.audio'), href: '/assets?type=audio', icon: Music },
    ],
  },
];

export const SECONDARY_NAVIGATION = [
  { title: 'Ưu đãi', href: '/events', icon: Gift },
  { title: t('nav.activityLog'), href: '/activity-logs', icon: ScrollText },
  { title: t('nav.credits'), href: '/billing', icon: BarChart3 },
  { title: t('nav.settings'), href: '/settings', icon: Settings },
];
