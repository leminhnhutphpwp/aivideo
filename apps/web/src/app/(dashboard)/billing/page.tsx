'use client';

import { useState, useEffect } from 'react';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';
import { BillingHero } from '@/components/billing/BillingHero';
import { BillingModals } from '@/components/billing/BillingModals';
import { BankInfoModal } from '@/components/billing/BankInfoModal';
import { PricingPlans } from '@/components/billing/PricingPlans';
import { CreditPackSection } from '@/components/billing/CreditPackSection';
import { UpgradeHistoryTable } from '@/components/billing/UpgradeHistoryTable';
import { PendingPurchases } from '@/components/billing/PendingPurchases';
import { TransactionHistory } from '@/components/billing/TransactionHistory';
import type { Plan, PurchaseData, UpgradeData } from '@/components/billing/types';
import type { CreditPack } from '@/constants/billing';

export default function BillingPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<UpgradeData | null>(null);
  const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseData | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadData();
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    try {
      const res: any = await laravel.pendingCreditsPurchases();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setPendingCount(list.filter((p: any) => p.status === 'pending').length);
    } catch {}
  };

  const loadData = async () => {
    try {
      const [plansData, balanceData, userData] = await Promise.all([
        laravel.plans(),
        laravel.creditsBalance(),
        laravel.me(),
      ]);
      setPlans(Array.isArray(plansData) ? plansData : (plansData as any)?.data ?? []);
      setCredits(balanceData.balance);
      setCurrentPlanSlug(userData.plan?.slug ?? null);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    }
  };

  const handlePackConfirm = async (pack: CreditPack) => {
    setPurchaseLoading(true);
    try {
      const data = await laravel.creditsPurchase(Math.floor(Number(pack.price)));
      setPurchaseReceipt({
        success: true,
        message: data.message || '',
        bank: data.bank || { bank: '', account: '', holder: '' },
        amount: data.amount || 0,
        content: data.content || '',
        credits_to_receive: data.credits_to_receive || 0,
        note: data.note || '',
      });
      setSelectedPack(null);
    } catch (err: any) {
      addToast(err.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleClosePurchaseReceipt = () => {
    setPurchaseReceipt(null);
    loadData();
    loadPendingCount();
  };

  return (
    <div className="flex flex-col gap-6 md:gap-6 pb-20 font-sans relative">
      <BillingModals
        upgradeModal={upgradeModal}
        setUpgradeModal={setUpgradeModal}
        onDone={loadData}
      />

      {purchaseReceipt && (
        <BankInfoModal
          data={purchaseReceipt}
          type="purchase"
          onClose={handleClosePurchaseReceipt}
        />
      )}

      <BillingHero
        credits={credits}
      />

      <PricingPlans
        plans={plans}
        currentPlanSlug={currentPlanSlug}
        onUpgradeClick={(slug) => {
          const plan = plans.find(p => p.slug === slug);
          if (plan) setUpgradeModal({ slug, plan_name: plan.name, price: plan.price_sale || plan.price_regular } as any);
        }}
      />

      <CreditPackSection
        pendingCount={pendingCount}
        loading={purchaseLoading}
        selectedPack={selectedPack}
        onSelectPack={setSelectedPack}
        onConfirmPack={handlePackConfirm}
      />

      <UpgradeHistoryTable
        onUpgradeStatusChange={loadData}
      />

      <PendingPurchases
        onStatusChange={loadData}
      />

      <TransactionHistory />
    </div>
  );
}
