
import React from 'react';
import { Link } from 'react-router-dom';
import { BookMetadata } from '../types';
import { ChevronUp, Flame } from 'lucide-react';
import { normalizeSectorName } from '../services/categories';

interface BookCardProps {
  book: BookMetadata;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const displayGenre = normalizeSectorName(book.genre);
  const isBoosted = Boolean(book.boostScore && book.boostScore > (book.upvotes || 0));

  return (
    <div className="group relative block w-full">
      <div className={`bg-[#0d1117] border rounded-xl p-3 flex gap-4 transition-all duration-300 h-32 items-center ${
        isBoosted 
          ? 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:border-amber-400' 
          : 'border-white/5 hover:border-[#00c2ff]/30 hover:shadow-[0_0_30px_rgba(0,194,255,0.1)]'
      }`}>
        {/* Thumbnail Container */}
        <Link to={`/book/${book.id}`} className="h-full w-20 md:w-24 overflow-hidden rounded-md bg-black shrink-0 relative border border-white/10 flex items-center justify-center">
          <img 
            src={book.thumbnail} 
            className="absolute inset-0 w-full h-full object-cover blur-lg opacity-20 scale-125"
            aria-hidden="true"
          />
          <img 
            src={book.thumbnail} 
            alt={book.title}
            className="relative z-10 max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110"
          />
          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-20" />
          {isBoosted && (
            <div className="absolute top-1 left-1 z-30 bg-amber-500 text-black text-[7px] font-black uppercase px-1 py-0.5 rounded shadow flex items-center gap-0.5">
              <Flame size={8} className="fill-black" />
              BOOST
            </div>
          )}
        </Link>
        
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00c2ff] truncate">
              {displayGenre}
            </span>
            {isBoosted && (
              <span className="text-[7px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-0.5 shrink-0">
                <Flame size={9} />
                PROMOTED
              </span>
            )}
          </div>

          <Link to={`/book/${book.id}`}>
            <h3 className="font-black text-white text-xs md:text-sm uppercase tracking-tight line-clamp-1 group-hover:text-[#00c2ff] transition-colors leading-tight">
              {book.title}
            </h3>
          </Link>
          <Link to={`/author/${encodeURIComponent(book.author)}`}>
            <p className="text-[10px] text-slate-500 italic font-medium truncate mt-0.5 hover:text-[#00c2ff] transition-colors">
              NEURAL_ID: {book.author}
            </p>
          </Link>
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${
                  isBoosted ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-[#00c2ff] shadow-[0_0_8px_rgba(0,194,255,0.8)]'
                }`} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <ChevronUp size={10} className="text-[#00c2ff]" />
                <span className="text-[9px] font-black text-white">{book.upvotes || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
