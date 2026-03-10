import {
  MousePointerClick, MessageSquare, Play, Image, Download, Vote,
  Mail, Users, Calendar, Share2, MessageCircle, Clock, TrendingUp,
  Quote, FileText, CalendarCheck, Heart, Ticket,
} from 'lucide-react';

export const BLOCK_ICONS: Record<string, typeof MousePointerClick> = {
  rich_link: MousePointerClick,
  faq: MessageSquare,
  embed: Play,
  social_post: Share2,
  image_gallery: Image,
  file_download: Download,
  poll: Vote,
  newsletter: Mail,
  collabs: Users,
  schedule: Calendar,
  social: Share2,
  testimonials: MessageCircle,
  countdown: Clock,
  stats: TrendingUp,
  quote: Quote,
  microblog: FileText,
  booking: CalendarCheck,
  tip_jar: Heart,
  event: Ticket,
};

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  rich_link: 'Rich Link',
  faq: 'FAQ',
  embed: 'Embed',
  social_post: 'Social Post',
  image_gallery: 'Image Gallery',
  file_download: 'File Download',
  poll: 'Poll',
  newsletter: 'Newsletter',
  collabs: 'Collabs',
  schedule: 'Schedule',
  social: 'Social Link',
  testimonials: 'Testimonials',
  countdown: 'Countdown',
  stats: 'Stats',
  quote: 'Quote',
  microblog: 'Microblog',
  booking: 'Booking',
  tip_jar: 'Tip Jar',
  event: 'Event',
};

export type BlockCategory = 'all' | 'interactive' | 'content' | 'media' | 'navigation';

export const BLOCK_CATEGORIES: Record<Exclude<BlockCategory, 'all'>, string[]> = {
  interactive: ['poll', 'newsletter', 'tip_jar', 'booking', 'schedule'],
  content: ['faq', 'testimonials', 'microblog', 'quote', 'countdown', 'stats'],
  media: ['embed', 'image_gallery', 'social_post', 'file_download'],
  navigation: ['rich_link', 'collabs', 'event', 'social'],
};
