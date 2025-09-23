import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiSuggestion {
  id: string;
  timestamp: Date;
  issue: string;
  suggestion: string;
  feature?: string;
  file?: string;
  findingId?: string; // Link to the original finding
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  private initializeAPI(): boolean {
    const apiKey = vscode.workspace.getConfiguration('baselineGate').get<string>('geminiApiKey');
    
    if (!apiKey || apiKey.trim() === '') {
      return false;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      return false;
    }
  }

  async getSuggestion(issue: string, feature?: string, file?: string): Promise<string> {
    if (!this.initializeAPI()) {
      throw new Error('Gemini API key is not configured. Please set your API key in VS Code settings.');
    }

    const prompt = `Act as a senior engineer. Provide a concise, enterprise-grade solution for the following technical issue: ${issue}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to get suggestion from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConfigured(): boolean {
    const apiKey = vscode.workspace.getConfiguration('baselineGate').get<string>('geminiApiKey');
    return !!(apiKey && apiKey.trim() !== '');
  }

  getConfigurationGuide(): string {
    return `To use Gemini AI suggestions, you need to:

1. Get a free API key from Google AI Studio: https://makersuite.google.com/app/apikey
2. Open VS Code Settings (Cmd/Ctrl + ,)
3. Search for "baselineGate.geminiApiKey"
4. Paste your API key in the setting
5. Try the "Ask Gemini to Fix" button again

Your API key will be stored securely in your VS Code settings.`;
  }
}

export const geminiService = new GeminiService();