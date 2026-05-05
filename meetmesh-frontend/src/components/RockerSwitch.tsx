import React from 'react';

interface RockerSwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
}

export const RockerSwitch: React.FC<RockerSwitchProps> = ({ checked, onChange, label }) => {
  return (
    <div className="rocker-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <label className="rocker rocker-small">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={onChange} 
        />
        <span className="switch-left">ON</span>
        <span className="switch-right">OFF</span>
      </label>
      {label && <span style={{ fontSize: '9px', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>}
    </div>
  );
};
