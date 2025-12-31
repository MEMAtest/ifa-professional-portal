'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type TabType = 'overview' | 'financial' | 'risk' | 'cashflow' | 'communications' | 'reviews' | 'activity';

const validTabs: TabType[] = ['overview', 'financial', 'risk', 'cashflow', 'communications', 'reviews', 'activity'];

export const useClientDetailsTabs = () => {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);

  return {
    activeTab,
    setActiveTab,
    validTabs
  };
};
