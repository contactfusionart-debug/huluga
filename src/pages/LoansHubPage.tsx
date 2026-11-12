import React, { useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HandCoins, ClipboardList } from 'lucide-react';
import { Tabs } from '../components/common/Tabs';
import { DataContext } from '../context/DataContext';
import { LoansPage } from './LoansPage';
import { ApplicationsPage } from './ApplicationsPage';

/**
 * Loans hub: issued loans and loan applications in one place.
 */
export const LoansHubPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const data = useContext(DataContext);
  const pendingCount = (data?.applications ?? []).filter((a) => a.status === 'pending').length;
  const activeTab = params.get('tab') === 'applications' ? 'applications' : 'loans';

  const tabs = [
    { id: 'loans', label: 'Loans', icon: HandCoins },
    { id: 'applications', label: 'Applications', icon: ClipboardList, badge: pendingCount },
  ];

  return (
    <div className="space-y-5" data-testid="loans-hub-page">
      <Tabs
        tabs={tabs}
        activeId={activeTab}
        onChange={(id) => setParams(id === 'loans' ? {} : { tab: id })}
        ariaLabel="Loan sections"
      />
      <div role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'applications' ? <ApplicationsPage /> : <LoansPage />}
      </div>
    </div>
  );
};
