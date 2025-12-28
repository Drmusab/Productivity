/**
 * @fileoverview Resizable gutter component for adjusting pane widths
 */

import React, { useRef, useEffect, useState } from 'react';

interface ResizableGutterProps {
  onResize: (delta: number) => void;
}

const ResizableGutter: React.FC<ResizableGutterProps> = ({ onResize }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  return (
    <div
      className={`obsidian-gutter ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    />
  );
};

export default ResizableGutter;
