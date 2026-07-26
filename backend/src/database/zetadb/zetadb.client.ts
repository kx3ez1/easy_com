export interface ZetaResponse<T> {
  status: 'success' | 'error';
  code: string;
  data: T | null;
  error: {
    message: string;
    details: any;
  } | null;
}

export class ZetaDBClient {
  private get baseUrl(): string {
    return process.env.ZETADB_URL || 'http://localhost:8080';
  }

  private get apiKey(): string {
    return process.env.ZETADB_API_KEY || '';
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  async get<T>(key: string): Promise<ZetaResponse<T>> {
    const res = await fetch(`${this.baseUrl}/${key}`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async put<T>(key: string, value: any, options?: { type?: string; cas?: string | number }): Promise<ZetaResponse<T>> {
    const url = new URL(`${this.baseUrl}/${key}`);
    if (options?.type) url.searchParams.append('type', options.type);
    if (options?.cas) url.searchParams.append('cas', String(options.cas));

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: typeof value === 'string' ? value : JSON.stringify(value),
    });
    return res.json();
  }

  async delete(key: string): Promise<ZetaResponse<null>> {
    const res = await fetch(`${this.baseUrl}/${key}?delete=true`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async bulkGet<T>(keys: string[]): Promise<ZetaResponse<{ results: any[] }>> {
    const res = await fetch(`${this.baseUrl}/bulk/get`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ keys }),
    });
    return res.json();
  }
}
