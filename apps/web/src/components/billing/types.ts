export interface Plan {
  slug: string;
  name: string;
  description: string | null;
  price_regular: number;
  price_sale: number | null;
  max_concurrent_jobs: number;
  queue_priority: string;
  monthly_credits: number;
  audio_generation: boolean;
  status: string;
  sort_order: number;
  is_popular: boolean;
}

export interface PurchaseData {
  success: boolean;
  message: string;
  bank: { bank: string; account: string; holder: string };
  amount: number;
  content: string;
  credits_to_receive: number;
  note: string;
}

export interface UpgradeData {
  success: boolean;
  message: string;
  upgrade_transfer_code: string;
  current_plan: string;
  target_plan: string;
  bank: { bank: string; account: string; holder: string };
  amount: number;
  content: string;
  plan_expires_at: string;
  note: string;
}

export interface UpgradeHistory {
  from_plan: { name: string };
  to_plan: { name: string };
  amount: number;
  status: string;
  transfer_code: string;
  created_at: string;
}

export interface Transaction {
  uuid: string;
  type: string;
  amount: number;
  balance_before?: number;
  balance_after?: number;
  description?: string;
  created_at: string;
}

export { MAX_PENDING_PURCHASES } from '@/constants/billing';
export type { CreditPack } from '@/constants/billing';
