// src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface PredictionResult {
    success: boolean;
    class_id: number;
    disease_name: string;
    confidence: number;
    all_probabilities: Record<string, number>;
    error?: string;
}

export interface APIInfo {
    name: string;
    status: string;
    num_classes: number;
    classes: string[];
}

class NyakWitAPI {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async getAPIInfo(): Promise<APIInfo> {
        const response = await fetch(`${this.baseUrl}/`);
        if (!response.ok) throw new Error('Failed to fetch API info');
        return response.json();
    }

    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }

    async predictImage(file: File): Promise<PredictionResult> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseUrl}/predict`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }
}

export const api = new NyakWitAPI();