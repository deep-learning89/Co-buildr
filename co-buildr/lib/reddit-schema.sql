-- Reddit scrapes table for storing scraped Reddit posts
create table if not exists reddit_scrapes (
  id uuid primary key default gen_random_uuid(),
  search_query text not null,
  original_query text,
  actor_id text not null,
  run_id text,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  results jsonb,
  error_message text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  completed_at timestamp
);

-- Index for faster queries
create index if not exists idx_reddit_scrapes_search_query on reddit_scrapes(search_query);
create index if not exists idx_reddit_scrapes_status on reddit_scrapes(status);
create index if not exists idx_reddit_scrapes_created_at on reddit_scrapes(created_at);
create index if not exists idx_reddit_scrapes_search_status_created on reddit_scrapes(search_query, status, created_at);

-- RLS Policies
alter table reddit_scrapes enable row level security;

-- Policy for server-side operations (service role)
create policy "Server full access" on reddit_scrapes
  for all using (auth.role() = 'service_role');

-- Policy for client-side read-only access (anon role)
create policy "Read-only access" on reddit_scrapes
  for select using (auth.role() = 'anon');

-- Function to automatically update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
drop trigger if exists update_reddit_scrapes_updated_at on reddit_scrapes;
create trigger update_reddit_scrapes_updated_at
  before update on reddit_scrapes
  for each row
  execute function update_updated_at_column();
