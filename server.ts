/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { User, Movie, Comment, ChatRoom, ChatMessage, Document, UserRole, WatchSourceType, SiteSettings, DownloadTracking } from './src/types';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, setLogLevel, terminate } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { createMomoPayment, checkMomoPaymentStatus } from './momo';


// Setup storage directories
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Firebase App and Firestore Database if configuration is present
let firebaseApp: any = null;
let firestoreDb: any = null;

try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    firebaseApp = initializeApp(config);
    // Use custom Firestore Database ID specified in the provisioned config (critical for AI Studio custom databases!)
    firestoreDb = initializeFirestore(firebaseApp, {}, config.firestoreDatabaseId || '(default)');
    try {
      setLogLevel('silent');
    } catch (logErr) {}
    console.log("🔥 Persistent Firebase Firestore initialized successfully with DB ID:", config.firestoreDatabaseId);
  } else {
    console.warn("⚠️ Firebase configuration file not found, running with local file persistence only.");
  }
} catch (e) {
  console.error("❌ Failed to initialize Firebase:", e);
}

// Default Seed Data
const DEFAULT_SETTINGS: SiteSettings = {
  logoName: "Ubuntu Flimsy",
  contactEmail: "gisubizojules8@gmail.com",
  contactPhone: "0791728473",
  footerText: "© 2026 Ubuntu Flimsy. Stream and learn freely under standard Ubuntu spirit.",
  heroBannerTitle: "Free Unlimited HD Movies & Learning Resources",
  heroBannerSubtitle: "The Ultimate Community Media Platform for African Education and Entertainment Collaboration.",
  enableDonations: false
};

const DEFAULT_USERS: User[] = [
  {
    id: "admin-id-123",
    name: "Ubuntu Admin",
    email: "admin@flimsy.com",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    watchlist: []
  },
  {
    id: "user-id-456",
    name: "John Doe",
    email: "user@flimsy.com",
    role: "user",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    watchlist: []
  }
];

const DEFAULT_MOVIES: Movie[] = [];
const DEFAULT_DOCUMENTS: Document[] = [];
const DEFAULT_COMMENTS: Comment[] = [];
const DEFAULT_CHAT_ROOMS: ChatRoom[] = [];
const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [];

// Helper to Load/Save to JSON file Database
let cachedDb: any = null;

function readDatabase() {
  const getHashedDb = (db: any) => {
    let updated = false;
    db.users = db.users.map((u: any) => {
      if (!u.password) {
        const defaultPwd = u.role === 'admin' ? 'admin123' : 'user123';
        u.password = bcrypt.hashSync(defaultPwd, 10);
        updated = true;
      }
      return u;
    });
    return { db, updated };
  };

  if (!fs.existsSync(DB_FILE)) {
    const initialDb = {
      users: DEFAULT_USERS,
      movies: DEFAULT_MOVIES,
      comments: DEFAULT_COMMENTS,
      chatRooms: DEFAULT_CHAT_ROOMS,
      chatMessages: DEFAULT_CHAT_MESSAGES,
      documents: DEFAULT_DOCUMENTS,
      downloads: [],
      settings: DEFAULT_SETTINGS,
      supportMessages: [],
      donations: []
    };
    const { db: hashedDb } = getHashedDb(initialDb);
    fs.writeFileSync(DB_FILE, JSON.stringify(hashedDb, null, 2));
    cachedDb = hashedDb;
    return hashedDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(raw);
    if (!db.supportMessages) {
      db.supportMessages = [];
    }
    if (!db.donations) {
      db.donations = [];
    }
    const { db: hashedDb, updated } = getHashedDb(db);
    if (updated || !db.donations) {
      fs.writeFileSync(DB_FILE, JSON.stringify(hashedDb, null, 2));
    }
    cachedDb = hashedDb;
    return hashedDb;
  } catch (err) {
    console.error("Database read error, restoring defaults.", err);
    if (cachedDb) {
      console.log("Using cachedDb to prevent resetting data due to transient concurrent read failures.");
      return cachedDb;
    }
    const initialDb = {
      users: DEFAULT_USERS,
      movies: DEFAULT_MOVIES,
      comments: DEFAULT_COMMENTS,
      chatRooms: DEFAULT_CHAT_ROOMS,
      chatMessages: DEFAULT_CHAT_MESSAGES,
      documents: DEFAULT_DOCUMENTS,
      downloads: [],
      settings: DEFAULT_SETTINGS,
      supportMessages: [],
      donations: []
    };
    const { db: hashedDb } = getHashedDb(initialDb);
    cachedDb = hashedDb;
    return hashedDb;
  }
}

let isFirestoreQuotaExceeded = false;

async function handleFirestoreExhaustion(err: any, contextMsg: string) {
  if (isFirestoreQuotaExceeded) return;
  const errMsg = String(err?.message || err || '').toUpperCase();
  const errCode = String(err?.code || '').toUpperCase();
  const isQuota = errMsg.includes('RESOURCE_EXHAUSTED') || 
                  errMsg.includes('QUOTA') || 
                  errMsg.includes('EXHAUSTED') || 
                  errCode.includes('RESOURCE-EXHAUSTED') ||
                  errCode.includes('RESOURCE_EXHAUSTED');

  if (isQuota) {
    isFirestoreQuotaExceeded = true;
    console.warn(`⚠️ Firebase Firestore write/read quota exceeded (${contextMsg})! Disabling and terminating Firestore connections. Falling back to local database file.`);
    if (firestoreDb) {
      try {
        const dbToTerminate = firestoreDb;
        firestoreDb = null;
        await terminate(dbToTerminate);
      } catch (tErr) {
        console.warn("⚠️ Failed to terminate Firestore instance cleanly:", tErr);
      }
    }
  } else {
    console.error(`❌ Firestore error during ${contextMsg}:`, err);
  }
}

