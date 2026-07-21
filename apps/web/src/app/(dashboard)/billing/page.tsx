'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { laravel } from '@/lib/api/client';
import { useToastStore } from '@/stores/toast-store';
import { BillingHero } from '@/components/billing/BillingHero';
import { BillingModals } from '@/components/billing/BillingModals';
import { BankInfoModal } from '@/components/billing/BankInfoModal';
import { PricingPlans } from '@/components/billing/PricingPlans';
import { CreditPackSection } from '@/components/billing/CreditPackSection';
import { CouponRedeemCard } from '@/components/billing/CouponRedeemCard';
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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
    setLoading(true);
    setLoadError(false);
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
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePackConfirm = async (pack: CreditPack, couponCode?: string) => {
    setPurchaseLoading(true);
    try {
      const data = await laravel.creditsPurchase(Math.floor(Number(pack.price)), couponCode);
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

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-20 font-sans">
        <div className="h-40 rounded-2xl bg-white/[0.03] border border-white/12 animate-pulse" />
        <div className="h-24 rounded-2xl bg-white/[0.03] border border-white/12 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-72 rounded-2xl bg-white/[0.03] border border-white/12 animate-pulse" />
          <div className="h-72 rounded-2xl bg-white/[0.03] border border-white/12 animate-pulse" />
          <div className="h-72 rounded-2xl bg-white/[0.03] border border-white/12 animate-pulse" />
        </div>
        <div className="flex items-center justify-center py-4 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center font-sans">
        <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-base font-bold text-white">Không tải được dữ liệu thanh toán</p>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Đã có lỗi khi tải thông tin gói và số dư. Vui lòng thử lại.
        </p>
        <button
          onClick={loadData}
          className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#FF5A1F] hover:bg-[#FF6A2B] text-white font-bold text-sm transition-all"
        >
          <RefreshCw className="h-4 w-4" /> Thử lại
        </button>
      </div>
    );
  }

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

      <CouponRedeemCard onRedeemed={() => { loadData(); }} />

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
