import React, { useState } from 'react';

interface SaveTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  defaultTitle?: string;
}

export const SaveTitleModal: React.FC<SaveTitleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultTitle,
}) => {
  const [title, setTitle] = useState(defaultTitle || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(title.trim());
    onClose();
  };

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <div>
            <p className="eyebrow">User Vault</p>
            <h3 style={{ margin: 0 }}>Save Analysis</h3>
          </div>
          <button type="button" className="auth-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="save-title-input">Analysis Title (Optional)</label>
            <input
              id="save-title-input"
              type="text"
              placeholder={defaultTitle || 'e.g. Duplicate Detection Analysis'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Save Analysis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
