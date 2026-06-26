/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Eye, ThumbsUp, Calendar, Clock } from 'lucide-react';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
  key?: string;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-[#130517] border border-[#2b0c36] hover:border-[#e95420] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
      id={`movie-card-${movie.id}`}
    >
      {/* Thumbnail Aspect Ratio */}
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-950">
        <img
          src={movie.poster_image || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600'}
          alt={movie.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Backdrop Dark Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e030e] via-transparent to-[#00000030] opacity-90 transition-opacity" />

        {/* Badges on Top */}
        <div className="absolute top-2.5 left-2.5 flex flex-col space-y-1.5 items-start">
          <span className="px-2 py-0.5 text-[10px] font-bold font-mono tracking-widest bg-[#e95420] text-white rounded shadow-sm uppercase">
            {movie.quality}
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-semibold font-mono bg-black/60 text-gray-300 rounded backdrop-blur-xs">
            {movie.language}
          </span>
          <span className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded tracking-wider text-white shadow-sm uppercase ${
            movie.seasons && movie.seasons.length > 0
              ? 'bg-[#77216f] border border-fuchsia-500/20'
              : 'bg-teal-700/90 border border-teal-500/20'
          }`}>
            {movie.seasons && movie.seasons.length > 0 ? 'Season' : 'Film'}
          </span>
        </div>

        {/* View Count on Top Right */}
        <div className="absolute top-2.5 right-2 text-white bg-black/50 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center space-x-1 backdrop-blur-xs">
          <Eye className="w-3 h-3 text-[#e95420]" />
          <span>{movie.views >= 1000 ? `${(movie.views/1000).toFixed(1)}k` : movie.views}</span>
        </div>

        {/* Hover Action Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/45 backdrop-blur-xxs">
          <span className="p-3 bg-[#e95420] text-white rounded-full transition-transform duration-300 transform scale-75 group-hover:scale-100 shadow-lg flex items-center justify-center glow-orange">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </span>
        </div>

        {/* Genre Tags on Bottom Overlay */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1">
          {movie.genre.slice(0, 2).map((g) => (
            <span key={g} className="px-1.5 py-0.5 text-[9px] font-medium bg-[#77216f]/80 text-[#fbbdf5] rounded backdrop-blur-xs">
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* Content Meta Area */}
      <div className="p-3 text-left">
        <h3 className="font-ubuntu text-sm font-semibold text-gray-100 group-hover:text-[#e95420] line-clamp-1 transition-colors duration-200">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-[#aea79f] font-mono mt-2 pt-1 border-t border-[#200724]">
          <span className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-[#e95420]" />
            <span>{movie.year}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-[#e95420]" />
            <span>{movie.duration}</span>
          </span>
          <span className="flex items-center space-x-0.5">
            <ThumbsUp className="w-3 h-3 text-[#e95420]" />
            <span>{movie.likes}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
