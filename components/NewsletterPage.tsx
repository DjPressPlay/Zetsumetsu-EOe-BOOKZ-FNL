import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Sparkles, Shield, Gift, Coins } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import NewsletterCTA from './NewsletterCTA';

const NewsletterPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col selection:bg-[#00c2ff] selection:text-black">
      <Navbar />

      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-[1600px] mx-auto px-6 mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-[10px] font-black text-[#00c2ff] hover:text-white uppercase tracking-widest transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Return to Catalog Nexus
          </Link>
        </div>

        <NewsletterCTA />
      </main>

      <Footer />
    </div>
  );
};

export default NewsletterPage;
