import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveProgress } from './types';
import { PreferencesManager } from '../preferences/PreferencesManager';

interface PermaCCResponse {
  guid: string;
  url: string;
  title?: string;
  creation_timestamp?: string;
  organization?: string;
  folder?: string;
}

interface PermaCCError {
  error: string;
  detail?: string;
}

export class PermaCCService extends BaseArchiveService {
  private static readonly API_BASE = 'https://api.perma.cc/v1';
  private apiKey: string | null = null;
  private defaultFolder: string | null = null;
  
  constructor() {
    super({
      id: 'permacc',
      name: 'Perma.cc',
      homepage: 'https://perma.cc',
      capabilities: {
        acceptsUrl: true,
        returnsUrl: true,
        preservesJavaScript: true,
        preservesInteractiveElements: true,
        requiresAuthentication: true,
        hasQuota: true
      }
    });
    
    this.loadCredentials();
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey !== null;
  }

  private loadCredentials(): void {
    this.apiKey = Zotero.Prefs.get('extensions.momento7.permaccApiKey') as string || null;
    this.defaultFolder = Zotero.Prefs.get('extensions.momento7.permaccFolder') as string || null;
  }

  protected async archiveUrl(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Perma.cc API key not configured. Please add your API key in preferences.'
      };
    }

    try {
      progress?.onStatusUpdate(`Creating Perma.cc archive for ${url}...`);
      
      const timeout = PreferencesManager.getTimeout('permacc');
      
      const body: any = { url };
      if (this.defaultFolder) {
        body.folder = this.defaultFolder;
      }
      
      const response = await this.makeHttpRequest(
        `${PermaCCService.API_BASE}/archives/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${this.apiKey}`
          },
          body: JSON.stringify(body),
          timeout
        }
      );

      if (!response.success) {
        return {
          success: false,
          error: this.parsePermaCCError(response)
        };
      }

      const data: PermaCCResponse = JSON.parse(response.data);
      
      if (!data.guid) {
        return {
          success: false,
          error: 'No GUID returned from Perma.cc'
        };
      }

      const archivedUrl = `https://perma.cc/${data.guid}`;
      
      return {
        success: true,
        url: archivedUrl,
        metadata: {
          originalUrl: url,
          archiveDate: data.creation_timestamp || new Date().toISOString(),
          service: this.config.name,
          guid: data.guid,
          title: data.title,
          organization: data.organization,
          folder: data.folder
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as SingleArchiveResult;
    }
  }

  private parsePermaCCError(response: any): string {
    try {
      const error: PermaCCError = JSON.parse(response.data);
      
      // Handle specific error cases
      if (error.detail?.includes('quota')) {
        return 'Perma.cc quota exceeded. Free tier allows 10 links per month.';
      }
      
      if (error.detail?.includes('Invalid API key')) {
        return 'Invalid Perma.cc API key. Please check your credentials.';
      }
      
      return error.detail || error.error || response.error || 'Perma.cc request failed';
    } catch {
      return response.error || 'Perma.cc request failed';
    }
  }

  async checkAvailability(_url: string): Promise<{ available: boolean; existingUrl?: string }> {
    if (!this.apiKey) {
      return { available: false };
    }

    try {
      // Check quota status
      const response = await this.makeHttpRequest(
        `${PermaCCService.API_BASE}/user/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${this.apiKey}`
          },
          timeout: 30000
        }
      );

      if (response.success) {
        // Could parse quota info here if needed
        return { available: true };
      }
      
      return { available: false };
    } catch (error) {
      return { available: false };
    }
  }

  async getFolders(): Promise<Array<{ id: string; name: string }>> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await this.makeHttpRequest(
        `${PermaCCService.API_BASE}/folders/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${this.apiKey}`
          },
          timeout: 30000
        }
      );

      if (response.success) {
        const folders = JSON.parse(response.data);
        return folders.objects || [];
      }
    } catch (error) {
      console.error('Failed to fetch Perma.cc folders:', error);
    }
    
    return [];
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.makeHttpRequest(
        `${PermaCCService.API_BASE}/user/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${apiKey}`
          },
          timeout: 30000
        }
      );

      return response.success && response.status === 200;
    } catch {
      return false;
    }
  }
}