import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  const placeholders = [
    "Calm ambient music from Zelda and Mario...",
    "Upbeat 80s synthwave for working out...",
    "Lo-fi hip hop beats for studying...",
    "Epic orchestral video game soundtracks...",
  ];

  const randomPlaceholder = placeholders[Math.floor(Math.random() * placeholders.length)];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative group">
        {/* Glow effect behind textarea */}
        <div className="absolute -inset-1 gradient-primary rounded-2xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500" />
        
        <div className="relative glass rounded-2xl p-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={randomPlaceholder}
            className="min-h-[120px] text-lg border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isLoading}
          />
          
          <div className="flex justify-end p-2">
            <Button
              type="submit"
              variant="glow"
              size="lg"
              disabled={!prompt.trim() || isLoading}
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  <Sparkles />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <p className="text-center text-muted-foreground text-sm mt-4">
        Describe the vibe, genre, games, or mood you're looking for
      </p>
    </form>
  );
}
