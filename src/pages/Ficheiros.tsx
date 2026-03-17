import { useState, useRef, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AppSidebar from '@/components/AppSidebar';

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    size: number;
    mimetype: string;
    cacheControl?: string;
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getFileEmoji(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return '🖼️';
  if (['mp4','mov','avi','mkv'].includes(ext)) return '🎬';
  if (ext === 'pdf') return '📄';
  if (['xlsx','xls','csv'].includes(ext)) return '📊';
  if (['pptx','ppt'].includes(ext)) return '📋';
  if (['docx','doc'].includes(ext)) return '📝';
  if (['zip','rar','tar','gz'].includes(ext)) return '🗜️';
  return '📁';
}

function getDisplayName(rawName: string): string {
  // Strip the user ID prefix and timestamp added during upload: `{uid}/{timestamp}_{original}`
  const parts = rawName.split('/');
  const filename = parts[parts.length - 1];
  // Remove leading `{timestamp}_` prefix
  return filename.replace(/^\d+_/, '');
}

export default function Ficheiros() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery<StorageFile[]>({
    queryKey: ['storage-files'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('files').list('', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      return (data ?? []) as StorageFile[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const uid = user?.id;
      if (!uid) throw new Error('Sem sessão');
      const path = `${uid}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('files').upload(path, file, { upsert: false });
      if (error) throw error;
      return path;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-files'] });
    },
    onError: (e: Error) => toast.error(`Erro ao carregar: ${e.message}`),
  });

  const handleFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const f of arr) {
      try {
        await uploadMutation.mutateAsync(f);
        ok++;
      } catch {
        // error handled in mutation
      }
    }
    setUploading(false);
    if (ok > 0) toast.success(`${ok} ficheiro${ok > 1 ? 's' : ''} carregado${ok > 1 ? 's' : ''} com sucesso`);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [user]);

  const handleDownload = async (file: StorageFile) => {
    const { data, error } = await supabase.storage.from('files').createSignedUrl(file.name, 60 * 60);
    if (error || !data) { toast.error('Erro ao gerar link de download'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (file: StorageFile) => {
    const { error } = await supabase.storage.from('files').remove([file.name]);
    if (error) { toast.error('Erro ao eliminar ficheiro'); return; }
    queryClient.invalidateQueries({ queryKey: ['storage-files'] });
    toast.success('Ficheiro eliminado');
  };

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex" style={{ background: '#080808' }}>
      <AppSidebar />
      <main className="md:ml-[220px] flex flex-col flex-1 min-h-screen">
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>📁 Ficheiros</h2>
            <p style={{ color: '#555', fontSize: 12, marginTop: 2 }}>Carrega e partilha ficheiros com a equipa</p>
          </div>
          <span style={{ color: '#555', fontSize: 12 }}>{files.length} ficheiro{files.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 16,
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>☁️</div>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {uploading ? 'A carregar...' : 'Arrasta ficheiros aqui ou clica para selecionar'}
            </p>
            <p style={{ color: '#555', fontSize: 12 }}>Todos os tipos de ficheiro aceites</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 14 }}>A carregar ficheiros...</div>
          ) : files.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              Sem ficheiros ainda. Carrega o primeiro!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map(file => (
                <div
                  key={file.id ?? file.name}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{getFileEmoji(file.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getDisplayName(file.name)}
                    </p>
                    <p style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
                      {file.metadata?.size ? formatSize(file.metadata.size) : '—'}
                      {file.created_at ? ` · ${formatDate(file.created_at)}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => handleDownload(file)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
                    >
                      ⬇ Descarregar
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '6px 10px', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
