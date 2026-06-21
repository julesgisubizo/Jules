/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Maximize, Share2, Download, Heart, ThumbsUp, Send, Trash2, ShieldAlert, Sparkles, AlertTriangle, Users, ArrowLeft, Check } from 'lucide-react';
import { Movie, ChatRoom, ChatMessage, UserRole } from '../types';

interface WatchPartyProps {
  movie: Movie;
  currentUser: any | null;
  onNavigate: (view: string, id?: string) => void;
  onTrackDownload: (itemId: string, itemType: string) => void;
}

export default function WatchParty({
  movie,
  currentUser,
  onNavigate,
  onTrackDownload
}: WatchPartyProps) {
  // Auto detect if the movie stream is an iframe or third-party embed
  const isEmbedLikely = (url: string) => {
    if (!url) return false;
    const clean = url.toLowerCase();
    return (
      clean.includes('youtube.com') ||
      clean.includes('youtu.be') ||
      clean.includes('vimeo.com') ||
      clean.includes('drive.google.com') ||
      clean.includes('/embed/') ||
      clean.includes('twitch.tv') ||
      clean.startsWith('<iframe')
    );
  };

  const getEmbedLink = (url: string) => {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('<iframe')) {
      const match = clean.match(/src="([^"]+)"/);
      if (match) return match[1];
    }
    // YouTube convertor
    if (clean.includes('youtube.com/watch')) {
      try {
        const u = new URL(clean);
        const v = u.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`;
      } catch (e) {}
    }
    if (clean.includes('youtu.be/')) {
      const parts = clean.split('youtu.be/');
      if (parts[1]) {
        const id = parts[1].split('?')[0].split('/')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
    }
    // Google Drive convertor
    if (clean.includes('drive.google.com/file/d/')) {
      const parts = clean.split('/file/d/');
      if (parts[1]) {
        const id = parts[1].split('/')[0];
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    }
    // Vimeo convertor
    if (clean.includes('vimeo.com/')) {
      const parts = clean.split('vimeo.com/');
      if (parts[1]) {
        const id = parts[1].split('?')[0].split('/')[0];
        if (/^\d+$/.test(id)) {
          return `https://player.vimeo.com/video/${id}?autoplay=1`;
        }
      }
    }
    return clean;
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const [likes, setLikes] = useState(movie.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferState, setBufferState] = useState(false);
  const [activePlayer, setActivePlayer] = useState<'video' | 'iframe'>(
    isEmbedLikely(movie.watch_link) ? 'iframe' : 'video'
  );

  // Chat/Room State
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [onlineParticipants, setOnlineParticipants] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isTypingList, setIsTypingList] = useState<string[]>([]);
  const [showShareBadge, setShowShareBadge] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const triggerToast = (type: 'error' | 'success' | 'info', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<any>(null);

  // Fetch or Auto-create room and history
  useEffect(() => {
    // Increment Movie Views
    fetch(`/api/movies/${movie.id}/view`, { method: 'POST' }).catch(() => {});

    // Sync watchlist/favorite status
    if (currentUser) {
      setIsFavorited(currentUser.watchlist?.includes(movie.id) || false);
    }

    // Load watch room details
    fetch(`/api/rooms/${movie.id}`)
      .then(r => r.json())
      .then(roomData => {
        setRoom(roomData);
        // Load messages
        if (roomData.id) {
          fetchMessages(roomData.id);
        }
      })
      .catch(console.error);

    // Load continue watching local state
    const savedTime = localStorage.getItem(`playback-time-${movie.id}`);
    if (savedTime && videoRef.current) {
      const parsed = parseFloat(savedTime);
      if (!isNaN(parsed) && parsed > 5) {
        setCurrentTime(parsed);
        videoRef.current.currentTime = parsed;
      }
    }
  }, [movie.id, currentUser]);

  // Polling for Sync real-time watch party chat and participant lists
  useEffect(() => {
    if (!room || !room.id) return;

    const interval = setInterval(() => {
      // Fetch messages
      fetchMessages(room.id);

      // Presence / Sync status ping
      if (currentUser) {
        fetch(`/api/rooms/${room.id}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            typing: isTyping,
            playbackTime: videoRef.current?.currentTime || 0,
            isPlaying: isPlaying
          })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setOnlineParticipants(data.activeUsers || []);
              
              const typists = data.activeUsers
                ?.filter((u: any) => u.typing && u.id !== currentUser.id)
                ?.map((u: any) => u.name) || [];
              setIsTypingList(typists);

              // Scroll to bottom if bot wrote a message
              if (data.botMessageGenerated) {
                fetchMessages(room.id);
              }
            }
          })
          .catch(() => {});
      } else {
        // Unlogged list poll
        fetch(`/api/rooms/${room.id}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setOnlineParticipants(data.activeUsers || []);
            }
          })
          .catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [room, currentUser, isTyping, isPlaying]);

  // Scroll to bottom of chat helper locally (no parent page scrolls)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = (roomId: string) => {
    fetch(`/api/rooms/${roomId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(() => {});
  };

  // Video Events
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      setBufferState(true);
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setBufferState(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setBufferState(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    // Save state once in a while
    if (Math.floor(time) % 5 === 0) {
      localStorage.setItem(`playback-time-${movie.id}`, time.toString());
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseFloat(e.target.value);
    setPlaybackSpeed(val);
    if (videoRef.current) {
      videoRef.current.playbackRate = val;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
    }
  };

  const seekPlayback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleFullscreenToggle = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Interactive UI clicks
  const handleLikeClick = () => {
    if (hasLiked) return;
    fetch(`/api/movies/${movie.id}/like`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLikes(data.likes);
          setHasLiked(true);
        }
      })
      .catch(() => {});
  };

  const handleFavoriteClick = () => {
    if (!currentUser) {
      triggerToast('error', "Please login to save to your watchlist.");
      onNavigate('login');
      return;
    }

    fetch(`/api/movies/${movie.id}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsFavorited(data.added);
          if (currentUser.watchlist) {
            if (data.added) {
              currentUser.watchlist.push(movie.id);
            } else {
              currentUser.watchlist = currentUser.watchlist.filter((id: string) => id !== movie.id);
            }
          }
        }
      })
      .catch(() => {});
  };

  // Chat message send
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      triggerToast('error', "Please login or register to write in watch party chats!");
      onNavigate('login');
      return;
    }
    if (!chatInput.trim() || !room) return;

    const msgText = chatInput.trim();
    setChatInput('');
    setIsTyping(false);

    fetch(`/api/rooms/${room.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        message: msgText
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Immediately sync local chat message
          setMessages(prev => [...prev, data.message]);
        } else if (data.error) {
          triggerToast('error', data.error);
        }
      })
      .catch(console.error);
  };

  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
    }
    // Debounce isTyping back to false after 3s
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3500);
  };

  const handleMessageDelete = (messageId: string) => {
    setMessageToDelete(messageId);
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShowShareBadge(true);
      setTimeout(() => setShowShareBadge(false), 2500);
    });
  };

  const formatVideoTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-left" id="watch-party-container">
      {/* Navigation Back Button */}
      <button
        onClick={() => onNavigate('movies')}
        className="flex items-center space-x-2 text-[#aea79f] hover:text-[#e95420] transition font-mono mb-4 text-sm"
        id="back-to-movies-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Catalog</span>
      </button>

      {/* Grid Layout: Player (Col span 3) + Real-time chat (Col span 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Cinematic Video Player Section */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          {/* Player Mode Switcher Tab */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-mono text-orange-400 uppercase tracking-widest font-bold">🎬 active media channel</span>
            <div className="flex items-center space-x-1.5 p-0.5 bg-[#1b0820] border border-[#3e114a] rounded-lg">
              <button
                type="button"
                onClick={() => setActivePlayer('video')}
                className={`px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                  activePlayer === 'video'
                    ? 'bg-[#e95420] text-white shadow-md font-extrabold font-sans'
                    : 'text-gray-400 hover:text-white font-sans font-medium'
                }`}
              >
                HTML5 Video tag
              </button>
              <button
                type="button"
                onClick={() => setActivePlayer('iframe')}
                className={`px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                  activePlayer === 'iframe'
                    ? 'bg-[#e95420] text-white shadow-md font-extrabold font-sans'
                    : 'text-gray-400 hover:text-white font-sans font-medium'
                }`}
              >
                External Frame Embed
              </button>
            </div>
          </div>

          <div
            ref={videoContainerRef}
            className="relative bg-black rounded-xl overflow-hidden border border-[#2b0e33] flex flex-col"
            id="cinematic-video-stage"
          >
            {/* Conditional Media Player */}
            {activePlayer === 'iframe' ? (
              <iframe
                src={getEmbedLink(movie.watch_link)}
                className="w-full aspect-video object-contain"
                title={`${movie.title} Live Stream`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                id="iframe-main-stream"
              />
            ) : (
              <video
                ref={videoRef}
                src={movie.watch_link}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                className="w-full aspect-video object-contain"
                id="html5-main-stream"
              />
            )}

            {/* Custom Interface Overlay when loading/buffering */}
            {bufferState && activePlayer === 'video' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                <span className="w-12 h-12 border-4 border-[#e95420] border-t-transparent rounded-full animate-spin mb-3"></span>
                <span className="text-sm font-mono text-[#aea79f] tracking-widest uppercase">Connecting to Stream...</span>
              </div>
            )}

            {/* Playback Controls Panel */}
            {activePlayer === 'video' ? (
              <div className="bg-[#110114] px-4 py-2 flex flex-col space-y-2 border-t border-[#23052b]">
                {/* Timeline scrub tracking slider */}
                <div className="flex items-center space-x-3 text-xs text-[#aea79f] font-mono">
                  <span>{formatVideoTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={seekPlayback}
                    className="flex-1 accent-[#e95420] h-1 bg-[#250d2e] rounded-lg cursor-pointer py-1"
                  />
                  <span>{formatVideoTime(duration)}</span>
                </div>

                {/* Sub-controls line */}
                <div className="flex items-center justify-between text-gray-200">
                  <div className="flex items-center space-x-4">
                    <button onClick={togglePlay} className="p-1.5 hover:text-[#e95420] transition-colors" id="btn-play-stream">
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    {/* Volume slider control */}
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-gray-400" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-16 lg:w-24 accent-[#e95420] h-1 bg-[#250d2e] rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Right utility options */}
                  <div className="flex items-center space-x-3 text-xs">
                    {/* Continue watching timestamp tag if relevant */}
                    {currentTime > 10 && (
                      <span className="hidden sm:inline bg-[#77216f] text-white px-2 py-0.5 rounded font-mono">
                        Autosaved: {formatVideoTime(currentTime)}
                      </span>
                    )}

                    {/* Rate Control */}
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-400 font-mono">Speed:</span>
                      <select
                        value={playbackSpeed}
                        onChange={handleSpeedChange}
                        className="bg-[#240a2c] text-white text-xs px-2 py-1 rounded border border-[#441352] outline-none cursor-pointer"
                      >
                        <option value="0.5">0.5x</option>
                        <option value="1">Normal</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                      </select>
                    </div>

                    {/* Watch stream in new tab bypass redirect */}
                    <a
                      href={movie.watch_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-orange-400 hover:text-orange-500 hover:bg-[#250d2e] rounded transition"
                      title="Watch stream in new tab (bypasses browser sandboxing block)"
                    >
                      <Share2 className="w-4 h-4 rotate-90" />
                    </a>

                    {/* Stretch to full button */}
                    <button onClick={handleFullscreenToggle} className="p-1 hover:text-[#e95420] transition">
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#110114] px-4 py-3 flex items-center justify-between border-t border-[#23052b] text-xs font-mono text-[#aea79f]">
                <span className="flex items-center space-x-1.5 text-[11px]">
                  <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                  <span>Playback controls are handled directly inside the third-party iframe embed above.</span>
                </span>
                <a
                  href={movie.watch_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#e95420]/15 hover:bg-[#e95420]/25 rounded text-orange-400 border border-[#e95420]/35 transition font-sans text-[11px] font-bold"
                >
                  🚀 Open Direct URL ↗
                </a>
              </div>
            )}
          </div>

          {/* Film Details Info Box */}
          <div className="bg-[#120415] border border-[#270b30] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-1 bg-[#e95420] text-[10px] font-bold text-white rounded uppercase font-mono">{movie.quality}</span>
                  <span className="text-xs text-orange-400 font-mono tracking-widest">{movie.country} • {movie.year}</span>
                  <span className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 rounded text-[10px] font-mono font-medium flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Free Public Stream • No Login Required</span>
                  </span>
                </div>
                <h1 className="font-ubuntu text-2xl font-bold text-white mt-1">{movie.title}</h1>
              </div>

              {/* Interaction Row (Watchlist, Like, Share, Download) */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLikeClick}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition ${
                    hasLiked 
                      ? 'bg-[#e95420] text-white border-transparent'
                      : 'bg-[#210927] hover:bg-[#340c3d] text-gray-200 border-[#471954]'
                  }`}
                  id="btn-like-movie"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{likes} Likes</span>
                </button>

                <button
                  onClick={handleFavoriteClick}
                  className={`p-2 rounded-full border transition ${
                    isFavorited
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-[#210927] text-gray-300 border-[#471954] hover:text-white'
                  }`}
                  id="btn-favorite-movie"
                  title="Add to watchlist"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                </button>

                {/* Send share clipboard link */}
                <button
                  onClick={copyShareLink}
                  className="p-2 rounded-full bg-[#210927] text-gray-300 border-[#471954] border hover:text-white relative"
                  title="Share Movie Link"
                  id="btn-share-movie"
                >
                  <Share2 className="w-4 h-4" />
                  {showShareBadge && (
                    <span className="absolute bottom-8 right-0 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded w-28 text-center animate-bounce">
                      Copied with Success!
                    </span>
                  )}
                </button>

                {/* Real Stream Download link */}
                {movie.download_link && (
                  <a
                    href={movie.download_link}
                    onClick={() => onTrackDownload(movie.id, 'movie')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-[#e95420] text-white hover:bg-[#ff6c3a] shadow flex items-center justify-center transition"
                    title="Download Film"
                    id="link-download-movie"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Description Text */}
            <p className="text-[#eaeaea] text-sm leading-relaxed border-t border-[#23092b] pt-4.5">
              {movie.description}
            </p>

            {/* Details Fields Table */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4.5 text-xs text-[#aea79f] border-t border-[#23092b] font-mono">
              <div>
                <span className="block text-[#e95420] font-semibold">Duration</span>
                <span className="text-white font-sans">{movie.duration}</span>
              </div>
              <div>
                <span className="block text-[#e95420] font-semibold">Language</span>
                <span className="text-white font-sans">{movie.language}</span>
              </div>
              <div>
                <span className="block text-[#e95420] font-semibold text-xs text-left">Genres</span>
                <span className="text-white font-sans">{movie.genre.join(', ')}</span>
              </div>
              <div>
                <span className="block text-[#e95420] font-semibold text-xs text-left">Tags</span>
                <span className="text-white font-sans">{movie.tags.length > 0 ? movie.tags.slice(0, 3).join(', ') : 'None'}</span>
              </div>
            </div>

            {/* Visual alert if user encounters streaming/download issues */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-2 flex items-start space-x-3 text-left">
              <span className="p-1.5 bg-amber-500/15 rounded text-amber-500 flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
              </span>
              <div className="space-y-1">
                <strong className="text-xs text-amber-400 block font-ubuntu font-bold">Having trouble playing or downloading movies?</strong>
                <p className="text-[11px] text-[#aea79f] font-sans leading-relaxed">
                  As this sandbox runs inside a restricted browser iframe preview, direct video playbacks or save-links may occasionally get sandboxed. Open the application in a <strong className="text-white font-ubuntu">new tab</strong> using the button in the header, or trigger direct playbacks outside the frame using the links below:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px]">
                  <a
                    href={movie.watch_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-[#e95420]/15 border border-[#e95420]/30 hover:bg-[#e95420]/25 rounded text-[#ffc8b5] transition-colors inline-block"
                  >
                    🚀 Direct Stream Mirror ↗
                  </a>
                  {movie.download_link && (
                    <a
                      href={movie.download_link}
                      download={`${movie.slug || movie.id}.mp4`}
                      onClick={() => onTrackDownload(movie.id, 'movie')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-950/20 border border-emerald-800/30 hover:bg-emerald-950/35 rounded text-emerald-300 transition-colors inline-block"
                    >
                      ⚓ Force Download File (.mp4) ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time sync watch party chat drawer */}
        <div className="bg-[#120315] border border-[#2b0e33] rounded-xl flex flex-col h-[520px] lg:h-auto" id="watch-party-chat-room">
          
          {/* Box Header */}
          <div className="p-4.5 border-b border-[#250d2e] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-1.5 font-ubuntu">
                <Sparkles className="w-4 h-4 text-[#e95420] animate-pulse" />
                <span>Sync Watch Party</span>
              </h2>
              <div className="text-[10px] text-orange-400 font-mono mt-0.5 flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{onlineParticipants.length + 1} online watchers</span>
              </div>
            </div>

            {/* Room Active badge */}
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" title="Database Listening live" />
          </div>

          {/* Active Watchers list */}
          <div className="px-4 py-2 border-b border-[#1c0822] bg-[#1a081e] flex items-center space-x-1.5 overflow-x-auto">
            <span className="text-[10px] text-gray-400 font-mono font-medium flex-shrink-0">Online:</span>
            {onlineParticipants.slice(0, 4).map((p, i) => (
              <img
                key={i}
                src={p.avatar}
                alt={p.name}
                className="w-5 h-5 rounded-full border border-gray-600 object-cover flex-shrink-0"
                title={p.name}
              />
            ))}
            {onlineParticipants.length > 4 && (
              <span className="text-[9px] font-mono font-bold bg-[#e95420] text-white rounded px-1 flex-shrink-0">
                +{onlineParticipants.length - 4} More
              </span>
            )}
          </div>

          {/* Locked Status banner */}
          {room && !room.isActive && (
            <div className="p-2 bg-red-950/40 text-red-400 border-b border-red-900/30 text-xs flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Room is temporarily disabled by admin moderation.</span>
            </div>
          )}

          {/* Messages Lists */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                <Users className="w-8 h-8 text-[#4a1c54]" />
                <p className="text-xs text-[#aea79f]">
                  No comments yet in this Watch Room. Type a real-time message below to start the party!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUser && msg.userId === currentUser.id;
                const isAdmin = currentUser?.role === UserRole.ADMIN;
                return (
                  <div key={msg.id} className={`flex items-start space-x-2.5 text-left ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <img
                      src={msg.userAvatar}
                      alt={msg.userName}
                      className="w-7 h-7 rounded-full border border-orange-500/10 object-cover flex-shrink-0"
                    />
                    <div className="max-w-[80%]">
                      <div className={`flex items-baseline space-x-1.5 mb-0.5 ${isMe ? 'justify-end' : ''}`}>
                        <span className="text-[10px] font-bold text-gray-300 tracking-wide font-sans">{msg.userName}</span>
                        <span className="text-[8px] text-gray-500 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {/* Mod Panel */}
                        {isAdmin && (
                          <button
                            onClick={() => handleMessageDelete(msg.id)}
                            className="text-red-400 hover:text-red-500 p-0.5 transition"
                            title="Admin delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className={`px-3 py-2 rounded-xl text-xs space-y-1 ${
                        isMe 
                          ? 'bg-[#e95420] text-white rounded-tr-none'
                          : 'bg-[#250d2e] text-gray-100 border border-[#3e144c]/30 rounded-tl-none'
                      }`}>
                        <p className="leading-relaxed break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Typing state indications */}
          {isTypingList.length > 0 && (
            <div className="px-4 py-1 text-[10px] text-[#e95420] italic font-mono animate-pulse text-left">
              {isTypingList.join(', ')} {isTypingList.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Form Actions footer */}
          <div className="p-3 border-t border-[#250d2e] bg-[#110114b0]">
            {currentUser ? (
              <form onSubmit={handleSendChat} className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={handleChatInputChange}
                  disabled={room && !room.isActive}
                  placeholder={room && !room.isActive ? "Room is locked by moderation" : "Say something about this scene..."}
                  className="flex-1 bg-[#23092a] text-xs text-gray-100 placeholder-gray-400 px-3.5 py-2 rounded-full border border-[#441154] focus:outline-none focus:border-[#e95420]"
                  id="chat-input-text"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || (room && !room.isActive)}
                  className="p-2 bg-[#e95420] hover:bg-[#ff6936] text-white rounded-full transition-colors flex items-center justify-center shadow disabled:opacity-50"
                  id="chat-send-btn"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="text-center py-1.5 px-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="text-xs text-[#e95420] hover:underline font-bold font-ubuntu block"
                >
                  Sign In to Live Chat with other Watchers!
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating corner toast notifier */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-pulse" id="stream-toast-notification">
          <div className={`px-4 py-3 rounded-xl border shadow-xl flex items-center space-x-2 text-xs font-semibold ${
            toastMsg.type === 'error' 
              ? 'bg-red-950/90 text-red-300 border-red-950/60' 
              : 'bg-emerald-950/90 text-emerald-300 border-emerald-950/60'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping" />
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Modern message moderation custom popup prompt */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm" id="msg-delete-modal">
          <div className="bg-[#120415] border border-red-500/25 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in">
            <h2 className="text-base font-bold font-ubuntu text-white">Moderate Live Chat?</h2>
            <p className="text-xs text-[#aea79f] font-sans leading-relaxed">
              Are you sure you want to remove this message from the Watch Party live chat room? This action is permanent and cannot be undone.
            </p>
            <div className="flex items-center space-x-3 text-xs font-mono font-medium">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="flex-1 py-2 bg-zinc-800 text-gray-200 rounded-lg hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = messageToDelete;
                  fetch(`/api/rooms/${room?.id}/messages/${id}`, {
                    method: 'POST'
                  }).then(() => {
                    setMessages(prev => prev.filter(m => m.id !== id));
                    setMessageToDelete(null);
                    triggerToast('success', "Message removed successfully.");
                  });
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
