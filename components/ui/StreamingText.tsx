'use client';

import { useEffect, useRef, useState } from 'react';

interface StreamingTextProps {
  tokens: string[];
  className?: string;
  onDone?: () => void;
}

export default function StreamingText({ tokens, className = '', onDone }: StreamingTextProps) {
  const [text, setText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    setText(tokens.join(''));
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [tokens]);

  useEffect(() => {
    if (tokens.length > 0 && !doneRef.current) {
      const lastToken = tokens[tokens.length - 1];
      if (lastToken === '[DONE]') {
        doneRef.current = true;
        onDone?.();
      }
    }
  }, [tokens, onDone]);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto relative ${className}`}
      style={{ maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' }}
    >
      <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
        {text}
        <span
          className="inline-block w-0.5 h-3.5 bg-primary/60 ml-0.5 animate-pulse"
          style={{ verticalAlign: '-2px' }}
        />
      </p>
    </div>
  );
}
