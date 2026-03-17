import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Search, X, FileText, Image, Film, Archive, FileSpreadsheet, Presentation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import AppSidebar from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';

type FileRecord = {
  id: string;
  user_id: string | null;
  name: string;
  size_bytes: number | null;
  mime_type: string | null;
  storage_path: string | null;
  source: string | null;
  onedrive_url: string | null;
  shared_with: string[] | null;
  task_id: string | null;
  created_at: string | null;
};

type Category = 'todos' | 'uploads' | 'partilhados' | 'tarefas';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null, name: string): { icon: React.ReactNode; color: string } {
  const mt = mimeType ?? '';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';

  if (mt.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext))
    return { icon: <Image size={28} />, color: '#a78bfa' };
  if (mt.startsWith('video/') || ['mp4', 'mov', 'avi'].includes(ext))
    return { icon: <Film size={28} />, color: '#f472b6' };
  if (mt === 'application/pdf' || ext === 'pdf')
    return { icon: <FileText size={28} />, color: '#ef4444' };
  if (mt.includes('spreadsheet') || mt.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext))
    return { icon: <FileSpreadsheet size={28} />, color: '#22c55e' };
  if (mt.includes('presentation') || mt.includes('powerpoint') || ['pptx', 'ppt'].includes(ext))
    return { icon: <Presentation size={28} />, color: '#f59e0b' };
  if (mt.includes('word') || mt.includes('document') || ['docx', 'doc'].includes(ext))
    return { icon: <FileText size={28} />, color: '#60a5fa' };
  if (['zip', 'rar', 'tar', 'gz'].includes(ext))
    return { icon: <Archive size={28} />, color: '#94a3b8' };
  return { icon: <FileText size={28} />, color: '#94a3b8' };
}

const AVATAR_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#a78bfa', '#f59e0b'];
function emailToColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

