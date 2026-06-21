/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Download, GraduationCap, Calendar } from 'lucide-react';
import { Document } from '../types';

interface DocumentCardProps {
  doc: Document;
  onClick: () => void;
  onDownload: (e: React.MouseEvent) => void;
  key?: string;
}

export default function DocumentCard({ doc, onClick, onDownload }: DocumentCardProps) {
  // Document Type styling selector
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'past paper': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'notes': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'book': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-[#120416] border border-[#23092b] hover:border-[#e95420] rounded-xl p-4 transition-all duration-300 shadow hover:shadow-lg cursor-pointer flex flex-col justify-between"
      id={`document-card-${doc.id}`}
    >
      <div className="flex space-x-3.5 text-left mb-3">
        {/* Academic Subject Cover Placeholder */}
        <div className="w-16 h-20 bg-gradient-to-br from-[#2a0e33] to-[#120416] border border-[#3e144a] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative group-hover:scale-105 transition-transform">
          <img
            src={doc.thumbnail || "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=100"}
            alt={doc.subject}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[#e95420]" />
          </div>
        </div>

        {/* Informative details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 mb-1.5">
            <span className={`px-2 py-0.5 text-[9px] font-bold border rounded uppercase font-mono ${getTypeColor(doc.document_type)}`}>
              {doc.document_type}
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono text-gray-400 bg-[#240a2d] rounded">
              {doc.class_level}
            </span>
          </div>

          <h3 className="font-ubuntu text-sm font-semibold text-gray-100 group-hover:text-[#e95420] line-clamp-2 leading-snug transition-colors">
            {doc.title}
          </h3>
        </div>
      </div>

      <div className="space-y-2 border-t border-[#23092b] pt-2.5 mt-auto">
        {/* Small meta fields */}
        <div className="flex items-center justify-between text-[11px] text-[#aea79f] font-mono">
          <span className="flex items-center space-x-1">
            <GraduationCap className="w-3.5 h-3.5 text-[#e95420]" />
            <span className="truncate max-w-[100px]">{doc.subject}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-[#e95420]" />
            <span>{doc.year}</span>
          </span>
        </div>

        {/* Micro short info */}
        <p className="text-[11px] text-[#aea79f] line-clamp-1 italic">
          {doc.description}
        </p>

        {/* Action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(e);
          }}
          className="w-full py-1.5 bg-[#e95420]/10 hover:bg-[#e95420] text-[#e95420] hover:text-white rounded-lg border border-[#e95420]/20 hover:border-transparent text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Resources</span>
        </button>
      </div>
    </div>
  );
}
