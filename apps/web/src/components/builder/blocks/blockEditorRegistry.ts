import type { ContentBlockType, ContentBlock } from '@bytlinks/shared';
import { QuoteEditor } from './QuoteEditor';
import { FaqEditor } from './FaqEditor';
import { CountdownEditor } from './CountdownEditor';
import { EmbedEditor } from './EmbedEditor';
import { MicroblogEditor } from './MicroblogEditor';
import { RichLinkEditor } from './RichLinkEditor';
import { PollEditor } from './PollEditor';
import { NewsletterEditor } from './NewsletterEditor';
import { SocialPostEditor } from './SocialPostEditor';
import { ImageGalleryEditor } from './ImageGalleryEditor';
import { CollabsEditor } from './CollabsEditor';
import { ScheduleEditor } from './ScheduleEditor';
import { TestimonialsEditor } from './TestimonialsEditor';
import { FileDownloadEditor } from './FileDownloadEditor';
import { BookingEditor } from './BookingEditor';
import { StatsEditor } from './StatsEditor';
import { TipJarEditor } from './TipJarEditor';
import { EventEditor } from './EventEditor';

export interface BlockEditorProps {
  block: ContentBlock;
}

export const blockEditorRegistry: Record<ContentBlockType, React.FC<BlockEditorProps>> = {
  'quote': QuoteEditor,
  'faq': FaqEditor,
  'countdown': CountdownEditor,
  'embed': EmbedEditor,
  'microblog': MicroblogEditor,
  'rich-link': RichLinkEditor,
  'poll': PollEditor,
  'newsletter': NewsletterEditor,
  'social-post': SocialPostEditor,
  'image-gallery': ImageGalleryEditor,
  'collabs': CollabsEditor,
  'schedule': ScheduleEditor,
  'testimonials': TestimonialsEditor,
  'file-download': FileDownloadEditor,
  'booking': BookingEditor,
  'stats': StatsEditor,
  'tip-jar': TipJarEditor,
  'event': EventEditor,
};
