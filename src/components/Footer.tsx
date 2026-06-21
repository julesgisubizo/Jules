/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Film, BookOpen, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
  siteName: string;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
}

export default function Footer({
  onNavigate,
  siteName,
  footerText,
  contactEmail,
  contactPhone
}: FooterProps) {
  return (
    <footer className="bg-[#0b030d] border-t border-[#1e0724] text-white pt-12 pb-6 mt-auto" id="app-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          {/* Logo & Description */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-2" onClick={() => onNavigate('home')}>
              <span className="p-1.5 bg-[#e95420] text-white rounded font-ubuntu font-bold flex items-center justify-center">
                <Film className="w-5 h-5" />
              </span>
              <span className="font-ubuntu text-lg font-bold tracking-tight bg-gradient-to-r from-white to-[#e95420] bg-clip-text text-transparent cursor-pointer">
                {siteName || "Ubuntu Flimsy"}
              </span>
            </div>
            <p className="text-sm text-[#aea79f] leading-relaxed">
              Ubuntu Flimsy is a free, real-time cooperative movie stream and academic resource platform built under the spirit of Ubuntu: 
              <span className="italic text-[#e95420]"> "I am because we are."</span>
            </p>
          </div>

          {/* Rapid Links - Content */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider text-[#e95420] uppercase font-ubuntu">Streaming Hub</h4>
            <ul className="space-y-2 text-sm text-[#aea79f]">
              <li>
                <button onClick={() => onNavigate('movies')} className="hover:text-white transition">Browse All Movies</button>
              </li>
              <li>
                <button onClick={() => onNavigate('trending')} className="hover:text-white transition">Trending Streams</button>
              </li>
              <li>
                <button onClick={() => onNavigate('new-uploads')} className="hover:text-white transition">New Releases</button>
              </li>
              <li>
                <button onClick={() => onNavigate('categories')} className="hover:text-white transition">Explore Genres</button>
              </li>
            </ul>
          </div>

          {/* Education Materials */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider text-[#e95420] uppercase font-ubuntu">Education Desk</h4>
            <ul className="space-y-2 text-sm text-[#aea79f]">
              <li>
                <button onClick={() => onNavigate('documents')} className="hover:text-white transition">Search Resources</button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition">About Academic Desk</button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition">Platform FAQ</button>
              </li>
              <li>
                <a href="https://reb.rw" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center space-x-1">
                  <span>Rwanda Education Board</span>
                  <ExternalLink className="w-3 h-3 text-gray-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* Contact and Help */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider text-[#e95420] uppercase font-ubuntu">African Support Desk</h4>
            <ul className="space-y-2 text-sm text-[#aea79f]">
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#e95420]" />
                <span className="truncate">{contactEmail || "info@ubuntuflimsy.com"}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-[#e95420]" />
                <span>{contactPhone || "+250 788 123 456"}</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#e95420]" />
                <span>Kigali, Rwanda</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1d0a22] pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-[#aea79f]">
          <p className="text-center md:text-left mb-4 md:mb-0">
            {footerText || "© 2026 Ubuntu Flimsy. Stream and learn freely."}
          </p>
          <div className="flex space-x-6">
            <button onClick={() => onNavigate('about')} className="hover:text-white transition">Privacy Policy</button>
            <button onClick={() => onNavigate('faq')} className="hover:text-white transition">Terms of Service</button>
            <button onClick={() => onNavigate('contact')} className="hover:text-white transition">Contact Us</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
