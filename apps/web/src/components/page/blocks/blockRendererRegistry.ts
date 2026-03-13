import type { ContentBlockType, ContentBlock } from '@bytlinks/shared';
import { MicroblogRenderer } from './MicroblogRenderer';
import { RichLinkRenderer } from './RichLinkRenderer';
import { ImageGalleryRenderer } from './ImageGalleryRenderer';
import { CollabsRenderer } from './CollabsRenderer';
import { PollRenderer } from './PollRenderer';
import { TestimonialsRenderer } from './TestimonialsRenderer';
import { NewsletterRenderer } from './NewsletterRenderer';
import { FaqRenderer } from './FaqRenderer';
import { QuoteRenderer } from './QuoteRenderer';
import { FileDownloadRenderer } from './FileDownloadRenderer';
import { CountdownRenderer } from './CountdownRenderer';
import { StatsRenderer } from './StatsRenderer';
import { TipJarRenderer } from './TipJarRenderer';
import { EventRenderer } from './EventRenderer';
import { ProductCardRenderer } from './ProductCardRenderer';
import { CalendarRenderer } from './CalendarRenderer';
import { MediaEmbedRenderer } from './MediaEmbedRenderer';
import { FormRenderer } from './FormRenderer';

export interface BlockRendererProps {
  block: ContentBlock;
  pageId?: string;
}

export const blockRendererRegistry: Record<ContentBlockType, React.FC<BlockRendererProps>> = {
  'microblog': MicroblogRenderer,
  'rich-link': RichLinkRenderer,
  'image-gallery': ImageGalleryRenderer,
  'collabs': CollabsRenderer,
  'poll': PollRenderer,
  'testimonials': TestimonialsRenderer,
  'newsletter': NewsletterRenderer,
  'faq': FaqRenderer,
  'quote': QuoteRenderer,
  'file-download': FileDownloadRenderer,
  'countdown': CountdownRenderer,
  'stats': StatsRenderer,
  'tip-jar': TipJarRenderer,
  'event': EventRenderer,
  'product-card': ProductCardRenderer,
  // New consolidated types
  'calendar': CalendarRenderer,
  'media-embed': MediaEmbedRenderer,
  'form': FormRenderer,
  // Legacy types → remapped to new renderers
  'embed': MediaEmbedRenderer,
  'social-post': MediaEmbedRenderer,
  'booking': CalendarRenderer,
  'schedule': CalendarRenderer,
};
