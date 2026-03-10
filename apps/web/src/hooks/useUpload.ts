import { useCallback, useState } from 'react';

export function useUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/pages/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data.avatar_url;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploadAvatar, uploading };
}
