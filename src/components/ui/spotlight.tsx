'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '../../lib/utils';

type SpotlightProps = {
  className?: string;
  size?: number;
  springOptions?: any;
  isGlobal?: boolean;
};

export function Spotlight({
  className,
  size = 150,
  springOptions, // ignored for zero latency
  isGlobal = false,
}: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [parentElement, setParentElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isGlobal && containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        parent.style.position = 'relative';
        parent.style.overflow = 'hidden';
        setParentElement(parent);
      }
    }
  }, [isGlobal]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (isGlobal) {
        containerRef.current.style.left = `${event.clientX - size / 2}px`;
        containerRef.current.style.top = `${event.clientY - size / 2}px`;
        if (!isHovered) setIsHovered(true);
      } else {
        if (!parentElement) return;
        const { left, top } = parentElement.getBoundingClientRect();
        containerRef.current.style.left = `${event.clientX - left - size / 2}px`;
        containerRef.current.style.top = `${event.clientY - top - size / 2}px`;
      }
    },
    [parentElement, isGlobal, isHovered, size]
  );

  useEffect(() => {
    if (isGlobal) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseenter', () => setIsHovered(true));
      window.addEventListener('mouseleave', () => setIsHovered(false));
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseenter', () => setIsHovered(true));
        window.removeEventListener('mouseleave', () => setIsHovered(false));
      };
    } else {
      if (!parentElement) return;

      parentElement.addEventListener('mousemove', handleMouseMove);
      parentElement.addEventListener('mouseenter', () => setIsHovered(true));
      parentElement.addEventListener('mouseleave', () => setIsHovered(false));

      return () => {
        parentElement.removeEventListener('mousemove', handleMouseMove);
        parentElement.removeEventListener('mouseenter', () => setIsHovered(true));
        parentElement.removeEventListener('mouseleave', () =>
          setIsHovered(false)
        );
      };
    }
  }, [parentElement, handleMouseMove, isGlobal]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'pointer-events-none rounded-full transition-opacity duration-200',
        isHovered ? 'opacity-100' : 'opacity-0',
        isGlobal ? 'fixed z-[9999] blur-md' : 'absolute blur-xl',
        className
      )}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      }}
    />
  );
}
