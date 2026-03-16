import React from 'react';

const MODE_OPTIONS = [
  { key: 'suggestion', label: 'Suggestion' },
  { key: 'import', label: 'URL Link' },
  { key: 'ingredients', label: 'Ingredients List' }
];

interface ModeSelectorProps {
  selectedMode: string;
  onSelect: (mode: string) => void;
  disabled: boolean;
}

const ModeSelector = ({ selectedMode, onSelect, disabled }: ModeSelectorProps) => (
  <div className="mode-selector" role="group" aria-label="Recipe modes">
    {MODE_OPTIONS.map((option) => (
      <button
        key={option.key}
        type="button"
        className={`mode-button ${selectedMode === option.key ? 'is-selected' : ''}`}
        onClick={() => onSelect(option.key)}
        disabled={disabled}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default ModeSelector;
