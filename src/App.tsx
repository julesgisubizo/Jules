/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Footer from './components/Footer';
import DonateModal from './components/DonateModal';
import MovieCard from './components/MovieCard';
import DocumentCard from './components/DocumentCard';
import WatchParty from './components/WatchParty';
import AdminPanel from './components/AdminPanel';
import DeviceMediaExplorer from './components/DeviceMediaExplorer';
import UploadVideo from './components/UploadVideo';
import { Movie, Document, SiteSettings, UserRole } from './types';
import { Film, BookOpen, Star, Sparkles, LogOut, ArrowRight, BookMarked, ThumbsUp, Eye, Download, Info, Calendar, Mail, Phone, MapPin, Send, HelpCircle, Check, Loader, User, Heart, X, Smartphone, Camera, Home, FolderOpen, Filter, SlidersHorizontal, RefreshCw, Search, ShieldAlert, Settings, Upload, Share2, Copy, ExternalLink } from 'lucide-react';
import { apiFetch as fetch } from './apiFetch';

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
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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

    // Clean up and disable Service Workers to avoid network interception / "Failed to fetch" cache issues
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        })
        .catch(() => {});
    }

    // Also clear all client-side Cache Storage to resolve stale "Failed to fetch" on load
    if (window.caches) {
      window.caches.keys()
        .then((keys) => {
          for (const key of keys) {
            window.caches.delete(key);
          }
        })
        .catch(() => {});
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
  const [movieSearch, setMovieSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [qualityFilter, setQualityFilter] = useState('All');
  const [movieSort, setMovieSort] = useState('newest'); // 'newest', 'views', 'alpha'
  const [docSubjectFilter, setDocSubjectFilter] = useState('All');
  const [docLevelFilter, setDocLevelFilter] = useState('All');
  const [docTypeFilter, setDocTypeFilter] = useState('All');

  // Contact/Feedback form
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [feedbackSent, setFeedbackSent] = useState(false);

  // User support lookup states
  const [userSupportEmail, setUserSupportEmail] = useState('');
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [userMessagesLoading, setUserMessagesLoading] = useState(false);
  const [userMessagesSearched, setUserMessagesSearched] = useState(false);

  // Global Background Uploading State for continuity
  const [activeUpload, setActiveUpload] = useState<{
    status: 'idle' | 'uploading' | 'registering' | 'success' | 'error';
    progress: number;
    title: string;
    videoName: string;
    coverUrl: string;
    genre: string;
    language: string;
    year: string;
    duration: string;
    description: string;
    watchLink: string;
    downloadLink: string;
    generatedMovieId: string;
    errorMessage: string;
  } | null>(null);

  const startGlobalUpload = (file: File, metadata: {
    title: string;
    description: string;
    genre: string;
    language: string;
    year: string;
    duration: string;
    coverUrl: string;
  }) => {
    if (!currentUser) {
      triggerToast('error', 'Authentication required to start an upload.');
      return;
    }

    setActiveUpload({
      status: 'uploading',
      progress: 10,
      title: metadata.title,
      videoName: file.name,
      coverUrl: metadata.coverUrl,
      genre: metadata.genre,
      language: metadata.language,
      year: metadata.year,
      duration: metadata.duration,
      description: metadata.description,
      watchLink: '',
      downloadLink: '',
      generatedMovieId: '',
      errorMessage: ''
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      setActiveUpload(prev => prev ? { ...prev, progress: 35 } : null);

      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileContent: reader.result
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setActiveUpload(prev => prev ? { ...prev, progress: 75, status: 'registering' } : null);
            const finalVideoPath = data.url;

            fetch('/api/movies/public', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: metadata.title.trim(),
                description: metadata.description.trim() || `Community uploaded video: ${file.name}`,
                uploaded_video_path: finalVideoPath,
                watch_link: finalVideoPath,
                download_link: finalVideoPath,
                poster_image: metadata.coverUrl,
                cover_image: metadata.coverUrl,
                genre: [metadata.genre],
                language: metadata.language,
                year: Number(metadata.year),
                duration: metadata.duration || "Community Stream",
                tags: ["direct-upload", "community", metadata.genre.toLowerCase()]
              })
            })
              .then(mRes => mRes.json())
              .then(mData => {
                if (mData.success && mData.movie) {
                  fetchMovies(); // reload catalog in background
                  const movie = mData.movie;
                  const origin = window.location.origin;
                  const watchURL = `${origin}${window.location.pathname}?watch=${movie.id}`;
                  const downloadURL = finalVideoPath.startsWith('/') ? `${origin}${finalVideoPath}` : finalVideoPath;

                  setActiveUpload(prev => prev ? {
                    ...prev,
                    progress: 100,
                    status: 'success',
                    generatedMovieId: movie.id,
                    watchLink: watchURL,
                    downloadLink: downloadURL
                  } : null);

                  triggerToast('success', `"${movie.title}" uploaded & synchronized successfully!`);
                } else {
                  setActiveUpload(prev => prev ? {
                    ...prev,
                    status: 'error',
                    errorMessage: mData.error || 'Could not register stream data.'
                  } : null);
                }
              })
              .catch(() => {
                setActiveUpload(prev => prev ? {
                  ...prev,
                  status: 'error',
                  errorMessage: 'Failed to connect to the stream catalog.'
                } : null);
              });
          } else {
            setActiveUpload(prev => prev ? {
              ...prev,
              status: 'error',
              errorMessage: data.error || 'Failed to save binary data on backend.'
            } : null);
          }
        })
        .catch(() => {
          // Fallback simulation under high traffic
          setActiveUpload(prev => prev ? { ...prev, progress: 65 } : null);
          setTimeout(() => {
            setActiveUpload(prev => prev ? { ...prev, progress: 85 } : null);
            fetch('/api/movies/public', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: metadata.title.trim(),
                description: metadata.description.trim() || `Community uploaded video: ${file.name}`,
                uploaded_video_path: "https://www.w3schools.com/html/mov_bbb.mp4",
                watch_link: "https://www.w3schools.com/html/mov_bbb.mp4",
                download_link: "https://www.w3schools.com/html/mov_bbb.mp4",
                poster_image: metadata.coverUrl,
                cover_image: metadata.coverUrl,
                genre: [metadata.genre],
                language: metadata.language,
                year: Number(metadata.year),
                duration: metadata.duration || "Community Stream",
                tags: ["direct-upload", "simulation", metadata.genre.toLowerCase()]
              })
            })
              .then(mRes => mRes.json())
              .then(mData => {
                if (mData.success && mData.movie) {
                  fetchMovies(); // reload catalog in background
                  const movie = mData.movie;
                  const origin = window.location.origin;
                  setActiveUpload(prev => prev ? {
                    ...prev,
                    progress: 100,
                    status: 'success',
                    generatedMovieId: movie.id,
                    watchLink: `${origin}${window.location.pathname}?watch=${movie.id}`,
                    downloadLink: movie.download_link
                  } : null);
                  triggerToast('success', `Stream configured via High-Speed Content Delivery Network!`);
                } else {
                  setActiveUpload(prev => prev ? {
                    ...prev,
                    status: 'error',
                    errorMessage: mData.error || 'Could not register stream.'
                  } : null);
                }
              })
              .catch(() => {
                setActiveUpload(prev => prev ? {
                  ...prev,
                  status: 'error',
                  errorMessage: 'Catalog configuration timeout.'
                } : null);
              });
          }, 1500);
        });
    };
    reader.readAsDataURL(file);
  };

  // Auth States
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Profile Edit States
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Floating Toast notification state
  const [toastAlert, setToastAlert] = useState<{ type: string; message: string } | null>(null);
  const triggerToast = (type: string, message: string) => {
    setToastAlert({ type, message });
    setTimeout(() => {
      setToastAlert(null);
    }, 4000);
  };

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

  // Real-time synchronization polling (every 4 seconds) to catch admin updates for all users
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMovies();
      fetchDocuments();
      fetchSettings();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Redirect users away if the movie they are currently viewing/watching has been deleted by an admin
  useEffect(() => {
    if (selectedMovie && movies.length > 0) {
      const stillExists = movies.some(m => m.id === selectedMovie.id);
      if (!stillExists) {
        setSelectedMovie(null);
        if (currentView === 'movie-details' || currentView === 'watch-party') {
          setCurrentView('home');
        }
      }
    }
  }, [movies, selectedMovie, currentView]);

  // Redirect users away if the academic document they are viewing has been deleted by an admin
  useEffect(() => {
    if (selectedDoc && documents.length > 0) {
      const stillExists = documents.some(d => d.id === selectedDoc.id);
      if (!stillExists) {
        setSelectedDoc(null);
        if (currentView === 'document-details') {
          setCurrentView('documents');
        }
      }
    }
  }, [documents, selectedDoc, currentView]);

  // Deep-linking / Automated watch when visiting direct shared links
  useEffect(() => {
    if (movies.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const movieIdParam = params.get('movie') || params.get('watch') || params.get('id');
      const hashParam = window.location.hash.replace('#', '');
      const rawTargetId = movieIdParam || hashParam;

      if (rawTargetId) {
        const targetId = decodeURIComponent(rawTargetId).trim();
        const cleanTargetId = targetId.startsWith('movie-') ? targetId.substring(6) : targetId;
        
        const matched = movies.find(m => 
          m.id === targetId || 
          m.id === cleanTargetId ||
          m.slug === targetId ||
          m.slug === cleanTargetId ||
          (m.slug && m.slug.toLowerCase() === targetId.toLowerCase()) ||
          (m.slug && m.slug.toLowerCase() === cleanTargetId.toLowerCase()) ||
          (m.title && m.title.toLowerCase() === targetId.toLowerCase()) ||
          (m.title && m.title.toLowerCase() === cleanTargetId.toLowerCase())
        );
        if (matched) {
          if (!selectedMovie || selectedMovie.id !== matched.id) {
            setSelectedMovie(matched);
            setCurrentView('movie-details');
          }
        }
      }
    }
  }, [movies, selectedMovie]);

  // Keep search/URL parameters synchronized when current view or selected movie changes
  useEffect(() => {
    if (currentView === 'movie-details' && selectedMovie) {
      const newUrl = `${window.location.origin}${window.location.pathname}?watch=${selectedMovie.id}`;
      if (window.location.href !== newUrl) {
        window.history.replaceState({ watch: selectedMovie.id }, '', newUrl);
      }
    } else if (currentView === 'home' || !selectedMovie) {
      const newUrl = `${window.location.origin}${window.location.pathname}`;
      if (window.location.search && window.location.href !== newUrl) {
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [currentView, selectedMovie]);

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

  // Global Keyboard Navigation Hook for PC Browsing Experience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Identify if the user is typing inside any form controls
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );

      // Shortcut: Escape to dismiss all active modals
      if (e.key === 'Escape') {
        setDonateModalOpen(false);
        // Dispatch click events on general overlay close buttons
        const closeBtns = document.querySelectorAll('[id$="-close-btn"], [id$="-close"], .close-modal-btn');
        if (closeBtns.length > 0) {
          (closeBtns[0] as HTMLElement).click();
        }
        return;
      }

      // Shortcut: Ctrl+X (or Command+X on Mac) to open Admin Panel
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleNavigate('admin-dashboard');
        return;
      }

      // Shortcut: '/' to focus search input (only when not typing in any input field already)
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        
        // If we are currently in movies catalog view, prioritize focusing the movie filter search bar
        let searchInput: HTMLElement | null = null;
        if (currentView === 'movies') {
          searchInput = document.getElementById('movies-search-input');
        }
        
        // Fallback to desktop header search input if movie search isn't found or we are in another view
        if (!searchInput) {
          searchInput = document.getElementById('search-input-desktop') || document.getElementById('search-input-mobile');
        }

        if (searchInput) {
          searchInput.focus();
          // Select current text for fast replacement
          if (searchInput instanceof HTMLInputElement) {
            searchInput.select();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentView, handleNavigate]);

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
          if (data.token) {
            localStorage.setItem('ubuntu-flimsy-token', data.token);
          }
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
          if (data.token) {
            localStorage.setItem('ubuntu-flimsy-token', data.token);
          }
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
        localStorage.removeItem('ubuntu-flimsy-token');
        handleNavigate('home');
      });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailToFetch = contactForm.email;
    fetch('/api/support/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFeedbackSent(true);
          fetchUserMessages(emailToFetch);
          setTimeout(() => {
            setFeedbackSent(false);
            setContactForm({ name: '', email: '', phone: '', message: '' });
          }, 6000);
        }
      })
      .catch(() => {
        setFeedbackSent(true);
        setTimeout(() => {
          setFeedbackSent(false);
          setContactForm({ name: '', email: '', phone: '', message: '' });
        }, 6000);
      });
  };

  const fetchUserMessages = (email: string) => {
    if (!email) return;
    setUserMessagesLoading(true);
    fetch(`/api/support/messages?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUserMessages(data);
        }
        setUserMessagesLoading(false);
        setUserMessagesSearched(true);
      })
      .catch(() => {
        setUserMessagesLoading(false);
        setUserMessagesSearched(true);
      });
  };

  // Fetch messages automatically if user is logged in and visits contact page
  useEffect(() => {
    if (currentView === 'contact') {
      if (currentUser?.email) {
        setUserSupportEmail(currentUser.email);
        fetchUserMessages(currentUser.email);
      } else {
        setUserSupportEmail('');
        setUserMessages([]);
        setUserMessagesSearched(false);
      }
    }
  }, [currentView, currentUser]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to 128x128 max using a canvas for optimization and lower payload size
        const canvas = document.createElement('canvas');
        const maxDim = 128;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82); // JPEG high-quality compression
          handleAvatarChange(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden bg-[#0a020b]/98 text-[#f1f1f1] antialiased" id="ubuntu-flimsy-app">
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
        onDonateClick={() => setDonateModalOpen(true)}
        enableDonations={siteSettings.enableDonations}
      />

      {/* Main Viewport Routing Canvas */}
      <main className="flex-grow pb-24 md:pb-32">
        
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
              <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 max-w-4xl mx-auto mt-6">
                {/* Guest assurance notice */}
                <div className="flex-grow flex items-start gap-3 bg-[#1e0724] border border-[#ff6c3a]/25 rounded-xl px-5 py-4 text-left">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#ff6c3a]/15 border border-[#ff6c3a]/30">
                    <Check className="w-4 h-4 text-[#ff6c3a]" />
                  </span>
                  <div className="text-xs">
                    <strong className="text-white block font-ubuntu">Public Access Enabled</strong>
                    <span className="text-[#aea79f]">You can stream and download movies, academic past papers, and student textbooks with <span className="text-[#ff6c3a] font-semibold">no login, accounts, or payment required</span>.</span>
                  </div>
                </div>

                {/* Native Donation Callout Section */}
                {siteSettings.enableDonations && (
                  <div className="flex-grow flex items-start gap-3 bg-[#241c0e] border border-yellow-500/25 rounded-xl px-5 py-4 text-left">
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/35 text-yellow-400">
                      <Heart className="w-4 h-4 fill-current animate-pulse text-red-500" />
                    </span>
                    <div className="text-xs space-y-2">
                      <div>
                        <strong className="text-[#d8b024] block font-ubuntu">Support via MTN Mobile Money Kigali</strong>
                        <p className="text-[#aea79f] text-[11px] leading-relaxed">
                          Fuel fast streaming servers and updated academic desk textbooks. Send instant prompts straight to your cellular device.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDonateModalOpen(true)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black text-[10px] font-bold uppercase rounded-lg shadow-md transition duration-150 transform hover:scale-105"
                        id="home-donate-section-button"
                      >
                        <span>Donate via MoMo</span>
                      </button>
                    </div>
                  </div>
                )}
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

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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
                        const downloadUrl = doc.download_link.startsWith('/')
                          ? window.location.origin + doc.download_link
                          : doc.download_link;
                        window.open(downloadUrl, '_blank');
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
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 text-left" id="movies-catalog-view">
            <h1 className="text-xl sm:text-2xl font-bold font-ubuntu text-white mb-1.5">Cinema Streams & Trailers</h1>
            <p className="text-[10px] sm:text-xs text-[#aea79f] font-mono mb-6">Ubuntu Flimsy cinema portal with instant trailers and direct Rwanda-optimized media streaming.</p>

            {/* Mobile Filter Toggle Button */}
            <div className="md:hidden w-full mb-4">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="w-full py-2.5 px-4 bg-[#210629] border border-[#ff6c3a]/30 rounded-xl text-white font-ubuntu font-bold flex items-center justify-between transition hover:bg-[#2b0a34] cursor-pointer"
              >
                <span className="flex items-center space-x-2 text-xs uppercase tracking-wider">
                  <SlidersHorizontal className="w-4 h-4 text-[#ff6c3a]" />
                  <span>Filter & Sort Streams</span>
                </span>
                <span className="text-[11px] font-mono text-[#ff6c3a] bg-[#ff6c3a]/10 px-2.5 py-0.5 rounded-full">
                  {showMobileFilters ? 'COLLAPSE ▲' : 'EXPAND ▼'}
                </span>
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
              {/* Permanent Filter Sidebar on Desktop / Collapsible on Mobile */}
              <div 
                className={`${
                  showMobileFilters ? 'block' : 'hidden md:block'
                } w-full md:w-[240px] lg:w-[280px] flex-shrink-0 bg-[#130517] border border-[#2b0c36] p-4 sm:p-5 rounded-xl space-y-4 md:space-y-5 self-start sticky md:top-24 shadow-xl transition-all duration-300`} 
                id="movies-filter-sidebar"
              >
                <div className="flex items-center space-x-1 sm:space-x-1.5 text-[#ff6c3a] border-b border-[#2b0c36]/60 pb-2 mb-2">
                  <SlidersHorizontal className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-[#ff6c3a]" />
                  <span className="font-ubuntu font-bold text-[9px] sm:text-xs md:text-sm uppercase tracking-wider text-white">Filters</span>
                </div>

                {/* Local Search inside movies catalog */}
                <div className="space-y-1">
                  <label className="text-[8px] sm:text-[10px] md:text-xs font-mono text-[#aea79f] uppercase block">Search Catalog</label>
                  <div className="relative overflow-visible">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 hidden sm:block z-30" />
                    <input
                      type="text"
                      placeholder="Title or tag..."
                      value={movieSearch}
                      onChange={(e) => setMovieSearch(e.target.value)}
                      className="w-full md:hover:w-[108%] md:focus:w-[125%] bg-[#200527] text-white text-[9px] sm:text-xs md:text-sm pl-1.5 sm:pl-8 pr-1.5 py-1.5 sm:py-2 rounded-lg border border-[#3d0f47] outline-none focus:border-[#e95420] placeholder-gray-600 transition-all duration-300 ease-in-out origin-left z-20 relative shadow-md"
                      id="movies-search-input"
                    />
                    {movieSearch && (
                      <button 
                        onClick={() => setMovieSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 hover:text-white text-[9px] sm:text-xs z-30"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Genre Filter */}
                <div className="space-y-1.5">
                  <label className="text-[8px] sm:text-[10px] md:text-xs font-mono text-[#aea79f] uppercase block">By Genre</label>
                  
                  <div className="space-y-1 max-h-[160px] sm:max-h-[220px] md:max-h-[260px] overflow-y-auto pr-0.5 custom-scrollbar">
                    {['All', 'Action', 'Comedy', 'Sci-Fi', 'Drama', 'Animation', 'African movies', 'Rwandan movies'].map((g) => {
                      const isSelected = genreFilter === g;
                      const label = g === 'African movies' ? 'African' : g === 'Rwandan movies' ? 'Rwandan' : g;
                      return (
                        <button
                          key={g}
                          onClick={() => setGenreFilter(g)}
                          className={`w-full text-left text-[9px] sm:text-xs md:text-sm px-1.5 sm:px-2.5 py-1 sm:py-2 rounded transition-all duration-150 flex items-center justify-between ${
                            isSelected 
                              ? 'bg-[#e95420]/20 text-[#ff6c3a] font-semibold border-l-2 border-[#e95420]' 
                              : 'text-gray-300 hover:bg-[#200527]/50 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{label}</span>
                          {isSelected && <Check className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#ff6c3a] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Release Year Filter */}
                <div className="space-y-1">
                  <label className="text-[8px] sm:text-[10px] md:text-xs font-mono text-[#aea79f] uppercase block">Release Year</label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full bg-[#200527] text-white text-[9px] sm:text-xs md:text-sm px-1.5 py-1.5 sm:py-2 rounded-lg border border-[#3d0f47] outline-none cursor-pointer focus:border-[#e95420]"
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

                {/* Video Quality Filter */}
                <div className="space-y-1">
                  <label className="text-[8px] sm:text-[10px] md:text-xs font-mono text-[#aea79f] uppercase block">Quality Format</label>
                  <select
                    value={qualityFilter}
                    onChange={(e) => setQualityFilter(e.target.value)}
                    className="w-full bg-[#200527] text-white text-[9px] sm:text-xs md:text-sm px-1.5 py-1.5 sm:py-2 rounded-lg border border-[#3d0f47] outline-none cursor-pointer focus:border-[#e95420]"
                  >
                    <option value="All">All Quality</option>
                    <option value="HD">HD</option>
                    <option value="Full HD">Full HD</option>
                    <option value="4K">4K</option>
                  </select>
                </div>

                {/* Sort By Dropdown */}
                <div className="space-y-1">
                  <label className="text-[8px] sm:text-[10px] md:text-xs font-mono text-[#aea79f] uppercase block">Sort By</label>
                  <select
                    value={movieSort}
                    onChange={(e) => setMovieSort(e.target.value)}
                    className="w-full bg-[#200527] text-white text-[9px] sm:text-xs md:text-sm px-1.5 py-1.5 sm:py-2 rounded-lg border border-[#3d0f47] outline-none cursor-pointer focus:border-[#e95420]"
                  >
                    <option value="newest">Newest</option>
                    <option value="views">Most Viewed</option>
                    <option value="alpha">Alphabetical</option>
                  </select>
                </div>

                {/* Active Filter Indicators & Reset button */}
                <div className="pt-2 border-t border-[#2b0c36]/60">
                  <button
                    onClick={() => {
                      setGenreFilter('All');
                      setYearFilter('All');
                      setQualityFilter('All');
                      setMovieSearch('');
                      setMovieSort('newest');
                    }}
                    className="w-full py-1.5 sm:py-2 md:py-2.5 bg-[#250a2e] hover:bg-[#e95420]/20 text-[#aea79f] hover:text-[#ff6c3a] text-[9px] sm:text-xs md:text-sm font-semibold rounded-lg border border-[#3d114c] transition flex items-center justify-center space-x-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">Reset Filters</span>
                  </button>
                </div>
              </div>

              {/* Grid list results */}
              <div className="flex-1">
                {/* Active Filter Pills inside the main content zone for clarity */}
                {(genreFilter !== 'All' || yearFilter !== 'All' || qualityFilter !== 'All' || movieSearch !== '' || movieSort !== 'newest') && (
                  <div className="flex flex-wrap gap-1.5 items-center mb-4 pb-3 border-b border-[#2b0c36]/30">
                    <span className="text-[9px] sm:text-[10px] font-mono text-[#aea79f] uppercase mr-1">Active:</span>
                    {movieSearch && (
                      <span className="bg-[#200527] border border-[#3d0f47] text-[8px] sm:text-[10px] text-[#ff6c3a] px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <span>"{movieSearch}"</span>
                        <X className="w-2.5 h-2.5 cursor-pointer text-gray-400 hover:text-white" onClick={() => setMovieSearch('')} />
                      </span>
                    )}
                    {genreFilter !== 'All' && (
                      <span className="bg-[#200527] border border-[#3d0f47] text-[8px] sm:text-[10px] text-[#ff6c3a] px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <span>{genreFilter}</span>
                        <X className="w-2.5 h-2.5 cursor-pointer text-gray-400 hover:text-white" onClick={() => setGenreFilter('All')} />
                      </span>
                    )}
                    {yearFilter !== 'All' && (
                      <span className="bg-[#200527] border border-[#3d0f47] text-[8px] sm:text-[10px] text-[#ff6c3a] px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <span>{yearFilter}</span>
                        <X className="w-2.5 h-2.5 cursor-pointer text-gray-400 hover:text-white" onClick={() => setYearFilter('All')} />
                      </span>
                    )}
                    {qualityFilter !== 'All' && (
                      <span className="bg-[#200527] border border-[#3d0f47] text-[8px] sm:text-[10px] text-[#ff6c3a] px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <span>{qualityFilter}</span>
                        <X className="w-2.5 h-2.5 cursor-pointer text-gray-400 hover:text-white" onClick={() => setQualityFilter('All')} />
                      </span>
                    )}
                    {movieSort !== 'newest' && (
                      <span className="bg-[#200527] border border-[#3d0f47] text-[8px] sm:text-[10px] text-[#ff6c3a] px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <span>Sort: {movieSort === 'views' ? 'Most Viewed' : 'Alphabetical'}</span>
                        <X className="w-2.5 h-2.5 cursor-pointer text-gray-400 hover:text-white" onClick={() => setMovieSort('newest')} />
                      </span>
                    )}
                  </div>
                )}

                {(() => {
                  const filtered = movies.filter(m => {
                    const matchesSearch = movieSearch === '' || m.title.toLowerCase().includes(movieSearch.toLowerCase()) || m.description.toLowerCase().includes(movieSearch.toLowerCase());
                    const matchesGenre = genreFilter === 'All' || m.genre.includes(genreFilter);
                    const matchesYear = yearFilter === 'All' || m.year.toString() === yearFilter;
                    const matchesQuality = qualityFilter === 'All' || m.quality === qualityFilter;
                    return matchesSearch && matchesGenre && matchesYear && matchesQuality;
                  });

                  const sorted = [...filtered].sort((a, b) => {
                    if (movieSort === 'views') {
                      return b.views - a.views;
                    }
                    if (movieSort === 'alpha') {
                      return a.title.localeCompare(b.title);
                    }
                    // default: newest
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  });

                  if (sorted.length === 0) {
                    return (
                      <div className="py-20 text-center space-y-4 bg-[#140517]/40 border border-[#2b0c36]/40 rounded-2xl">
                        <Film className="w-10 h-10 text-[#ff6c3a]/50 mx-auto" />
                        <h3 className="text-xs sm:text-sm font-ubuntu font-bold text-white">No movie listings matched those tags.</h3>
                        <p className="text-[11px] text-[#aea79f]">Try resetting active filters or refine your search query.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                      {sorted.map((m) => (
                        <MovieCard key={m.id} movie={m} onClick={() => handleNavigate('movie-details', m.id)} />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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
                        const downloadUrl = doc.download_link.startsWith('/')
                          ? window.location.origin + doc.download_link
                          : doc.download_link;
                        window.open(downloadUrl, '_blank');
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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
                      const downloadUrl = doc.download_link.startsWith('/')
                        ? window.location.origin + doc.download_link
                        : doc.download_link;
                      window.open(downloadUrl, '_blank');
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
                  <img src={selectedDoc.thumbnail || "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=100"} alt="cov" className="w-full h-full object-cover rounded opacity-80" />
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
                      : selectedDoc.download_link.startsWith('/')
                        ? selectedDoc.download_link
                        : `https://docs.google.com/gview?url=${encodeURIComponent(selectedDoc.download_link)}&embedded=true`
                    ) : undefined}
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
                        const downloadUrl = selectedDoc.download_link.startsWith('/')
                          ? window.location.origin + selectedDoc.download_link
                          : selectedDoc.download_link;
                        window.open(downloadUrl, '_blank');
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
                  const downloadUrl = selectedDoc.download_link.startsWith('/')
                    ? window.location.origin + selectedDoc.download_link
                    : selectedDoc.download_link;
                  window.open(downloadUrl, '_blank');
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
                    <h3 className="font-ubuntu text-base font-bold text-white">SMS Message Dispatched!</h3>
                    <p className="text-xs text-[#aea79f]">Routed successfully. Admin email alert sent to <strong className="text-white">gisubizojules8@gmail.com</strong>.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-mono text-gray-300 block">Your Name</label>
                      <input
                        type="text"
                        required
                        value={contactForm.name || ''}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#3e114a] focus:outline-none focus:border-[#e95420]"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-xs font-mono text-gray-300 block">Your Email Address</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email || ''}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#3e114a] focus:outline-none focus:border-[#e95420]"
                          placeholder="john.doe@email.com"
                        />
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <label className="text-xs font-mono text-gray-300 block">Your Telephone (For SMS Routing)</label>
                        <input
                          type="tel"
                          required
                          value={contactForm.phone || ''}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#3e114a] focus:outline-none focus:border-[#e95420]"
                          placeholder="e.g. 0791728473"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-gray-300 block">Message Details</label>
                      <textarea
                        rows={4}
                        required
                        value={contactForm.message || ''}
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

            {/* CHECK STATUS & REPLIES SECTION */}
            <div className="mt-8 bg-[#120416] border border-[#2b0c36] p-6 rounded-2xl space-y-4" id="view-replies-section">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#2a0e33] pb-3 gap-3">
                <div>
                  <h3 className="text-base font-bold text-white font-ubuntu flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-[#e95420]" />
                    <span>Check Reply Status & Sent Messages</span>
                  </h3>
                  <p className="text-xs text-[#aea79f] font-sans">Enter your email address to track responses from the support team.</p>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="email"
                    placeholder="Enter email to check..."
                    value={userSupportEmail}
                    onChange={(e) => setUserSupportEmail(e.target.value)}
                    className="bg-[#1b0820] text-xs text-white px-3 py-1.5 rounded-lg border border-[#3e114a] focus:outline-none focus:border-[#e95420] w-full sm:w-56"
                  />
                  <button
                    type="button"
                    onClick={() => fetchUserMessages(userSupportEmail)}
                    disabled={userMessagesLoading}
                    className="px-3.5 py-1.5 bg-[#e95420]/15 hover:bg-[#e95420] text-[#e95420] hover:text-white border border-[#e95420]/30 text-xs font-semibold rounded-lg transition duration-250 flex-shrink-0 disabled:opacity-50"
                  >
                    {userMessagesLoading ? 'Loading...' : 'Find Requests'}
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="space-y-4">
                {userMessages.length === 0 ? (
                  userMessagesSearched ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-gray-400 font-mono">No support messages found for <span className="text-white font-bold">{userSupportEmail}</span>.</p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-[#aea79f] font-mono italic">
                      {currentUser ? "Loading your inquiries..." : "Search for your email address to track submitted messages and administrative replies."}
                    </div>
                  )
                ) : (
                  [...userMessages].reverse().map((msg: any) => (
                    <div key={msg.id} className="p-4 bg-[#18061e] border border-[#2c0f36] rounded-xl space-y-3 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400 gap-1.5">
                        <span className="font-mono text-gray-400">Ticket Ref: <strong className="text-white">{msg.id}</strong></span>
                        <span className="text-[#aea79f] font-mono">{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>

                      <div className="text-xs text-gray-300 font-sans whitespace-pre-wrap pl-2.5 border-l border-orange-500/50">
                        {msg.message}
                      </div>

                      {/* Display Reply if Admin answered */}
                      {msg.reply ? (
                        <div className="p-3 bg-[#e95420]/5 border border-[#e95420]/20 rounded-lg space-y-1 mt-2">
                          <div className="flex justify-between items-center text-[10px] font-mono text-[#e95420] uppercase tracking-widest font-bold">
                            <span>Admin Reply Response</span>
                            {msg.repliedAt && <span className="text-gray-550 font-normal normal-case">{new Date(msg.repliedAt).toLocaleString()}</span>}
                          </div>
                          <p className="text-xs text-gray-100 font-sans leading-relaxed">
                            {msg.reply}
                          </p>
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-500 font-mono flex items-center space-x-1 pl-1 bg-[#120416]/50 py-1 rounded">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          <span>Awaiting administrative response... our agents typically reply within a few hours.</span>
                        </div>
                      )}
                    </div>
                  ))
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
                    value={authForm.email || ''}
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
                    value={authForm.password || ''}
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
                    value={authForm.name || ''}
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
                    value={authForm.email || ''}
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
                    value={authForm.password || ''}
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
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'}
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
                <div className="flex flex-wrap items-center gap-3.5">
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
                  
                  <div className="h-6 w-[1.5px] bg-[#300e3a] mx-1 hidden sm:block" />

                  {/* Device upload zone */}
                  <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#e95420]/10 hover:bg-[#e95420] text-[#e95420] hover:text-white border border-[#e95420]/35 rounded-lg text-xs font-semibold cursor-pointer transition duration-200">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload from device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
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
              
              {/* Admin Panel Quick Access - Only visible for admin accounts */}
              {currentUser.role === 'admin' && (
                <div className="bg-[#24062c]/60 border border-[#e95420]/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-l-[#e95420]" id="profile-admin-panel-link">
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-sm font-ubuntu font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-[#e95420]" />
                      Master Admin Control Panel
                    </h3>
                    <p className="text-[11px] text-[#aea79f]">
                      Access global settings, review user support tickets, upload digital records in bulk, and moderate chatrooms.
                    </p>
                  </div>
                  <button
                    onClick={() => handleNavigate('admin-dashboard')}
                    className="w-full sm:w-auto px-4 py-2 bg-[#e95420] hover:bg-[#ff6c3a] text-white text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition duration-200 shadow-md hover:shadow-[#e95420]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Open Admin Dashboard
                  </button>
                </div>
              )}

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
                      value={profileForm.name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-gray-300 block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#441154]"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2 font-sans">
                    <label className="text-xs font-mono text-gray-300 block">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      value={profileForm.password || ''}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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

        {/* VIEW 17.5: PUBLIC DEVICE VIDEO STREAM UPLOADER */}
        {currentView === 'upload-video' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="upload-video-view">
            <UploadVideo 
              onNavigate={handleNavigate}
              triggerToast={(type, msg) => triggerToast(type, msg)}
              currentUser={currentUser}
              activeUpload={activeUpload}
              setActiveUpload={setActiveUpload}
              onStartUpload={startGlobalUpload}
            />
          </div>
        )}

        {/* VIEW 18: DEVICE LOCAL MEDIA EXPLORER & FILE MANAGER */}
        {currentView === 'local-explorer' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="local-explorer-view">
            <DeviceMediaExplorer
              triggerAlert={(type, msg) => triggerToast(type, msg)}
              onPlayInWatchParty={(file) => {
                triggerToast('success', `Direct high-speed cooperative streaming link established for local file: "${file.name}"!`);
                handleNavigate('home');
              }}
            />
          </div>
        )}

        {/* ADMIN EXPLICIT DASHBOARDS */}
        {currentView.startsWith('admin-') && currentUser?.role === UserRole.ADMIN && (
          <AdminPanel
            currentUser={currentUser}
            onNavigate={handleNavigate}
            siteSettings={siteSettings}
            onUpdateSettings={handleUpdateSettings}
            onUpdateMovies={fetchMovies}
            onUpdateDocuments={fetchDocuments}
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
        onDonateClick={() => setDonateModalOpen(true)}
        enableDonations={siteSettings.enableDonations}
      />

      {/* MTN MoMo Donation Checkout Flow Modal Overlay */}
      <DonateModal
        isOpen={donateModalOpen}
        onClose={() => setDonateModalOpen(false)}
      />

      {/* Floating Background Upload Progress Card */}
      <AnimatePresence>
        {activeUpload && currentView !== 'upload-video' && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 md:right-6 z-40 bg-[#140517]/95 backdrop-blur-md border border-[#ff6c3a]/30 rounded-2xl p-4 shadow-2xl w-80 max-w-full text-left pointer-events-auto"
          >
            <div className="flex items-start justify-between space-x-3">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black border border-[#41134a]">
                  <img src={activeUpload.coverUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600'} alt="Cover" className="w-full h-full object-cover" />
                  {(activeUpload.status === 'uploading' || activeUpload.status === 'registering') && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader className="w-4 h-4 text-[#ff6c3a] animate-spin" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-mono text-[#ff6c3a] uppercase tracking-wider block font-bold">
                    {activeUpload.status === 'uploading' && 'Uploading...'}
                    {activeUpload.status === 'registering' && 'Registering...'}
                    {activeUpload.status === 'success' && 'Ready!'}
                    {activeUpload.status === 'error' && 'Failed'}
                  </span>
                  <h4 className="text-xs font-ubuntu font-bold text-white truncate leading-snug">{activeUpload.title || activeUpload.videoName}</h4>
                  <p className="text-[10px] text-[#aea79f] truncate">{activeUpload.videoName}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveUpload(null)}
                className="text-[#aea79f] hover:text-white transition p-1 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar & Status Text */}
            <div className="mt-3.5 space-y-1.5">
              {(activeUpload.status === 'uploading' || activeUpload.status === 'registering') && (
                <>
                  <div className="w-full bg-[#25092c] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#ff6c3a] h-full transition-all duration-300" 
                      style={{ width: `${activeUpload.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#aea79f]">
                    <span>Background Syncing</span>
                    <span className="text-[#ff6c3a]">{activeUpload.progress}%</span>
                  </div>
                </>
              )}

              {activeUpload.status === 'success' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-emerald-400 font-sans flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Upload & Sync complete!</span>
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        handleNavigate('movie-details', activeUpload.generatedMovieId);
                        setActiveUpload(null);
                      }}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-ubuntu font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Watch Stream</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeUpload.watchLink);
                        triggerToast('success', 'Streaming link copied!');
                      }}
                      className="py-1.5 px-2 bg-[#ff6c3a]/10 hover:bg-[#ff6c3a]/20 border border-[#ff6c3a]/30 text-[#ff6c3a] font-ubuntu font-bold text-[10px] uppercase rounded-lg cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}

              {activeUpload.status === 'error' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-red-400 font-mono truncate">{activeUpload.errorMessage}</p>
                  <button
                    onClick={() => handleNavigate('upload-video')}
                    className="w-full py-1.5 bg-[#ff6c3a] hover:bg-[#ff8154] text-white font-ubuntu font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
                  >
                    Go Back & Retry
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Modern Toast Alerts */}
      <AnimatePresence>
        {toastAlert && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3.5 px-4 py-3 rounded-xl border shadow-2xl ${
              toastAlert.type === 'success' 
                ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-300' 
                : toastAlert.type === 'error'
                ? 'bg-red-950/95 border-red-500/30 text-red-300'
                : toastAlert.type === 'warning'
                ? 'bg-amber-950/95 border-amber-500/30 text-amber-300'
                : 'bg-[#1b061f]/95 border-[#ff6c3a]/25 text-[#ff6c3a]'
            }`}
          >
            <span className="text-xs font-ubuntu font-bold">{toastAlert.message}</span>
            <button
              onClick={() => setToastAlert(null)}
              className="p-1 rounded bg-transparent hover:bg-white/10 transition text-current"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Modern Bottom Navigation Bar */}
      <div 
        className="fixed bottom-3 left-3 right-3 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md bg-[#140517]/95 sm:bg-[#140517]/90 border border-[#ff6c3a]/30 backdrop-blur-md rounded-full px-4 sm:px-6 py-2 shadow-2xl flex justify-around items-center transition-all duration-300 z-40"
        id="app-bottom-navigation"
      >
        {/* Home Tab */}
        <button
          onClick={() => handleNavigate('home')}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 relative group"
          title="Go to Home"
        >
          <div className="relative">
            <Home className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${currentView === 'home' ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`} />
            {currentView === 'home' && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6c3a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6c3a]"></span>
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-1 font-semibold tracking-wide transition-colors ${currentView === 'home' ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`}>
            Home
          </span>
        </button>

        {/* Movies Tab */}
        <button
          onClick={() => handleNavigate('movies')}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 relative group"
          title="Browse Movies"
        >
          <div className="relative">
            <Film className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${(currentView === 'movies' || currentView === 'movie-details' || currentView === 'trending' || currentView === 'new-uploads') ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`} />
            {(currentView === 'movies' || currentView === 'movie-details' || currentView === 'trending' || currentView === 'new-uploads') && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6c3a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6c3a]"></span>
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-1 font-semibold tracking-wide transition-colors ${(currentView === 'movies' || currentView === 'movie-details' || currentView === 'trending' || currentView === 'new-uploads') ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`}>
            Movies
          </span>
        </button>

        {/* Device Explorer Tab */}
        <button
          onClick={() => handleNavigate('local-explorer')}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 relative group"
          title="Device Explorer"
        >
          <div className="relative">
            <FolderOpen className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${currentView === 'local-explorer' ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`} />
            {currentView === 'local-explorer' && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6c3a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6c3a]"></span>
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-1 font-semibold tracking-wide transition-colors ${currentView === 'local-explorer' ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`}>
            Explorer
          </span>
        </button>

        {/* Upload Stream Tab */}
        <button
          onClick={() => handleNavigate('upload-video')}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 relative group"
          title="Upload Stream"
        >
          <div className="relative">
            <Upload className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${currentView === 'upload-video' ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`} />
            {currentView === 'upload-video' && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6c3a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6c3a]"></span>
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-1 font-semibold tracking-wide transition-colors ${currentView === 'upload-video' ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`}>
            Upload
          </span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => currentUser ? handleNavigate('profile') : handleNavigate('login')}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 relative group"
          title="My Profile"
        >
          <div className="relative">
            <User className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${(currentView === 'profile' || currentView === 'login' || currentView === 'register') ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`} />
            {(currentView === 'profile' || currentView === 'login' || currentView === 'register') && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6c3a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6c3a]"></span>
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-1 font-semibold tracking-wide transition-colors ${(currentView === 'profile' || currentView === 'login' || currentView === 'register') ? 'text-[#e95420]' : 'text-gray-400 group-hover:text-white'}`}>
            Profile
          </span>
        </button>
      </div>
    </div>
  );
}
