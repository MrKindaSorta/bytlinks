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
    testimonialName: 'Maya Chen',
    testimonialRole: 'Independent artist, 12K monthly listeners',
    testimonialQuote: 'I used to send fans to five different links. Now they land on my BytLinks page, hear my latest track instantly, and find everything else. My merch clicks tripled in the first week.',
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
    testimonialName: 'James Porter',
    testimonialRole: 'UX designer and consultant',
    testimonialQuote: 'Clients used to ask for my portfolio, my Calendly, my LinkedIn, and my rates in separate emails. Now I send one link and they have everything. I booked three new clients in the first month.',
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
    testimonialName: 'Sarah Kim',
    testimonialRole: 'Owner, Bloom Botanics',
    testimonialQuote: 'We put our product cards, location, and Instagram all on one BytLinks page. Customers tell us it looks like a real website. We get more walk-ins from our Instagram bio than our Google listing.',
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
    testimonialName: 'Alex Rivera',
    testimonialRole: 'YouTube creator, 85K subscribers',
    testimonialQuote: 'I switched from Linktree in about 30 seconds using the import tool. My page went from looking like everyone else to looking like mine. My audience actually comments on how much better it looks.',
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
    testimonialName: 'Jordan Ellis',
    testimonialRole: 'Host, The Daily Grind Podcast',
    testimonialQuote: 'My guests book through my BytLinks page now. I embed the latest episode, they see the booking link right there, and newsletter signups went up 40%. It replaced three tools for me.',
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
    testimonialName: 'Dr. Priya Sharma',
    testimonialRole: 'Executive coach and speaker',
    testimonialQuote: 'At conferences I just show my QR code. People scan it, see my testimonials, my booking calendar, and my bio all in one place. I look more professional than coaches with full websites.',
    relatedSlugs: ['freelancers', 'businesses'],
  },
  {
    slug: 'photographers',
    title: 'BytLinks for Photographers',
    metaTitle: 'Link in Bio for Photographers | BytLinks',
    metaDescription: 'Show your portfolio, take bookings, and share your contact card — all from one beautiful link in bio page. Free image gallery, booking calendar, and analytics.',
    heroHeadline: 'Your portfolio, one link.',
    heroSubhead: 'Stop sending clients to a basic link list. Your BytLinks page shows your work in a real gallery, takes bookings, and gives clients your contact card — all in one place.',
    audience: 'Photographers and visual artists',
    painPoint: 'Clients want to see your work before they book. A list of links doesn\'t cut it.',
    primaryCTA: 'Build your photography page — free',
    features: [
      {
        icon: 'Images',
        title: 'Full image gallery on your page',
        description: 'Upload your best work directly. Clients see your portfolio instantly — no clicking through to another site.',
      },
      {
        icon: 'CalendarCheck',
        title: 'Booking calendar integration',
        description: 'Connect Calendly or Cal.com. Clients see your availability and book sessions right from your page.',
      },
      {
        icon: 'CreditCard',
        title: 'Digital business card with QR',
        description: 'At weddings, events, and meetups — share your QR code. They get your portfolio, contact info, and booking link in one scan.',
      },
      {
        icon: 'Desktop',
        title: 'Looks like a real website on desktop',
        description: 'Your page renders as a 2-column layout on desktop. Clients reviewing your work on a laptop see a real portfolio, not a stretched phone screen.',
      },
    ],
    templateSlug: 'photographer',
    testimonialName: 'Lena Torres',
    testimonialRole: 'Wedding and portrait photographer',
    testimonialQuote: 'I used to link to my website, my booking page, and my Instagram separately. Now it\'s all on one BytLinks page that looks better than my actual website. Clients book directly from it.',
    relatedSlugs: ['freelancers', 'creators'],
  },
  {
    slug: 'developers',
    title: 'BytLinks for Developers',
    metaTitle: 'Link in Bio for Developers & Designers | BytLinks',
    metaDescription: 'Your GitHub, projects, blog, and contact info in one professional page. Mono-spaced themes built for the dev community. Free forever.',
    heroHeadline: 'Ship your presence.',
    heroSubhead: 'Your GitHub, blog, side projects, and conference talks — all on one page with a mono-spaced theme that actually looks like it was built by a developer.',
    audience: 'Developers, designers, and technical professionals',
    painPoint: 'Your online presence is scattered across GitHub, LinkedIn, Twitter, and your abandoned blog.',
    primaryCTA: 'Build your dev page — free',
    features: [
      {
        icon: 'Code',
        title: 'Dark themes built for devs',
        description: 'The Dark Pro theme with JetBrains Mono gives your page that terminal aesthetic. Because your bio link should look as intentional as your code.',
      },
      {
        icon: 'Link',
        title: 'Rich link previews',
        description: 'Link to your GitHub repos, blog posts, or npm packages — each gets a rich preview card with title, description, and favicon.',
      },
      {
        icon: 'BarChart2',
        title: 'Privacy-first analytics',
        description: 'No Google Analytics. No third-party scripts. See your traffic without compromising your visitors\' privacy. Built by devs, for devs.',
      },
      {
        icon: 'Download',
        title: 'Full data export',
        description: 'Export everything as JSON anytime. Your data is always yours. No vendor lock-in. Because you wouldn\'t use a service that doesn\'t let you leave.',
      },
    ],
    templateSlug: 'developer',
    testimonialName: 'Marcus Wei',
    testimonialRole: 'Senior engineer and open source contributor',
    testimonialQuote: 'I put my GitHub, blog, and conference talks on a BytLinks page with the Dark Pro theme. It looks exactly like something I would have built myself — except it took 5 minutes instead of a weekend.',
    relatedSlugs: ['freelancers', 'creators'],
  },
  {
    slug: 'artists',
    title: 'BytLinks for Artists',
    metaTitle: 'Link in Bio for Artists | BytLinks',
    metaDescription: 'Showcase your art, sell prints, and build your audience — all from one stunning link in bio page. Free gallery, embeds, and analytics.',
    heroHeadline: 'Your art deserves better than a list of links.',
    heroSubhead: 'Your BytLinks page is your online gallery. Show your work, link to your shop, collect newsletter signups, and share your story — all in one page that looks as good as your art.',
    audience: 'Visual artists, illustrators, and digital creators',
    painPoint: 'A generic link list doesn\'t do justice to visual work.',
    primaryCTA: 'Build your artist page — free',
    features: [
      {
        icon: 'Images',
        title: 'Image gallery for your portfolio',
        description: 'Upload your best pieces directly to your page. Visitors see your work immediately — no clicking through to Instagram or Behance.',
      },
      {
        icon: 'ShoppingBag',
        title: 'Product cards for prints and commissions',
        description: 'Feature your prints, originals, or commission slots with image, price, and a direct link to purchase.',
      },
      {
        icon: 'Mail',
        title: 'Newsletter signup built in',
        description: 'Collect emails from fans who want to know about new work, drops, and exhibitions. Syncs with Mailchimp or ConvertKit.',
      },
      {
        icon: 'Palette',
        title: '12 free themes, full style control',
        description: 'Match your page to your aesthetic. Minimal, editorial, glass, brutalist — every theme is free and fully customizable.',
      },
    ],
    templateSlug: 'freelancer',
    testimonialName: 'Ava Nakamura',
    testimonialRole: 'Illustrator and print shop owner',
    testimonialQuote: 'My Linktree was just a boring list of links. My BytLinks page actually shows my art. People can see my work, buy prints, and sign up for my newsletter without leaving the page.',
    relatedSlugs: ['photographers', 'creators'],
  },
  {
    slug: 'real-estate',
    title: 'BytLinks for Real Estate Agents',
    metaTitle: 'Link in Bio for Real Estate Agents | BytLinks',
    metaDescription: 'Your listings, contact card, testimonials, and booking calendar in one professional link. Built for agents who close deals, not just collect leads.',
    heroHeadline: 'Close deals from one link.',
    heroSubhead: 'Your listings, your reviews, your booking calendar, and your contact card — all on one professional page. Share it on every yard sign, business card, and social profile.',
    audience: 'Real estate agents and brokers',
    painPoint: 'You\'re sending prospects to five different places. Half of them never make it past the first click.',
    primaryCTA: 'Build your agent page — free',
    features: [
      {
        icon: 'ShoppingBag',
        title: 'Featured listings with photos',
        description: 'Showcase your active listings with images, descriptions, and direct links. Update them as properties sell.',
      },
      {
        icon: 'Star',
        title: 'Client testimonials front and center',
        description: 'Social proof sells houses. Put your 5-star reviews where every prospect can see them.',
      },
      {
        icon: 'CreditCard',
        title: 'Digital business card and QR code',
        description: 'At open houses, put your QR code on the sign-in sheet. Prospects get your full contact details saved to their phone instantly.',
      },
      {
        icon: 'CalendarCheck',
        title: 'Booking calendar for showings',
        description: 'Let prospects schedule viewings directly from your page. No phone tag required.',
      },
    ],
    templateSlug: 'startup',
    testimonialName: 'David Martinez',
    testimonialRole: 'Licensed realtor, Compass Real Estate',
    testimonialQuote: 'I put a BytLinks QR code on every listing sheet and open house sign-in. Prospects scan it and get my listings, reviews, and booking calendar. Three closings last month came from that QR code.',
    relatedSlugs: ['businesses', 'coaches'],
  },
  {
    slug: 'personal',
    title: 'BytLinks as Your Personal Website',
    metaTitle: 'Simple Personal Website & Link in Bio | BytLinks',
    metaDescription: 'A personal website in 5 minutes. No coding, no hosting, no domain needed. Your bio, links, socials, and content — all on one beautiful page. Free forever.',
    heroHeadline: 'Your personal website. Five minutes.',
    heroSubhead: 'You don\'t need a developer, a domain, or a hosting plan. BytLinks gives you a beautiful personal page with your bio, links, socials, and content blocks — live at bytlinks.com/yourname in minutes.',
    audience: 'Anyone who wants a personal website without the hassle',
    painPoint: 'You\'ve been meaning to make a personal website for years. It never happens.',
    primaryCTA: 'Claim your page — free',
    features: [
      {
        icon: 'Layout',
        title: '12 themes, zero design skills needed',
        description: 'Pick a theme that matches your vibe. Customize colors, fonts, and layout. It looks professional because it was designed by professionals.',
      },
      {
        icon: 'Link',
        title: 'All your links in one place',
        description: 'Instagram, LinkedIn, Twitter, your blog, your newsletter — everything people need to find you, from one URL.',
      },
      {
        icon: 'BarChart2',
        title: 'See who\'s visiting',
        description: 'Free, privacy-first analytics show you how many people visit your page, where they come from, and what they click on.',
      },
      {
        icon: 'Globe',
        title: 'Your own URL, free forever',
        description: 'Get bytlinks.com/yourname instantly. No annual fees, no credit card, no catch. Upgrade to Pro later if you want — or don\'t.',
      },
    ],
    templateSlug: 'freelancer',
    testimonialName: 'Taylor Brooks',
    testimonialRole: 'Marketing manager',
    testimonialQuote: 'I\'d been meaning to make a personal website for three years. Built my BytLinks page in 10 minutes and it honestly looks better than what I would have built. My friends all asked who designed it.',
    relatedSlugs: ['freelancers', 'creators'],
  },
];
