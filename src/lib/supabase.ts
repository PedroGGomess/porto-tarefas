export { supabase } from '@/integrations/supabase/client';


export type Task = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  area: string;
  priority: string;
  status: string;
  deadline: string | null;
  responsavel: string | null;
  created_at: string;
  updated_at: string;
};

export const AREAS = [
  { value: 'obras', label: 'Obras & Espaço', color: '#f59e0b' },
  { value: 'tech', label: 'Tech & IT', color: '#60a5fa' },
  { value: 'analytics', label: 'Analytics & Data', color: '#a78bfa' },
  { value: 'crm', label: 'CRM & Digital', color: '#34d399' },
  { value: 'loja', label: 'Experiência Loja', color: '#f472b6' },
  { value: 'stock', label: 'Stock & Produto', color: '#4ade80' },
  { value: 'pessoas', label: 'Pessoas & Ops', color: '#fb923c' },
  { value: 'marketing', label: 'Marketing & Brand', color: '#c084fc' },
  { value: 'finance', label: 'Financeiro', color: '#38bdf8' },
  { value: 'outro', label: 'Outro', color: '#94a3b8' },
] as const;

export const PRIORITIES = [
  { value: 'alta', label: 'Alta', color: '#ef4444' },
  { value: 'media', label: 'Média', color: '#f59e0b' },
  { value: 'baixa', label: 'Baixa', color: '#22c55e' },
] as const;

export const STATUSES = [
  { value: 'pendente', label: 'Pendente', icon: '○', color: '#555555' },
  { value: 'em-curso', label: 'Em curso', icon: '◑', color: '#60a5fa' },
  { value: 'concluido', label: 'Concluído', icon: '●', color: '#22c55e' },
  { value: 'bloqueado', label: 'Bloqueado', icon: '✕', color: '#ef4444' },
] as const;

export function getAreaColor(area: string): string {
  return AREAS.find(a => a.value === area)?.color ?? '#94a3b8';
}

export function getAreaLabel(area: string): string {
  return AREAS.find(a => a.value === area)?.label ?? area;
}

export function getPriorityColor(priority: string): string {
  return PRIORITIES.find(p => p.value === priority)?.color ?? '#f59e0b';
}

export function getStatusInfo(status: string) {
  return STATUSES.find(s => s.value === status) ?? STATUSES[0];
}
