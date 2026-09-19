import React from 'react';
import { motion } from 'motion/react';

interface VoiceWaveProps {
  active: boolean;
  color?: string;
  label?: string;
}

export const VoiceWave: React.FC<VoiceWaveProps> = ({
  active,
  color = 'bg-emerald-500',
  label = 'Listening...'
}) => {
  const bars = [12, 24, 16, 32, 20, 28, 14, 26, 18];

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner">
      <div className="flex items-center gap-0.5 h-6">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            className={`w-1 rounded-full ${color}`}
            animate={
              active
                ? {
                    height: [6, height, 8, height * 0.7, 6],
                  }
                : { height: 4 }
            }
            transition={
              active
                ? {
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: 'easeInOut',
                  }
                : { duration: 0.2 }
            }
          />
        ))}
      </div>
      {label && (
        <span className="text-xs font-medium text-slate-300 select-none">
          {label}
        </span>
      )}
    </div>
  );
};
