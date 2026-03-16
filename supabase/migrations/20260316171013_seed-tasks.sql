-- ============================================
-- Make user_id nullable to support shared/seeded tasks
-- visible to all authenticated users
-- ============================================

ALTER TABLE public.tasks ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to show shared tasks (user_id IS NULL) to all authenticated users
DROP POLICY "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks" ON public.tasks
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks" ON public.tasks
  FOR UPDATE USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks" ON public.tasks
  FOR DELETE USING (user_id IS NULL OR auth.uid() = user_id);

-- ============================================
-- THE 100'S — 37 TAREFAS PENDENTES
-- ============================================

INSERT INTO tasks (title, area, priority, status, responsavel, description, deadline) VALUES

-- OBRAS & ESPAÇO
('Obras loja',
 'obras', 'alta', 'em-curso', 'A definir',
 'Início previsto 31 de março. Data limite para estar pronta antes da abertura (1 Jun).',
 '2026-06-01'),

('RFID — Segurança',
 'obras', 'alta', 'em-curso', 'A definir',
 'Segurança anti-roubo integrada na loja. Fornecedor a selecionar.',
 '2026-05-15'),

-- TECH & IT
('Software POS e Equipamentos',
 'tech', 'alta', 'em-curso', 'ITBase (Winmax4)',
 '3 terminais POS + 8 tablets. Confirmar modo offline e backup automático de transações com ITBase.',
 '2026-05-15'),

('WiFi — Rede & Conectividade',
 'tech', 'alta', 'em-curso', 'NOS / Wavecom',
 'Survey agendado sexta-feira (13 Mar). 7 APs previstos. Comparar proposta NOS vs Wavecom. Failover 4G obrigatório.',
 '2026-05-01'),

('Internet — Acesso Dedicado',
 'tech', 'alta', 'em-curso', 'NOS (André)',
 'Comparar pacote NET+VF vs. linha dedicada. Avaliar SLAs, uptime e redundância. Resposta pendente André.',
 '2026-04-15'),

('SD-WAN + Firewall + Gestão Rede',
 'tech', 'alta', 'em-curso', 'NOS — Fortinet',
 'Solução de segurança FW com gestão centralizada de APs WiFi, Switching, CCTV. Proposta NOS a aguardar.',
 '2026-05-01'),

('Omnium — Middleware POS + E-commerce',
 'tech', 'alta', 'em-curso', 'Omnium Retail',
 'Integração entre POS Winmax4, Shopify e AI Concierge. Validar fluxo completo antes da abertura.',
 '2026-05-15'),

('Servidores / Bastidor / Backups',
 'tech', 'alta', 'em-curso', 'NOS Housing / NAS local',
 'Bastidor na cave. Switch PoE + Firewall + NAS backups. Confirmar dimensionamento após survey.',
 '2026-05-01'),

('Licenciamento M365',
 'tech', 'media', 'em-curso', 'Microsoft',
 '9x Business Standard ativas. Auditar utilizadores — eliminar inativas. Teams para comunicação interna.',
 '2026-04-01'),

('Serviços Móveis',
 'tech', 'media', 'em-curso', 'NOS',
 '5–6 cartões SIM. 1 linha dedicada AI Concierge WhatsApp (número fixo — nunca mudar). Pedir pool à NOS.',
 '2026-04-15'),

('Método de Pagamentos',
 'tech', 'alta', 'em-curso', 'A definir',
 'MB Way, contactless, Visa/MC. Definir adquirente (SIBS, Stripe, outro). Taxas a negociar. Setup e testes em POS.',
 '2026-05-15'),

('Analytics Negócio — Dashboard (Tech)',
 'tech', 'media', 'em-curso', 'Pedro Gomes',
 'Power BI já no stack. Avaliar se Zoho Analytics (incluído no Zoho CRM via Liminal) é suficiente para fase 1.',
 '2026-05-01'),

('Impressora UV — Personalização',
 'tech', 'media', 'em-curso', 'Gateway',
 'Equipamento na zona de personalização. Instalação, calibração, testes com produtos reais e treino de staff.',
 '2026-05-15'),

('CCTV — 18 Câmeras Segurança',
 'tech', 'alta', 'em-curso', 'Gateway',
 '18 câmeras IP PoE. Cobertura entradas, balcões, montras, escadas. NVR local ou cloud a definir após survey.',
 '2026-05-15'),

('Alarmística',
 'tech', 'alta', 'em-curso', 'Gateway',
 'Sistema de alarme (sensores intrusão, central, resposta). Integrar com CCTV. Fornecedor a selecionar após survey.',
 '2026-05-15'),

-- ANALYTICS & DATA
('Analytics Imagem — Q-Engage',
 'analytics', 'media', 'em-curso', 'NOS + Quallit',
 '327€/mês loja + 90€/mês (5 câmeras). One-shot: 765€ implementação + 1.066€ hardware. Ajuste pendente: retirar Linha Cloud, converter CAPEX→OPEX. Contacto: André (NOS).',
 '2026-05-15'),

('Analytics Negócio — Dashboard',
 'analytics', 'media', 'em-curso', 'Pedro Gomes',
 'Power BI já no stack. Avaliar se Zoho Analytics (incluído no Zoho CRM via Liminal) é suficiente para fase 1.',
 '2026-05-01'),

-- CRM & DIGITAL
('CRM',
 'crm', 'alta', 'em-curso', 'Zoho (via Liminal)',
 'CRM principal da loja. Integrado com Omnium e AI Concierge. Confirmar setup e fluxos de dados.',
 '2026-05-15'),

