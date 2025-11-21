import axios from "axios";

interface LoomOEmbedResponse {
  type: string;
  version: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name: string;
  provider_url: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export async function getLoomVideoMetadata(videoUrl: string): Promise<{
  title?: string;
  duration?: string;
  thumbnailUrl?: string;
}> {
  try {
    const oembedUrl = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(videoUrl)}`;
    
    const response = await axios.get<LoomOEmbedResponse>(oembedUrl, {
      timeout: 10000,
    });

    const data = response.data;

    return {
      title: data.title,
      duration: data.duration ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` : undefined,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch (error: any) {
    console.error("Error fetching Loom metadata:", error.message);
    return {};
  }
}

export function isValidLoomUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('loom.com');
  } catch {
    return false;
  }
}
