import { useState, useRef, useEffect } from "react";
import {
    Send, Loader2, ListMusic, User, ExternalLink, ListPlus, Check, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VideoResult {
    id: string;
    title: string;
    creator: string;
    youtube_id: string | null;
    thumbnail: string | null;
    watch_url: string | null;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    videos?: VideoResult[];
    timestamp: Date;
}

interface ChatInterfaceProps {
    authToken: string | null;
    onPlaylistCreated?: (playlistId: string) => void;
}

export function ChatInterface({ authToken, onPlaylistCreated }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [savedPlaylists, setSavedPlaylists] = useState<Set<string>>(new Set());
    const [savingPlaylist, setSavingPlaylist] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isGenerating) return;

        if (!authToken) {
            toast({
                title: "Sign in required",
                description: "Please sign in to generate playlists.",
                variant: "destructive",
            });
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        const prompt = input.trim();
        setInput("");
        setIsGenerating(true);

        try {
            const { data, error } = await supabase.functions.invoke("generate-playlist", {
                body: { prompt },
            });

            // Supabase functions.invoke returns data.error for non-2xx — check that first
            if (data?.error) throw new Error(data.error);
            if (error) throw error;

            const videos: VideoResult[] = (data?.songs || []).map((v: Record<string, unknown>) => ({
                id: v.id || `video-${Date.now()}-${Math.random()}`,
                title: v.title || "Unknown",
                creator: v.creator || "Unknown",
                youtube_id: v.youtube_id || null,
                thumbnail: v.thumbnail || null,
                watch_url: v.watch_url || null,
            }));

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: videos.length > 0
                    ? `Here are ${videos.length} videos I found. Preview any by clicking, then save them as a playlist.`
                    : "I couldn't find relevant videos for that query. Try rephrasing — for example, include the type of content (tutorial, music, review) or specific creators.",
                videos,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Generation error:", error);
            const rawMsg = error instanceof Error ? error.message : "Please try again.";
            // User-facing messages from our edge function are helpful — show them directly
            const isUserFacing = rawMsg.includes("designed to find") ||
                rawMsg.includes("can't help find") ||
                rawMsg.includes("daily limit") ||
                rawMsg.includes("Try a different prompt");
            const content = isUserFacing ? rawMsg : `Sorry, something went wrong. ${rawMsg}`;
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSavePlaylist = async (messageId: string, videos: VideoResult[]) => {
        if (savedPlaylists.has(messageId)) return;
        setSavingPlaylist(messageId);

        try {
            const msgIndex = messages.findIndex(m => m.id === messageId);
            const promptMsg = messages.slice(0, msgIndex).reverse().find(m => m.role === "user");
            const promptText = promptMsg?.content || "Untitled Playlist";

            const { data, error } = await supabase.functions.invoke("save-generated-playlist", {
                body: {
                    prompt: promptText,
                    source: "ai_generate",
                    videos,
                },
            });

            if (data?.error) throw new Error(data.error);
            if (error) throw error;

            setSavedPlaylists(prev => new Set(prev).add(messageId));

            toast({
                title: "Playlist saved!",
                description: `"${promptText}" — ${videos.length} videos saved to your library.`,
            });

            onPlaylistCreated?.(data.playlist_id);
        } catch (error) {
            console.error("Save error:", error);
            toast({
                title: "Save Failed",
                description: error instanceof Error ? error.message : "Could not save playlist.",
                variant: "destructive",
            });
        } finally {
            setSavingPlaylist(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const placeholders = [
        "Turn a YouTube rabbit hole about React Server Components into a 2-hour study path...",
        "Build a practical path for learning SQL analytics with projects and checkpoints...",
        "Audit what a beginner needs before watching advanced Kubernetes tutorials...",
        "Create a durable research path on AI agents beyond hype videos...",
        "Organize the best product design talks into a founder-friendly curriculum...",
        "Build an onboarding path for a junior data analyst using YouTube videos...",
    ];

    const randomPlaceholder = placeholders[Math.floor(Math.random() * placeholders.length)];

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col">
            {/* Messages */}
            <div className="flex-1 space-y-6 pb-4">
                {messages.length === 0 && (
                    <div className="text-center py-16 animate-fade-in">
                        <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-600/25">
                            <ListMusic className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            Turn YouTube into a <span className="text-red-500">path.</span>
                        </h2>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            YouTube can give you a feed. PromptPlay helps you import, audit,
                            structure, repair, and finish the playlists that matter.
                        </p>

                        {/* How it works */}
                        <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground mt-8">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">1</div>
                                <span>Import or describe a goal</span>
                            </div>
                            <div className="w-6 h-px bg-border" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">2</div>
                                <span>Audit gaps and quality</span>
                            </div>
                            <div className="w-6 h-px bg-border" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">3</div>
                                <span>Build a durable path</span>
                            </div>
                        </div>
                    </div>
                )}

                {messages.map(message => (
                    <div
                        key={message.id}
                        className={`flex gap-3 animate-fade-in ${message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        {message.role === "assistant" && (
                            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0 mt-1">
                                <ListMusic className="w-4 h-4 text-white" />
                            </div>
                        )}

                        <div className={`max-w-[85%] space-y-3 ${message.role === "user" ? "items-end" : "items-start"
                            }`}>
                            <div className={`rounded-2xl px-4 py-3 ${message.role === "user"
                                ? "bg-primary text-primary-foreground ml-auto"
                                : "glass"
                                }`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>

                            {/* Video Results */}
                            {message.videos && message.videos.length > 0 && (
                                <div className="w-full space-y-3">
                                    <div className="glass rounded-2xl overflow-hidden">
                                        <ul className="divide-y divide-border/50">
                                            {message.videos.map((video, idx) => (
                                                <li key={video.id} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                                                    <a
                                                        href={video.watch_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(video.title)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group flex items-center gap-3 p-3 hover:bg-secondary/50 transition-all duration-200"
                                                    >
                                                        {/* Thumbnail */}
                                                        <div className="relative w-28 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                                                            {video.thumbnail ? (
                                                                <img
                                                                    src={video.thumbnail}
                                                                    alt={video.title}
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Play className="w-6 h-6 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                                                                    <Play className="w-4 h-4 text-white fill-white" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                                                {video.title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                                {video.creator}
                                                            </p>
                                                        </div>

                                                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            {savedPlaylists.has(message.id)
                                                ? "✓ Saved — connect YouTube to export"
                                                : "Save to your library, then export to YouTube"}
                                        </p>
                                        <Button
                                            variant={savedPlaylists.has(message.id) ? "outline" : "glow"}
                                            size="sm"
                                            disabled={savedPlaylists.has(message.id) || savingPlaylist === message.id}
                                            onClick={() => handleSavePlaylist(message.id, message.videos!)}
                                            className="gap-1.5"
                                        >
                                            {savedPlaylists.has(message.id) ? (
                                                <><Check className="w-4 h-4" /> Saved</>
                                            ) : savingPlaylist === message.id ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                            ) : (
                                                <><ListPlus className="w-4 h-4" /> Save as Playlist</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {message.role === "user" && (
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                                <User className="w-4 h-4 text-foreground" />
                            </div>
                        )}
                    </div>
                ))}

                {isGenerating && (
                    <div className="flex gap-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
                            <ListMusic className="w-4 h-4 text-white" />
                        </div>
                        <div className="glass rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Searching YouTube for the best content...
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="sticky bottom-0 pt-4 pb-6">
                <form onSubmit={handleSubmit} className="relative group">
                    <div className="absolute -inset-1 gradient-primary rounded-2xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500" />
                    <div className="relative glass rounded-2xl p-2">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={randomPlaceholder}
                            className="min-h-[80px] max-h-[200px] text-base border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                            disabled={isGenerating}
                        />
                        <div className="flex justify-between items-center p-2">
                            <p className="text-xs text-muted-foreground">Shift+Enter for new line</p>
                            <Button
                                type="submit"
                                variant="glow"
                                size="sm"
                                disabled={!input.trim() || isGenerating}
                                className="min-w-[100px] gap-1.5"
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {isGenerating ? "Searching" : "Send"}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
