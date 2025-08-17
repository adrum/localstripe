import { useState } from 'react';

interface StackTraceProps {
  trace: string;
  title?: string;
  collapsible?: boolean;
  className?: string;
}

export default function StackTrace({ trace, title = "Stack Trace", collapsible = false, className = '' }: StackTraceProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsible);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(trace);
  };

  // Parse the stack trace into lines and format them
  const formatStackTrace = (stackTrace: string) => {
    const lines = stackTrace.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) return null;
      
      // Main exception line (first non-empty line)
      if (index === 0 || trimmedLine.startsWith('Traceback')) {
        return (
          <div key={index} className="font-semibold text-red-600 mb-2 pb-2 border-b border-red-200">
            {trimmedLine}
          </div>
        );
      }
      
      // File path lines (contain "File")
      if (trimmedLine.startsWith('File ')) {
        const fileMatch = trimmedLine.match(/File "([^"]+)", line (\d+), in (.+)/);
        if (fileMatch) {
          const [, filePath, lineNumber, functionName] = fileMatch;
          const fileName = filePath.split('/').pop() || filePath;
          
          return (
            <div key={index} className="mb-1">
              <span className="text-gray-600">File </span>
              <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded text-xs">
                {fileName}
              </span>
              <span className="text-gray-600">, line </span>
              <span className="font-mono text-purple-600 font-semibold">{lineNumber}</span>
              <span className="text-gray-600">, in </span>
              <span className="font-mono text-green-600 font-medium">{functionName}</span>
            </div>
          );
        }
      }
      
      // Code lines (usually indented)
      if (trimmedLine && !trimmedLine.startsWith('File ') && !trimmedLine.includes('Error:') && !trimmedLine.includes('Exception:')) {
        return (
          <div key={index} className="ml-4 mb-2">
            <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono block">
              {trimmedLine}
            </code>
          </div>
        );
      }
      
      // Exception/Error lines
      if (trimmedLine.includes('Error:') || trimmedLine.includes('Exception:') || 
          trimmedLine.match(/^\w+Error/) || trimmedLine.match(/^\w+Exception/)) {
        return (
          <div key={index} className="font-semibold text-red-700 bg-red-50 p-2 rounded border-l-4 border-red-400 mt-2">
            {trimmedLine}
          </div>
        );
      }
      
      // Default formatting for other lines
      return (
        <div key={index} className="text-gray-700 text-sm mb-1">
          {trimmedLine}
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <div className={`border border-red-200 rounded-lg bg-red-50 ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-red-100 border-b border-red-200 rounded-t-lg">
        <div className="flex items-center space-x-2">
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-red-200 rounded text-red-600"
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
          <span className="text-sm font-medium text-red-800 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {title}
          </span>
        </div>
        <button
          onClick={copyToClipboard}
          className="px-2 py-1 text-xs bg-white border border-red-300 rounded hover:bg-red-50 text-red-700"
        >
          Copy
        </button>
      </div>
      {!isCollapsed && (
        <div className="p-3 text-sm bg-white rounded-b-lg max-h-96 overflow-y-auto">
          {formatStackTrace(trace)}
        </div>
      )}
    </div>
  );
}