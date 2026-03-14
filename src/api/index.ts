import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export interface SearchResult {
  id: string;
  title: string;
  channelTitle: string;
  url: string;
  duration?: string;
}

export async function searchYouTube(
  query: string,
  maxResults = 5
): Promise<SearchResult[]> {
  console.log(`[API] Searching YouTube for: "${query}"`);

  const res = await youtube.search.list({
    part: ['snippet'],
    q: query,
    maxResults,
    type: ['video'],
  });

  const items = res.data.items || [];
  return items.map((item) => ({
    id: item.id?.videoId || '',
    title: item.snippet?.title || 'Unknown',
    channelTitle: item.snippet?.channelTitle || 'Unknown',
    url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
  }));
}
