-- Criar bucket se não existir
insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', true)
on conflict (id) do nothing;

-- Política para upload
create policy "Users can upload files"
on storage.objects for insert
with check (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para leitura
create policy "Users can read own files"
on storage.objects for select
using (bucket_id = 'user-files');

-- Política para apagar
create policy "Users can delete own files"
on storage.objects for delete
using (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);
