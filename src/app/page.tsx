"use client";

import { useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";

const mockLlmsTxt = `# llms.txt\nThis is a mock llms.txt file for https://example.com\n- Title: Example\n- Description: Example site for LLMs.`;
const mockLlmsFullTxt = `# llms-full.txt\nThis is a mock llms-full.txt file for https://example.com\n- Title: Example (Full)\n- Description: Example site for LLMs (Full).\n- Content: ...more details...`;

// Placeholder functions for future backend integration
function generateLlmsTxt(url: string): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve(mockLlmsTxt), 1200));
}
function generateLlmsFullTxt(url: string): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve(mockLlmsFullTxt), 1200));
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

  const handleGenerate = async () => {
    setLoading(true);
    setOutput("");
    setCurrentStep(0);
    const normalized = normalizeUrl(url);
    // Simulate step-by-step agent process
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      // Simulate longer time for documentation and llms.txt steps
      await new Promise((res) => setTimeout(res, i === 2 ? 1200 : 600));
    }
    if (showFull) {
      setOutput(await generateLlmsFullTxt(normalized));
    } else {
      setOutput(await generateLlmsTxt(normalized));
    }
    setLoading(false);
    setCurrentStep(null);
  };

  const handleToggle = async () => {
    setShowFull((prev) => !prev);
    setLoading(true);
    setOutput("");
    const normalized = normalizeUrl(url);
    if (!showFull) {
      setOutput(await generateLlmsFullTxt(normalized));
    } else {
      setOutput(await generateLlmsTxt(normalized));
    }
    setLoading(false);
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
        {/* Step indicator */}
        {loading && currentStep !== null && (
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
          <Switch checked={showFull} onCheckedChange={handleToggle} />
          <span className="text-sm font-mono text-black/60">llms-full.txt</span>
        </div>
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
      </Card>
    </main>
  );
}
