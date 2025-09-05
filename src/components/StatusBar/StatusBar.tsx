import React from 'react';
import './StatusBar.css';

interface Props {
  width?: number;
  height?: number;
  depth?: number;
  scalePercent: number;
  onScaleChange: (p: number) => void;
}

const row: React.CSSProperties = { margin: '2px 0' };

const StatusBar = ({ width = 0, height = 0, depth = 0, scalePercent, onScaleChange }: Props) => (
  <div className="status-bar">
    <p style={row}>
      <strong>Width:</strong> {width} px
    </p>
    <p style={row}>
      <strong>Height:</strong> {height} px
    </p>
    <p style={row}>
      <strong>Color Depth:</strong> {depth} bit
    </p>
    <div style={{ marginTop: 6 }}>
      <label style={{ display: 'block', marginBottom: 4 }}>
        <strong>Scale:</strong> {scalePercent}%
      </label>
      <input
        type="range"
        min={12}
        max={300}
        step={1}
        value={scalePercent}
        onChange={(e) => onScaleChange(Number(e.target.value))}
        style={{ width: 220 }}
        aria-label="Scale percent"
      />
    </div>
  </div>
);

export default StatusBar;
