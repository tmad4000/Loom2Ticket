import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);
const unlink = promisify(fs.unlink);
const MAX_VIDEO_SIZE_MB = 250;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 300000;

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

async function extractHLSUrlFromPage(videoId: string): Promise<string | null> {
  try {
    const pageUrl = `https://www.loom.com/share/${videoId}`;
    const response = await axios.get(pageUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = response.data;
    
    const hlsMatch = html.match(/https:\/\/luna\.loom\.com[^"']*playlist\.m3u8[^"']*/);
    if (hlsMatch) {
      const url = hlsMatch[0].replace(/\\u0026/g, '&').replace(/\\/g, '');
      console.log('Found HLS playlist URL');
      return url;
    }

    const rawVideoMatch = html.match(/"rawVideo":"([^"]+)"/);
    if (rawVideoMatch) {
      const url = rawVideoMatch[1].replace(/\\/g, '');
      console.log('Found rawVideo URL in page data');
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
    console.log(`Using yt-dlp to download from: ${videoUrl}`);
    
    const ytDlpCommand = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${tempFilePath}" "${videoUrl}" 2>&1`;
    
    let output: string = '';
    try {
      const { stdout, stderr } = await execPromise(ytDlpCommand, {
        timeout: DOWNLOAD_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024
      });
      output = stdout + stderr;
      console.log('yt-dlp completed successfully');
      console.log('Output:', output.substring(0, 500));
    } catch (execError: any) {
      output = (execError.stdout || '') + (execError.stderr || '');
      console.log('yt-dlp exited with error code, checking if file was created...');
      console.log('Error output:', output.substring(0, 500));
      
      if (execError.killed) {
        throw new Error('Video download timed out. The video may be too large or the connection is slow.');
      }
      
      if (output.includes('Private video') || output.includes('Sign in')) {
        throw new Error('This Loom video appears to be private or requires authentication.');
      }
      
      if (output.includes('Video unavailable') || output.includes('not found')) {
        throw new Error('Loom video not found. The video may have been deleted or the URL is incorrect.');
      }
      
      if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
        throw new Error(`yt-dlp failed to create valid video file: ${output.substring(0, 300)}`);
      }
      
      console.log('File was created successfully despite yt-dlp errors, continuing...');
    }

    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Video file was not created. Download may have failed.');
    }

    const stats = fs.statSync(tempFilePath);
    const sizeBytes = stats.size;
    const sizeMB = sizeBytes / 1024 / 1024;

    if (sizeBytes === 0) {
      await unlink(tempFilePath);
      throw new Error('Downloaded file is empty. The video may be unavailable.');
    }

    if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
      await unlink(tempFilePath);
      throw new Error(`Video size (${sizeMB.toFixed(2)}MB) exceeds maximum allowed size (${MAX_VIDEO_SIZE_MB}MB)`);
    }

    console.log(`Successfully downloaded video: ${videoId} (${sizeMB.toFixed(2)}MB)`);

    return {
      filePath: tempFilePath,
      mimeType: 'video/mp4',
      sizeBytes,
      cleanup: async () => {
        try {
          if (fs.existsSync(tempFilePath)) {
            await unlink(tempFilePath);
            console.log(`Cleaned up temp file: ${tempFilePath}`);
          }
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

    throw new Error(`Failed to download video: ${error.message}`);
  }
}
