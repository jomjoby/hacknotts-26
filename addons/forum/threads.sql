-- FunForum threads: adds threads to the forum sections (General, Games, Movies & TV, Sports).
-- Only ADDS to the database: a new "threads" table and a "thread_id" column on messages.
-- Nothing existing is changed or removed, and the old messages stay as each section's original chat.
--
-- Run once: Supabase dashboard > the forum project > SQL Editor > New query > paste all of this > Run.
-- Safe to run again (every step checks whether it has already been done).

-- 1. The threads table. Each thread belongs to one section (the same names the messages use).
create table if not exists public.threads (
    id          bigint generated always as identity primary key,
    channel     text not null check (channel in ('general', 'games', 'movies-tv', 'sports')),
    title       text not null check (char_length(title) between 1 and 100),
    created_by  uuid not null default auth.uid() references public.profiles (id),
    created_at  timestamptz not null default now()
);

create index if not exists threads_channel_created_at_idx on public.threads (channel, created_at desc);

-- 2. Messages can now belong to a thread. Existing messages keep thread_id empty.
alter table public.messages add column if not exists thread_id bigint references public.threads (id);
create index if not exists messages_thread_id_created_at_idx on public.messages (thread_id, created_at);

-- 3. Who can do what: anyone can read threads, logged-in users can start threads as themselves.
alter table public.threads enable row level security;

grant select on public.threads to anon, authenticated;
grant insert (channel, title) on public.threads to authenticated;   -- created_by always comes from the login
grant usage, select on sequence public.threads_id_seq to authenticated;
grant insert (thread_id) on public.messages to authenticated;

do $$
begin
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'threads'
                   and policyname = 'Anyone can read threads') then
        create policy "Anyone can read threads" on public.threads
            for select to anon, authenticated using (true);
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'threads'
                   and policyname = 'Logged-in users can start threads') then
        create policy "Logged-in users can start threads" on public.threads
            for insert to authenticated with check (created_by = auth.uid());
    end if;

    -- An extra rule on top of the existing message rules (which all still apply):
    -- a message posted into a thread must be in that thread's section.
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages'
                   and policyname = 'Thread replies stay in their section') then
        create policy "Thread replies stay in their section" on public.messages
            as restrictive for insert to authenticated
            with check (thread_id is null
                        or exists (select 1 from public.threads t
                                   where t.id = messages.thread_id and t.channel = messages.channel));
    end if;
end $$;

-- 4. Live updates: new threads appear without refreshing (like new messages already do).
do $$
begin
    alter publication supabase_realtime add table public.threads;
exception when others then
    null;   -- already added, or realtime is set up differently: nothing to do
end $$;
