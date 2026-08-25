import React, { useRef } from 'react';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onAnalyze: () => void;
  onFileUpload: (code: string, filename: string) => void;
  isAnalyzing: boolean;
  fileStatus: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onToggleTheme,
  onAnalyze,
  onFileUpload,
  isAnalyzing,
  fileStatus,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.py')) {
      alert('Only .py files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      onFileUpload(content, file.name);
    };
    reader.readAsText(file);
  };

  return (
    <nav className="navbar">
      <a className="brand" href="#" aria-label="CodeAnalyzer AI home">
        <span className="brand-mark">CA</span>
        <span>
          <strong>CodeAnalyzer AI</strong>
          <small>Static intelligence platform (React + TS)</small>
        </span>
      </a>

      <div className="nav-actions">
        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept=".py"
          onChange={handleFileChange}
        />
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload ({fileStatus})
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing…' : 'Analyze'}
        </button>
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
};
