import type { ContentBlockType, ContentBlock } from '@bytlinks/shared';
import { EmbedRenderer } from './EmbedRenderer';
import { MicroblogRenderer } from './MicroblogRenderer';
import { RichLinkRenderer } from './RichLinkRenderer';
import { SocialPostRenderer } from './SocialPostRenderer';
import { ImageGalleryRenderer } from './ImageGalleryRenderer';
import { CollabsRenderer } from './CollabsRenderer';
import { ScheduleRenderer } from './ScheduleRenderer';
import { PollRenderer } from './PollRenderer';
import { TestimonialsRenderer } from './TestimonialsRenderer';
import { NewsletterRenderer } from './NewsletterRenderer';
import { FaqRenderer } from './FaqRenderer';
import { QuoteRenderer } from './QuoteRenderer';
import { FileDownloadRenderer } from './FileDownloadRenderer';
import { CountdownRenderer } from './CountdownRenderer';
import { BookingRenderer } from './BookingRenderer';
import { StatsRenderer } from './StatsRenderer';
import { TipJarRenderer } from './TipJarRenderer';
import { EventRenderer } from './EventRenderer';
import { ProductCardRenderer } from './ProductCardRenderer';

export interface BlockRendererProps {
  block: ContentBlock;
  pageId?: string;
}

export const blockRendererRegistry: Record<ContentBlockType, React.FC<BlockRendererProps>> = {
  'embed': EmbedRenderer,
  'microblog': MicroblogRenderer,
  'rich-link': RichLinkRenderer,
  'social-post': SocialPostRenderer,
  'image-gallery': ImageGalleryRenderer,
  'collabs': CollabsRenderer,
  'schedule': ScheduleRenderer,
  'poll': PollRenderer,
  'testimonials': TestimonialsRenderer,
  'newsletter': NewsletterRenderer,
  'faq': FaqRenderer,
  'quote': QuoteRenderer,
  'file-download': FileDownloadRenderer,
  'countdown': CountdownRenderer,
  'booking': BookingRenderer,
  'stats': StatsRenderer,
  'tip-jar': TipJarRenderer,
  'event': EventRenderer,
  'product-card': ProductCardRenderer,
};
