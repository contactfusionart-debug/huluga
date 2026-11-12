import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, PieChart } from 'lucide-react';
import { Tabs } from '../components/common/Tabs';
import { FundsPage } from './FundsPage';
import { DividendsPage } from './DividendsPage';

const SHARE_TABS = [
  { id: 'contributions', label: 'Contributions', icon: Wallet },
  { id: 'dividends', label: 'Year-End Dividends', icon: PieChart },
];

/**
 * Shares hub: member contributions (shares ledger) and year-end dividends in one place.
 */
export const SharesPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const activeTab = params.get('tab') === 'dividends' ? 'dividends' : 'contributions';

  return (
    <div className="space-y-5" data-testid="shares-page">
      <Tabs
        tabs={SHARE_TABS}
        activeId={activeTab}
        onChange={(id) => setParams(id === 'contributions' ? {} : { tab: id })}
        ariaLabel="Shares sections"
      />
      <div role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'dividends' ? <DividendsPage /> : <FundsPage />}
      </div>
    </div>
  );
};
