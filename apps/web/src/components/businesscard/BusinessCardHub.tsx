import { useState, useEffect, useCallback } from 'react';
import { CreditCard, ScanLine, BookUser } from 'lucide-react';
import { MyCardsSection } from './MyCardsSection';
import { ScanSection } from './ScanSection';
import { RolodexSection } from './RolodexSection';

type CardSubTab = 'my-cards' | 'scan' | 'rolodex';

export function BusinessCardHub() {
  const [activeSubTab, setActiveSubTab] = useState<CardSubTab>('my-cards');
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(() => {
    fetch('/api/rolodex/exchanges/count', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPendingCount(json.data.count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  function handleScanned() {
    // After a successful scan + add, switch to Rolodex
    setActiveSubTab('rolodex');
    fetchPendingCount();
  }

  function handleExchangeUpdate() {
    fetchPendingCount();
  }

  const tabs: { key: CardSubTab; label: string; icon: typeof CreditCard; badge?: number }[] = [
    { key: 'my-cards', label: 'My Cards', icon: CreditCard },
    { key: 'scan', label: 'Scan', icon: ScanLine },
    { key: 'rolodex', label: 'Rolodex', icon: BookUser, badge: pendingCount },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="shrink-0 flex items-center border-b border-brand-border bg-brand-surface">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 font-body text-sm font-medium transition-colors duration-200
                ${isActive
                  ? 'text-brand-accent'
                  : 'text-brand-text-muted hover:text-brand-text-secondary'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge ? (
                <span className="absolute top-2 right-1/4 sm:static min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content area — fills remaining height */}
      <div className="flex-1 min-h-0">
        {activeSubTab === 'my-cards' && <MyCardsSection />}
        {activeSubTab === 'scan' && <ScanSection onCardAdded={handleScanned} />}
        {activeSubTab === 'rolodex' && (
          <RolodexSection onExchangeUpdate={handleExchangeUpdate} />
        )}
      </div>
    </div>
  );
}
