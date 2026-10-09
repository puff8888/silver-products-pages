import React, { useState, useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function PremiumCarousel({ products, title = "Premium Collection" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [addedProductId, setAddedProductId] = useState(null);
  const trackRef = useRef(null);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleScroll = () => {
    if (trackRef.current) {
      const scrollLeft = trackRef.current.scrollLeft;
      const itemWidth = trackRef.current.children[0]?.offsetWidth || 0;
      const gap = 16; // 1rem
      if (itemWidth > 0) {
        const newIndex = Math.round(scrollLeft / (itemWidth + gap));
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
        }
      }
    }
  };

  const scrollTo = (index) => {
    if (trackRef.current) {
      const itemWidth = trackRef.current.children[0]?.offsetWidth || 0;
      const gap = 16;
      trackRef.current.scrollTo({
        left: index * (itemWidth + gap),
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  const next = () => scrollTo(Math.min(currentIndex + 1, products.length - 1));
  const prev = () => scrollTo(Math.max(currentIndex - 1, 0));

  // Progress Bar for Auto-play
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isHovered || products.length <= 1) {
      setProgress(0);
      return;
    }

    const duration = 6000;
    const interval = 50;
    const step = (interval / duration) * 100;
    let currentProgress = 0;

    const timer = setInterval(() => {
      currentProgress += step;
      if (currentProgress >= 100) {
        currentProgress = 0;
        if (currentIndex >= products.length - 1) {
          scrollTo(0);
        } else {
          next();
        }
      }
      setProgress(currentProgress);
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isHovered, products.length]);

  const handleAddToCart = (product) => {
    const defaultSwatch = product.swatches?.[0]?.id || null;
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1400);

    addToCart(product, defaultSwatch, 1);
    toast(`Added "${product.name}" to cart`);
  };

  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 py-12 lg:px-8 mb-12">
      {/* Meta Header */}
      <div className="flex items-baseline justify-between mb-5 px-1">
        <h2 className="text-2xl md:text-3xl font-display font-extrabold text-foreground tracking-tight">
          {title}
        </h2>
        <div className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-xs md:text-sm font-semibold text-muted tabular-nums shadow-sm">
          <span className="text-foreground">{String(currentIndex + 1).padStart(2, '0')}</span>
          <span className="text-border">/</span>
          <span>{String(products.length).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Viewport */}
      <div 
        className="group/viewport relative rounded-2xl bg-surface/40 border border-border/80 shadow-2xl p-4 md:p-6 overflow-hidden backdrop-blur-sm"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
      >
        {/* Nav Buttons */}
        <button 
          onClick={prev}
          disabled={currentIndex === 0}
          aria-label="Previous product"
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full border border-border/80 bg-background/90 backdrop-blur-md text-foreground flex items-center justify-center opacity-0 group-hover/viewport:opacity-100 transition-all hover:bg-surface hover:scale-105 hover:border-chrome-400 shadow-xl disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed focus-visible:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        
        <button 
          onClick={next}
          disabled={currentIndex >= products.length - 1}
          aria-label="Next product"
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full border border-border/80 bg-background/90 backdrop-blur-md text-foreground flex items-center justify-center opacity-0 group-hover/viewport:opacity-100 transition-all hover:bg-surface hover:scale-105 hover:border-chrome-400 shadow-xl disabled:opacity-20 disabled:hover:scale-100 disabled:cursor-not-allowed focus-visible:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Track */}
        <div 
          ref={trackRef} 
          onScroll={handleScroll}
          className="flex items-stretch gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Hide scrollbar pseudo element for webkit in global css or here */}
          <style>{`
            .group\\/viewport div::-webkit-scrollbar { display: none; }
          `}</style>
          
          {products.map((product, i) => {
            const isActive = i === currentIndex;
            const isAdded = addedProductId === product.id;
            
            return (
              <article 
                key={product.id} 
                className={`flex-none w-[85vw] sm:w-[45vw] lg:w-[calc((100%-40px)/3)] snap-center md:snap-start group/card relative flex flex-col rounded-2xl bg-gradient-to-b from-surface/60 to-background border ${isActive ? 'border-chrome-500/50 shadow-[0_0_30px_rgba(138,141,143,0.1)]' : 'border-border/50 shadow-lg opacity-80 scale-[0.98]'} overflow-hidden transition-all duration-500 hover:border-chrome-400/60 hover:opacity-100 hover:scale-100 hover:shadow-2xl`}
              >
                {/* Media Area */}
                <div className="relative aspect-square w-full bg-gradient-to-tr from-background to-surface overflow-hidden flex items-center justify-center p-6">
                  {/* Subtle background glow */}
                  <div className="absolute inset-0 bg-radial-gradient from-chrome-500/10 to-transparent opacity-50 pointer-events-none"></div>
                  
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-contain relative z-10 transition-transform duration-700 group-hover/card:scale-105"
                    loading="lazy"
                  />
                  
                  {product.badge && (
                    <span className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-gradient-to-br from-chrome-400 to-chrome-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                      {product.badge}
                    </span>
                  )}
                  
                  <span className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-foreground text-[10px] font-semibold uppercase tracking-wider opacity-0 translate-y-2 transition-all duration-300 group-hover/card:opacity-100 group-hover/card:translate-y-0 pointer-events-none">
                    View
                  </span>
                </div>

                {/* Body Area */}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between relative z-20 bg-background/50 backdrop-blur-sm border-t border-border/30">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-chrome-400 mb-1.5">
                      {product.category}
                    </p>
                    <h3 className="text-lg md:text-xl font-display font-bold text-foreground leading-tight tracking-tight mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted line-clamp-2 leading-relaxed h-10">
                      {product.nameTh}
                    </p>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-border/40">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-xl md:text-2xl font-bold text-foreground tabular-nums tracking-tight">
                        ฿{product.price.toLocaleString()}
                      </span>
                      {product.originalPrice > product.price && (
                        <span className="text-xs font-medium text-muted line-through">
                          ฿{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2.5">
                      <button 
                        onClick={() => handleAddToCart(product)}
                        className={`flex-1 h-11 md:h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-foreground ${
                          isAdded 
                            ? 'bg-success text-white shadow-success/20' 
                            : 'bg-gradient-to-br from-chrome-300 to-chrome-500 text-background hover:brightness-110 hover:shadow-chrome-500/20 active:scale-95'
                        }`}
                      >
                        {isAdded ? 'Added ✓' : 'Add to Cart'}
                      </button>
                      <button 
                        aria-label="Save product"
                        className="w-11 md:w-12 h-11 md:h-12 rounded-xl border border-border/80 bg-surface flex items-center justify-center text-muted hover:text-foreground hover:bg-surface/80 hover:border-chrome-400/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Indicators and Progress */}
      <div className="mt-6 flex flex-col items-center">
        {/* Dot Indicators */}
        <div className="flex justify-center gap-2 mb-4" role="tablist">
          {products.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex 
                  ? 'w-6 bg-chrome-400' 
                  : 'w-1.5 bg-border hover:bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Continuous Progress Bar */}
        <div className="w-full max-w-xs h-1 rounded-full bg-surface border border-border overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-chrome-500 to-chrome-300 origin-left transition-transform duration-75 ease-linear"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      </div>
    </section>
  );
}
