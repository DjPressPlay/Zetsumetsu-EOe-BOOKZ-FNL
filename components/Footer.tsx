import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, FileCode } from 'lucide-react';
import { GoogleSearchDocsModal } from './GoogleSearchDocsModal';

const Footer: React.FC = () => {
  const [showSearchDocs, setShowSearchDocs] = useState(false);

  return (
    <>
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
          
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6">
            <Link 
              to="/ledger" 
              className="text-[10px] font-black text-[#00c2ff]/70 hover:text-[#00c2ff] uppercase tracking-widest flex items-center gap-1.5 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c2ff] animate-pulse" />
              The Public Ledger
            </Link>

            <button
              onClick={() => setShowSearchDocs(true)}
              className="text-[10px] font-black text-slate-400 hover:text-[#00c2ff] uppercase tracking-widest flex items-center gap-1.5 transition-colors"
            >
              <Globe size={12} className="text-[#00c2ff]" />
              Google Search Docs
            </button>

            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors"
            >
              <FileCode size={12} />
              Sitemap.xml
            </a>
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

      <GoogleSearchDocsModal
        isOpen={showSearchDocs}
        onClose={() => setShowSearchDocs(false)}
      />
    </>
  );
};

export default Footer;
