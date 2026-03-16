
-- ============================================================
-- FEATURE 1: task_members & team_directory
-- ============================================================

create table public.task_members (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users,
  joined_at timestamptz default now()
);

create table public.team_directory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users unique,
  email text not null,
  name text,
  avatar_color text default '#60a5fa'
);

-- RLS: task_members
alter table public.task_members enable row level security;
create policy "Todos podem ver membros de tarefas" on public.task_members for select using (true);
create policy "Utilizadores autenticados podem adicionar membros" on public.task_members for insert with check (auth.uid() = invited_by);
create policy "Quem convidou pode remover membros" on public.task_members for delete using (auth.uid() = invited_by);

-- RLS: team_directory
alter table public.team_directory enable row level security;
create policy "Todos podem ver diretório da equipa" on public.team_directory for select using (true);
create policy "Utilizadores gerem a sua própria entrada" on public.team_directory for all using (auth.uid() = user_id);

-- ============================================================
-- FEATURE 2: task_messages
-- ============================================================

create table public.task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references auth.users,
  sender_email text not null,
  content text not null,
  is_ai boolean default false,
  created_at timestamptz default now()
);

-- RLS: task_messages
alter table public.task_messages enable row level security;
create policy "Todos podem ver mensagens" on public.task_messages for select using (true);
create policy "Utilizadores autenticados podem enviar mensagens" on public.task_messages for insert with check (auth.uid() = user_id);

-- Enable realtime for task_messages
alter publication supabase_realtime add table public.task_messages;

-- ============================================================
-- Seed: team_directory (sample team members)
-- ============================================================

insert into public.team_directory (email, name, avatar_color) values
  ('pedro@the100s.pt', 'Pedro Gomes', '#60a5fa'),
  ('ana@the100s.pt', 'Ana Silva', '#f472b6'),
  ('joao@the100s.pt', 'João Santos', '#34d399'),
  ('maria@the100s.pt', 'Maria Costa', '#a78bfa'),
  ('carlos@the100s.pt', 'Carlos Ferreira', '#f59e0b');

-- ============================================================
-- FEATURE 3: Seed tasks
-- ============================================================

insert into public.tasks (title, area, priority, status, description) values

-- OBRAS & ESPAÇO
('Finalizar obras de construção civil', 'obras', 'alta', 'em-curso', 'Acompanhamento das obras no espaço da Rua Sá da Bandeira 150'),
('Instalação de sistema de iluminação', 'obras', 'alta', 'pendente', 'Iluminação ambiente e de destaque para produto'),
('Montagem de mobiliário e expositores', 'obras', 'alta', 'pendente', 'Expositores de produto e mobiliário de loja'),
('Instalação de sinalética', 'obras', 'media', 'pendente', 'Sinalética interior e exterior'),

-- TECH & IT
('Configuração POS Winmax4 / ITBase', 'tech', 'alta', 'pendente', '3 terminais POS na loja'),
('Setup Shopify + Spyral e-commerce', 'tech', 'alta', 'em-curso', 'Loja online integrada com loja física'),
('Integração Omnium Retail middleware', 'tech', 'alta', 'pendente', 'Middleware 339€/mês — sincronização stock e pedidos'),
('Configuração de 7 APs WiFi + 3 switches', 'tech', 'alta', 'pendente', 'Infraestrutura de rede da loja'),
('Setup de 8 tablets na loja', 'tech', 'media', 'pendente', 'Tablets para equipa e experiência cliente'),
('Configuração Impressora UV', 'tech', 'media', 'pendente', 'Personalização in-store em cortiça e cerâmica'),
('Instalação LED Wall + Samsung Spatial screens', 'tech', 'media', 'pendente', '2 Samsung Spatial screens + LED Wall'),
('Configuração sistema Levita levitation display', 'tech', 'baixa', 'pendente', 'Display de levitação para produto'),
('Setup sistema de áudio por zonas', 'tech', 'media', 'pendente', 'Áudio ambiente zoneado'),
('Instalação CCTV (18 câmeras)', 'tech', 'alta', 'pendente', '18 câmeras CCTV + 6 video analytics'),
('Configuração Alarmística', 'tech', 'alta', 'pendente', 'Sistema de alarme da loja'),
('Setup métodos de pagamento', 'tech', 'alta', 'pendente', 'MB Way, cartão, contactless'),

