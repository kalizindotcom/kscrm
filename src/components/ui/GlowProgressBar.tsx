import React, { useEffect, useState } from 'react';

export const GlowProgressBar = ({ isAnimating }: { isAnimating: boolean }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnimating) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 400);
    }
    return () => clearInterval(interval);
  }, [isAnimating]);

  if (progress === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 h-1 bg-primary z-[9999] transition-all duration-300 ease-out shadow-[0_0_10px_#8b5cf6,0_0_20px_#8b5cf6]"
      style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
    />
  );
};
