import { supabase } from "@/integrations/supabase/client";

export const OPEN_FEE_RATE = 0.001;
export const BORROW_FEE_HOURLY = 0.0002;
export const MAINTENANCE_FACTOR = 0.9;

export type Market = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  open_price_24h: number;
  volatility: number;
  max_leverage: number;
  is_active: boolean;
  created_at: string;
};

export type PoolState = {
  total_assets: number;
  total_borrowed: number;
  total_shares: number;
  fees_earned: number;
  updated_at: string;
};

export type LpPosition = {
  shares: number;
  deposited: number;
  updated_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string | null;
  wallet_address: string | null;
  balance: number;
};

export type Position = {
  id: string;
  market_id: string;
  side: "long" | "short";
  collateral: number;
  leverage: number;
  size: number;
  borrowed: number;
  entry_price: number;
  liq_price: number;
  open_fee: number;
  borrow_fee_paid: number;
  realized_pnl: number | null;
  exit_price: number | null;
  status: "open" | "closed" | "liquidated";
  opened_at: string;
  closed_at: string | null;
};

export type PoolEvent = {
  id: number;
  kind: string;
  amount: number | null;
  detail: string | null;
  created_at: string;
};

export type Tick = { price: number; created_at: string };

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export async function fetchMarkets(): Promise<Market[]> {
  return unwrap(
    await supabase.from("markets").select("*").order("created_at", { ascending: true }),
  ) as Market[];
}

export async function fetchPool(): Promise<PoolState> {
  return unwrap(await supabase.from("pool_state").select("*").eq("id", 1).single()) as PoolState;
}

export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}

export async function fetchLpPosition(): Promise<LpPosition | null> {
  const { data, error } = await supabase.from("lp_positions").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LpPosition | null) ?? null;
}

export async function fetchPositions(): Promise<Position[]> {
  return unwrap(
    await supabase.from("positions").select("*").order("opened_at", { ascending: false }),
  ) as Position[];
}

export async function fetchTicks(marketId: string): Promise<Tick[]> {
  const rows = unwrap(
    await supabase
      .from("price_ticks")
      .select("price, created_at")
      .eq("market_id", marketId)
      .order("created_at", { ascending: false })
      .limit(180),
  ) as Tick[];
  return [...rows].reverse();
}

export async function fetchEvents(): Promise<PoolEvent[]> {
  return unwrap(
    await supabase
      .from("pool_events")
      .select("id, kind, amount, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ) as PoolEvent[];
}

export async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function tickPrices(): Promise<void> {
  const { error } = await supabase.rpc("tick_prices");
  if (error) throw new Error(error.message);
}

export async function openPosition(input: {
  marketId: string;
  side: "long" | "short";
  collateral: number;
  leverage: number;
}): Promise<void> {
  const { error } = await supabase.rpc("open_position", {
    _market_id: input.marketId,
    _side: input.side,
    _collateral: input.collateral,
    _leverage: input.leverage,
  });
  if (error) throw new Error(error.message);
}

export async function closePosition(positionId: string): Promise<void> {
  const { error } = await supabase.rpc("close_position", { _position_id: positionId });
  if (error) throw new Error(error.message);
}

export async function depositLiquidity(amount: number): Promise<void> {
  const { error } = await supabase.rpc("pool_deposit", { _amount: amount });
  if (error) throw new Error(error.message);
}

export async function withdrawLiquidity(shares: number): Promise<void> {
  const { error } = await supabase.rpc("pool_withdraw", { _shares: shares });
  if (error) throw new Error(error.message);
}

export async function claimAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_admin");
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Unrealized PnL of an open position at the current mark price. */
export function unrealizedPnl(position: Position, markPrice: number): number {
  const direction = position.side === "long" ? 1 : -1;
  const gross =
    (position.size * (markPrice - position.entry_price) * direction) / position.entry_price;
  const hours = Math.max(0, (Date.now() - new Date(position.opened_at).getTime()) / 3_600_000);
  return gross - position.borrowed * BORROW_FEE_HOURLY * hours;
}

export function estimateLiqPrice(price: number, side: "long" | "short", leverage: number): number {
  return side === "long"
    ? price * (1 - MAINTENANCE_FACTOR / leverage)
    : price * (1 + MAINTENANCE_FACTOR / leverage);
}

export function poolMetrics(pool: PoolState) {
  const utilization = pool.total_assets > 0 ? pool.total_borrowed / pool.total_assets : 0;
  const sharePrice = pool.total_shares > 0 ? pool.total_assets / pool.total_shares : 1;
  // Annualised lender yield from borrow interest at the current utilization.
  const apy = utilization * BORROW_FEE_HOURLY * 24 * 365 * 100;
  return {
    utilization,
    sharePrice,
    apy,
    idle: pool.total_assets - pool.total_borrowed,
  };
}
