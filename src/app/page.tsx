"use client";

import { useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface CrawlProgress {
  status: 'crawling' | 'processing' | 'enhancing' | 'complete' | 'error';
  message: string;
  current?: number;
  total?: number;
}

// Helper to normalize URL
function normalizeUrl(input: string): string {
  if (!input) return "";
  // If it already starts with http:// or https://, return as is
  if (/^https?:\/\//i.test(input)) return input;
  // Otherwise, prepend https://
  return `https://${input}`;
}

// Steps for agent process
const steps = [
  "Looking for sitemap.xml",
  "Generating sitemap.xml (if not found)",
  "Generating documentation",
  "Generating llms.txt",
  "Generating llms-full.txt",
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [progress, setProgress] = useState<CrawlProgress | null>(null);
  const [crawlResult, setCrawlResult] = useState<{ content: string; metadata?: { pagesScraped: number; totalPages: number; fullVersion: boolean } } | null>(null);

  const handleGenerate = async () => {
    if (!url) return;
    setLoading(true);
    setOutput("");
    setCurrentStep(null);
    setProgress(null);
    setCrawlResult(null);
    
    const normalized = normalizeUrl(url);
    
    try {
      // Try our enhanced API first
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized, fullVersion: showFull }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (value) {
            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                
                if (data.status === 'complete' && data.result) {
                  setCrawlResult(data.result);
                  setOutput(data.result.content);
                  setProgress(null);
                  toast.success('Successfully generated ' + (showFull ? 'llms-full.txt' : 'llms.txt'));
                } else if (data.status === 'error') {
                  throw new Error(data.error || 'Unknown error');
                } else {
                  // Update progress
                  setProgress(data as CrawlProgress);
                }
              } catch (e) {
                console.error('Failed to parse:', line, e);
              }
            }
          }
        }
      } else {
        // Fallback to original API
        throw new Error('Using fallback API');
      }
    } catch {
      // Fallback to original Hugging Face API
      try {
        // Simulate step-by-step agent process
        for (let i = 0; i < steps.length; i++) {
          setCurrentStep(i);
          await new Promise((res) => setTimeout(res, i === 2 ? 1200 : 600));
        }
        
        const postRes = await fetch("https://stevenbucaille-dot-txt.hf.space/gradio_api/call/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: [normalized] }),
        });
        const postData = await postRes.json();
        const eventId = postData.event_id || (typeof postData === "object" && Object.values(postData).find(v => typeof v === "string"));
        if (!eventId) throw new Error("No event ID returned from API");
        
        const getRes = await fetch(`https://stevenbucaille-dot-txt.hf.space/gradio_api/call/predict/${eventId}`);
        const contentType = getRes.headers.get("content-type") || "";
        if (contentType.includes("text/event-stream")) {
          const reader = getRes.body?.getReader();
          let result = "";
          if (reader) {
            const decoder = new TextDecoder();
            let done = false;
            while (!done) {
              const { value, done: doneReading } = await reader.read();
              if (value) {
                result += decoder.decode(value, { stream: !doneReading });
              }
              done = doneReading;
            }
            const lines = result.split('\n');
            const dataLines = lines
              .filter(line => line.startsWith('data: '))
              .map(line => line.replace('data: ', '').trim())
              .filter(line => line && line !== 'null');

            let outputText = dataLines.join('\n');

            try {
              const parsed = JSON.parse(outputText);
              if (Array.isArray(parsed)) {
                outputText = parsed.join('\n');
              } else if (typeof parsed === 'string') {
                outputText = parsed;
              }
            } catch {
              // Not JSON, leave as is
            }

            setOutput(outputText || result);
          } else {
            setOutput("Error: Could not read event stream.");
          }
        } else {
          const getData = await getRes.json().catch(() => getRes.text());
          setOutput(typeof getData === "string" ? getData : JSON.stringify(getData));
        }
      } catch (fallbackErr) {
        const message = fallbackErr instanceof Error ? fallbackErr.message : 'Failed to generate';
        setOutput('Error: ' + message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setCurrentStep(null);
    }
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      toast.success('Copied to clipboard!');
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-white text-black px-4">
      <Card className="w-full max-w-xl p-8 shadow-lg border-black/10 bg-white flex flex-col items-center gap-6">
        <header className="w-full text-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
            dot txt
          </h1>
          <p className="text-base sm:text-lg text-black/70 font-medium">
            Generate AI-readable documentation files (llms.txt / llms-full.txt) for any website.
          </p>
        </header>
        <form
          className="w-full flex flex-col sm:flex-row gap-3 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
        >
          <Input
            type="text"
            placeholder="Enter website URL (e.g. https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 min-w-0 border-black/20 bg-white text-black placeholder:text-black/40"
            required
            autoFocus
          />
          <Button
            type="submit"
            className="bg-black text-white hover:bg-black/80 font-semibold px-6 py-2"
            disabled={loading || !url}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-black border-black/20" />
                Generating...
              </span>
            ) : (
              "Generate"
            )}
          </Button>
        </form>
        {/* Progress indicator */}
        {loading && progress && (
          <div className="w-full bg-black/5 rounded-lg p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">
                {progress.status === 'crawling' && '🔍 Crawling website...'}
                {progress.status === 'processing' && '📄 Processing content...'}
                {progress.status === 'enhancing' && '✨ Enhancing with AI...'}
                {progress.status === 'complete' && '✅ Complete!'}
                {progress.status === 'error' && '❌ Error occurred'}
              </span>
              {progress.current && progress.total && (
                <span className="text-xs text-black/60">
                  {progress.current} / {progress.total}
                </span>
              )}
            </div>
            <p className="text-sm text-black/70 font-mono">{progress.message}</p>
            {progress.current && progress.total && (
              <div className="w-full bg-black/10 rounded-full h-2 mt-2">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
        {/* Fallback step indicator for HuggingFace API */}
        {loading && currentStep !== null && !progress && (
          <ol className="w-full flex flex-col gap-1 mb-2">
            {steps.map((step, idx) => (
              <li
                key={step}
                className={`flex items-center gap-2 text-sm font-mono transition-colors duration-200 ${
                  idx < currentStep
                    ? "text-black/30"
                    : idx === currentStep
                    ? "text-black font-bold"
                    : "text-black/10"
                }`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full border border-black/20 ${
                    idx === currentStep
                      ? "bg-black animate-pulse"
                      : idx < currentStep
                      ? "bg-black/20"
                      : "bg-black/5"
                  }`}
                />
                {step}
              </li>
            ))}
          </ol>
        )}
        <div className="w-full flex items-center justify-end gap-2 mt-2">
          <span className="text-sm font-mono text-black/60">llms.txt</span>
          <Switch checked={showFull} onCheckedChange={() => setShowFull(!showFull)} />
          <span className="text-sm font-mono text-black/60">llms-full.txt</span>
        </div>
        <div className="w-full relative">
          <textarea
            className="w-full min-h-[180px] max-h-96 p-3 border border-black/10 rounded bg-black/5 text-black font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-black/20"
            value={output}
            readOnly
            placeholder={
              loading
                ? "Generating..."
                : showFull
                ? "llms-full.txt output will appear here."
                : "llms.txt output will appear here."
            }
          />
          {output && (
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 h-8 px-2"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          )}
        </div>
        {crawlResult?.metadata && (
          <div className="w-full text-xs text-black/50 font-mono">
            Crawled {crawlResult.metadata.pagesScraped} of {crawlResult.metadata.totalPages} pages
          </div>
        )}
      </Card>
    </main>
  );
}