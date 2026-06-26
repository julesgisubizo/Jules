/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, FolderOpen, File, FileVideo, FileAudio, FileImage, FileText, 
  Grid, List, Search, ArrowUpDown, Play, Pause, Volume2, Maximize, 
  ZoomIn, ZoomOut, RotateCw, X, HardDrive, UploadCloud, Trash2, 
  Download, ExternalLink, Eye, Info, VolumeX, SkipForward, SkipBack, 
  FolderSync, LayoutGrid, ListFilter, HelpCircle, Check, Sparkles,
  RefreshCw, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// IndexedDB Helper functions for persisting FileSystemDirectoryHandles & local files
const DB_NAME = 'DeviceFileExplorerDB';
const STORE_NAME = 'DirectoryHandles';
const FILES_STORE_NAME = 'PersistentFiles';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
        db.createObjectStore(FILES_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeDirectoryHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getDirectoryHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function removeDirectoryHandle(key: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function storePersistentFile(id: string, file: File): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.put(file, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getAllPersistentFiles(): Promise<{ id: string; file: File }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.openCursor();
    const result: { id: string; file: File }[] = [];
    
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        result.push({
          id: cursor.key as string,
          file: cursor.value as File
        });
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function removePersistentFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearAllPersistentFiles(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(FILES_STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Recursively scans a FileSystemDirectoryHandle to index all files inside folders and subfolders
async function readAllFilesRecursively(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
  const fileList: File[] = [];
  async function traverse(handle: any) {
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        try {
          const file = await entry.getFile();
          fileList.push(file);
        } catch (err) {
          console.error(`Skipped reading local file ${entry.name}:`, err);
        }
      } else if (entry.kind === 'directory') {
        try {
          await traverse(entry);
        } catch (err) {
          console.error(`Skipped directory branch ${entry.name}:`, err);
        }
      }
    }
  }
  await traverse(dirHandle);
  return fileList;
}

// Request or query directory handle permissions
async function verifyPermission(fileHandle: FileSystemDirectoryHandle, readWrite: boolean): Promise<boolean> {
  const options: any = { mode: readWrite ? 'readwrite' : 'read' };
  const handleAny = fileHandle as any;
  if (typeof handleAny.queryPermission === 'function' && (await handleAny.queryPermission(options)) === 'granted') {
    return true;
  }
  if (typeof handleAny.requestPermission === 'function' && (await handleAny.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

interface LocalFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'video' | 'audio' | 'image' | 'document' | 'other';
  lastModified: number;
  blobUrl: string;
  file: File;
}

interface DeviceMediaExplorerProps {
  onPlayInWatchParty?: (file: LocalFile) => void;
  triggerAlert: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function DeviceMediaExplorer({ onPlayInWatchParty, triggerAlert }: DeviceMediaExplorerProps) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  
  // Persistent directory handles state
  const [savedDirHandle, setSavedDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [savedDirName, setSavedDirName] = useState<string>('');
  const [isPermissionRequired, setIsPermissionRequired] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Iframe preview security state
  const [iframeError, setIframeError] = useState(false);
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  
  // Active Preview States
  const [activePreview, setActivePreview] = useState<LocalFile | null>(null);
  
  // Image Lightbox zoom/rotation controls
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);

  // Audio Playback states
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Video Playback states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(0.8);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Document contents reader
  const [docContent, setDocContent] = useState<string>('');
  const [loadingDoc, setLoadingDoc] = useState(false);

  // File Inputs references
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Parse files loaded and save them to IndexedDB for permanent access
  const handleFilesAdded = async (rawFiles: FileList | null) => {
    if (!rawFiles || rawFiles.length === 0) return;
    
    const loadedFiles: LocalFile[] = [];
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      
      // Determine file category
      let category: 'video' | 'audio' | 'image' | 'document' | 'other' = 'other';
      if (file.type.startsWith('video/')) {
        category = 'video';
      } else if (file.type.startsWith('audio/')) {
        category = 'audio';
      } else if (file.type.startsWith('image/')) {
        category = 'image';
      } else if (
        file.type === 'application/pdf' || 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.txt') || 
        file.name.endsWith('.md') || 
        file.name.endsWith('.json') ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx')
      ) {
        category = 'document';
      }

      const fileId = `local-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      loadedFiles.push({
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        category,
        lastModified: file.lastModified,
        blobUrl: URL.createObjectURL(file),
        file
      });

      // Persist in IndexedDB permanently
      try {
        await storePersistentFile(fileId, file);
      } catch (err) {
        console.error(`Failed to store file ${file.name} permanently:`, err);
      }
    }

    setFiles(prev => {
      // Avoid duplicate file names to keep it clean
      const filteredPrev = prev.filter(pFile => !loadedFiles.some(lFile => lFile.name === pFile.name));
      return [...filteredPrev, ...loadedFiles];
    });

    triggerAlert('success', `Permanently loaded ${loadedFiles.length} file(s) into your device database. No permissions required next time!`);
  };

  // Load and check for saved directory handle and stored persistent files on initial mount
  useEffect(() => {
    async function restorePersistentState() {
      // 1. Restore actual files from IndexedDB
      try {
        const storedEntries = await getAllPersistentFiles();
        if (storedEntries.length > 0) {
          const loaded: LocalFile[] = storedEntries.map(entry => {
            const file = entry.file;
            let category: 'video' | 'audio' | 'image' | 'document' | 'other' = 'other';
            if (file.type.startsWith('video/')) {
              category = 'video';
            } else if (file.type.startsWith('audio/')) {
              category = 'audio';
            } else if (file.type.startsWith('image/')) {
              category = 'image';
            } else if (
              file.type === 'application/pdf' || 
              file.name.endsWith('.pdf') || 
              file.name.endsWith('.txt') || 
              file.name.endsWith('.md') || 
              file.name.endsWith('.json') ||
              file.name.endsWith('.csv') ||
              file.name.endsWith('.xlsx')
            ) {
              category = 'document';
            }

            return {
              id: entry.id,
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              category,
              lastModified: file.lastModified,
              blobUrl: URL.createObjectURL(file),
              file
            };
          });

          setFiles(loaded);
          triggerAlert('success', `Instantly restored ${loaded.length} files permanently from your secure offline local database.`);
        }
      } catch (err) {
        console.error('Failed to restore persistent local files:', err);
      }

      // 2. Restore saved directory handles
      try {
        const handle = await getDirectoryHandle('saved_directory');
        if (handle) {
          setSavedDirHandle(handle);
          setSavedDirName(handle.name);
          setIsPermissionRequired(true);
        }
      } catch (err) {
        console.error('Failed to restore directory handle:', err);
      }
    }
    restorePersistentState();
  }, []);

  // Sync files from directory handle recursively and store them permanently
  const syncFilesFromHandle = async (handle: FileSystemDirectoryHandle) => {
    setIsScanning(true);
    try {
      const hasPermission = await verifyPermission(handle, false);
      if (!hasPermission) {
        setIsPermissionRequired(true);
        triggerAlert('warning', `Access to "${handle.name}" was not granted. Please authorize to load files.`);
        setIsScanning(false);
        return;
      }

      setIsPermissionRequired(false);
      const rawFiles = await readAllFilesRecursively(handle);
      
      const loadedFiles: LocalFile[] = [];
      for (const file of rawFiles) {
        let category: 'video' | 'audio' | 'image' | 'document' | 'other' = 'other';
        if (file.type.startsWith('video/')) {
          category = 'video';
        } else if (file.type.startsWith('audio/')) {
          category = 'audio';
        } else if (file.type.startsWith('image/')) {
          category = 'image';
        } else if (
          file.type === 'application/pdf' || 
          file.name.endsWith('.pdf') || 
          file.name.endsWith('.txt') || 
          file.name.endsWith('.md') || 
          file.name.endsWith('.json') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.xlsx')
        ) {
          category = 'document';
        }

        const fileId = `local-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        loadedFiles.push({
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          category,
          lastModified: file.lastModified,
          blobUrl: URL.createObjectURL(file),
          file
        });

        // Persist in IndexedDB permanently
        try {
          await storePersistentFile(fileId, file);
        } catch (err) {
          console.error(`Failed to store file ${file.name} permanently:`, err);
        }
      }

      setFiles(prev => {
        prev.forEach(f => URL.revokeObjectURL(f.blobUrl));
        const filteredPrev = prev.filter(pFile => !loadedFiles.some(lFile => lFile.name === pFile.name));
        return [...filteredPrev, ...loadedFiles];
      });

      triggerAlert('success', `Direct connection active! Synced and permanently stored ${loadedFiles.length} files from "${handle.name}" recursively.`);
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', `Sync failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Click handler to choose a folder permanently via Directory Picker
  const handleSelectPersistentFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      triggerAlert('error', 'Your browser does not support the modern File System Access API. Please use the folder selector below.');
      return;
    }

    try {
      setIframeError(false);
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      await storeDirectoryHandle('saved_directory', handle);
      setSavedDirHandle(handle);
      setSavedDirName(handle.name);
      await syncFilesFromHandle(handle);
    } catch (err: any) {
      if (
        err.name === 'SecurityError' || 
        err.message?.toLowerCase().includes('sub frame') || 
        err.message?.toLowerCase().includes('cross origin') || 
        err.message?.toLowerCase().includes('file picker')
      ) {
        setIframeError(true);
        triggerAlert('warning', 'Direct folder connection is blocked by browser iframe security. Please check the instructions panel below.');
      } else if (err.name !== 'AbortError') {
        console.error(err);
        triggerAlert('error', `Error choosing directory: ${err.message}`);
      }
    }
  };

  // Remove saved directory connection
  const handleDisconnectSavedFolder = async () => {
    try {
      await removeDirectoryHandle('saved_directory');
      setSavedDirHandle(null);
      setSavedDirName('');
      setIsPermissionRequired(false);
      setFiles(prev => {
        prev.forEach(f => URL.revokeObjectURL(f.blobUrl));
        return [];
      });
      triggerAlert('success', 'Stored directory link disconnected. Active local session cleared.');
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', `Failed to disconnect stored link: ${err.message}`);
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.blobUrl));
    };
  }, [files]);

  // Read text content if it's a document
  useEffect(() => {
    if (activePreview && activePreview.category === 'document' && !activePreview.name.endsWith('.pdf')) {
      setLoadingDoc(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocContent(e.target?.result as string || '');
        setLoadingDoc(false);
      };
      reader.onerror = () => {
        setDocContent('Unable to read this file text contents.');
        setLoadingDoc(false);
      };
      reader.readAsText(activePreview.file);
    } else {
      setDocContent('');
    }
    
    // Reset lightbox controls on switch
    setImgZoom(1);
    setImgRotation(0);
    setIsAudioPlaying(false);
    setIsVideoPlaying(false);
    setAudioProgress(0);
    setVideoProgress(0);
  }, [activePreview]);

  // Drag and Drop triggers
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
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Helper to format bytes cleanly
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Delete file from sandboxed browser explorer state & IndexedDB
  const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fileToDel = files.find(f => f.id === id);
    if (fileToDel) {
      URL.revokeObjectURL(fileToDel.blobUrl);
    }
    if (activePreview?.id === id) {
      setActivePreview(null);
    }
    setFiles(prev => prev.filter(f => f.id !== id));
    
    try {
      await removePersistentFile(id);
      triggerAlert('info', 'File disconnected and deleted from your browser offline database.');
    } catch (err) {
      console.error(`Failed to remove file ${id} from database:`, err);
    }
  };

  // Completely clear the device offline database
  const handleClearAllPersistentFiles = async () => {
    if (window.confirm('Are you sure you want to clear all permanently connected device files? This will reset the explorer database.')) {
      try {
        await clearAllPersistentFiles();
        files.forEach(f => URL.revokeObjectURL(f.blobUrl));
        setFiles([]);
        setActivePreview(null);
        triggerAlert('success', 'All local files cleared from your permanent device explorer.');
      } catch (err: any) {
        console.error(err);
        triggerAlert('error', `Failed to clear offline database: ${err.message}`);
      }
    }
  };

  // Filter & Search files
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          file.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let compare = 0;
    if (sortBy === 'name') {
      compare = a.name.localeCompare(b.name);
    } else if (sortBy === 'size') {
      compare = a.size - b.size;
    } else if (sortBy === 'date') {
      compare = a.lastModified - b.lastModified;
    } else if (sortBy === 'type') {
      compare = a.type.localeCompare(b.type);
    }
    return sortOrder === 'asc' ? compare : -compare;
  });

  const toggleSort = (type: 'name' | 'size' | 'date' | 'type') => {
    if (sortBy === type) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  // Audio Progress Handler
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 0;
      setAudioProgress(duration > 0 ? (current / duration) * 100 : 0);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current && audioDuration > 0) {
      const targetTime = (val / 100) * audioDuration;
      audioRef.current.currentTime = targetTime;
      setAudioProgress(val);
    }
  };

  const toggleAudioPlay = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.play().catch(err => console.error(err));
        setIsAudioPlaying(true);
      }
    }
  };

  // Video Progress Handler
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 0;
      setVideoProgress(duration > 0 ? (current / duration) * 100 : 0);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration || 0);
    }
  };

  const handleVideoProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current && videoDuration > 0) {
      const targetTime = (val / 100) * videoDuration;
      videoRef.current.currentTime = targetTime;
      setVideoProgress(val);
    }
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      } else {
        videoRef.current.play().catch(err => console.error(err));
        setIsVideoPlaying(true);
      }
    }
  };

  // Reset Audio/Video volumes on change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isAudioMuted ? 0 : audioVolume;
    }
  }, [audioVolume, isAudioMuted]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isVideoMuted ? 0 : videoVolume;
    }
  }, [videoVolume, isVideoMuted]);

  // Fast format time
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full space-y-6 text-left" id="device-media-explorer-panel">
      
      {/* Title Header with Modern Glass Look */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1b0521] to-[#3a0e41] border border-[#ff6c3a]/25 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <HardDrive className="w-44 h-44 text-[#e95420]" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-[#ff6c3a]/15 border border-[#ff6c3a]/30 text-[#ff6c3a] text-xs px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Local Offline Sandbox Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-ubuntu text-white tracking-tight leading-none">
            Device File Explorer & Stream Manager
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
            Directly browse, map, preview, and load offline video streams, music records, documents, or screenshots on this computer or cellular phone. Files are processed locally for private lag-free playback and offline sync!
          </p>
        </div>
      </div>

      {/* Persistent Folder Synchronization Panel */}
      <div className="bg-[#1b061f] border border-[#ff6c3a]/25 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-bold font-ubuntu text-white uppercase tracking-wider flex items-center space-x-2">
                <span>Permanent Virtual Storage (Vidmate Mode)</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  ACTIVE
                </span>
              </h2>
            </div>
            <p className="text-xs text-gray-300">
              Files are automatically stored in your browser's local private database. They load <strong>instantly & permanently</strong> without any security prompts, verification, or connection handshakes!
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {files.length > 0 && (
              <button
                onClick={handleClearAllPersistentFiles}
                className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-300 text-xs font-bold rounded-lg border border-red-500/20 transition flex items-center space-x-1.5"
                title="Wipe browser database for files"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe Virtual Disk</span>
              </button>
            )}

            {savedDirHandle ? (
              <>
                {isPermissionRequired ? (
                  <button
                    onClick={() => syncFilesFromHandle(savedDirHandle)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-lg transition flex items-center space-x-2 shadow-lg shadow-amber-500/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verify Connection & Load Files</span>
                  </button>
                ) : (
                  <button
                    onClick={() => syncFilesFromHandle(savedDirHandle)}
                    disabled={isScanning}
                    className="px-4 py-2 bg-[#2d1234] hover:bg-[#3d1a45] text-white text-xs font-bold rounded-lg border border-[#ff6c3a]/25 transition flex items-center space-x-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Syncing...' : 'Force Sync Folder'}</span>
                  </button>
                )}
                <button
                  onClick={handleDisconnectSavedFolder}
                  className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-300 text-xs font-bold rounded-lg border border-red-500/20 transition flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect Link</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSelectPersistentFolder}
                className="px-4 py-2 bg-[#e95420] hover:bg-[#ff6936] text-white text-xs font-bold rounded-lg transition flex items-center space-x-1.5 shadow-lg shadow-[#e95420]/15"
              >
                <FolderSync className="w-3.5 h-3.5" />
                <span>Permanently Map Local Folder</span>
              </button>
            )}
          </div>
        </div>

        {isPermissionRequired && savedDirHandle && (
          <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Security Handshake Required:</span>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                Browser security standards prevent websites from silently accessing folders in new tabs or browser launches. Please click <strong>Verify Connection & Load Files</strong> to instantly re-authorize direct, high-speed offline local reading.
              </p>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-emerald-300">
            <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>Scanning directory trees and syncing files. This operates entirely on your physical machine with absolute privacy...</span>
          </div>
        )}

        {(isInsideIframe || iframeError) && (
          <div className="bg-[#2a0e2d]/60 border border-amber-500/20 rounded-xl p-4 space-y-3 text-xs text-[#ffd4a3]">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white text-[13px] block">Preview Frame Security Constraint Detected</span>
                <p className="text-[11px] leading-relaxed text-gray-300">
                  Modern web browsers prohibit the use of the persistent Directory Picker inside embedded/sandboxed <strong>iframes</strong> (such as this AI Studio preview container) to prevent clickjacking.
                </p>
              </div>
            </div>
            
            <div className="bg-[#140417]/80 rounded-lg p-3 space-y-2 border border-[#ff6c3a]/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-semibold text-white">How to connect your device folder permanently:</span>
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-[#e95420] hover:bg-[#ff6936] text-white text-[11px] font-bold rounded-md transition flex items-center space-x-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open App in New Tab</span>
                </a>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-300">
                <li>Click the <strong>Open App in New Tab</strong> button above to bypass the preview iframe constraint instantly.</li>
                <li>In the standalone window, the browser allows you to click <strong>Permanently Map Local Folder</strong> to index your whole device or selected folders securely.</li>
                <li><strong>Work inside this preview:</strong> Simply click the <strong>Map Entire Folder</strong> button in the drag-and-drop zone below to select a directory for immediate access in the current session!</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Upload Drag & Drop Zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition duration-200 cursor-pointer ${
          isDragging 
            ? 'border-[#e95420] bg-[#e95420]/10 text-white' 
            : 'border-[#381142] bg-[#140417]/50 hover:bg-[#1a061e]/80 text-gray-400 hover:border-[#ff6c3a]/30'
        }`}
        onClick={() => fileInputRef.current?.click()}
        id="drag-drop-media-zone"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          multiple 
          onChange={(e) => handleFilesAdded(e.target.files)} 
          className="hidden" 
        />
        {/* Webkit directory mapping support */}
        <input 
          type="file" 
          ref={folderInputRef} 
          webkitdirectory="" 
          directory="" 
          multiple
          onChange={(e) => handleFilesAdded(e.target.files)} 
          className="hidden" 
          {...{ webkitdirectory: "true", directory: "true" } as any}
        />
        
        <div className="max-w-md mx-auto space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#2e0936] flex items-center justify-center text-[#ff6c3a] border border-[#ff6c3a]/20">
            <UploadCloud className="w-6 h-6 animate-bounce" />
          </div>
          <div className="space-y-1">
            <p className="font-ubuntu font-bold text-white text-sm">
              Drag & Drop your device media here
            </p>
            <p className="text-xs text-gray-400 font-sans">
              Supports raw Movie streams (.mp4, .mkv), Audios (.mp3), high-res Posters, and Study guides
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 bg-[#e95420] hover:bg-[#ff6936] text-white text-xs font-bold rounded-lg transition"
            >
              Select Device Files
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              className="px-4 py-2 bg-[#2d1234] hover:bg-[#3d1a45] text-[#eaeaea] text-xs font-bold rounded-lg border border-[#ff6c3a]/25 transition flex items-center space-x-1.5"
            >
              <FolderSync className="w-3.5 h-3.5 text-[#ff6c3a]" />
              <span>Map Entire Folder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explorer Content Block Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left categories filter sidebar / File tree view */}
        <div className="lg:col-span-3 bg-[#130416] border border-[#2e0d37] rounded-xl p-4 space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 text-[#ff6c3a]">
            <FolderOpen className="w-4 h-4" />
            <span className="font-ubuntu font-bold text-sm text-white">Categories</span>
          </div>

          <div className="space-y-1">
            {[
              { id: 'all', label: 'All Loaded Media', count: files.length, icon: HardDrive },
              { id: 'video', label: 'Movie Streams', count: files.filter(f => f.category === 'video').length, icon: FileVideo },
              { id: 'audio', label: 'Music & Audios', count: files.filter(f => f.category === 'audio').length, icon: FileAudio },
              { id: 'image', label: 'Covers & Photos', count: files.filter(f => f.category === 'image').length, icon: FileImage },
              { id: 'document', label: 'Study Guides', count: files.filter(f => f.category === 'document').length, icon: FileText },
            ].map(cat => {
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition ${
                    selectedCategory === cat.id 
                      ? 'bg-[#e95420] text-white font-semibold' 
                      : 'text-gray-300 hover:bg-[#200924] hover:text-[#ff6c3a]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <CatIcon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-[#1b061f] text-gray-400'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick instructions panel */}
          <div className="bg-[#1b061f] rounded-lg p-3.5 border border-[#300f39] text-[11px] text-gray-400 space-y-2">
            <div className="flex items-center space-x-1 text-yellow-400">
              <Info className="w-3.5 h-3.5" />
              <span className="font-bold">Usage Guide</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Files mapped inside are <strong>never uploaded</strong> to external servers. They play directly from your device storage, bypassing download lag or data bandwidth fees!
            </p>
          </div>
        </div>

        {/* Right workspace explorer container */}
        <div className="lg:col-span-9 bg-[#130416] border border-[#2e0d37] rounded-xl p-4 sm:p-5 shadow-xl min-h-[480px] flex flex-col justify-between">
          
          {/* Filtering, Search & Sorting Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 border-b border-[#2b0c33] mb-4">
            
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search device files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#1b061f] border border-[#3e134b] text-xs text-white rounded-lg focus:outline-none focus:border-[#e95420]"
              />
            </div>

            {/* Sorting, Grid/List Buttons */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              
              {/* Sort selector dropdown button click toggler */}
              <div className="flex items-center space-x-1.5 bg-[#1b061f] border border-[#3e134b] rounded-lg px-2.5 py-1 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#ff6c3a]" />
                <button 
                  onClick={() => toggleSort('date')} 
                  className={`px-1 rounded hover:text-[#ff6c3a] transition ${sortBy === 'date' ? 'text-[#ff6c3a] font-bold' : 'text-gray-300'}`}
                  title="Sort by Date Modified"
                >
                  Date
                </button>
                <span className="text-gray-500">|</span>
                <button 
                  onClick={() => toggleSort('size')} 
                  className={`px-1 rounded hover:text-[#ff6c3a] transition ${sortBy === 'size' ? 'text-[#ff6c3a] font-bold' : 'text-gray-300'}`}
                  title="Sort by File Size"
                >
                  Size
                </button>
                <span className="text-gray-500">|</span>
                <button 
                  onClick={() => toggleSort('name')} 
                  className={`px-1 rounded hover:text-[#ff6c3a] transition ${sortBy === 'name' ? 'text-[#ff6c3a] font-bold' : 'text-gray-300'}`}
                  title="Sort by Alphabetical Name"
                >
                  Name
                </button>
              </div>

              {/* View Grid vs List toggle */}
              <div className="flex items-center bg-[#1b061f] border border-[#3e134b] rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-[#e95420] text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Grid Layout View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-[#e95420] text-white' : 'text-gray-400 hover:text-white'}`}
                  title="List Layout View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Files List / Grid Render */}
          <div className="flex-grow">
            {sortedFiles.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#200926] border border-[#3f134a] flex items-center justify-center mx-auto text-gray-500">
                  <File className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-ubuntu font-bold text-white text-sm">No device media loaded</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No items matched your current filters or searching parameters.' 
                      : 'Drag multiple videos, audio files, or screenshots from your computer to inspect or preview them instantly.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {viewMode === 'grid' ? (
                  /* Grid Mode */
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedFiles.map(file => {
                      let FileIcon = File;
                      if (file.category === 'video') FileIcon = FileVideo;
                      else if (file.category === 'audio') FileIcon = FileAudio;
                      else if (file.category === 'image') FileIcon = FileImage;
                      else if (file.category === 'document') FileIcon = FileText;

                      return (
                        <div
                          key={file.id}
                          onClick={() => setActivePreview(file)}
                          className={`group bg-[#1a061f] border rounded-xl p-3.5 space-y-3 cursor-pointer text-left transition duration-200 hover:scale-[1.02] ${
                            activePreview?.id === file.id 
                              ? 'border-[#e95420] bg-[#e95420]/5 shadow-lg shadow-[#e95420]/10' 
                              : 'border-[#2d0e34] hover:border-[#ff6c3a]/30'
                          }`}
                        >
                          {/* File Thumbnail Preview or Icon Placeholder */}
                          <div className="relative aspect-video rounded-lg bg-[#0e0210] border border-[#2b0a31] overflow-hidden flex items-center justify-center">
                            {file.category === 'image' ? (
                              <img 
                                src={file.blobUrl || undefined} 
                                alt={file.name} 
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <FileIcon className={`w-8 h-8 ${
                                file.category === 'video' ? 'text-amber-400' :
                                file.category === 'audio' ? 'text-emerald-400' :
                                file.category === 'document' ? 'text-sky-400' : 'text-gray-400'
                              }`} />
                            )}

                            {/* File Category Badge */}
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-mono tracking-widest bg-black/60 text-[#ff6c3a] uppercase">
                              {file.category}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="space-y-1">
                            <h4 className="text-xs font-ubuntu font-bold text-gray-100 truncate" title={file.name}>
                              {file.name}
                            </h4>
                            <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                              <span>{formatBytes(file.size)}</span>
                              <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Quick Interactive Actions bar */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-[#2a0b31] opacity-60 group-hover:opacity-100 transition duration-150">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePreview(file);
                              }}
                              className="p-1 rounded bg-transparent hover:bg-[#340f3c] text-sky-400 hover:text-sky-300 transition"
                              title="Instant Preview File"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {file.category === 'video' && onPlayInWatchParty && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPlayInWatchParty(file);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold text-[#e95420] hover:text-[#ff6936] bg-[#e95420]/10 hover:bg-[#e95420]/20 rounded transition flex items-center space-x-1"
                                title="Play file inside Cooperative Watch Party stream room"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Co-Stream</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteFile(file.id, e)}
                              className="p-1 rounded bg-transparent hover:bg-red-950/20 text-gray-500 hover:text-red-400 transition"
                              title="Remove from Browser"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List Mode */
                  <div className="border border-[#2d0e34] rounded-xl overflow-hidden bg-[#130416]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#1e0724] border-b border-[#2d0e34] text-gray-400 font-mono">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3">Last Modified</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a0b31]">
                        {sortedFiles.map(file => {
                          let FileIcon = File;
                          if (file.category === 'video') FileIcon = FileVideo;
                          else if (file.category === 'audio') FileIcon = FileAudio;
                          else if (file.category === 'image') FileIcon = FileImage;
                          else if (file.category === 'document') FileIcon = FileText;

                          return (
                            <tr
                              key={file.id}
                              onClick={() => setActivePreview(file)}
                              className={`hover:bg-[#200926]/50 cursor-pointer transition ${
                                activePreview?.id === file.id ? 'bg-[#e95420]/5 text-[#ff6c3a]' : 'text-gray-300'
                              }`}
                            >
                              <td className="px-4 py-3 font-semibold truncate max-w-xs flex items-center space-x-2">
                                <FileIcon className="w-4 h-4 flex-shrink-0 text-[#ff6c3a]" />
                                <span className="truncate" title={file.name}>{file.name}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] capitalize">{file.category}</td>
                              <td className="px-4 py-3 font-mono text-[11px] text-gray-400 max-w-[120px] truncate" title={file.type}>
                                {file.type}
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{formatBytes(file.size)}</td>
                              <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                                {new Date(file.lastModified).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setActivePreview(file)}
                                  className="p-1 rounded hover:bg-[#340f3c] text-sky-400 transition"
                                  title="Preview"
                                >
                                  <Eye className="w-3.5 h-3.5 inline" />
                                </button>
                                {file.category === 'video' && onPlayInWatchParty && (
                                  <button
                                    onClick={() => onPlayInWatchParty(file)}
                                    className="p-1 rounded hover:bg-[#340f3c] text-green-400 transition"
                                    title="Host Stream Party"
                                  >
                                    <Play className="w-3.5 h-3.5 inline fill-current" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDeleteFile(file.id, e)}
                                  className="p-1 rounded hover:bg-red-950/20 text-gray-400 hover:text-red-400 transition"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5 inline" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Device explorer storage capacity metrics footer bar */}
          <div className="pt-4 border-t border-[#2b0c33] mt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-400 space-y-2 sm:space-y-0">
            <div>
              Total Session Files Mapped: <span className="font-bold text-white">{files.length}</span> (
              {formatBytes(files.reduce((sum, f) => sum + f.size, 0))} aggregate storage)
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono">Local Host Connected Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Overlay Slide-out Lightbox & Premium Players */}
      <AnimatePresence>
        {activePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0e0310]/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={() => setActivePreview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#18051e] border border-[#ff6c3a]/25 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Previewer Header */}
              <div className="flex items-center justify-between p-4 bg-[#140419] border-b border-[#320f3a]">
                <div className="flex items-center space-x-2 truncate">
                  <span className="p-1.5 rounded-lg bg-[#ff6c3a]/15 text-[#ff6c3a]">
                    {activePreview.category === 'video' ? <FileVideo className="w-4 h-4" /> :
                     activePreview.category === 'audio' ? <FileAudio className="w-4 h-4" /> :
                     activePreview.category === 'image' ? <FileImage className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </span>
                  <div className="truncate">
                    <h3 className="text-sm font-ubuntu font-bold text-white truncate" title={activePreview.name}>
                      {activePreview.name}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {activePreview.type} • {formatBytes(activePreview.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Share option to load into Stream Party */}
                  {activePreview.category === 'video' && onPlayInWatchParty && (
                    <button
                      onClick={() => {
                        onPlayInWatchParty(activePreview);
                        setActivePreview(null);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#e95420] hover:bg-[#ff6936] rounded-lg transition flex items-center space-x-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-white" />
                      <span>Host Watch Party</span>
                    </button>
                  )}
                  
                  {/* Close Lightbox */}
                  <button
                    onClick={() => setActivePreview(null)}
                    className="p-2 bg-[#2d0e33] hover:bg-[#ff6c3a]/20 text-gray-300 hover:text-white rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Previewer Main Stage Screen */}
              <div className="flex-grow overflow-auto p-6 flex flex-col items-center justify-center bg-[#0d020e] min-h-[300px]">
                
                {/* 1. VIDEO PREVIEW PLAYER */}
                {activePreview.category === 'video' && (
                  <div className="w-full max-w-3xl aspect-video relative group rounded-xl overflow-hidden bg-black border border-[#ff6c3a]/10">
                    <video
                      ref={videoRef}
                      src={activePreview.blobUrl || undefined}
                      className="w-full h-full"
                      onTimeUpdate={handleVideoTimeUpdate}
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      onClick={toggleVideoPlay}
                    />

                    {/* Custom Video Control Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 space-y-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition duration-200">
                      
                      {/* Video Seek slider */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-gray-300">{formatTime(videoRef.current?.currentTime || 0)}</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={videoProgress}
                          onChange={handleVideoProgressChange}
                          className="flex-grow h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#e95420]"
                        />
                        <span className="text-[10px] font-mono text-gray-300">{formatTime(videoDuration)}</span>
                      </div>

                      {/* Video Button Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button onClick={toggleVideoPlay} className="text-white hover:text-[#ff6936] transition">
                            {isVideoPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                          </button>
                          
                          {/* Volume controls */}
                          <div className="flex items-center space-x-1.5">
                            <button onClick={() => setIsVideoMuted(!isVideoMuted)} className="text-white hover:text-[#ff6936] transition">
                              {isVideoMuted || videoVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={isVideoMuted ? 0 : videoVolume}
                              onChange={(e) => {
                                setVideoVolume(parseFloat(e.target.value));
                                setIsVideoMuted(false);
                              }}
                              className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#e95420]"
                            />
                          </div>
                        </div>

                        {/* Fullscreen button */}
                        <button 
                          onClick={() => videoRef.current?.requestFullscreen()}
                          className="text-white hover:text-[#ff6936] transition"
                        >
                          <Maximize className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. AUDIO PREVIEW PLAYER */}
                {activePreview.category === 'audio' && (
                  <div className="w-full max-w-md bg-[#1d0624] border border-[#441451] rounded-2xl p-6 text-center space-y-6 shadow-xl">
                    <audio
                      ref={audioRef}
                      src={activePreview.blobUrl || undefined}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onLoadedMetadata={handleAudioLoadedMetadata}
                    />

                    {/* Vinyl/Disk Rotation animation when playing */}
                    <div className="relative mx-auto w-32 h-32 rounded-full border-4 border-[#3e134b] flex items-center justify-center overflow-hidden bg-[#0d020e] shadow-xl">
                      <div className={`absolute inset-0 rounded-full border-2 border-dashed border-[#ff6c3a]/40 ${isAudioPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                      <FileAudio className="w-12 h-12 text-[#ff6c3a]" />
                    </div>

                    {/* simulated dynamic sound waves spectrum bar visualizer (pure CSS) */}
                    <div className="h-8 flex justify-center items-end space-x-1.5 pt-2">
                      {[12, 24, 16, 32, 28, 14, 20, 26, 30, 18, 22, 10, 15, 29, 21, 13].map((height, i) => (
                        <span
                          key={i}
                          style={{
                            height: isAudioPlaying ? `${Math.floor(Math.random() * 24) + 6}px` : '4px',
                            transition: 'height 0.12s ease-in-out',
                          }}
                          className="w-1.5 rounded-full bg-gradient-to-t from-[#e95420] to-[#ffaa44]"
                        />
                      ))}
                    </div>

                    {/* Progress seeking bar */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={audioProgress}
                        onChange={handleAudioProgressChange}
                        className="w-full h-1.5 bg-[#310b3a] rounded-lg appearance-none cursor-pointer accent-[#e95420]"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                    </div>

                    {/* Controls Bar */}
                    <div className="flex items-center justify-between">
                      {/* Left: Vol Controls */}
                      <div className="flex items-center space-x-1">
                        <button onClick={() => setIsAudioMuted(!isAudioMuted)} className="text-gray-400 hover:text-white transition">
                          {isAudioMuted || audioVolume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={isAudioMuted ? 0 : audioVolume}
                          onChange={(e) => {
                            setAudioVolume(parseFloat(e.target.value));
                            setIsAudioMuted(false);
                          }}
                          className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#e95420]"
                        />
                      </div>

                      {/* Middle Play Button */}
                      <button
                        onClick={toggleAudioPlay}
                        className="w-12 h-12 rounded-full bg-[#e95420] hover:bg-[#ff6936] text-white flex items-center justify-center transition shadow-lg shadow-[#e95420]/20 transform hover:scale-105 active:scale-95"
                      >
                        {isAudioPlaying ? <Pause className="w-5 h-5 fill-current text-white" /> : <Play className="w-5 h-5 fill-current translate-x-0.5 text-white" />}
                      </button>

                      {/* Right Settings */}
                      <button 
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            setAudioProgress(0);
                          }
                        }}
                        className="text-xs font-mono font-bold text-gray-400 hover:text-white border border-[#441451] rounded-lg px-2.5 py-1.5 bg-[#17041c]"
                        title="Reset Track Time"
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. IMAGE PREVIEW LIGHTBOX WITH ROTATE/ZOOM TOOLS */}
                {activePreview.category === 'image' && (
                  <div className="flex flex-col items-center space-y-4 w-full">
                    <div className="relative max-w-full max-h-[60vh] rounded-lg overflow-hidden border border-[#3e134b] bg-black/40 flex items-center justify-center">
                      <img
                        src={activePreview.blobUrl || undefined}
                        alt={activePreview.name}
                        referrerPolicy="no-referrer"
                        style={{
                          transform: `scale(${imgZoom}) rotate(${imgRotation}deg)`,
                          transition: 'transform 0.15s ease-out',
                        }}
                        className="max-w-full max-h-[50vh] object-contain rounded"
                      />
                    </div>

                    {/* Image modification toolkit bar */}
                    <div className="flex items-center space-x-3.5 bg-[#1b061f] border border-[#3e134b] rounded-full px-5 py-2">
                      <button
                        onClick={() => setImgZoom(prev => Math.max(0.5, prev - 0.25))}
                        className="text-gray-300 hover:text-[#ff6c3a] transition"
                        title="Zoom Out Image"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono text-gray-400 select-none">
                        {Math.round(imgZoom * 100)}%
                      </span>
                      <button
                        onClick={() => setImgZoom(prev => Math.min(3, prev + 0.25))}
                        className="text-gray-300 hover:text-[#ff6c3a] transition"
                        title="Zoom In Image"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-gray-600">|</span>
                      <button
                        onClick={() => setImgRotation(prev => (prev + 90) % 360)}
                        className="text-gray-300 hover:text-[#ff6c3a] transition flex items-center space-x-1"
                        title="Rotate 90 Degrees clockwise"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span className="text-[10px] font-mono">90°</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. TEXT / GUIDES PREVIEW READER */}
                {activePreview.category === 'document' && !activePreview.name.endsWith('.pdf') && (
                  <div className="w-full max-w-3xl space-y-3">
                    {loadingDoc ? (
                      <div className="py-20 text-center text-gray-400 text-xs animate-pulse">
                        Loading file content stream...
                      </div>
                    ) : (
                      <div className="bg-[#120315] border border-[#340f3a] rounded-xl p-5 max-h-[50vh] overflow-y-auto font-mono text-xs text-gray-200 whitespace-pre-wrap text-left leading-relaxed">
                        {docContent || 'This local document file is empty.'}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. PDF DOCUMENT PLACEHOLDER METADATA */}
                {activePreview.category === 'document' && activePreview.name.endsWith('.pdf') && (
                  <div className="max-w-md text-center py-10 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-900/30 flex items-center justify-center mx-auto text-red-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-ubuntu font-bold text-white text-sm">Portable Document File (.PDF)</h4>
                      <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                        For secure operation, web sandbox handles are reading high-speed file metadata. You can access the local PDF in your default device viewer via download.
                      </p>
                    </div>
                    <a
                      href={activePreview.blobUrl}
                      download={activePreview.name}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-[#e95420] hover:bg-[#ff6936] text-white text-xs font-bold rounded-lg transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Open PDF in Tab</span>
                    </a>
                  </div>
                )}

                {/* 6. GENERIC / OTHER FILES METADATA */}
                {activePreview.category === 'other' && (
                  <div className="max-w-md text-center py-10 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-950/20 border border-indigo-900/30 flex items-center justify-center mx-auto text-indigo-400">
                      <File className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-ubuntu font-bold text-white text-sm">Generic Device File Payload</h4>
                      <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                        This file format ({activePreview.type || 'unknown payload'}) is mapped safely in the explorer session memory.
                      </p>
                    </div>
                    <a
                      href={activePreview.blobUrl}
                      download={activePreview.name}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-[#2d1234] hover:bg-[#3d1a45] text-white text-xs font-bold rounded-lg border border-[#ff6c3a]/25 transition"
                    >
                      <Download className="w-4 h-4 text-[#ff6c3a]" />
                      <span>Download / Recover File</span>
                    </a>
                  </div>
                )}

              </div>

              {/* Previewer Footer info */}
              <div className="p-4 bg-[#140419] border-t border-[#320f3a] flex justify-between items-center text-[11px] text-gray-400">
                <span className="font-mono">Local Blob Memory: {activePreview.id}</span>
                <span className="italic">Processed entirely client-side • Lag-free</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