-- ANALYTICS & DATA
('Configuração Power BI dashboards', 'data', 'media', 'pendente', 'Integrações Power BI — todas pendentes'),
('Setup Quallit Q-Engage (5 câmeras)', 'data', 'media', 'pendente', 'Contacto: Leonardo Ribeiro'),
('Integração analytics Shopify → Power BI', 'data', 'media', 'pendente', 'Pipeline de dados e-commerce'),

-- CRM & DIGITAL
('Configuração CRM Zoho + Liminal', 'crm', 'alta', 'em-curso', 'CRM principal para gestão de clientes'),
('Setup WhatsApp Business + integração Zoho', 'crm', 'media', 'pendente', 'Canal de comunicação com clientes'),
('Configuração NOS VinIA Sommelier', 'crm', 'media', 'pendente', 'Assistente de sommelier AI'),
('Lançamento cartão de fidelização', 'crm', 'media', 'pendente', 'Programa de fidelização para clientes recorrentes'),

-- EXPERIÊNCIA LOJA
('Definir fluxo de experiência in-store', 'loja', 'alta', 'em-curso', 'Jornada do cliente da entrada à saída'),
('Setup Enomatic Roma Unica 8 garrafas', 'loja', 'alta', 'pendente', '11.364,50€ + IVA — provas self-service'),
('Treino de equipa em personalização UV/Laser', 'loja', 'alta', 'pendente', 'UV para cortiça/cerâmica, Laser para madeira+latão'),
('Preparar kits de prova para lançamento', 'loja', 'alta', 'pendente', 'Kit Prova A/B prontos para abertura'),
('Sinalética digital in-store', 'loja', 'media', 'pendente', 'Ecrãs com conteúdo dinâmico'),

-- STOCK & PRODUTO
('Encomenda de stock inicial — LR Enologia', 'stock', 'alta', 'pendente', 'Contacto: Ivone Varandas + Luís Rodrigues'),
('Receção e organização de packaging', 'stock', 'alta', 'pendente', 'Base A/B, Int.A, Int.C1, Premium A/B, Kit Prova A/B'),
('Compliance IVDP — rótulos 20×40mm', 'stock', 'alta', 'pendente', 'Modo Kit Fechado vs. À Medida — validação obrigatória'),
('Fotografia de produto para e-commerce', 'stock', 'media', 'pendente', 'Todos os SKUs fotografados com fundo neutro'),

-- PESSOAS & OPERAÇÕES
('Recrutar Retail Development & Operations Manager', 'ops', 'alta', 'em-curso', 'Salário 35–42k€/ano + bónus'),
('Definir manual de operações da loja', 'ops', 'alta', 'pendente', 'Processos, turnos, abertura/fecho'),
('Lançar The 100s Academy (Lovable)', 'ops', 'media', 'pendente', 'Plataforma de onboarding interno'),
('Recrutar equipa de loja (mínimo 3 pessoas)', 'ops', 'alta', 'pendente', 'Para abertura a 1 de Junho'),

-- MARKETING & BRAND
('Campanha de lançamento da loja', 'marketing', 'alta', 'em-curso', 'Abertura 1 de Junho 2026'),
('Finalizar grafismo 2026 — Opção B Azulejo/Filigrana', 'marketing', 'alta', 'em-curso', 'Opção B domina intenção de compra — target 25–40 anos ES/UK/USA'),
('Produção de conteúdo para redes sociais', 'marketing', 'media', 'pendente', 'Instagram, TikTok, LinkedIn'),

-- FINANCEIRO
('Fechar ronda de investimento €250K / 10%', 'finance', 'alta', 'em-curso', 'Valuation €2,5M'),
('Configuração contabilidade + faturação', 'finance', 'alta', 'pendente', 'Integração com Winmax4'),
('Projeções financeiras 2026 detalhadas', 'finance', 'media', 'em-curso', '€1,9M target 2026, ~69% margem bruta');
