create extension if not exists vector with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text,
  file_type text not null default 'pdf',
  page_count int not null default 0,
  chunk_count int not null default 0,
  status text not null default 'processing',
  error text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "own documents" on public.documents for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index int not null,
  page int,
  section text,
  content text not null,
  embedding extensions.halfvec(3072),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chunks to authenticated;
grant all on public.chunks to service_role;
alter table public.chunks enable row level security;
create policy "own chunks" on public.chunks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index chunks_document_idx on public.chunks(document_id);
create index chunks_embedding_idx on public.chunks using hnsw (embedding extensions.halfvec_cosine_ops);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.threads to authenticated;
grant all on public.threads to service_role;
alter table public.threads enable row level security;
create policy "own threads" on public.threads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "own messages" on public.messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index messages_thread_idx on public.messages(thread_id, created_at);

create or replace function public.match_chunks(
  query_embedding extensions.halfvec(3072),
  match_count int default 8,
  owner uuid default auth.uid()
)
returns table (
  id uuid,
  document_id uuid,
  document_name text,
  domain text,
  chunk_index int,
  page int,
  section text,
  content text,
  similarity float
)
language sql stable security invoker set search_path = public, extensions as $$
  select c.id, c.document_id, d.name, d.domain, c.chunk_index, c.page, c.section, c.content,
         1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = owner and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$$;
grant execute on function public.match_chunks(extensions.halfvec, int, uuid) to authenticated, service_role;