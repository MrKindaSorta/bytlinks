export interface UseCaseConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroHeadline: string;
  heroSubhead: string;
  audience: string;
  painPoint: string;
  primaryCTA: string;
  features: {
    icon: string;
    title: string;
    description: string;
  }[];
  templateSlug: string;
  testimonialName: string;
  testimonialRole: string;
  testimonialQuote: string;
  relatedSlugs: string[];
}

export const USE_CASES: UseCaseConfig[] = [
  {
    slug: 'musicians',
    title: 'BytLinks for Musicians',
    metaTitle: 'Link in Bio for Musicians — BytLinks',
    metaDescription: 'One link for your music, shows, merch, and socials. Embed Spotify and Apple Music directly. Free themes built for artists.',
    heroHeadline: 'One link for your music.',
    heroSubhead: 'Embed your Spotify, announce your shows, sell your merch, and share your socials — all from a single page that looks like it belongs to you.',
    audience: 'Musicians, producers, and artists',
    painPoint: 'Your audience is on five platforms. Your link in bio is one.',
    primaryCTA: 'Build your music page — free',
    features: [
      {
        icon: 'Music',
        title: 'Embed Spotify, Apple Music, SoundCloud',
        description: 'Your music plays directly on your page. No redirects. No friction between your audience and your sound.',
      },
      {
        icon: 'Calendar',
        title: 'Show and event announcements',
        description: 'The Event block puts your next show front and center with date, venue, and ticket link — and disappears automatically when it\'s over.',
      },
      {
        icon: 'Timer',
        title: 'Countdown timers for releases',
        description: 'Build anticipation for your next drop with a live countdown on your page. Set it and forget it.',
      },
      {
        icon: 'BarChart2',
        title: 'See which links your fans actually click',
        description: 'Full analytics on every link, every embed, every button — free. No Google Analytics required.',
      },
    ],
    templateSlug: 'musician',
    testimonialName: 'Real musician testimonial',
    testimonialRole: 'To be added before launch',
    testimonialQuote: 'Placeholder — do not display',
    relatedSlugs: ['podcasters', 'creators'],
  },
  {
    slug: 'freelancers',
    title: 'BytLinks for Freelancers',
    metaTitle: 'Link in Bio for Freelancers — BytLinks',
    metaDescription: 'Your professional page, not a list of links. Booking, testimonials, portfolio gallery, and a digital business card with QR code. Free.',
    heroHeadline: 'Your work, one link.',
    heroSubhead: 'Stop sending five links in every pitch email. Your BytLinks page has your portfolio, your booking calendar, your testimonials, and your contact details — all in one place that looks like a real website.',
    audience: 'Freelancers and independent consultants',
    painPoint: 'You\'re losing clients to people with better online presence.',
    primaryCTA: 'Build your freelancer page — free',
    features: [
      {
        icon: 'CreditCard',
        title: 'Digital business card with QR code',
        description: 'Hand someone your QR code at a meeting. They save your card to their contacts in seconds. No app required on either side.',
      },
      {
        icon: 'CalendarCheck',
        title: 'Booking calendar integration',
        description: 'Connect Calendly or Cal.com and let clients book directly from your page. No back-and-forth.',
      },
      {
        icon: 'Star',
        title: 'Testimonials from real clients',
        description: 'Add testimonials from your actual clients. They show up directly on your page — not buried in a LinkedIn recommendation nobody reads.',
      },
      {
        icon: 'Images',
        title: 'Portfolio gallery',
        description: 'Show your work, not just a link to it. The Image Gallery block puts your portfolio on your page where clients can see it immediately.',
      },
    ],
    templateSlug: 'freelancer',
    testimonialName: 'Real freelancer testimonial',
    testimonialRole: 'To be added before launch',
    testimonialQuote: 'Placeholder — do not display',
    relatedSlugs: ['businesses', 'creators'],
  },
  {
    slug: 'businesses',
    title: 'BytLinks for Small Businesses',
    metaTitle: 'Link in Bio for Small Businesses — BytLinks',
    metaDescription: 'One professional page for your business. Product cards, location map, event announcements, newsletter signup, and analytics — no website required.',
    heroHeadline: 'Your business, one link.',
    heroSubhead: 'A link in bio that actually looks like your brand. Add your products, your location, your events, and your contact details — then share one link everywhere.',
    audience: 'Small businesses and local brands',
    painPoint: 'You\'re sending people to a linktree that looks nothing like your brand.',
    primaryCTA: 'Build your business page — free',
    features: [
      {
        icon: 'ShoppingBag',
        title: 'Product cards with direct links',
        description: 'Feature your products with image, description, and a direct buy link. No storefront needed — link straight to your existing shop or booking page.',
      },
      {
        icon: 'MapPin',
        title: 'Location and map embed',
        description: 'Add your address with an embedded map. Customers find you without leaving your page.',
      },
      {
        icon: 'Palette',
        title: 'Looks like your brand',
        description: '12 themes, 15 color presets, and full style control — all free. Your page matches your brand, not Linktree\'s.',
      },
      {
        icon: 'Desktop',
        title: 'A real website on desktop',
        description: 'BytLinks renders as a 2-column website on desktop — not a stretched phone screen. Professional on every device your customers use.',
      },
    ],
    templateSlug: 'startup',
    testimonialName: 'Real business owner testimonial',
    testimonialRole: 'To be added before launch',
    testimonialQuote: 'Placeholder — do not display',
    relatedSlugs: ['freelancers', 'creators'],
  },
  {
    slug: 'creators',
    title: 'BytLinks for Content Creators',
    metaTitle: 'Link in Bio for Content Creators — BytLinks',
    metaDescription: 'More than a list of links. 19 content blocks, full analytics, and 12 free themes — built for creators who want their page to look as good as their content.',
    heroHeadline: 'Your page, not Linktree\'s.',
    heroSubhead: 'You\'ve built an audience on your content. Your link in bio should reflect that — not look like everyone else\'s. BytLinks gives you real design control, real analytics, and 19 content blocks to work with.',
    audience: 'Content creators and influencers',
    painPoint: 'Your Linktree looks like every other creator\'s Linktree.',
    primaryCTA: 'Build your creator page — free',
    features: [
      {
        icon: 'Layout',
        title: '12 themes, all free',
        description: 'Minimal, editorial, brutalist, neon, glass — choose a visual identity that actually matches yours. Every theme is free. No upsells.',
      },
      {
        icon: 'BarChart2',
        title: 'Full analytics, free',
        description: 'See clicks, countries, devices, referrers, and per-link performance. No upgrade required. No Google Analytics scripts on your page.',
      },
      {
        icon: 'Rss',
        title: 'Microblog and social post embeds',
        description: 'Post updates directly to your BytLinks page. Embed your social posts. Give people a reason to come back.',
      },
      {
        icon: 'Download',
        title: 'Import from Linktree in 30 seconds',
        description: 'Paste your Linktree URL and your links come over automatically. Switching takes less time than this sentence.',
      },
    ],
    templateSlug: 'freelancer',
    testimonialName: 'Real creator testimonial',
    testimonialRole: 'To be added before launch',
    testimonialQuote: 'Placeholder — do not display',
    relatedSlugs: ['musicians', 'podcasters'],
  },
  {
    slug: 'podcasters',
    title: 'BytLinks for Podcasters',
    metaTitle: 'Link in Bio for Podcasters — BytLinks',
    metaDescription: 'One link for your podcast, episodes, newsletter, and guest booking. Embed Spotify and Apple Podcasts directly. Free.',
    heroHeadline: 'One link for your podcast.',
    heroSubhead: 'Embed your latest episode, collect newsletter signups, let guests book interviews, and link to every platform you\'re on — from one page that sounds as good as your show.',
    audience: 'Podcasters and audio creators',
    painPoint: 'Your listeners are on six podcast platforms. You\'re sending them to a bio link with six separate links.',
    primaryCTA: 'Build your podcast page — free',
    features: [
      {
        icon: 'Mic',
        title: 'Embed Spotify, Apple Podcasts, and more',
        description: 'Your latest episode plays directly on your page. Listeners don\'t have to go anywhere.',
      },
      {
        icon: 'Mail',
        title: 'Newsletter signup built in',
        description: 'Collect listener emails directly from your BytLinks page. No third-party form needed.',
      },
      {
        icon: 'CalendarCheck',
        title: 'Guest booking calendar',
        description: 'Connect Calendly and let potential guests book interview slots directly. You handle the creative, BytLinks handles the logistics.',
      },
      {
        icon: 'Users',
        title: 'Digital business card for networking',
        description: 'At podcast conferences, share your card via QR code. They scan it, get your contact details and links, and you get theirs.',
      },
    ],
    templateSlug: 'podcaster',
    testimonialName: 'Real podcaster testimonial',
    testimonialRole: 'To be added before launch',
    testimonialQuote: 'Placeholder — do not display',
    relatedSlugs: ['musicians', 'creators'],
  },
  {
    slug: 'coaches',
    title: 'BytLinks for Coaches and Consultants',
    metaTitle: 'Link in Bio for Coaches — BytLinks',
    metaDescription: 'Your coaching page in one link. Booking calendar, testimonials, newsletter, and a digital business card. Built for coaches who mean business.',
    heroHeadline: 'Get booked. Look professional.',
    heroSubhead: 'Your BytLinks page is your coaching hub. Booking calendar, client testimonials, your bio, and every link your clients need — all in one place that looks as authoritative as your work.',
    audience: 'Coaches, consultants, and advisors',
    painPoint: 'You\'re losing bookings to coaches with more professional online presence.',
    primaryCTA: 'Build your coaching page — free',
    features: [
      {
        icon: 'CalendarCheck',
        title: 'Booking calendar front and center',
        description: 'Calendly and Cal.com integration puts your booking link where every visitor can see it. Stop burying it at the bottom.',
      },
      {
        icon: 'Star',
        title: 'Client testimonials on your page',
        description: 'Social proof where it matters — not on a third-party review site. Your testimonials, on your page, in your style.',
      },
      {
        icon: 'FileText',
        title: 'FAQ block for common questions',
        description: 'Answer the questions every client asks before booking. Reduce the back-and-forth. Close more clients.',
      },
      {
        icon: 'CreditCard',
        title: 'Digital business card for events',
        description: 'At workshops and conferences, share your full contact details via QR code. Professional, instant, no paper required.',
      },
    ],
    templateSlug: 'coach',
    testimonialName: 'Real coach testimonial',
    testimonialRole: 'To be added before launch',
    testimonialQuote: 'Placeholder — do not display',
    relatedSlugs: ['freelancers', 'businesses'],
  },
];
