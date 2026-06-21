/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import MovieCard from './components/MovieCard';
import DocumentCard from './components/DocumentCard';
import WatchParty from './components/WatchParty';
import AdminPanel from './components/AdminPanel';
import { Movie, Document, SiteSettings, UserRole } from './types';
import { Film, BookOpen, Star, Sparkles, LogOut, ArrowRight, BookMarked, ThumbsUp, Eye, Download, Info, Calendar, Mail, Phone, MapPin, Send, HelpCircle, Check, Loader, User, Heart, X, Smartphone } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // home, movies, movie-details, categories, search, trending, new-uploads, documents, document-details, about, contact, faq, login, register, profile, watchlist, admin-dashboard
  
  // Data State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    logoName: "Ubuntu Flimsy",
    contactEmail: "info@ubuntuflimsy.com",
    contactPhone: "+250 788 123 456",
    footerText: "© 2026 Ubuntu Flimsy. Stream and learn freely under standard Ubuntu spirit.",
    heroBannerTitle: "Free Unlimited HD Movies & Learning Resources",
    heroBannerSubtitle: "The Ultimate Community Media Platform for African Education and Entertainment Collaboration."
  });

  // UI State
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // PWA & Mobile Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  // Monitor client screen PWA install status
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsAppInstalled(true);
    }
    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsAppInstalled(false);
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Self register Service Worker support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice: any) => {
      if (choice.outcome === 'accepted') {
        setIsAppInstalled(true);
      }
      setDeferredPrompt(null);
    });
  };
  
  // Filtering & Sorting
  const [genreFilter, setGenreFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [qualityFilter, setQualityFilter] = useState('All');
  const [docSubjectFilter, setDocSubjectFilter] = useState('All');
  const [docLevelFilter, setDocLevelFilter] = useState('All');
  const [docTypeFilter, setDocTypeFilter] = useState('All');

  // Contact/Feedback form
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Auth States
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Profile Edit States
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Sync profile editing form when user state changes
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        password: ''
      });
    }
  }, [currentUser]);

  // Hydrate Data on Mount
  useEffect(() => {
    fetchMovies();
    fetchDocuments();
    fetchSettings();

    // Check secure session on backend
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('ubuntu-flimsy-user', JSON.stringify(data.user));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('ubuntu-flimsy-user');
        }
      })
      .catch(() => {
        // Fallback to local offline storage if development network is offline
        const storedUser = localStorage.getItem('ubuntu-flimsy-user');
        if (storedUser) {
          try {
            setCurrentUser(JSON.parse(storedUser));
          } catch (err) {
            localStorage.removeItem('ubuntu-flimsy-user');
          }
        }
      });
  }, []);

  const fetchMovies = () => {
    fetch('/api/movies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMovies(data);
      })
      .catch(console.error);
  };

  const fetchDocuments = () => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDocuments(data);
      })
      .catch(console.error);
  };

  const fetchSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.logoName) {
          setSiteSettings(prev => ({ ...prev, ...data }));
        }
      })
      .catch(console.error);
  };

  // State routers
  const handleNavigate = (view: string, id?: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (id) {
      if (view === 'movie-details') {
        const found = movies.find(m => m.id === id || m.slug === id);
        if (found) setSelectedMovie(found);
      } else if (view === 'document-details') {
        const found = documents.find(d => d.id === id);
        if (found) setSelectedDoc(found);
      }
    }
  };

  const handleUpdateSettings = (updated: SiteSettings) => {
    setSiteSettings(prev => ({ ...prev, ...updated }));
  };

  // Track academic resource downloads
  const handleTrackDownload = (itemId: string, itemType: string) => {
    fetch('/api/downloads/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser?.id || null,
        itemId,
        itemType
      })
    }).catch(() => {});
  };

  // Auth execution
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authForm.email, password: authForm.password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
          localStorage.setItem('ubuntu-flimsy-user', JSON.stringify(data.user));
          setAuthForm({ name: '', email: '', password: '' });
          handleNavigate('home');
        } else {
          setAuthError(data.error || 'Invalid credentials');
        }
      })
      .catch(() => setAuthError('Failed to speak to login database.'));
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authForm.name || !authForm.email || !authForm.password) {
      setAuthError('All fields must be completed.');
      return;
    }

    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
          localStorage.setItem('ubuntu-flimsy-user', JSON.stringify(data.user));
          setAuthForm({ name: '', email: '', password: '' });
          handleNavigate('home');
        } else {
          setAuthError(data.error || 'Server registration failure');
        }
      })
      .catch(() => setAuthError('Database response timed out.'));
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .finally(() => {
        setCurrentUser(null);
        localStorage.removeItem('ubuntu-flimsy-user');
        handleNavigate('home');
      });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setContactForm({ name: '', email: '', message: '' });
    }, 4000);
  };

  // Simple Avatar list selection
  const handleAvatarChange = (avatarUrl: string) => {
    if (!currentUser) return;
    fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: avatarUrl })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
          localStorage.setItem('ubuntu-flimsy-user', JSON.stringify(data.user));
        }
      });
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSubmitting(true);

    fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: profileForm.name,
        email: profileForm.email,
        password: profileForm.password || undefined
      })
    })
      .then(res => res.json())
      .then(data => {
        setProfileSubmitting(false);
        if (data.success) {
          setCurrentUser(data.user);
          localStorage.setItem('ubuntu-flimsy-user', JSON.stringify(data.user));
          setProfileSuccess('Account credentials updated successfully!');
          setProfileForm(prev => ({ ...prev, password: '' }));
        } else {
          setProfileError(data.error || 'Failed to update account.');
        }
      })
      .catch(() => {
        setProfileSubmitting(false);
        setProfileError('Failed to communicate with profile database.');
      });
  };

  // Movie collections
  const featuredMovie = movies.find(m => m.isFeatured) || movies[0];
  const trendingMovies = [...movies].sort((a,b) => b.views - a.views).slice(0, 4);
  const latestMovies = [...movies].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
  const latestDocs = [...documents].slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a020b]/98 text-[#f1f1f1] antialiased" id="ubuntu-flimsy-app">
      {/* Header component */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSearch={(query) => {
          setSearchQuery(query);
          handleNavigate('search');
        }}
        siteName={siteSettings.logoName}
      />

      {/* Main Viewport Routing Canvas */}
      <main className="flex-grow">
        
        {/* Device PWA Installation Notification Banner */}
        {!isAppInstalled && showInstallBanner && (
          <div className="bg-gradient-to-r from-[#e95420] via-[#77216f] to-[#2c0020] border-b border-[#dd4814]/30 px-4 py-3.5 text-white flex flex-col md:flex-row items-center justify-between text-xs font-mono select-none shadow-xl gap-3">
            <span className="flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse flex-shrink-0" />
              <div className="text-left font-sans">
                <p className="font-bold text-white leading-tight">Install Ubuntu Flimsy App on Your Device! 📱</p>
                <p className="text-[11px] text-gray-200 mt-0.5">Stream faster with zero browser bar clutter. Supports Android APK launchers, tablet panels, and Windows PCs.</p>
              </div>
            </span>
            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={deferredPrompt ? handleInstallClick : () => handleNavigate('downloads')}
                className="px-4 py-1.5 bg-white text-gray-900 rounded-full font-sans font-bold hover:bg-gray-100 transition shadow-md flex items-center space-x-1 flex-shrink-0 text-[11px]"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#e95420]" />
                <span>{deferredPrompt ? 'Direct Install Now' : 'Show Installation Guides'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowInstallBanner(false)}
                className="p-1 text-white hover:text-gray-300 transition"
                title="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* VIEW 1: HOME PAGE */}
        {currentView === 'home' && (
          <div className="space-y-12 pb-16" id="home-view-canvas">
            {/* Spotlight Banner Featured Hero */}
            {featuredMovie && (
              <div className="relative h-[480px] w-full overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${featuredMovie.cover_image})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a020b] via-[#0a020b]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a020b] via-[#0a020b]/10 to-transparent" />
                
                <div className="absolute bottom-10 left-4 sm:left-12 max-w-2xl text-left space-y-4">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#e95420] text-white tracking-widest uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Featured Spotlight</span>
                  </span>
                  
                  <h1 className="font-ubuntu text-3.5xl sm:text-5xl font-black text-white leading-tight drop-shadow-md">
                    {featuredMovie.title}
                  </h1>
                  
                  <p className="text-gray-200 text-sm md:text-base leading-relaxed drop-shadow">
                    {featuredMovie.description}
                  </p>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleNavigate('movie-details', featuredMovie.id)}
                      className="px-6 py-3 bg-[#e95420] hover:bg-[#ff6c3a] text-white font-bold rounded-full flex items-center space-x-2 shadow-lg transition transform hover:scale-105"
                      id="hero-play-btn"
                    >
                      <Film className="w-5 h-5 fill-current" />
                      <span>Stream Free Now</span>
                    </button>
                    
                    <button
                      onClick={() => handleNavigate('movies')}
                      className="px-5 py-3 bg-black/40 hover:bg-black/60 border border-white/20 text-white rounded-full font-semibold transition"
                      id="hero-explore-btn"
                    >
                      Browse Catalog
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Greeting Introduction Text */}
            <div className="max-w-7xl mx-auto px-4 text-center space-y-3 pt-6">
              <h1 className="text-xl sm:text-3xl font-black tracking-tight font-ubuntu">
                {siteSettings.heroBannerTitle}
              </h1>
              <p className="text-sm text-[#aea79f] max-w-3xl mx-auto leading-relaxed">
                {siteSettings.heroBannerSubtitle}
              </p>

              {/* Public Access guest assurance notice */}
              <div className="inline-flex flex-wrap items-center justify-center gap-3 bg-[#1e0724] border border-[#ff6c3a]/25 rounded-xl px-5 py-3 max-w-2xl mx-auto mt-4 text-left">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#ff6c3a]/15 border border-[#ff6c3a]/30">
                  <Check className="w-4 h-4 text-[#ff6c3a]" />
                </span>
                <div className="text-xs">
                  <strong className="text-white block font-ubuntu">Public Access Enabled</strong>
                  <span className="text-[#aea79f]">You can stream and download movies, academic past papers, and student textbooks with <span className="text-[#ff6c3a] font-semibold">no login, accounts, or payment required</span>.</span>
                </div>
              </div>
            </div>

            {/* QUICK GENRE SELECTORS */}
            <div className="max-w-7xl mx-auto px-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#e95420] font-mono mb-3">Popular Cinema Genres</h3>
              <div className="flex flex-wrap gap-2.5">
                {['Action', 'Comedy', 'Sci-Fi', 'Drama', 'Animation', 'African movies', 'Rwandan movies'].map((genre) => (
                  <button
                    key={genre}
                    onClick={() => {
                      setGenreFilter(genre);
                      handleNavigate('movies');
                    }}
                    className="px-4 py-1.5 bg-[#200527] border border-[#3f0f4a]/40 text-xs font-semibold rounded-full hover:bg-[#e95420] hover:text-white transition"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* VIEW SECTIONS - TRENDING & LATEST */}
            <div className="max-w-7xl mx-auto px-4 space-y-12 text-left">
              
              {/* TRENDING SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#2d0f36]">
                  <h3 className="font-ubuntu text-lg font-bold text-white flex items-center space-x-2">
                    <Star className="w-5 h-5 text-orange-400 fill-current" />
                    <span>Trending Watchlist Streams</span>
                  </h3>
                  <button onClick={() => handleNavigate('trending')} className="text-xs text-[#e95420] hover:underline flex items-center space-x-1 font-mono">
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {trendingMovies.map((m) => (
                    <MovieCard key={m.id} movie={m} onClick={() => handleNavigate('movie-details', m.id)} />
                  ))}
                </div>
              </div>

              {/* NEW RELEASES */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[#2d0f36]">
                  <h3 className="font-ubuntu text-lg font-bold text-white flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-[#e95420]" />
                    <span>New Upload Additions</span>
                  </h3>
                  <button onClick={() => handleNavigate('new-uploads')} className="text-xs text-[#e95420] hover:underline flex items-center space-x-1 font-mono">
                    <span>Explore New</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {latestMovies.map((m) => (
                    <MovieCard key={m.id} movie={m} onClick={() => handleNavigate('movie-details', m.id)} />
                  ))}
                </div>
              </div>

              {/* LATEST STUDY BOOKLETS SUMMARY */}
              <div className="space-y-4 bg-[#140417] p-6 rounded-2xl border border-[#2b0e35]">
                <div className="flex justify-between items-center pb-2 border-b border-[#300e39]">
                  <div>
                    <h3 className="font-ubuntu text-lg font-bold text-white flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-[#e95420]" />
                      <span>Academic Resources & Past Papers</span>
                    </h3>
                    <p className="text-xs text-[#aea79f] font-sans mt-1">Get free downloadable notes, class work revision exams, and syllabus handouts.</p>
                  </div>
                  <button onClick={() => handleNavigate('documents')} className="text-xs text-[#e95420] hover:underline flex items-center space-x-1 font-mono">
                    <span>Enter Library Desk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
                  {latestDocs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onClick={() => handleNavigate('document-details', doc.id)}
                      onDownload={() => {
                        handleTrackDownload(doc.id, 'document');
                        window.open(doc.download_link, '_blank');
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* MEMBERS CALL TO ACTION */}
              {!currentUser && (
                <div className="bg-gradient-to-br from-[#2c0020] to-[#77216f]/30 p-8 rounded-2xl border border-[#77216f]/40 text-center space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold font-ubuntu text-white">Join the Ubuntu Watch Community (Optional)</h3>
                  <div className="inline-block bg-[#e95420]/20 border border-[#e95420]/40 text-white text-xs px-3.5 py-1 rounded-full font-mono font-medium">
                    ✨ Free Streaming & Downloads are active for ALL visitors without logging in!
                  </div>
                  <p className="text-sm text-gray-200 max-w-xl mx-auto leading-relaxed">
                    While registration is completely optional for streaming and downloading resources, registered Flimsy members can sync bookmarks, track their personal watch histories, and converse side-by-side in real-time with other fellow students in watches.
                  </p>
                  <button
                    onClick={() => handleNavigate('register')}
                    className="px-6 py-2.5 bg-[#e95420] hover:bg-[#ff6936] text-white font-bold rounded-full shadow-lg transition"
                  >
                    Create Free Account now
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* VIEW 2: MOVIES PAGE */}
        {currentView === 'movies' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left" id="movies-catalog-view">
            <h1 className="text-2xl font-bold font-ubuntu text-white mb-2">Cinema Streams & Trailers Catalog</h1>
            <p className="text-xs text-[#aea79f] font-mono mb-6">Filter through different publication years, quality formats, and african categories.</p>

            {/* Quick Toolbar Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-[#130517] border border-[#2b0c36] p-4 rounded-xl">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#aea79f] uppercase">Filter by Genre</label>
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="w-full bg-[#200527] text-white text-xs px-3.5 py-2.5 rounded-lg border border-[#3d0f47] outline-none"
                >
                  <option value="All">All Genres</option>
                  <option value="Action">Action</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Drama">Drama</option>
                  <option value="Animation">Animation</option>
                  <option value="African movies">African Cinema</option>
                  <option value="Rwandan movies">Rwandan Cinema</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#aea79f] uppercase mb-1 block">Release Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full bg-[#200527] text-white text-xs px-3.5 py-2.5 rounded-lg border border-[#3d0f47] outline-none"
                >
                  <option value="All">All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                  <option value="2020">2020</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#aea79f] uppercase mb-1 block">Video Quality</label>
                <select
                  value={qualityFilter}
                  onChange={(e) => setQualityFilter(e.target.value)}
                  className="w-full bg-[#200527] text-white text-xs px-3.5 py-2.5 rounded-lg border border-[#3d0f47] outline-none"
                >
                  <option value="All">All Formats</option>
                  <option value="HD">HD</option>
                  <option value="Full HD">Full HD</option>
                  <option value="4K">4K</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setGenreFilter('All');
                    setYearFilter('All');
                    setQualityFilter('All');
                  }}
                  className="w-full py-2.5 bg-[#250a2e] hover:bg-[#3d0d4b] text-gray-300 text-xs font-semibold rounded-lg transition"
                >
                  Reset Active Filters
                </button>
              </div>
            </div>

            {/* Grid list results */}
            {movies.filter(m => {
              const matchesGenre = genreFilter === 'All' || m.genre.includes(genreFilter);
              const matchesYear = yearFilter === 'All' || m.year.toString() === yearFilter;
              const matchesQuality = qualityFilter === 'All' || m.quality === qualityFilter;
              return matchesGenre && matchesYear && matchesQuality;
            }).length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <Film className="w-12 h-12 text-[#310c3b] mx-auto" />
                <h3 className="text-base font-ubuntu font-bold text-white">No movie listings matched those tags.</h3>
                <p className="text-xs text-[#aea79f]">Try resetting active filters to browse full catalogs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {movies.filter(m => {
                  const matchesGenre = genreFilter === 'All' || m.genre.includes(genreFilter);
                  const matchesYear = yearFilter === 'All' || m.year.toString() === yearFilter;
                  const matchesQuality = qualityFilter === 'All' || m.quality === qualityFilter;
                  return matchesGenre && matchesYear && matchesQuality;
                }).map((m) => (
                  <MovieCard key={m.id} movie={m} onClick={() => handleNavigate('movie-details', m.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SINGLE MOVIE DETAIL WATCHPLAYER Party chat */}
        {currentView === 'movie-details' && selectedMovie && (
          <WatchParty
            movie={selectedMovie}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onTrackDownload={handleTrackDownload}
          />
        )}

        {/* VIEW 4: CATEGORIES PAGE */}
        {currentView === 'categories' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left" id="categories-browser-view">
            <h1 className="text-2xl font-bold font-ubuntu text-white mb-2">Explore Cinema Genres Categories</h1>
            <p className="text-xs text-[#aea79f] font-mono mb-8">Ubuntu Flimsy catalogues movies and educational clips by subject and cinematic types.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: 'Action', count: movies.filter(m => m.genre.includes('Action')).length, color: 'from-orange-600/30 to-[#77216f]/40' },
                { name: 'Romance', count: movies.filter(m => m.genre.includes('Romance')).length, color: 'from-pink-600/30 to-[#77216f]/40' },
                { name: 'Comedy', count: movies.filter(m => m.genre.includes('Comedy')).length, color: 'from-amber-600/30 to-[#77216f]/40' },
                { name: 'Horror', count: movies.filter(m => m.genre.includes('Horror')).length, color: 'from-red-600/30 to-[#77216f]/40' },
                { name: 'Sci-Fi', count: movies.filter(m => m.genre.includes('Sci-Fi')).length, color: 'from-purple-600/30 to-[#77216f]/40' },
                { name: 'Animation', count: movies.filter(m => m.genre.includes('Animation')).length, color: 'from-violet-600/30 to-[#77216f]/40' },
                { name: 'African movies', count: movies.filter(m => m.genre.includes('African movies')).length, color: 'from-indigo-600/30 to-[#77216f]/40' },
                { name: 'Rwandan movies', count: movies.filter(m => m.genre.includes('Rwandan movies')).length, color: 'from-[#e95420]/30 to-[#77216f]/40' }
              ].map((cat, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setGenreFilter(cat.name);
                    handleNavigate('movies');
                  }}
                  className={`p-6 bg-gradient-to-br ${cat.color} border border-[#3e1248]/30 rounded-xl hover:border-[#e95420] transition p-4 cursor-pointer`}
                >
                  <h3 className="font-ubuntu text-lg font-bold text-white text-left">{cat.name}</h3>
                  <span className="text-xs text-[#aea79f] font-mono mt-1.5 block">{cat.count} listings found</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 5: SEARCH RESULTS PAGE */}
        {currentView === 'search' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left" id="search-overview-view">
            <h1 className="text-2xl font-bold font-ubuntu text-white">Search results for "{searchQuery}"</h1>
            <p className="text-xs text-[#aea79f] font-mono mb-8">We found matched files inside our library database.</p>

            {/* Matched Movies */}
            <div className="space-y-4 mb-8">
              <h2 className="text-sm font-bold font-mono text-[#e95420] uppercase tracking-wider">Matched Stream Videos</h2>
              {movies.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <p className="text-xs text-[#aea79f] italic">No movies matched this criteria.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {movies.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase())).map((m) => (
                    <MovieCard key={m.id} movie={m} onClick={() => handleNavigate('movie-details', m.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Matched Documents */}
            <div className="space-y-4 pt-4 border-t border-[#2a0e33]">
              <h2 className="text-sm font-bold font-mono text-[#e95420] uppercase tracking-wider">Matched Past Papers & PDFs</h2>
              {documents.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.description.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <p className="text-xs text-[#aea79f] italic font-mono">No educational papers matched.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {documents.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.description.toLowerCase().includes(searchQuery.toLowerCase())).map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onClick={() => handleNavigate('document-details', doc.id)}
                      onDownload={() => {
                        handleTrackDownload(doc.id, 'document');
                        window.open(doc.download_link, '_blank');
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 6: TRENDING MOVIES */}
        {currentView === 'trending' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left" id="trending-catalog-view">
            <h1 className="text-2xl font-bold font-ubuntu text-white mb-2">Most Watched Cinematic Streams</h1>
            <p className="text-xs text-[#aea79f] font-mono mb-8">Popular community picks and most watch synchronized streaming selections this week.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...movies].sort((a,b) => b.views - a.views).map((m) => (
                <MovieCard key={m.id} movie={m} onClick={() => handleNavigate('movie-details', m.id)} />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 7: NEW UPLOADS RELEASE */}
        {currentView === 'new-uploads' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left" id="new-uploads-view">
            <h1 className="text-2xl font-bold font-ubuntu text-white mb-2">Recent Cinema uploads</h1>
            <p className="text-xs text-[#aea79f] font-mono mb-8">Keep track of the newest local releases and educational animations uploaded.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...movies].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((m) => (
                <MovieCard key={m.id} movie={m} onClick={() => handleNavigate('movie-details', m.id)} />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 8: DOCUMENTS LIBRARY PAGE */}
        {currentView === 'documents' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left" id="academic-library-view">
            <h1 className="text-2xl font-bold font-ubuntu text-white mb-1">Academic Study Desk Desk</h1>
            <p className="text-xs text-[#aea79f] font-mono mb-6">Filter, view description, or download pdf high school past papers and syllabus assets.</p>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-[#130517] border border-[#2b0c36] p-4 rounded-xl">
              <div>
                <label className="text-[10px] font-mono text-[#aea79f] uppercase mb-1 block">Course Subject</label>
                <select
                  value={docSubjectFilter}
                  onChange={(e) => setDocSubjectFilter(e.target.value)}
                  className="w-full bg-[#1e0725] text-white text-xs px-3.5 py-2.5 rounded-lg border border-[#3e114a] outline-none"
                >
                  <option value="All">All Subjects</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#aea79f] uppercase mb-1 block">Grade / Level</label>
                <select
                  value={docLevelFilter}
                  onChange={(e) => setDocLevelFilter(e.target.value)}
                  className="w-full bg-[#1e0725] text-white text-xs px-3.5 py-2.5 rounded-lg border border-[#3e114a] outline-none"
                >
                  <option value="All">All Classes</option>
                  <option value="Senior 6 (S6)">Senior 6 (S6)</option>
                  <option value="Senior 5 (S5)">Senior 5 (S5)</option>
                  <option value="Senior 4 (S4)">Senior 4 (S4)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#aea79f] uppercase mb-1 block">Resource Type</label>
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="w-full bg-[#1e0725] text-white text-xs px-3.5 py-2.5 rounded-lg border border-[#3e114a] outline-none"
                >
                  <option value="All">All Types</option>
                  <option value="Past Paper">Past papers</option>
                  <option value="Notes">Revision Notes</option>
                  <option value="Book">Textbooks</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDocSubjectFilter('All');
                    setDocLevelFilter('All');
                    setDocTypeFilter('All');
                  }}
                  className="w-full py-2.5 bg-[#270b30] hover:bg-[#3d0f48] text-gray-300 text-xs font-semibold rounded-lg transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Grid list matches */}
            {documents.filter(d => {
              const matchSubject = docSubjectFilter === 'All' || d.subject === docSubjectFilter;
              const matchLevel = docLevelFilter === 'All' || d.class_level === docLevelFilter;
              const matchType = docTypeFilter === 'All' || d.document_type === docTypeFilter;
              return matchSubject && matchLevel && matchType;
            }).length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#130517]/40 rounded-xl">
                <BookMarked className="w-12 h-12 text-[#2e0b37] mx-auto animate-pulse" />
                <h3 className="text-sm font-bold text-white">Academic file directory is currently unseeded for these parameters.</h3>
                <p className="text-xs text-[#aea79f]">Use Dashboard Admin forms to upload documents easily.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {documents.filter(d => {
                  const matchSubject = docSubjectFilter === 'All' || d.subject === docSubjectFilter;
                  const matchLevel = docLevelFilter === 'All' || d.class_level === docLevelFilter;
                  const matchType = docTypeFilter === 'All' || d.document_type === docTypeFilter;
                  return matchSubject && matchLevel && matchType;
                }).map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onClick={() => handleNavigate('document-details', doc.id)}
                    onDownload={() => {
                      handleTrackDownload(doc.id, 'document');
                      window.open(doc.download_link, '_blank');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 9: SINGLE DOCUMENT DETAIL PAGE */}
        {currentView === 'document-details' && selectedDoc && (
          <div className="max-w-3xl mx-auto px-4 py-12 text-left" id="document-detail-sheet">
            <button
              onClick={() => handleNavigate('documents')}
              className="mb-6 text-xs font-mono text-[#aea79f] hover:text-[#e95420]"
            >
              ← Back to library
            </button>

            <div className="bg-[#120416] border border-[#2e0e37] rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-24 h-32 md:w-32 md:h-44 bg-gradient-to-br from-[#e95420]/20 to-[#77216f] border border-[#5d126d] rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0 mx-auto md:mx-0">
                  <img src={selectedDoc.thumbnail} alt="cov" className="w-full h-full object-cover rounded opacity-80" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-[#e95420]" />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-[#e95420] text-white rounded uppercase">{selectedDoc.document_type}</span>
                    <span className="px-2 py-0.5 text-[9px] font-mono text-gray-300 bg-[#2b0e35] rounded font-bold">{selectedDoc.class_level}</span>
                    <span className="px-2 py-0.5 text-[9px] font-mono text-gray-300 bg-[#2b0e35] rounded font-bold">{selectedDoc.subject}</span>
                  </div>

                  <h1 className="text-xl md:text-2xl font-black font-ubuntu text-white leading-snug">{selectedDoc.title}</h1>
                  <p className="text-xs text-orange-400 font-mono tracking-widest uppercase font-bold">Academic Syllabus • Exam Board Revision</p>
                </div>
              </div>

              {/* description layout */}
              <div className="space-y-3.5 border-t border-[#290d30] pt-6 text-sm leading-relaxed text-gray-200">
                <h3 className="text-xs font-bold text-[#e95420] font-mono uppercase tracking-wider">Synopsis Synopsis Plot</h3>
                <p>{selectedDoc.description}</p>
                <p className="p-3.5 bg-[#200529]/30 rounded border border-[#4d165c]/30 text-xs text-[#aea79f] font-sans">
                  Revision key parameters: This document serves syllabus requirements. Ensure to check related course past examination worksheets for maximal academic results.
                </p>
              </div>

              {/* PDF Preview Embed block */}
              <div className="border-t border-[#290d30] pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#e95420] font-mono uppercase tracking-wider flex items-center space-x-2">
                    <BookMarked className="w-4 h-4 text-[#e95420]" />
                    <span>Interactive PDF & Textbook Preview Desk</span>
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded">
                    ⚡ Live Document Preview Active
                  </span>
                </div>
                
                <div className="bg-black/40 border border-[#2b0c36] rounded-xl p-2 relative overflow-hidden">
                  <iframe
                    src={selectedDoc.download_link ? (
                      selectedDoc.download_link.includes('drive.google.com') 
                      ? selectedDoc.download_link.replace('/view?usp=sharing', '/preview').replace('/view', '/preview')
                      : `https://docs.google.com/gview?url=${encodeURIComponent(selectedDoc.download_link)}&embedded=true`
                    ) : ''}
                    className="w-full h-[520px] rounded-lg bg-[#140417] border border-[#2d0e37]"
                    title={`${selectedDoc.title} Preview Frame`}
                    allow="autoplay"
                  />
                  
                  <div className="p-3 bg-[#130517] border-t border-[#2d0f36] rounded-b-lg flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#aea79f] font-mono">
                    <span className="flex items-center space-x-1">
                      <Info className="w-3.5 h-3.5 text-[#e95420]" />
                      <span>Scroll inner pages to preview contents before downloading.</span>
                    </span>
                    <button
                      onClick={() => {
                        handleTrackDownload(selectedDoc.id, 'document');
                        window.open(selectedDoc.download_link, '_blank');
                      }}
                      className="px-3.5 py-1.5 bg-[#e95420] hover:bg-[#ff6936] text-white rounded font-ubuntu font-bold flex items-center space-x-1.5 transition text-[11px] uppercase tracking-wider"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Original Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Meta details table */}
              <div className="grid grid-cols-2 gap-4 border-t border-[#290d30] pt-6 text-xs text-gray-300 font-mono">
                <div>
                  <span className="block text-[#aea79f] text-[10px] uppercase">Review Year</span>
                  <span className="text-white font-semibold font-sans">{selectedDoc.year}</span>
                </div>
                <div>
                  <span className="block text-[#aea79f] text-[10px] uppercase">Course Discipline</span>
                  <span className="text-white font-semibold font-sans">{selectedDoc.subject}</span>
                </div>
              </div>

              {/* Action downloads */}
              <button
                onClick={() => {
                  handleTrackDownload(selectedDoc.id, 'document');
                  window.open(selectedDoc.download_link, '_blank');
                }}
                className="w-full py-3 bg-[#e95420] hover:bg-[#ff6936] text-white rounded-xl text-xs font-bold tracking-widest uppercase font-mono shadow-lg transition"
              >
                Download PDF / Syllabus Resources
              </button>
            </div>
          </div>
        )}

        {/* VIEW 10: ABOUT PAGE */}
        {currentView === 'about' && (
          <div className="max-w-4xl mx-auto px-4 py-12 text-left" id="about-info-sheet">
            <h1 className="font-ubuntu text-3xl font-black text-white mb-2 ml-1">About Ubuntu Flimsy</h1>
            <p className="text-xs font-mono text-[#aea79f] mb-8 ml-1">Kigali-born cinema stream hub styled on African collaborative vision.</p>

            <div className="bg-[#120416] border border-[#2a0e33] rounded-2xl p-6 md:p-8 space-y-6 leading-relaxed">
              <div className="space-y-4 text-sm text-gray-200">
                <h3 className="text-base font-bold text-[#e95420] font-ubuntu flex items-center space-x-2">
                  <Star className="w-5 h-5 text-[#e95420]" />
                  <span>The Spirit of "Ubuntu" in Entertainment</span>
                </h3>
                <p>
                  "Ubuntu" is a beautifully profound African Bantu philosophy representing human interdependence: <span className="text-[#e95420] font-semibold">"I am because we are."</span> On Ubuntu Flimsy, we translate this community-driven spirit into the digital entertainment world.
                </p>
                <p>
                  Our goal is clear: we believe high-quality movies, culture documentaries, and elite educational resources must be free, accessible, and collaborative for students and cinema lovers all across Rwanda and the globe.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#2d0e34] text-xs">
                <div className="p-4 bg-[#1e0724] border border-[#3e114a]/30 rounded-xl space-y-1.5">
                  <h4 className="text-sm font-semibold font-ubuntu text-[#e95420]">Dual Catalog</h4>
                  <p className="text-gray-300">Enjoy professional high-definition film streaming paired side-by-side with official past papers, notes and education books.</p>
                </div>

                <div className="p-4 bg-[#1e0724] border border-[#3e114a]/30 rounded-xl space-y-1.5">
                  <h4 className="text-sm font-semibold font-ubuntu text-[#e95420]">Synchronized Sharing</h4>
                  <p className="text-gray-300">Chat in real-time inside interactive live watch rooms while films play, discussing plot scenes with other online members.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 11: CONTACT PAGE */}
        {currentView === 'contact' && (
          <div className="max-w-4xl mx-auto px-4 py-12 text-left" id="contact-info-view">
            <h1 className="font-ubuntu text-3xl font-black text-white mb-2 ml-1">Send us a Message</h1>
            <p className="text-xs font-mono text-[#aea79f] mb-8 ml-1">We value your reviews, suggestions, and syllabus needs.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Info links */}
              <div className="md:col-span-1 bg-[#120416] border border-[#2b0c36] p-5 rounded-2xl space-y-6">
                <h3 className="text-sm font-bold text-white font-ubuntu uppercase tracking-wider text-[#e95420]">Contact Details</h3>
                
                <div className="space-y-4 text-xs font-mono text-[#aea79f]">
                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-[#e95420]" />
                    <span className="break-all">{siteSettings.contactEmail}</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-[#e95420]" />
                    <span>{siteSettings.contactPhone}</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-[#e95420]" />
                    <span>Nyarugenge, Kigali, Rwanda</span>
                  </div>
                </div>
              </div>

              {/* Email Form */}
              <div className="md:col-span-2 bg-[#120416] border border-[#2b0c36] p-6 rounded-2xl">
                {feedbackSent ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                    <Check className="w-12 h-12 text-emerald-400 bg-emerald-950/40 p-2 rounded-full border border-emerald-900/30" />
                    <h3 className="font-ubuntu text-base font-bold text-white">Message dispatched!</h3>
                    <p className="text-xs text-[#aea79f]">Our support desk will respond shortly. Thank you!</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-mono text-gray-300 block">Your Name</label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#3e114a] focus:outline-none focus:border-[#e95420]"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-mono text-gray-300 block">Your Email Address</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#3e114a] focus:outline-none focus:border-[#e95420]"
                        placeholder="john.doe@email.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-gray-300 block">Message Details</label>
                      <textarea
                        rows={4}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full bg-[#1b0820] text-sm text-white p-3 rounded-lg border border-[#3e114a] focus:outline-none focus:border-[#e95420]"
                        placeholder="Request a movie, request a past paper PDF..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#e95420] hover:bg-[#ff6936] text-white text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 12: FAQ PAGE */}
        {currentView === 'faq' && (
          <div className="max-w-3xl mx-auto px-4 py-12 text-left" id="faq-view-panel">
            <h1 className="font-ubuntu text-3xl font-black text-white mb-2 ml-1">Frequently Asked Questions</h1>
            <p className="text-xs font-mono text-[#aea79f] mb-8 ml-1">Everything you need to know about streaming, watch rooms, and academics.</p>

            <div className="space-y-4">
              {[
                { q: "Is Ubuntu Flimsy really index free?", a: "Yes! Content hosted on Ubuntu Flimsy is completely accessible for students. You can stream cinema or download S4-S6 exam blueprints with Solutions instantly." },
                { q: "How do synchronized Watch party chats work?", a: "Any user visiting a specific movie can join its synchronized watch channel. You'll notice other online viewers and share thoughts live as the media play." },
                { q: "Can I request past papers not listed?", a: "Definitely. Go to the Contact tab or write in the support form, and our system admins will upload matching syllabus PDF textbooks." },
                { q: "Is there an upload video file limitation?", a: "Through the dashboard, administrators can paste external youtube trailers, streaming watch source URLs, or simulated direct device transfers." }
              ].map((faq, i) => (
                <div key={i} className="p-4.5 bg-[#120416] border border-[#2b0e33] rounded-xl space-y-2">
                  <h3 className="text-sm font-semibold font-ubuntu text-white">{faq.q}</h3>
                  <p className="text-xs text-[#aea79f] leading-relaxed font-sans">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 13: LOGIN PAGE */}
        {currentView === 'login' && (
          <div className="max-w-md mx-auto px-4 py-16 text-left" id="login-view-sheet">
            <div className="bg-[#120416] border border-[#2e0d37] rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="text-center space-y-1">
                <h2 className="font-ubuntu text-xl font-bold text-white">Ubuntu Flimsy Sign In</h2>
                <p className="text-xs text-[#aea79f] font-mono">Gain access to personal watchlists and room chats.</p>
              </div>

              {authError && (
                <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded font-mono text-center">
                  {authError}
                </p>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154] focus:outline-none focus:border-[#e95420]"
                    placeholder="user@flimsy.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 block">Password Password ID</label>
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154] focus:outline-none focus:border-[#e95420]"
                    placeholder="user123"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#e95420] hover:bg-[#ff6936] text-white text-xs font-bold font-mono tracking-wider uppercase rounded-lg transition"
                >
                  Enter Sign In
                </button>
              </form>

              <div className="text-center">
                <button onClick={() => handleNavigate('register')} className="text-xs text-orange-400 hover:underline">
                  Don't have an account? Sign up now!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 14: REGISTER PAGE */}
        {currentView === 'register' && (
          <div className="max-w-md mx-auto px-4 py-16 text-left" id="register-view-canvas">
            <div className="bg-[#120416] border border-[#2e0d37] rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="text-center space-y-1">
                <h2 className="font-ubuntu text-xl font-bold text-white">Join Ubuntu Flimsy</h2>
                <p className="text-xs text-[#aea79f] font-mono">Unlock live discussion watchrooms and exam booklets.</p>
              </div>

              {authError && (
                <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2 text-center rounded">
                  {authError}
                </p>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154]"
                    placeholder="My Name"
                  />
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-xs font-mono text-gray-300 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154]"
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 block">Password (minimum 4 characters)</label>
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154]"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#e95420] hover:bg-[#ff6936] text-white text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition"
                >
                  Create Member Account
                </button>
              </form>

              <div className="text-center">
                <button onClick={() => handleNavigate('login')} className="text-xs text-orange-400 hover:underline">
                  Already registered? Sign in instead.
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 15: USER PROFILE VIEW */}
        {currentView === 'profile' && currentUser && (
          <div className="max-w-3xl mx-auto px-4 py-12 text-left" id="user-profile-editor">
            <h1 className="text-2xl font-bold font-ubuntu text-white mb-2 ml-1">My Flimsy Account</h1>
            <p className="text-xs text-[#aea79f] font-mono mb-6 ml-1">Modify your visual avatars or review streaming metrics.</p>

            <div className="bg-[#120416] border border-[#2e0d37] rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
                <img
                  src={currentUser.avatar}
                  alt="avatar"
                  className="w-16 h-16 rounded-full border-2 border-[#e95420] object-cover"
                />
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold font-ubuntu text-white leading-none">{currentUser.name}</h2>
                  <span className="text-[10px] text-gray-400 font-mono tracking-wider block">ID Code: {currentUser.id}</span>
                  <span className="px-2 py-0.5 bg-[#e95420]/10 text-[#e95420] text-[9px] font-bold uppercase rounded font-mono block w-max mx-auto sm:ml-0">
                    {currentUser.role} privileges
                  </span>
                </div>
              </div>

              {/* Avatar Selector row */}
              <div className="space-y-2 border-t border-[#290d30] pt-4.5">
                <span className="text-xs font-semibold text-gray-300 block">Personalize Profile Character Avatar</span>
                <div className="flex space-x-3.5">
                  {[1, 2, 3, 4].map((num) => {
                    const url = `https://api.dicebear.com/7.x/pixel-art/svg?seed=Avatar${num}`;
                    return (
                      <img
                        key={num}
                        src={url}
                        alt="av"
                        onClick={() => handleAvatarChange(url)}
                        className={`w-10 h-10 rounded-full border cursor-pointer hover:border-[#e95420] bg-[#1e0724] ${
                          currentUser.avatar === url ? 'border-[#e95420] shadow-md scale-110' : 'border-[#300e3a]'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Account History parameters or details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[#290d30] pt-4.5 text-xs text-gray-300 font-mono">
                <div>
                  <span className="block text-[#aea79f] uppercase text-[9px] block">Role Permissions</span>
                  <span className="text-white font-sans font-semibold text-sm block mt-1">{currentUser.role === 'admin' ? 'Master Admin' : 'Free Watcher'}</span>
                </div>
                <div>
                  <span className="block text-[#aea79f] uppercase text-[9px] block">Email Identifier</span>
                  <span className="text-white font-sans font-semibold text-sm block mt-1 truncate max-w-[150px]">{currentUser.email}</span>
                </div>
                <div>
                  <span className="block text-[#aea79f] uppercase text-[9px] block">Member Since</span>
                  <span className="text-white font-sans font-semibold text-sm block mt-1">{new Date(currentUser.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="block text-[#aea79f] uppercase text-[9px] block">Watchlist volume</span>
                  <span className="text-white font-sans font-semibold text-sm block mt-1">{(currentUser.watchlist || []).length} Bookmarks</span>
                </div>
              </div>

              {/* Edit Account Form */}
              <form onSubmit={handleProfileUpdate} className="space-y-4 border-t border-[#290d30] pt-6">
                <h3 className="text-xs font-bold font-mono text-[#e95420] uppercase tracking-wider">Modify Account Settings</h3>
                {profileSuccess && (
                  <p className="text-xs text-green-400 bg-green-950/20 border border-green-900/30 p-2.5 rounded text-center">
                    {profileSuccess}
                  </p>
                )}
                {profileError && (
                  <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded text-center">
                    {profileError}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-gray-300 block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-gray-300 block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154]"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2 font-sans">
                    <label className="text-xs font-mono text-gray-300 block">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                      className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="px-5 py-2.5 bg-[#e95420] hover:bg-[#ff6936] text-white text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition disabled:opacity-50 pointer-events-auto cursor-pointer"
                >
                  {profileSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 16: WATCHLIST / FAVORITES PAGE */}
        {currentView === 'watchlist' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left" id="user-watchlist-view">
            <h1 className="text-2xl font-bold font-ubuntu text-white mb-2">My Saved Bookmarks</h1>
            <p className="text-xs text-[#aea79f] font-mono mb-6">Explore the movies you bookmarked for later community watch party streams.</p>

            {currentUser && movies.filter(m => (currentUser.watchlist || []).includes(m.id)).length === 0 ? (
              <div className="py-16 text-center space-y-3.5 bg-[#140417] border border-[#2b0c36] rounded-xl px-4">
                <Heart className="w-12 h-12 text-[#310c3b] mx-auto animate-pulse" />
                <h3 className="text-sm font-ubuntu font-bold text-white">Your movie watchlist is empty.</h3>
                <p className="text-xs text-[#aea79f]">Click the Heart button on any movie details player to add it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {currentUser && movies.filter(m => (currentUser.watchlist || []).includes(m.id)).map((m) => (
                  <MovieCard key={m.id} movie={m} onClick={() => handleNavigate('movie-details', m.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 17: INSTALL PWA AND APK DOWNLOAD HUB */}
        {currentView === 'downloads' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left space-y-10" id="downloads-pwa-view">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-block bg-[#e95420]/15 border border-[#e95420]/30 text-[#e95420] text-xs px-3.5 py-1 rounded-full font-mono font-bold tracking-widest uppercase">
                ⚙️ Standalone Client Station
              </div>
              <h1 className="text-3xl font-extrabold font-ubuntu text-white tracking-tight">
                Ubuntu Flimsy App Installations
              </h1>
              <p className="text-sm text-[#aea79f] font-sans leading-relaxed">
                Choose the preferred client container for your physical hardware. Standalone installations enable instant fullscreen cinema playback, localized cache buffers, and push updates.
              </p>
            </div>

            {/* Platform download grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Android Container Card */}
              <div className="bg-[#130416] border border-[#2e0d37] rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden group hover:border-[#e95420]/30 transition duration-300">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="p-3 bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 rounded-xl">
                      <Smartphone className="w-7 h-7" />
                    </span>
                    <span className="px-2.5 py-0.5 text-[9px] font-mono bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded-full tracking-wider uppercase">
                      Android .APK Support
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-ubuntu text-white">Android Mobile App Launcher</h3>
                    <p className="text-xs text-gray-400 font-mono mt-1">Package Name: com.ubuntu.flimsy.app</p>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    Enable standard "Allow Unknown Sources" settings inside your phone parameter configuration, and run this optimized helper APK to watch free HD trailers directly full stage.
                  </p>
                </div>
                
                <div className="space-y-3.5 border-t border-[#290d30] pt-4">
                  <div className="p-3 bg-black/40 rounded-lg space-y-1">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">Interactive APK manifest metrics</div>
                    <div className="flex justify-between text-[11px] font-mono text-gray-300">
                      <span>Package File size:</span>
                      <span>14.8 MB</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-gray-300">
                      <span>Compatibility:</span>
                      <span>Android 8.0 or newer</span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      handleTrackDownload('ubuntu-apk', 'apk');
                      window.location.href = '/api/download-app?platform=android';
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-extrabold uppercase font-mono tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download UbuntuFlimsy.apk (Android)</span>
                  </button>
                </div>
              </div>

              {/* PC / Desktop client card */}
              <div className="bg-[#130416] border border-[#2e0d37] rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden group hover:border-[#e95420]/30 transition duration-300">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="p-3 bg-blue-950/40 text-blue-400 border border-blue-900/40 rounded-xl">
                      <Film className="w-7 h-7" />
                    </span>
                    <span className="px-2.5 py-0.5 text-[9px] font-mono bg-blue-950/20 text-blue-400 border border-blue-900/30 rounded-full tracking-wider uppercase">
                      PC Client Build
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-ubuntu text-white">Windows & Mac PC client</h3>
                    <p className="text-xs text-gray-400 font-mono mt-1">Platform: Windows x64 / macOS client</p>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    Download the desktop wrapper for your computer to access smooth frame renderings, offline background file-download tracking, and synchronized desktop screen overlays.
                  </p>
                </div>
                
                <div className="space-y-3.5 border-t border-[#290d30] pt-4">
                  <div className="p-3 bg-black/40 rounded-lg space-y-1">
                    <div className="text-[10px] font-mono text-gray-400 uppercase">PC Executable package metrics</div>
                    <div className="flex justify-between text-[11px] font-mono text-gray-300">
                      <span>Package File size:</span>
                      <span>42.1 MB</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-gray-300">
                      <span>Compatibility:</span>
                      <span>Windows 10/11 x64</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleTrackDownload('ubuntu-desktop', 'pc-launcher');
                      window.location.href = '/api/download-app?platform=windows';
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold uppercase font-mono tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Windows Client (.exe)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PWA instructions block */}
            <div className="bg-gradient-to-br from-[#1c0622] to-black border border-[#3e144a] rounded-2xl p-6 sm:p-8 space-y-6">
              <h3 className="text-base font-bold font-ubuntu text-[#e95420] flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span>Fast & Instant: Chrome & Safari PWA installation (Recommended)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed font-sans text-gray-300 text-left">
                <div className="space-y-2">
                  <div className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-[#e95420] text-white flex items-center justify-center text-xs font-sans">1</span>
                    <span>Direct browser load</span>
                  </div>
                  <p>Open Ubuntu Flimsy in Chrome, Edge, or Safari. Standard browser controls automatically identify stand-alone layout manifests natively.</p>
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-[#e95420] text-white flex items-center justify-center text-xs font-sans">2</span>
                    <span>Click Add / Install</span>
                  </div>
                  <p>In your browser top right menu or address bar, click the <strong className="text-white">"Install App"</strong> symbol or click the floating notice banner at the top of Flimsy.</p>
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-[#e95420] text-white flex items-center justify-center text-xs font-sans">3</span>
                    <span>Ready in Standalone</span>
                  </div>
                  <p>A native high fidelity launcher icon gets painted to your home screen immediately for offline, beautiful app streaming!</p>
                </div>
              </div>

              {deferredPrompt && (
                <div className="pt-4 border-t border-[#2d0f36] flex justify-center">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="px-6 py-3 bg-[#e95420] hover:bg-[#ff6936] text-white font-bold font-mono text-xs uppercase tracking-wide rounded-xl shadow-lg transition flex items-center space-x-2 animate-bounce cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Launch Native Browser PWA Installer Instantly</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADMIN EXPLICIT DASHBOARDS */}
        {currentView.startsWith('admin-') && currentUser?.role === UserRole.ADMIN && (
          <AdminPanel
            currentUser={currentUser}
            onNavigate={handleNavigate}
            siteSettings={siteSettings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

      </main>

      {/* Footer component */}
      <Footer
        onNavigate={handleNavigate}
        siteName={siteSettings.logoName}
        footerText={siteSettings.footerText}
        contactEmail={siteSettings.contactEmail}
        contactPhone={siteSettings.contactPhone}
      />
    </div>
  );
}
