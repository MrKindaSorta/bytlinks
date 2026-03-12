import { LayoutDashboard, Zap, Globe, Users, ShieldCheck } from 'lucide-react';
import type { AdminTab } from '../../hooks/useAdminAnalytics';

const tabs: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'engagement', label: 'Engagement', icon: Zap },
  { id: 'audience', label: 'Audience', icon: Globe },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'queue', label: 'Queue', icon: ShieldCheck },
];

export function AdminTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-brand-border pb-px mb-6 -mx-1 px-1">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg font-body text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === id
              ? 'bg-brand-surface border border-brand-border border-b-brand-surface text-brand-text -mb-px'
              : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-alt'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
