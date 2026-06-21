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

// Default Seed Data
const DEFAULT_SETTINGS: SiteSettings = {
  logoName: "Ubuntu Flimsy",
  contactEmail: "info@ubuntuflimsy.com",
  contactPhone: "+250 788 123 456",
  footerText: "© 2026 Ubuntu Flimsy. Stream and learn freely under standard Ubuntu spirit.",
  heroBannerTitle: "Free Unlimited HD Movies & Learning Resources",
  heroBannerSubtitle: "The Ultimate Community Media Platform for African Education and Entertainment Collaboration."
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
    watchlist: ["movie-sintel"]
  }
];

const DEFAULT_MOVIES: Movie[] = [
  {
    id: "movie-sintel",
    title: "Sintel",
    slug: "sintel",
    description: "Sintel is an independently produced computer animated film by the Blender Foundation. It tells the story of a girl named Sintel who rescues and forms a deep bond with a baby dragon.",
    watch_source_type: WatchSourceType.LINK,
    watch_link: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
    download_link: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
    poster_image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1200&auto=format&fit=crop&q=80",
    trailer_link: "https://www.youtube.com/watch?v=eRsGy_LQJlY",
    genre: ["Animation", "Adventure", "Drama"],
    year: 2022,
    duration: "14m",
    language: "English",
    country: "Netherlands",
    quality: "Full HD",
    tags: ["sintel", "blender", "dragon", "animated"],
    views: 1240,
    likes: 85,
    commentsCount: 2,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isFeatured: true
  },
  {
    id: "movie-tears",
    title: "Tears of Steel",
    slug: "tears-of-steel",
    description: "Set in a sci-fi fantasy future in Amsterdam, a group of scientists try to save the world from destructive giant robots using advanced holographic simulations and cyber technology.",
    watch_source_type: WatchSourceType.LINK,
    watch_link: "https://vjs.zencdn.net/v/oceans.mp4",
    download_link: "https://vjs.zencdn.net/v/oceans.mp4",
    poster_image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=1200&auto=format&fit=crop&q=80",
    trailer_link: "https://www.youtube.com/watch?v=R6MlUcmgny8",
    genre: ["Sci-Fi", "Action", "Thriller"],
    year: 2023,
    duration: "12m",
    language: "English",
    country: "Netherlands",
    quality: "4K",
    tags: ["cyberpunk", "robots", "future", "vfx"],
    views: 6512,
    likes: 412,
    commentsCount: 3,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isFeatured: true
  },
  {
    id: "movie-bunny",
    title: "Big Buck Bunny",
    slug: "big-buck-bunny",
    description: "A large, lovable rabbit awakens and is tormented by three annoying rodents. He decides to teach them a hilarious, action-packed lesson using creative forest traps.",
    watch_source_type: WatchSourceType.LINK,
    watch_link: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    download_link: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster_image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1501183007986-d0d080b147f9?w=1200&auto=format&fit=crop&q=80",
    trailer_link: "https://www.youtube.com/watch?v=VPG7K_zV8Zg",
    genre: ["Comedy", "Animation", "Family"],
    year: 2021,
    duration: "10m",
    language: "English",
    country: "United States",
    quality: "Full HD",
    tags: ["bunny", "funny", "cartoon", "comedy"],
    views: 9283,
    likes: 541,
    commentsCount: 1,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "movie-dreams",
    title: "Elephant's Dream",
    slug: "elephants-dream",
    description: "A surreal, dramatic journey of two men exploring a giant master machine with unexpected, mind-bending mechanical worlds and testing the limits of psychological sanity.",
    watch_source_type: WatchSourceType.LINK,
    watch_link: "https://html5demos.com/assets/dizzy.mp4",
    download_link: "https://html5demos.com/assets/dizzy.mp4",
    poster_image: "https://images.unsplash.com/photo-1478720143022-90574343d6c3?w=400&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    trailer_link: "https://www.youtube.com/watch?v=TLKA0jekYNo",
    genre: ["Drama", "Animation", "Sci-Fi"],
    year: 2020,
    duration: "11m",
    language: "English",
    country: "Rwanda",
    quality: "HD",
    tags: ["surreal", "steampunk", "mechanical", "drama"],
    views: 421,
    likes: 35,
    commentsCount: 0,
    createdAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    title: "Mathematics National Examination Past Paper",
    description: "Detailed Rwanda Education Board exam revision past paper with master solutions, questions, and revision guide for high school students in Advanced Level.",
    download_link: "https://contents.meetup.com/sample.pdf",
    thumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&auto=format&fit=crop&q=80",
    subject: "Mathematics",
    class_level: "Senior 6 (S6)",
    year: 2025,
    document_type: "Past Paper",
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "doc-2",
    title: "Introductory Python Programming & Logic Notes",
    description: "Comprehensive study booklet on data structures, algorithmic puzzles, conditionals, loops, and functional computer science concepts.",
    download_link: "https://contents.meetup.com/sample.pdf",
    thumbnail: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&auto=format&fit=crop&q=80",
    subject: "Computer Science",
    class_level: "Senior 5 (S5)",
    year: 2026,
    document_type: "Notes",
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "doc-3",
    title: "Physics Mechanics Principles Handout",
    description: "Official academic textbook dealing with Newton's laws of motion, gravitation, energy, work, power, and rotary systems.",
    download_link: "https://contents.meetup.com/sample.pdf",
    thumbnail: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=400&auto=format&fit=crop&q=80",
    subject: "Physics",
    class_level: "Senior 4 (S4)",
    year: 2024,
    document_type: "Book",
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
  }
];

