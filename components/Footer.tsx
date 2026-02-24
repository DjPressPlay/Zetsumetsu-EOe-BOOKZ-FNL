
import React from 'react';

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
        
        <div className="pt-12 flex justify-center">
          {/* Centered Upload Dot - Reduced size for discretion */}
          <button 
            onClick={openUpload}
            className="w-1 h-1 bg-white rounded-full opacity-10 hover:opacity-100 transition-opacity"
            aria-label="Upload"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
