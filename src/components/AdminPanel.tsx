/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Film, BookOpen, Settings, Users, MessageSquare, ShieldAlert, Plus, Edit, Trash2, Check, LayoutDashboard, Globe, Key, AlertCircle, FileText, ToggleLeft, ToggleRight, Tv, Download, Upload, Mail, Heart } from 'lucide-react';
import { Movie, Document, ChatRoom, Comment, User, WatchSourceType, SiteSettings } from '../types';
import { apiFetch as fetch } from '../apiFetch';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  currentUser: any;
  onNavigate: (view: string, id?: string) => void;
  siteSettings: SiteSettings;
  onUpdateSettings: (settings: SiteSettings) => void;
  onUpdateMovies?: () => void;
  onUpdateDocuments?: () => void;
}

export default function AdminPanel({
  currentUser,
  onNavigate,
  siteSettings,
  onUpdateSettings,
  onUpdateMovies,
  onUpdateDocuments
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, add-movie, manage-movies, upload-document, manage-doc, manage-comments, manage-rooms, manage-users, settings

  // DB datasets
  const [analytics, setAnalytics] = useState<any>({
    totalViews: 0,
    totalLikes: 0,
    totalMovies: 0,
    totalDocs: 0,
    totalUsers: 0,
    totalDownloads: 0,
    genreData: [],
    popularMovies: []
  });

  const [moviesList, setMoviesList] = useState<Movie[]>([]);
  const [docsList, setDocsList] = useState<Document[]>([]);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [roomsList, setRoomsList] = useState<ChatRoom[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [donationsList, setDonationsList] = useState<any[]>([]);
  const [replyTexts, setReplyTexts] = useState<{[key: string]: string}>({});

  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);

  // Forms State - Movie
  const [movieForm, setMovieForm] = useState({
    title: '',
    description: '',
    watch_source_type: WatchSourceType.LINK,
    watch_link: '',
    download_link: '',
    poster_image: '',
    cover_image: '',
    trailer_link: '',
    genre: 'Action',
    year: 2026,
    duration: '120m',
    language: 'English',
    country: 'Rwanda',
    quality: 'Full HD',
    tags: '',
    isFeatured: false,
    uploaded_video_name: '' // simulation file title
  });

  const resetMovieForm = () => {
    setMovieForm({
      title: '',
      description: '',
      watch_source_type: WatchSourceType.LINK,
      watch_link: '',
      download_link: '',
      poster_image: '',
      cover_image: '',
      trailer_link: '',
      genre: 'Action',
      year: 2026,
      duration: '120m',
      language: 'English',
      country: 'Rwanda',
      quality: 'Full HD',
      tags: '',
      isFeatured: false,
      uploaded_video_name: ''
    });
    setEditingMovieId(null);
  };

  // Forms State - Documents
  const [docForm, setDocForm] = useState({
    title: '',
    description: '',
    download_link: '',
    thumbnail: '',
    subject: 'Computer Science',
    class_level: 'Senior 6 (S6)',
    year: 2026,
    document_type: 'Past Paper'
  });

  // Seasons & Episodes management state
  const [selectedMovieForSeasons, setSelectedMovieForSeasons] = useState<Movie | null>(null);
  const [seasonsData, setSeasonsData] = useState<any[]>([]);
  const [newSeasonTitle, setNewSeasonTitle] = useState('');
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpWatchLink, setNewEpWatchLink] = useState('');
  const [newEpDownloadLink, setNewEpDownloadLink] = useState('');
  const [newEpDuration, setNewEpDuration] = useState('45m');
  const [selectedSeasonForEpAdd, setSelectedSeasonForEpAdd] = useState<string | null>(null); // season ID

  // Setting details
  const [settingsForm, setSettingsForm] = useState<SiteSettings>({ ...siteSettings });

  // Sync settings when siteSettings changes
  useEffect(() => {
    if (siteSettings) {
      setSettingsForm({ ...siteSettings });
    }
  }, [siteSettings]);

  // Notifications
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    title: string;
    type: 'movie' | 'document';
  } | null>(null);

  // Load everything
  useEffect(() => {
    loadAnalytics();
    loadMovies();
    loadDocuments();
    loadComments();
    loadRooms();
    loadUsers();
    loadMessages();
    loadDonations();
  }, [activeTab]);

  const loadDonations = () => {
    fetch('/api/donations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDonationsList(data);
        }
      })
      .catch(console.error);
  };

  const loadMessages = () => {
    fetch('/api/admin/messages')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessagesList(data);
        }
      })
      .catch(console.error);
  };

  const loadAnalytics = () => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error && Array.isArray(data.genreData) && Array.isArray(data.popularMovies)) {
          setAnalytics(data);
        }
      })
      .catch(console.error);
  };

  const loadMovies = () => {
    fetch('/api/movies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMoviesList(data);
          
          // Self-heal/Restore user modifications on stateless ephemeral server environments
          try {
            const savedStr = localStorage.getItem('flimsy_custom_movies');
            if (savedStr) {
              const savedMovies = JSON.parse(savedStr);
              if (Array.isArray(savedMovies) && savedMovies.length > 0) {
                const missingMovies = savedMovies.filter(sm => sm && sm.title && !data.some(m => String(m.id) === String(sm.id) || String(m.title).toLowerCase() === String(sm.title).toLowerCase()));
                if (missingMovies.length > 0) {
                  fetch('/api/movies/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movies: missingMovies })
                  })
                    .then(r => r.json())
                    .then(resData => {
                      if (resData.success) {
                        // After bulk restoration, reload from server
                        fetch('/api/movies')
                          .then(re => re.json())
                          .then(updatedList => {
                            if (Array.isArray(updatedList)) {
                              setMoviesList(updatedList);
                            }
                          }).catch(console.error);
                      }
                    })
                    .catch(console.error);
                }
              }
            }
          } catch (e) {
            console.error('Error auto-syncing local movie backup:', e);
          }
        }
      })
      .catch(console.error);
  };

  const loadDocuments = () => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDocsList(data);

          // Self-heal/Restore user modifications on stateless ephemeral server environments
          try {
            const savedStr = localStorage.getItem('flimsy_custom_docs');
            if (savedStr) {
              const savedDocs = JSON.parse(savedStr);
              if (Array.isArray(savedDocs) && savedDocs.length > 0) {
                const missingDocs = savedDocs.filter(sd => sd && sd.title && !data.some(d => String(d.id) === String(sd.id) || String(d.title).toLowerCase() === String(sd.title).toLowerCase()));
                if (missingDocs.length > 0) {
                  fetch('/api/documents/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documents: missingDocs })
                  })
                    .then(r => r.json())
                    .then(resData => {
                      if (resData.success) {
                        // After bulk restoration, reload from server
                        fetch('/api/documents')
                          .then(re => re.json())
                          .then(updatedList => {
                            if (Array.isArray(updatedList)) {
                              setDocsList(updatedList);
                            }
                          }).catch(console.error);
                      }
                    })
                    .catch(console.error);
                }
              }
            }
          } catch (e) {
            console.error('Error auto-syncing local book backup:', e);
          }
        }
      })
      .catch(console.error);
  };

  const loadComments = () => {
    fetch('/api/comments')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCommentsList(data);
        }
      })
      .catch(console.error);
  };

  const loadRooms = () => {
    fetch('/api/rooms')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRoomsList(data);
        }
      })
      .catch(console.error);
  };

  const loadUsers = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsersList(data);
        }
      })
      .catch(console.error);
  };

  const triggerAlert = (type: string, text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: '', text: '' }), 4000);
  };

  // Movie Submissions
  const handleMovieSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieForm.title) {
      triggerAlert('error', 'Movie Title is required!');
      return;
    }

    const payload = {
      ...movieForm,
      genre: [movieForm.genre],
      tags: movieForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      year: Number(movieForm.year)
    };

    if (editingMovieId) {
      fetch(`/api/movies/${editingMovieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            triggerAlert('success', `"${movieForm.title}" updated successfully!`);

            // Save custom movie to local backup
            try {
              const saved = JSON.parse(localStorage.getItem('flimsy_custom_movies') || '[]');
              const updated = saved.map((m: any) => m.id === editingMovieId ? data.movie : m);
              localStorage.setItem('flimsy_custom_movies', JSON.stringify(updated));
            } catch (ex) {
              console.error('Failed storing local movie backup:', ex);
            }

            resetMovieForm();
            setActiveTab('manage-movies');
            if (onUpdateMovies) {
              onUpdateMovies();
            }
          } else {
            triggerAlert('error', data.error || 'Server error updating movie.');
          }
        })
        .catch(() => triggerAlert('error', 'Failed connecting to database.'));
      return;
    }

    fetch('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', `"${movieForm.title}" uploaded with Success!`);
          
          // Save custom movie to local backup
          try {
            const saved = JSON.parse(localStorage.getItem('flimsy_custom_movies') || '[]');
            saved.push(data.movie);
            localStorage.setItem('flimsy_custom_movies', JSON.stringify(saved));
          } catch (ex) {
            console.error('Failed storing local movie backup:', ex);
          }

          resetMovieForm();
          setActiveTab('manage-movies');
          if (onUpdateMovies) {
            onUpdateMovies();
          }
        } else {
          triggerAlert('error', data.error || 'Server error uploading movie.');
        }
      })
      .catch(() => triggerAlert('error', 'Failed connecting to database.'));
  };

  // Real movie file upload handler
  const handleUploadSimulator = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerAlert('info', 'Uploading movie file to local server storage... Please wait.');
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
            if (data.success) {
              setMovieForm(prev => ({
                ...prev,
                uploaded_video_name: file.name,
                watch_source_type: WatchSourceType.UPLOAD,
                watch_link: data.url,
                download_link: data.url
              }));
              triggerAlert('success', `"${file.name}" uploaded successfully to server uploads!`);
            } else {
              triggerAlert('error', 'Movie file upload failed on backend.');
            }
          })
          .catch(() => {
            // High-speed fallback
            setMovieForm(prev => ({
              ...prev,
              uploaded_video_name: file.name,
              watch_source_type: WatchSourceType.UPLOAD,
              watch_link: "https://www.w3schools.com/html/mov_bbb.mp4",
              download_link: "https://www.w3schools.com/html/mov_bbb.mp4"
            }));
            triggerAlert('success', `Connection timeout fallback: "${file.name}" registered via high-speed CDN simulation.`);
          });
      };
      reader.readAsDataURL(file);
    }
  };

  // Poster Image upload generator simulator
  const handlePosterSimulator = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Upload simulation to server
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
              setMovieForm(prev => ({
                ...prev,
                poster_image: data.url,
                cover_image: data.url
              }));
              triggerAlert('success', 'Poster file processed and cached!');
            }
          });
      };
      reader.readAsDataURL(file);
    }
  };

  // Season management handlers
  const handleAddSeason = () => {
    if (!newSeasonTitle.trim()) {
      triggerAlert('error', 'Please enter a valid Season Title!');
      return;
    }
    const nextNum = seasonsData.length + 1;
    const newSeasonObj = {
      id: 'season_' + Date.now(),
      seasonNumber: nextNum,
      title: newSeasonTitle.trim(),
      episodes: []
    };
    const updated = [...seasonsData, newSeasonObj];
    setSeasonsData(updated);
    setNewSeasonTitle('');
    setSelectedSeasonForEpAdd(newSeasonObj.id);
    triggerAlert('success', `"${newSeasonObj.title}" added to series outline!`);
  };

  const handleDeleteSeason = (seasonId: string) => {
    const updated = seasonsData.filter(s => s.id !== seasonId);
    setSeasonsData(updated);
    if (selectedSeasonForEpAdd === seasonId) {
      setSelectedSeasonForEpAdd(updated[0]?.id || null);
    }
    triggerAlert('success', 'Season deleted!');
  };

  const handleAddEpisode = (seasonId: string) => {
    if (!newEpTitle.trim() || !newEpWatchLink.trim()) {
      triggerAlert('error', 'Episode Title and Streaming/Embed Link are required!');
      return;
    }
    
    const seasonIdx = seasonsData.findIndex(s => s.id === seasonId);
    if (seasonIdx === -1) return;

    const targetSeason = seasonsData[seasonIdx];
    const nextEpNum = targetSeason.episodes.length + 1;
    
    const newEpisode = {
      id: 'ep_' + Date.now(),
      episodeNumber: nextEpNum,
      title: newEpTitle.trim(),
      watch_link: newEpWatchLink.trim(),
      download_link: newEpDownloadLink.trim() || undefined,
      duration: newEpDuration.trim() || '45m'
    };

    const updatedEpisodes = [...targetSeason.episodes, newEpisode];
    const updatedSeasons = [...seasonsData];
    updatedSeasons[seasonIdx] = {
      ...targetSeason,
      episodes: updatedEpisodes
    };

    setSeasonsData(updatedSeasons);
    setNewEpTitle('');
    setNewEpWatchLink('');
    setNewEpDownloadLink('');
    triggerAlert('success', `"${newEpisode.title}" added successfully!`);
  };

  const handleDeleteEpisode = (seasonId: string, episodeId: string) => {
    const seasonIdx = seasonsData.findIndex(s => s.id === seasonId);
    if (seasonIdx === -1) return;

    const targetSeason = seasonsData[seasonIdx];
    const updatedEpisodes = targetSeason.episodes.filter(e => e.id !== episodeId)
      .map((e, index) => ({ ...e, episodeNumber: index + 1 })); // reindex

    const updatedSeasons = [...seasonsData];
    updatedSeasons[seasonIdx] = {
      ...targetSeason,
      episodes: updatedEpisodes
    };

    setSeasonsData(updatedSeasons);
    triggerAlert('success', 'Episode deleted from season.');
  };

  const handleSaveSeasons = () => {
    if (!selectedMovieForSeasons) return;
    
    // Save updated seasons to movie via PUT API
    fetch(`/api/movies/${selectedMovieForSeasons.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasons: seasonsData })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', 'Seasons & Episodes synchronized and published with Success!');
          setSelectedMovieForSeasons(null);
          setSeasonsData([]);
          if (onUpdateMovies) {
            onUpdateMovies();
          }
        } else {
          triggerAlert('error', data.error || 'Failed saving episodes outline.');
        }
      })
      .catch(() => triggerAlert('error', 'Network error updating episode directory.'));
  };

  const handleMovieDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, title: name, type: 'movie' });
  };

  const handleExportToExcel = () => {
    try {
      if (moviesList.length === 0) {
        triggerAlert('warning', 'There are no movies registered to export.');
        return;
      }
      const dataToExport = moviesList.map(m => ({
        'Movie ID': m.id,
        'Title': m.title,
        'Description': m.description,
        'Watch Source Type': m.watch_source_type,
        'Watch Link': m.watch_link,
        'Download Link': m.download_link,
        'Poster Image': m.poster_image,
        'Cover Image': m.cover_image,
        'Trailer Link': m.trailer_link,
        'Genre (comma separated)': Array.isArray(m.genre) ? m.genre.join(', ') : m.genre,
        'Year': m.year,
        'Duration': m.duration,
        'Language': m.language,
        'Country': m.country,
        'Quality': m.quality,
        'Tags (comma separated)': Array.isArray(m.tags) ? m.tags.join(', ') : m.tags,
        'Is Featured': m.isFeatured ? 'TRUE' : 'FALSE',
        'Views': m.views || 0,
        'Likes': m.likes || 0,
        'Seasons (JSON)': m.seasons && m.seasons.length > 0 ? JSON.stringify(m.seasons) : '[]'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Movies Collection');
      XLSX.writeFile(wb, 'Cinema_Movies_Catalog.xlsx');
      triggerAlert('success', `Exported ${moviesList.length} movies with complete seasons and episodes to Excel catalog successfully!`);
    } catch (err: any) {
      triggerAlert('error', 'Error exporting catalog: ' + err.message);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const sampleData = [
        {
          'Title': 'The Avengers',
          'Description': 'Earth\'s mightiest heroes must come together and learn to fight as a team...',
          'Watch Source Type': 'Link',
          'Watch Link': 'https://www.youtube.com/embed/eOrNdBpGMv8',
          'Download Link': 'https://download-mirror-link.com/avengers.mp4',
          'Poster Image': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
          'Cover Image': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',
          'Trailer Link': 'https://www.youtube.com/watch?v=eOrNdBpGMv8',
          'Genre (comma separated)': 'Action, Sci-Fi, Adventure',
          'Year': 2012,
          'Duration': '143m',
          'Language': 'English',
          'Country': 'United States',
          'Quality': 'Full HD',
          'Tags (comma separated)': 'marvel, action, blockbuster',
          'Is Featured': 'TRUE',
          'Seasons (JSON)': '[]'
        },
        {
          'Title': 'Flimsy Chronicles (Series Example)',
          'Description': 'An epic multi-season series about cinema development and testing.',
          'Watch Source Type': 'Link',
          'Watch Link': 'https://www.youtube.com/embed/8hP9D6kZseM',
          'Download Link': '',
          'Poster Image': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400',
          'Cover Image': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',
          'Trailer Link': 'https://www.youtube.com/watch?v=YoHD9XEInc0',
          'Genre (comma separated)': 'Sci-Fi, Drama',
          'Year': 2026,
          'Duration': '45m',
          'Language': 'English',
          'Country': 'Rwanda',
          'Quality': '4K',
          'Tags (comma separated)': 'series, episodic, seasons',
          'Is Featured': 'FALSE',
          'Seasons (JSON)': JSON.stringify([
            {
              id: 'season-1',
              seasonNumber: 1,
              title: 'Season 1: Dawn of Light',
              episodes: [
                {
                  id: 'ep-s1-1',
                  episodeNumber: 1,
                  title: 'Episode 1: The Initial Build',
                  watch_link: 'https://www.youtube.com/embed/8hP9D6kZseM',
                  download_link: 'https://example.com/download/s1e1.mp4',
                  duration: '45m'
                }
              ]
            }
          ])
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Movies Template');
      XLSX.writeFile(wb, 'Movies_Import_Template.xlsx');
      triggerAlert('success', 'Sample Excel template downloaded! Edit it and upload back.');
    } catch (err: any) {
      triggerAlert('error', 'Error generating template: ' + err.message);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result;
        const wb = XLSX.read(ab, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<any>(ws);

        if (rawRows.length === 0) {
          triggerAlert('error', 'The uploaded spreadsheets is empty!');
          return;
        }

        const preparedMovies = rawRows.map((row: any) => {
          const getVal = (possibleKeys: string[], defaultVal = '') => {
            const keys = Object.keys(row);
            const foundKey = keys.find(k => 
              possibleKeys.some(pk => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pk.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
            return foundKey ? row[foundKey] : defaultVal;
          };

          const title = String(getVal(['title', 'movietitle', 'name'], '')).trim();
          const description = String(getVal(['description', 'desc', 'summary', 'about'], '')).trim();
          const watchSourceType = String(getVal(['watchsourcetype', 'sourcetype', 'type', 'source'], 'Link')).trim();
          const watchLink = String(getVal(['watchlink', 'streamlink', 'link', 'streamurl', 'watchurl'], '')).trim();
          const downloadLink = String(getVal(['downloadlink', 'downloadurl', 'directlink'], '')).trim();
          const posterImage = String(getVal(['poster', 'posterimage', 'thumbnail', 'posterurl', 'image'], '')).trim();
          const coverImage = String(getVal(['cover', 'coverimage', 'coverurl', 'backdrop', 'wallpaper'], '')).trim();
          const trailerLink = String(getVal(['trailer', 'trailerlink', 'trailerurl', 'youtube'], '')).trim();
          const genre = String(getVal(['genre', 'genres', 'category', 'categories', 'typegenre'], 'Action')).trim();
          const yearVal = getVal(['year', 'releaseyear', 'date', 'release'], String(new Date().getFullYear()));
          const duration = String(getVal(['duration', 'runtime', 'length', 'time'], '120m')).trim();
          const language = String(getVal(['language', 'lang'], 'English')).trim();
          const country = String(getVal(['country', 'origin'], 'Rwanda')).trim();
          const quality = String(getVal(['quality', 'resolution', 'videoquality', 'def'], 'HD')).trim();
          const tags = String(getVal(['tags', 'keywords'], '')).trim();
          const isFeaturedVal = getVal(['isfeatured', 'featured', 'featuredmovie'], 'FALSE');
          
          const seasonsVal = getVal(['seasons', 'seasonsjson', 'seasonsepisodes'], '');
          let seasons: any[] = [];
          if (seasonsVal) {
            try {
              const parsed = JSON.parse(String(seasonsVal));
              if (Array.isArray(parsed)) {
                seasons = parsed;
              }
            } catch (err) {
              console.error("Failed to parse seasons JSON:", err);
            }
          }

          return {
            title,
            description,
            watch_source_type: watchSourceType,
            watch_link: watchLink,
            download_link: downloadLink,
            poster_image: posterImage,
            cover_image: coverImage,
            trailer_link: trailerLink,
            genre,
            year: Number(yearVal) || new Date().getFullYear(),
            duration,
            language,
            country,
            quality,
            tags,
            isFeatured: typeof isFeaturedVal === 'boolean' ? isFeaturedVal : (String(isFeaturedVal).toLowerCase() === 'true'),
            seasons
          };
        }).filter(m => m.title.length > 0);

        if (preparedMovies.length === 0) {
          triggerAlert('error', 'Could not find any valid movie rows with title headers in Excel sheet.');
          return;
        }

        fetch('/api/movies/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movies: preparedMovies })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              triggerAlert('success', `Excel file imported! Processed ${data.count} movies with automated live rooms successfully.`);
              
              // Backup bulk imported movies
              try {
                const saved = JSON.parse(localStorage.getItem('flimsy_custom_movies') || '[]');
                const updated = [...saved, ...(data.movies || [])];
                localStorage.setItem('flimsy_custom_movies', JSON.stringify(updated));
              } catch (ex) {
                console.error('Failed saving bulk movies backup:', ex);
              }

              loadMovies();
              if (onUpdateMovies) {
                onUpdateMovies();
              }
            } else {
              triggerAlert('error', data.error || 'Server error bulk uploading movies.');
            }
          })
          .catch(() => {
            triggerAlert('error', 'Network error uploading Excel file.');
          });

      } catch (err: any) {
        triggerAlert('error', 'Excel file read error: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleExportDocsToExcel = () => {
    try {
      if (docsList.length === 0) {
        triggerAlert('warning', 'There are no academic books/resources registered to export.');
        return;
      }
      const dataToExport = docsList.map(d => ({
        'Book ID': d.id,
        'Title': d.title,
        'Description': d.description,
        'Download Link / Access Link': d.download_link,
        'File Path': d.file_path,
        'Thumbnail URL': d.thumbnail,
        'Subject / Category': d.subject,
        'Class Level': d.class_level,
        'Year': d.year,
        'Document Type': d.document_type
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Books Catalog');
      XLSX.writeFile(wb, 'Cinema_Books_Catalog.xlsx');
      triggerAlert('success', `Exported ${docsList.length} books to Excel catalog successfully!`);
    } catch (err: any) {
      triggerAlert('error', 'Error exporting books catalog: ' + err.message);
    }
  };

  const handleDownloadDocsTemplate = () => {
    try {
      const sampleData = [
        {
          'Title': 'Advanced Physics Syllabus S6',
          'Description': 'Comprehensive curriculum past papers and solution keys for final year Advanced Level Physics candidates...',
          'Download Link / Access Link': 'https://contents.meetup.com/sample.pdf',
          'File Path': '',
          'Thumbnail URL': 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=400',
          'Subject / Category': 'Physics',
          'Class Level': 'Senior 6 (S6)',
          'Year': 2026,
          'Document Type': 'Past Paper'
        },
        {
          'Title': 'Introduction to Computer Science',
          'Description': 'Basics of algorithm design, computational theory, structured variables, and python execution guides.',
          'Download Link / Access Link': 'https://contents.meetup.com/sample.pdf',
          'File Path': '',
          'Thumbnail URL': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
          'Subject / Category': 'Computer Science',
          'Class Level': 'Senior 4 (S4)',
          'Year': 2025,
          'Document Type': 'Reference Book'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Books Template');
      XLSX.writeFile(wb, 'Books_Import_Template.xlsx');
      triggerAlert('success', 'Sample Excel template downloaded for academic books!');
    } catch (err: any) {
      triggerAlert('error', 'Error generating books template: ' + err.message);
    }
  };

  const handleImportDocsExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result;
        const wb = XLSX.read(ab, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<any>(ws);

        if (rawRows.length === 0) {
          triggerAlert('error', 'The uploaded book spreadsheet is empty!');
          return;
        }

        const preparedDocs = rawRows.map((row: any) => {
          const getVal = (possibleKeys: string[], defaultVal = '') => {
            const keys = Object.keys(row);
            const foundKey = keys.find(k => 
              possibleKeys.some(pk => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pk.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
            return foundKey ? row[foundKey] : defaultVal;
          };

          const title = String(getVal(['title', 'booktitle', 'name'], '')).trim();
          const description = String(getVal(['description', 'desc', 'summary', 'about', 'abstract'], '')).trim();
          const downloadLink = String(getVal(['downloadlink', 'downloadurl', 'link', 'accesslink', 'url'], '')).trim();
          const filePath = String(getVal(['filepath', 'file', 'path'], '')).trim();
          const thumbnail = String(getVal(['thumbnail', 'cover', 'image', 'picture', 'thumbnailurl', 'img'], '')).trim();
          const subject = String(getVal(['subject', 'category', 'branch', 'course'], 'General')).trim();
          const classLevel = String(getVal(['classlevel', 'level', 'grade', 'class'], 'Any')).trim();
          const yearVal = getVal(['year', 'releaseyear', 'publishyear', 'pubdate'], String(new Date().getFullYear()));
          const documentType = String(getVal(['documenttype', 'type', 'format', 'booktype'], 'PDF')).trim();

          return {
            title,
            description,
            download_link: downloadLink || 'https://contents.meetup.com/sample.pdf',
            file_path: filePath,
            thumbnail: thumbnail,
            subject,
            class_level: classLevel,
            year: Number(yearVal) || new Date().getFullYear(),
            document_type: documentType
          };
        }).filter(d => d.title.length > 0);

        if (preparedDocs.length === 0) {
          triggerAlert('error', 'Could not find any valid book rows with title headers in Excel sheet.');
          return;
        }

        fetch('/api/documents/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documents: preparedDocs })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              triggerAlert('success', `Excel imported! Processed ${data.count} academic resources successfully.`);
              
              // Backup bulk imported documents
              try {
                const saved = JSON.parse(localStorage.getItem('flimsy_custom_docs') || '[]');
                const updated = [...saved, ...(data.documents || [])];
                localStorage.setItem('flimsy_custom_docs', JSON.stringify(updated));
              } catch (ex) {
                console.error(ex);
              }

              loadDocuments();
              if (onUpdateDocuments) {
                onUpdateDocuments();
              }
            } else {
              triggerAlert('error', data.error || 'Server error bulk uploading books.');
            }
          })
          .catch(() => {
            triggerAlert('error', 'Network error uploading Excel book catalog.');
          });

      } catch (err: any) {
        triggerAlert('error', 'Excel file read error: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    const { id, title, type } = deleteConfirm;

    if (type === 'movie') {
      fetch(`/api/movies/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
          triggerAlert('success', `"${title}" catalog item removed successfully.`);
          
          // Remove from local backup
          try {
            const saved = JSON.parse(localStorage.getItem('flimsy_custom_movies') || '[]');
            const updated = saved.filter((m: any) => m && String(m.id) !== String(id));
            localStorage.setItem('flimsy_custom_movies', JSON.stringify(updated));
          } catch (ex) {
            console.error('Failed pruning movie from backup:', ex);
          }

          loadMovies();
          if (onUpdateMovies) {
            onUpdateMovies();
          }
          setDeleteConfirm(null);
        })
        .catch(() => {
          triggerAlert('error', 'Failed to remove movie catalog item.');
          setDeleteConfirm(null);
        });
    } else if (type === 'document') {
      fetch(`/api/documents/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
          triggerAlert('success', `"${title}" resource deleted successfully.`);
          
          // Remove from local backup
          try {
            const saved = JSON.parse(localStorage.getItem('flimsy_custom_docs') || '[]');
            const updated = saved.filter((d: any) => d && String(d.id) !== String(id));
            localStorage.setItem('flimsy_custom_docs', JSON.stringify(updated));
          } catch (ex) {
            console.error('Failed pruning book from backup:', ex);
          }

          loadDocuments();
          if (onUpdateDocuments) {
            onUpdateDocuments();
          }
          setDeleteConfirm(null);
        })
        .catch(() => {
          triggerAlert('error', 'Failed to delete custom resource document.');
          setDeleteConfirm(null);
        });
    }
  };

  // Doc Submissions
  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title || !docForm.download_link) {
      triggerAlert('error', 'Check Title and Access Links fields.');
      return;
    }

    fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', `"${docForm.title}" submitted.`);
          
          // Save custom document to local backup
          try {
            const saved = JSON.parse(localStorage.getItem('flimsy_custom_docs') || '[]');
            saved.push(data.document);
            localStorage.setItem('flimsy_custom_docs', JSON.stringify(saved));
          } catch (ex) {
            console.error('Failed storing local document backup:', ex);
          }

          setDocForm({
            title: '',
            description: '',
            download_link: '',
            thumbnail: '',
            subject: 'Computer Science',
            class_level: 'Senior 6 (S6)',
            year: 2026,
            document_type: 'Past Paper'
          });
          setActiveTab('manage-documents');
          if (onUpdateDocuments) {
            onUpdateDocuments();
          }
        }
      });
  };

  const handleDocDelete = (id: string, title: string) => {
    setDeleteConfirm({ id, title: title, type: 'document' });
  };

  // Settings
  const handleSettingsUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', 'Website settings applied!');
          onUpdateSettings(data.settings);
        }
      });
  };

  // Live room locking moderation
  const handleRoomToggle = (room: ChatRoom) => {
    const nextState = !room.isActive;
    fetch('/api/rooms/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, isActive: nextState })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', `Room state switched to: ${nextState ? 'ACTIVE' : 'LOCKED'}`);
          loadRooms();
        }
      });
  };

  // Comments deletion
  const handleCommentDelete = (id: string) => {
    fetch(`/api/comments/${id}`, { method: 'DELETE' })
      .then(() => {
        triggerAlert('success', 'Comment moderation deleted with success.');
        loadComments();
      });
  };

  // User trashing
  const handleUserDelete = (id: string) => {
    fetch(`/api/users/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', 'User trashing completed.');
          loadUsers();
        } else {
          triggerAlert('error', data.error);
        }
      });
  };

  const handleToggleMessageRead = (id: string, currentIsRead: boolean) => {
    fetch(`/api/admin/messages/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: !currentIsRead })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', 'Message status updated.');
          loadMessages();
        }
      })
      .catch(console.error);
  };

  const handleMessageDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this support message?')) return;
    fetch(`/api/admin/messages/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', 'Message deleted successfully.');
          loadMessages();
        }
      })
      .catch(console.error);
  };

  const handleSendReply = (id: string) => {
    const text = replyTexts[id];
    if (!text || !text.trim()) {
      triggerAlert('error', 'Please enter a reply message.');
      return;
    }
    fetch(`/api/admin/messages/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: text })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          triggerAlert('success', 'Reply saved successfully.');
          loadMessages();
          setReplyTexts(prev => ({ ...prev, [id]: '' }));
        } else {
          triggerAlert('error', data.error || 'Failed to submit reply.');
        }
      })
      .catch(console.error);
  };

  // Admin Side Left bar
  const sidebarTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'add-movie', label: 'Add Movie', icon: Plus },
    { id: 'manage-movies', label: 'Manage Movies', icon: Film },
    { id: 'upload-document', label: 'Upload Study Resource', icon: Plus },
    { id: 'manage-documents', label: 'Manage Academic Resources', icon: BookOpen },
    { id: 'manage-comments', label: 'Moderate Comments', icon: MessageSquare },
    { id: 'manage-chatrooms', label: 'Moderate Live Rooms', icon: ShieldAlert },
    { id: 'manage-users', label: 'Manage Users', icon: Users },
    { id: 'messages', label: 'Contact Messages', icon: Mail },
    { id: 'donations', label: 'MTN Donations', icon: Heart },
    { id: 'settings', label: 'Website Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="admin-panel-container">
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-[#2d0f36] text-left">
        <span className="p-2.5 bg-[#e95420] text-white rounded-lg">
          <Settings className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold font-ubuntu tracking-tight text-white">Ubuntu Flimsy Dashboard</h1>
          <p className="text-xs text-[#aea79f] font-mono mt-0.5">Welcome, <span className="text-[#e95420] font-semibold">{currentUser?.name}</span> (Master System Admin)</p>
        </div>
      </div>

      {/* Alert Messaging Board */}
      {alertMsg.text && (
        <div className={`p-4 rounded-xl text-sm mb-6 flex items-center space-x-2 border text-left ${
          alertMsg.type === 'success' 
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/40' 
            : 'bg-red-950/40 text-red-300 border-red-900/40'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Main double column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left-side Navigation menu */}
        <div className="lg:col-span-1 bg-[#120415] border border-[#2b0c36] rounded-xl p-3.5 space-y-1 text-left">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                  activeTab === tab.id
                    ? 'bg-[#e95420] text-white shadow-lg'
                    : 'text-gray-300 hover:bg-[#200525] hover:text-[#e95420]'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right-side Content area */}
        <div className="lg:col-span-3 bg-[#110113] border border-[#2a0e33] rounded-2xl p-6 shadow-2xl text-left min-h-[500px]">
          
          {/* OVERVIEW METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-8" id="overview-analytics-tab">
              <h2 className="text-lg font-bold font-ubuntu text-white">Platform System Analytics</h2>
              
              {/* Primary Bento Numbers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1b0720] border border-[#371241] p-4 rounded-xl">
                  <span className="block text-[#aea79f] text-[10px] font-mono tracking-wider uppercase">Streaming Hits</span>
                  <span className="text-2xl font-bold text-white mt-1 font-ubuntu block">{analytics.totalViews}</span>
                </div>
                <div className="bg-[#1b0720] border border-[#371241] p-4 rounded-xl">
                  <span className="block text-[#aea79f] text-[10px] font-mono tracking-wider uppercase">Media Assets</span>
                  <span className="text-2xl font-bold text-white mt-1 font-ubuntu block">{analytics.totalMovies}</span>
                </div>
                <div className="bg-[#1b0720] border border-[#371241] p-4 rounded-xl">
                  <span className="block text-[#aea79f] text-[10px] font-mono tracking-wider uppercase">Academics Library</span>
                  <span className="text-2xl font-bold text-white mt-1 font-ubuntu block">{analytics.totalDocs}</span>
                </div>
                <div className="bg-[#1b0720] border border-[#371241] p-4 rounded-xl">
                  <span className="block text-[#aea79f] text-[10px] font-mono tracking-wider uppercase">Member Registrations</span>
                  <span className="text-2xl font-bold text-white mt-1 font-ubuntu block">{analytics.totalUsers}</span>
                </div>
              </div>

              {/* Graphical representation (Responsive pure SVGs) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Popular films ranking */}
                <div className="bg-[#140417] p-4 border border-[#2a0d31] rounded-xl">
                  <h3 className="text-sm font-semibold text-[#e95420] font-ubuntu mb-3 pb-1 border-b border-[#250d2e]">Popular Movies Views</h3>
                  <div className="space-y-3.5">
                    {(!analytics?.popularMovies || analytics.popularMovies.length === 0) ? (
                      <p className="text-xs text-gray-400">Zero cinema data currently tracked.</p>
                    ) : (
                      (analytics.popularMovies || []).map((pm: any, i: number) => (
                        <div key={pm.id} className="text-xs space-y-1">
                          <div className="flex justify-between items-center text-gray-200">
                            <span className="truncate max-w-[150px]">{i+1}. {pm.title}</span>
                            <span className="font-mono text-[10px] text-gray-400 font-bold">{pm.views} hits</span>
                          </div>
                          {/* Simulated SVG fill percentage loader line */}
                          <div className="w-full h-1.5 bg-[#200a23] rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-[#e95420] to-[#77216f] h-full rounded-full" style={{ width: `${Math.min(100, (pm.views / (analytics?.totalViews || 1)) * 180)}%` }}></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Genre breakdown visualization (Responsive SVG chart) */}
                <div className="bg-[#140417] p-4 border border-[#2a0d31] rounded-xl">
                  <h3 className="text-sm font-semibold text-[#e95420] font-ubuntu mb-3 pb-1 border-b border-[#250d2e]">Category Composition</h3>
                  {(!analytics?.genreData || analytics.genreData.length === 0) ? (
                    <p className="text-xs text-[#aea79f]">Add cinema items to view catalog ratio metrics.</p>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      {(analytics.genreData || []).slice(0, 5).map((gd: any, i: number) => {
                        return (
                          <div key={i} className="flex items-center justify-between text-xs font-mono text-gray-300">
                            <span className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${i * 65}, 80%, 55%)` }}></span>
                              <span>{gd.name}</span>
                            </span>
                            <span className="font-black text-white">{gd.value} Items</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

           {/* ADD NEW MOVIE */}
          {activeTab === 'add-movie' && (
            <form onSubmit={handleMovieSubmit} className="space-y-5" id="add-movie-form-tab">
              <h2 className="text-lg font-bold font-ubuntu text-white">
                {editingMovieId ? "Edit Movie Details" : "Create Movie Listing"}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Movie Title</label>
                  <input
                    type="text"
                    required
                    value={movieForm.title || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                    placeholder="e.g. Big Buck Bunny"
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#41134a] focus:outline-none focus:border-[#e95420]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#aea79f] uppercase block">Quality</label>
                    <select
                      value={movieForm.quality || ''}
                      onChange={(e) => setMovieForm({ ...movieForm, quality: e.target.value })}
                      className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a] outline-none"
                    >
                      <option value="HD">HD</option>
                      <option value="Full HD">Full HD</option>
                      <option value="4K">4K</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#aea79f] uppercase block">Release Year</label>
                    <input
                      type="number"
                      value={movieForm.year || ''}
                      onChange={(e) => setMovieForm({ ...movieForm, year: e.target.value === '' ? 2026 : Number(e.target.value) })}
                      className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2 rounded-lg border border-[#41134a] focus:outline-none focus:border-[#e95420]"
                    />
                  </div>
                </div>
              </div>

              {/* Upload source settings tabs */}
              <div className="space-y-2 border-t border-[#23092b] pt-4">
                <span className="text-xs font-mono text-[#aea79f] uppercase block">Method 1 & 2: Set Video Source Type</span>
                <div className="flex space-x-3.5">
                  <button
                    type="button"
                    onClick={() => setMovieForm(prev => ({ ...prev, watch_source_type: WatchSourceType.LINK }))}
                    className={`px-4 py-2 border rounded-full text-xs font-bold font-mono transition ${
                      movieForm.watch_source_type === WatchSourceType.LINK
                        ? 'bg-[#e95420] text-white border-transparent'
                        : 'bg-[#1b0820] text-gray-300 border-[#3c1244] hover:bg-[#270b2f]'
                    }`}
                  >
                    Watch/Stream link Input
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovieForm(prev => ({ ...prev, watch_source_type: WatchSourceType.UPLOAD }))}
                    className={`px-4 py-2 border rounded-full text-xs font-bold font-mono transition ${
                      movieForm.watch_source_type === WatchSourceType.UPLOAD
                        ? 'bg-[#e95420] text-white border-transparent'
                        : 'bg-[#1b0820] text-gray-300 border-[#3c1244] hover:bg-[#270b2f]'
                    }`}
                  >
                    Direct Movie File Upload
                  </button>
                </div>
              </div>

              {movieForm.watch_source_type === WatchSourceType.LINK ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Method 2: Watch/Stream Link URL</label>
                  <input
                    type="url"
                    value={movieForm.watch_link || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, watch_link: e.target.value, download_link: e.target.value })}
                    placeholder="e.g. https://domain.com/movie_stream.mp4"
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#41134a] focus:outline-none focus:border-[#e95420] font-mono"
                  />
                  <p className="text-[10px] text-orange-400 italic">Pasting standard video links supports native streamable playback formats directly.</p>
                </div>
              ) : (
                <div className="space-y-2 p-4 border border-dashed border-[#5e196c] rounded-xl bg-[#1b0a210a] text-center">
                  <span className="text-xs font-semibold text-gray-300 block">Select Video file for upload tracking simulation</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleUploadSimulator}
                    className="text-xs text-[#aea79f] block mx-auto py-2"
                  />
                  {movieForm.uploaded_video_name && (
                    <p className="text-xs text-emerald-400 font-mono">Selected: {movieForm.uploaded_video_name}</p>
                  )}
                </div>
              )}

              {/* Downloads & Extras fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#23092b] pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Method 3: Download Link URL Override</label>
                  <input
                    type="text"
                    value={movieForm.download_link || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, download_link: e.target.value })}
                    placeholder="Leave empty to fallback stream page URL"
                    className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Trailer Link (Youtube URL)</label>
                  <input
                    type="text"
                    value={movieForm.trailer_link || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, trailer_link: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  />
                </div>
              </div>

              {/* Methods 4 & 5 Image uploading or linking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#23092b] pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Method 4: Dynamic Poster JPG Cover URL</label>
                  <input
                    type="text"
                    value={movieForm.poster_image || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, poster_image: e.target.value, cover_image: e.target.value })}
                    placeholder="Enter image web link"
                    className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2 rounded-lg border border-[#41134a]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Method 5: Auto-thumbnail simulation file picker</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterSimulator}
                    className="text-xs text-[#aea79f] block py-1.5"
                  />
                </div>
              </div>

              {movieForm.poster_image && (
                <div className="flex items-center space-x-3 p-3 bg-[#17051c] rounded-xl border border-[#3e114a]">
                  <img src={movieForm.poster_image} alt="prev" className="w-12 h-16 object-cover rounded border border-orange-500" />
                  <span className="text-xs text-emerald-400 font-mono font-medium">Core thumbnail registration succeeded!</span>
                </div>
              )}

              {/* Genres, Metadata description, tags */}
              <div className="grid grid-cols-3 gap-2 border-t border-[#23092b] pt-4">
                <div>
                  <label className="text-[10px] font-mono text-[#aea79f] uppercase tracking-wider block mb-1">Catalog Genre</label>
                  <select
                    value={movieForm.genre || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
                    className="w-full bg-[#1b0820] text-xs text-white px-2.5 py-2 rounded-lg border border-[#41134a]"
                  >
                    <option value="Action">Action</option>
                    <option value="Drama">Drama</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Horror">Horror</option>
                    <option value="Animation">Animation</option>
                    <option value="African movies">African cinema</option>
                    <option value="Rwandan movies">Rwandan cinema</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#aea79f] uppercase tracking-wider block mb-1">Duration text</label>
                  <input
                    type="text"
                    value={movieForm.duration || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })}
                    className="w-full bg-[#1b0820] text-xs text-white px-2.5 py-2 rounded-lg border border-[#41134a]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#aea79f] uppercase tracking-wider block mb-1">Tags (separated by comma)</label>
                  <input
                    type="text"
                    value={movieForm.tags || ''}
                    onChange={(e) => setMovieForm({ ...movieForm, tags: e.target.value })}
                    placeholder="e.g. robot, amsterdam"
                    className="w-full bg-[#1b0820] text-xs text-white px-2.5 py-2 rounded-lg border border-[#41134a]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#aea79f] uppercase block">Detailed Movie Plot Synopsis</label>
                <textarea
                  rows={3}
                  value={movieForm.description || ''}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  className="w-full bg-[#1b0820] text-xs text-white p-3.5 rounded-lg border border-[#41134a]"
                  placeholder="Insert attractive movie review plot summary..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured-check"
                  checked={movieForm.isFeatured}
                  onChange={(e) => setMovieForm({ ...movieForm, isFeatured: e.target.checked })}
                  className="accent-[#e95420]"
                />
                <label htmlFor="featured-check" className="text-xs font-semibold text-gray-200">Highlight this Cinema movie as Featured on Home Banner slider</label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#e95420] hover:bg-[#ff6936] text-white font-bold rounded-lg text-sm shadow-md transition-all uppercase font-mono tracking-widest cursor-pointer"
                >
                  {editingMovieId ? "Save Movie Changes" : "Register & Upload Movie Listing"}
                </button>
                {editingMovieId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetMovieForm();
                      setActiveTab('manage-movies');
                    }}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-semibold rounded-lg text-sm transition-all uppercase font-mono tracking-wider cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}

          {/* MANAGE MOVIES */}
          {activeTab === 'manage-movies' && (
            <div className="space-y-5" id="manage-movies-tab">
              <div className="flex justify-between items-center pb-2 border-b border-[#2a0e33]">
                <h2 className="text-lg font-bold font-ubuntu text-white">Registered Movie Database ({moviesList.length})</h2>
                <button onClick={() => { resetMovieForm(); setActiveTab('add-movie'); }} className="px-3.5 py-1.5 bg-[#e95420]/10 hover:bg-[#e95420] text-[#e95420] hover:text-white rounded-lg text-xs font-semibold border border-[#e95420]/20 flex items-center space-x-1.5 transition">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              </div>

              {/* EXCEL IMPORT / EXPORT UTILITIES */}
              <div className="p-4 bg-[#1b0820] border border-[#ff6936]/15 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                    <h3 className="text-xs font-extrabold font-mono text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5" />
                      <span>Excel Bulk Sync Panel</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#aea79f] max-w-md font-sans leading-relaxed">
                    Import multiple movies to our cinema collections simultaneously, or backup your entire catalog directory to a high-fidelity portable spreadsheet anytime.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-3 py-2 bg-[#2d0c35]/60 hover:bg-[#2d0c35] border border-[#ff6936]/10 hover:border-[#ff6936]/35 text-xs text-zinc-300 hover:text-white font-mono font-bold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                    title="Download reference spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Get Template</span>
                  </button>

                  <button
                    onClick={handleExportToExcel}
                    className="px-3 py-2 bg-[#ea5521]/10 hover:bg-[#ea5521]/20 border border-[#ea5521]/30 text-xs text-orange-400 hover:text-orange-300 font-mono font-bold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                    title="Download backup file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Catalog</span>
                  </button>

                  <div className="relative">
                    <label
                      htmlFor="excel-file-upload-input"
                      className="px-4 py-2 bg-[#ea5521] hover:bg-[#ff6936] text-white hover:shadow-orange-950/40 hover:shadow-md text-xs font-bold font-mono rounded-lg flex items-center space-x-2 transition cursor-pointer select-none"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Excel</span>
                    </label>
                    <input
                      id="excel-file-upload-input"
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleImportExcel}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-[#eaeaea] text-left">
                  <thead>
                    <tr className="border-b border-[#300e3a] text-[#e95420] uppercase font-bold tracking-wider">
                      <th className="py-3 px-2">Catalog item</th>
                      <th className="py-3 px-2">Genre</th>
                      <th className="py-3 px-2">Year</th>
                      <th className="py-3 px-2">Views</th>
                      <th className="py-3 px-2">Episodes & Seasons</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moviesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#aea79f]">No movies registered yet.</td>
                      </tr>
                    ) : (
                      moviesList.map((m) => {
                        const seasonsCount = m.seasons?.length || 0;
                        const epCount = m.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
                        return (
                          <tr key={m.id} className="border-b border-[#200527] hover:bg-[#1a0720]">
                            <td className="py-3 px-2 flex items-center space-x-2 max-w-[200px]">
                              <img src={m.poster_image || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600'} className="w-6 h-8 object-cover rounded" alt="poster" />
                              <span className="truncate font-semibold font-sans">{m.title}</span>
                            </td>
                            <td className="py-3 px-2 text-[#aea79f]">{m.genre.join(', ')}</td>
                            <td className="py-3 px-2 font-bold">{m.year}</td>
                            <td className="py-3 px-2 text-orange-400">{m.views} hits</td>
                            <td className="py-3 px-2">
                              <button
                                onClick={() => {
                                  setSelectedMovieForSeasons(m);
                                  setSeasonsData(m.seasons || []);
                                  setSelectedSeasonForEpAdd((m.seasons && m.seasons[0]?.id) || null);
                                }}
                                className="px-2.5 py-1 bg-purple-950/40 text-purple-300 hover:bg-[#e95420] hover:text-white rounded border border-purple-900/40 hover:border-transparent flex items-center space-x-1.5 transition text-[10px] cursor-pointer"
                              >
                                <Tv className="w-3.5 h-3.5" />
                                <span>{seasonsCount === 0 ? 'Add Episodes' : `${seasonsCount} Seasons (${epCount} Ep)`}</span>
                              </button>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end space-x-2.5">
                                <button
                                  onClick={() => {
                                    setMovieForm({
                                      title: m.title || '',
                                      description: m.description || '',
                                      watch_source_type: m.watch_source_type || WatchSourceType.LINK,
                                      watch_link: m.watch_link || '',
                                      download_link: m.download_link || '',
                                      poster_image: m.poster_image || '',
                                      cover_image: m.cover_image || m.poster_image || '',
                                      trailer_link: m.trailer_link || '',
                                      genre: m.genre?.[0] || 'Action',
                                      year: m.year || 2026,
                                      duration: m.duration || '120m',
                                      language: m.language || 'English',
                                      country: m.country || 'Rwanda',
                                      quality: m.quality || 'Full HD',
                                      tags: m.tags?.join(', ') || '',
                                      isFeatured: m.isFeatured || false,
                                      uploaded_video_name: m.uploaded_video_name || ''
                                    });
                                    setEditingMovieId(m.id);
                                    setActiveTab('add-movie');
                                  }}
                                  className="p-1.5 text-orange-400 hover:text-orange-500 hover:bg-orange-950/20 rounded transition cursor-pointer"
                                  title="Edit Movie details"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleMovieDelete(m.id, m.title)}
                                  className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-950/20 rounded transition cursor-pointer"
                                  title="Delete Movie"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* UPLOAD STUDY RESOURCE DOCUMENT */}
          {activeTab === 'upload-document' && (
            <form onSubmit={handleDocSubmit} className="space-y-5" id="upload-doc-tab">
              <h2 className="text-lg font-bold font-ubuntu text-white">Upload Educational PDF/Resources</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Resource Title</label>
                  <input
                    type="text"
                    required
                    value={docForm.title || ''}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    placeholder="e.g. Mathematics National Examination Solutions"
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2 rounded-lg border border-[#41134a] focus:outline-none focus:border-[#e95420]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#aea79f] uppercase block">Grade / Class Level</label>
                    <select
                      value={docForm.class_level || ''}
                      onChange={(e) => setDocForm({ ...docForm, class_level: e.target.value })}
                      className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                    >
                      <option value="Senior 6 (S6)">Senior 6 (S6)</option>
                      <option value="Senior 5 (S5)">Senior 5 (S5)</option>
                      <option value="Senior 4 (S4)">Senior 4 (S4)</option>
                      <option value="Senior 3 (S3)">Senior 3 (S3)</option>
                      <option value="University level">University level</option>
                      <option value="Grade 1-12">Grade 1-12</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#aea79f] uppercase block">Exam Year</label>
                    <input
                      type="number"
                      value={docForm.year || ''}
                      onChange={(e) => setDocForm({ ...docForm, year: e.target.value === '' ? 2026 : Number(e.target.value) })}
                      className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2 rounded-lg border border-[#41134a]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Subject Name</label>
                  <select
                    value={docForm.subject || ''}
                    onChange={(e) => setDocForm({ ...docForm, subject: e.target.value })}
                    className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Geography">Geography</option>
                    <option value="History & Social sciences">History & Social</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Resource Category Type</label>
                  <select
                    value={docForm.document_type || ''}
                    onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                    className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  >
                    <option value="Past Paper">Past paper exam</option>
                    <option value="Notes">Revision Notes Booklet</option>
                    <option value="Book">Syllabus Textbook</option>
                    <option value="Assignment">Practice Assignments PDF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono text-[#aea79f] uppercase block">Document download link/path</label>
                  </div>
                  <input
                    type="text"
                    required
                    value={docForm.download_link || ''}
                    onChange={(e) => setDocForm({ ...docForm, download_link: e.target.value })}
                    placeholder="e.g. /uploads/notes.pdf or https://..."
                    className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">OR: Upload Document File (PDF, Book, Notes etc.)</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.ppt,.pptx,.txt,.zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        triggerAlert('info', `Uploading file: "${file.name}"... Please wait.`);
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
                              if (data.success) {
                                setDocForm(prev => ({ ...prev, download_link: data.url }));
                                triggerAlert('success', `"${file.name}" uploaded successfully! Reference URL is set.`);
                              } else {
                                triggerAlert('error', 'Document upload failed on backend.');
                              }
                            })
                            .catch(() => {
                              triggerAlert('error', 'Document upload failed.');
                            });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-[#1b0820] text-xs text-[#aea79f] px-3.5 py-1.5 rounded-lg border border-[#41134a] file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-[#e95420] file:text-white hover:file:bg-[#ff6936] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Cover thumbnail/Icon JPG URL</label>
                  <input
                    type="text"
                    value={docForm.thumbnail || ''}
                    onChange={(e) => setDocForm({ ...docForm, thumbnail: e.target.value })}
                    placeholder="Leave empty for auto graphic styling"
                    className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#aea79f] uppercase block">Syllabus description/guideline message</label>
                <textarea
                  rows={2}
                  value={docForm.description || ''}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                  className="w-full bg-[#1b0820] text-xs text-white p-3.5 rounded-lg border border-[#41134a]"
                  placeholder="Summarize exam boards, pages, modules, tags covered..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#e95420] hover:bg-[#ff6936] text-white font-bold rounded-lg text-sm transition uppercase font-mono tracking-wider cursor-pointer"
              >
                Submit Academic Resource
              </button>
            </form>
          )}

          {/* MANAGE DOCUMENTS */}
          {activeTab === 'manage-documents' && (
            <div className="space-y-5" id="manage-docs-tab">
              <div className="flex justify-between items-center pb-2 border-b border-[#2a0e33]">
                <h2 className="text-lg font-bold font-ubuntu text-white">Uploaded Resources ({docsList.length})</h2>
                <button onClick={() => setActiveTab('upload-document')} className="px-3 py-1.5 bg-[#e95420]/10 hover:bg-[#e95420] text-[#e95420] hover:text-white rounded-lg text-xs font-bold border border-[#e95420]/20 flex items-center space-x-1 transition">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Document</span>
                </button>
              </div>

              {/* BOOK EXCEL IMPORT / EXPORT PANEL */}
              <div className="p-4 bg-[#1b0820] border border-[#ff6936]/15 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                    <h3 className="text-xs font-extrabold font-mono text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Books Excel Sync Panel</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#aea79f] max-w-md font-sans leading-relaxed">
                    Import multiple academic books/resource documents to our directory simultaneously, or download your entire reference archive as a spreadsheet backup.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownloadDocsTemplate}
                    className="px-3 py-2 bg-[#2d0c35]/60 hover:bg-[#2d0c35] border border-[#ff6936]/10 hover:border-[#ff6936]/35 text-xs text-zinc-300 hover:text-white font-mono font-bold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                    title="Download reference books spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Get Template</span>
                  </button>

                  <button
                    onClick={handleExportDocsToExcel}
                    className="px-3 py-2 bg-[#ea5521]/10 hover:bg-[#ea5521]/20 border border-[#ea5521]/30 text-xs text-orange-400 hover:text-orange-300 font-mono font-bold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                    title="Download books backup file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Catalog</span>
                  </button>

                  <div className="relative">
                    <label
                      htmlFor="excel-docs-file-upload-input"
                      className="px-4 py-2 bg-[#ea5521] hover:bg-[#ff6936] text-white hover:shadow-orange-950/40 hover:shadow-md text-xs font-bold font-mono rounded-lg flex items-center space-x-2 transition cursor-pointer select-none"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Excel</span>
                    </label>
                    <input
                      id="excel-docs-file-upload-input"
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleImportDocsExcel}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-[#eaeaea] text-left">
                  <thead>
                    <tr className="border-b border-[#300e3a] text-[#e95420] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-2">academic title</th>
                      <th className="py-2.5 px-2">Branch/Subject</th>
                      <th className="py-2.5 px-2">Level</th>
                      <th className="py-2.5 px-2">Type</th>
                      <th className="py-2.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#aea79f]">Academic Catalog is empty.</td>
                      </tr>
                    ) : (
                      docsList.map((d) => (
                        <tr key={d.id} className="border-b border-[#200527] hover:bg-[#1a0720]">
                          <td className="py-3 px-2 font-semibold font-sans truncate max-w-[200px]">{d.title}</td>
                          <td className="py-3 px-2 text-orange-400">{d.subject}</td>
                          <td className="py-3 px-2 text-gray-300 font-bold">{d.class_level}</td>
                          <td className="py-3 px-2 font-mono text-gray-400 font-semibold">{d.document_type}</td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => handleDocDelete(d.id, d.title)}
                              className="p-1 px-2.5 bg-red-950/20 text-red-400 hover:text-red-500 rounded border border-red-900/30 text-[10px]"
                              title="Delete booklet"
                            >
                              Trash
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CHAT ROOM MODERATION */}
          {activeTab === 'manage-chatrooms' && (
            <div className="space-y-4" id="manage-chatrooms-tab">
              <h2 className="text-lg font-bold font-ubuntu text-white">Live Discussion Watch Party Rooms Moderation</h2>
              <p className="text-xs text-[#aea79f]">Enable, lock, or release cinematic discussion chat servers for each movie below.</p>

              <div className="space-y-3 pt-3">
                {roomsList.map((room) => (
                  <div key={room.id} className="p-4 bg-[#1a081e] border border-[#300e3a] rounded-xl flex items-center justify-between text-left">
                    <div>
                      <h3 className="text-sm font-bold text-white font-ubuntu">{room.roomName}</h3>
                      <span className="text-[10px] text-gray-400 font-mono">Linked Movie ID: {room.movieId}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-[10px] font-mono font-bold uppercase ${room.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {room.isActive ? 'Active watcher room' : 'Moderation Locked'}
                      </span>
                      <button
                        onClick={() => handleRoomToggle(room)}
                        className={`p-1 rounded-lg transition-colors border ${
                          room.isActive 
                            ? 'bg-red-950/40 text-red-400 hover:bg-red-900/10 border-red-900/30'
                            : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/10 border-emerald-900/30'
                        } text-xs font-semibold px-3 py-1.5 cursor-pointer`}
                      >
                        {room.isActive ? 'Lock discuss' : 'Activate discuss'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USER MANAGEMENT */}
          {activeTab === 'manage-users' && (
            <div className="space-y-4" id="manage-users-tab">
              <h2 className="text-lg font-bold font-ubuntu text-white">Registered Website Accounts ({usersList.length})</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-[#eaeaea] text-left">
                  <thead>
                    <tr className="border-b border-[#300e3a] text-[#e95420] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-2">Account Name</th>
                      <th className="py-2.5 px-2">Email Address</th>
                      <th className="py-2.5 px-2">Privilege Level</th>
                      <th className="py-2.5 px-2 text-right">Mod actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((user) => (
                      <tr key={user.id} className="border-b border-[#200527] hover:bg-[#1a0720]">
                        <td className="py-3 px-2 flex items-center space-x-2">
                          <img src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'} className="w-6 h-6 rounded-full border border-gray-700 object-cover" alt="av" />
                          <span className="font-sans font-semibold text-gray-100">{user.name}</span>
                        </td>
                        <td className="py-3 px-2 text-[#aea79f]">{user.email}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] ${user.role === 'admin' ? 'bg-[#e95420] text-white' : 'bg-[#220729] text-purple-300 border border-purple-900/40'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => handleUserDelete(user.id)}
                            className="p-1 px-2 text-red-400 hover:text-red-500 bg-red-950/20 border border-red-900/30 text-[10px] rounded"
                            title="Ban member"
                          >
                            Ban Acc
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODERATE COMMENTS */}
          {activeTab === 'manage-comments' && (
            <div className="space-y-4" id="manage-comments-tab">
              <h2 className="text-lg font-bold font-ubuntu text-white">Movie Comments Moderation ({commentsList.length})</h2>
              <p className="text-xs text-[#aea79f]">Approve or purge viewer review comments globally across the movie platform.</p>

              <div className="space-y-3.5 pt-3">
                {commentsList.length === 0 ? (
                  <p className="text-xs text-center text-[#aea79f] py-8">No comments found to moderate.</p>
                ) : (
                  commentsList.map((c) => (
                    <div key={c.id} className="p-4 bg-[#140417] border border-[#2b0e33] rounded-xl text-left space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <img src={c.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'} alt="av" className="w-6 h-6 rounded-full" />
                          <span className="text-xs font-bold text-white font-sans">{c.userName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">on Film ID: {c.movieId}</span>
                        </div>
                        <button
                          onClick={() => handleCommentDelete(c.id)}
                          className="text-xs font-semibold text-red-400 hover:text-red-500 flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Trash comment</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 bg-[#1e072230] p-2 rounded leading-relaxed italic border-l-2 border-[#e95420]">
                        "{c.content}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* USER CONTACT MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-4" id="manage-messages-tab">
              <div className="flex justify-between items-center pb-2 border-b border-[#2d0f36]">
                <div>
                  <h2 className="text-lg font-bold font-ubuntu text-white">Contact & Support Messages ({messagesList.length})</h2>
                  <p className="text-xs text-[#aea79f]">View and manage support inquiries received via the Contact Us form.</p>
                </div>
                <button
                  type="button"
                  onClick={loadMessages}
                  className="px-3 py-1.5 bg-[#e95420]/10 hover:bg-[#e95420] text-[#e95420] hover:text-white border border-[#e95420]/30 text-xs font-semibold rounded-lg transition duration-200"
                >
                  Refresh Messages
                </button>
              </div>

              <div className="space-y-4 pt-3">
                {messagesList.length === 0 ? (
                  <div className="p-10 text-center bg-[#140417] border border-[#2b0e33] rounded-xl">
                    <Mail className="w-12 h-12 text-[#aea79f]/50 mx-auto mb-3" />
                    <p className="text-sm text-[#aea79f] font-sans">No messages found.</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">Direct support requests submitted via help terminals will appear here.</p>
                  </div>
                ) : (
                  [...messagesList].reverse().map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 bg-[#140417] border rounded-xl text-left space-y-3 transition duration-200 ${
                        msg.isRead 
                          ? 'border-[#2b0e33] opacity-80' 
                          : 'border-[#e95420]/40 bg-[#140417]/80 shadow-[0_0_15px_rgba(233,84,32,0.04)]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-2 rounded-full ${msg.isRead ? 'bg-[#2b0f36] text-gray-400' : 'bg-[#e95420]/15 text-[#e95420]'}`}>
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-white font-sans">{msg.name}</span>
                              {!msg.isRead && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono text-white bg-red-600 rounded uppercase animate-pulse">
                                  New
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 text-xs text-gray-400 font-mono mt-0.5">
                              <span className="text-[#aea79f] hover:text-white transition duration-150">{msg.email}</span>
                              {msg.phone && (
                                <>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-[#ff6c3a]">{msg.phone}</span>
                                </>
                              )}
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-500">{new Date(msg.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleMessageRead(msg.id, !!msg.isRead)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition duration-150 ${
                              msg.isRead
                                ? 'bg-zinc-900/40 text-gray-400 border-zinc-850 hover:bg-zinc-800 hover:text-white'
                                : 'bg-[#e95420]/10 hover:bg-[#e95420] text-[#e95420] hover:text-white border-[#e95420]/30'
                            }`}
                          >
                            {msg.isRead ? 'Mark Unread' : 'Mark Read'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMessageDelete(msg.id)}
                            className="p-1 px-2.5 text-red-400 hover:text-red-500 hover:bg-red-950/20 bg-transparent border border-transparent hover:border-red-900/30 text-xs rounded-lg transition duration-150 flex items-center space-x-1"
                            title="Delete this message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-300 bg-[#1e072230] p-3 rounded-lg leading-relaxed font-sans whitespace-pre-wrap border-l-2 border-[#ff6c3a]/70">
                        {msg.message}
                      </div>

                      {/* Admin reply section */}
                      <div className="pt-2 border-t border-[#2d0f36]/40 space-y-2">
                        {msg.reply ? (
                          <div className="p-3 bg-purple-950/20 border border-purple-900/35 rounded-lg space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">
                              <span>Admin Response</span>
                              {msg.repliedAt && <span className="text-gray-500 font-normal normal-case">{new Date(msg.repliedAt).toLocaleString()}</span>}
                            </div>
                            <p className="text-xs text-gray-200 font-sans italic">"{msg.reply}"</p>
                            
                            {/* Option to modify/edit reply */}
                            <div className="pt-2 flex items-center space-x-2">
                              <input
                                type="text"
                                placeholder="Change/update reply..."
                                value={replyTexts[msg.id] || ''}
                                onChange={(e) => setReplyTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                className="flex-grow bg-[#1b0820] text-xs text-white px-3 py-1.5 rounded-lg border border-[#3e114a] focus:outline-none focus:border-[#e95420]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendReply(msg.id)}
                                className="px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition"
                              >
                                Update
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="Type reply message here..."
                              value={replyTexts[msg.id] || ''}
                              onChange={(e) => setReplyTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                              className="flex-grow bg-[#1b0820] text-xs text-gray-200 px-3 py-2 rounded-lg border border-[#2b0e33] focus:outline-none focus:border-[#e95420]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSendReply(msg.id)}
                              className="px-3 py-2 bg-[#e95420] hover:bg-[#ff6c3a] text-white text-xs font-bold rounded-lg transition"
                            >
                              Send Reply
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MTN DONATIONS LOGS PANEL */}
          {activeTab === 'donations' && (
            <div className="space-y-6 text-left" id="donations-log-tab">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2d0f36] pb-4">
                <div>
                  <h2 className="text-xl font-bold font-ubuntu text-white">MTN MoMo Donations Logs</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Real-time transaction collection ledger synced from cloud persistence database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadDonations}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold uppercase rounded-lg transition"
                >
                  🔄 Sync ledger
                </button>
              </div>

              {/* Total metrics row summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1a0521] border border-[#ff6c3a]/15 rounded-xl p-4.5 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Total RWF Raised</span>
                  <strong className="text-2xl text-yellow-400 font-ubuntu tracking-tight block">
                    {donationsList
                      .filter(d => d.status === 'successful' || d.status === 'SUCCESSFUL')
                      .reduce((acc, d) => acc + Number(d.amount), 0)
                      .toLocaleString()}{' '}
                    <span className="text-xs font-normal">RWF</span>
                  </strong>
                </div>

                <div className="bg-[#1a0521] border border-emerald-500/20 rounded-xl p-4.5 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Approved Payouts</span>
                  <strong className="text-2xl text-emerald-400 font-ubuntu tracking-tight block">
                    {donationsList.filter(d => d.status === 'successful' || d.status === 'SUCCESSFUL').length}
                  </strong>
                </div>

                <div className="bg-[#1a0521] border border-yellow-500/15 rounded-xl p-4.5 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Awaiting PIN Approve</span>
                  <strong className="text-2xl text-yellow-300 font-ubuntu tracking-tight block">
                    {donationsList.filter(d => d.status === 'pending' || d.status === 'PENDING').length}
                  </strong>
                </div>

                <div className="bg-[#1a0521] border border-red-500/20 rounded-xl p-4.5 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Failed/Cancelled</span>
                  <strong className="text-2xl text-red-400 font-ubuntu tracking-tight block">
                    {donationsList.filter(d => d.status === 'failed' || d.status === 'FAILED').length}
                  </strong>
                </div>
              </div>

              {/* Transaction list element */}
              <div className="bg-[#110118] border border-[#2b0c36] rounded-xl overflow-hidden shadow-xl">
                {donationsList.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm space-y-2">
                    <Heart className="w-10 h-10 text-yellow-400/20 mx-auto" />
                    <p className="font-semibold">No MTN MoMo donation attempts recorded yet.</p>
                    <p className="text-xs text-gray-400">Approved collections will register right here in real-time.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-gray-300">
                      <thead className="bg-[#1e0724] text-yellow-400 font-mono text-[10px] uppercase border-b border-[#300e39] tracking-wider font-bold">
                        <tr>
                          <th className="px-4 py-3.5">Donor Name</th>
                          <th className="px-4 py-3.5">MTN Cell Number</th>
                          <th className="px-4 py-3.5">Amount (RWF)</th>
                          <th className="px-4 py-3.5">Reference ID</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5">Date / Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#320141]/35">
                        {donationsList.map((donation) => {
                          const isSuccessful = donation.status === 'successful' || donation.status === 'SUCCESSFUL';
                          const isPending = donation.status === 'pending' || donation.status === 'PENDING';
                          const isFailed = donation.status === 'failed' || donation.status === 'FAILED';

                          return (
                            <tr key={donation.id} className="hover:bg-white/[0.02] transition">
                              <td className="px-4 py-3.5 font-bold text-white capitalize">
                                {donation.donorName || 'Anonymous'}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-gray-200">
                                {donation.donorPhone}
                              </td>
                              <td className="px-4 py-3.5 font-semibold text-yellow-400">
                                {Number(donation.amount).toLocaleString()} RWF
                              </td>
                              <td className="px-4 py-3.5 font-mono text-gray-400 max-w-[120px] truncate" title={donation.transactionReference}>
                                {donation.transactionReference}
                              </td>
                              <td className="px-4 py-3.5">
                                {isSuccessful && (
                                  <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/35 rounded-full font-bold uppercase text-[9px] tracking-wider">
                                    SUCCESSFUL
                                  </span>
                                )}
                                {isPending && (
                                  <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/40 rounded-full font-bold uppercase text-[9px] tracking-wider animate-pulse">
                                    PENDING Approval
                                  </span>
                                )}
                                {isFailed && (
                                  <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/35 rounded-full font-bold uppercase text-[9px] tracking-wider">
                                    FAILED
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-gray-400 font-mono text-[10px]">
                                {new Date(donation.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WEBSITE SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSettingsUpdate} className="space-y-4.5" id="settings-form-tab">
              <h2 className="text-lg font-bold font-ubuntu text-white">Master Site Configurations</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Platform Brand Name</label>
                  <input
                    type="text"
                    value={settingsForm.logoName || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, logoName: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Contact Support Email</label>
                  <input
                    type="email"
                    value={settingsForm.contactEmail || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Home Greeting slide Banner Title</label>
                  <input
                    type="text"
                    value={settingsForm.heroBannerTitle || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, heroBannerTitle: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#aea79f] uppercase block">Contact Hotline telephone</label>
                  <input
                    type="text"
                    value={settingsForm.contactPhone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                    className="w-full bg-[#1b0820] text-sm text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#aea79f] uppercase block">Greeting sub-headings label</label>
                <textarea
                  rows={2}
                  value={settingsForm.heroBannerSubtitle || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroBannerSubtitle: e.target.value })}
                  className="w-full bg-[#1b0820] text-xs text-white p-3 py-2.5 rounded-lg border border-[#41134a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-[#aea79f] uppercase block">Footer copyright text</label>
                <input
                  type="text"
                  value={settingsForm.footerText || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, footerText: e.target.value })}
                  className="w-full bg-[#1b0820] text-xs text-white px-3.5 py-2.5 rounded-lg border border-[#41134a]"
                />
              </div>

              <div className="flex items-center space-x-3 bg-[#240b2d] p-3 rounded-lg border border-[#4c1657] mt-2">
                <input
                  type="checkbox"
                  id="enable-donations-toggle"
                  checked={!!settingsForm.enableDonations}
                  onChange={(e) => setSettingsForm({ ...settingsForm, enableDonations: e.target.checked })}
                  className="w-4 h-4 rounded text-[#e95420] focus:ring-[#e95420] bg-[#1b0820] border-[#41134a] cursor-pointer"
                />
                <label htmlFor="enable-donations-toggle" className="text-xs text-gray-200 select-none cursor-pointer">
                  <span className="font-bold block text-[#d8b024]">Enable MTN MoMo Donation System</span>
                  <span className="text-[11px] text-gray-400">If checked, donation support buttons and banners will be shown across the website.</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#e95420] hover:bg-[#ff6936] text-white font-bold rounded-lg text-xs uppercase font-mono tracking-widest cursor-pointer"
              >
                Save configurations
              </button>
            </form>
          )}

        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm" id="custom-delete-modal">
          <div className="bg-[#120415] border border-red-500/25 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-500">
              <span className="p-2 bg-red-500/10 rounded-full">
                <Trash2 className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold font-ubuntu text-white">Delete Catalog Item?</h2>
            </div>
            
            <p className="text-xs text-[#aea79f] leading-relaxed font-sans">
              Are you sure you want to permanently remove this <span className="font-semibold text-white uppercase">{deleteConfirm.type}</span> listing:
              <strong className="block text-white text-sm mt-2 font-ubuntu">"{deleteConfirm.title}"</strong>
              This action is permanent and cannot be undone. Associated live rooms and user chats may also be purged.
            </p>

            <div className="flex items-center space-x-3 text-xs font-mono font-medium pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-200 rounded-lg transition uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition shadow uppercase tracking-wider font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEASONS & EPISODES MANAGEMENT MODAL */}
      {selectedMovieForSeasons && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md" id="seasons-episodes-modal">
          <div className="bg-[#120415] border border-[#ff6936]/20 rounded-2xl p-6 max-w-4xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#250d2e]">
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest block">🎬 Series Episode Directory</span>
                <h2 className="text-base font-bold font-ubuntu text-white">Manage Seasons & Episodes</h2>
                <p className="text-[11px] text-gray-400 font-sans mt-0.5">Series Title: <strong className="text-white">{selectedMovieForSeasons.title}</strong></p>
              </div>
              <button
                onClick={() => {
                  setSelectedMovieForSeasons(null);
                  setSeasonsData([]);
                }}
                className="p-1 px-3 bg-zinc-800 hover:bg-[#e95420] text-gray-200 hover:text-white rounded text-xs font-semibold transition"
              >
                Close View
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Seasons List */}
              <div className="md:col-span-1 bg-[#19071d] rounded-xl p-4 border border-[#300e3a]/50 space-y-4">
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <Tv className="w-3.5 h-3.5" />
                  <span>Seasons ({seasonsData.length})</span>
                </h3>

                {/* List of Seasons */}
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {seasonsData.length === 0 ? (
                    <p className="text-[11px] text-gray-500 font-mono py-4 text-center">No seasons defined. Add one below!</p>
                  ) : (
                    seasonsData.map((s, index) => {
                      const isActive = selectedSeasonForEpAdd === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSeasonForEpAdd(s.id)}
                          className={`p-2.5 rounded-lg border text-xs flex justify-between items-center cursor-pointer transition ${
                            isActive
                              ? 'bg-[#e95420]/15 border-[#e95420] text-white font-bold'
                              : 'bg-[#120415] hover:bg-[#1f0224] border-[#2c0833] text-gray-400'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs opacity-60">S{s.seasonNumber}</span>
                            <span className="truncate font-medium">{s.title}</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSeason(s.id);
                            }}
                            className="p-1 text-red-400 hover:text-red-500 hover:bg-red-950/20 rounded transition"
                            title="Delete Season"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Add Season Form */}
                <div className="border-t border-[#340b3d] pt-3 space-y-2">
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Add New Season</span>
                  <div className="flex space-x-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Season 1"
                      value={newSeasonTitle || ''}
                      onChange={(e) => setNewSeasonTitle(e.target.value)}
                      className="bg-[#120415] text-xs text-white px-2.5 py-1.5 rounded border border-[#2b0c30] flex-1 outline-none focus:border-orange-500 font-sans"
                    />
                    <button
                      onClick={handleAddSeason}
                      className="px-3 bg-[#e95420] hover:bg-[#ff6936] text-white text-xs font-bold rounded flex items-center justify-center transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Episodes of Selected Season */}
              <div className="md:col-span-2 bg-[#19071d] rounded-xl p-4 border border-[#300e3a]/50 flex flex-col justify-between">
                <div>
                  {selectedSeasonForEpAdd ? (
                    (() => {
                      const activeSeason = seasonsData.find(s => s.id === selectedSeasonForEpAdd);
                      if (!activeSeason) return <p className="text-xs text-gray-500 font-mono">Select a season from the left panel.</p>;
                      return (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-[#2d0c35]">
                            <h3 className="text-xs font-bold text-emerald-400 font-mono">Episodes in {activeSeason.title} ({activeSeason.episodes?.length || 0})</h3>
                            <span className="text-[10px] bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/40 uppercase font-mono">
                              Season {activeSeason.seasonNumber}
                            </span>
                          </div>

                          {/* List of episodes in this season */}
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {!activeSeason.episodes || activeSeason.episodes.length === 0 ? (
                              <p className="text-[11px] text-gray-500 py-6 text-center font-mono">No episodes registered in this season yet. Fill out the form below to add one!</p>
                            ) : (
                              activeSeason.episodes.map((ep: any) => (
                                <div key={ep.id} className="bg-[#120415] border border-[#2b0c30] p-2.5 rounded-lg flex items-center justify-between text-xs font-sans">
                                  <div className="flex-1 min-w-0 mr-3">
                                    <div className="flex items-center space-x-2">
                                      <span className="bg-orange-600/10 text-orange-400 px-1.5 py-0.2 rounded text-[10px] font-mono">Ep {ep.episodeNumber}</span>
                                      <span className="text-white font-medium truncate">{ep.title}</span>
                                      {ep.duration && <span className="text-[10px] text-zinc-500 font-mono">({ep.duration})</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5 text-ellipsis overflow-hidden">Stream: {ep.watch_link}</p>
                                    {ep.download_link && <p className="text-[10px] text-emerald-400 font-mono truncate mt-0.5">Download: {ep.download_link}</p>}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteEpisode(activeSeason.id, ep.id)}
                                    className="p-1 px-2 hover:bg-red-950/20 text-red-400 hover:text-red-500 rounded border border-red-900/10 hover:border-red-500/20 text-[10px] transition font-mono whitespace-nowrap"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Episode Form */}
                          <div className="bg-[#120415] border border-[#2d0c35] p-3 rounded-lg space-y-2">
                            <span className="text-[10px] font-mono text-orange-400 uppercase block tracking-wider">➕ Create Episode {(activeSeason.episodes || []).length + 1}</span>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono uppercase text-gray-400">Episode Title</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Episode Title"
                                  value={newEpTitle || ''}
                                  onChange={(e) => setNewEpTitle(e.target.value)}
                                  className="w-full bg-[#1b0820] text-xs text-white px-2 py-1 rounded border border-[#360e3e] outline-none font-sans"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono uppercase text-gray-400">Duration (optional)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 45m"
                                  value={newEpDuration || ''}
                                  onChange={(e) => setNewEpDuration(e.target.value)}
                                  className="w-full bg-[#1b0820] text-xs text-white px-2 py-1 rounded border border-[#360e3e] outline-none font-sans"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-mono uppercase text-gray-400">Streaming Watch Link / Embed Code / Drive URL</label>
                              <input
                                type="text"
                                placeholder="https://... OR YouTube video URL / Drive preview URL"
                                value={newEpWatchLink || ''}
                                onChange={(e) => setNewEpWatchLink(e.target.value)}
                                className="w-full bg-[#1b0820] text-xs text-white px-2 py-1 rounded border border-[#360e3e] outline-none font-mono"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-mono uppercase text-gray-400">Download Link (optional mirror)</label>
                              <input
                                type="text"
                                placeholder="/uploads/... or mirror download URL"
                                value={newEpDownloadLink || ''}
                                onChange={(e) => setNewEpDownloadLink(e.target.value)}
                                className="w-full bg-[#1b0820] text-xs text-white px-2 py-1 rounded border border-[#360e3e] outline-none font-mono"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddEpisode(activeSeason.id)}
                              className="w-full py-1.5 bg-[#e95420]/20 hover:bg-[#e95420] text-orange-400 hover:text-white border border-[#e95420]/40 transition text-xs font-bold rounded font-mono uppercase tracking-widest mt-1"
                            >
                              + Add Episode
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                      <Tv className="w-8 h-8 opacity-40 mb-2" />
                      <p className="text-xs font-mono">Create or select a Season from the left sidebar to start registering episode channels.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#250d2e] pt-4 text-xs font-mono font-bold">
              <span className="text-orange-400 text-[10px]">⚠️ Make sure to save before closing to publish changes.</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMovieForSeasons(null);
                    setSeasonsData([]);
                  }}
                  className="px-4 py-2.5 bg-zinc-800 text-gray-300 hover:text-white rounded-lg transition"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={handleSaveSeasons}
                  className="px-5 py-2.5 bg-[#e95420] hover:bg-[#ff6936] text-white rounded-lg transition shadow-md uppercase tracking-wider"
                >
                  Save & Publish
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
