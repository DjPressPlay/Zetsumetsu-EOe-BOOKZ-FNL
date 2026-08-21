
import React from 'react';
import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';

const Footer: React.FC = () => {
  const openUpload = () => {
    window.dispatchEvent(new CustomEvent('open-upload-modal'));
  };

  return (
    <footer className="bg-black border-t border-white/10 py-16">
      <div className="max-w-[1600px] mx-auto px-6 text-center space-y-2">
        <p className="text-[10px] font-black text-white/90 uppercase tracking-widest">
          Zetsumetsu EOe™ | Zetsu EDU™ | Zetsu R&D ⓒ | © 2024 - 2026 Zetsumetsu Corporation™ | Artworqq Kevin Suber
        </p>
        <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">
          © 2026 Zetsumetsu Corporation™
        </p>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
          All systems, products, and materials are the property of Zetsumetsu Corporation.
        </p>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
          Unauthorized use or reproduction is prohibited.
        </p>
        
        <div className="pt-8 flex items-center justify-center">
          <Link 
            to="/ledger" 
            className="text-[10px] font-black text-[#00c2ff]/70 hover:text-[#00c2ff] uppercase tracking-widest flex items-center gap-1.5 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c2ff] animate-pulse" />
            The Public Ledger
          </Link>
        </div>

        <div className="pt-4 flex justify-center">
          {/* Single Discreet Dot - Opens the Storage Page */}
          <Link 
            to="/archive"
            className="w-1 h-1 bg-white rounded-full opacity-10 hover:opacity-100 transition-opacity"
            aria-label="Archive"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
