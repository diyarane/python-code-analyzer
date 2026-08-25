import React, { useState } from 'react';
import { IconInfo } from './Icons';
import { MetricCapability } from '../utils/metricCapabilities';

interface MetricInfoTooltipProps {
  capability: MetricCapability;
  align?: 'left' | 'right';
  iconSize?: number;
}

export const MetricInfoTooltip: React.FC<MetricInfoTooltipProps> = ({
  capability,
  align = 'left',
  iconSize = 14,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="info-popover-wrapper"
      style={{ display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="info-trigger-btn"
        aria-label={`${capability.title} information`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <IconInfo size={iconSize} />
      </button>

      {isOpen && (
        <div
          className={`info-popover-card ${align === 'right' ? 'popover-align-right' : ''}`}
          role="tooltip"
        >
          <div className="popover-section">
            <h4>{capability.title}</h4>
            <p>{capability.copy}</p>
          </div>
        </div>
      )}
    </div>
  );
};
