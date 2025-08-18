import type { HTMLAttributes, InputHTMLAttributes } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ 
  label, 
  required = false, 
  error, 
  children, 
  className = '' 
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
        error 
          ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
          : 'border-gray-300 dark:border-gray-600 focus:ring-purple-500'
      } ${className}`}
      {...props}
    />
  );
}

interface TextareaProps extends HTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  rows?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

export function Textarea({ error, className = '', rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
        error 
          ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
          : 'border-gray-300 dark:border-gray-600 focus:ring-purple-500'
      } ${className}`}
      {...props}
    />
  );
}

interface SelectProps extends HTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
        error 
          ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
          : 'border-gray-300 dark:border-gray-600 focus:ring-purple-500'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}