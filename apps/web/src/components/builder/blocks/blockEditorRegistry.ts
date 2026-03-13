import type { ContentBlockType, ContentBlock } from '@bytlinks/shared';
import { QuoteEditor } from './QuoteEditor';
import { FaqEditor } from './FaqEditor';
import { CountdownEditor } from './CountdownEditor';
import { MicroblogEditor } from './MicroblogEditor';
import { RichLinkEditor } from './RichLinkEditor';
import { PollEditor } from './PollEditor';
import { NewsletterEditor } from './NewsletterEditor';
import { ImageGalleryEditor } from './ImageGalleryEditor';
import { CollabsEditor } from './CollabsEditor';
import { TestimonialsEditor } from './TestimonialsEditor';
import { FileDownloadEditor } from './FileDownloadEditor';
import { StatsEditor } from './StatsEditor';
import { TipJarEditor } from './TipJarEditor';
import { EventEditor } from './EventEditor';
import { ProductCardEditor } from './ProductCardEditor';
import { CalendarEditor } from './CalendarEditor';
import { MediaEmbedEditor } from './MediaEmbedEditor';
import { FormEditor } from './FormEditor';

export interface BlockEditorProps {
  block: ContentBlock;
}

export const blockEditorRegistry: Record<ContentBlockType, React.FC<BlockEditorProps>> = {
  'quote': QuoteEditor,
  'faq': FaqEditor,
  'countdown': CountdownEditor,
  'microblog': MicroblogEditor,
  'rich-link': RichLinkEditor,
  'poll': PollEditor,
  'newsletter': NewsletterEditor,
  'image-gallery': ImageGalleryEditor,
  'collabs': CollabsEditor,
  'testimonials': TestimonialsEditor,
  'file-download': FileDownloadEditor,
  'stats': StatsEditor,
  'tip-jar': TipJarEditor,
  'event': EventEditor,
  'product-card': ProductCardEditor,
  // New consolidated types
  'calendar': CalendarEditor,
  'media-embed': MediaEmbedEditor,
  'form': FormEditor,
  // Legacy types → remapped to new editors
  'embed': MediaEmbedEditor,
  'social-post': MediaEmbedEditor,
  'booking': CalendarEditor,
  'schedule': CalendarEditor,
};
