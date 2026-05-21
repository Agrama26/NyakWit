
import React, { useState, useCallback } from 'react';
import { api, PredictionResult } from '../services/api';

const DiseasePredictor: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleImageSelect = useCallback((file: File) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setPrediction(null);
            setError(null);
        } else {
            setError('Silakan pilih file gambar yang valid');
        }
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) handleImageSelect(file);
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) handleImageSelect(file);
    };

    const handlePredict = async () => {
        if (!selectedImage) {
            setError('Pilih gambar terlebih dahulu');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await api.predictImage(selectedImage);
            if (result.success) {
                setPrediction(result);
            } else {
                setError(result.error || 'Prediksi gagal');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal terhubung ke server');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setPrediction(null);
        setError(null);
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-center mb-6 text-green-800">
                🌿 Klasifikasi Penyakit Daun Sawit - NyakWit
            </h2>

            {/* Upload Area */}
            {!previewUrl ? (
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'}
          `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <input
                        id="file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        aria-label="Pilih gambar daun sawit"
                    />
                    <div className="text-4xl mb-4">📸</div>
                    <p className="text-gray-600">
                        Klik atau drag & drop gambar daun sawit di sini
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                        Support: JPG, PNG, JPEG
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="relative">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-auto rounded-lg max-h-96 object-contain"
                        />
                        <button
                            onClick={handleReset}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                        >
                            ✕
                        </button>
                    </div>

                    <button
                        onClick={handlePredict}
                        disabled={loading}
                        className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold
              hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
              transition-colors"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Memproses...
                            </span>
                        ) : (
                            '🔍 Prediksi Penyakit'
                        )}
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-2 text-blue-600">Model sedang menganalisis gambar...</p>
                </div>
            )}

            {/* Results */}
            {prediction && !loading && (
                <div className="mt-6 p-5 bg-white rounded-lg shadow-lg border-l-4 border-green-500">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">📊 Hasil Diagnosa</h3>

                    <div className="mb-4 p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Penyakit Terdeteksi</p>
                        <p className="text-2xl font-bold text-green-700">{prediction.disease_name}</p>
                        <p className="text-lg text-gray-700">
                            Tingkat Keyakinan: <span className="font-semibold">{prediction.confidence}%</span>
                        </p>
                    </div>

                    <div>
                        <p className="font-semibold mb-3 text-gray-700">Detail Probabilitas:</p>
                        <div className="space-y-3">
                            {Object.entries(prediction.all_probabilities).map(([disease, prob]) => (
                                <div key={disease}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700">{disease}</span>
                                        <span className="font-medium">{prob}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${disease === prediction.disease_name ? 'bg-green-600' : 'bg-blue-500'
                                                }`}
                                            style={{ width: `${prob}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-center">⚠️ {error}</p>
                </div>
            )}
        </div>
    );
};

export default DiseasePredictor;