function useFiles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FileRecord[];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Sem sessão');
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase as any).from('files').insert({
        user_id: user.id,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
        storage_path: path,
        source: 'upload',
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Ficheiro carregado com sucesso');
    },
    onError: (e: Error) => toast.error(`Erro ao carregar: ${e.message}`),
  });

  const deleteFile = useMutation({
    mutationFn: async (file: FileRecord) => {
      if (file.storage_path) {
        await supabase.storage.from('files').remove([file.storage_path]);
      }
      const { error } = await (supabase as any).from('files').delete().eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Ficheiro eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getPublicUrl = async (storagePath: string) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
    return data?.signedUrl ?? null;
  };

  return { files: query.data ?? [], isLoading: query.isLoading, uploadFile, deleteFile, getPublicUrl };
}

export default function FicheirosPage() {
  const { user } = useAuth();
  const { files, isLoading, uploadFile, deleteFile, getPublicUrl } = useFiles();
  const [category, setCategory] = useState<Category>('todos');
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { key: Category; label: string; icon: string }[] = [
    { key: 'todos', label: 'Todos os ficheiros', icon: '📁' },
    { key: 'uploads', label: 'Os meus uploads', icon: '⬆️' },
    { key: 'partilhados', label: 'Partilhados comigo', icon: '🔗' },
    { key: 'tarefas', label: 'Anexados a tarefas', icon: '📎' },
  ];

  const filteredFiles = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (category === 'uploads') return f.user_id === user?.id;
    if (category === 'partilhados') return f.shared_with?.includes(user?.email ?? '') && f.user_id !== user?.id;
    if (category === 'tarefas') return !!f.task_id;
    return true;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    for (let i = 0; i < files.length; i++) {
      await uploadFile.mutateAsync(files[i]);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    for (let i = 0; i < droppedFiles.length; i++) {
      await uploadFile.mutateAsync(droppedFiles[i]);
      setUploadProgress(Math.round(((i + 1) / droppedFiles.length) * 100));
    }
    setUploading(false);
    setUploadProgress(0);
  }, [uploadFile]);

  const handleOpenFile = async (file: FileRecord) => {
    if (file.onedrive_url) {
      window.open(file.onedrive_url, '_blank');
      return;
    }
    if (file.storage_path) {
      const url = await getPublicUrl(file.storage_path);
      if (url) window.open(url, '_blank');
    }
  };

  const handleCopyLink = async (file: FileRecord) => {
    if (!file.storage_path) return;
    const url = await getPublicUrl(file.storage_path);
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      <AppSidebar />
      <MobileNav />

      <div className="md:ml-[240px]">
        {/* Top bar */}
        <div
          className="flex items-center justify-between"
          style={{
            height: 60,
            padding: '0 28px',
            background: '#080808',
            borderBottom: '1px solid var(--glass-divider)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📁</span>
            <h2 className="text-white" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Ficheiros
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar ficheiros..."
                className="outline-none"
                style={{
                  width: 200,
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: 13,
                  color: 'white',
                }}
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                background: 'white',
                color: 'black',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              <Upload size={14} />
              Carregar ficheiro
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="flex h-[calc(100vh-60px)]">
          {/* Left panel — categories */}
          <div
            className="hidden md:flex flex-col w-[200px] flex-shrink-0"
            style={{ borderRight: '1px solid var(--glass-divider)', padding: '20px 12px' }}
          >
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className="w-full flex items-center gap-2.5 rounded-[10px] transition-all duration-150"
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: category === cat.key ? 600 : 500,
                  color: category === cat.key ? 'white' : 'rgba(255,255,255,0.5)',
                  background: category === cat.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                  marginBottom: 2,
                  textAlign: 'left',
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
            {/* Upload drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer transition-all duration-200 mb-6"
              style={{
                border: `2px dashed ${isDragging ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 16,
                padding: '28px 24px',
                textAlign: 'center',
                background: isDragging ? 'rgba(255,255,255,0.03)' : 'transparent',
              }}
            >
              <Upload size={24} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 8px' }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                Arrasta ficheiros aqui ou <span style={{ color: 'white', fontWeight: 600 }}>clica para selecionar</span>
              </p>
              {uploading && (
                <div className="mt-3 max-w-xs mx-auto">
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'white', borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6 }}>A carregar... {uploadProgress}%</p>
                </div>
              )}
            </div>

            {/* File grid */}
            {isLoading ? (
              <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>A carregar...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-4xl block mb-3">📭</span>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Nenhum ficheiro encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredFiles.map((file, i) => {
                  const { icon, color } = getFileIcon(file.mime_type, file.name);
                  const isSelected = selectedFile?.id === file.id;
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedFile(isSelected ? null : file)}
                      className="group cursor-pointer relative transition-all duration-200"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : 'var(--glass-border)'}`,
                        borderRadius: 14,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)'; }}
                    >
                      {/* File type icon */}
                      <div style={{ color, marginBottom: 4 }}>{icon}</div>
                      {/* File name */}
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'white',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      {/* Meta */}
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {formatFileSize(file.size_bytes)}
                        {file.created_at && ` · ${format(parseISO(file.created_at), 'dd/MM/yy', { locale: pt })}`}
                      </p>
                      {/* Hover actions */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5"
                        style={{
                          background: 'rgba(0,0,0,0.7)',
                          borderRadius: 14,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleOpenFile(file)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            background: 'white',
                            color: 'black',
                            fontSize: 12,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Abrir
                        </button>
                        <button
                          onClick={() => handleCopyLink(file)}
                          style={{
                            padding: '5px 14px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 600,
                            border: '1px solid rgba(255,255,255,0.15)',
                            cursor: 'pointer',
                          }}
                        >
                          Copiar link
                        </button>
                        <button
                          onClick={() => deleteFile.mutate(file)}
                          style={{
                            padding: '5px 14px',
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.15)',
                            color: '#ef4444',
                            fontSize: 12,
                            fontWeight: 600,
                            border: '1px solid rgba(239,68,68,0.2)',
                            cursor: 'pointer',
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview panel */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="hidden lg:flex flex-col"
                style={{
                  width: 320,
                  flexShrink: 0,
                  borderLeft: '1px solid var(--glass-divider)',
                  padding: 24,
                  overflowY: 'auto',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Detalhes</h3>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* File icon + name */}
                <div className="text-center mb-4">
                  <div
                    style={{ color: getFileIcon(selectedFile.mime_type, selectedFile.name).color, display: 'flex', justifyContent: 'center', marginBottom: 8 }}
                  >
                    {(() => {
                      const Icon = getFileIcon(selectedFile.mime_type, selectedFile.name).icon;
                      return <div style={{ transform: 'scale(2)', margin: '16px 0' }}>{Icon}</div>;
                    })()}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginTop: 16, wordBreak: 'break-all' }}>
                    {selectedFile.name}
                  </p>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Tamanho', value: formatFileSize(selectedFile.size_bytes) },
                    { label: 'Tipo', value: selectedFile.mime_type ?? '—' },
                    { label: 'Fonte', value: selectedFile.source === 'onedrive' ? 'OneDrive' : 'Upload' },
                    { label: 'Data', value: selectedFile.created_at ? format(parseISO(selectedFile.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', maxWidth: 180, wordBreak: 'break-all' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Shared with */}
                {selectedFile.shared_with && selectedFile.shared_with.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                      Partilhado com
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFile.shared_with.map(email => (
                        <div
                          key={email}
                          className="flex items-center gap-1.5"
                          style={{
                            padding: '3px 8px',
                            borderRadius: 99,
                            background: `${emailToColor(email)}22`,
                            border: `1px solid ${emailToColor(email)}44`,
                            fontSize: 11,
                            color: emailToColor(email),
                          }}
                        >
                          {email.split('@')[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenFile(selectedFile)}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      background: 'white',
                      color: 'black',
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Abrir ficheiro
                  </button>
                  <button
                    onClick={() => handleCopyLink(selectedFile)}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    Copiar link
                  </button>
                  <button
                    onClick={() => { deleteFile.mutate(selectedFile); setSelectedFile(null); }}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      background: 'rgba(239,68,68,0.1)',
                      color: '#ef4444',
                      fontSize: 13,
                      fontWeight: 600,
                      border: '1px solid rgba(239,68,68,0.15)',
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
