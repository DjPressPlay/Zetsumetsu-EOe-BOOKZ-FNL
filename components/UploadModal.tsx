
import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { processPdfForStore } from '../services/pdfService';
import { saveBook } from '../services/db';
import { BookMetadata, BookData } from '../types';

interface UploadModalProps {
  onUploadComplete: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onUploadComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pdfInfo, setPdfInfo] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', author: '', genre: 'General' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = () => { setIsOpen(true); setStatus('idle'); setPdfInfo(null); setErrorMessage(''); };
    window.addEventListener('open-upload-modal', handleOpen);
    return () => window.removeEventListener('open-upload-modal', handleOpen);
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('processing');
    try {
      const info = await processPdfForStore(file);
      setPdfInfo(info);
      setFormData(prev => ({ ...prev, title: file.name.replace('.pdf', '') }));
      setStatus('idle');
    } catch (err) { setStatus('error'); setErrorMessage('NEURAL INGEST FAILED: DATA CORRUPT'); }
  };

  const publish = async () => {
    if (!pdfInfo) return;
    setStatus('uploading');
    try {
      const id = crypto.randomUUID().split('-')[0];
      const metadata: BookMetadata = { id, thumbnail: pdfInfo.thumbnail, title: formData.title, author: formData.author, genre: formData.genre, pages: pdfInfo.pageCount, uploadDate: Date.now() };
      const data: BookData = { id, pdfData: pdfInfo.pdfData };
      await saveBook(metadata, data);
      setStatus('success');
      onUploadComplete();
    } catch (err: any) { setStatus('error'); setErrorMessage(err.message || 'UPLOAD FAILURE'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsOpen(false)} />
      <div className="relative bg-[#0a0a0a] w-full max-w-xl rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,194,255,0.1)]">
        <div className="p-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">NEURAL INGEST</h2>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
          </div>

          {status === 'error' ? (
            <div className="py-12 text-center">
              <AlertCircle size={64} className="text-red-600 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white uppercase">SYSTEM ERROR</h3>
              <p className="text-slate-500 mb-8 font-mono text-[10px]">{errorMessage}</p>
              <button onClick={() => setStatus('idle')} className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest">REBOOT SYNC</button>
            </div>
          ) : status === 'success' ? (
            <div className="py-12 text-center">
              <CheckCircle size={64} className="text-[#00c2ff] mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white uppercase italic">ARCHIVE SAVED</h3>
              <p className="text-slate-500 mb-8 font-mono text-[10px]">Your data has been synced to the global network.</p>
              <button onClick={() => setIsOpen(false)} className="w-full bg-[#00c2ff] text-black py-4 rounded-xl font-black uppercase tracking-widest">CLOSE LINK</button>
            </div>
          ) : status === 'uploading' ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 border-2 border-t-[#00c2ff] border-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_20px_rgba(0,194,255,0.5)]" />
              <p className="text-xl font-black text-white uppercase italic animate-pulse">SYNCING BITSTREAM...</p>
            </div>
          ) : !pdfInfo ? (
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-3xl p-24 text-center cursor-pointer hover:border-[#00c2ff]/50 transition-all bg-black/40 group">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFile} />
              <FileText size={48} className="mx-auto mb-4 text-slate-700 group-hover:text-[#00c2ff] transition-colors" />
              <p className="font-black text-white uppercase tracking-widest text-xs">SELECT PDF ARTIFACT</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-6 p-6 bg-black rounded-2xl border border-white/5 items-center">
                <img src={pdfInfo.thumbnail} className="w-20 aspect-[3/4] object-cover rounded-lg shadow-2xl" alt="thumb" />
                <p className="text-lg font-black text-white uppercase italic truncate">{formData.title}</p>
              </div>
              <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="BOOK TITLE" className="w-full bg-black border border-white/10 py-4 px-6 rounded-xl text-white uppercase font-black text-xs focus:border-[#00c2ff]/50 outline-none" />
              <input value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} placeholder="AUTHOR ID" className="w-full bg-black border border-white/10 py-4 px-6 rounded-xl text-white uppercase font-black text-xs focus:border-[#00c2ff]/50 outline-none" />
              <button onClick={publish} className="w-full bg-[#00c2ff] text-black py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all">PUBLISH TO NETWORK</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
