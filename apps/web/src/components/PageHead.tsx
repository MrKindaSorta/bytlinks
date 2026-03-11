import { Helmet } from 'react-helmet-async';

interface PageHeadProps {
  title?: string;
  description?: string;
  noIndex?: boolean;
}

export function PageHead({ title, description, noIndex }: PageHeadProps) {
  const fullTitle = title
    ? `${title} | BytLinks`
    : 'BytLinks — Your link. Your brand. Your data.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
