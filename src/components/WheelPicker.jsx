import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * WheelPicker - A lightweight, 3D cylindrical drum wheel scroller
 * Supports:
 * - Touch flick/swipe with momentum snapping on mobile (Android/iOS)
 * - Mouse wheel scrolling with smooth snapping
 * - Trackpad momentum scrolling
 * - Click-to-center item selection
 * - Keyboard navigation (ArrowUp, ArrowDown)
 * - 3D depth perspective rotation, scale, and opacity curves
 */
export default function WheelPicker({
  items = [],
  selectedValue = '',
  onValueChange,
  itemHeight = 34,
  visibleCount = 11,
  placeholder = 'कोई विकल्प उपलब्ध नहीं',
  ariaLabel = 'विकल्प चुनें'
}) {
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);

  // Derive item labels and values safely
  const getItemName = useCallback((item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.name || item.title || item.id || '';
  }, []);

  // Compute selected index
  const initialIndex = items.findIndex(it => getItemName(it) === getItemName(selectedValue));
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  // Sync with external selectedValue changes
  useEffect(() => {
    const idx = items.findIndex(it => getItemName(it) === getItemName(selectedValue));
    if (idx >= 0 && idx !== activeIndex) {
      setActiveIndex(idx);
      if (containerRef.current) {
        isProgrammaticScrollRef.current = true;
        containerRef.current.scrollTo({
          top: idx * itemHeight,
          behavior: 'smooth'
        });
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 300);
      }
    }
  }, [selectedValue, items, itemHeight, getItemName]);

  // Initial scroll position on mount
  useEffect(() => {
    if (containerRef.current && activeIndex >= 0) {
      containerRef.current.scrollTop = activeIndex * itemHeight;
    }
  }, [itemHeight]);

  // Handle scroll events with debounced snap and selection notification
  const handleScroll = () => {
    if (!containerRef.current || isProgrammaticScrollRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const rawIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, rawIndex));

    if (clampedIndex !== activeIndex) {
      setActiveIndex(clampedIndex);
    }

    // Debounce snap settlement
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const finalScrollTop = containerRef.current.scrollTop;
      const targetIndex = Math.max(0, Math.min(items.length - 1, Math.round(finalScrollTop / itemHeight)));

      // Precise snap
      containerRef.current.scrollTo({
        top: targetIndex * itemHeight,
        behavior: 'smooth'
      });

      setActiveIndex(targetIndex);
      if (onValueChange && items[targetIndex]) {
        onValueChange(items[targetIndex], targetIndex);
      }
    }, 80);
  };

  // Mouse wheel listener for smooth item increments
  const handleWheel = (e) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const delta = e.deltaY;
    const direction = delta > 0 ? 1 : -1;
    const newIndex = Math.max(0, Math.min(items.length - 1, activeIndex + direction));
    
    if (newIndex !== activeIndex) {
      isProgrammaticScrollRef.current = true;
      setActiveIndex(newIndex);
      containerRef.current.scrollTo({
        top: newIndex * itemHeight,
        behavior: 'smooth'
      });

      if (onValueChange && items[newIndex]) {
        onValueChange(items[newIndex], newIndex);
      }

      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 150);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (items.length === 0) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(0, activeIndex - 1);
      scrollToIndex(newIndex);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(items.length - 1, activeIndex + 1);
      scrollToIndex(newIndex);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      const newIndex = Math.max(0, activeIndex - 5);
      scrollToIndex(newIndex);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      const newIndex = Math.min(items.length - 1, activeIndex + 5);
      scrollToIndex(newIndex);
    }
  };

  const scrollToIndex = (index) => {
    if (!containerRef.current || index < 0 || index >= items.length) return;
    setActiveIndex(index);
    isProgrammaticScrollRef.current = true;
    containerRef.current.scrollTo({
      top: index * itemHeight,
      behavior: 'smooth'
    });
    if (onValueChange && items[index]) {
      onValueChange(items[index], index);
    }
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 200);
  };

  const containerHeight = itemHeight * visibleCount;
  const paddingY = itemHeight * Math.floor(visibleCount / 2);

  if (!items || items.length === 0) {
    return (
      <div style={{
        height: `${containerHeight}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontSize: '0.82rem',
        padding: '16px',
        textAlign: 'center'
      }}>
        {placeholder}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        height: `${containerHeight}px`,
        width: '100%',
        overflow: 'hidden',
        userSelect: 'none',
        perspective: '1000px',
        WebkitPerspective: '1000px',
        outline: 'none'
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={`wheel-item-${activeIndex}`}
    >
      {/* Centered Golden Lens Highlight Frame */}
      <div
        style={{
          position: 'absolute',
          top: `${paddingY}px`,
          left: '6px',
          right: '6px',
          height: `${itemHeight}px`,
          background: 'linear-gradient(90deg, rgba(196, 151, 86, 0.15) 0%, rgba(196, 151, 86, 0.3) 50%, rgba(196, 151, 86, 0.15) 100%)',
          borderTop: '1.5px solid var(--khaki-primary, #c49756)',
          borderBottom: '1.5px solid var(--khaki-primary, #c49756)',
          borderRadius: '8px',
          boxShadow: '0 0 12px rgba(196, 151, 86, 0.25)',
          pointerEvents: 'none',
          zIndex: 3
        }}
      />

      {/* Top & Bottom Vignette Shadow Gradients for 3D Depth (Gentle 18px edge fade so all 5 items remain clearly visible) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '18px',
          background: 'linear-gradient(180deg, rgba(10, 20, 40, 0.92) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 4
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '18px',
          background: 'linear-gradient(0deg, rgba(7, 16, 34, 0.92) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 4
        }}
      />

      {/* Scrollable Drum Track */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: `${paddingY}px`,
          paddingBottom: `${paddingY}px`,
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none'  // IE/Edge
        }}
        className="wheel-picker-track"
      >
        <style>{`
          .wheel-picker-track::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {items.map((item, index) => {
          const name = getItemName(item);
          const diff = Math.abs(index - activeIndex);
          const isSelected = diff === 0;

          // 3D Cylinder Curve Calculations (Ensuring up to 11 items are prominently visible and legible)
          const rotateAngle = Math.min(42, Math.max(-42, (index - activeIndex) * -7.5));
          const scale = isSelected 
            ? 1.08 
            : diff === 1 ? 0.98
            : diff === 2 ? 0.94
            : diff === 3 ? 0.89
            : diff === 4 ? 0.84
            : diff === 5 ? 0.80
            : 0.74;

          const opacity = isSelected 
            ? 1 
            : diff === 1 ? 0.92 
            : diff === 2 ? 0.84 
            : diff === 3 ? 0.74
            : diff === 4 ? 0.62
            : diff === 5 ? 0.48
            : Math.max(0.18, 0.35 - (diff - 5) * 0.1);

          return (
            <div
              key={item.id || `${name}-${index}`}
              id={`wheel-item-${index}`}
              onClick={() => scrollToIndex(index)}
              role="option"
              aria-selected={isSelected}
              style={{
                height: `${itemHeight}px`,
                scrollSnapAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                textAlign: 'center',
                padding: '0 10px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'transform 0.14s ease-out, opacity 0.14s ease-out, color 0.14s ease-out',
                transform: `rotateX(${rotateAngle}deg) scale(${scale})`,
                WebkitTransform: `rotateX(${rotateAngle}deg) scale(${scale})`,
                transformOrigin: 'center center',
                opacity,
                color: isSelected ? '#ffffff' : '#94a3b8',
                fontWeight: isSelected ? 800 : 500,
                fontSize: isSelected ? '0.88rem' : '0.78rem',
                textShadow: isSelected ? '0 1px 8px rgba(196, 151, 86, 0.6)' : 'none'
              }}
            >
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                maxWidth: '100%'
              }}>
                {name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
