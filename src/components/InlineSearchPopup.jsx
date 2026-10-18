import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, RefreshCw, X } from 'lucide-react';

export default function InlineSearchPopup({
  initialQuery = '',
  onSearchSubmit,
  onClose
}) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState(initialQuery || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (onClose) onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Focus input automatically on open
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const trimmed = (query || '').trim();

    // If query is empty, do not execute unrestricted search
    if (!trimmed) {
      setHasError(true);
      setTimeout(() => setHasError(false), 2000);
      return;
    }

    setIsSubmitting(true);
    setHasError(false);

    try {
      if (onSearchSubmit) {
        await onSearchSubmit(trimmed);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.warn('Search submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        width: 'min(300px, 90vw)',
        background: 'rgba(15, 23, 42, 0.98)',
        border: hasError ? '1.5px solid #ef4444' : '1.5px solid var(--khaki-primary, #c49756)',
        borderRadius: '10px',
        padding: '6px 8px',
        boxShadow: '0 12px 35px rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10020,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        animation: 'fadeIn 0.15s ease-out',
        transition: 'border 0.2s ease'
      }}
      onClick={e => e.stopPropagation()}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: '6px',
          margin: 0
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="PNO, मोबाइल, नाम, थाना..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (hasError) setHasError(false);
          }}
          disabled={isSubmitting}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f8fafc',
            fontSize: '0.85rem',
            padding: '4px 6px'
          }}
          aria-label="कर्मचारी खोजें (PNO, मोबाइल, नाम, थाना)"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="साफ़ करें"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c49756, #8e6833)',
            border: 'none',
            color: '#081022',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'transform 0.15s ease, opacity 0.15s ease',
            opacity: isSubmitting ? 0.7 : 1
          }}
          aria-label="सर्च सबमिट करें"
          title="सर्च करें"
        >
          {isSubmitting ? (
            <RefreshCw size={15} color="#081022" className="animate-spin" />
          ) : (
            <ArrowRight size={16} color="#081022" />
          )}
        </button>
      </form>
    </div>
  );
}
