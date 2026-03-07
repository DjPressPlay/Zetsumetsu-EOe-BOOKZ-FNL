
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Download, Search, Calendar, Database, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNewsletterEmails } from '../services/db';
import Navbar from './Navbar';

const ArchivePage: React.FC = () => {
  const [emails, setEmails] = useState<{ email: string, signup_date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Hide from search engines
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    const fetchEmails = async () => {
      try {
        const data = await getNewsletterEmails();
        setEmails(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to sync with Bitstream');
      } finally {
        setLoading(false);
      }
    };
    fetchEmails();

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const filteredEmails = emails.filter(e => 
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const downloadCSV = () => {
    const csv = [
      ['Email', 'Signup Date'],
      ...emails.map(e => [e.email, new Date(e.signup_date).toLocaleString()])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `zetsu_archive_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <Navbar />
      
      <div className="pt-32 max-w-[1200px] mx-auto px-6 pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black text-[#00c2ff] uppercase tracking-widest mb-4 hover:translate-x-[-4px] transition-transform">
              <ArrowLeft size={14} />
              Back to Nexus
            </Link>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
              Archive <span className="text-[#00c2ff]">Nodes</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-4">
              Stored Entries // {emails.length}
            </p>
          </div>

          <button 
            onClick={downloadCSV}
            className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-black/40 flex items-center gap-4">
            <Search className="text-slate-600" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH NODES..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-widest w-full text-white placeholder:text-slate-800"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/20">
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Node ID</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sync Date</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-[#00c2ff]/20 border-t-[#00c2ff] rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Accessing...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={3} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-red-500">
                        <AlertCircle size={48} className="opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                        <button onClick={() => window.location.reload()} className="text-[8px] font-black text-[#00c2ff] uppercase tracking-widest hover:underline">Retry Connection</button>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-20 text-center">
                      <Database className="mx-auto text-slate-900 mb-6" size={48} />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">No Nodes Found</span>
                    </td>
                  </tr>
                ) : (
                  filteredEmails.map((e, i) => (
                    <motion.tr 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#00c2ff]/5 border border-[#00c2ff]/10 flex items-center justify-center text-[#00c2ff]">
                            <Mail size={14} />
                          </div>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{e.email}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {e.signup_date ? new Date(e.signup_date).toLocaleDateString() : 'DATE_UNKNOWN'}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded">
                          Active
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchivePage;
