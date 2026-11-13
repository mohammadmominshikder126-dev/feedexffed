import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { DEFAULT_PLANS, DEFAULT_SITE_CONFIG } from './localFallback';
import type {
  AccountRecord,
  AdminOverviewPayload,
  AdminUserDetail,
  BankBinding,
  DashboardPayload,
  InvestmentPlan,
  PaymentMethod,
  SiteConfig,
  TeamMemberSummary,
  TeamOverview,
  UserProduct,
  UserProfile,
} from '../types';

interface StoredFirestoreUser {
  id: string;
  memberId: string;
  phone: string;
  inviteCode: string;
  referredBy: string | null;
  passwordHash: string;
  withdrawPasswordHash: string | null;
  balance: number;
  totalRecharge: number;
  totalWithdrawal: number;
  lastSpinDate: string | null;
  blocked: boolean;
  deviceId: string;
  multiAccountFlag: boolean;
  bankBinding: {
    network: PaymentMethod;
    walletAddress: string;
    accountName: string;
  } | null;
  createdAt: string;
}

interface AdminSecretDoc {
  username: string;
  passwordHash: string;
}

const DEFAULT_ADMIN_PASSWORD = 'Admin@7860';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function genId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
}

function normalizePhone(raw: string): string {
  let cleaned = raw.trim().replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('00880')) {
    cleaned = '0' + cleaned.slice(5);
  } else if (cleaned.startsWith('8801') && cleaned.length >= 13) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned.replace(/[^0-9]/g, '');
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fb_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

async function hashSecret(raw: string): Promise<string> {
  const salt = Math.random().toString(36).slice(2, 14) + Date.now().toString(36);
  const digest = await sha256Hex(`${salt}:${raw}`);
  return `${salt}:${digest}`;
}

async function verifySecret(raw: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expected] = parts;
  const actual = await sha256Hex(`${salt}:${raw}`);
  return actual === expected;
}

function makeSessionToken(role: 'user' | 'admin', subject: string): string {
  const payload = btoa(JSON.stringify({ uid: subject, role, iat: Date.now() }));
  return `fs_${role}_${payload}`;
}

export function parseSessionToken(token: string | null, expectedRole: 'user' | 'admin'): string {
  if (!token || !token.startsWith(`fs_${expectedRole}_`)) {
    throw new Error(
      expectedRole === 'admin'
        ? 'অননুমোদিত এডমিন অ্যাক্সেস। অনুগ্রহ করে পুনরায় লগইন করুন।'
        : 'অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।'
    );
  }
  try {
    const encoded = token.slice(`fs_${expectedRole}_`.length);
    const parsed = JSON.parse(atob(encoded)) as { uid?: string; role?: string; iat?: number };
    if (!parsed.uid || parsed.role !== expectedRole) {
      throw new Error('Invalid role');
    }
    if (parsed.iat && Date.now() - parsed.iat > SESSION_TTL_MS) {
      throw new Error('Expired');
    }
    return parsed.uid;
  } catch {
    throw new Error(
      expectedRole === 'admin'
        ? 'অননুমোদিত এডমিন অ্যাক্সেস। অনুগ্রহ করে পুনরায় লগইন করুন।'
        : 'অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।'
    );
  }
}

function sanitizeUser(user: StoredFirestoreUser): UserProfile {
  const binding: BankBinding | null = user.bankBinding
    ? {
        network: user.bankBinding.network,
        walletAddress: user.bankBinding.walletAddress,
        accountName: user.bankBinding.accountName,
        hasWithdrawPassword: Boolean(user.withdrawPasswordHash),
      }
    : null;

  return {
    id: user.id,
    memberId: user.memberId,
    phone: user.phone,
    inviteCode: user.inviteCode,
    referredBy: user.referredBy,
    balance: Number((user.balance || 0).toFixed(2)),
    totalRecharge: Number((user.totalRecharge || 0).toFixed(2)),
    totalWithdrawal: Number((user.totalWithdrawal || 0).toFixed(2)),
    lastSpinDate: user.lastSpinDate || null,
    blocked: Boolean(user.blocked),
    multiAccountFlag: Boolean(user.multiAccountFlag),
    bankBinding: binding,
    createdAt: user.createdAt,
  };
}

let seedPromise: Promise<void> | null = null;

