import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Image as ImageIcon, X, Play, Download, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MediaFile {
  id?: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  url: string;
}

interface MediaUploadProps {
  serviceId?: string;
  onFilesChange: (files: MediaFile[]) => void;
  existingFiles?: MediaFile[];
}

export function MediaUpload({ serviceId, onFilesChange, existingFiles = [] }: MediaUploadProps) {
  const [files, setFiles] = useState<MediaFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadToStorage = async (file: File): Promise<MediaFile | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = serviceId ? `${serviceId}/${fileName}` : `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('technical-support')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('technical-support')
        .getPublicUrl(filePath);

      return {
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        url: publicUrl
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    }
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    const newFiles: MediaFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Validar tamanho (50MB)
      if (file.size > 52428800) {
        toast.error(`${file.name} é muito grande. Máximo 50MB.`);
        continue;
      }

      // Validar tipo
      if (!file.type.match(/^(image|video)\//)) {
        toast.error(`${file.name} não é uma imagem ou vídeo válido.`);
        continue;
      }

      const uploadedFile = await uploadToStorage(file);
      if (uploadedFile) {
        newFiles.push(uploadedFile);
      }
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    setUploading(false);

    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} arquivo(s) enviado(s) com sucesso!`);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = files[index];
    
    try {
      // Remover do storage
      const { error } = await supabase.storage
        .from('technical-support')
        .remove([fileToRemove.file_path]);

      if (error) throw error;

      // Remover do banco se tiver ID
      if (fileToRemove.id) {
        const { error: dbError } = await supabase
          .from('service_files')
          .delete()
          .eq('id', fileToRemove.id);

        if (dbError) throw dbError;
      }

      const updatedFiles = files.filter((_, i) => i !== index);
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
      toast.success('Arquivo removido');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Erro ao remover arquivo');
    }
  };

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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCameraCapture}
          disabled={uploading}
        >
          <Camera className="h-4 w-4 mr-2" />
          Câmera
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleGallerySelect}
          disabled={uploading}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Galeria
        </Button>
        {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
      </div>

      {/* Input escondido para câmera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Input escondido para galeria */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Grid de arquivos */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={index} className="relative group rounded-lg overflow-hidden border">
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
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
