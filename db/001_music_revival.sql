create table if not exists spotify_users (
  id text primary key,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists spotify_artists (
  id text primary key,
  name text not null,
  genres text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists spotify_tracks (
  id text primary key,
  name text not null,
  primary_artist_id text references spotify_artists(id),
  album_name text,
  duration_ms integer,
  updated_at timestamptz not null default now()
);

create table if not exists spotify_track_artists (
  track_id text not null references spotify_tracks(id) on delete cascade,
  artist_id text not null references spotify_artists(id) on delete cascade,
  artist_order integer not null default 0,
  primary key (track_id, artist_id)
);

create table if not exists spotify_listening_events (
  id bigserial primary key,
  user_id text not null references spotify_users(id) on delete cascade,
  track_id text not null references spotify_tracks(id),
  played_at timestamptz not null,
  source text not null default 'spotify',
  ms_played integer,
  created_at timestamptz not null default now(),
  unique (user_id, track_id, played_at)
);

create index if not exists spotify_listening_events_user_played_at_idx
  on spotify_listening_events (user_id, played_at desc);

create index if not exists spotify_listening_events_track_played_at_idx
  on spotify_listening_events (track_id, played_at desc);

create materialized view if not exists analytics_track_revival_metrics as
with track_plays as (
  select
    e.user_id,
    e.track_id as entity_id,
    t.name as entity_name,
    e.played_at,
    lag(e.played_at) over (partition by e.user_id, e.track_id order by e.played_at) as previous_played_at
  from spotify_listening_events e
  join spotify_tracks t on t.id = e.track_id
),
revivals as (
  select
    user_id,
    entity_id,
    max(extract(epoch from played_at - previous_played_at) / 86400) as max_dormant_days,
    count(*) filter (where played_at - previous_played_at >= interval '180 days') as revival_count,
    max(played_at) filter (where played_at - previous_played_at >= interval '180 days') as latest_comeback_at
  from track_plays
  where previous_played_at is not null
  group by user_id, entity_id
),
rollups as (
  select
    user_id,
    entity_id,
    max(entity_name) as entity_name,
    count(*) as total_plays,
    min(played_at) as first_played_at,
    max(played_at) as last_played_at,
    count(*) filter (where played_at >= now() - interval '90 days') as current_window_plays
  from track_plays
  group by user_id, entity_id
)
select
  r.user_id,
  'track'::text as entity_type,
  r.entity_id,
  r.entity_name,
  r.total_plays,
  r.first_played_at,
  r.last_played_at,
  coalesce(v.max_dormant_days, 0)::integer as max_dormant_days,
  coalesce(v.revival_count, 0)::integer as revival_count,
  v.latest_comeback_at,
  round(least(1.0, r.current_window_plays::numeric / greatest(3, r.total_plays)), 2) as current_relevance,
  round(
    least(100.0, coalesce(v.max_dormant_days, 0)::numeric / 365 * 20)
    + least(40.0, coalesce(v.revival_count, 0)::numeric * 20)
    + least(20.0, r.current_window_plays::numeric * 4),
    2
  ) as revival_score
from rollups r
left join revivals v on v.user_id = r.user_id and v.entity_id = r.entity_id;

create materialized view if not exists analytics_artist_revival_metrics as
with artist_events as (
  select
    e.user_id,
    a.id as entity_id,
    a.name as entity_name,
    e.played_at
  from spotify_listening_events e
  join spotify_track_artists ta on ta.track_id = e.track_id
  join spotify_artists a on a.id = ta.artist_id
),
artist_plays as (
  select
    *,
    lag(played_at) over (partition by user_id, entity_id order by played_at) as previous_played_at
  from artist_events
),
revivals as (
  select
    user_id,
    entity_id,
    max(extract(epoch from played_at - previous_played_at) / 86400) as max_dormant_days,
    count(*) filter (where played_at - previous_played_at >= interval '180 days') as revival_count,
    max(played_at) filter (where played_at - previous_played_at >= interval '180 days') as latest_comeback_at
  from artist_plays
  where previous_played_at is not null
  group by user_id, entity_id
),
rollups as (
  select
    user_id,
    entity_id,
    max(entity_name) as entity_name,
    count(*) as total_plays,
    min(played_at) as first_played_at,
    max(played_at) as last_played_at,
    count(*) filter (where played_at >= now() - interval '90 days') as current_window_plays
  from artist_plays
  group by user_id, entity_id
)
select
  r.user_id,
  'artist'::text as entity_type,
  r.entity_id,
  r.entity_name,
  r.total_plays,
  r.first_played_at,
  r.last_played_at,
  coalesce(v.max_dormant_days, 0)::integer as max_dormant_days,
  coalesce(v.revival_count, 0)::integer as revival_count,
  v.latest_comeback_at,
  round(least(1.0, r.current_window_plays::numeric / greatest(3, r.total_plays)), 2) as current_relevance,
  round(
    least(100.0, coalesce(v.max_dormant_days, 0)::numeric / 365 * 20)
    + least(40.0, coalesce(v.revival_count, 0)::numeric * 20)
    + least(20.0, r.current_window_plays::numeric * 4),
    2
  ) as revival_score
from rollups r
left join revivals v on v.user_id = r.user_id and v.entity_id = r.entity_id;
