import axios from "axios";

interface LoomTranscriptItem {
  text: string;
  startTime?: number;
}

export async function extractLoomTranscript(videoUrl: string): Promise<string> {
  try {
    const response = await axios.get(videoUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = response.data;

    const transcriptMatches = html.match(/"transcript":\s*(\[[\s\S]*?\])/);
    
    if (transcriptMatches && transcriptMatches[1]) {
      try {
        const transcriptData = JSON.parse(transcriptMatches[1]) as LoomTranscriptItem[];
        
        if (Array.isArray(transcriptData) && transcriptData.length > 0) {
          const transcriptText = transcriptData
            .map(item => item.text)
            .join(' ')
            .trim();
          
          if (transcriptText.length > 0) {
            return transcriptText;
          }
        }
      } catch (parseError) {
        console.error('Failed to parse transcript JSON:', parseError);
      }
    }

    const textMatches = html.match(/"text":\s*"([^"]+)"/g);
    if (textMatches && textMatches.length > 5) {
      const combinedText = textMatches
        .map(match => {
          const textMatch = match.match(/"text":\s*"([^"]+)"/);
          return textMatch ? textMatch[1] : '';
        })
        .filter(text => text.length > 5)
        .join(' ');
      
      if (combinedText.length > 50) {
        return combinedText;
      }
    }

    throw new Error("Could not extract transcript from Loom video. The video may not have captions enabled.");
  } catch (error: any) {
    if (error.message.includes("Could not extract transcript")) {
      throw error;
    }
    
    console.error('Error scraping Loom transcript:', error.message);
    throw new Error(`Failed to access Loom video. Please ensure the video is publicly accessible or provide the transcript manually.`);
  }
}
