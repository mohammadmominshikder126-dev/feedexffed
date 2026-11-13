// server.ts
import express from "express";
import path2 from "node:path";

// server/store.ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
var STORE_VERSION = 4;
var DEFAULT_PLANS = [
  {
    id: "vip-1",
    code: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09E7",
    name: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09E7 \u2014 \u098F\u09DF\u09BE\u09B0 \u0995\u09BE\u09B0\u09CD\u0997\u09CB \u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u099F\u09BE\u09B0",
    category: "daily",
    price: 500,
    dailyIncome: 50,
    cycleDays: 30,
    totalReturn: 1500,
    imagePath: "/assets/aistudio/images__26__5ccb2af9.jpeg"
  },
  {
    id: "vip-2",
    code: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09E8",
    name: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09E8 \u2014 \u098F\u0995\u09CD\u09B8\u09AA\u09CD\u09B0\u09C7\u09B8 \u09AB\u09CD\u09B2\u09BF\u099F",
    category: "daily",
    price: 1e3,
    dailyIncome: 110,
    cycleDays: 30,
    totalReturn: 3300,
    imagePath: "/assets/aistudio/80825423_605f44ca.jpg"
  },
  {
    id: "vip-3",
    code: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09E9",
    name: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09E9 \u2014 \u0987\u09A8\u09CD\u099F\u09BE\u09B0\u09A8\u09CD\u09AF\u09BE\u09B6\u09A8\u09BE\u09B2 \u098F\u09DF\u09BE\u09B0\u09B2\u09BE\u0987\u09A8",
    category: "daily",
    price: 2e3,
    dailyIncome: 230,
    cycleDays: 30,
    totalReturn: 6900,
    imagePath: "/assets/aistudio/e4cf2de03ad051bc28ff33864f809d51_cd43a73c.jpg"
  },
  {
    id: "vip-4",
    code: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09EA",
    name: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09EA \u2014 \u0997\u09CD\u09B2\u09CB\u09AC\u09BE\u09B2 \u09B9\u09BE\u09AC \u09AA\u09BE\u09B0\u09CD\u099F\u09A8\u09BE\u09B0",
    category: "daily",
    price: 5e3,
    dailyIncome: 600,
    cycleDays: 30,
    totalReturn: 18e3,
    imagePath: "/assets/aistudio/images__9__13d6c096.jpeg"
  },
  {
    id: "vip-5",
    code: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09EB",
    name: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09EB \u2014 \u09AA\u09CD\u09B0\u09BE\u0987\u09AE \u09B2\u099C\u09BF\u09B8\u09CD\u099F\u09BF\u0995\u09B8",
    category: "daily",
    price: 1e4,
    dailyIncome: 1250,
    cycleDays: 30,
    totalReturn: 37500,
    imagePath: "/assets/aistudio/images__8__66bd7665.jpeg"
  },
  {
    id: "vip-6",
    code: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09EC",
    name: "\u09AD\u09BF\u0986\u0987\u09AA\u09BF \u09EC \u2014 \u098F\u0995\u09CD\u09B8\u09BF\u0995\u09BF\u0989\u099F\u09BF\u09AD \u09AB\u09CD\u09B0\u09C7\u0987\u099F",
    category: "daily",
    price: 25e3,
    dailyIncome: 3300,
    cycleDays: 30,
    totalReturn: 99e3,
    imagePath: "/assets/aistudio/e4cf2de03ad051bc28ff33864f809d51_cd43a73c.jpg"
  },
  {
    id: "welfare-1",
    code: "\u0995\u09B2\u09CD\u09AF\u09BE\u09A3 \u09E7",
    name: "\u0995\u09B2\u09CD\u09AF\u09BE\u09A3 \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0995",
    category: "welfare",
    price: 300,
    dailyIncome: 75,
    cycleDays: 7,
    totalReturn: 525,
    imagePath: "/assets/aistudio/images__8__66bd7665.jpeg"
  },
  {
    id: "welfare-2",
    code: "\u0995\u09B2\u09CD\u09AF\u09BE\u09A3 \u09E8",
    name: "\u0995\u09B2\u09CD\u09AF\u09BE\u09A3 \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0996",
    category: "welfare",
    price: 1200,
    dailyIncome: 280,
    cycleDays: 10,
    totalReturn: 2800,
    imagePath: "/assets/aistudio/images__9__13d6c096.jpeg"
  },
  {
    id: "welfare-3",
    code: "\u0995\u09B2\u09CD\u09AF\u09BE\u09A3 \u09E9",
    name: "\u0995\u09B2\u09CD\u09AF\u09BE\u09A3 \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0997",
    category: "welfare",
    price: 3500,
    dailyIncome: 750,
    cycleDays: 15,
    totalReturn: 11250,
    imagePath: "/assets/aistudio/80825423_605f44ca.jpg"
  }
];
var DEFAULT_CONFIG = {
  telegramLink: "https://t.me/FeedexDigitalOfficial",
  supportLink: "https://t.me/FeedexDigitalSupport",
  rechargeNumbers: {
    \u09AC\u09BF\u0995\u09BE\u09B6: "01700001122",
    \u09A8\u0997\u09A6: "01800003344",
    \u09B0\u0995\u09C7\u099F: "01900005566"
  },
  referralRates: {
    level1: 12,
    level2: 5,
    level3: 2
  },
  registrationBonus: 150,
  minDeposit: 300,
  minWithdraw: 100,
  autoApproveDeposit: false
};
var ADMIN_USERNAME = process.env.ADMIN_USERNAME || "feedexadmin";
var DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@7860";
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_PATH = path.join(DATA_DIR, "feedex_db.json");
var TOKEN_SECRET = process.env.SESSION_SECRET || "feedex-digital-partner-secret-2026";
function hashPassword(raw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(raw, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(raw, stored) {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const derived = crypto.scryptSync(raw, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  if (derived.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(derived, hashBuf);
}
function signToken(subject, role = "user") {
  const payload = Buffer.from(JSON.stringify({ uid: subject, role, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifyToken(token, expectedRole = "user") {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed.uid !== "string") return null;
    if ((parsed.role || "user") !== expectedRole) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}
function normalizePhone(raw) {
  let cleaned = raw.trim().replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+880")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("00880")) {
    cleaned = "0" + cleaned.slice(5);
  } else if (cleaned.startsWith("8801") && cleaned.length >= 13) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned.replace(/[^0-9]/g, "");
}
function createInitialDb() {
  return {
    version: STORE_VERSION,
    config: structuredClone(DEFAULT_CONFIG),
    plans: structuredClone(DEFAULT_PLANS),
    adminPasswordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    users: [],
    products: [],
    records: []
  };
}
function loadDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.version !== STORE_VERSION || !parsed.config || !Array.isArray(parsed.plans) || !Array.isArray(parsed.users) || !Array.isArray(parsed.products) || !Array.isArray(parsed.records)) {
      throw new Error("Schema upgrade needed");
    }
    parsed.config.autoApproveDeposit = false;
    return parsed;
  } catch {
    const initial = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}
function saveDb(db) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmpPath, DB_PATH);
}
function maskPhone(phone) {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}
function sanitizeUser(user) {
  return {
    id: user.id,
    memberId: user.memberId,
    phone: user.phone,
    inviteCode: user.inviteCode,
    referredBy: user.referredBy,
    balance: Number(user.balance.toFixed(2)),
    totalRecharge: Number(user.totalRecharge.toFixed(2)),
    totalWithdrawal: Number(user.totalWithdrawal.toFixed(2)),
    lastSpinDate: user.lastSpinDate,
    blocked: Boolean(user.blocked),
    multiAccountFlag: Boolean(user.multiAccountFlag),
    bankBinding: user.bankBinding ? {
      network: user.bankBinding.network,
      walletAddress: user.bankBinding.walletAddress,
      accountName: user.bankBinding.accountName,
      hasWithdrawPassword: Boolean(user.withdrawPasswordHash)
    } : user.withdrawPasswordHash ? {
      network: "\u09AC\u09BF\u0995\u09BE\u09B6",
      walletAddress: "",
      accountName: "",
      hasWithdrawPassword: true
    } : null,
    createdAt: user.createdAt
  };
}
function computeTeamOverview(db, userId) {
  const userAssetsMap = /* @__PURE__ */ new Map();
  for (const product of db.products) {
    if (product.status === "\u09B8\u0995\u09CD\u09B0\u09BF\u09DF") {
      userAssetsMap.set(product.userId, (userAssetsMap.get(product.userId) || 0) + product.price);
    }
  }
  const level1Users = db.users.filter((u) => u.referredBy === userId);
  const level1Ids = new Set(level1Users.map((u) => u.id));
  const level2Users = db.users.filter((u) => u.referredBy && level1Ids.has(u.referredBy));
  const level2Ids = new Set(level2Users.map((u) => u.id));
  const level3Users = db.users.filter((u) => u.referredBy && level2Ids.has(u.referredBy));
  const toSummary = (u, level) => ({
    id: u.id,
    memberId: u.memberId,
    phoneMasked: maskPhone(u.phone),
    level,
    rechargeTotal: Number(u.totalRecharge.toFixed(2)),
    assetsTotal: Number((userAssetsMap.get(u.id) || 0).toFixed(2)),
    joinedAt: u.createdAt
  });
  const l1 = level1Users.map((u) => toSummary(u, 1));
  const l2 = level2Users.map((u) => toSummary(u, 2));
  const l3 = level3Users.map((u) => toSummary(u, 3));
  const all = [...l1, ...l2, ...l3];
  return {
    teamRecharge: Number(all.reduce((acc, m) => acc + m.rechargeTotal, 0).toFixed(2)),
    teamAssets: Number(all.reduce((acc, m) => acc + m.assetsTotal, 0).toFixed(2)),
    teamNumber: all.length,
    levels: {
      1: l1,
      2: l2,
      3: l3
    }
  };
}
function creditReferralCommissions(db, sourceUser, baseAmount, reasonLabel, now) {
  const rates = [
    db.config.referralRates.level1 / 100,
    db.config.referralRates.level2 / 100,
    db.config.referralRates.level3 / 100
  ];
  let currentRefId = sourceUser.referredBy;
  for (let tier = 0; tier < 3 && currentRefId; tier++) {
    const upline = db.users.find((u) => u.id === currentRefId);
    if (!upline) break;
    const bonus = Number((baseAmount * rates[tier]).toFixed(2));
    if (bonus > 0) {
      upline.balance = Number((upline.balance + bonus).toFixed(2));
      db.records.unshift({
        id: `rec_${crypto.randomUUID().slice(0, 8)}`,
        userId: upline.id,
        type: "commission",
        title: `\u09B2\u09C7\u09AD\u09C7\u09B2-${tier + 1} \u09B0\u09C7\u09AB\u09BE\u09B0 \u0995\u09AE\u09BF\u09B6\u09A8 (${reasonLabel})`,
        amount: bonus,
        direction: "credit",
        status: "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8",
        reference: sourceUser.memberId,
        createdAt: now
      });
    }
    currentRefId = upline.referredBy;
  }
}
function getPublicPlansAndConfig() {
  const db = loadDb();
  return {
    plans: db.plans,
    config: db.config
  };
}
function registerUser(phone, password, inviteCode, deviceId) {
  const db = loadDb();
  const cleanPhone = normalizePhone(phone);
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    throw new Error("\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09A0\u09BF\u0995 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09A6\u09BF\u09A8\u0964");
  }
  if (password.length < 4) {
    throw new Error("\u09B2\u0997\u0987\u09A8 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EA \u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964");
  }
  if (db.users.some((u) => normalizePhone(u.phone) === cleanPhone)) {
    throw new Error(
      "\u09AE\u09BE\u09B2\u09CD\u099F\u09BF\u09AA\u09B2 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B8\u09A8\u09BE\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7! \u098F\u0987 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09A6\u09BF\u09DF\u09C7 \u0986\u0997\u09C7\u0987 \u09A8\u09BF\u09AC\u09A8\u09CD\u09A7\u09A8 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u098F\u0995\u099F\u09BF \u09A8\u09AE\u09CD\u09AC\u09B0 \u09A6\u09BF\u09DF\u09C7 \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u098F\u0995\u09AC\u09BE\u09B0\u0987 \u09A8\u09BF\u09AC\u09A8\u09CD\u09A7\u09A8 \u0995\u09B0\u09BE \u09AF\u09BE\u09AC\u09C7\u0964"
    );
  }
  let referrerId = null;
  if (inviteCode && inviteCode.trim()) {
    const normalized = inviteCode.trim().toUpperCase();
    const refUser = db.users.find((u) => u.inviteCode.toUpperCase() === normalized);
    if (!refUser) {
      throw new Error("\u09B0\u09C7\u09AB\u09BE\u09B0 \u0995\u09CB\u09A1\u099F\u09BF \u09B8\u09A0\u09BF\u0995 \u09A8\u09DF\u0964");
    }
    referrerId = refUser.id;
  }
  const cleanDeviceId = (deviceId || "").trim();
  let multiAccountFlag = false;
  if (cleanDeviceId) {
    const sameDeviceUsers = db.users.filter((u) => u.deviceId && u.deviceId === cleanDeviceId);
    if (sameDeviceUsers.length > 0) {
      multiAccountFlag = true;
      for (const existing of sameDeviceUsers) {
        existing.multiAccountFlag = true;
      }
    }
  }
  const randomDigits = String(Math.floor(1e8 + Math.random() * 899999999));
  const newUserId = `usr_${crypto.randomUUID().slice(0, 8)}`;
  const newInviteCode = `FDX${randomDigits.slice(-6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const welcomeBonus = Number(db.config.registrationBonus) || 150;
  const newUser = {
    id: newUserId,
    memberId: randomDigits,
    phone: cleanPhone,
    passwordHash: hashPassword(password),
    withdrawPasswordHash: null,
    inviteCode: newInviteCode,
    referredBy: referrerId,
    balance: welcomeBonus,
    totalRecharge: 0,
    totalWithdrawal: 0,
    lastSpinDate: null,
    blocked: false,
    deviceId: cleanDeviceId || void 0,
    multiAccountFlag,
    bankBinding: null,
    createdAt: now
  };
  db.users.push(newUser);
  db.records.unshift({
    id: `rec_${crypto.randomUUID().slice(0, 8)}`,
    userId: newUserId,
    type: "bonus",
    title: "\u09A8\u09A4\u09C1\u09A8 \u09A8\u09BF\u09AC\u09A8\u09CD\u09A7\u09A8 \u09AC\u09CB\u09A8\u09BE\u09B8",
    amount: welcomeBonus,
    direction: "credit",
    status: "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8",
    reference: `WELCOME-${welcomeBonus}`,
    createdAt: now
  });
  saveDb(db);
  return {
    token: signToken(newUser.id, "user"),
    payload: getDashboardForUser(newUser.id)
  };
}
function loginUser(phone, password) {
  const db = loadDb();
  const cleanPhone = normalizePhone(phone);
  const user = db.users.find((u) => normalizePhone(u.phone) === cleanPhone);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u0985\u09A5\u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09AD\u09C1\u09B2 \u09B9\u09DF\u09C7\u099B\u09C7\u0964");
  }
  if (user.blocked) {
    throw new Error("\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u099F\u09BF \u09B8\u09BE\u09AE\u09DF\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u09AC\u09A8\u09CD\u09A7 \u09B0\u09DF\u09C7\u099B\u09C7\u0964 \u09B8\u09BE\u09AA\u09CB\u09B0\u09CD\u099F\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8\u0964");
  }
  return {
    token: signToken(user.id, "user"),
    payload: getDashboardForUser(user.id)
  };
}
function getDashboardForUser(userId) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  }
  if (user.blocked) {
    throw new Error("\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u099F\u09BF \u09B8\u09CD\u09A5\u0997\u09BF\u09A4 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964");
  }
  const products = db.products.filter((p) => p.userId === userId).sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  const records = db.records.filter((r) => r.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    user: sanitizeUser(user),
    products,
    records,
    team: computeTeamOverview(db, userId)
  };
}
function purchasePlan(userId, planId) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (user.blocked) throw new Error("\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u099F\u09BF \u09B8\u09CD\u09A5\u0997\u09BF\u09A4 \u09B0\u09DF\u09C7\u099B\u09C7\u0964");
  if (user.totalRecharge <= 0) {
    throw new Error("\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0995\u09C7\u09A8\u09BE\u09B0 \u0986\u0997\u09C7 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F (\u09B0\u09BF\u099A\u09BE\u09B0\u09CD\u099C) \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09C1\u09A8\u0964 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u099B\u09BE\u09DC\u09BE \u0995\u09CB\u09A8\u09CB \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0995\u09C7\u09A8\u09BE \u09AF\u09BE\u09AC\u09C7 \u09A8\u09BE\u0964");
  }
  const plan = db.plans.find((p) => p.id === planId);
  if (!plan) throw new Error("\u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09BF\u09A4 \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8\u099F\u09BF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (user.balance < plan.price) {
    throw new Error(`\u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u0985\u09AA\u09B0\u09CD\u09AF\u09BE\u09AA\u09CD\u09A4\u0964 \u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8 \u09F3 ${plan.price.toFixed(0)}, \u0986\u09AA\u09A8\u09BE\u09B0 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09F3 ${user.balance.toFixed(0)}\u0964`);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  user.balance = Number((user.balance - plan.price).toFixed(2));
  const product = {
    id: `prd_${crypto.randomUUID().slice(0, 8)}`,
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
    status: "\u09B8\u0995\u09CD\u09B0\u09BF\u09DF"
  };
  db.products.unshift(product);
  db.records.unshift({
    id: `rec_${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    type: "purchase",
    title: `${plan.name} \u0995\u09CD\u09B0\u09DF \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7`,
    amount: plan.price,
    direction: "debit",
    status: "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8",
    reference: product.id.toUpperCase(),
    createdAt: now
  });
  creditReferralCommissions(db, user, plan.price, plan.code, now);
  saveDb(db);
  return getDashboardForUser(userId);
}
function claimProductIncome(userId, productId) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  const product = db.products.find((p) => p.id === productId && p.userId === userId);
  if (!product) throw new Error("\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8\u09C7\u09B0 \u09A4\u09A5\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (product.status === "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8" || product.claimedDays >= product.cycleDays) {
    throw new Error("\u098F\u0987 \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8\u09C7\u09B0 \u09B8\u09AC \u09AE\u09C7\u09DF\u09BE\u09A6\u09C7\u09B0 \u0986\u09DF \u09B8\u0982\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09BE \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09DF\u09C7\u099B\u09C7\u0964");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  product.claimedDays += 1;
  product.totalEarned = Number((product.totalEarned + product.dailyIncome).toFixed(2));
  product.lastClaimedAt = now;
  if (product.claimedDays >= product.cycleDays) {
    product.status = "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8";
  }
  user.balance = Number((user.balance + product.dailyIncome).toFixed(2));
  db.records.unshift({
    id: `rec_${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    type: "income",
    title: `${product.planName} \u09A6\u09C8\u09A8\u09BF\u0995 \u0986\u09DF (\u09A6\u09BF\u09A8 ${product.claimedDays}/${product.cycleDays})`,
    amount: product.dailyIncome,
    direction: "credit",
    status: "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8",
    reference: product.id.toUpperCase(),
    createdAt: now
  });
  saveDb(db);
  return getDashboardForUser(userId);
}
function processRecharge(userId, amount, method, txid) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (user.blocked) throw new Error("\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u099F\u09BF \u09B8\u09CD\u09A5\u0997\u09BF\u09A4 \u09B0\u09DF\u09C7\u099B\u09C7\u0964");
  if (method !== "\u09AC\u09BF\u0995\u09BE\u09B6" && method !== "\u09A8\u0997\u09A6" && method !== "\u09B0\u0995\u09C7\u099F") {
    throw new Error("\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AC\u09BF\u0995\u09BE\u09B6, \u09A8\u0997\u09A6 \u0985\u09A5\u09AC\u09BE \u09B0\u0995\u09C7\u099F \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8 \u0995\u09B0\u09C1\u09A8\u0964");
  }
  const cleanTxid = (txid || "").trim().replace(/\s+/g, "").toUpperCase();
  if (cleanTxid.length < 4) {
    throw new Error("\u09B8\u09C7\u09A8\u09CD\u09A1 \u09AE\u09BE\u09A8\u09BF \u0995\u09B0\u09BE\u09B0 \u09AA\u09B0 \u09B8\u09A0\u09BF\u0995 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09C7\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF (Transaction ID) \u09A6\u09BF\u09A8\u0964");
  }
  const duplicateTxid = db.records.some(
    (r) => r.type === "recharge" && (r.reference || "").trim().replace(/\s+/g, "").toUpperCase() === cleanTxid
  );
  if (duplicateTxid) {
    throw new Error(
      "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09C7\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF (Transaction ID) \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u098F\u0995\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09C7\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u09E8 \u09AC\u09BE\u09B0 \u09A6\u09C7\u0993\u09DF\u09BE \u09AF\u09BE\u09AC\u09C7 \u09A8\u09BE\u0964"
    );
  }
  const minDep = db.config.minDeposit || 300;
  if (!Number.isFinite(amount) || amount < minDep) {
    throw new Error(`\u09B8\u09B0\u09CD\u09AC\u09A8\u09BF\u09AE\u09CD\u09A8 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F (\u09B0\u09BF\u099A\u09BE\u09B0\u09CD\u099C) \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09F3 ${minDep}\u0964`);
  }
  if (amount > 5e5) {
    throw new Error("\u098F\u0995\u09AC\u09BE\u09B0\u09C7 \u09B8\u09B0\u09CD\u09AC\u09CB\u099A\u09CD\u099A \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09B8\u09C0\u09AE\u09BE \u09F3 \u09EB,\u09E6\u09E6,\u09E6\u09E6\u09E6\u0964");
  }
  const cleanAmount = Number(amount.toFixed(2));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.records.unshift({
    id: `rec_${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    type: "recharge",
    title: `${method} \u09B8\u09C7\u09A8\u09CD\u09A1 \u09AE\u09BE\u09A8\u09BF \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F`,
    amount: cleanAmount,
    direction: "credit",
    status: "\u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09AE\u09BE\u09A3",
    method,
    reference: cleanTxid,
    createdAt: now
  });
  saveDb(db);
  return getDashboardForUser(userId);
}
function processWithdrawal(userId, amount, withdrawPassword) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (user.blocked) throw new Error("\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u099F\u09BF \u09B8\u09CD\u09A5\u0997\u09BF\u09A4 \u09B0\u09DF\u09C7\u099B\u09C7\u0964");
  if (user.totalRecharge <= 0) {
    throw new Error("\u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8 \u0995\u09B0\u09BE\u09B0 \u0986\u0997\u09C7 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u098F\u0995\u09AC\u09BE\u09B0 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F (\u09B0\u09BF\u099A\u09BE\u09B0\u09CD\u099C) \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964");
  }
  if (!user.bankBinding || !user.bankBinding.walletAddress) {
    throw new Error('\u09AA\u09CD\u09B0\u09A5\u09AE\u09C7 "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u0993 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1" \u0985\u09AA\u09B6\u09A8 \u09A5\u09C7\u0995\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AC\u09BF\u0995\u09BE\u09B6, \u09A8\u0997\u09A6 \u09AC\u09BE \u09B0\u0995\u09C7\u099F \u09A8\u09AE\u09CD\u09AC\u09B0 \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C1\u09A8\u0964');
  }
  if (!user.withdrawPasswordHash) {
    throw new Error("\u09AA\u09CD\u09B0\u09A5\u09AE\u09C7 \u098F\u0995\u099F\u09BF \u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B8\u09C7\u099F \u0995\u09B0\u09C1\u09A8\u0964");
  }
  if (!verifyPassword(withdrawPassword, user.withdrawPasswordHash)) {
    throw new Error("\u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B8\u09A0\u09BF\u0995 \u09A8\u09DF\u0964");
  }
  const minWd = db.config.minWithdraw || 100;
  if (!Number.isFinite(amount) || amount < minWd) {
    throw new Error(`\u09B8\u09B0\u09CD\u09AC\u09A8\u09BF\u09AE\u09CD\u09A8 \u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09F3 ${minWd}\u0964`);
  }
  if (amount > user.balance) {
    throw new Error("\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u09AA\u09B0\u09CD\u09AF\u09BE\u09AA\u09CD\u09A4 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09A8\u09C7\u0987\u0964");
  }
  const cleanAmount = Number(amount.toFixed(2));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  user.balance = Number((user.balance - cleanAmount).toFixed(2));
  user.totalWithdrawal = Number((user.totalWithdrawal + cleanAmount).toFixed(2));
  db.records.unshift({
    id: `rec_${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    type: "withdrawal",
    title: `${user.bankBinding.network} \u09AE\u09BE\u09A7\u09CD\u09AF\u09AE\u09C7 \u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8`,
    amount: cleanAmount,
    direction: "debit",
    status: "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8",
    method: user.bankBinding.network,
    reference: user.bankBinding.walletAddress,
    createdAt: now
  });
  saveDb(db);
  return getDashboardForUser(userId);
}
function updateBankAndSecurity(userId, input) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (!input.walletAddress.trim() || input.walletAddress.trim().length < 6) {
    throw new Error("\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09A0\u09BF\u0995 \u09AC\u09BF\u0995\u09BE\u09B6, \u09A8\u0997\u09A6 \u09AC\u09BE \u09B0\u0995\u09C7\u099F \u09A8\u09AE\u09CD\u09AC\u09B0 \u09A6\u09BF\u09A8\u0964");
  }
  if (!input.accountName.trim()) {
    throw new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B9\u09CB\u09B2\u09CD\u09A1\u09BE\u09B0\u09C7\u09B0 \u09A8\u09BE\u09AE \u09B2\u09BF\u0996\u09C1\u09A8\u0964");
  }
  user.bankBinding = {
    network: input.network,
    walletAddress: input.walletAddress.trim(),
    accountName: input.accountName.trim()
  };
  if (input.withdrawPassword && input.withdrawPassword.trim().length > 0) {
    if (input.withdrawPassword.trim().length < 4) {
      throw new Error("\u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EA \u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964");
    }
    user.withdrawPasswordHash = hashPassword(input.withdrawPassword.trim());
  }
  if (input.newLoginPassword && input.newLoginPassword.trim().length > 0) {
    if (input.newLoginPassword.trim().length < 4) {
      throw new Error("\u09A8\u09A4\u09C1\u09A8 \u09B2\u0997\u0987\u09A8 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EA \u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964");
    }
    user.passwordHash = hashPassword(input.newLoginPassword.trim());
  }
  saveDb(db);
  return getDashboardForUser(userId);
}
function spinLuckyWheel(userId) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (user.lastSpinDate === today) {
    throw new Error("\u0986\u099C\u0995\u09C7\u09B0 \u09A6\u09C8\u09A8\u09BF\u0995 \u09B8\u09CD\u09AA\u09BF\u09A8 \u09AC\u09CB\u09A8\u09BE\u09B8 \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09B8\u0982\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0986\u0997\u09BE\u09AE\u09C0\u0995\u09BE\u09B2 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964");
  }
  const rewards = [10, 20, 30, 50, 75, 100];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  user.lastSpinDate = today;
  user.balance = Number((user.balance + reward).toFixed(2));
  db.records.unshift({
    id: `rec_${crypto.randomUUID().slice(0, 8)}`,
    userId: user.id,
    type: "bonus",
    title: "\u09A6\u09C8\u09A8\u09BF\u0995 \u09B2\u09BE\u0995\u09BF \u09B9\u09C1\u0987\u09B2 \u09AC\u09CB\u09A8\u09BE\u09B8",
    amount: reward,
    direction: "credit",
    status: "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8",
    reference: `SPIN-${today}`,
    createdAt: now
  });
  saveDb(db);
  return {
    reward,
    payload: getDashboardForUser(userId)
  };
}
function loginAdmin(username, password) {
  const db = loadDb();
  if (username.trim() !== ADMIN_USERNAME || !verifyPassword(password, db.adminPasswordHash)) {
    throw new Error("\u098F\u09A1\u09AE\u09BF\u09A8 \u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE \u0985\u09A5\u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09B8\u09A0\u09BF\u0995 \u09A8\u09DF\u0964");
  }
  return {
    token: signToken(ADMIN_USERNAME, "admin"),
    overview: getAdminOverview()
  };
}
function getAdminOverview() {
  const db = loadDb();
  const userById = new Map(db.users.map((u) => [u.id, u]));
  const pendingDeposits = db.records.filter((r) => r.type === "recharge" && r.status === "\u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09AE\u09BE\u09A3").map((r) => {
    const u = userById.get(r.userId);
    return {
      ...r,
      userPhone: u?.phone || "\u0985\u099C\u09BE\u09A8\u09BE",
      memberId: u?.memberId || "-"
    };
  });
  return {
    totalUsers: db.users.length,
    totalDeposits: Number(db.users.reduce((acc, u) => acc + u.totalRecharge, 0).toFixed(2)),
    totalWithdrawals: Number(db.users.reduce((acc, u) => acc + u.totalWithdrawal, 0).toFixed(2)),
    config: db.config,
    plans: db.plans,
    users: db.users.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(sanitizeUser),
    pendingDeposits
  };
}
function adminLookupUser(query) {
  const db = loadDb();
  const q = query.trim();
  if (!q) {
    throw new Error("\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u0986\u0987\u09A1\u09BF \u0985\u09A5\u09AC\u09BE \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09B2\u09BF\u0996\u09C1\u09A8\u0964");
  }
  const user = db.users.find(
    (u) => u.memberId === q || u.phone === q || u.inviteCode.toUpperCase() === q.toUpperCase() || u.phone.includes(q) || u.memberId.includes(q)
  );
  if (!user) {
    throw new Error(`"${q}" \u09A6\u09BF\u09DF\u09C7 \u0995\u09CB\u09A8\u09CB \u09B8\u09A6\u09B8\u09CD\u09AF \u0996\u09C1\u0981\u099C\u09C7 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964`);
  }
  return {
    user: sanitizeUser(user),
    products: db.products.filter((p) => p.userId === user.id),
    records: db.records.filter((r) => r.userId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    team: computeTeamOverview(db, user.id)
  };
}
function adminAdjustUserBalance(userId, operation, amount, note) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("\u09B8\u09A6\u09B8\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("\u09B8\u09A0\u09BF\u0995 \u099F\u09BE\u0995\u09BE\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09B2\u09BF\u0996\u09C1\u09A8\u0964");
  }
  const clean = Number(amount.toFixed(2));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (operation === "add") {
    user.balance = Number((user.balance + clean).toFixed(2));
    db.records.unshift({
      id: `rec_${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      type: "admin",
      title: note?.trim() || "\u098F\u09A1\u09AE\u09BF\u09A8 \u0995\u09B0\u09CD\u09A4\u09C3\u0995 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09CB\u0997",
      amount: clean,
      direction: "credit",
      status: "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8",
      reference: "ADMIN-ADD",
      createdAt: now
    });
  } else {
    if (user.balance < clean) {
      throw new Error(`\u09B8\u09A6\u09B8\u09CD\u09AF\u09C7\u09B0 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 (\u09F3 ${user.balance}) \u098F\u09B0 \u099A\u09C7\u09DF\u09C7 \u09AC\u09C7\u09B6\u09BF \u0995\u09BE\u099F\u09BE \u09AF\u09BE\u09AC\u09C7 \u09A8\u09BE\u0964`);
    }
    user.balance = Number((user.balance - clean).toFixed(2));
    db.records.unshift({
      id: `rec_${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      type: "admin",
      title: note?.trim() || "\u098F\u09A1\u09AE\u09BF\u09A8 \u0995\u09B0\u09CD\u09A4\u09C3\u0995 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u0995\u09B0\u09CD\u09A4\u09A8",
      amount: clean,
      direction: "debit",
      status: "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8",
      reference: "ADMIN-DEDUCT",
      createdAt: now
    });
  }
  saveDb(db);
  return adminLookupUser(user.memberId);
}
function adminToggleUserBlock(userId, blocked) {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("\u09B8\u09A6\u09B8\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  user.blocked = blocked;
  saveDb(db);
  return adminLookupUser(user.memberId);
}
function adminResolveDeposit(recordId, action) {
  const db = loadDb();
  const rec = db.records.find((r) => r.id === recordId && r.type === "recharge");
  if (!rec) throw new Error("\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09B0\u09C7\u0995\u09B0\u09CD\u09A1 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (rec.status !== "\u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09AE\u09BE\u09A3") {
    throw new Error("\u098F\u0987 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09DF\u09BE\u0995\u09B0\u09A3 \u09B9\u09DF\u09C7\u099B\u09C7\u0964");
  }
  const user = db.users.find((u) => u.id === rec.userId);
  if (!user) throw new Error("\u09B8\u09A6\u09B8\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (action === "approve") {
    rec.status = "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8";
    user.balance = Number((user.balance + rec.amount).toFixed(2));
    user.totalRecharge = Number((user.totalRecharge + rec.amount).toFixed(2));
    creditReferralCommissions(db, user, rec.amount, `${rec.method || ""} \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F`, (/* @__PURE__ */ new Date()).toISOString());
  } else {
    rec.status = "\u09AC\u09BE\u09A4\u09BF\u09B2";
  }
  saveDb(db);
  return getAdminOverview();
}
function adminUpdateConfig(partial) {
  const db = loadDb();
  if (typeof partial.telegramLink === "string" && partial.telegramLink.trim()) {
    db.config.telegramLink = partial.telegramLink.trim();
  }
  if (typeof partial.supportLink === "string" && partial.supportLink.trim()) {
    db.config.supportLink = partial.supportLink.trim();
  }
  if (partial.rechargeNumbers) {
    db.config.rechargeNumbers = {
      \u09AC\u09BF\u0995\u09BE\u09B6: partial.rechargeNumbers.\u09AC\u09BF\u0995\u09BE\u09B6?.trim() || db.config.rechargeNumbers.\u09AC\u09BF\u0995\u09BE\u09B6,
      \u09A8\u0997\u09A6: partial.rechargeNumbers.\u09A8\u0997\u09A6?.trim() || db.config.rechargeNumbers.\u09A8\u0997\u09A6,
      \u09B0\u0995\u09C7\u099F: partial.rechargeNumbers.\u09B0\u0995\u09C7\u099F?.trim() || db.config.rechargeNumbers.\u09B0\u0995\u09C7\u099F
    };
  }
  if (partial.referralRates) {
    db.config.referralRates = {
      level1: Number(partial.referralRates.level1) >= 0 ? Number(partial.referralRates.level1) : db.config.referralRates.level1,
      level2: Number(partial.referralRates.level2) >= 0 ? Number(partial.referralRates.level2) : db.config.referralRates.level2,
      level3: Number(partial.referralRates.level3) >= 0 ? Number(partial.referralRates.level3) : db.config.referralRates.level3
    };
  }
  if (typeof partial.registrationBonus === "number" && partial.registrationBonus >= 0) {
    db.config.registrationBonus = Number(partial.registrationBonus);
  }
  if (typeof partial.minDeposit === "number" && partial.minDeposit > 0) {
    db.config.minDeposit = Number(partial.minDeposit);
  }
  if (typeof partial.minWithdraw === "number" && partial.minWithdraw > 0) {
    db.config.minWithdraw = Number(partial.minWithdraw);
  }
  db.config.autoApproveDeposit = false;
  saveDb(db);
  return getAdminOverview();
}
function adminUpdatePlan(planId, updates) {
  const db = loadDb();
  const plan = db.plans.find((p) => p.id === planId);
  if (!plan) throw new Error("\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964");
  if (typeof updates.name === "string" && updates.name.trim()) {
    plan.name = updates.name.trim();
  }
  if (typeof updates.price === "number" && updates.price > 0) {
    plan.price = Number(updates.price);
  }
  if (typeof updates.dailyIncome === "number" && updates.dailyIncome > 0) {
    plan.dailyIncome = Number(updates.dailyIncome);
  }
  if (typeof updates.cycleDays === "number" && updates.cycleDays > 0) {
    plan.cycleDays = Math.round(updates.cycleDays);
  }
  if (typeof updates.totalReturn === "number" && updates.totalReturn > 0) {
    plan.totalReturn = Number(updates.totalReturn);
  } else {
    plan.totalReturn = Number((plan.dailyIncome * plan.cycleDays).toFixed(2));
  }
  saveDb(db);
  return getAdminOverview();
}
function adminChangePassword(newPassword) {
  const db = loadDb();
  if (!newPassword || newPassword.trim().length < 6) {
    throw new Error("\u09A8\u09A4\u09C1\u09A8 \u098F\u09A1\u09AE\u09BF\u09A8 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EC \u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964");
  }
  db.adminPasswordHash = hashPassword(newPassword.trim());
  saveDb(db);
}

// server.ts
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "\u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0986\u0997\u09C7 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
    return;
  }
  const token = header.slice(7).trim();
  const userId = verifyToken(token, "user");
  if (!userId) {
    res.status(401).json({ error: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09C7\u09B6\u09A8 \u09AE\u09C7\u09DF\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AA\u09C1\u09A8\u09B0\u09BE\u09DF \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
    return;
  }
  req.userId = userId;
  next();
}
function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "\u098F\u09A1\u09AE\u09BF\u09A8 \u0985\u09A5\u09C7\u09A8\u099F\u09BF\u0995\u09C7\u09B6\u09A8 \u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8\u0964" });
    return;
  }
  const token = header.slice(7).trim();
  const adminId = verifyToken(token, "admin");
  if (!adminId) {
    res.status(403).json({ error: "\u0985\u09A8\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09AA\u09CD\u09B0\u09AC\u09C7\u09B6! \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u098F\u09A1\u09AE\u09BF\u09A8 \u09AA\u09CD\u09B0\u09AC\u09C7\u09B6 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u09A8\u0964" });
    return;
  }
  next();
}
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "FeedexDigital" });
  });
  app.get("/api/plans", (_req, res) => {
    const data = getPublicPlansAndConfig();
    res.json(data);
  });
  app.post("/api/auth/register", (req, res) => {
    try {
      const { phone, password, inviteCode } = req.body;
      if (!phone || !password) {
        res.status(400).json({ error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u098F\u09AC\u0982 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09A6\u09C7\u0993\u09DF\u09BE \u0986\u09AC\u09B6\u09CD\u09AF\u0995\u0964" });
        return;
      }
      const deviceId = (typeof req.headers["x-client-id"] === "string" ? req.headers["x-client-id"] : "") || req.ip || "";
      const result = registerUser(phone, password, inviteCode, deviceId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09A8\u09BF\u09AC\u09A8\u09CD\u09A7\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/auth/login", (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        res.status(400).json({ error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u098F\u09AC\u0982 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09A6\u09C7\u0993\u09DF\u09BE \u0986\u09AC\u09B6\u09CD\u09AF\u0995\u0964" });
        return;
      }
      const result = loginUser(phone, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : "\u09B2\u0997\u0987\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.get("/api/me", requireAuth, (req, res) => {
    try {
      const payload = getDashboardForUser(req.userId);
      res.json({ payload });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964" });
    }
  });
  app.post("/api/products/buy", requireAuth, (req, res) => {
    try {
      const { planId } = req.body;
      if (!planId) {
        res.status(400).json({ error: "\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0986\u0987\u09A1\u09BF \u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8\u0964" });
        return;
      }
      const payload = purchasePlan(req.userId, planId);
      res.json({ payload });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0995\u09C7\u09A8\u09BE \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09DF\u09A8\u09BF\u0964" });
    }
  });
  app.post("/api/products/claim", requireAuth, (req, res) => {
    try {
      const { productId } = req.body;
      if (!productId) {
        res.status(400).json({ error: "\u09AA\u09A3\u09CD\u09AF \u0986\u0987\u09A1\u09BF \u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8\u0964" });
        return;
      }
      const payload = claimProductIncome(req.userId, productId);
      res.json({ payload });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09A6\u09C8\u09A8\u09BF\u0995 \u0986\u09DF \u09B8\u0982\u0997\u09CD\u09B0\u09B9 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/recharge", requireAuth, (req, res) => {
    try {
      const { amount, method, txid } = req.body;
      if (typeof amount !== "number" || !method || !txid) {
        res.status(400).json({ error: "\u099F\u09BE\u0995\u09BE\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3, \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AE\u09BE\u09A7\u09CD\u09AF\u09AE \u098F\u09AC\u0982 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09C7\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u09A6\u09BF\u09A8\u0964" });
        return;
      }
      const payload = processRecharge(req.userId, amount, method, txid);
      res.json({ payload });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/withdraw", requireAuth, (req, res) => {
    try {
      const { amount, withdrawPassword } = req.body;
      if (typeof amount !== "number" || !withdrawPassword) {
        res.status(400).json({ error: "\u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8\u09C7\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u098F\u09AC\u0982 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09A8\u0964" });
        return;
      }
      const payload = processWithdrawal(req.userId, amount, withdrawPassword);
      res.json({ payload });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u0989\u09A4\u09CD\u09A4\u09CB\u09B2\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/bank-card", requireAuth, (req, res) => {
    try {
      const { network, walletAddress, accountName, withdrawPassword, newLoginPassword } = req.body;
      if (!network || !walletAddress || !accountName) {
        res.status(400).json({ error: "\u09AE\u09BE\u09A7\u09CD\u09AF\u09AE, \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u098F\u09AC\u0982 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B9\u09CB\u09B2\u09CD\u09A1\u09BE\u09B0\u09C7\u09B0 \u09A8\u09BE\u09AE \u09A6\u09BF\u09A8\u0964" });
        return;
      }
      const payload = updateBankAndSecurity(req.userId, {
        network,
        walletAddress,
        accountName,
        withdrawPassword,
        newLoginPassword
      });
      res.json({ payload });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09A4\u09A5\u09CD\u09AF \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09A3 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/spin", requireAuth, (req, res) => {
    try {
      const result = spinLuckyWheel(req.userId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09B8\u09CD\u09AA\u09BF\u09A8 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09DF\u09A8\u09BF\u0964" });
    }
  });
  app.post("/api/admin/login", (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "\u098F\u09A1\u09AE\u09BF\u09A8 \u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE \u098F\u09AC\u0982 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09A8\u0964" });
        return;
      }
      const result = loginAdmin(username, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : "\u098F\u09A1\u09AE\u09BF\u09A8 \u09B2\u0997\u0987\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.get("/api/admin/overview", requireAdmin, (_req, res) => {
    res.json({ overview: getAdminOverview() });
  });
  app.get("/api/admin/user-lookup", requireAdmin, (req, res) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      const detail = adminLookupUser(query);
      res.json({ detail });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : "\u09B8\u09A6\u09B8\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964" });
    }
  });
  app.post("/api/admin/user-balance", requireAdmin, (req, res) => {
    try {
      const { userId, operation, amount, note } = req.body;
      if (!userId || operation !== "add" && operation !== "deduct" || typeof amount !== "number") {
        res.status(400).json({ error: "\u09B8\u09A6\u09B8\u09CD\u09AF, \u09A7\u09B0\u09A8 \u098F\u09AC\u0982 \u099F\u09BE\u0995\u09BE\u09B0 \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09B8\u09A0\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u09A6\u09BF\u09A8\u0964" });
        return;
      }
      const detail = adminAdjustUserBalance(userId, operation, amount, note);
      res.json({ detail, overview: getAdminOverview() });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/user-block", requireAdmin, (req, res) => {
    try {
      const { userId, blocked } = req.body;
      if (!userId || typeof blocked !== "boolean") {
        res.status(400).json({ error: "\u0985\u09AC\u09C8\u09A7 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7\u0964" });
        return;
      }
      const detail = adminToggleUserBlock(userId, blocked);
      res.json({ detail, overview: getAdminOverview() });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/deposit-resolve", requireAdmin, (req, res) => {
    try {
      const { recordId, action } = req.body;
      if (!recordId || action !== "approve" && action !== "reject") {
        res.status(400).json({ error: "\u0985\u09AC\u09C8\u09A7 \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u0985\u09A8\u09C1\u09B0\u09CB\u09A7\u0964" });
        return;
      }
      const overview = adminResolveDeposit(recordId, action);
      res.json({ overview });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09DF\u09BE\u0995\u09B0\u09A3 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/config", requireAdmin, (req, res) => {
    try {
      const overview = adminUpdateConfig(req.body);
      res.json({ overview });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09A3 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/plan", requireAdmin, (req, res) => {
    try {
      const { planId, name, price, dailyIncome, cycleDays, totalReturn } = req.body;
      if (!planId) {
        res.status(400).json({ error: "\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0986\u0987\u09A1\u09BF \u09AA\u09CD\u09B0\u09DF\u09CB\u099C\u09A8\u0964" });
        return;
      }
      const overview = adminUpdatePlan(planId, { name, price, dailyIncome, cycleDays, totalReturn });
      res.json({ overview });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u09A8 \u0986\u09AA\u09A1\u09C7\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7\u0964" });
    }
  });
  app.post("/api/admin/password", requireAdmin, (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword) {
        res.status(400).json({ error: "\u09A8\u09A4\u09C1\u09A8 \u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09A8\u0964" });
        return;
      }
      adminChangePassword(newPassword);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "\u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5\u0964" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path2.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path2.join(distDir, "index.html"));
    });
  }
  const port = Number(process.env.PORT || 3e3);
  app.listen(port, "0.0.0.0", () => {
    console.log(`FeedexDigital server listening on port ${port}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
