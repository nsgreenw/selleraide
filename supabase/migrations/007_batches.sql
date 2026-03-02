-- Batch generation table
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_rows integer not null default 0,
  completed_rows integer not null default 0,
  failed_rows integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table batches enable row level security;

create policy "Users can view their own batches"
  on batches for select
  using (auth.uid() = user_id);

create policy "Users can insert their own batches"
  on batches for insert
  with check (auth.uid() = user_id);

-- Index for user lookups
create index if not exists idx_batches_user_id on batches(user_id);

-- Add batch_id to listings (nullable FK)
alter table listings add column if not exists batch_id uuid references batches(id) on delete set null;

-- Index for batch lookups on listings
create index if not exists idx_listings_batch_id on listings(batch_id);
