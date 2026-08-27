-- ENUMS
create type public.app_role as enum ('admin', 'user');
create type public.position_side as enum ('long', 'short');
create type public.position_status as enum ('open', 'closed', 'liquidated');

-- PROFILES
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text,
  wallet_address text,
  balance numeric(38,12) not null default 10000,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

-- MARKETS
create table public.markets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  price numeric(38,12) not null,
  open_price_24h numeric(38,12) not null,
  price_24h_at timestamptz not null default now(),
  volatility numeric(10,6) not null default 0.015,
  max_leverage numeric(6,2) not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.markets to anon, authenticated;
grant insert, update, delete on public.markets to authenticated;
grant all on public.markets to service_role;
alter table public.markets enable row level security;
create policy "markets_select_all" on public.markets for select to anon, authenticated using (true);
create policy "markets_admin_write" on public.markets for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- PRICE TICKS
create table public.price_ticks (
  id bigserial primary key,
  market_id uuid not null references public.markets(id) on delete cascade,
  price numeric(38,12) not null,
  created_at timestamptz not null default now()
);
create index price_ticks_market_time_idx on public.price_ticks (market_id, created_at desc);
grant select on public.price_ticks to anon, authenticated;
grant all on public.price_ticks to service_role;
alter table public.price_ticks enable row level security;
create policy "price_ticks_select_all" on public.price_ticks for select to anon, authenticated using (true);

-- POOL STATE (singleton)
create table public.pool_state (
  id int primary key default 1,
  total_assets numeric(38,12) not null default 0,
  total_borrowed numeric(38,12) not null default 0,
  total_shares numeric(38,12) not null default 0,
  fees_earned numeric(38,12) not null default 0,
  updated_at timestamptz not null default now(),
  constraint pool_singleton check (id = 1)
);
insert into public.pool_state (id) values (1);
grant select on public.pool_state to anon, authenticated;
grant all on public.pool_state to service_role;
alter table public.pool_state enable row level security;
create policy "pool_state_select_all" on public.pool_state for select to anon, authenticated using (true);

-- LP POSITIONS
create table public.lp_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  shares numeric(38,12) not null default 0,
  deposited numeric(38,12) not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.lp_positions to authenticated;
grant all on public.lp_positions to service_role;
alter table public.lp_positions enable row level security;
create policy "lp_positions_select_own" on public.lp_positions for select to authenticated using (auth.uid() = user_id);

-- TRADING POSITIONS
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  market_id uuid not null references public.markets(id) on delete restrict,
  side public.position_side not null,
  collateral numeric(38,12) not null,
  leverage numeric(6,2) not null,
  size numeric(38,12) not null,
  borrowed numeric(38,12) not null,
  entry_price numeric(38,12) not null,
  liq_price numeric(38,12) not null,
  open_fee numeric(38,12) not null default 0,
  borrow_fee_paid numeric(38,12) not null default 0,
  realized_pnl numeric(38,12),
  exit_price numeric(38,12),
  status public.position_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create index positions_user_idx on public.positions (user_id, status);
create index positions_open_idx on public.positions (status, market_id);
grant select on public.positions to authenticated;
grant all on public.positions to service_role;
alter table public.positions enable row level security;
create policy "positions_select_own" on public.positions for select to authenticated using (auth.uid() = user_id);

-- ACTIVITY FEED
create table public.pool_events (
  id bigserial primary key,
  user_id uuid,
  kind text not null,
  amount numeric(38,12),
  detail text,
  created_at timestamptz not null default now()
);
create index pool_events_time_idx on public.pool_events (created_at desc);
grant select on public.pool_events to anon, authenticated;
grant all on public.pool_events to service_role;
alter table public.pool_events enable row level security;
create policy "pool_events_select_all" on public.pool_events for select to anon, authenticated using (true);

