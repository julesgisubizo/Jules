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
  onDonateClick?: () => void;
  enableDonations?: boolean;
}

export default function Footer({
  onNavigate,
  siteName,
  footerText,
  contactEmail,
  contactPhone,
  onDonateClick,
  enableDonations = false
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
            {enableDonations && (
              <div className="pt-1.5">
                <button
                  onClick={onDonateClick}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold uppercase rounded-lg shadow-md transition duration-150 animate-pulse"
                  id="footer-donate-btn"
                  title="Donate with MTN MoMo"
                >
                  <span>🎁 Support via MTN MoMo</span>
                </button>
              </div>
            )}
          </div>

          {/* Rapid Links - Content */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider text-[#e95420] uppercase font-ubuntu">Streaming Hub</h4>
            <ul className="space-y-2 text-sm text-[#aea79f]">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition">Home</button>
              </li>
              <li>
                <button onClick={() => onNavigate('watchlist')} className="hover:text-white transition">Watch</button>
              </li>
              <li>
                <button onClick={() => onNavigate('upload-video')} className="hover:text-[#ff6c3a] text-[#e95420] font-semibold transition">Upload Video</button>
              </li>
              <li>
                <button onClick={() => onNavigate('movies')} className="hover:text-white transition">Movies</button>
              </li>
              <li>
                <button onClick={() => onNavigate('trending')} className="hover:text-white transition">Trending</button>
              </li>
              <li>
                <button onClick={() => onNavigate('new-uploads')} className="hover:text-white transition">New</button>
              </li>
            </ul>
          </div>

          {/* Education Materials */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider text-[#e95420] uppercase font-ubuntu">System & Utilities</h4>
            <ul className="space-y-2 text-sm text-[#aea79f]">
              <li>
                <button onClick={() => onNavigate('documents')} className="hover:text-white transition">Educational</button>
              </li>
              <li>
                <button onClick={() => onNavigate('downloads')} className="hover:text-white transition">Install</button>
              </li>
              <li>
                <button onClick={() => onNavigate('local-explorer')} className="hover:text-white transition">Device</button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition">About</button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition">FAQs</button>
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
            {enableDonations && (
              <button onClick={onDonateClick} className="text-yellow-400 hover:text-yellow-300 font-bold transition">Donate MoMo</button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
