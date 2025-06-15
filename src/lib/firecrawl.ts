import FirecrawlApp from '@mendable/firecrawl-js';
import OpenAI from 'openai';

// Initialize clients only when needed to avoid runtime errors
export function getFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not set');
  }
  return new FirecrawlApp({ apiKey });
}

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

export interface CrawlProgress {
  status: 'crawling' | 'processing' | 'enhancing' | 'complete' | 'error';
  message: string;
  current?: number;
  total?: number;
}

export async function crawlWebsite(
  url: string,
  onProgress?: (progress: CrawlProgress) => void,
  fullVersion: boolean = false
): Promise<{ content: string; metadata?: { pagesScraped: number; totalPages: number; fullVersion: boolean } }> {
  try {
    const firecrawl = getFirecrawl();
    const openai = getOpenAI();
    
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    
    // Start crawling
    onProgress?.({ status: 'crawling', message: `Crawling ${normalizedUrl}...` });
    
    // Map the website to get all URLs
    const mapResult = await firecrawl.mapUrl(normalizedUrl, {
      limit: fullVersion ? 100 : 10,
    });

    if (!mapResult.success || !mapResult.links || mapResult.links.length === 0) {
      throw new Error('No pages found to crawl');
    }

    onProgress?.({ 
      status: 'crawling', 
      message: `Found ${mapResult.links.length} pages to process...`,
      current: 0,
      total: mapResult.links.length
    });

    // Crawl each URL
    const crawledPages = [];
    for (let i = 0; i < mapResult.links.length; i++) {
      const link = mapResult.links[i];
      onProgress?.({ 
        status: 'crawling', 
        message: `Scraping ${link}...`,
        current: i + 1,
        total: mapResult.links.length
      });

      try {
        const scrapeResult = await firecrawl.scrapeUrl(link, {
          formats: ['markdown'],
        });
        
        if (scrapeResult.success && scrapeResult.markdown) {
          crawledPages.push({
            url: link,
            content: scrapeResult.markdown,
            metadata: scrapeResult.metadata
          });
        }
      } catch (error) {
        console.error(`Failed to scrape ${link}:`, error);
      }
    }

    if (crawledPages.length === 0) {
      throw new Error('Failed to crawl any pages');
    }

    // Process with AI
    onProgress?.({ status: 'enhancing', message: 'Enhancing content with AI...' });
    
    const enhancedContent = await enhanceWithOpenAI(crawledPages, fullVersion, openai);

    onProgress?.({ status: 'complete', message: 'Done!' });

    return {
      content: enhancedContent,
      metadata: {
        pagesScraped: crawledPages.length,
        totalPages: mapResult.links.length,
        fullVersion
      }
    };
  } catch (error) {
    onProgress?.({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'An error occurred' 
    });
    throw error;
  }
}

async function enhanceWithOpenAI(
  pages: Array<{ url: string; content: string; metadata?: Record<string, unknown> }>,
  fullVersion: boolean,
  openai: OpenAI
): Promise<string> {
  const systemPrompt = fullVersion 
    ? `You are creating a comprehensive llms-full.txt file. Include detailed information about the website's content, structure, API endpoints, documentation, and any relevant technical details. Format it clearly with sections and subsections.`
    : `You are creating a concise llms.txt file. Provide a clear, brief overview of the website's main purpose, key features, and most important information. Keep it succinct but informative.`;

  const contentToProcess = pages.map(p => `URL: ${p.url}\n\n${p.content}`).join('\n\n---\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Based on the following crawled content, create an ${fullVersion ? 'llms-full.txt' : 'llms.txt'} file:\n\n${contentToProcess}` 
      }
    ],
    temperature: 0.3,
    max_tokens: fullVersion ? 4000 : 2000,
  });

  return response.choices[0].message.content || 'Failed to generate content';
}

function normalizeUrl(url: string): string {
  // Remove whitespace
  url = url.trim();
  
  // Add protocol if missing
  if (!url.match(/^https?:\/\//)) {
    url = 'https://' + url;
  }
  
  // Fix common protocol errors
  url = url.replace(/^https?:\/([^\/])/, 'https://$1');
  
  // Special handling for GitHub URLs
  if (url.includes('github.com')) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return `https://github.com/${match[1]}/${match[2]}`;
    }
  }
  
  return url;
}