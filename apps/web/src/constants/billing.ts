export type CreditPack = {
  id: number;
  name: string;
  price: number;
  credits: number;
  label?: string | null;
};

export const MAX_PENDING_PURCHASES = 3;
