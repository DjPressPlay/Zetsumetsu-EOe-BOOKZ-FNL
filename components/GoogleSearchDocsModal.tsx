import React, { useState } from 'react';
import { Globe, Check, Copy, ExternalLink, ShieldCheck, FileCode, CheckCircle2, X, Terminal } from 'lucide-react';

interface GoogleSearchDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSearchDocsModal: React.FC<GoogleSearchDocsModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-evnrqq7qcgyloslwtal5ka-16156198105.us-west2.run.app';
  const verificationFileUrl = `${currentOrigin}/google0d69da55f20eb362.html`;
  const sitemapUrl = `${currentOrigin}/sitemap.xml`;
  const robotsUrl = `${currentOrigin}/robots.txt`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-white font-sans max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#00c2ff]/10 border border-[#00c2ff]/30 flex items-center justify-center text-[#00c2ff]">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              Google Search Documentation &amp; Indexing
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#00c2ff]">
              Search Console Verification &bull; Live Sitemap Protocol
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block">Google Search Ready</span>
                <span className="text-[9px] text-emerald-400/80 font-mono">HTML file &bull; Head Verification Meta &bull; Dynamic XML Sitemap</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">
              Verified
            </span>
          </div>

          {/* Section 1: Google Verification File */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#00c2ff]" />
                1. Google Verification Document
              </span>
              <a
                href={verificationFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono text-[#00c2ff] hover:underline flex items-center gap-1"
              >
                Open File <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">
              Available at the site root for Google Search Console HTML file verification:
            </p>
            <div className="bg-black/80 rounded-xl p-3 border border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-300">
              <span className="truncate pr-2">{verificationFileUrl}</span>
              <button
                onClick={() => copyToClipboard(verificationFileUrl, 'fileUrl')}
                className="text-[#00c2ff] hover:text-white shrink-0 p-1"
                title="Copy URL"
              >
                {copiedKey === 'fileUrl' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div className="mt-2 text-[9px] font-mono text-slate-500">
              Payload: <code className="text-[#00c2ff]">google-site-verification: google0d69da55f20eb362.html</code>
            </div>
          </div>

          {/* Section 2: Sitemap XML */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-2">
                <FileCode size={14} className="text-[#00c2ff]" />
                2. Updated XML Sitemap
              </span>
              <a
                href={sitemapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono text-[#00c2ff] hover:underline flex items-center gap-1"
              >
                Inspect XML <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">
              Automatically indexes all root routes, sectors, and live bitstream publications with daily priority:
            </p>
            <div className="bg-black/80 rounded-xl p-3 border border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-300">
              <span className="truncate pr-2">{sitemapUrl}</span>
              <button
                onClick={() => copyToClipboard(sitemapUrl, 'sitemapUrl')}
                className="text-[#00c2ff] hover:text-white shrink-0 p-1"
                title="Copy URL"
              >
                {copiedKey === 'sitemapUrl' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Section 3: Robots & Search Console Guide */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-[10px] text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold">
              <Terminal size={12} className="text-[#00c2ff]" />
              <span>Google Search Console Setup Checklist</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[9px] text-slate-300">
              <li>Open Google Search Console and add your domain property prefix.</li>
              <li>Choose <strong>HTML file</strong> verification and click <strong>Verify</strong> (points directly to <code className="text-[#00c2ff]">/google0d69da55f20eb362.html</code>).</li>
              <li>Navigate to <strong>Sitemaps</strong> in the left sidebar.</li>
              <li>Enter <code className="text-[#00c2ff]">sitemap.xml</code> and submit.</li>
              <li>Googlebot will crawl <code className="text-slate-400">/robots.txt</code> and prioritize all shelf and book items.</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            Dismiss
          </button>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-[#00c2ff] text-black text-[11px] font-black uppercase tracking-wider hover:bg-[#00c2ff]/90 transition-colors flex items-center gap-1.5"
          >
            Open Search Console <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
