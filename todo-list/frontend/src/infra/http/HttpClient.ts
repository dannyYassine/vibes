export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
  }
}