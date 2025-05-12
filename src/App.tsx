import React from 'react';
import { useRef, useState } from "react";
import ImageUploader from "./components/ImageUploader/ImageUploader";
import StatusBar from "./components/StatusBar/StatusBar";
import { readGrayBit7 } from "./parsers/readGrayBit7";
import { renderImage } from "./canvas/renderImage";
import { renderGrayBit7 } from "./canvas/renderGrayBit7";
import { getColorDepth } from "./canvas/getColorDepth";
import { AppImageData } from "./types/ImageData";

const App = () => {
  const [imageData, setImageData] = useState<Partial<AppImageData>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.type === "image/png" || file.type === "image/jpeg") {
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          renderImage(canvasRef.current!, img);
          setImageData({
            width: img.width,
            height: img.height,
            depth: getColorDepth(img),
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith(".gb7")) {
      reader.onload = () => {
        const imgData = readGrayBit7(reader.result as ArrayBuffer);
        if (imgData) {
          renderGrayBit7(canvasRef.current!, imgData);
          setImageData(imgData);
        } else {
          alert("Invalid GrayBit-7 file");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file format!");
    }
  };

  return (
    <div>
      <ImageUploader onFileSelect={handleFileChange} />
      <canvas ref={canvasRef}></canvas>
      <StatusBar
        width={imageData.width}
        height={imageData.height}
        depth={imageData.depth}
      />
    </div>
  );
};

export default App;