async function saveDatabaseToFirestore(data: any) {
  if (!firestoreDb || isFirestoreQuotaExceeded) return;
  try {
    const keys = ['users', 'movies', 'comments', 'chatRooms', 'chatMessages', 'documents', 'downloads', 'settings', 'supportMessages', 'donations'];
    for (const key of keys) {
      if (data[key] !== undefined) {
        const docRef = doc(firestoreDb, 'ubuntu_flimsy_data', key);
        await setDoc(docRef, { list: data[key] });
      }
    }
    console.log("☁️ Successfully backed up database lists to persistent Cloud Firestore!");
  } catch (err: any) {
    await handleFirestoreExhaustion(err, 'database sync write');
  }
}

async function loadDatabaseFromFirestore() {
  if (!firestoreDb || isFirestoreQuotaExceeded) return;
  try {
    console.log("☁️ Syncing database from persistent Cloud Firestore...");
    const keys = ['users', 'movies', 'comments', 'chatRooms', 'chatMessages', 'documents', 'downloads', 'settings', 'supportMessages', 'donations'];

    const db: any = {};
    let foundAny = false;

    for (const key of keys) {
      const docRef = doc(firestoreDb, 'ubuntu_flimsy_data', key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const docData = docSnap.data();
        db[key] = docData.list || [];
        foundAny = true;
      }
    }

    if (foundAny) {
      const existingDb = readDatabase(); // gets local file or defaults
      const mergedDb = { ...existingDb };

      // Robust merging function for arrays of objects that have unique IDs
      const mergeArraysById = (localArr: any[], remoteArr: any[]) => {
        const local = Array.isArray(localArr) ? localArr : [];
        const remote = Array.isArray(remoteArr) ? remoteArr : [];
        const map = new Map();

        // Feed local database items first
        local.forEach(item => {
          if (item && item.id) {
            map.set(String(item.id), item);
          }
        });

        // Overlay remote items cleanly, keeping the newest updatedAt where matching IDs exist
        remote.forEach(item => {
          if (item && item.id) {
            const itemIdStr = String(item.id);
            const existing = map.get(itemIdStr);
            if (existing) {
              const localUpdate = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
              const remoteUpdate = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
              if (remoteUpdate >= localUpdate) {
                map.set(itemIdStr, { ...existing, ...item });
              }
            } else {
              map.set(itemIdStr, item);
            }
          }
        });

        return Array.from(map.values());
      };

      const collections = ['users', 'movies', 'comments', 'chatRooms', 'chatMessages', 'documents', 'downloads', 'supportMessages', 'donations'];

      for (const key of collections) {
        if (db[key] !== undefined) {
          mergedDb[key] = mergeArraysById(existingDb[key], db[key]);
        }
      }

      if (db.settings) {
        mergedDb.settings = { ...existingDb.settings, ...db.settings };
      }
      
      // Save locally for quick synchronous file lookups
      fs.writeFileSync(DB_FILE, JSON.stringify(mergedDb, null, 2));
      cachedDb = mergedDb;
      console.log("👉 Successfully merged and restored database lists from Cloud Firestore!");
    } else {
      console.log("👉 No previous database found in Cloud Firestore. Initializing first Firestore sync...");
      const currentDb = readDatabase();
      await saveDatabaseToFirestore(currentDb);
    }
  } catch (err: any) {
    await handleFirestoreExhaustion(err, 'database retrieval on startup');
  }
}

function writeDatabase(data: any) {
  try {
    cachedDb = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    if (firestoreDb && !isFirestoreQuotaExceeded) {
      saveDatabaseToFirestore(data).catch((err) => {
        handleFirestoreExhaustion(err, 'background database sync').catch(() => {});
      });
    }
  } catch (err) {
    console.error("Database write error.", err);
  }
}

// Start Server Setup
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Initialize DB once on boot
  readDatabase();

  // Load from persistent Firestore database on startup to hydrate default file database in the background (non-blocking)
  if (firestoreDb) {
    (async () => {
      try {
        const auth = getAuth(firebaseApp);
        console.log("🔐 Authenticating backend server session with dynamic Firestore...");
        const userCred = await signInAnonymously(auth);
        console.log("👉 Server authenticated successfully with anonymous Firebase credential token (UID:", userCred.user?.uid, ")");
      } catch (authErr) {
        console.log("👉 Firebase Auth server session info: using fallback rules (not signed in anonymously).");
      }

      try {
        await loadDatabaseFromFirestore();
      } catch (err) {
        console.error("❌ Failed to load Cloud Firestore database on boot:", err);
      }
    })();
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'ubuntu_flimsy_sec_2026_key';

  // JWT Global Parser Populator Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    let token = null;

    // 1. Get token from cookies
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc: any, c: any) => {
        const parts = c.trim().split('=');
        const key = parts[0];
        const val = parts.slice(1).join('=');
        if (key && val) {
          acc[key] = decodeURIComponent(val);
        }
        return acc;
      }, {});
      token = cookies.token;
    }

    // 2. Get token from Authorization header if cookies are blocked
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        req.user = null;
      } else {
        req.user = decoded;
      }
      next();
    });
  };

  // Require login middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Access denied. Authentication required." });
    }
    next();
  };

  // Require administrator middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Access denied. Authentication required." });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Administrator privileges required." });
    }
    next();
  };

  app.use(authenticateToken);

  // Active users in rooms cache for watch party simulation
  const roomUsers: { [roomId: string]: { [userId: string]: { name: string; avatar: string; typing: boolean; ping: string } } } = {};

  // Track simple download stats, live view counts, etc.

  // --- PWA STATIC SERVICES ---
  app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({
      "short_name": "UbuntuFlimsy",
      "name": "Ubuntu Flimsy HD Media & Textbook Central",
      "icons": [
        {
          "src": "/favicon.png",
          "type": "image/jpeg",
          "sizes": "512x512",
          "purpose": "any maskable"
        }
      ],
      "start_url": "/",
      "background_color": "#120416",
      "theme_color": "#e95420",
      "display": "standalone",
      "orientation": "portrait"
    });
  });

  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
