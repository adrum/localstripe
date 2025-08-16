import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ 
  children, 
  className = '', 
  padding = 'md',
  ...props 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}