('E-commerce — Loja Online',
 'crm', 'alta', 'em-curso', 'Shopify (via Spyral)',
 'Integração com POS via Omnium. Fluxo "Send a Memory" para envio internacional. Validar checkout e stock sync.',
 '2026-05-15'),

('AI Concierge',
 'crm', 'alta', 'em-curso', 'Bubble (interno)',
 '2.500€ setup + 200€/mês. 3 GPTs: Educativo, Comercial, Operacional. Conteúdos para o João (knowledge base). Bot WhatsApp → Link Pedido → POS.',
 '2026-05-15'),

-- EXPERIÊNCIA LOJA
('Som de Loja — Música Ambiente',
 'loja', 'media', 'em-curso', 'NOS',
 'Survey sexta 13 Mar. 3 amplificadores (cave + piso 0 + piso 1), 26 colunas teto, 10 atenuadores. Licenciamento musical a definir com NOS.',
 '2026-05-15'),

('Multimédia — LED Wall + Ecrãs',
 'loja', 'media', 'em-curso', 'A definir',
 'Ecrã principal LED Wall + conteúdos para ecrãs em loja. Fornecedor a selecionar. NOS pode colaborar (Videowalls).',
 '2026-05-15'),

('Dispensadores de Vinho',
 'loja', 'media', 'em-curso', 'Enomatic / Beversys',
 'Proposta Enomatic recebida (Carlos Pereira da Cunha). Comparar com Beversys. Integração com zona de provas piso 1/2.',
 '2026-05-01'),

('Marketing Olfativo',
 'loja', 'baixa', 'em-curso', 'NOS',
 'Diferenciação sensorial da experiência em loja. Proposta a aguardar.',
 '2026-05-15'),

('Cartão de Fidelização Cliente',
 'loja', 'media', 'em-curso', 'Paulo Gonçalves',
 'Programa de loyalty. Integrar com CRM Zoho e base de dados de clientes. NOS pode fornecer solução.',
 '2026-05-15'),

('NOS VinIA Sommelier',
 'loja', 'media', 'em-curso', 'Pedro Gomes',
 'Chat AI WhatsApp para prova e recomendação de vinhos. Avaliar sinergia/sobreposição com AI Concierge próprio da The 100''s.',
 '2026-05-01'),

-- STOCK & PRODUTO
('Stock Inicial — Encomenda de Abertura',
 'stock', 'alta', 'em-curso', 'Paulo Gonçalves',
 'Definir qtd. por referência para abertura (10 rótulos, 100ml). Prazo de produção com LR Enologia (Ivone Varandas + Luís Rodrigues). Deadline: mai 2026.',
 '2026-05-01'),

('Packaging — Sacos, Caixas, Bilhetes',
 'stock', 'alta', 'em-curso', 'Paulo Gonçalves',
 'Sacos Base/Premium, caixas Cork/Cerâmica/Madeira+Latão, bilhetes Prisma 220g. Prazos de produção longos — encomendar com antecedência.',
 '2026-04-15'),

('IVDP — Compliance e Etiquetagem',
 'stock', 'alta', 'em-curso', 'Paulo Gonçalves',
 'Etiqueta obrigatória 20x40mm na base: denominação, tipo/idade, produtor, morada, 100ml, 20%vol, sulfitos, código barras. Validar com IVDP antes da abertura.',
 '2026-04-30'),

('Fotografia de Produto',
 'stock', 'media', 'em-curso', 'Paulo Gonçalves',
 'Fotos de produto para e-commerce, redes sociais e conteúdos digitais. Fotografar todas as referências e embalagens.',
 '2026-05-01'),

-- PESSOAS & OPERAÇÕES
('Recrutamento — Equipa de Loja',
 'pessoas', 'alta', 'em-curso', 'Carla Machado',
 'Retail Development & Operations Manager em aberto. Staff de piso para 3 pisos + cave. Definir headcount por turno e horários de funcionamento.',
 '2026-05-01'),

('The 100''s Academy — Onboarding Staff',
 'pessoas', 'media', 'em-curso', 'Pedro Gomes',
 'Plataforma de onboarding (Lovable) em desenvolvimento. Módulos: marca, produtos, vinhos, processos, POS. Toda a equipa completa antes da abertura.',
 '2026-05-15'),

('Treino de Staff — POS e Processos',
 'pessoas', 'alta', 'em-curso', 'Carla Machado',
 'Treino prático no Winmax4, tablets, fluxo de personalização UV, gestão de filas e atendimento. Simular dia de abertura.',
 '2026-05-25'),

-- MARKETING & BRAND
('Plano de Comunicação',
 'marketing', 'alta', 'em-curso', 'Bastarda',
 'Plano de comunicação em desenvolvimento com agência Bastarda.',
 '2026-04-30'),

('Customer Journey',
 'marketing', 'media', 'em-curso', 'Bastarda',
 'Mapeamento do customer journey com Bastarda. Alinhado com zonas da loja e AI Concierge.',
 '2026-04-30'),

('Conteúdos Digitais',
 'marketing', 'media', 'em-curso', 'Interno + Bastarda',
 'Conteúdos para ecrãs, AI Concierge (knowledge base), e-commerce e redes sociais.',
 '2026-05-15'),

('Sinalética Digital',
 'marketing', 'media', 'em-curso', 'Paulo Gonçalves',
 'Sinalética digital nas montras e zonas de produto. NOS pode fornecer. Coordenar com conteúdos e multimédia.',
 '2026-05-15');

-- ============================================
-- 37 tarefas importadas com sucesso ✅
-- ============================================
