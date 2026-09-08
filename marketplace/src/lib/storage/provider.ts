export interface StorageProvider {
  readonly name: 'local' | 'supabase';
  put(path: string, data: Buffer, mimeType: string): Promise<void>;
  get(path: string): Promise<Buffer | null>;
  remove(path: string): Promise<void>;
}