-- HELPERS
create or replace function public.ensure_profile(_display_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_profile from public.profiles where user_id = v_uid;
  if v_profile.id is null then
    insert into public.profiles (user_id, display_name, wallet_address)
    values (v_uid, coalesce(_display_name, 'trader'), '0x' || substr(replace(v_uid::text, '-', ''), 1, 8) || '...' || substr(replace(v_uid::text, '-', ''), 25, 4))
    returning * into v_profile;
    insert into public.user_roles (user_id, role) values (v_uid, 'user') on conflict do nothing;
    insert into public.lp_positions (user_id) values (v_uid) on conflict do nothing;
  end if;
  return v_profile;
end;
$$;

create or replace function public.claim_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return public.has_role(v_uid, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (v_uid, 'admin') on conflict do nothing;
  return true;
end;
$$;

-- POOL DEPOSIT
create or replace function public.pool_deposit(_amount numeric)
returns public.lp_positions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pool public.pool_state;
  v_lp public.lp_positions;
  v_shares numeric;
  v_balance numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if _amount is null or _amount <= 0 then raise exception 'invalid amount'; end if;
  perform public.ensure_profile();

  select balance into v_balance from public.profiles where user_id = v_uid for update;
  if v_balance < _amount then raise exception 'insufficient balance'; end if;

  select * into v_pool from public.pool_state where id = 1 for update;
  if v_pool.total_shares = 0 or v_pool.total_assets = 0 then
    v_shares := _amount;
  else
    v_shares := _amount * v_pool.total_shares / v_pool.total_assets;
  end if;

  update public.profiles set balance = balance - _amount where user_id = v_uid;
  update public.pool_state
    set total_assets = total_assets + _amount,
        total_shares = total_shares + v_shares,
        updated_at = now()
    where id = 1;

  insert into public.lp_positions (user_id, shares, deposited)
    values (v_uid, v_shares, _amount)
    on conflict (user_id) do update
      set shares = public.lp_positions.shares + v_shares,
          deposited = public.lp_positions.deposited + _amount,
          updated_at = now()
    returning * into v_lp;

  insert into public.pool_events (user_id, kind, amount, detail)
    values (v_uid, 'deposit', _amount, 'liquidity added');
  return v_lp;
end;
$$;

-- POOL WITHDRAW
create or replace function public.pool_withdraw(_shares numeric)
returns public.lp_positions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pool public.pool_state;
  v_lp public.lp_positions;
  v_value numeric;
  v_idle numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if _shares is null or _shares <= 0 then raise exception 'invalid amount'; end if;

  select * into v_lp from public.lp_positions where user_id = v_uid for update;
  if v_lp.id is null or v_lp.shares < _shares then raise exception 'insufficient shares'; end if;

  select * into v_pool from public.pool_state where id = 1 for update;
  v_value := _shares * v_pool.total_assets / v_pool.total_shares;
  v_idle := v_pool.total_assets - v_pool.total_borrowed;
  if v_value > v_idle then raise exception 'pool utilization too high, not enough idle liquidity'; end if;

  update public.pool_state
    set total_assets = total_assets - v_value,
        total_shares = total_shares - _shares,
        updated_at = now()
    where id = 1;

  update public.lp_positions
    set shares = shares - _shares,
        deposited = greatest(deposited - v_value, 0),
        updated_at = now()
    where user_id = v_uid
    returning * into v_lp;

  update public.profiles set balance = balance + v_value where user_id = v_uid;

  insert into public.pool_events (user_id, kind, amount, detail)
    values (v_uid, 'withdraw', v_value, 'liquidity removed');
  return v_lp;
end;
$$;

-- OPEN POSITION
create or replace function public.open_position(_market_id uuid, _side public.position_side, _collateral numeric, _leverage numeric)
returns public.positions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_market public.markets;
  v_pool public.pool_state;
  v_balance numeric;
  v_size numeric;
  v_borrowed numeric;
  v_open_fee numeric;
  v_liq numeric;
  v_pos public.positions;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if _collateral is null or _collateral <= 0 then raise exception 'invalid collateral'; end if;
  perform public.ensure_profile();

  select * into v_market from public.markets where id = _market_id and is_active for update;
  if v_market.id is null then raise exception 'market not available'; end if;
  if _leverage < 1 or _leverage > v_market.max_leverage then
    raise exception 'leverage must be between 1x and %x', v_market.max_leverage;
  end if;

  v_size := _collateral * _leverage;
  v_borrowed := v_size - _collateral;
  v_open_fee := v_size * 0.001;

  select balance into v_balance from public.profiles where user_id = v_uid for update;
  if v_balance < _collateral + v_open_fee then raise exception 'insufficient balance'; end if;

  select * into v_pool from public.pool_state where id = 1 for update;
  if v_pool.total_assets - v_pool.total_borrowed < v_borrowed then
    raise exception 'not enough liquidity in the pool';
  end if;

  if _side = 'long' then
    v_liq := v_market.price * (1 - 0.9 / _leverage);
  else
    v_liq := v_market.price * (1 + 0.9 / _leverage);
  end if;

  update public.profiles set balance = balance - _collateral - v_open_fee where user_id = v_uid;
  update public.pool_state
    set total_borrowed = total_borrowed + v_borrowed,
        total_assets = total_assets + v_open_fee,
        fees_earned = fees_earned + v_open_fee,
        updated_at = now()
    where id = 1;

  insert into public.positions (user_id, market_id, side, collateral, leverage, size, borrowed, entry_price, liq_price, open_fee)
    values (v_uid, _market_id, _side, _collateral, _leverage, v_size, v_borrowed, v_market.price, v_liq, v_open_fee)
    returning * into v_pos;

  insert into public.pool_events (user_id, kind, amount, detail)
    values (v_uid, 'open', v_size, _leverage || 'x ' || _side::text || ' ' || v_market.symbol);
  return v_pos;
end;
$$;

-- CLOSE POSITION
create or replace function public.close_position(_position_id uuid)
returns public.positions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pos public.positions;
  v_market public.markets;
  v_hours numeric;
  v_borrow_fee numeric;
  v_pnl numeric;
  v_payout numeric;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_pos from public.positions
    where id = _position_id and user_id = v_uid and status = 'open' for update;
  if v_pos.id is null then raise exception 'position not found'; end if;

  select * into v_market from public.markets where id = v_pos.market_id for update;

  v_hours := greatest(extract(epoch from (now() - v_pos.opened_at)) / 3600.0, 0);
  v_borrow_fee := v_pos.borrowed * 0.0002 * v_hours;

  if v_pos.side = 'long' then
    v_pnl := v_pos.size * (v_market.price - v_pos.entry_price) / v_pos.entry_price;
  else
    v_pnl := v_pos.size * (v_pos.entry_price - v_market.price) / v_pos.entry_price;
  end if;

  v_payout := greatest(v_pos.collateral + v_pnl - v_borrow_fee, 0);

  update public.pool_state
    set total_borrowed = total_borrowed - v_pos.borrowed,
        total_assets = total_assets + (v_pos.collateral - v_payout),
        fees_earned = fees_earned + v_borrow_fee,
        updated_at = now()
    where id = 1;

  update public.profiles set balance = balance + v_payout where user_id = v_uid;

  update public.positions
    set status = 'closed',
        exit_price = v_market.price,
        realized_pnl = v_payout - v_pos.collateral,
        borrow_fee_paid = v_borrow_fee,
        closed_at = now()
    where id = v_pos.id
    returning * into v_pos;

  insert into public.pool_events (user_id, kind, amount, detail)
    values (v_uid, 'close', v_pos.size, 'closed ' || v_pos.side::text || ' ' || v_market.symbol);
  return v_pos;
end;
$$;

-- PRICE ENGINE + LIQUIDATIONS
create or replace function public.tick_prices()
returns setof public.markets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets;
  v_new_price numeric;
  v_pos public.positions;
begin
  for v_market in select * from public.markets where is_active for update loop
    v_new_price := greatest(v_market.price * (1 + v_market.volatility * (random() * 2 - 1)), 0.000000000001);

    update public.markets
      set price = v_new_price,
          open_price_24h = case when now() - price_24h_at > interval '24 hours' then v_new_price else open_price_24h end,
          price_24h_at = case when now() - price_24h_at > interval '24 hours' then now() else price_24h_at end
      where id = v_market.id;

    insert into public.price_ticks (market_id, price) values (v_market.id, v_new_price);

    for v_pos in
      select * from public.positions
      where status = 'open' and market_id = v_market.id
        and ((side = 'long' and v_new_price <= liq_price) or (side = 'short' and v_new_price >= liq_price))
      for update
    loop
      update public.pool_state
        set total_borrowed = total_borrowed - v_pos.borrowed,
            total_assets = total_assets + v_pos.collateral,
            fees_earned = fees_earned + v_pos.collateral,
            updated_at = now()
        where id = 1;

      update public.positions
        set status = 'liquidated',
            exit_price = v_new_price,
            realized_pnl = - v_pos.collateral,
            closed_at = now()
        where id = v_pos.id;

      insert into public.pool_events (user_id, kind, amount, detail)
        values (v_pos.user_id, 'liquidation', v_pos.collateral, v_pos.leverage || 'x ' || v_pos.side::text || ' ' || v_market.symbol || ' liquidated');
    end loop;
  end loop;

  delete from public.price_ticks
    where id in (
      select id from public.price_ticks where created_at < now() - interval '2 days'
    );

  return query select * from public.markets where is_active order by created_at;
end;
$$;

grant execute on function public.ensure_profile(text) to authenticated;
grant execute on function public.claim_admin() to authenticated;
grant execute on function public.pool_deposit(numeric) to authenticated;
grant execute on function public.pool_withdraw(numeric) to authenticated;
grant execute on function public.open_position(uuid, public.position_side, numeric, numeric) to authenticated;
grant execute on function public.close_position(uuid) to authenticated;
grant execute on function public.tick_prices() to anon, authenticated;

-- SEED: Cash Cat market + bootstrap liquidity history
insert into public.markets (symbol, name, price, open_price_24h, volatility, max_leverage, is_active)
values ('CCAT', 'Cash Cat', 0.004281, 0.003810, 0.018, 3, true);

insert into public.price_ticks (market_id, price, created_at)
select m.id, 0.004281 * (1 + 0.05 * sin(g / 4.0)), now() - (interval '2 minutes' * (60 - g))
from public.markets m, generate_series(0, 60) as g
where m.symbol = 'CCAT';

insert into public.pool_events (kind, amount, detail, created_at) values
  ('deposit', 25000, 'genesis liquidity seeded', now() - interval '3 hours'),
  ('open', 4200, '3x long CCAT', now() - interval '2 hours'),
  ('close', 1800, 'closed short CCAT', now() - interval '41 minutes');
