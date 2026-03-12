interface CountryItem {
  country: string;
  count: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', JP: 'Japan', BR: 'Brazil', IN: 'India',
  KR: 'South Korea', MX: 'Mexico', IT: 'Italy', ES: 'Spain', NL: 'Netherlands',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', CH: 'Switzerland',
  PL: 'Poland', PT: 'Portugal', IE: 'Ireland', NZ: 'New Zealand', SG: 'Singapore',
  HK: 'Hong Kong', TW: 'Taiwan', PH: 'Philippines', ID: 'Indonesia', TH: 'Thailand',
  RU: 'Russia', UA: 'Ukraine', TR: 'Turkey', ZA: 'South Africa', NG: 'Nigeria',
  EG: 'Egypt', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru',
};

function getCountryFlag(code: string): string {
  try {
    return code.toUpperCase().split('').map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
  } catch {
    return '';
  }
}

export function AdminCountries({ countries }: { countries: CountryItem[] }) {
  const max = countries[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <h3 className="font-display text-sm font-700 tracking-tight text-brand-text mb-4">
        Top Countries (30d)
      </h3>

      {countries.length === 0 ? (
        <p className="font-body text-xs text-brand-text-muted">No country data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {countries.map((c) => {
            const pct = Math.round((c.count / max) * 100);
            return (
              <div key={c.country}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-xs font-medium text-brand-text truncate mr-3">
                    {getCountryFlag(c.country)}{' '}
                    {COUNTRY_NAMES[c.country] ?? c.country}
                  </span>
                  <span className="font-body text-xs text-brand-text-muted tabular-nums">{c.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-brand-surface-alt overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: 'var(--color-brand-accent, #10b981)', opacity: 0.6 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
