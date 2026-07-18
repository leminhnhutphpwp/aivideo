'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { laravel } from '@/lib/api/client';
import { PricingPlans } from '@/components/billing/PricingPlans';
import { CompetitorComparison } from '@/components/billing/CompetitorComparison';
import type { Plan } from '@/components/billing/types';

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, userData] = await Promise.all([
        laravel.plans(),
        laravel.me(),
      ]);
      setPlans(Array.isArray(plansData) ? plansData : (plansData as any)?.data ?? []);
      setCurrentPlanSlug(userData.plan?.slug ?? null);
    } catch (err) {
      console.error('Failed to load pricing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = (slug: string) => {
    router.push('/billing');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-slate-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Bảng giá</h1>
        <p className="text-sm text-slate-500">Chọn gói phù hợp với nhu cầu của bạn</p>
      </div>
      <PricingPlans
        plans={plans}
        currentPlanSlug={currentPlanSlug}
        onUpgradeClick={handleUpgradeClick}
      />
      <CompetitorComparison />
    </div>
  );
}
