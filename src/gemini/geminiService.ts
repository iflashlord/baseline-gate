import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiSuggestion {
  id: string;
  timestamp: Date;
  issue: string;
  suggestion: string;
  feature?: string; // Human-readable feature name
  featureId?: string; // Feature ID for linking to baseline data
  file?: string;
  findingId?: string; // Link to the original finding
  conversationId?: string; // For threading conversations
  parentId?: string; // For reply chains
  status: 'success' | 'error' | 'pending' | 'user';
  tokensUsed?: number;
  responseTime?: number;
  rating?: 1 | 2 | 3 | 4 | 5; // User feedback
  tags?: string[];
}

export interface GeminiRequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeout?: number;
  retries?: number;
}

export interface GeminiResponse {
  text: string;
  tokensUsed?: number;
  responseTime: number;
  modelUsed: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private modelId = 'gemini-2.0-flash';
  private requestCount = 0;
  private errorCount = 0;
  private readonly maxRequestsPerMinute = 60;
  private readonly requestTimestamps: number[] = [];

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

  async getSuggestion(issue: string, feature?: string, file?: string, options?: GeminiRequestOptions): Promise<GeminiResponse> {
    if (!this.initializeAPI()) {
      throw new Error('Gemini API key is not configured. Please set your API key in VS Code settings.');
    }

    // Rate limiting check
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    const startTime = Date.now();
    
    // Get custom prompt from settings
    const config = vscode.workspace.getConfiguration('baselineGate');
    const customPrompt = config.get<string>('geminiCustomPrompt', '');
    
    // Build the full prompt with enhanced context
    let fullPrompt = this.buildEnhancedPrompt(issue, feature, file, customPrompt);

    // Configure generation parameters
    const generationConfig = {
      temperature: options?.temperature ?? 0.7,
      topP: options?.topP ?? 0.9,
      maxOutputTokens: options?.maxTokens ?? 2048,
    };

    try {
      // Create model with configuration
      const modelWithConfig = this.genAI!.getGenerativeModel({ 
        model: this.modelId,
        generationConfig
      });

      const result = await this.withTimeout(
        modelWithConfig.generateContent(fullPrompt),
        options?.timeout ?? 30000
      );
      
      const response = await result.response;
      const text = response.text();
      const responseTime = Date.now() - startTime;
      
      this.requestCount++;
      this.requestTimestamps.push(Date.now());
      
      return {
        text,
        tokensUsed: this.estimateTokens(fullPrompt + text),
        responseTime,
        modelUsed: this.modelId
      };
    } catch (error) {
      if (this.genAI && this.shouldAttemptLegacyFallback(error)) {
        try {
          const fallbackModelId = 'gemini-2.0-flash';
          const fallbackModel = this.genAI.getGenerativeModel({ model: fallbackModelId });
          const fallbackResult = await fallbackModel.generateContent(fullPrompt);
          const fallbackResponse = await fallbackResult.response;
          this.model = fallbackModel;
          this.modelId = fallbackModelId;
          
          const fallbackText = fallbackResponse.text();
          const responseTime = Date.now() - startTime;
          
          return {
            text: fallbackText,
            tokensUsed: this.estimateTokens(fullPrompt + fallbackText),
            responseTime,
            modelUsed: fallbackModelId
          };
        } catch (fallbackError) {
          console.error('Gemini fallback model failed:', fallbackError);
        }
      }

      this.errorCount++;
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
5. Try the "Fix with Gemini" button again

Your API key will be stored securely in your VS Code settings.`;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old timestamps
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] < oneMinuteAgo) {
      this.requestTimestamps.shift();
    }
    
    return this.requestTimestamps.length < this.maxRequestsPerMinute;
  }

  private buildEnhancedPrompt(issue: string, feature?: string, file?: string, customPrompt?: string): string {
    let fullPrompt = '';
    
    // Add custom prompt if provided
    if (customPrompt?.trim()) {
      fullPrompt = `${customPrompt}\n\n`;
    }
    
    // Enhanced system prompt
    fullPrompt += `You are a senior software engineer with expertise in web development, debugging, and code optimization. 
Provide practical, production-ready solutions that follow industry best practices.

Task: ${issue}`;
    
    // Add contextual information
    if (feature || file) {
      fullPrompt += `\n\nContext:`;
      if (feature) {
        fullPrompt += `\n- Feature/Component: ${feature}`;
      }
      if (file) {
        fullPrompt += `\n- File Path: ${file}`;
        // Extract file extension for language context
        const ext = file.split('.').pop()?.toLowerCase();
        if (ext) {
          const langMap: { [key: string]: string } = {
            'ts': 'TypeScript',
            'js': 'JavaScript',
            'tsx': 'TypeScript React',
            'jsx': 'JavaScript React',
            'css': 'CSS',
            'scss': 'Sass',
            'html': 'HTML',
            'json': 'JSON'
          };
          const language = langMap[ext] || ext.toUpperCase();
          fullPrompt += `\n- Language: ${language}`;
        }
      }
    }
    
    fullPrompt += `\n\nPlease provide:
1. Root cause analysis
2. Step-by-step solution
3. Code examples (if applicable)
4. Best practices to prevent similar issues
5. Alternative approaches (if any)

Format your response in clear markdown with proper code blocks.`;
    
    return fullPrompt;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  getUsageStats(): { requests: number; errors: number; successRate: number } {
    const successRate = this.requestCount > 0 ? ((this.requestCount - this.errorCount) / this.requestCount) * 100 : 0;
    return {
      requests: this.requestCount,
      errors: this.errorCount,
      successRate: Math.round(successRate * 100) / 100
    };
  }
}

export const geminiService = new GeminiService();
