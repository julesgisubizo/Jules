import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Share2, Copy, Check, Loader, Sparkles, ArrowRight, ExternalLink, Film, Download, AlertCircle, FileText, Image } from 'lucide-react';
import { apiFetch as fetch } from '../apiFetch';

interface UploadVideoProps {
  onNavigate: (view: string, id?: string) => void;
  triggerToast: (type: 'success' | 'error' | 'info', message: string) => void;
  currentUser: any;
  activeUpload: any;
  setActiveUpload: (u: any) => void;
  onStartUpload: (file: File, metadata: any) => void;
}

const PRESET_COVERS = [
  { url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600", label: "Cinema Reels" },
  { url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600", label: "Classic Film" },
  { url: "https://images.unsplash.com/photo-1542204111-970c2a009fb1?w=600", label: "Epic Adventure" },
  { url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600", label: "Sci-Fi Space" },
  { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600", label: "Documentary Nature" }
];

export default function UploadVideo({ onNavigate, triggerToast, currentUser, activeUpload, setActiveUpload, onStartUpload }: UploadVideoProps) {
  // Video File States
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoName, setVideoName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Poster / Cover Image States
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0].url);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Metadata Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Community');
  const [language, setLanguage] = useState('English');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [duration, setDuration] = useState('Community Stream');

  // Synchronize state with parent activeUpload
  const uploadStatus = activeUpload ? activeUpload.status : 'idle';
  const uploadProgress = activeUpload ? activeUpload.progress : 0;
  const errorMessage = activeUpload ? activeUpload.errorMessage : '';
  const generatedMovieId = activeUpload ? activeUpload.generatedMovieId : '';
  const watchLink = activeUpload ? activeUpload.watchLink : '';
  const downloadLink = activeUpload ? activeUpload.downloadLink : '';

  // Copy Feedback States
  const [copiedWatch, setCopiedWatch] = useState(false);
  const [copiedDownload, setCopiedDownload] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Drag and drop events
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      handleSelectVideo(file);
    } else {
      triggerToast('error', 'Please select a valid video file (.mp4, .mkv, etc.)');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectVideo(file);
    }
  };

  const handleSelectVideo = (file: File) => {
    setVideoFile(file);
    setVideoName(file.name);
    // Pre-fill Title with a sanitized file name
    const sanitizedTitle = file.name
      .replace(/\.[^/.]+$/, "") // remove extension
      .replace(/[_-]/g, " ")     // replace dashes/underscores with spaces
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    setTitle(sanitizedTitle);
  };

  // Upload Poster / Cover Simulator
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingCover(true);
      triggerToast('info', 'Uploading cover art... Please wait.');
      const reader = new FileReader();
      reader.onloadend = () => {
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
            setIsUploadingCover(false);
            if (data.success) {
              setCoverUrl(data.url);
              triggerToast('success', 'Custom cover uploaded successfully!');
            } else {
              triggerToast('error', 'Failed uploading cover art.');
            }
          })
          .catch(() => {
            setIsUploadingCover(false);
            triggerToast('error', 'Network error uploading cover.');
          });
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit and Upload Video Flow
  const handleStartUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      triggerToast('error', 'Please select or drop a video file first.');
      return;
    }
    if (!title.trim()) {
      triggerToast('error', 'Please enter a title for your stream.');
      return;
    }

    onStartUpload(videoFile, {
      title: title.trim(),
      description: description.trim(),
      genre,
      language,
      year,
      duration,
      coverUrl
    });
  };

  const handleCopyLink = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      triggerToast('success', 'Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShareClick = () => {
    const shareText = `🍿 Watch "${title}" on Ubuntu Flimsy!
 
 📺 Stream directly: ${watchLink}
 ⚓ Download File: ${downloadLink}`;
 
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `Watch "${title}" on Ubuntu Flimsy!`,
        url: watchLink
      })
        .then(() => {
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 2000);
        })
        .catch(() => {
          navigator.clipboard.writeText(shareText).then(() => {
            setCopiedShare(true);
            triggerToast('success', 'Share links copied to clipboard!');
            setTimeout(() => setCopiedShare(false), 2000);
          });
        });
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopiedShare(true);
        triggerToast('success', 'Share links copied to clipboard!');
        setTimeout(() => setCopiedShare(false), 2000);
      });
    }
  };

  const handleReset = () => {
    setVideoFile(null);
    setVideoName('');
    setTitle('');
    setDescription('');
    setActiveUpload(null);
  };

  if (!currentUser) {
    return (
      <div className="bg-[#140517] border border-[#2b0e33] rounded-2xl p-6 sm:p-10 md:p-12 max-w-2xl mx-auto shadow-2xl text-center space-y-6 animate-fade-in" id="upload-auth-locked">
        <div className="w-16 h-16 bg-[#ff6c3a]/10 border-2 border-[#ff6c3a]/30 text-[#ff6c3a] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-orange-600/5 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#ff6c3a]/10 border border-[#ff6c3a]/20 text-[#ff6c3a] text-[10px] font-mono uppercase tracking-wider font-bold">
            Authorized Members Only
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-ubuntu text-white">Direct Upload Locked</h1>
          <p className="text-xs sm:text-sm text-[#aea79f] font-sans max-w-md mx-auto leading-relaxed">
            Only verified members with an active community account can upload videos, configure custom cover art, and generate high-speed watch & download mirrors.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-3 bg-gradient-to-r from-[#e95420] to-[#ff6c3a] hover:from-[#ff6c3a] hover:to-[#ff8154] text-white font-ubuntu font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
          >
            Log In / Register Now
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="w-full py-3 bg-[#1b0820] hover:bg-[#2c0f33] border border-[#41134a] text-[#aea79f] hover:text-white font-ubuntu font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Explore Movies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#140517] border border-[#2b0e33] rounded-2xl p-4 sm:p-6 md:p-8 max-w-4xl mx-auto shadow-2xl animate-fade-in" id="upload-video-container">
      {/* View Header */}
      <div className="border-b border-[#2b0c36] pb-5 mb-6 text-center md:text-left">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#ff6c3a]/10 border border-[#ff6c3a]/20 text-[#ff6c3a] text-[10px] font-mono uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-[#ff6c3a]" />
          <span>Device Video Synchronization</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-ubuntu text-white">Upload & Stream Anywhere</h1>
        <p className="text-xs sm:text-sm text-[#aea79f] font-sans mt-1">
          Upload educational media or movies directly from your device. Generate high-speed streaming links and direct download links to share instantly.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {uploadStatus === 'idle' && (
          <motion.form 
            key="upload-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleStartUpload} 
            className="space-y-6"
          >
            {/* 1. Drag and Drop File Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-[#aea79f] uppercase block font-bold tracking-wider">Step 1: Select Video File</label>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center space-y-3 ${
                  isDragging 
                    ? 'border-[#ff6c3a] bg-[#ff6c3a]/5 scale-[0.99]' 
                    : videoFile 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : 'border-[#41134a] hover:border-[#ff6c3a] bg-[#120415] hover:bg-[#ff6c3a]/5'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="video/*" 
                  className="hidden" 
                />
                
                {videoFile ? (
                  <div className="p-3 bg-emerald-500/15 rounded-2xl text-emerald-400">
                    <Check className="w-10 h-10 animate-bounce" />
                  </div>
                ) : (
                  <div className="p-3 bg-[#ff6c3a]/10 rounded-2xl text-[#ff6c3a]">
                    <Upload className="w-10 h-10" />
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-white font-ubuntu">
                    {videoFile ? 'Video File Ready!' : 'Drag & Drop video file here'}
                  </h3>
                  <p className="text-xs text-[#aea79f] mt-1">
                    {videoFile 
                      ? `${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(1)} MB)` 
                      : 'or click to browse your storage'
                    }
                  </p>
                </div>
                
                <span className="text-[10px] text-gray-500 font-mono">Supports MP4, MKV, AVI, WEBM or MOV</span>
              </div>
            </div>

            {/* 2. Stream Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Left Column: Form Inputs */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono text-[#ff6c3a] uppercase font-bold tracking-wider border-b border-[#2b0c36] pb-1.5">Step 2: Stream Metadata</h3>

                <div className="space-y-1">
                  <label className="text-xs text-gray-300 font-sans block">Stream Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sintel Open Source Movie"
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2.5 rounded-xl border border-[#41134a] focus:outline-none focus:border-[#ff6c3a] transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-300 font-sans block">Description</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about this upload for other viewers..."
                    rows={3}
                    className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#41134a] focus:outline-none focus:border-[#ff6c3a] transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-300 font-sans block">Category/Genre</label>
                    <select 
                      value={genre} 
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full bg-[#1b0820] text-xs text-white px-3 py-2.5 rounded-xl border border-[#41134a] focus:outline-none focus:border-[#ff6c3a]"
                    >
                      <option value="Community">Community</option>
                      <option value="Education">Education</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Tutorial">Tutorial</option>
                      <option value="Sci-Fi">Sci-Fi</option>
                      <option value="Drama">Drama</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-300 font-sans block">Language</label>
                    <input 
                      type="text" 
                      value={language} 
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="e.g. Kinyarwanda, English"
                      className="w-full bg-[#1b0820] text-xs text-white px-3 py-2.5 rounded-xl border border-[#41134a] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-300 font-sans block">Release Year</label>
                    <input 
                      type="number" 
                      value={year} 
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-[#1b0820] text-xs text-white px-3 py-2.5 rounded-xl border border-[#41134a] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-300 font-sans block">Duration Badge</label>
                    <input 
                      type="text" 
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 15 mins, 2 hours"
                      className="w-full bg-[#1b0820] text-xs text-white px-3 py-2.5 rounded-xl border border-[#41134a] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Cover Selection */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono text-[#ff6c3a] uppercase font-bold tracking-wider border-b border-[#2b0c36] pb-1.5">Step 3: Cover Art & Banner</h3>

                {/* Cover Preview Card */}
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#41134a] bg-black flex items-center justify-center">
                  <img 
                    src={coverUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600'} 
                    alt="Stream Cover Preview" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <span className="text-[10px] font-mono text-[#ff6c3a] uppercase tracking-wider font-bold">Cover Preview</span>
                    <h4 className="text-sm font-ubuntu font-bold text-white leading-snug line-clamp-1">{title || "Stream Title Placeholder"}</h4>
                    <span className="text-[10px] text-gray-300 font-mono mt-0.5">{genre} • {language}</span>
                  </div>
                  
                  {isUploadingCover && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center space-y-2">
                      <Loader className="w-6 h-6 text-[#ff6c3a] animate-spin" />
                      <span className="text-xs text-[#ff6c3a] font-mono">Uploading Cover Art...</span>
                    </div>
                  )}
                </div>

                {/* Preset Options */}
                <div className="space-y-2">
                  <span className="text-[11px] text-gray-400 font-sans block">Select a Beautiful Cover Preset:</span>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_COVERS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCoverUrl(preset.url)}
                        title={preset.label}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          coverUrl === preset.url ? 'border-[#ff6c3a] scale-95' : 'border-[#41134a] hover:border-white'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom upload art button */}
                <div className="pt-1.5">
                  <input 
                    type="file" 
                    ref={coverInputRef} 
                    onChange={handleCoverUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full py-2 bg-[#ff6c3a]/10 hover:bg-[#ff6c3a]/20 border border-[#ff6c3a]/30 text-[#ff6c3a] font-ubuntu font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Image className="w-3.5 h-3.5" />
                    <span>Upload Custom Cover Art Image</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Submit Area */}
            <div className="border-t border-[#2b0c36] pt-5 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-[#e95420] to-[#ff6c3a] hover:from-[#ff6c3a] hover:to-[#ff8154] text-white font-ubuntu font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-orange-600/10 cursor-pointer flex items-center space-x-2 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Start Video Stream Upload</span>
              </button>
            </div>
          </motion.form>
        )}

        {/* Upload progress & synchronization view */}
        {uploadStatus === 'uploading' && (
          <motion.div 
            key="uploading-progress"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-[#ff6c3a]/10 border border-[#ff6c3a]/20 rounded-full flex items-center justify-center text-[#ff6c3a]">
                <Loader className="w-10 h-10 animate-spin" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-[#140517]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-ubuntu font-bold text-white">Uploading media to secure storage</h3>
              <p className="text-xs text-[#aea79f] font-sans">
                Transmitting video bits and generating permanent stream resources. This may take a minute depending on the video file size.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md bg-[#25092cf2] border border-[#ff6c3a]/15 h-3.5 rounded-full overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-[#e95420] to-[#ff6c3a] h-full rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[#ff6c3a]">{uploadProgress}% Complete</span>
          </motion.div>
        )}

        {/* Registering database view */}
        {uploadStatus === 'registering' && (
          <motion.div 
            key="registering-flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
              <Loader className="w-10 h-10 animate-spin" />
            </div>

            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-ubuntu font-bold text-white">Configuring Stream Links</h3>
              <p className="text-xs text-[#aea79f] font-sans">
                Generating watch page paths, direct CDN download endpoints, and dispatching global user alerts.
              </p>
            </div>
          </motion.div>
        )}

        {/* Success screen & link generation cards */}
        {uploadStatus === 'success' && (
          <motion.div 
            key="upload-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 py-4"
          >
            {/* Visual Success Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-ubuntu text-white">Stream Configured Successfully!</h2>
              <p className="text-xs text-emerald-400 font-mono">Stream catalog synced & public links generated instantly.</p>
            </div>

            {/* Generated Links Panel */}
            <div className="space-y-4 max-w-2xl mx-auto bg-[#1b0821] border border-[#ff6c3a]/20 p-5 rounded-2xl">
              <span className="text-[10px] font-mono text-[#ff6c3a] uppercase tracking-wider font-bold block">Generated URLs</span>

              {/* Watch Link */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-sans font-medium flex items-center space-x-1">
                    <Film className="w-3.5 h-3.5 text-orange-400" />
                    <span>Watch & Streaming Link</span>
                  </span>
                  <span className="text-orange-400 font-mono text-[10px] bg-orange-400/10 px-2 py-0.5 rounded-full">AUTO DEEP LINK</span>
                </div>
                <div className="flex items-center space-x-2 bg-black/35 rounded-xl p-2 border border-[#41134a]">
                  <input 
                    type="text" 
                    readOnly 
                    value={watchLink} 
                    className="flex-1 bg-transparent text-xs text-white px-2 focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => handleCopyLink(watchLink, setCopiedWatch)}
                    className="p-2 bg-[#ff6c3a]/10 hover:bg-[#ff6c3a]/20 text-[#ff6c3a] rounded-lg transition-colors cursor-pointer"
                    title="Copy Link"
                  >
                    {copiedWatch ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 italic">This link loads directly into the synchronized watch player.</p>
              </div>

              {/* Download Link */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-sans font-medium flex items-center space-x-1">
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Direct Downloadable Link</span>
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full">DIRECT FILE (.MP4)</span>
                </div>
                <div className="flex items-center space-x-2 bg-black/35 rounded-xl p-2 border border-[#41134a]">
                  <input 
                    type="text" 
                    readOnly 
                    value={downloadLink} 
                    className="flex-1 bg-transparent text-xs text-white px-2 focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => handleCopyLink(downloadLink, setCopiedDownload)}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                    title="Copy Link"
                  >
                    {copiedDownload ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 italic">Direct high-speed stream server path bypasses standard viewer limits.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
              <button
                onClick={handleShareClick}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-ubuntu font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedShare ? 'Copied Share!' : 'Share Watch Link'}</span>
              </button>

              <button
                onClick={() => onNavigate('movie-details', generatedMovieId)}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-ubuntu font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Stream & Watch Now</span>
              </button>

              <button
                onClick={handleReset}
                className="w-full py-3 px-4 bg-[#1b0820] hover:bg-[#2c0f33] border border-[#ff6c3a]/30 text-white font-ubuntu font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Another Video</span>
              </button>
            </div>
          </motion.div>
        )}

        {uploadStatus === 'error' && (
          <motion.div 
            key="upload-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-ubuntu font-bold text-white">Direct Upload Configuration Issue</h3>
              <p className="text-xs text-red-400 font-mono">{errorMessage || 'The server rejected or timed out the file packet.'}</p>
            </div>
            <button
              onClick={() => setActiveUpload(null)}
              className="px-6 py-2 bg-[#ff6c3a] hover:bg-[#ff8154] text-white font-ubuntu font-bold text-xs uppercase tracking-wider rounded-xl transition"
            >
              Try Uploading Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
