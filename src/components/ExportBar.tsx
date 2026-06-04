import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ImportPlaylistDialog } from "@/components/ImportPlaylistDialog";

interface ExportBarProps {
  authToken: string | null;
  providerToken: string | null;
  onImportComplete: (result: Record<string, unknown>) => void;
}

export function ExportBar({
  authToken,
  providerToken,
  onImportComplete,
}: ExportBarProps) {
  if (!authToken || !providerToken) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                YouTube connected for import, export, and sync
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ImportPlaylistDialog
                youtubeAccessToken={providerToken}
                authToken={authToken}
                onImportComplete={onImportComplete}
              >
                <Button variant="outline" className="gap-2" size="sm">
                  <Download className="w-4 h-4" />
                  Import
                </Button>
              </ImportPlaylistDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
