import React from 'react';
import './ImageUploader.css';

interface Props {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImageUploader = ({ onFileSelect }: Props) => {
  return (
    <div className="uploader-wrapper">
      <label htmlFor="file-upload" className="upload-button">
        Загрузить изображение
      </label>
      <input
        id="file-upload"
        type="file"
        onChange={onFileSelect}
        accept=".jpg, .jpeg, .png, .gb7"
        className="file-input"
      />
    </div>
  );
};

export default ImageUploader;
