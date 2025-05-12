import React from "react";

interface Props {
    width?: number;
    height?: number;
    depth?: number;
  }
  
  const statusBarStyles: React.CSSProperties = {
    position: 'fixed',
    left: '16px',
    bottom: '16px',
  };
  
  const StatusBar = ({ width = 0, height = 0, depth = 0 }: Props) => (
    <div style={statusBarStyles}>
      <p><strong>Width:</strong> {width} px</p>
      <p><strong>Height:</strong> {height} px</p>
      <p><strong>Color Depth:</strong> {depth} bit</p>
    </div>
  );
  
  export default StatusBar;
  