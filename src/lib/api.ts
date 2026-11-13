import {
  adminAdjustUserBalanceFirestore,
  adminChangePasswordFirestore,
  adminLookupUserFirestore,
  adminResolveDepositFirestore,
  adminToggleUserBlockFirestore,
  adminUpdateConfigFirestore,
  adminUpdatePlanFirestore,
  claimUserProductIncome,
  fetchPublicPlansAndConfig,
  getAdminOverviewFirestore,
  getDashboardForUser,
  loginAdminFirestore,
  loginUserAccount,
  parseSessionToken,
  processUserRecharge,
  processUserWithdrawal,
  purchaseUserPlan,
  registerUserAccount,
  spinUserLuckyWheel,
  subscribePublicSiteData,
  updateUserBankAndSecurity,
} from './firestoreStore';
import type {
  AdminOverviewPayload,
  AdminUserDetail,
  DashboardPayload,
  InvestmentPlan,
  PaymentMethod,
  SiteConfig,
} from '../types';

const TOKEN_STORAGE_KEY = 'feedex_digital_token';
const ADMIN_TOKEN_STORAGE_KEY = 'feedex_digital_admin_token';
const DEVICE_ID_STORAGE_KEY = 'feedex_digital_device_id';

function getClientDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!id) {
      id = `dev_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function getStoredToken(): string | null {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

function requireUserId(): string {
  return parseSessionToken(getStoredToken(), 'user');
}

function requireAdminSession(): void {
  parseSessionToken(getAdminToken(), 'admin');
}

export function subscribeLiveSiteData(
  onConfig: (config: SiteConfig) => void,
  onPlans: (plans: InvestmentPlan[]) => void
): () => void {
  return subscribePublicSiteData(onConfig, onPlans);
}

export async function fetchPlansAndConfig(): Promise<{
  plans: InvestmentPlan[];
  config: SiteConfig;
}> {
  return fetchPublicPlansAndConfig();
}

export async function registerAccount(phone: string, password: string, inviteCode?: string) {
  const res = await registerUserAccount(phone, password, inviteCode, getClientDeviceId());
  setStoredToken(res.token);
  return res.payload;
}

export async function loginAccount(phone: string, password: string) {
  const res = await loginUserAccount(phone, password);
  setStoredToken(res.token);
  return res.payload;
}

export async function fetchDashboard(): Promise<DashboardPayload> {
  const userId = requireUserId();
  return getDashboardForUser(userId);
}

export async function buyPlan(planId: string): Promise<DashboardPayload> {
  const userId = requireUserId();
  return purchaseUserPlan(userId, planId);
}

export async function claimDailyYield(productId: string): Promise<DashboardPayload> {
  const userId = requireUserId();
  return claimUserProductIncome(userId, productId);
}

export async function submitRecharge(
  amount: number,
  method: PaymentMethod,
  txid: string
): Promise<DashboardPayload> {
  const userId = requireUserId();
  return processUserRecharge(userId, amount, method, txid);
}

export async function submitWithdrawal(
  amount: number,
  withdrawPassword: string
): Promise<DashboardPayload> {
  const userId = requireUserId();
  return processUserWithdrawal(userId, amount, withdrawPassword);
}

export async function saveBankAndSecurity(input: {
  network: PaymentMethod;
  walletAddress: string;
  accountName: string;
  withdrawPassword?: string;
  newLoginPassword?: string;
}): Promise<DashboardPayload> {
  const userId = requireUserId();
  return updateUserBankAndSecurity(userId, input);
}

export async function spinWheel(): Promise<{ reward: number; payload: DashboardPayload }> {
  const userId = requireUserId();
  return spinUserLuckyWheel(userId);
}

// ================= ADMIN API CLIENT =================

export async function loginAdminAccount(
  username: string,
  password: string
): Promise<AdminOverviewPayload> {
  const res = await loginAdminFirestore(username, password);
  setAdminToken(res.token);
  return res.overview;
}

export async function fetchAdminOverview(): Promise<AdminOverviewPayload> {
  requireAdminSession();
  return getAdminOverviewFirestore();
}

export async function lookupAdminUser(query: string): Promise<AdminUserDetail> {
  requireAdminSession();
  return adminLookupUserFirestore(query);
}

export async function adjustAdminUserBalance(input: {
  userId: string;
  operation: 'add' | 'deduct';
  amount: number;
  note?: string;
}): Promise<{ detail: AdminUserDetail; overview: AdminOverviewPayload }> {
  requireAdminSession();
  return adminAdjustUserBalanceFirestore(input.userId, input.operation, input.amount, input.note);
}

export async function toggleAdminUserBlock(
  userId: string,
  blocked: boolean
): Promise<{ detail: AdminUserDetail; overview: AdminOverviewPayload }> {
  requireAdminSession();
  return adminToggleUserBlockFirestore(userId, blocked);
}

export async function resolveAdminDeposit(
  recordId: string,
  action: 'approve' | 'reject'
): Promise<AdminOverviewPayload> {
  requireAdminSession();
  return adminResolveDepositFirestore(recordId, action);
}

export async function saveAdminConfig(config: Partial<SiteConfig>): Promise<AdminOverviewPayload> {
  requireAdminSession();
  return adminUpdateConfigFirestore(config);
}

export async function saveAdminPlan(input: {
  planId: string;
  name?: string;
  price?: number;
  dailyIncome?: number;
  cycleDays?: number;
  totalReturn?: number;
}): Promise<AdminOverviewPayload> {
  requireAdminSession();
  return adminUpdatePlanFirestore(input.planId, {
    name: input.name,
    price: input.price,
    dailyIncome: input.dailyIncome,
    cycleDays: input.cycleDays,
    totalReturn: input.totalReturn,
  });
}

export async function updateAdminPassword(newPassword: string): Promise<void> {
  requireAdminSession();
  await adminChangePasswordFirestore(newPassword);
}
