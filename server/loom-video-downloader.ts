import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const unlink = promisify(fs.unlink);
const MAX_VIDEO_SIZE_MB = 250;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 120000;

export interface DownloadedVideo {
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  cleanup: () => Promise<void>;
}

export function extractLoomVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('loom.com')) {
      return null;
    }
    const pathParts = urlObj.pathname.split('/');
    const shareIndex = pathParts.indexOf('share');
    if (shareIndex !== -1 && pathParts[shareIndex + 1]) {
      return pathParts[shareIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}

async function extractVideoUrlFromPage(videoId: string): Promise<string | null> {
  try {
    const pageUrl = `https://www.loom.com/share/${videoId}`;
    const response = await axios.get(pageUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = response.data;
    
    const rawVideoMatch = html.match(/"rawVideo":"([^"]+)"/);
    if (rawVideoMatch) {
      const url = rawVideoMatch[1].replace(/\\/g, '');
      console.log('Found rawVideo URL in page data');
      return url;
    }

    const videoUrlMatch = html.match(/"video_url":"([^"]+)"/);
    if (videoUrlMatch) {
      const url = videoUrlMatch[1].replace(/\\/g, '');
      console.log('Found video_url in page data');
      return url;
    }

    const transcodedMatch = html.match(/"transcoded_url":"([^"]+)"/);
    if (transcodedMatch) {
      const url = transcodedMatch[1].replace(/\\/g, '');
      console.log('Found transcoded_url in page data');
      return url;
    }

    return null;
  } catch (error) {
    console.error('Failed to extract video URL from page:', error);
    return null;
  }
}

export async function downloadLoomVideo(videoUrl: string): Promise<DownloadedVideo> {
  const videoId = extractLoomVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Invalid Loom video URL");
  }

  const tempFilePath = path.join('/tmp', `loom-${videoId}-${Date.now()}.mp4`);

  try {
    console.log(`Attempting to download Loom video: ${videoId}`);
    
    let downloadUrl = await extractVideoUrlFromPage(videoId);
    if (!downloadUrl) {
      console.log('Could not extract video URL from page, trying download parameter...');
      downloadUrl = `https://www.loom.com/share/${videoId}?download=1`;
    }
    
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      maxRedirects: 5,
      timeout: DOWNLOAD_TIMEOUT_MS,
      validateStatus: (status) => status === 200,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('video')) {
      throw new Error(`Invalid content type: ${contentType}. Video may be private or unavailable.`);
    }

    const contentLength = parseInt(response.headers['content-length'] || '0');
    if (contentLength > MAX_VIDEO_SIZE_BYTES) {
      throw new Error(`Video size (${Math.round(contentLength / 1024 / 1024)}MB) exceeds maximum allowed size (${MAX_VIDEO_SIZE_MB}MB)`);
    }

    const writeStream = fs.createWriteStream(tempFilePath);
    let downloadedBytes = 0;

    await new Promise<void>((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_VIDEO_SIZE_BYTES) {
          writeStream.destroy();
          reject(new Error(`Video exceeded maximum size during download (${MAX_VIDEO_SIZE_MB}MB)`));
        }
      });

      response.data.pipe(writeStream);

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
      response.data.on('error', (err: Error) => reject(err));
    });

    console.log(`Successfully downloaded video: ${videoId} (${Math.round(downloadedBytes / 1024 / 1024)}MB)`);

    return {
      filePath: tempFilePath,
      mimeType: contentType,
      sizeBytes: downloadedBytes,
      cleanup: async () => {
        try {
          await unlink(tempFilePath);
          console.log(`Cleaned up temp file: ${tempFilePath}`);
        } catch (err) {
          console.error(`Failed to cleanup temp file ${tempFilePath}:`, err);
        }
      }
    };
  } catch (error: any) {
    try {
      if (fs.existsSync(tempFilePath)) {
        await unlink(tempFilePath);
      }
    } catch {
      // Ignore cleanup errors
    }

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error("Loom video not found. The video may be private or the URL is incorrect.");
      } else if (error.response?.status === 403) {
        throw new Error("Access denied. The video may be private or require authentication.");
      } else if (error.code === 'ECONNABORTED') {
        throw new Error("Video download timed out. The video may be too large.");
      }
    }

    throw new Error(`Failed to download video: ${error.message}`);
  }
}
