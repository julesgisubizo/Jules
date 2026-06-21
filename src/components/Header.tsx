/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Film, BookOpen, Search, Heart, User, Settings, LogOut, Menu, X, HelpCircle, Info, Bell, Smartphone, Download, Sparkles, Check } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string, id?: string) => void;
  currentUser: any | null;
  onLogout: () => void;
  onSearch: (query: string) => void;
  siteName: string;
}

export default function Header({
  currentView,
  onNavigate,
  currentUser,
  onLogout,
  onSearch,
  siteName
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch PWA notification stream dynamically if signed in
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const fetchNotifications = () => {
      fetch('/api/notifications')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setNotifications(data);
          }
        })
        .catch(() => {});
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleMarkAllRead = () => {
    fetch('/api/notifications/read', { method: 'POST' })
      .then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      })
      .catch(() => {});
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    onNavigate('search');
    setMobileMenuOpen(false);
  };

  const menuItems = [
    { view: 'home', label: 'Home', icon: Film },
    { view: 'movies', label: 'Movies', icon: Film },
    { view: 'trending', label: 'Trending', icon: Film },
    { view: 'new-uploads', label: 'New Releases', icon: Film },
    { view: 'documents', label: 'Educational Resources', icon: BookOpen },
    { view: 'downloads', label: 'Install App / APK', icon: Smartphone },
    { view: 'about', label: 'About', icon: Info },
    { view: 'faq', label: 'FAQs', icon: HelpCircle },
  ];

  const unreadNotifs = notifications.filter(n => !n.isRead);

  return (
    <header className="sticky top-0 z-50 bg-[#140517] border-b border-[#2b0e33] backdrop-blur-md bg-opacity-95 text-white shadow-md" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('home')}>
            <span className="p-2 bg-[#e95420] text-white rounded-lg font-ubuntu font-bold shadow-lg flex items-center justify-center">
              <Film className="w-5 h-5" />
            </span>
            <span className="font-ubuntu text-xl font-bold tracking-tight bg-gradient-to-r from-[#f1f1f1] to-[#e95420] bg-clip-text text-transparent">
              {siteName || "Ubuntu Flimsy"}
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  id={`nav-link-${item.view}`}
                  onClick={() => onNavigate(item.view)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:text-[#e95420] hover:bg-[#2c0b34] ${
                    isActive ? 'text-[#e95420] bg-[#220729]' : 'text-[#eaeaea]'
                  }`}
                >
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>

          {/* Search, Watchlist, Auth Controls */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies & docs..."
                className="w-48 lg:w-64 bg-[#23092a] text-sm text-gray-200 placeholder-gray-400 pl-10 pr-4 py-1.5 rounded-full border border-[#431952] focus:outline-none focus:border-[#e95420] focus:ring-1 focus:ring-[#e95420] transition-all"
                id="search-input-desktop"
              />
              <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-gray-400" />
            </form>

            {/* Watchlist */}
            {currentUser && (
              <button
                onClick={() => onNavigate('watchlist')}
                className={`p-2 rounded-full relative transition-colors ${
                  currentView === 'watchlist' ? 'text-[#e95420] bg-[#220729]' : 'text-gray-300 hover:text-white hover:bg-[#25092cf2]'
                }`}
                title="Watchlist"
                id="watchlist-btn-desktop"
              >
                <Heart className="w-5 h-5 fill-current" />
                {currentUser.watchlist && currentUser.watchlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#e95420] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                    {currentUser.watchlist.length}
                  </span>
                )}
              </button>
            )}

            {/* Live Movie PWA/Android Notification Stream */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className={`p-2 rounded-full relative transition-colors ${
                    notifDropdownOpen || notifications.some(n => !n.isRead) ? 'text-[#e95420] bg-[#220729]' : 'text-gray-300 hover:text-white hover:bg-[#25092cf2]'
                  }`}
                  title="Notifications & Movie Alerts"
                  id="notifications-bell-btn"
                >
                  <Bell className={`w-5 h-5 ${unreadNotifs.length > 0 ? 'animate-bounce text-[#e95420]' : ''}`} />
                  {unreadNotifs.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse border border-[#140517]">
                      {unreadNotifs.length}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-[#16061c] border border-[#451352] rounded-xl shadow-2xl py-2 z-50 text-left overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#310c3b] flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-gray-200 uppercase tracking-wider">Device Alert Desk</span>
                      {unreadNotifs.length > 0 && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAllRead();
                          }} 
                          className="text-[10px] text-[#e95420] hover:underline font-mono"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-[#2a0b33]">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400 font-mono">
                          No alerts received on this device yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              setNotifDropdownOpen(false);
                              // Mark this alert as read on-the-fly dynamically
                              fetch('/api/notifications/read', { method: 'POST' }).catch(() => {});
                              onNavigate('movie-details', notif.movieId);
                            }}
                            className={`p-3 text-xs cursor-pointer transition-colors hover:bg-[#26092e] ${!notif.isRead ? 'bg-[#290a31]/45 border-l-2 border-[#e95420]' : ''}`}
                          >
                            <div className="font-semibold text-gray-200 flex justify-between items-start gap-1">
                              <span>{notif.title}</span>
                              {!notif.isRead && (
                                <span className="bg-[#e95420] text-white text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded tracking-widest">NEW</span>
                              )}
                            </div>
                            <p className="text-gray-400 font-sans mt-0.5 leading-relaxed">{notif.body}</p>
                            <span className="text-[9px] font-mono text-gray-500 block mt-1">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  onBlur={() => setTimeout(() => setUserDropdownOpen(false), 200)}
                  className="flex items-center space-x-2 focus:outline-none"
                  id="user-profile-menu-btn"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'}
                    alt="avatar"
                    className="w-8 h-8 rounded-full border border-[#e95420] object-cover"
                  />
                  <span className="text-sm font-medium text-gray-100 max-w-[100px] truncate">{currentUser.name}</span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1a0720] border border-[#3e144a] rounded-lg shadow-xl py-1 z-50 text-left">
                    <div className="px-4 py-2 border-b border-[#310c3b] text-xs text-[#aea79f] font-mono">
                      Logged in as <span className="text-[#e95420] font-semibold">{currentUser.role}</span>
                    </div>

                    <button
                      onClick={() => onNavigate('profile')}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[#2a0e33] hover:text-white flex items-center space-x-2"
                    >
                      <User className="w-4 h-4 text-[#e95420]" />
                      <span>My Profile</span>
                    </button>

                    {currentUser.role === UserRole.ADMIN && (
                      <button
                        onClick={() => onNavigate('admin-dashboard')}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[#2a0e33] hover:text-white flex items-center space-x-2 font-semibold text-[#e95420]"
                      >
                        <Settings className="w-4 h-4 text-[#e95420]" />
                        <span>Admin Panel</span>
                      </button>
                    )}

                    <button
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-[#2d0505] flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3 py-1.5 text-sm font-medium hover:text-white transition text-gray-300"
                  id="header-login-btn"
                >
                  Login
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-4 py-1.5 text-sm font-bold bg-[#e95420] text-white rounded-full hover:bg-[#ff6936] transition shadow-md"
                  id="header-register-btn"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center space-x-2">
            {currentUser && (
              <button
                onClick={() => onNavigate('watchlist')}
                className="p-1.5 text-gray-300 hover:text-white"
                id="watchlist-btn-mobile"
              >
                <Heart className="w-5 h-5 fill-current text-[#e95420]" />
              </button>
            )}
            
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="p-1.5 text-gray-200 hover:text-white relative"
                  id="notif-btn-mobile"
                >
                  <Bell className="w-5 h-5 text-[#e95420]" />
                  {unreadNotifs.length > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifs.length}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-[#120416] border border-[#44124e] rounded-lg shadow-2xl py-2 z-50 text-left">
                    <div className="px-3 py-1.5 border-b border-[#2e0932] flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-gray-300">Live Device Alerts</span>
                      {unreadNotifs.length > 0 && (
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }} 
                          className="text-[10px] text-[#e95420] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-[#220726]">
                      {notifications.length === 0 ? (
                        <div className="p-3 text-center text-[11px] text-gray-400 font-mono">No alerts.</div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id}
                            onClick={() => {
                              setNotifDropdownOpen(false);
                              setMobileMenuOpen(false);
                              fetch('/api/notifications/read', { method: 'POST' }).catch(() => {});
                              onNavigate('movie-details', n.movieId);
                            }}
                            className="p-2.5 hover:bg-[#200424] text-[11px] cursor-pointer"
                          >
                            <span className="font-semibold text-gray-200 block">{n.title}</span>
                            <p className="text-gray-400 font-sans leading-tight mt-0.5">{n.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-gray-300 hover:text-white focus:outline-none"
              id="mobile-menu-toggle-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#16061a] border-t border-[#2d0e36] px-4 pt-2 pb-4 space-y-3" id="mobile-navigation-panel">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative mt-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies & resources..."
              className="w-full bg-[#25092c] text-sm text-gray-200 placeholder-gray-400 pl-10 pr-4 py-2 rounded-full border border-[#441a52] focus:outline-none focus:border-[#e95420]"
              id="search-input-mobile"
            />
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          </form>

          {/* Navigation Links */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    onNavigate(item.view);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-base font-medium flex items-center space-x-3 ${
                    currentView === item.view ? 'text-[#e95420] bg-[#290a31]' : 'text-gray-300 hover:text-white hover:bg-[#250a2e]'
                  }`}
                >
                  <Icon className="w-5 h-5 text-[#e95420]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Auth Info Mobile */}
          <div className="pt-4 border-t border-[#310c3c]">
            {currentUser ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 px-3 py-2">
                  <img
                    src={currentUser.avatar}
                    alt="avatar"
                    className="w-10 h-10 rounded-full border border-[#e95420]"
                  />
                  <div>
                    <div className="text-sm font-semibold">{currentUser.name}</div>
                    <div className="text-xs text-orange-400 uppercase tracking-widest">{currentUser.role}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 px-3">
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 text-center text-sm font-medium bg-[#240a2c] text-gray-200 rounded-lg hover:bg-[#340f3f]"
                  >
                    Profile
                  </button>
                  {currentUser.role === UserRole.ADMIN && (
                    <button
                      onClick={() => {
                        onNavigate('admin-dashboard');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2 text-center text-sm font-bold bg-[#e95420] text-white rounded-lg"
                    >
                      Admin Panel
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full mt-2 py-2 text-center text-sm font-medium bg-red-950/40 text-red-400 rounded-lg border border-red-900/30"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 px-3">
                <button
                  onClick={() => {
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-sm font-medium bg-[#2c0b36] text-gray-200 rounded-lg"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    onNavigate('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-sm font-bold bg-[#e95420] text-white rounded-lg"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
