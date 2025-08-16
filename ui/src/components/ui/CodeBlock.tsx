import { useState } from 'react';

interface CodeBlockProps {
  data: any;
  title?: string;
  collapsible?: boolean;
  className?: string;
}

export default function CodeBlock({ data, title, collapsible = false, className = '' }: CodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsible);
  
  const formattedData = JSON.stringify(data, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedData);
  };

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
          <div className="flex items-center space-x-2">
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-gray-200 rounded text-gray-500"
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
            )}
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
          >
            Copy
          </button>
        </div>
      )}
      {!isCollapsed && (
        <pre className="p-3 text-xs text-gray-800 bg-gray-50 overflow-x-auto rounded-b-lg">
          <code>{formattedData}</code>
        </pre>
      )}
    </div>
  );
}