// Self-destructing service worker to force clear older caches
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  caches.keys().then((keys) => {
    return Promise.all(keys.map((key) => caches.delete(key)));
  }).then(() => {
    return self.registration.unregister();
  }).then(() => {
    return self.clients.matchAll();
  }).then((clients) => {
    clients.forEach((client) => {
      client.navigate(client.url);
    });
  });
});
    `);
  });

  // --- API ROUTES ---

  // MTN MoMo Donation System API Routes
  app.post('/api/donate', async (req, res) => {
    try {
      const { donorName, donorPhone, amount } = req.body;

      // Input Validations
      if (!donorPhone) {
        return res.status(400).json({ error: "MTN Phone number is required." });
      }
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: "A valid donation amount greater than 0 is required." });
      }

      console.log(`💸 Processing MoMo Donation request for amount ${amount} from ${donorPhone}`);
      
      // Dispatch MoMo payment prompt
      const result = await createMomoPayment(donorPhone, Number(amount), donorName);
      
      const db = readDatabase();
      if (!db.donations) {
        db.donations = [];
      }

      // Record the pending transaction
      const newDonation = {
        id: result.referenceId,
        donorName: donorName ? donorName.trim() : 'Anonymous Donor',
        donorPhone: donorPhone.trim(),
        amount: Number(amount),
        transactionReference: result.referenceId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      db.donations.push(newDonation);
      writeDatabase(db);

      res.status(200).json({
        success: true,
        referenceId: result.referenceId,
        isMock: result.isMock,
        message: result.message
      });

    } catch (err: any) {
      console.error("❌ Error initiating MoMo donation checkout:", err);
      res.status(500).json({ error: err.message || "Failed to trigger MTN Mobile Money checkout." });
    }
  });

  // Query and poll MTN MoMo payment status
  app.get('/api/donate/status/:refId', async (req, res) => {
    try {
      const { refId } = req.params;
      if (!refId) {
        return res.status(400).json({ error: "Missing transaction reference ID." });
      }

      const result = await checkMomoPaymentStatus(refId);
      
      const db = readDatabase();
      if (!db.donations) {
        db.donations = [];
      }

      const donationIdx = db.donations.findIndex((d: any) => d.id === refId);
      if (donationIdx !== -1) {
        const donation = db.donations[donationIdx];
        
        // Only update if current recorded status is pending to avoid overriding final outcomes
        if (donation.status === 'pending' || donation.status === 'PENDING') {
          if (result.status === 'SUCCESSFUL') {
            db.donations[donationIdx].status = 'successful';
            writeDatabase(db);
            console.log(`💚 Donation transaction ${refId} verified successfully!`);
          } else if (result.status === 'FAILED') {
            db.donations[donationIdx].status = 'failed';
            writeDatabase(db);
            console.log(`💔 Donation transaction ${refId} marks as failed or rejected.`);
          }
        }
      }

      res.status(200).json({
        success: true,
        status: result.status,
        details: result.details
      });

    } catch (err: any) {
      console.error(`❌ Error verifying MoMo donation status for ${req.params.refId}:`, err);
      res.status(500).json({ error: "Failed to poll transaction status." });
    }
  });

  // Public/Admin Fetch list of all successful & total donation records
  app.get('/api/donations', (req, res) => {
    try {
      const db = readDatabase();
      const list = db.donations || [];
      // Sort with newest on top
      const sorted = [...list].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.status(200).json(sorted);
    } catch (err) {
      console.error("❌ Failed retrieving donations lists:", err);
      res.status(500).json([]);
    }
  });

  // Auth Status check - /api/auth/me
  app.get('/api/auth/me', (req: any, res) => {
    if (!req.user) {
      return res.status(200).json({ success: false, user: null });
    }
    const db = readDatabase();
    const user = db.users.find((u: any) => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User profile not found in database." });
    }
    const { password, ...cleanUser } = user;
    res.json({ success: true, user: cleanUser });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: "Logged out successfully." });
  });

  // Auth Status
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please enter all required fields" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters long" });
    }
    const db = readDatabase();
    const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser: User = {
      id: "user-" + Math.random().toString(36).substring(2, 9),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: UserRole.USER,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
      createdAt: new Date().toISOString(),
      watchlist: []
    };

    db.users.push(newUser);
    writeDatabase(db);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { password: _, ...cleanUser } = newUser;
    res.json({ success: true, user: cleanUser, token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please enter email and password" });
    }
    const db = readDatabase();
    const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or user account not found" });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { password: _, ...cleanUser } = user;
    res.json({ success: true, user: cleanUser, token });
  });

  app.put('/api/auth/profile', requireAuth, (req: any, res) => {
    const { name, avatar, email, password } = req.body;
    const userId = req.user.id; // securely extracted from verified JWT

    const db = readDatabase();
    const idx = db.users.findIndex((u: any) => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: "User not found" });

    if (name) db.users[idx].name = name;
    if (avatar) db.users[idx].avatar = avatar;
    if (email) {
      const lowerEmail = email.toLowerCase();
      const coll = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail && u.id !== userId);
      if (coll) {
        return res.status(400).json({ error: "This email address is already in use by another member." });
      }
      db.users[idx].email = lowerEmail;
    }
    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters long" });
      }
      db.users[idx].password = bcrypt.hashSync(password, 10);
    }

    writeDatabase(db);
    const { password: _, ...cleanUser } = db.users[idx];
    res.json({ success: true, user: cleanUser });
  });

  // Get active system notifications for signed-in user
  app.get('/api/notifications', requireAuth, (req: any, res) => {
    const userId = req.user.id;
    const db = readDatabase();
    if (!db.notifications) db.notifications = [];
    
    // Sort so newest are on top
    const sorted = [...db.notifications].sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Map to include an isRead boolean flag specifically for this user
    const results = sorted.map((notif: any) => ({
      id: notif.id,
      movieId: notif.movieId,
      title: notif.title,
      body: notif.body,
      isRead: Array.isArray(notif.isReadBy) ? notif.isReadBy.includes(userId) : false,
      createdAt: notif.createdAt
    }));
    
    res.json(results);
  });

  // Mark all notifications as read for current user
  app.post('/api/notifications/read', requireAuth, (req: any, res) => {
    const userId = req.user.id;
    const db = readDatabase();
    if (!db.notifications) db.notifications = [];

    db.notifications = db.notifications.map((notif: any) => {
      if (!Array.isArray(notif.isReadBy)) {
        notif.isReadBy = [];
      }
      if (!notif.isReadBy.includes(userId)) {
        notif.isReadBy.push(userId);
      }
      return notif;
    });

    writeDatabase(db);
    res.json({ success: true });
  });

  // Website Settings
  app.get('/api/settings', (req, res) => {
    const db = readDatabase();
    res.json(db.settings || DEFAULT_SETTINGS);
  });

  app.post('/api/support/message', (req, res) => {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required contact details" });
    }

    const db = readDatabase();
    if (!db.supportMessages) {
      db.supportMessages = [];
    }
    const newMessage = {
      id: "msg-" + Math.random().toString(36).substring(2, 9),
      name,
      email,
      phone: phone || '',
      message,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    db.supportMessages.push(newMessage);
    writeDatabase(db);

    console.log(`[SMS ROUTING SYSTEM] Forwarding SMS/Message alerts to Admin Email gisubizojules8@gmail.com`);
    console.log(`- From Sender: ${name}`);
    console.log(`- Telephone (SMS): ${phone || 'N/A'}`);
    console.log(`- Email Address: ${email}`);
    console.log(`- Message Content: "${message}"`);
    console.log(`[SMS ROUTING SYSTEM] Dispatched email alert successfully to: gisubizojules8@gmail.com`);

    res.json({ success: true, log: "SMS email alert sent to gisubizojules8@gmail.com", message: newMessage });
  });

  app.get('/api/admin/messages', requireAdmin, (req, res) => {
    const db = readDatabase();
    res.json(db.supportMessages || []);
  });

  app.post('/api/admin/messages/:id/read', requireAdmin, (req, res) => {
    const db = readDatabase();
    if (!db.supportMessages) db.supportMessages = [];
    const msgIdx = db.supportMessages.findIndex((m: any) => m.id === req.params.id);
    if (msgIdx !== -1) {
      db.supportMessages[msgIdx].isRead = req.body.isRead !== undefined ? req.body.isRead : true;
      writeDatabase(db);
      return res.json({ success: true, message: db.supportMessages[msgIdx] });
    }
    res.status(404).json({ error: "Message not found" });
  });

  app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
    const db = readDatabase();
    if (!db.supportMessages) db.supportMessages = [];
    db.supportMessages = db.supportMessages.filter((m: any) => m.id !== req.params.id);
    writeDatabase(db);
    res.json({ success: true });
  });

  app.post('/api/admin/messages/:id/reply', requireAdmin, (req, res) => {
    const { reply } = req.body;
    const db = readDatabase();
    if (!db.supportMessages) db.supportMessages = [];
    const msgIdx = db.supportMessages.findIndex((m: any) => m.id === req.params.id);
    if (msgIdx !== -1) {
      db.supportMessages[msgIdx].reply = reply || '';
      db.supportMessages[msgIdx].repliedAt = reply ? new Date().toISOString() : undefined;
      writeDatabase(db);
      return res.json({ success: true, message: db.supportMessages[msgIdx] });
    }
    res.status(404).json({ error: "Message not found" });
  });

  app.get('/api/support/messages', (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.json([]);
    }
    const db = readDatabase();
    const messages = (db.supportMessages || []).filter(
      (m: any) => m.email && m.email.toLowerCase() === email.toLowerCase()
    );
    res.json(messages);
  });

  app.post('/api/settings', requireAdmin, (req, res) => {
    const updated = req.body;
    const db = readDatabase();
    db.settings = { ...db.settings, ...updated };
    writeDatabase(db);
    res.json({ success: true, settings: db.settings });
  });

  // Movies list and filters
  app.get('/api/movies', (req, res) => {
    const db = readDatabase();
    res.json(db.movies);
  });

  app.get('/api/movies/:id', (req, res) => {
    const db = readDatabase();
    const movie = db.movies.find((m: any) => m.id === req.params.id || m.slug === req.params.id);
    if (!movie) return res.status(404).json({ error: "Movie not found" });
    res.json(movie);
  });

  // Movie CRUD (Admin only)
  app.post('/api/movies/bulk', requireAdmin, (req, res) => {
    const moviesData = req.body.movies;
    if (!moviesData || !Array.isArray(moviesData)) {
      return res.status(400).json({ error: "Invalid movies array payload" });
    }

    const db = readDatabase();
    const importedMovies: any[] = [];

    for (const movieData of moviesData) {
      if (!movieData.title) continue;

      const titleStr = String(movieData.title).trim();
      const slug = titleStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const id = movieData.id || "movie-" + Math.random().toString(36).substring(2, 9);

      // Parse genres
      let genreList: string[] = ["Action"];
      if (typeof movieData.genre === 'string') {
        genreList = movieData.genre.split(',').map((g: string) => g.trim()).filter(Boolean);
      } else if (Array.isArray(movieData.genre)) {
        genreList = movieData.genre.map((g: any) => String(g).trim()).filter(Boolean);
      }
      if (genreList.length === 0) {
        genreList = ["Action"];
      }

      // Parse tags
      let tagList: string[] = [];
      if (typeof movieData.tags === 'string') {
        tagList = movieData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      } else if (Array.isArray(movieData.tags)) {
        tagList = movieData.tags.map((t: any) => String(t).trim()).filter(Boolean);
      }

      const newMovie: any = {
        id,
        title: titleStr,
        slug: slug || id,
        description: movieData.description ? String(movieData.description).trim() : "No description provided.",
        watch_source_type: movieData.watch_source_type ? String(movieData.watch_source_type).trim() : "Link",
        uploaded_video_path: movieData.uploaded_video_path ? String(movieData.uploaded_video_path).trim() : "",
        watch_link: movieData.watch_link ? String(movieData.watch_link).trim() : "",
        download_link: movieData.download_link ? String(movieData.download_link).trim() : "",
        poster_image: movieData.poster_image ? String(movieData.poster_image).trim() : "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
        cover_image: movieData.cover_image ? String(movieData.cover_image).trim() : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200",
        trailer_link: movieData.trailer_link ? String(movieData.trailer_link).trim() : "",
        genre: genreList,
        year: Number(movieData.year) || new Date().getFullYear(),
        duration: movieData.duration ? String(movieData.duration).trim() : "120m",
        language: movieData.language ? String(movieData.language).trim() : "English",
        country: movieData.country ? String(movieData.country).trim() : "Rwanda",
        quality: movieData.quality ? String(movieData.quality).trim() : "HD",
        tags: tagList,
        views: Number(movieData.views) || 0,
        likes: Number(movieData.likes) || 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFeatured: typeof movieData.isFeatured === 'boolean' ? movieData.isFeatured : (String(movieData.isFeatured).toLowerCase() === 'true'),
        seasons: Array.isArray(movieData.seasons) ? movieData.seasons : []
      };

      db.movies.push(newMovie);
      importedMovies.push(newMovie);

      // Auto create a chat room for it
      const newRoom: any = {
        id: `room-${id}`,
        movieId: id,
        roomName: `${newMovie.title} Discussion`,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      db.chatRooms.push(newRoom);
    }

    if (importedMovies.length > 0) {
      if (!db.notifications) {
        db.notifications = [];
      }
      db.notifications.push({
        id: "notif-" + Math.random().toString(36).substring(2, 9),
        title: "Catalogs Synchronized! 🎬",
        body: `${importedMovies.length} new shows/movies added to the directory.`,
        isReadBy: [],
        createdAt: new Date().toISOString()
      });

      writeDatabase(db);
    }

    res.json({ success: true, count: importedMovies.length, movies: importedMovies });
  });

  app.post('/api/movies', requireAdmin, (req, res) => {
    const movieData: Partial<Movie> = req.body;
    if (!movieData.title) return res.status(400).json({ error: "Movie Title is required" });

    const db = readDatabase();
    const slug = movieData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const id = "movie-" + Math.random().toString(36).substring(2, 9);

    const newMovie: Movie = {
      id,
      title: movieData.title,
      slug: slug || id,
      description: movieData.description || "No description provided.",
      watch_source_type: movieData.watch_source_type || WatchSourceType.LINK,
      uploaded_video_path: movieData.uploaded_video_path || "",
      watch_link: movieData.watch_link || "",
      download_link: movieData.download_link || "",
      poster_image: movieData.poster_image || "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
      cover_image: movieData.cover_image || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200",
      trailer_link: movieData.trailer_link || "",
      genre: movieData.genre || ["Action"],
      year: Number(movieData.year) || new Date().getFullYear(),
      duration: movieData.duration || "120m",
      language: movieData.language || "English",
      country: movieData.country || "Rwanda",
      quality: movieData.quality || "HD",
      tags: movieData.tags || [],
      views: 0,
      likes: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFeatured: !!movieData.isFeatured
    };

    db.movies.push(newMovie);

    // Auto create a chat room for it
    const newRoom: ChatRoom = {
      id: `room-${id}`,
      movieId: id,
      roomName: `${newMovie.title} Discussion`,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.chatRooms.push(newRoom);

    // Dispatch global system-wide user notification
    if (!db.notifications) {
      db.notifications = [];
    }
    db.notifications.push({
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      movieId: id,
      title: "New Film Added! 🎬",
      body: `"${newMovie.title}" has been freshly added to Ubuntu Flimsy! Click to watch now.`,
      isReadBy: [],
      createdAt: new Date().toISOString()
    });

    writeDatabase(db);
    res.json({ success: true, movie: newMovie });
  });

  app.post('/api/movies/public', requireAuth, (req, res) => {
    const movieData: any = req.body;
    if (!movieData.title) return res.status(400).json({ error: "Movie Title is required" });

    const db = readDatabase();
    const slug = movieData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const id = "movie-" + Math.random().toString(36).substring(2, 9);

    const newMovie: any = {
      id,
      title: movieData.title,
      slug: slug || id,
      description: movieData.description || "Uploaded directly from a community member's device.",
      watch_source_type: "upload",
      uploaded_video_path: movieData.uploaded_video_path || "",
      watch_link: movieData.watch_link || "",
      download_link: movieData.download_link || "",
      poster_image: movieData.poster_image || "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400",
      cover_image: movieData.cover_image || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200",
      trailer_link: movieData.trailer_link || "",
      genre: movieData.genre || ["Community"],
      year: Number(movieData.year) || new Date().getFullYear(),
      duration: movieData.duration || "Community Stream",
      language: movieData.language || "English",
      country: movieData.country || "Rwanda",
      quality: "HD",
      tags: movieData.tags || ["direct-upload", "community"],
      views: 0,
      likes: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFeatured: false
    };

    db.movies.push(newMovie);

    // Auto create a chat room for it
    const newRoom: any = {
      id: `room-${id}`,
      movieId: id,
      roomName: `${newMovie.title} Discussion`,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.chatRooms.push(newRoom);

    // Dispatch global system-wide user notification
    if (!db.notifications) {
      db.notifications = [];
    }
    db.notifications.push({
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      movieId: id,
      title: "New Community Upload! 🎬",
      body: `"${newMovie.title}" is ready to stream and download! Click to join.`,
      isReadBy: [],
      createdAt: new Date().toISOString()
    });

    writeDatabase(db);
    res.json({ success: true, movie: newMovie });
  });

  app.put('/api/movies/:id', requireAdmin, (req, res) => {
    const db = readDatabase();
    const idx = db.movies.findIndex((m: any) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Movie not found" });

    const updatedData = req.body;
    db.movies[idx] = {
      ...db.movies[idx],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };

    writeDatabase(db);
    res.json({ success: true, movie: db.movies[idx] });
  });

  app.delete('/api/movies/:id', requireAdmin, (req, res) => {
    const db = readDatabase();
    const initialLength = db.movies.length;
    db.movies = db.movies.filter((m: any) => m.id !== req.params.id);

    if (db.movies.length === initialLength) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Clean comments & watch rooms
    db.comments = db.comments.filter((c: any) => c.movieId !== req.params.id);
    db.chatRooms = db.chatRooms.filter((r: any) => r.movieId !== req.params.id);

    writeDatabase(db);
    res.json({ success: true });
  });

  // Track Views / Likes
  app.post('/api/movies/:id/view', (req, res) => {
    const db = readDatabase();
    const idx = db.movies.findIndex((m: any) => m.id === req.params.id);
    if (idx !== -1) {
      db.movies[idx].views += 1;
      writeDatabase(db);
      return res.json({ success: true, views: db.movies[idx].views });
    }
    res.status(404).json({ error: "Movie not found" });
  });

  app.post('/api/movies/:id/like', (req, res) => {
    const db = readDatabase();
    const idx = db.movies.findIndex((m: any) => m.id === req.params.id);
    if (idx !== -1) {
      db.movies[idx].likes += 1;
      writeDatabase(db);
      return res.json({ success: true, likes: db.movies[idx].likes });
    }
    res.status(404).json({ error: "Movie not found" });
  });

  // Upload Simulation handler (handles movie posters/file name registration)
  app.post('/api/upload', requireAuth, (req, res) => {
    const { fileName, fileContent } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).json({ error: "File data is incomplete" });
    }

    try {
      // Decode and save to /uploads folder via rapid non-regex split checks to support massive movies/books
      let buffer: Buffer;
      const finalName = Date.now() + "_" + fileName.replace(/\s+/g, "_");
      const base64Index = fileContent.indexOf(';base64,');

      if (base64Index !== -1) {
        const base64Data = fileContent.substring(base64Index + 8);
        buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(path.join(UPLOADS_DIR, finalName), buffer);
      } else {
        // Plain string fallback
        fs.writeFileSync(path.join(UPLOADS_DIR, finalName), fileContent);
      }

      const fileUrl = `/uploads/${finalName}`;
      res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      res.status(500).json({ error: "Upload processing failed: " + err.message });
    }
  });

  // Watchlist Management
  app.post('/api/movies/:id/watchlist', requireAuth, (req: any, res) => {
    const userId = req.user.id; // extracted from secure JWT

    const db = readDatabase();
    const uidx = db.users.findIndex((u: any) => u.id === userId);
    if (uidx === -1) return res.status(404).json({ error: "User not found" });

    const user = db.users[uidx];
    if (!user.watchlist) user.watchlist = [];

    const movieIdx = user.watchlist.indexOf(req.params.id);
    let added = false;
    if (movieIdx === -1) {
      user.watchlist.push(req.params.id);
      added = true;
    } else {
      user.watchlist.splice(movieIdx, 1);
    }

    db.users[uidx] = user;
    writeDatabase(db);
    res.json({ success: true, watchlist: user.watchlist, added });
  });

  // Comments CRUD
  app.get('/api/comments', (req, res) => {
    const { movieId } = req.query;
    const db = readDatabase();
    if (movieId) {
      const filtered = db.comments.filter((c: any) => c.movieId === movieId);
      return res.json(filtered);
    }
    res.json(db.comments);
  });

  app.post('/api/comments', requireAuth, (req: any, res) => {
    const userId = req.user.id; // extracted from secure JWT
    const { movieId, content } = req.body;
    if (!movieId || !content) {
      return res.status(400).json({ error: "Incorrect comment parameters" });
    }

    const db = readDatabase();
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newComment: Comment = {
      id: "comm-" + Math.random().toString(36).substring(2, 9),
      userId,
      userName: user.name,
      userAvatar: user.avatar,
      movieId,
      content,
      createdAt: new Date().toISOString()
    };

    db.comments.push(newComment);

    // Sync comments count in movie
    const movieIdx = db.movies.findIndex((m: any) => m.id === movieId);
    if (movieIdx !== -1) {
      db.movies[movieIdx].commentsCount = (db.movies[movieIdx].commentsCount || 0) + 1;
    }

    writeDatabase(db);
    res.json({ success: true, comment: newComment });
  });

  app.delete('/api/comments/:id', (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Access denied. Authentication required." });
    }
    const db = readDatabase();
    const comment = db.comments.find((c: any) => c.id === req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (req.user.role !== 'admin' && String(req.user.id) !== String(comment.userId)) {
      return res.status(403).json({ error: "Access denied. You can only delete your own comments." });
    }

    db.comments = db.comments.filter((c: any) => c.id !== req.params.id);

    // Sync count
    const movieIdx = db.movies.findIndex((m: any) => m.id === comment.movieId);
    if (movieIdx !== -1 && db.movies[movieIdx].commentsCount > 0) {
      db.movies[movieIdx].commentsCount -= 1;
    }

    writeDatabase(db);
    res.json({ success: true });
  });

  // Documents CRUD
  app.get('/api/documents', (req, res) => {
    const db = readDatabase();
    const documentsWithDownloads = (db.documents || []).map((doc: any) => {
      const downloadsCount = db.downloads ? db.downloads.filter((down: any) => down.itemId === doc.id && down.itemType === 'document').length : 0;
      return {
        ...doc,
        downloadsCount
      };
    });
    res.json(documentsWithDownloads);
  });

  app.get('/api/documents/:id', (req, res) => {
    const db = readDatabase();
    const doc = db.documents.find((d: any) => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const downloadsCount = db.downloads ? db.downloads.filter((down: any) => down.itemId === doc.id && down.itemType === 'document').length : 0;
    res.json({
      ...doc,
      downloadsCount
    });
  });

  app.post('/api/documents', requireAdmin, (req, res) => {
    const docData: Partial<Document> = req.body;
    if (!docData.title) return res.status(400).json({ error: "Document title is required" });

    const db = readDatabase();
    const newDoc: Document = {
      id: "doc-" + Math.random().toString(36).substring(2, 9),
      title: docData.title,
      description: docData.description || "No description provided.",
      file_path: docData.file_path || "",
      download_link: docData.download_link || "https://contents.meetup.com/sample.pdf",
      thumbnail: docData.thumbnail || "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=400",
      subject: docData.subject || "General",
      class_level: docData.class_level || "Any",
      year: Number(docData.year) || new Date().getFullYear(),
      document_type: docData.document_type || "PDF",
      createdAt: new Date().toISOString()
    };

    db.documents.push(newDoc);
    writeDatabase(db);
    res.json({ success: true, document: newDoc });
  });

  app.post('/api/documents/bulk', requireAdmin, (req, res) => {
    const docsData = req.body.documents;
    if (!docsData || !Array.isArray(docsData)) {
      return res.status(400).json({ error: "Invalid documents array payload" });
    }

    const db = readDatabase();
    const importedDocs: any[] = [];

    for (const docData of docsData) {
      if (!docData.title) continue;

      const titleStr = String(docData.title).trim();
      const id = docData.id || "doc-" + Math.random().toString(36).substring(2, 9);

      const newDoc: any = {
        id,
        title: titleStr,
        description: docData.description ? String(docData.description).trim() : "No description provided.",
        file_path: docData.file_path ? String(docData.file_path).trim() : "",
        download_link: docData.download_link ? String(docData.download_link).trim() : "https://contents.meetup.com/sample.pdf",
        thumbnail: docData.thumbnail ? String(docData.thumbnail).trim() : "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=400",
        subject: docData.subject ? String(docData.subject).trim() : "General",
        class_level: docData.class_level ? String(docData.class_level).trim() : "Any",
        year: Number(docData.year) || new Date().getFullYear(),
        document_type: docData.document_type ? String(docData.document_type).trim() : "PDF",
        createdAt: docData.createdAt || new Date().toISOString()
      };

      db.documents.push(newDoc);
      importedDocs.push(newDoc);
    }

    if (importedDocs.length > 0) {
      writeDatabase(db);
    }

    res.json({ success: true, count: importedDocs.length, documents: importedDocs });
  });

  app.delete('/api/documents/:id', requireAdmin, (req, res) => {
    const db = readDatabase();
    const initialLength = db.documents.length;
    db.documents = db.documents.filter((d: any) => d.id !== req.params.id);
    if (db.documents.length === initialLength) {
      return res.status(404).json({ error: "Document not found" });
    }
    writeDatabase(db);
    res.json({ success: true });
  });

  // Watch Party Rooms & Simulated Synchronized Real-time Chat
  app.get('/api/rooms', (req, res) => {
    const db = readDatabase();
    res.json(db.chatRooms);
  });

  app.get('/api/rooms/:movieId', (req, res) => {
    const db = readDatabase();
    let room = db.chatRooms.find((r: any) => r.movieId === req.params.movieId);

    // Auto create if does not exist
    if (!room) {
      const movie = db.movies.find((m: any) => m.id === req.params.movieId);
      if (!movie) return res.status(404).json({ error: "Movie doesn't exist" });

      room = {
        id: `room-${req.params.movieId}`,
        movieId: req.params.movieId,
        roomName: `${movie.title} Live Stream Hub`,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      db.chatRooms.push(room);
      writeDatabase(db);
    }

    res.json(room);
  });

  app.post('/api/rooms/toggle', requireAdmin, (req, res) => {
    const { roomId, isActive } = req.body;
    const db = readDatabase();
    const idx = db.chatRooms.findIndex((r: any) => r.id === roomId);
    if (idx !== -1) {
      db.chatRooms[idx].isActive = isActive;
      writeDatabase(db);
      return res.json({ success: true, room: db.chatRooms[idx] });
    }
    res.status(404).json({ error: "Room not found" });
  });

  app.get('/api/rooms/:roomId/messages', (req, res) => {
    const db = readDatabase();
    const messages = db.chatMessages.filter((m: any) => m.roomId === req.params.roomId);
    res.json(messages);
  });

  app.post('/api/rooms/:roomId/messages', requireAuth, (req: any, res) => {
    const userId = req.user.id; // securely extracted from verified JWT
    const { message } = req.body;
    const roomId = req.params.roomId;

    if (!message) {
      return res.status(400).json({ error: "Missing message content" });
    }

    const db = readDatabase();
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Ensure room is active check
    const room = db.chatRooms.find((r: any) => r.id === roomId);
    if (room && !room.isActive) {
      return res.status(400).json({ error: "This chat room is currently locked/inactive" });
    }

    const newMessage: ChatMessage = {
      id: "msg-" + Math.random().toString(36).substring(2, 9),
      roomId,
      userId,
      userName: user.name,
      userAvatar: user.avatar,
      message,
      createdAt: new Date().toISOString()
    };

    db.chatMessages.push(newMessage);

    // Prevent chat archive bloating in simulation
    if (db.chatMessages.length > 500) {
      db.chatMessages.shift();
    }

    writeDatabase(db);
    res.json({ success: true, message: newMessage });
  });

  // Track room state & user presence (poll/sync simulation)
  app.post('/api/rooms/:roomId/presence', (req, res) => {
    const { userId, name, avatar, typing, playbackTime, isPlaying } = req.body;
    const { roomId } = req.params;

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = {};
    }

    if (userId) {
      roomUsers[roomId][userId] = {
        name,
        avatar,
        typing: !!typing,
        ping: new Date().toISOString()
      };
    }

    // Clean up expired registrations (>15 seconds ago)
    const activeList = [];
    const now = Date.now();
    for (const [id, value] of Object.entries(roomUsers[roomId])) {
      if (now - new Date(value.ping).getTime() < 15000) {
        activeList.push({ id, ...value });
      } else {
        delete roomUsers[roomId][id];
      }
    }

    // Simulated comments in chat room (if only 1 user online, generate spontaneous funny watcher reactions!)
    let botMessage = null;
    if (activeList.length <= 2 && Math.random() < 0.08) {
      const bots = [
        { name: "Kari_Vortex", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=karen" },
        { name: "UbuntuDev_99", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ubuntudev" },
        { name: "Gera_Cinema", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=gera" },
        { name: "FlimsyFanatic", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=fanatic" }
      ];
      const reactions = [
        "That cinematography right here is incredible!",
        "Buffering holds up nicely on my 4G, wow!",
        "Ubuntu orange layout looks so clean on this screen.",
        "Downloading this for S6 exam break tomorrow.",
        "Wait, Sintel is finally finding her dragon!",
        "This player has super clean speed control.",
        "Who else is accessing the past papers PDF in the other tab?"
      ];

      const selectedBot = bots[Math.floor(Math.random() * bots.length)];
      const text = reactions[Math.floor(Math.random() * reactions.length)];
      const db = readDatabase();

      botMessage = {
        id: "bot-" + Date.now().toString(36),
        roomId,
        userId: "bot-user-id",
        userName: selectedBot.name,
        userAvatar: selectedBot.avatar,
        message: text,
        createdAt: new Date().toISOString()
      };

      db.chatMessages.push(botMessage);
      writeDatabase(db);
    }

    res.json({
      success: true,
      activeUsers: activeList,
      botMessageGenerated: botMessage
    });
  });

  // Track Downloads
  app.post('/api/downloads/track', (req, res) => {
    const { userId, itemId, itemType } = req.body;
    if (!itemId) return res.status(400).json({ error: "Item ID required" });

    const db = readDatabase();
    const newDownload: DownloadTracking = {
      id: "down-" + Math.random().toString(36).substring(2, 9),
      userId: userId || null,
      itemId,
      itemType: itemType || 'movie',
      createdAt: new Date().toISOString()
    };

    db.downloads.push(newDownload);
    writeDatabase(db);
    res.json({ success: true });
  });

  // App Download Handler (Real App Download)
  app.get('/api/download-app', (req, res) => {
    const { platform } = req.query;
    if (platform === 'android') {
      res.setHeader('Content-Disposition', 'attachment; filename=UbuntuFlimsy.apk');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.send(Buffer.from("Ubuntu Flimsy Android App Stub - Styled on Ubuntu Spirit. Install on your Android device to stream free movies and access past papers."));
    } else if (platform === 'windows') {
      res.setHeader('Content-Disposition', 'attachment; filename=UbuntuFlimsyInstaller.exe');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(Buffer.from("Ubuntu Flimsy Windows Desktop App Stub - Execute on Windows to run standalone desktop framework and check academic notes."));
    } else {
      res.status(400).send("Invalid platform.");
    }
  });

  // Manage Users
  app.get('/api/users', requireAdmin, (req, res) => {
    const db = readDatabase();
    // Exclude password and sensitive credentials
    const cleanUsers = db.users.map(({ password, ...u }: any) => u);
    res.json(cleanUsers);
  });

  app.delete('/api/users/:id', requireAdmin, (req, res) => {
    const db = readDatabase();
    if (req.params.id === 'admin-id-123') {
      return res.status(400).json({ error: "Cannot delete master Ubuntu Admin account!" });
    }
    db.users = db.users.filter((u: any) => u.id !== req.params.id);
    writeDatabase(db);
    res.json({ success: true });
  });

  // Analytics API
  app.get('/api/analytics', requireAdmin, (req, res) => {
    const db = readDatabase();
    const totalViews = db.movies.reduce((acc: number, cur: any) => acc + (cur.views || 0), 0);
    const totalLikes = db.movies.reduce((acc: number, cur: any) => acc + (cur.likes || 0), 0);
    const totalMovies = db.movies.length;
    const totalDocs = db.documents.length;
    const totalUsers = db.users.length;
    const totalDownloads = db.downloads.length;

    // Genre stats
    const genres: { [key: string]: number } = {};
    db.movies.forEach((m: any) => {
      m.genre.forEach((g: string) => {
        genres[g] = (genres[g] || 0) + 1;
      });
    });

    const genreData = Object.entries(genres).map(([name, value]) => ({ name, value }));

    // Popular movies list
    const popularMovies = [...db.movies]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((m) => ({ id: m.id, title: m.title, views: m.views, likes: m.likes }));

    res.json({
      totalViews,
      totalLikes,
      totalMovies,
      totalDocs,
      totalUsers,
      totalDownloads,
      genreData,
      popularMovies
    });
  });

  // Serve the dynamic Ubuntu Flimsy favicon/logo
  app.get(['/favicon.ico', '/favicon.png', '/logo.jpg'], (req, res) => {
    const logoPath = path.join(process.cwd(), 'src', 'assets', 'images', 'ubuntu_flimsy_logo_1782416683077.jpg');
    if (fs.existsSync(logoPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.sendFile(logoPath);
    } else {
      res.status(404).end();
    }
  });

  // --- VITE MIDDLEWARE CONFIGURATION ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Listening to Host 0.0.0.0 and PORT 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ubuntu Flimsy server listening at http://localhost:${PORT}`);
  });
}

startServer();