const DEFAULT_COMMENTS: Comment[] = [
  {
    id: "comm-1",
    userId: "user-id-456",
    userName: "John Doe",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    movieId: "movie-sintel",
    content: "Absolutely spectacular animation details! The bond they portray in only 14 minutes is outstanding.",
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "comm-2",
    userId: "admin-id-123",
    userName: "Ubuntu Admin",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    movieId: "movie-sintel",
    content: "We host this Sintel movie specifically to showcase blender's strength. Stay tuned for more African & International cinema releases soon!",
    createdAt: new Date().toISOString()
  },
  {
    id: "comm-3",
    userId: "user-id-456",
    userName: "John Doe",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    movieId: "movie-tears",
    content: "This Netherlands VFX project is top tier! Incredible cyber robots on a budget.",
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_CHAT_ROOMS: ChatRoom[] = [
  {
    id: "room-sintel",
    movieId: "movie-sintel",
    roomName: "Sintel Watch Party",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "room-tears",
    movieId: "movie-tears",
    roomName: "Tears of Steel Live Scene Chat",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "room-bunny",
    movieId: "movie-bunny",
    roomName: "Big Buck Bunny Cinema Hub",
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    roomId: "room-sintel",
    userId: "user-id-456",
    userName: "John Doe",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    message: "Does anyone understand the scene at 5:00 minutes where Sintel walks through the blizzard?",
    createdAt: new Date(Date.now() - 600 * 1000).toISOString()
  },
  {
    id: "msg-2",
    roomId: "room-sintel",
    userId: "admin-id-123",
    userName: "Ubuntu Admin",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    message: "Yes! She is looking for the nesting spot of the dragons where the baby might have been taken.",
    createdAt: new Date(Date.now() - 300 * 1000).toISOString()
  }
];

// Helper to Load/Save to JSON file Database
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
      settings: DEFAULT_SETTINGS
    };
    const { db: hashedDb } = getHashedDb(initialDb);
    fs.writeFileSync(DB_FILE, JSON.stringify(hashedDb, null, 2));
    return hashedDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(raw);
    const { db: hashedDb, updated } = getHashedDb(db);
    if (updated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(hashedDb, null, 2));
    }
    return hashedDb;
  } catch (err) {
    console.error("Database read error, restoring defaults.", err);
    const initialDb = {
      users: DEFAULT_USERS,
      movies: DEFAULT_MOVIES,
      comments: DEFAULT_COMMENTS,
      chatRooms: DEFAULT_CHAT_ROOMS,
      chatMessages: DEFAULT_CHAT_MESSAGES,
      documents: DEFAULT_DOCUMENTS,
      downloads: [],
      settings: DEFAULT_SETTINGS
    };
    const { db: hashedDb } = getHashedDb(initialDb);
    return hashedDb;
  }
}

function writeDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
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
          "src": "https://api.dicebear.com/7.x/identicon/svg?seed=UbuntuFlimsy",
          "type": "image/svg+xml",
          "sizes": "192x192 512x512",
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
const CACHE_NAME = 'ubuntu-flimsy-cache-v2';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      }).catch(() => {})
    );
  }
});
    `);
  });

  // --- API ROUTES ---

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
  app.post('/api/upload', (req, res) => {
    const { fileName, fileContent, fileType } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).json({ error: "File data is incomplete" });
    }

    try {
      // Decode and save to /uploads folder
      const matches = fileContent.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let finalName = Date.now() + "_" + fileName.replace(/\s+/g, "_");

      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
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

  app.delete('/api/comments/:id', requireAdmin, (req, res) => {
    const db = readDatabase();
    const comment = db.comments.find((c: any) => c.id === req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

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
    res.json(db.documents);
  });

  app.get('/api/documents/:id', (req, res) => {
    const db = readDatabase();
    const doc = db.documents.find((d: any) => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
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