async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const configRef = doc(db, 'site_meta', 'public_config');
    try {
      const configSnap = await getDocFromServer(configRef).catch(() => getDoc(configRef));
      if (!configSnap.exists()) {
        await setDoc(configRef, {
          ...DEFAULT_SITE_CONFIG,
          autoApproveDeposit: false,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_meta/public_config');
    }

    const adminRef = doc(db, 'site_meta', 'admin_secret');
    try {
      const adminSnap = await getDocFromServer(adminRef).catch(() => getDoc(adminRef));
      if (!adminSnap.exists()) {
        const hash = await hashSecret(DEFAULT_ADMIN_PASSWORD);
        await setDoc(adminRef, {
          username: 'feedexadmin',
          passwordHash: hash,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_meta/admin_secret');
    }

    try {
      const plansSnap = await getDocsFromServer(collection(db, 'plans')).catch(() =>
        getDocs(collection(db, 'plans'))
      );
      if (plansSnap.empty) {
        for (const plan of DEFAULT_PLANS) {
          await setDoc(doc(db, 'plans', plan.id), plan);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'plans');
    }
  })().catch((err) => {
    seedPromise = null;
    throw err;
  });

  return seedPromise;
}

function sortPlans(list: InvestmentPlan[]): InvestmentPlan[] {
  const order = new Map(DEFAULT_PLANS.map((p, idx) => [p.id, idx]));
  return [...list].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

function normalizeExternalUrl(raw: string | undefined, fallback: string): string {
  const cleaned = (raw || '').trim();
  if (!cleaned) return fallback;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (cleaned.startsWith('@')) return `https://t.me/${cleaned.slice(1)}`;
  return `https://${cleaned}`;
}

function normalizeConfig(raw: Partial<SiteConfig> | undefined): SiteConfig {
  return {
    telegramLink: normalizeExternalUrl(raw?.telegramLink, DEFAULT_SITE_CONFIG.telegramLink),
    supportLink: normalizeExternalUrl(raw?.supportLink, DEFAULT_SITE_CONFIG.supportLink),
    rechargeNumbers: {
      বিকাশ: raw?.rechargeNumbers?.বিকাশ || DEFAULT_SITE_CONFIG.rechargeNumbers.বিকাশ,
      নগদ: raw?.rechargeNumbers?.নগদ || DEFAULT_SITE_CONFIG.rechargeNumbers.নগদ,
      রকেট: raw?.rechargeNumbers?.রকেট || DEFAULT_SITE_CONFIG.rechargeNumbers.রকেট,
    },
    referralRates: {
      level1: raw?.referralRates?.level1 ?? DEFAULT_SITE_CONFIG.referralRates.level1,
      level2: raw?.referralRates?.level2 ?? DEFAULT_SITE_CONFIG.referralRates.level2,
      level3: raw?.referralRates?.level3 ?? DEFAULT_SITE_CONFIG.referralRates.level3,
    },
    registrationBonus: raw?.registrationBonus ?? DEFAULT_SITE_CONFIG.registrationBonus,
    minDeposit: raw?.minDeposit ?? DEFAULT_SITE_CONFIG.minDeposit,
    minWithdraw: raw?.minWithdraw ?? DEFAULT_SITE_CONFIG.minWithdraw,
    autoApproveDeposit: false,
  };
}

export async function fetchPublicPlansAndConfig(): Promise<{
  plans: InvestmentPlan[];
  config: SiteConfig;
}> {
  await ensureSeeded();
  try {
    const [configSnap, plansSnap] = await Promise.all([
      getDocFromServer(doc(db, 'site_meta', 'public_config')).catch(() =>
        getDoc(doc(db, 'site_meta', 'public_config'))
      ),
      getDocsFromServer(collection(db, 'plans')).catch(() => getDocs(collection(db, 'plans'))),
    ]);
    const config = normalizeConfig(configSnap.exists() ? (configSnap.data() as SiteConfig) : undefined);
    const plans = plansSnap.empty
      ? DEFAULT_PLANS
      : sortPlans(plansSnap.docs.map((d) => d.data() as InvestmentPlan));
    return { plans, config };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site_meta/public_config');
  }
}

export function subscribePublicSiteData(
  onConfig: (config: SiteConfig) => void,
  onPlans: (plans: InvestmentPlan[]) => void
): () => void {
  void ensureSeeded();
  const unsubConfig = onSnapshot(
    doc(db, 'site_meta', 'public_config'),
    (snap) => {
      if (snap.exists()) {
        onConfig(normalizeConfig(snap.data() as SiteConfig));
      }
    },
    (error) => {
      console.error('Config snapshot error:', error);
    }
  );
  const unsubPlans = onSnapshot(
    collection(db, 'plans'),
    (snap) => {
      if (!snap.empty) {
        onPlans(sortPlans(snap.docs.map((d) => d.data() as InvestmentPlan)));
      }
    },
    (error) => {
      console.error('Plans snapshot error:', error);
    }
  );
  return () => {
    unsubConfig();
    unsubPlans();
  };
}

function buildTeamFromData(
  allUsers: StoredFirestoreUser[],
  allProducts: UserProduct[],
  userId: string
): TeamOverview {
  const summarize = (u: StoredFirestoreUser, level: 1 | 2 | 3): TeamMemberSummary => {
    const assetsTotal = allProducts
      .filter((p) => p.userId === u.id)
      .reduce((acc, item) => acc + item.price, 0);
    return {
      id: u.id,
      memberId: u.memberId,
      phoneMasked: maskPhone(u.phone),
      level,
      rechargeTotal: Number((u.totalRecharge || 0).toFixed(2)),
      assetsTotal: Number(assetsTotal.toFixed(2)),
      joinedAt: u.createdAt,
    };
  };

  const level1Users = allUsers.filter((u) => u.referredBy === userId);
  const level1Ids = new Set(level1Users.map((u) => u.id));
  const level2Users = allUsers.filter((u) => u.referredBy && level1Ids.has(u.referredBy));
  const level2Ids = new Set(level2Users.map((u) => u.id));
  const level3Users = allUsers.filter((u) => u.referredBy && level2Ids.has(u.referredBy));

  const levels = {
    1: level1Users.map((u) => summarize(u, 1)),
    2: level2Users.map((u) => summarize(u, 2)),
    3: level3Users.map((u) => summarize(u, 3)),
  };
  const all = [...levels[1], ...levels[2], ...levels[3]];

  return {
    teamRecharge: Number(all.reduce((s, m) => s + m.rechargeTotal, 0).toFixed(2)),
    teamAssets: Number(all.reduce((s, m) => s + m.assetsTotal, 0).toFixed(2)),
    teamNumber: all.length,
    levels,
  };
}

export async function getDashboardForUser(userId: string): Promise<DashboardPayload> {
  await ensureSeeded();
  try {
    const userSnap = await getDocFromServer(doc(db, 'users', userId)).catch(() =>
      getDoc(doc(db, 'users', userId))
    );
    if (!userSnap.exists()) {
      throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
    }
    const user = userSnap.data() as StoredFirestoreUser;
    if (user.blocked) {
      throw new Error('আপনার অ্যাকাউন্টটি এডমিন কর্তৃক স্থগিত করা হয়েছে।');
    }

    const [productsSnap, recordsSnap, allUsersSnap, allProductsSnap] = await Promise.all([
      getDocs(query(collection(db, 'products'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'records'), where('userId', '==', userId))),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'products')),
    ]);

    const products = productsSnap.docs
      .map((d) => d.data() as UserProduct)
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());

    const records = recordsSnap.docs
      .map((d) => d.data() as AccountRecord)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const allUsers = allUsersSnap.docs.map((d) => d.data() as StoredFirestoreUser);
    const allProducts = allProductsSnap.docs.map((d) => d.data() as UserProduct);

    return {
      user: sanitizeUser(user),
      products,
      records,
      team: buildTeamFromData(allUsers, allProducts, userId),
    };
  } catch (error) {
    if (error instanceof Error && (error.message.includes('পাওয়া যায়নি') || error.message.includes('স্থগিত'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }
}

export async function registerUserAccount(
  phone: string,
  password: string,
  inviteCode?: string,
  deviceId?: string
): Promise<{ token: string; payload: DashboardPayload }> {
  await ensureSeeded();
  const cleanPhone = normalizePhone(phone);
  if (cleanPhone.length < 10 || cleanPhone.length > 14) {
    throw new Error('অনুগ্রহ করে সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
  }
  if (!password || password.length < 6) {
    throw new Error('লগইন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
  }

  const cleanDeviceId = (deviceId || '').trim().slice(0, 120);
  const phoneLockKey = `ph_${cleanPhone}`;

  try {
    const existingPhoneSnap = await getDocs(
      query(collection(db, 'users'), where('phone', '==', cleanPhone))
    );
    if (!existingPhoneSnap.empty) {
      throw new Error(
        'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট নিবন্ধিত আছে। একটি নম্বর দিয়ে শুধু একবারই নিবন্ধন করা যাবে।'
      );
    }

    let referredById: string | null = null;
    if (inviteCode && inviteCode.trim()) {
      const cleanRef = inviteCode.trim().toUpperCase();
      const refSnap = await getDocs(
        query(collection(db, 'users'), where('inviteCode', '==', cleanRef))
      );
      if (!refSnap.empty) {
        referredById = (refSnap.docs[0].data() as StoredFirestoreUser).id;
      } else {
        const refMemberSnap = await getDocs(
          query(collection(db, 'users'), where('memberId', '==', cleanRef))
        );
        if (!refMemberSnap.empty) {
          referredById = (refMemberSnap.docs[0].data() as StoredFirestoreUser).id;
        }
      }
    }

    let multiAccountFlag = false;
    if (cleanDeviceId) {
      const sameDeviceSnap = await getDocs(
        query(collection(db, 'users'), where('deviceId', '==', cleanDeviceId))
      );
      multiAccountFlag = !sameDeviceSnap.empty;
    }

    const { config } = await fetchPublicPlansAndConfig();
    const bonus = config.registrationBonus || 150;
    const now = new Date().toISOString();
    const userId = genId('usr');
    const numericTail = String(Math.floor(100000 + Math.random() * 899999));
    const memberId = `${Math.floor(100 + Math.random() * 899)}${numericTail}`;
    const generatedInviteCode = `FDX${numericTail}`;
    const passwordHash = await hashSecret(password);

    const newUser: StoredFirestoreUser = {
      id: userId,
      memberId,
      phone: cleanPhone,
      inviteCode: generatedInviteCode,
      referredBy: referredById,
      passwordHash,
      withdrawPasswordHash: null,
      balance: bonus,
      totalRecharge: 0,
      totalWithdrawal: 0,
      lastSpinDate: null,
      blocked: false,
      deviceId: cleanDeviceId,
      multiAccountFlag,
      bankBinding: null,
      createdAt: now,
    };

    const bonusRecord: AccountRecord = {
      id: genId('rec'),
      userId,
      type: 'bonus',
      title: 'নতুন নিবন্ধন বোনাস',
      amount: bonus,
      direction: 'credit',
      status: 'সম্পন্ন',
      reference: `WELCOME-${bonus}`,
      createdAt: now,
    };

    await runTransaction(db, async (tx) => {
      const lockRef = doc(db, 'phone_locks', phoneLockKey);
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists()) {
        throw new Error(
          'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট নিবন্ধিত আছে। একটি নম্বর দিয়ে শুধু একবারই নিবন্ধন করা যাবে।'
        );
      }
      tx.set(lockRef, { refId: userId, createdAt: now });
      tx.set(doc(db, 'users', userId), newUser);
      tx.set(doc(db, 'records', bonusRecord.id), bonusRecord);
    });

    const payload = await getDashboardForUser(userId);
    return { token: makeSessionToken('user', userId), payload };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('নিবন্ধিত') ||
        error.message.includes('পাসওয়ার্ড') ||
        error.message.includes('মোবাইল'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'users');
  }
}

export async function loginUserAccount(
  phone: string,
  password: string
): Promise<{ token: string; payload: DashboardPayload }> {
  await ensureSeeded();
  const cleanPhone = normalizePhone(phone);
  try {
    const snap = await getDocsFromServer(
      query(collection(db, 'users'), where('phone', '==', cleanPhone))
    ).catch(() => getDocs(query(collection(db, 'users'), where('phone', '==', cleanPhone))));

    if (snap.empty) {
      throw new Error('মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।');
    }
    const user = snap.docs[0].data() as StoredFirestoreUser;
    if (user.blocked) {
      throw new Error('আপনার অ্যাকাউন্টটি এডমিন কর্তৃক স্থগিত করা হয়েছে। সাপোর্টে যোগাযোগ করুন।');
    }
    const ok = await verifySecret(password, user.passwordHash);
    if (!ok) {
      throw new Error('মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।');
    }
    const payload = await getDashboardForUser(user.id);
    return { token: makeSessionToken('user', user.id), payload };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('সঠিক নয়') || error.message.includes('স্থগিত'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, 'users');
  }
}

async function creditReferralCommissions(
  sourceUser: StoredFirestoreUser,
  baseAmount: number,
  sourceLabel: string,
  rates: { level1: number; level2: number; level3: number },
  now: string
): Promise<void> {
  const rateMap = [rates.level1, rates.level2, rates.level3];
  let currentReferrerId = sourceUser.referredBy;

  for (let lvl = 0; lvl < 3; lvl += 1) {
    if (!currentReferrerId) break;
    const refSnap = await getDoc(doc(db, 'users', currentReferrerId));
    if (!refSnap.exists()) break;
    const refUser = refSnap.data() as StoredFirestoreUser;
    const pct = rateMap[lvl];
    if (pct > 0 && !refUser.blocked) {
      const commission = Number(((baseAmount * pct) / 100).toFixed(2));
      if (commission > 0) {
        const nextBalance = Number(((refUser.balance || 0) + commission).toFixed(2));
        await updateDoc(doc(db, 'users', refUser.id), { balance: nextBalance });
        const recId = genId('rec');
        const commissionRecord: AccountRecord = {
          id: recId,
          userId: refUser.id,
          type: 'commission',
          title: `লেভেল-${lvl + 1} রেফার কমিশন (${sourceLabel})`,
          amount: commission,
          direction: 'credit',
          status: 'সম্পন্ন',
          reference: sourceUser.memberId,
          createdAt: now,
        };
        await setDoc(doc(db, 'records', recId), commissionRecord);
      }
    }
    currentReferrerId = refUser.referredBy;
  }
}

export async function purchaseUserPlan(
  userId: string,
  planId: string
): Promise<DashboardPayload> {
  await ensureSeeded();
  try {
    const [{ config }, userSnap, planSnap] = await Promise.all([
      fetchPublicPlansAndConfig(),
      getDocFromServer(doc(db, 'users', userId)).catch(() => getDoc(doc(db, 'users', userId))),
      getDocFromServer(doc(db, 'plans', planId)).catch(() => getDoc(doc(db, 'plans', planId))),
    ]);

    if (!userSnap.exists()) throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
    const user = userSnap.data() as StoredFirestoreUser;
    if (user.blocked) throw new Error('আপনার অ্যাকাউন্টটি স্থগিত রয়েছে।');
    if (user.totalRecharge <= 0) {
      throw new Error('প্ল্যান কেনার আগে কমপক্ষে একবার ডিপোজিট (রিচার্জ) সম্পন্ন করতে হবে।');
    }
    if (!planSnap.exists()) throw new Error('নির্বাচিত প্ল্যানটি পাওয়া যায়নি।');
    const plan = planSnap.data() as InvestmentPlan;
    if (user.balance < plan.price) {
      throw new Error(
        `প্ল্যানটি কিনতে আরও ৳ ${(plan.price - user.balance).toFixed(0)} টাকা প্রয়োজন। প্রথমে ডিপোজিট করুন।`
      );
    }

    const now = new Date().toISOString();
    const productId = genId('prod');
    const recordId = genId('rec');

    const product: UserProduct = {
      id: productId,
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      category: plan.category,
      price: plan.price,
      dailyIncome: plan.dailyIncome,
      cycleDays: plan.cycleDays,
      claimedDays: 0,
      totalEarned: 0,
      purchasedAt: now,
      lastClaimedAt: null,
      status: 'সক্রিয়',
    };

    const purchaseRecord: AccountRecord = {
      id: recordId,
      userId: user.id,
      type: 'purchase',
      title: `${plan.name} ক্রয় করা হয়েছে`,
      amount: plan.price,
      direction: 'debit',
      status: 'সম্পন্ন',
      reference: product.id.toUpperCase(),
      createdAt: now,
    };

    await runTransaction(db, async (tx) => {
      const freshSnap = await tx.get(doc(db, 'users', userId));
      if (!freshSnap.exists()) throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
      const freshUser = freshSnap.data() as StoredFirestoreUser;
      if (freshUser.balance < plan.price) {
        throw new Error('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।');
      }
      tx.update(doc(db, 'users', userId), {
        balance: Number((freshUser.balance - plan.price).toFixed(2)),
      });
      tx.set(doc(db, 'products', productId), product);
      tx.set(doc(db, 'records', recordId), purchaseRecord);
    });

    await creditReferralCommissions(user, plan.price, plan.code, config.referralRates, now);
    return getDashboardForUser(userId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('পাওয়া যায়নি') ||
        error.message.includes('স্থগিত') ||
        error.message.includes('ডিপোজিট') ||
        error.message.includes('প্রয়োজন') ||
        error.message.includes('ব্যালেন্স'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'products');
  }
}

export async function claimUserProductIncome(
  userId: string,
  productId: string
): Promise<DashboardPayload> {
  await ensureSeeded();
  try {
    const now = new Date().toISOString();
    const recordId = genId('rec');

    await runTransaction(db, async (tx) => {
      const [userSnap, prodSnap] = await Promise.all([
        tx.get(doc(db, 'users', userId)),
        tx.get(doc(db, 'products', productId)),
      ]);
      if (!userSnap.exists()) throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
      if (!prodSnap.exists()) throw new Error('প্ল্যানের তথ্য পাওয়া যায়নি।');
      const user = userSnap.data() as StoredFirestoreUser;
      const product = prodSnap.data() as UserProduct;
      if (product.userId !== userId) throw new Error('প্ল্যানের তথ্য পাওয়া যায়নি।');
      if (product.status === 'সম্পন্ন' || product.claimedDays >= product.cycleDays) {
        throw new Error('এই প্ল্যানের সব মেয়াদের আয় সংগ্রহ করা সম্পন্ন হয়েছে।');
      }
      const nextDays = product.claimedDays + 1;
      const nextEarned = Number((product.totalEarned + product.dailyIncome).toFixed(2));
      const nextStatus: 'সক্রিয়' | 'সম্পন্ন' =
        nextDays >= product.cycleDays ? 'সম্পন্ন' : 'সক্রিয়';

      tx.update(doc(db, 'products', productId), {
        claimedDays: nextDays,
        totalEarned: nextEarned,
        lastClaimedAt: now,
        status: nextStatus,
      });
      tx.update(doc(db, 'users', userId), {
        balance: Number((user.balance + product.dailyIncome).toFixed(2)),
      });
      const rec: AccountRecord = {
        id: recordId,
        userId,
        type: 'income',
        title: `${product.planName} দৈনিক আয় (দিন ${nextDays}/${product.cycleDays})`,
        amount: product.dailyIncome,
        direction: 'credit',
        status: 'সম্পন্ন',
        reference: product.id.toUpperCase(),
        createdAt: now,
      };
      tx.set(doc(db, 'records', recordId), rec);
    });

    return getDashboardForUser(userId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('পাওয়া যায়নি') || error.message.includes('সম্পন্ন'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `products/${productId}`);
  }
}

export async function processUserRecharge(
  userId: string,
  amount: number,
  method: PaymentMethod,
  txid: string
): Promise<DashboardPayload> {
  await ensureSeeded();
  if (method !== 'বিকাশ' && method !== 'নগদ' && method !== 'রকেট') {
    throw new Error('অনুগ্রহ করে বিকাশ, নগদ অথবা রকেট নির্বাচন করুন।');
  }
  const cleanTxid = (txid || '').trim().replace(/\s+/g, '').toUpperCase();
  if (cleanTxid.length < 4) {
    throw new Error('সেন্ড মানি করার পর সঠিক ট্রানজেকশন আইডি (Transaction ID) দিন।');
  }

  try {
    const [{ config }, userSnap, existingRefSnap] = await Promise.all([
      fetchPublicPlansAndConfig(),
      getDocFromServer(doc(db, 'users', userId)).catch(() => getDoc(doc(db, 'users', userId))),
      getDocs(query(collection(db, 'records'), where('reference', '==', cleanTxid))),
    ]);

    if (!userSnap.exists()) throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
    const user = userSnap.data() as StoredFirestoreUser;
    if (user.blocked) throw new Error('আপনার অ্যাকাউন্টটি স্থগিত রয়েছে।');

    const duplicateInRecords = existingRefSnap.docs.some(
      (d) => (d.data() as AccountRecord).type === 'recharge'
    );
    if (duplicateInRecords) {
      throw new Error(
        'এই ট্রানজেকশন আইডি (Transaction ID) ইতিমধ্যে ব্যবহার করা হয়েছে। একই ট্রানজেকশন আইডি ২ বার দেওয়া যাবে না।'
      );
    }

    const minDep = config.minDeposit || 300;
    if (!Number.isFinite(amount) || amount < minDep) {
      throw new Error(`সর্বনিম্ন ডিপোজিট (রিচার্জ) পরিমাণ ৳ ${minDep}।`);
    }
    if (amount > 500000) {
      throw new Error('একবারে সর্বোচ্চ ডিপোজিট সীমা ৳ ৫,০০,০০০।');
    }

    const txDigest = await sha256Hex(cleanTxid);
    const txidLockKey = `tx_${txDigest.slice(0, 48)}`;
    const now = new Date().toISOString();
    const recordId = genId('rec');

    const rec: AccountRecord = {
      id: recordId,
      userId,
      type: 'recharge',
      title: `${method} সেন্ড মানি ডিপোজিট`,
      amount: Number(amount.toFixed(2)),
      direction: 'credit',
      status: 'অপেক্ষমাণ',
      method,
      reference: cleanTxid.slice(0, 120),
      createdAt: now,
    };

    await runTransaction(db, async (tx) => {
      const lockRef = doc(db, 'txid_locks', txidLockKey);
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists()) {
        throw new Error(
          'এই ট্রানজেকশন আইডি (Transaction ID) ইতিমধ্যে ব্যবহার করা হয়েছে। একই ট্রানজেকশন আইডি ২ বার দেওয়া যাবে না।'
        );
      }
      tx.set(lockRef, { refId: recordId, createdAt: now });
      tx.set(doc(db, 'records', recordId), rec);
    });

    return getDashboardForUser(userId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('ইতিমধ্যে') ||
        error.message.includes('পাওয়া যায়নি') ||
        error.message.includes('স্থগিত') ||
        error.message.includes('সর্বনিম্ন') ||
        error.message.includes('সর্বোচ্চ'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'records');
  }
}

export async function processUserWithdrawal(
  userId: string,
  amount: number,
  withdrawPassword: string
): Promise<DashboardPayload> {
  await ensureSeeded();
  try {
    const [{ config }, userSnap] = await Promise.all([
      fetchPublicPlansAndConfig(),
      getDocFromServer(doc(db, 'users', userId)).catch(() => getDoc(doc(db, 'users', userId))),
    ]);

    if (!userSnap.exists()) throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
    const user = userSnap.data() as StoredFirestoreUser;
    if (user.blocked) throw new Error('আপনার অ্যাকাউন্টটি স্থগিত রয়েছে।');
    if (user.totalRecharge <= 0) {
      throw new Error('উত্তোলন করার আগে কমপক্ষে একবার ডিপোজিট (রিচার্জ) সম্পন্ন করতে হবে।');
    }
    if (!user.bankBinding?.walletAddress) {
      throw new Error(
        'প্রথমে "অ্যাকাউন্ট ও পাসওয়ার্ড" অপশন থেকে আপনার বিকাশ, নগদ বা রকেট নম্বর যুক্ত করুন।'
      );
    }
    if (!user.withdrawPasswordHash) {
      throw new Error('প্রথমে একটি উত্তোলন পাসওয়ার্ড সেট করুন।');
    }
    const ok = await verifySecret(withdrawPassword, user.withdrawPasswordHash);
    if (!ok) {
      throw new Error('উত্তোলন পাসওয়ার্ড সঠিক নয়।');
    }
    const minWd = config.minWithdraw || 100;
    if (!Number.isFinite(amount) || amount < minWd) {
      throw new Error(`সর্বনিম্ন উত্তোলন পরিমাণ ৳ ${minWd}।`);
    }
    if (amount > user.balance) {
      throw new Error('আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।');
    }

    const cleanAmount = Number(amount.toFixed(2));
    const now = new Date().toISOString();
    const recordId = genId('rec');

    await runTransaction(db, async (tx) => {
      const freshSnap = await tx.get(doc(db, 'users', userId));
      if (!freshSnap.exists()) throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
      const fresh = freshSnap.data() as StoredFirestoreUser;
      if (fresh.balance < cleanAmount) throw new Error('আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।');
      tx.update(doc(db, 'users', userId), {
        balance: Number((fresh.balance - cleanAmount).toFixed(2)),
        totalWithdrawal: Number(((fresh.totalWithdrawal || 0) + cleanAmount).toFixed(2)),
      });
      const rec: AccountRecord = {
        id: recordId,
        userId,
        type: 'withdrawal',
        title: `${fresh.bankBinding!.network} মাধ্যমে উত্তোলন`,
        amount: cleanAmount,
        direction: 'debit',
        status: 'সম্পন্ন',
        method: fresh.bankBinding!.network,
        reference: fresh.bankBinding!.walletAddress,
        createdAt: now,
      };
      tx.set(doc(db, 'records', recordId), rec);
    });

    return getDashboardForUser(userId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('পাওয়া যায়নি') ||
        error.message.includes('স্থগিত') ||
        error.message.includes('ডিপোজিট') ||
        error.message.includes('পাসওয়ার্ড') ||
        error.message.includes('সর্বনিম্ন') ||
        error.message.includes('ব্যালেন্স') ||
        error.message.includes('নম্বর'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'records');
  }
}

export async function updateUserBankAndSecurity(
  userId: string,
  input: {
    network: PaymentMethod;
    walletAddress: string;
    accountName: string;
    withdrawPassword?: string;
    newLoginPassword?: string;
  }
): Promise<DashboardPayload> {
  await ensureSeeded();
  if (input.network !== 'বিকাশ' && input.network !== 'নগদ' && input.network !== 'রকেট') {
    throw new Error('বিকাশ, নগদ অথবা রকেট নির্বাচন করুন।');
  }
  const cleanWallet = input.walletAddress.trim();
  const cleanName = input.accountName.trim();
  if (cleanWallet.length < 6) {
    throw new Error('অনুগ্রহ করে সঠিক বিকাশ, নগদ বা রকেট নম্বর দিন।');
  }
  if (!cleanName) {
    throw new Error('অ্যাকাউন্ট হোল্ডারের নাম লিখুন।');
  }

  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
    const user = userSnap.data() as StoredFirestoreUser;

    const updates: Partial<StoredFirestoreUser> = {
      bankBinding: {
        network: input.network,
        walletAddress: cleanWallet,
        accountName: cleanName,
      },
    };

    if (input.withdrawPassword?.trim()) {
      if (input.withdrawPassword.trim().length < 4) {
        throw new Error('উত্তোলন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      }
      updates.withdrawPasswordHash = await hashSecret(input.withdrawPassword.trim());
    } else if (!user.withdrawPasswordHash) {
      throw new Error('অনুগ্রহ করে একটি নতুন উত্তোলন পাসওয়ার্ড সেট করুন।');
    }

    if (input.newLoginPassword?.trim()) {
      if (input.newLoginPassword.trim().length < 6) {
        throw new Error('নতুন লগইন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      }
      updates.passwordHash = await hashSecret(input.newLoginPassword.trim());
    }

    await updateDoc(doc(db, 'users', userId), updates);
    return getDashboardForUser(userId);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('পাওয়া যায়নি') ||
        error.message.includes('পাসওয়ার্ড') ||
        error.message.includes('নম্বর') ||
        error.message.includes('নাম') ||
        error.message.includes('বিকাশ'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function spinUserLuckyWheel(
  userId: string
): Promise<{ reward: number; payload: DashboardPayload }> {
  await ensureSeeded();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rewards = [10, 20, 30, 50, 75, 100];
    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    const now = new Date().toISOString();
    const recordId = genId('rec');

    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(doc(db, 'users', userId));
      if (!userSnap.exists()) throw new Error('অ্যাকাউন্ট পাওয়া যায়নি।');
      const user = userSnap.data() as StoredFirestoreUser;
      if (user.lastSpinDate === today) {
        throw new Error('আজকের দৈনিক স্পিন বোনাস ইতিমধ্যে সংগ্রহ করা হয়েছে। আগামীকাল আবার চেষ্টা করুন।');
      }
      tx.update(doc(db, 'users', userId), {
        lastSpinDate: today,
        balance: Number((user.balance + reward).toFixed(2)),
      });
      const rec: AccountRecord = {
        id: recordId,
        userId,
        type: 'bonus',
        title: 'দৈনিক লাকি হুইল বোনাস',
        amount: reward,
        direction: 'credit',
        status: 'সম্পন্ন',
        reference: `SPIN-${today}`,
        createdAt: now,
      };
      tx.set(doc(db, 'records', recordId), rec);
    });

    const payload = await getDashboardForUser(userId);
    return { reward, payload };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('পাওয়া যায়নি') || error.message.includes('সংগ্রহ করা হয়েছে'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

// ================= ADMIN PANEL OPERATIONS =================

export async function loginAdminFirestore(
  username: string,
  password: string
): Promise<{ token: string; overview: AdminOverviewPayload }> {
  await ensureSeeded();
  try {
    const adminSnap = await getDocFromServer(doc(db, 'site_meta', 'admin_secret')).catch(() =>
      getDoc(doc(db, 'site_meta', 'admin_secret'))
    );
    if (!adminSnap.exists()) {
      throw new Error('এডমিন তথ্য পাওয়া যায়নি।');
    }
    const admin = adminSnap.data() as AdminSecretDoc;
    const valid =
      username.trim() === admin.username && (await verifySecret(password, admin.passwordHash));
    if (!valid) {
      throw new Error('এডমিন ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়।');
    }
    const overview = await getAdminOverviewFirestore();
    return { token: makeSessionToken('admin', 'feedexadmin'), overview };
  } catch (error) {
    if (error instanceof Error && error.message.includes('সঠিক নয়')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, 'site_meta/admin_secret');
  }
}

export async function getAdminOverviewFirestore(): Promise<AdminOverviewPayload> {
  await ensureSeeded();
  try {
    const [{ plans, config }, usersSnap, recordsSnap] = await Promise.all([
      fetchPublicPlansAndConfig(),
      getDocsFromServer(collection(db, 'users')).catch(() => getDocs(collection(db, 'users'))),
      getDocsFromServer(collection(db, 'records')).catch(() => getDocs(collection(db, 'records'))),
    ]);

    const users = usersSnap.docs
      .map((d) => d.data() as StoredFirestoreUser)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const records = recordsSnap.docs.map((d) => d.data() as AccountRecord);
    const userMap = new Map(users.map((u) => [u.id, u]));

    const pendingDeposits = records
      .filter((r) => r.type === 'recharge' && r.status === 'অপেক্ষমাণ')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => {
        const owner = userMap.get(r.userId);
        return {
          ...r,
          userPhone: owner?.phone || 'অজানা',
          memberId: owner?.memberId || '—',
        };
      });

    return {
      totalUsers: users.length,
      totalDeposits: Number(
        users.reduce((s, u) => s + (u.totalRecharge || 0), 0).toFixed(2)
      ),
      totalWithdrawals: Number(
        users.reduce((s, u) => s + (u.totalWithdrawal || 0), 0).toFixed(2)
      ),
      config,
      plans,
      users: users.map(sanitizeUser),
      pendingDeposits,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

export async function adminLookupUserFirestore(queryStr: string): Promise<AdminUserDetail> {
  await ensureSeeded();
  const q = queryStr.trim();
  if (!q) {
    throw new Error('অনুগ্রহ করে সদস্যের আইডি অথবা মোবাইল নম্বর লিখুন।');
  }
  const normalizedQ = normalizePhone(q);

  try {
    const [usersSnap, productsSnap, recordsSnap] = await Promise.all([
      getDocsFromServer(collection(db, 'users')).catch(() => getDocs(collection(db, 'users'))),
      getDocsFromServer(collection(db, 'products')).catch(() => getDocs(collection(db, 'products'))),
      getDocsFromServer(collection(db, 'records')).catch(() => getDocs(collection(db, 'records'))),
    ]);

    const allUsers = usersSnap.docs.map((d) => d.data() as StoredFirestoreUser);
    const allProducts = productsSnap.docs.map((d) => d.data() as UserProduct);
    const allRecords = recordsSnap.docs.map((d) => d.data() as AccountRecord);

    const user = allUsers.find(
      (u) =>
        u.memberId === q ||
        u.phone === q ||
        (normalizedQ && u.phone === normalizedQ) ||
        u.inviteCode.toUpperCase() === q.toUpperCase() ||
        u.phone.includes(q) ||
        u.memberId.includes(q)
    );
    if (!user) {
      throw new Error(`"${q}" দিয়ে কোনো সদস্য খুঁজে পাওয়া যায়নি।`);
    }

    return {
      user: sanitizeUser(user),
      products: allProducts.filter((p) => p.userId === user.id),
      records: allRecords
        .filter((r) => r.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      team: buildTeamFromData(allUsers, allProducts, user.id),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('খুঁজে পাওয়া যায়নি')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

export async function adminAdjustUserBalanceFirestore(
  userId: string,
  operation: 'add' | 'deduct',
  amount: number,
  note?: string
): Promise<{ detail: AdminUserDetail; overview: AdminOverviewPayload }> {
  await ensureSeeded();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('সঠিক টাকার পরিমাণ লিখুন।');
  }
  const clean = Number(amount.toFixed(2));
  const now = new Date().toISOString();
  const recordId = genId('rec');

  try {
    let memberId = '';
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(doc(db, 'users', userId));
      if (!userSnap.exists()) throw new Error('সদস্য পাওয়া যায়নি।');
      const user = userSnap.data() as StoredFirestoreUser;
      memberId = user.memberId;

      if (operation === 'add') {
        tx.update(doc(db, 'users', userId), {
          balance: Number((user.balance + clean).toFixed(2)),
        });
        tx.set(doc(db, 'records', recordId), {
          id: recordId,
          userId,
          type: 'admin',
          title: note?.trim() || 'এডমিন কর্তৃক ব্যালেন্স যোগ',
          amount: clean,
          direction: 'credit',
          status: 'সম্পন্ন',
          reference: 'ADMIN-ADD',
          createdAt: now,
        } satisfies AccountRecord);
      } else {
        if (user.balance < clean) {
          throw new Error(`সদস্যের ব্যালেন্স (৳ ${user.balance}) এর চেয়ে বেশি কাটা যাবে না।`);
        }
        tx.update(doc(db, 'users', userId), {
          balance: Number((user.balance - clean).toFixed(2)),
        });
        tx.set(doc(db, 'records', recordId), {
          id: recordId,
          userId,
          type: 'admin',
          title: note?.trim() || 'এডমিন কর্তৃক ব্যালেন্স কর্তন',
          amount: clean,
          direction: 'debit',
          status: 'সম্পন্ন',
          reference: 'ADMIN-DEDUCT',
          createdAt: now,
        } satisfies AccountRecord);
      }
    });

    const [detail, overview] = await Promise.all([
      adminLookupUserFirestore(memberId),
      getAdminOverviewFirestore(),
    ]);
    return { detail, overview };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('পাওয়া যায়নি') || error.message.includes('বেশি কাটা'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function adminToggleUserBlockFirestore(
  userId: string,
  blocked: boolean
): Promise<{ detail: AdminUserDetail; overview: AdminOverviewPayload }> {
  await ensureSeeded();
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) throw new Error('সদস্য পাওয়া যায়নি।');
    const user = userSnap.data() as StoredFirestoreUser;
    await updateDoc(doc(db, 'users', userId), { blocked });
    const [detail, overview] = await Promise.all([
      adminLookupUserFirestore(user.memberId),
      getAdminOverviewFirestore(),
    ]);
    return { detail, overview };
  } catch (error) {
    if (error instanceof Error && error.message.includes('পাওয়া যায়নি')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function adminResolveDepositFirestore(
  recordId: string,
  action: 'approve' | 'reject'
): Promise<AdminOverviewPayload> {
  await ensureSeeded();
  try {
    const { config } = await fetchPublicPlansAndConfig();
    let approvedUser: StoredFirestoreUser | null = null;
    let approvedRec: AccountRecord | null = null;

    await runTransaction(db, async (tx) => {
      const recSnap = await tx.get(doc(db, 'records', recordId));
      if (!recSnap.exists()) throw new Error('ডিপোজিট রেকর্ড পাওয়া যায়নি।');
      const rec = recSnap.data() as AccountRecord;
      if (rec.type !== 'recharge') throw new Error('ডিপোজিট রেকর্ড পাওয়া যায়নি।');
      if (rec.status !== 'অপেক্ষমাণ') {
        throw new Error('এই ডিপোজিটটি ইতিমধ্যে প্রক্রিয়াকরণ হয়েছে।');
      }

      const userSnap = await tx.get(doc(db, 'users', rec.userId));
      if (!userSnap.exists()) throw new Error('সদস্য পাওয়া যায়নি।');
      const user = userSnap.data() as StoredFirestoreUser;

      if (action === 'approve') {
        tx.update(doc(db, 'records', recordId), { status: 'সম্পন্ন' });
        tx.update(doc(db, 'users', user.id), {
          balance: Number((user.balance + rec.amount).toFixed(2)),
          totalRecharge: Number(((user.totalRecharge || 0) + rec.amount).toFixed(2)),
        });
        approvedUser = user;
        approvedRec = rec;
      } else {
        tx.update(doc(db, 'records', recordId), { status: 'বাতিল' });
      }
    });

    if (approvedUser && approvedRec) {
      const recObj = approvedRec as AccountRecord;
      await creditReferralCommissions(
        approvedUser,
        recObj.amount,
        `${recObj.method || ''} ডিপোজিট`,
        config.referralRates,
        new Date().toISOString()
      );
    }

    return getAdminOverviewFirestore();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('পাওয়া যায়নি') || error.message.includes('প্রক্রিয়াকরণ'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `records/${recordId}`);
  }
}

export async function adminUpdateConfigFirestore(
  partial: Partial<SiteConfig>
): Promise<AdminOverviewPayload> {
  await ensureSeeded();
  try {
    const { config: current } = await fetchPublicPlansAndConfig();
    const nextConfig: SiteConfig = {
      telegramLink: normalizeExternalUrl(partial.telegramLink, current.telegramLink),
      supportLink: normalizeExternalUrl(partial.supportLink, current.supportLink),
      rechargeNumbers: {
        বিকাশ: partial.rechargeNumbers?.বিকাশ?.trim() || current.rechargeNumbers.বিকাশ,
        নগদ: partial.rechargeNumbers?.নগদ?.trim() || current.rechargeNumbers.নগদ,
        রকেট: partial.rechargeNumbers?.রকেট?.trim() || current.rechargeNumbers.রকেট,
      },
      referralRates: {
        level1:
          Number(partial.referralRates?.level1) >= 0
            ? Number(partial.referralRates!.level1)
            : current.referralRates.level1,
        level2:
          Number(partial.referralRates?.level2) >= 0
            ? Number(partial.referralRates!.level2)
            : current.referralRates.level2,
        level3:
          Number(partial.referralRates?.level3) >= 0
            ? Number(partial.referralRates!.level3)
            : current.referralRates.level3,
      },
      registrationBonus:
        typeof partial.registrationBonus === 'number' && partial.registrationBonus >= 0
          ? Number(partial.registrationBonus)
          : current.registrationBonus,
      minDeposit:
        typeof partial.minDeposit === 'number' && partial.minDeposit > 0
          ? Number(partial.minDeposit)
          : current.minDeposit,
      minWithdraw:
        typeof partial.minWithdraw === 'number' && partial.minWithdraw > 0
          ? Number(partial.minWithdraw)
          : current.minWithdraw,
      autoApproveDeposit: false,
    };

    await setDoc(doc(db, 'site_meta', 'public_config'), nextConfig);
    return getAdminOverviewFirestore();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'site_meta/public_config');
  }
}

export async function adminUpdatePlanFirestore(
  planId: string,
  updates: {
    name?: string;
    price?: number;
    dailyIncome?: number;
    cycleDays?: number;
    totalReturn?: number;
  }
): Promise<AdminOverviewPayload> {
  await ensureSeeded();
  try {
    const planRef = doc(db, 'plans', planId);
    const snap = await getDoc(planRef);
    if (!snap.exists()) throw new Error('প্ল্যান পাওয়া যায়নি।');
    const plan = snap.data() as InvestmentPlan;

    const nextDaily =
      typeof updates.dailyIncome === 'number' && updates.dailyIncome > 0
        ? Number(updates.dailyIncome)
        : plan.dailyIncome;
    const nextDays =
      typeof updates.cycleDays === 'number' && updates.cycleDays > 0
        ? Math.round(updates.cycleDays)
        : plan.cycleDays;

    const nextPlan: InvestmentPlan = {
      ...plan,
      name: updates.name?.trim() || plan.name,
      price:
        typeof updates.price === 'number' && updates.price > 0 ? Number(updates.price) : plan.price,
      dailyIncome: nextDaily,
      cycleDays: nextDays,
      totalReturn:
        typeof updates.totalReturn === 'number' && updates.totalReturn > 0
          ? Number(updates.totalReturn)
          : Number((nextDaily * nextDays).toFixed(2)),
    };

    await setDoc(planRef, nextPlan);
    return getAdminOverviewFirestore();
  } catch (error) {
    if (error instanceof Error && error.message.includes('পাওয়া যায়নি')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `plans/${planId}`);
  }
}

export async function adminChangePasswordFirestore(newPassword: string): Promise<void> {
  await ensureSeeded();
  if (!newPassword || newPassword.trim().length < 6) {
    throw new Error('নতুন এডমিন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
  }
  try {
    const passwordHash = await hashSecret(newPassword.trim());
    await setDoc(doc(db, 'site_meta', 'admin_secret'), {
      username: 'feedexadmin',
      passwordHash,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'site_meta/admin_secret');
  }
}
