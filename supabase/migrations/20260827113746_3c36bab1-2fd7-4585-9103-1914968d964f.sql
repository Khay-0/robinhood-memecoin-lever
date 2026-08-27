revoke execute on function public.ensure_profile(text) from public, anon;
revoke execute on function public.claim_admin() from public, anon;
revoke execute on function public.pool_deposit(numeric) from public, anon;
revoke execute on function public.pool_withdraw(numeric) from public, anon;
revoke execute on function public.open_position(uuid, public.position_side, numeric, numeric) from public, anon;
revoke execute on function public.close_position(uuid) from public, anon;
revoke execute on function public.tick_prices() from public, anon;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;