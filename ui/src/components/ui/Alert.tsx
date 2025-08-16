import type { HTMLAttributes } from 'react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'warning' | 'success' | 'info';
  title?: string;
}

export default function Alert({ 
  variant = 'info', 
  title, 
  children, 
  className = '', 
  ...props 
}: AlertProps) {
  const variantClasses = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconClasses = {
    error: '❌',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️',
  };

  return (
    <div 
      className={`border rounded-lg p-4 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-sm">{iconClasses[variant]}</span>
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}