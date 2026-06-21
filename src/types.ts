/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export enum WatchSourceType {
  UPLOAD = "upload",
  LINK = "link",
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Hashed password, excluded in API payloads
  role: UserRole | string;
  avatar: string;
  createdAt: string;
  watchlist?: string[]; // movieIds
}

export interface Movie {
  id: string;
  title: string;
  slug: string;
  description: string;
  watch_source_type: WatchSourceType | string;
  uploaded_video_path?: string; // local preview path
  watch_link: string; // fallback/stream stream URL
  download_link: string;
  poster_image: string;
  cover_image: string;
  trailer_link: string;
  genre: string[]; // e.g. ["Action", "Sci-Fi"]
  year: number;
  duration: string; // e.g., "120m"
  language: string;
  country: string;
  quality: string; // HD, Full HD, 4K
  tags: string[];
  views: number;
  likes: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  isFeatured?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  movieId: string;
  content: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  movieId: string;
  roomName: string;
  isActive: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  file_path?: string;
  download_link: string;
  thumbnail: string;
  subject: string; // e.g., Math, Computer Science, Physics
  class_level: string; // e.g., Senior 4, Grade 12
  year: number;
  document_type: string; // PDF, Book, Notes, Past Paper
  createdAt: string;
}

export interface DownloadTracking {
  id: string;
  userId: string | null;
  itemId: string;
  itemType: "movie" | "document" | string;
  createdAt: string;
}

export interface SiteSettings {
  logoName: string;
  contactEmail: string;
  contactPhone: string;
  footerText: string;
  heroBannerTitle: string;
  heroBannerSubtitle: string;
}
