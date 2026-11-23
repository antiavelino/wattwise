import React from 'react';

type BadgeTone = 'emerald' | 'amber' | 'red' | 'sky' | 'slate' | 'demo';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'slate', children, title }) => {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {children}
    </span>
  );
};
