export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  balance: number;
  totalWithdraw: number;
  todayReferrals: number;
  isVerified: boolean;
  referrerUid: string | null;
  lastClaimDate: string | null;
  availableClaims: number;
  avatarColor: string;
  currency?: string;
  spinsUsed?: number;
  activePlan?: string;
  rewardedReferrals?: Record<string, boolean>;
  createdAt?: string;
}

export interface TransactionRecord {
  id: string;
  _category: 'deposit' | 'withdrawal';
  uid: string;
  name: string;
  amount: number;
  method: string;
  trxId?: string;
  destination?: string;
  type?: 'deposit' | 'verification';
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface CurrencyOption {
  code: string;
  name: string;
  rate: number;
  symbol: string;
}
