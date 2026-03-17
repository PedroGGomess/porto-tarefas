import { useState, useRef, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AppSidebar from '@/components/AppSidebar';
import { AnimatePresence, motion } from 'framer-motion';
import { useMsal } from '@azure/msal-react';
import { isMsConfigured, loginRequest } from '@/lib/msalConfig';

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserFile {
  id: string;
  user_id: string;
  name: string;
  size_bytes: number | null;
  mime_type: string | null;
  storage_path: string | null;
  category: string;
  source: string;
  onedrive_id: string | null;
  onedrive_url: string | null;
  shared_with: string[] | null;
  task_id: string | null;
  conversation_id: string | null;
  created_at: string;
}

interface TaskSnippet {
  id: string;
  title: string;
  area: string;
}

interface OneDriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  lastModifiedDateTime: string;
  file?: { mimeType: string };
  folder?: object;
}

type Category = 'Todos' | 'Documentos' | 'Imagens' | 'Folhas de cálculo' | 'Apresentações' | 'Outros' | 'OneDrive' | 'Partilhados' | 'Tarefas';
type ViewMode = 'grid' | 'lista';

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function detectCategory(mimeType: string | null, name: string): string {
  if (!mimeType && !name) return 'Outros';
  const mt = mimeType ?? '';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mt.startsWith('image/')) return 'Imagens';
  if (mt === 'application/pdf' || ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'Documentos';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mt.includes('spreadsheet') || mt.includes('excel')) return 'Folhas de cálculo';
  if (['ppt', 'pptx', 'odp'].includes(ext) || mt.includes('presentation') || mt.includes('powerpoint')) return 'Apresentações';
  return 'Outros';
}

function getFileIcon(mimeType: string | null, name: string, size = 40): React.ReactNode {
  const mt = mimeType ?? '';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mt.startsWith('image/')) return <span style={{ fontSize: size, lineHeight: 1 }}>🖼️</span>;
  if (ext === 'pdf' || mt === 'application/pdf') return <span style={{ fontSize: size, color: '#ef4444', lineHeight: 1 }}>📄</span>;
  if (['doc', 'docx'].includes(ext) || mt.includes('word')) return <span style={{ fontSize: size, color: '#3b82f6', lineHeight: 1 }}>📝</span>;
  if (['xls', 'xlsx', 'csv'].includes(ext) || mt.includes('excel') || mt.includes('spreadsheet')) return <span style={{ fontSize: size, color: '#22c55e', lineHeight: 1 }}>📊</span>;
  if (['ppt', 'pptx'].includes(ext) || mt.includes('powerpoint') || mt.includes('presentation')) return <span style={{ fontSize: size, color: '#f97316', lineHeight: 1 }}>📽️</span>;
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return <span style={{ fontSize: size, lineHeight: 1 }}>🗜️</span>;
  return <span style={{ fontSize: size, color: '#6b7280', lineHeight: 1 }}>📁</span>;
}

const CATEGORY_ITEMS: { key: Category; label: string; icon: string }[] = [
  { key: 'Todos', label: 'Todos os ficheiros', icon: '📁' },
  { key: 'Documentos', label: 'Documentos', icon: '📄' },
  { key: 'Imagens', label: 'Imagens', icon: '🖼️' },
  { key: 'Folhas de cálculo', label: 'Folhas de cálculo', icon: '📊' },
  { key: 'Apresentações', label: 'Apresentações', icon: '📊' },
  { key: 'Outros', label: 'Outros', icon: '📦' },
];

const EXTRA_CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'OneDrive', label: 'OneDrive', icon: '☁️' },
  { key: 'Partilhados', label: 'Partilhados comigo', icon: '🔗' },
  { key: 'Tarefas', label: 'Anexados a tarefas', icon: '📎' },
];

