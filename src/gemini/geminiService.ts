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
  private modelId = 'gemini-2.0-flash';

  private initializeAPI(): boolean {
    const config = vscode.workspace.getConfiguration('baselineGate');
    const apiKey = config.get<string>('geminiApiKey');
    const configuredModel = config.get<string>('geminiModel');

    if (!apiKey || apiKey.trim() === '') {
      return false;
    }

    try {
      this.modelId = configuredModel && configuredModel.trim() !== ''
        ? configuredModel.trim()
        : 'gemini-2.0-flash';
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelId });
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

    // Get custom prompt from settings
    const config = vscode.workspace.getConfiguration('baselineGate');
    const customPrompt = config.get<string>('geminiCustomPrompt', '');
    
    // Build the full prompt
    let fullPrompt = '';
    if (customPrompt.trim()) {
      fullPrompt = `${customPrompt}\n\n`;
    }
    fullPrompt += `Act as a senior engineer. Provide a concise, enterprise-grade solution for the following technical issue: ${issue}`;
    
    // Add contextual information if available  
    if (feature || file) {
      fullPrompt += `\n\nContext:`;
      if (feature) {
        fullPrompt += `\n- Feature: ${feature}`;
      }
      if (file) {
        fullPrompt += `\n- File: ${file}`;
      }
    }

    try {
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      if (this.genAI && this.shouldAttemptLegacyFallback(error)) {
        try {
          const fallbackModelId = 'gemini-2.0-flash';
          const fallbackModel = this.genAI.getGenerativeModel({ model: fallbackModelId });
          const fallbackResult = await fallbackModel.generateContent(fullPrompt);
          const fallbackResponse = await fallbackResult.response;
          this.model = fallbackModel;
          this.modelId = fallbackModelId;
          return fallbackResponse.text();
        } catch (fallbackError) {
          console.error('Gemini fallback model failed:', fallbackError);
        }
      }

      console.error('Gemini API error:', error);
      const errorMessage = this.buildHelpfulErrorMessage(error);
      throw new Error(`Failed to get suggestion from Gemini: ${errorMessage}`);
    }
  }

  private shouldAttemptLegacyFallback(error: unknown): boolean {
    if (this.modelId === 'gemini-2.0-flash') {
      return false;
    }

    const message = this.extractErrorMessage(error);
    if (!message) {
      return false;
    }

    return message.includes('gemini-2.0-flash') || message.includes('was not found');
  }

  private buildHelpfulErrorMessage(error: unknown): string {
    const message = this.extractErrorMessage(error) || 'Unknown error';

    if (message.includes('was not found') || message.includes('404')) {
      return `${message}. Your API key might not have access to ${this.modelId}. ` +
        'Try setting "baselineGate.geminiModel" to a model you can access (for example gemini-2.0-flash) ' +
        'or upgrade your Google AI access as described at https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions.';
    }

    return message;
  }

  private extractErrorMessage(error: unknown): string | undefined {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null) {
      const maybeMessage = (error as { message?: string }).message;
      if (typeof maybeMessage === 'string') {
        return maybeMessage;
      }

      const maybeCode = (error as { code?: string }).code;
      if (typeof maybeCode === 'string') {
        return maybeCode;
      }
    }

    return undefined;
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
