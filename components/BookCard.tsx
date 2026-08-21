
import React from 'react';
import { Link } from 'react-router-dom';
import { BookMetadata } from '../types';
import { ChevronUp } from 'lucide-react';
import { normalizeSectorName } from '../services/categories';

interface BookCardProps {
  book: BookMetadata;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const displayGenre = normalizeSectorName(book.genre);

  return (
    <div className="group relative block w-full">
      <div className="bg-[#0d1117] border border-white/5 rounded-xl p-3 flex gap-4 hover:border-[#00c2ff]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,194,255,0.1)] h-32 items-center">
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
        </Link>
        
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00c2ff] mb-1 block opacity-90 truncate">
            {displayGenre}
          </span>
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
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00c2ff] shadow-[0_0_8px_rgba(0,194,255,0.8)]" />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <ChevronUp size={10} className="text-[#00c2ff]" />
              <span className="text-[9px] font-black text-white">{book.upvotes || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