// ── Thumbnail component ────────────────────────────────────────────────────────
function FileThumbnail({ file, size = 40 }: { file: UserFile; size?: number }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file.mime_type?.startsWith('image/') || !file.storage_path) return;
    (supabase as any).storage.from('user-files').createSignedUrl(file.storage_path, 3600).then(({ data }: any) => {
      if (data?.signedUrl) setImgUrl(data.signedUrl);
    });
  }, [file]);
  if (imgUrl) return <img src={imgUrl} alt={file.name} style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8 }} />;
  return <>{getFileIcon(file.mime_type, file.name, size)}</>;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Ficheiros() {
  const { user, loading } = useAuth();
  const { instance, accounts } = useMsal();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category>('Todos');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<UserFile | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<UserFile | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [attachSearch, setAttachSearch] = useState('');
  const [tasks, setTasks] = useState<TaskSnippet[]>([]);
  const [odAccessToken, setOdAccessToken] = useState<string | null>(null);
  const [odFiles, setOdFiles] = useState<OneDriveItem[]>([]);
  const [odLoading, setOdLoading] = useState(false);
  const [importingOd, setImportingOd] = useState<string | null>(null);

  // Load tasks
  useEffect(() => {
    if (!user) return;
    (supabase as any).from('tasks').select('id, title, area').order('created_at', { ascending: false }).limit(100)
      .then(({ data }: { data: TaskSnippet[] | null }) => { if (data) setTasks(data); });
  }, [user]);

  // Try restore OneDrive token
  useEffect(() => {
    if (!isMsConfigured || accounts.length === 0) return;
    instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] })
      .then(res => setOdAccessToken(res.accessToken))
      .catch(() => {});
  }, [instance, accounts]);

  // Load OneDrive files
  useEffect(() => {
    if (!odAccessToken || category !== 'OneDrive') return;
    setOdLoading(true);
    fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
      headers: { Authorization: `Bearer ${odAccessToken}` },
    }).then(r => r.json()).then(data => {
      setOdFiles((data.value ?? []).filter((f: OneDriveItem) => f.file));
    }).catch(() => toast.error('Erro ao carregar OneDrive')).finally(() => setOdLoading(false));
  }, [odAccessToken, category]);

  // Load files from DB
  const { data: files = [], isLoading } = useQuery<UserFile[]>({
    queryKey: ['user-files', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_files')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserFile[];
    },
  });

  // Category counts
  const counts: Record<string, number> = {
    'Todos': files.length,
    'Documentos': files.filter(f => f.category === 'Documentos').length,
    'Imagens': files.filter(f => f.category === 'Imagens').length,
    'Folhas de cálculo': files.filter(f => f.category === 'Folhas de cálculo').length,
    'Apresentações': files.filter(f => f.category === 'Apresentações').length,
    'Outros': files.filter(f => f.category === 'Outros').length,
    'Partilhados': files.filter(f => f.shared_with && f.shared_with.length > 0).length,
    'Tarefas': files.filter(f => f.task_id).length,
    'OneDrive': odFiles.length,
  };

  // Filter files
  const filteredFiles = files.filter(f => {
    const matchesCat = category === 'Todos' ? true
      : category === 'Partilhados' ? (f.shared_with && f.shared_with.length > 0)
      : category === 'Tarefas' ? !!f.task_id
      : f.category === category;
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ── Upload ──────────────────────────────────────────────────────────────
  const uploadFiles = async (fileList: File[]) => {
    if (!user || fileList.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setUploadProgress(Math.round((i / fileList.length) * 100));
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await (supabase as any).storage.from('user-files').upload(path, file, { upsert: false });
      if (uploadErr) { toast.error(`Erro: ${file.name}`); continue; }
      const cat = detectCategory(file.type, file.name);
      const { error: dbErr } = await (supabase as any).from('user_files').insert({
        user_id: user.id,
        name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
        storage_path: path,
        category: cat,
        source: 'upload',
      });
      if (dbErr) { toast.error(`Erro ao guardar metadados: ${file.name}`); continue; }
      ok++;
    }
    setUploading(false);
    setUploadProgress(0);
    if (ok > 0) {
      toast.success(`${ok} ficheiro${ok > 1 ? 's' : ''} carregado${ok > 1 ? 's' : ''} com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['user-files'] });
    }
  };

  const handleFiles = (fileList: FileList | File[]) => uploadFiles(Array.from(fileList));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [user]);

  // ── Download ────────────────────────────────────────────────────────────
  const handleDownload = async (file: UserFile) => {
    if (!file.storage_path) return;
    const { data } = await (supabase as any).storage.from('user-files').createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Erro ao gerar link de download');
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (file: UserFile) => {
    if (!confirm(`Eliminar "${file.name}"?`)) return;
    if (file.storage_path) {
      await (supabase as any).storage.from('user-files').remove([file.storage_path]);
    }
    await (supabase as any).from('user_files').delete().eq('id', file.id);
    queryClient.invalidateQueries({ queryKey: ['user-files'] });
    if (selectedFile?.id === file.id) setSelectedFile(null);
    toast.success('Ficheiro eliminado');
  };

  // ── Share ───────────────────────────────────────────────────────────────
  const handleAddShare = async () => {
    if (!shareTarget || !shareEmail.includes('@')) { toast.error('Email inválido'); return; }
    const current = shareTarget.shared_with ?? [];
    if (current.includes(shareEmail)) { toast.error('Já partilhado'); return; }
    await (supabase as any).from('user_files').update({ shared_with: [...current, shareEmail] }).eq('id', shareTarget.id);
    queryClient.invalidateQueries({ queryKey: ['user-files'] });
    setShareEmail('');
    toast.success('Ficheiro partilhado');
  };

  const handleCopyLink = async (file: UserFile) => {
    if (!file.storage_path) return;
    const { data } = await (supabase as any).storage.from('user-files').createSignedUrl(file.storage_path, 7 * 24 * 3600);
    if (data?.signedUrl) {
      await navigator.clipboard.writeText(data.signedUrl);
      toast.success('Link copiado (válido 7 dias)');
    }
  };

  // ── Attach to task ──────────────────────────────────────────────────────
  const handleAttachToTask = async (taskId: string, file: UserFile) => {
    await (supabase as any).from('user_files').update({ task_id: taskId }).eq('id', file.id);
    queryClient.invalidateQueries({ queryKey: ['user-files'] });
    setShowAttachModal(false);
    toast.success('Ficheiro anexado à tarefa');
  };

  // ── OneDrive connect ────────────────────────────────────────────────────
  const handleOdConnect = async () => {
    try {
      const res = await instance.loginPopup(loginRequest);
      const token = await instance.acquireTokenSilent({ ...loginRequest, account: res.account });
      setOdAccessToken(token.accessToken);
      toast.success('OneDrive ligado');
    } catch { toast.error('Erro ao ligar OneDrive'); }
  };

  // ── Import from OneDrive ────────────────────────────────────────────────
  const handleOdImport = async (item: OneDriveItem) => {
    if (!user || !odAccessToken) return;
    setImportingOd(item.id);
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${item.id}/content`, {
        headers: { Authorization: `Bearer ${odAccessToken}` },
      });
      const blob = await res.blob();
      const path = `${user.id}/${Date.now()}_${item.name}`;
      const { error: uploadErr } = await (supabase as any).storage.from('user-files').upload(path, blob, { upsert: false });
      if (uploadErr) { toast.error('Erro ao importar'); return; }
      const cat = detectCategory(item.file?.mimeType ?? null, item.name);
      await (supabase as any).from('user_files').insert({
        user_id: user.id, name: item.name, size_bytes: item.size,
        mime_type: item.file?.mimeType ?? null, storage_path: path,
        category: cat, source: 'onedrive', onedrive_id: item.id, onedrive_url: item.webUrl,
      });
      queryClient.invalidateQueries({ queryKey: ['user-files'] });
      toast.success('Ficheiro importado do OneDrive');
    } catch { toast.error('Erro ao importar do OneDrive'); }
    finally { setImportingOd(null); }
  };

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/" replace />;

  const categoryLabel = CATEGORY_ITEMS.find(c => c.key === category)?.label
    ?? EXTRA_CATEGORIES.find(c => c.key === category)?.label ?? category;

  return (
    <div className="min-h-screen flex" style={{ background: '#080808' }}>
      <style>{`.card-item:hover .card-overlay { opacity: 1 !important; }`}</style>
      <AppSidebar />
      <div className="md:ml-[240px] flex flex-1 h-screen overflow-hidden">

        {/* ── Categories panel ────────────────────────────────────── */}
        <div style={{ width: 200, minWidth: 200, height: '100vh', borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ padding: '20px 12px 8px' }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>Ficheiros</p>
            {CATEGORY_ITEMS.map(item => {
              const active = category === item.key;
              return (
                <button key={item.key} onClick={() => setCategory(item.key)}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', marginBottom: 2, transition: 'background 0.15s' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: active ? 600 : 500 }}>{item.label}</span>
                  </span>
                  {counts[item.key] > 0 && <span style={{ color: '#555', fontSize: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '1px 6px' }}>{counts[item.key]}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 12px' }} />
          <div style={{ padding: '8px 12px' }}>
            {EXTRA_CATEGORIES.map(item => {
              const active = category === item.key;
              return (
                <button key={item.key} onClick={() => setCategory(item.key)}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', marginBottom: 2, transition: 'background 0.15s' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: active ? 600 : 500 }}>{item.label}</span>
                  </span>
                  {counts[item.key] > 0 && <span style={{ color: '#555', fontSize: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '1px 6px' }}>{counts[item.key]}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>
          {/* Top bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, flex: 1, minWidth: 0 }}>{categoryLabel}</h2>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar ficheiros..."
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, padding: '7px 14px', color: '#fff', fontSize: 12, outline: 'none', width: 200 }}
            />
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
              {(['grid', 'lista'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: viewMode === v ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === v ? '#fff' : '#555', transition: 'all 0.15s' }}>
                  {v === 'grid' ? '⊞ Grelha' : '☰ Lista'}
                </button>
              ))}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ⬆️ Carregar ficheiro
            </button>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => e.target.files && handleFiles(e.target.files)} />
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

            {/* OneDrive section */}
            {category === 'OneDrive' ? (
              <div>
                {!odAccessToken ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>☁️</div>
                    <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Ligar OneDrive</p>
                    <p style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>Liga a tua conta Microsoft para aceder aos ficheiros do OneDrive</p>
                    <button onClick={handleOdConnect} style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ligar OneDrive</button>
                  </div>
                ) : odLoading ? (
                  <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 14 }}>A carregar OneDrive...</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {odFiles.map(item => (
                      <div key={item.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, width: 160, cursor: 'pointer' }}>
                        <div style={{ marginBottom: 8, textAlign: 'center' }}>{getFileIcon(item.file?.mimeType ?? null, item.name, 36)}</div>
                        <p style={{ color: '#fff', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{item.name}</p>
                        <p style={{ color: '#555', fontSize: 10, marginBottom: 8 }}>{formatSize(item.size)}</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => window.open(item.webUrl, '_blank')} style={{ flex: 1, background: 'rgba(0,120,212,0.1)', border: '1px solid rgba(0,120,212,0.3)', borderRadius: 6, padding: '4px 0', color: '#0078d4', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>Abrir</button>
                          <button onClick={() => handleOdImport(item)} disabled={importingOd === item.id} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 0', color: '#ccc', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
                            {importingOd === item.id ? '...' : 'Importar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer',
                    background: isDragging ? 'rgba(255,255,255,0.03)' : 'transparent',
                    transition: 'all 0.2s', marginBottom: 16,
                  }}
                >
                  {uploading ? (
                    <div>
                      <p style={{ color: '#fff', fontSize: 13, marginBottom: 8 }}>A carregar... {uploadProgress}%</p>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                        <div style={{ background: '#fff', height: '100%', width: `${uploadProgress}%`, transition: 'width 0.3s', borderRadius: 99 }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ color: isDragging ? '#fff' : '#666', fontSize: 13, fontWeight: 500 }}>
                        {isDragging ? 'Larga os ficheiros aqui' : 'Arrasta ficheiros aqui ou clica para selecionar'}
                      </p>
                      <p style={{ color: '#444', fontSize: 11, marginTop: 4 }}>Todos os tipos de ficheiro aceites</p>
                    </>
                  )}
                </div>

                {/* Files */}
                {isLoading ? (
                  <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 14 }}>A carregar ficheiros...</div>
                ) : filteredFiles.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#555', padding: '60px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                    <p style={{ fontSize: 14 }}>{category === 'Todos' ? 'Sem ficheiros. Carrega o primeiro ficheiro.' : 'Sem ficheiros nesta categoria.'}</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {filteredFiles.map(file => (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        style={{
                          background: selectedFile?.id === file.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${selectedFile?.id === file.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 12, padding: 14, width: 160, cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
                        }}
                        className="card-item"
                      >
                        <div style={{ marginBottom: 8, textAlign: 'center', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileThumbnail file={file} size={40} />
                        </div>
                        <p style={{ color: '#fff', fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{file.name}</p>
                        <p style={{ color: '#555', fontSize: 10 }}>{formatSize(file.size_bytes)} · {formatDate(file.created_at)}</p>
                        {/* Hover overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, opacity: 0, transition: 'opacity 0.15s' }}
                          className="card-overlay"
                          onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDownload(file)} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '4px 6px', color: '#fff', fontSize: 10, cursor: 'pointer' }}>⬇️ Descarregar</button>
                          <button onClick={() => { setShareTarget(file); setShowShareModal(true); }} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '4px 6px', color: '#fff', fontSize: 10, cursor: 'pointer' }}>🔗 Partilhar</button>
                          <button onClick={() => { setShareTarget(file); setShowAttachModal(true); }} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '4px 6px', color: '#fff', fontSize: 10, cursor: 'pointer' }}>📋 Anexar</button>
                          <button onClick={() => handleDelete(file)} style={{ width: '100%', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 6, padding: '4px 6px', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>🗑️ Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List view */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px 80px', gap: 12, padding: '6px 12px', color: '#555', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      <span>Nome</span><span>Categoria</span><span>Tamanho</span><span>Data</span><span>Ações</span>
                    </div>
                    {filteredFiles.map(file => (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px 80px', gap: 12, padding: '10px 12px',
                          background: selectedFile?.id === file.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, cursor: 'pointer', alignItems: 'center', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <FileThumbnail file={file} size={24} />
                          <span style={{ color: '#fff', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        </div>
                        <span style={{ color: '#666', fontSize: 11 }}>{file.category}</span>
                        <span style={{ color: '#666', fontSize: 11 }}>{formatSize(file.size_bytes)}</span>
                        <span style={{ color: '#666', fontSize: 11 }}>{formatDate(file.created_at)}</span>
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDownload(file)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, padding: 2 }} title="Descarregar">⬇️</button>
                          <button onClick={() => { setShareTarget(file); setShowShareModal(true); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, padding: 2 }} title="Partilhar">🔗</button>
                          <button onClick={() => handleDelete(file)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: 2 }} title="Eliminar">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Preview panel ─────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              style={{ width: 300, minWidth: 300, height: '100vh', borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a', flexShrink: 0, overflowY: 'auto', padding: 20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ color: '#666', fontSize: 12 }}>Detalhes</span>
                <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              {/* File icon/thumbnail */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <FileThumbnail file={selectedFile} size={64} />
              </div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 8, wordBreak: 'break-word' }}>{selectedFile.name}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontSize: 12 }}>Categoria</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>{selectedFile.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontSize: 12 }}>Tamanho</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>{formatSize(selectedFile.size_bytes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontSize: 12 }}>Data</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>{formatDate(selectedFile.created_at)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontSize: 12 }}>Origem</span>
                  <span style={{ color: '#fff', fontSize: 12 }}>{selectedFile.source === 'onedrive' ? 'OneDrive' : 'Upload'}</span>
                </div>
              </div>
              {/* Shared with */}
              {selectedFile.shared_with && selectedFile.shared_with.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: '#555', fontSize: 12, marginBottom: 8 }}>Partilhado com:</p>
                  {selectedFile.shared_with.map((email, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{email.slice(0, 2).toUpperCase()}</div>
                      <span style={{ color: '#ccc', fontSize: 11 }}>{email}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => handleDownload(selectedFile)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>⬇️ Descarregar</button>
                <button onClick={() => handleCopyLink(selectedFile)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>🔗 Copiar link</button>
                <button onClick={() => { setShareTarget(selectedFile); setShowAttachModal(true); }} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>📋 Anexar a tarefa</button>
                <button onClick={() => { setShareTarget(selectedFile); setShowShareModal(true); }} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>🔗 Partilhar</button>
                <button onClick={() => handleDelete(selectedFile)} style={{ width: '100%', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '9px 12px', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>🗑️ Eliminar</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Share Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showShareModal && shareTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setShowShareModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Partilhar ficheiro</h3>
                <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              <p style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>{shareTarget.name}</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="email@exemplo.com"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
                <button onClick={handleAddShare} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Adicionar</button>
              </div>
              {/* Current access */}
              {(shareTarget.shared_with ?? []).length > 0 && (
                <div>
                  <p style={{ color: '#555', fontSize: 11, marginBottom: 8 }}>Com acesso:</p>
                  {(shareTarget.shared_with ?? []).map((email, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#ccc', fontSize: 12 }}>{email}</span>
                      <button
                        onClick={async () => {
                          const newList = (shareTarget.shared_with ?? []).filter(e => e !== email);
                          await (supabase as any).from('user_files').update({ shared_with: newList }).eq('id', shareTarget.id);
                          queryClient.invalidateQueries({ queryKey: ['user-files'] });
                          setShareTarget(prev => prev ? { ...prev, shared_with: newList } : null);
                        }}
                        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => handleCopyLink(shareTarget)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500, marginTop: 12 }}>
                🔗 Copiar link de partilha (7 dias)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Attach to task Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showAttachModal && shareTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setShowAttachModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Anexar a tarefa</h3>
                <button onClick={() => setShowAttachModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              <input value={attachSearch} onChange={e => setAttachSearch(e.target.value)} placeholder="Pesquisar tarefas..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {tasks.filter(t => t.title.toLowerCase().includes(attachSearch.toLowerCase())).map(t => (
                  <button key={t.id} onClick={() => handleAttachToTask(t.id, shareTarget)}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, cursor: 'pointer', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#fff', fontSize: 13 }}>{t.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
