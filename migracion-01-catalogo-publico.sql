-- Paso 1: ejecutar en SQL Editor de Supabase tras guardar una copia de la base.
-- Crea una copia de lectura para la tienda, sin clientes, claves ni movimientos.
begin;
do $$ begin
  if not exists(select 1 from public.portal_state where id='main') then
    raise exception 'No se encontró portal_state/main. No se aplicaron cambios.';
  end if;
end $$;
create table if not exists public.storefront_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.storefront_state enable row level security;
revoke all on public.storefront_state from anon, authenticated;
grant select on public.storefront_state to anon, authenticated;
drop policy if exists storefront_read on public.storefront_state;
create policy storefront_read on public.storefront_state for select to anon, authenticated using (true);

create or replace function public.sync_storefront_state()
returns trigger language plpgsql security definer
set search_path = '' as $$
declare
  public_data jsonb;
begin
  if new.id <> 'main' then return new; end if;
  public_data := pg_catalog.jsonb_build_object(
    'catalog', coalesce((select jsonb_object_agg(c.key, case
      when c.value->>'hidden'='true' or c.value->>'deleted'='true' then
        jsonb_build_object('hidden',true,'deleted',c.value->'deleted')
      else (
      select coalesce(jsonb_object_agg(f.key,f.value),'{}'::jsonb)
      from jsonb_each(c.value) f where f.key=any(array[
        'name','spec','cat','usd','photo','bat','pos','hidden','deleted','custom',
        'px','py','pz','usdNew','cond','modelo','variante','desc','rows',
        'usdAntes','aviso','destacado','sinStock'
      ])
    ) end) from jsonb_each(coalesce(new.data::jsonb->'catalog','{}'::jsonb)) c),'{}'::jsonb),
    'settings', pg_catalog.jsonb_build_object(
      'rate', new.data::jsonb #> '{settings,rate}',
      'recargos', new.data::jsonb #> '{settings,recargos}',
      'finMin', new.data::jsonb #> '{settings,finMin}',
      'tarjeta', new.data::jsonb #> '{settings,tarjeta}',
      'hero', new.data::jsonb #> '{settings,hero}',
      'tjMarcas', new.data::jsonb #> '{settings,tjMarcas}',
      'mora', new.data::jsonb #> '{settings,mora}',
      'moraTope', new.data::jsonb #> '{settings,moraTope}',
      'moraGracia', new.data::jsonb #> '{settings,moraGracia}'
    ),
    'inventory', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name', item -> 'name', 'stock', 1))
      from pg_catalog.jsonb_array_elements(
        case when pg_catalog.jsonb_typeof(new.data::jsonb -> 'inventory') = 'array'
          then new.data::jsonb -> 'inventory' else '[]'::jsonb end
      ) item
      where item ->> 'stock' = '1'
    ), '[]'::jsonb)
  );
  insert into public.storefront_state (id, data, updated_at)
  values ('main', public_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at
  where public.storefront_state.data is distinct from excluded.data;
  return new;
end;
$$;
revoke all on function public.sync_storefront_state() from public;
drop trigger if exists sync_storefront_on_portal_state on public.portal_state;
create trigger sync_storefront_on_portal_state
  after insert or update of data on public.portal_state
  for each row execute function public.sync_storefront_state();

-- Completa la copia inicial sin modificar el registro original.
update public.portal_state set data = data where id = 'main';

-- Pendiente del paso de autenticación: cerrar el acceso directo a portal_state.
commit;
