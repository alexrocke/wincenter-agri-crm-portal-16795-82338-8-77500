import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, Play } from 'lucide-react';
import { toast } from 'sonner';

interface MediaFile {
  id?: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  url: string;
}

interface MediaViewerProps {
  files: MediaFile[];
}

export function MediaViewer({ files }: MediaViewerProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);

  const handleDownload = async (file: MediaFile) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download iniciado');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erro ao fazer download');
    }
  };

  const isVideo = (fileType: string) => fileType.startsWith('video/');

  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {files.map((file, index) => (
          <div key={index} className="relative group rounded-lg overflow-hidden border bg-muted">
            {isVideo(file.file_type) ? (
              <div className="relative aspect-square bg-muted flex items-center justify-center">
                <video
                  src={file.url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-8 w-8 text-white" />
                </div>
              </div>
            ) : (
              <img
                src={file.url}
                alt={file.file_name}
                className="w-full aspect-square object-cover"
              />
            )}
            
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={() => setSelectedMedia(file)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={() => handleDownload(file)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog para visualização ampliada */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl">
          {selectedMedia && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedMedia.file_name}</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(selectedMedia)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              
              {isVideo(selectedMedia.file_type) ? (
                <video
                  src={selectedMedia.url}
                  controls
                  className="w-full rounded-lg"
                />
              ) : (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.file_name}
                  className="w-full rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
