import { apiClient, resolveApiUrl } from './client';

export interface FileRecord extends Record<string, unknown> {
  id: string;
  filename: string;
  content_type?: string | null;
  url: string;
  thumb_url: string;
}

export const uploadFile = async (file: File): Promise<FileRecord> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const deleteStoredFile = async (fileId: string): Promise<void> => {
  await apiClient.delete(`/files/${fileId}`);
};

export async function downloadFile(fileId: string, filename?: string): Promise<void> {
  const response = await apiClient.get(`/files/${fileId}`, { responseType: 'blob' });
  const href = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename ?? `file-${fileId}`;
  link.click();
  URL.revokeObjectURL(href);
}

export function resolveFileUrl(path: string | null | undefined): string | null {
  return resolveApiUrl(path);
}
