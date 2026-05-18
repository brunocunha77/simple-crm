
import React from "react";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className }: QRCodeProps) {
  // This is a simple QR code visualization for demo purposes
  // In a real application, you would use a library like 'qrcode.react'
  
  // Create a checkerboard pattern based on the value string
  const generateQRPattern = () => {
    // Use the string to generate a simple pattern
    const seed = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pattern = [];
    
    const patternSize = 10; // Size of the QR pattern grid
    
    for (let i = 0; i < patternSize; i++) {
      for (let j = 0; j < patternSize; j++) {
        // Use a deterministic but "random-looking" pattern based on position and seed
        const isBlack = ((i * j + i + j + seed) % 4) < 2;
        pattern.push(
          <rect
            key={`${i}-${j}`}
            x={i * (size / patternSize)}
            y={j * (size / patternSize)}
            width={size / patternSize}
            height={size / patternSize}
            fill={isBlack ? "black" : "white"}
          />
        );
      }
    }
    
    // Add position detection patterns (the three squares in corners)
    const positionPatternSize = size / patternSize;
    const cornerSize = 3 * positionPatternSize;
    
    // Top-left corner
    pattern.push(
      <rect key="tl-outer" x={0} y={0} width={cornerSize} height={cornerSize} fill="black" />,
      <rect 
        key="tl-middle" 
        x={positionPatternSize} 
        y={positionPatternSize} 
        width={cornerSize - 2 * positionPatternSize} 
        height={cornerSize - 2 * positionPatternSize} 
        fill="white" 
      />,
      <rect 
        key="tl-inner" 
        x={2 * positionPatternSize} 
        y={2 * positionPatternSize} 
        width={cornerSize - 4 * positionPatternSize} 
        height={cornerSize - 4 * positionPatternSize} 
        fill="black" 
      />
    );
    
    // Top-right corner
    pattern.push(
      <rect 
        key="tr-outer" 
        x={size - cornerSize} 
        y={0} 
        width={cornerSize} 
        height={cornerSize} 
        fill="black" 
      />,
      <rect 
        key="tr-middle" 
        x={size - cornerSize + positionPatternSize} 
        y={positionPatternSize} 
        width={cornerSize - 2 * positionPatternSize} 
        height={cornerSize - 2 * positionPatternSize} 
        fill="white" 
      />,
      <rect 
        key="tr-inner" 
        x={size - cornerSize + 2 * positionPatternSize} 
        y={2 * positionPatternSize} 
        width={cornerSize - 4 * positionPatternSize} 
        height={cornerSize - 4 * positionPatternSize} 
        fill="black" 
      />
    );
    
    // Bottom-left corner
    pattern.push(
      <rect 
        key="bl-outer" 
        x={0} 
        y={size - cornerSize} 
        width={cornerSize} 
        height={cornerSize} 
        fill="black" 
      />,
      <rect 
        key="bl-middle" 
        x={positionPatternSize} 
        y={size - cornerSize + positionPatternSize} 
        width={cornerSize - 2 * positionPatternSize} 
        height={cornerSize - 2 * positionPatternSize} 
        fill="white" 
      />,
      <rect 
        key="bl-inner" 
        x={2 * positionPatternSize} 
        y={size - cornerSize + 2 * positionPatternSize} 
        width={cornerSize - 4 * positionPatternSize} 
        height={cornerSize - 4 * positionPatternSize} 
        fill="black" 
      />
    );
    
    return pattern;
  };

  return (
    <div className={className}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        style={{ border: '1px solid #ddd' }}
      >
        <rect x={0} y={0} width={size} height={size} fill="white" />
        {generateQRPattern()}
      </svg>
    </div>
  );
}
