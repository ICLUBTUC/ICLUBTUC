-- ICLUB 06 · Actualización completa sobre la seguridad existente. No borra clientes ni claves.
begin;
-- Aplicar una sola vez después de 01 y 02. No altera clientes ni contraseñas.
create table if not exists iclub_private.referrals (
 id integer primary key check(id=1), revision integer not null default 0,
 data jsonb not null default '{"members":{},"products":{},"sales":[]}'::jsonb
);
insert into iclub_private.referrals(id) values(1) on conflict do nothing;
revoke all on iclub_private.referrals from public,anon,authenticated;
create or replace function public.iclub_ref_read(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ph text; adm boolean; d jsonb; v integer; cat jsonb; settings jsonb;
begin
 ph:=iclub_private.session_phone(p_token);
 if ph is null then return jsonb_build_object('ok',false,'error','Tu sesión venció. Ingresá nuevamente.'); end if;
 select role='admin' into adm from iclub_private.users where phone=ph;
 select data,revision into d,v from iclub_private.referrals where id=1;
 if not adm and not coalesce((d#>>array['members',ph,'active'])::boolean,false) then
 return jsonb_build_object('ok',false,'error','Tu cuenta todavía no está habilitada como referidor. Pedile a ICLUB que la habilite.'); end if;
 select data->'catalog',data->'settings' into cat,settings from public.storefront_state where id='main';
 return jsonb_build_object('ok',true,'admin',adm,'phone',ph,'name',case when adm then 'Administrador' else d#>>array['members',ph,'name'] end,
 'revision',v,'catalog',coalesce(cat,'{}'::jsonb),'settings',coalesce(settings,'{}'::jsonb),
 'data',case when adm then d else jsonb_build_object('products',d->'products','sales',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'sales') x where x->>'referrer'=ph),'[]'::jsonb)) end);
end $$;
create or replace function public.iclub_ref_change(p_token text,p_revision integer,p_action text,p_item jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ph text; d jsonb; v integer; ident text; sale jsonb; old jsonb; amount numeric; total numeric; reward numeric; paid numeric; collected numeric;
begin
 ph:=iclub_private.session_phone(p_token);
 if ph is null or not exists(select 1 from iclub_private.users where phone=ph and role='admin' and not blocked) then
 return jsonb_build_object('ok',false,'error','Se requiere acceso de administrador.'); end if;
 select data,revision into d,v from iclub_private.referrals where id=1 for update;
 if v<>p_revision then return jsonb_build_object('ok',false,'error','Hay cambios de otro dispositivo. Actualizá antes de guardar.'); end if;
 ident:=trim(p_item->>'id');
 if ident is null or ident='' or length(ident)>100 then raise exception 'Identificador inválido'; end if;
 if p_action='member' then
 if ident='admin' or not exists(select 1 from iclub_private.users where phone=ident and role='client') then raise exception 'El celular debe tener una cuenta de cliente existente en el portal'; end if;
 if coalesce(trim(p_item->>'name'),'')='' then raise exception 'Ingresá el nombre'; end if;
 d:=jsonb_set(d,array['members',ident],jsonb_build_object('name',left(p_item->>'name',100),'active',coalesce((p_item->>'active')::boolean,false)));
 elsif p_action='product' then
 amount:=(p_item->>'commission')::numeric;
 if amount is null or amount<0 or amount>10000000 then raise exception 'Comisión inválida'; end if;
 if p_item->>'currency' not in ('USD','ARS') or p_item->>'availability' not in ('stock','order') then raise exception 'Moneda o disponibilidad inválida'; end if;
 d:=jsonb_set(d,array['products',ident],jsonb_build_object('commission',amount,'currency',p_item->>'currency','availability',p_item->>'availability','delivery',left(coalesce(p_item->>'delivery','A confirmar'),120),'details',left(coalesce(p_item->>'details',''),600),'enabled',coalesce((p_item->>'enabled')::boolean,false)));
 elsif p_action='sale' then
 if exists(select 1 from jsonb_array_elements(d->'sales') x where x->>'id'=ident) then raise exception 'La venta ya existe'; end if;
 if not coalesce((d#>>array['members',p_item->>'referrer','active'])::boolean,false) then raise exception 'Referidor no habilitado'; end if;
 old:=d#>array['products',p_item->>'product'];
 if not coalesce((old->>'enabled')::boolean,false) then raise exception 'Equipo no habilitado'; end if;
 total:=(p_item->>'total')::numeric;
 if total is null or total<=0 or total>100000000000 then raise exception 'Total inválido'; end if;
 if p_item->>'currency' not in ('USD','ARS') then raise exception 'Moneda inválida'; end if;
 sale:=jsonb_build_object('id',ident,'referrer',p_item->>'referrer','product',p_item->>'product','label',left(p_item->>'label',150),'client',left(p_item->>'client',100),'total',total,'currency',p_item->>'currency','commission',old->'commission','commissionCurrency',old->'currency','collected',0,'paid',0,'delivered',false,'created',now(),'history','[]'::jsonb);
 d:=jsonb_set(d,'{sales}',(d->'sales')||jsonb_build_array(sale));
 elsif p_action='receipt' or p_action='payout' or p_action='deliver' then
 select x into sale from jsonb_array_elements(d->'sales') x where x->>'id'=ident;
 if sale is null then raise exception 'Venta inexistente'; end if;
 total:=(sale->>'total')::numeric; reward:=(sale->>'commission')::numeric; paid:=(sale->>'paid')::numeric; collected:=(sale->>'collected')::numeric;
 amount:=coalesce((p_item->>'amount')::numeric,0);
 if p_action='receipt' then
 if amount<=0 or collected+amount>total then raise exception 'El cobro debe ser positivo y no superar el saldo'; end if;
 sale:=jsonb_set(sale,'{collected}',to_jsonb(collected+amount));
 elsif p_action='payout' then
 if not (sale->>'delivered')::boolean or amount<=0 or paid+amount>round(reward*collected/total,2) then raise exception 'El pago supera la comisión disponible o falta confirmar la entrega'; end if;
 sale:=jsonb_set(sale,'{paid}',to_jsonb(paid+amount));
 else sale:=jsonb_set(sale,'{delivered}','true'); end if;
 sale:=jsonb_set(sale,'{history}',(sale->'history')||jsonb_build_array(jsonb_build_object('action',p_action,'amount',amount,'at',now())));
 d:=jsonb_set(d,'{sales}',(select jsonb_agg(case when x->>'id'=ident then sale else x end) from jsonb_array_elements(d->'sales') x));
 else raise exception 'Operación inválida'; end if;
 update iclub_private.referrals set data=d,revision=v+1 where id=1;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.iclub_ref_read(text),public.iclub_ref_change(text,integer,text,jsonb) from public;
grant execute on function public.iclub_ref_read(text),public.iclub_ref_change(text,integer,text,jsonb) to anon,authenticated;

-- Aplicar DESPUÉS de 04. No elimina datos ni cambia contraseñas.
create or replace function iclub_private.save_core(p_token text,p_data jsonb,p_expected_version timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ph text; v timestamptz; e record; cleaned jsonb; clients jsonb:='{}'; source text;
begin
  ph:=iclub_private.session_phone(p_token);
  if not exists(select 1 from iclub_private.users where phone=ph and role='admin') then
    return jsonb_build_object('ok',false,'error','Esta operación requiere una sesión de administrador.');
  end if;
  select updated_at into v from public.portal_state where id='main' for update;
  if p_expected_version is null or v is distinct from p_expected_version then
    return jsonb_build_object('ok',false,'error','Otro dispositivo guardó cambios. Recargá antes de volver a editar. Tus cambios pendientes se conservan en esta pantalla.');
  end if;
  if jsonb_typeof(p_data->'clients') is distinct from 'object' or jsonb_typeof(p_data->'catalog') is distinct from 'object' then
    return jsonb_build_object('ok',false,'error','Formato de datos inválido.');
  end if;
  for e in select key,value from jsonb_each(p_data->'clients') loop
    if e.key='admin' then return jsonb_build_object('ok',false,'error','El teléfono admin está reservado.'); end if;
    source:=e.value->>'auth_source';
    if coalesce(e.value->>'pass','')<>'' then
      if length(e.value->>'pass')<8 or octet_length(e.value->>'pass')>72 then
        return jsonb_build_object('ok',false,'error','Las nuevas claves de clientes deben tener al menos 8 caracteres y como máximo 72 bytes.');
      end if;
    end if;
  end loop;
  for e in select key,value from jsonb_each(p_data->'clients') loop
    source:=e.value->>'auth_source';
    if source is not null and source<>e.key and exists(select 1 from iclub_private.users where phone=source and role='client') then
      if exists(select 1 from iclub_private.users where phone=e.key) then raise exception 'El celular de destino ya tiene una cuenta'; end if;
      update iclub_private.users set phone=e.key where phone=source and role='client';
    end if;
    if coalesce(e.value->>'pass','')<>'' then
      insert into iclub_private.users(phone,password_hash,role,blocked)
      values(e.key,extensions.crypt(e.value->>'pass',extensions.gen_salt('bf',10)),'client',coalesce((e.value->>'blocked')::boolean,false))
      on conflict(phone) do update set password_hash=excluded.password_hash,blocked=excluded.blocked;
      delete from iclub_private.sessions where phone=e.key;
    else
      update iclub_private.users set blocked=coalesce((e.value->>'blocked')::boolean,false) where phone=e.key and role='client';
    end if;
    clients:=clients || jsonb_build_object(e.key,e.value-'pass'-'auth_source');
  end loop;
  delete from iclub_private.users where role='client' and not (p_data->'clients' ? phone);
  cleaned:=jsonb_set(p_data,'{clients}',clients);
  v:=clock_timestamp();
  update public.portal_state set data=cleaned,updated_at=v where id='main';
  return jsonb_build_object('ok',true,'data',cleaned,'version',v);
end $$;
create or replace function iclub_private.ref_core(p_token text,p_revision integer,p_action text,p_item jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ph text; d jsonb; v integer; ident text; sale jsonb; old jsonb; amount numeric; total numeric; reward numeric; paid numeric; collected numeric;
begin
 ph:=iclub_private.session_phone(p_token);
 if ph is null or not exists(select 1 from iclub_private.users where phone=ph and role='admin' and not blocked) then
 return jsonb_build_object('ok',false,'error','Se requiere acceso de administrador.'); end if;
 select data,revision into d,v from iclub_private.referrals where id=1 for update;
 if v<>p_revision then return jsonb_build_object('ok',false,'error','Hay cambios de otro dispositivo. Actualizá antes de guardar.'); end if;
 ident:=trim(p_item->>'id');
 if ident is null or ident='' or length(ident)>100 then raise exception 'Identificador inválido'; end if;
 if p_action='member' then
 if ident='admin' or not exists(select 1 from iclub_private.users where phone=ident and role='client') then raise exception 'El celular debe tener una cuenta de cliente existente en el portal'; end if;
 if coalesce(trim(p_item->>'name'),'')='' then raise exception 'Ingresá el nombre'; end if;
 d:=jsonb_set(d,array['members',ident],jsonb_build_object('name',left(p_item->>'name',100),'active',coalesce((p_item->>'active')::boolean,false)));
 elsif p_action='product' then
 amount:=(p_item->>'commission')::numeric;
 if amount is null or amount<0 or amount>10000000 then raise exception 'Comisión inválida'; end if;
 if p_item->>'currency' not in ('USD','ARS') or p_item->>'availability' not in ('stock','order') then raise exception 'Moneda o disponibilidad inválida'; end if;
 d:=jsonb_set(d,array['products',ident],jsonb_build_object('commission',amount,'currency',p_item->>'currency','availability',p_item->>'availability','delivery',left(coalesce(p_item->>'delivery','A confirmar'),120),'details',left(coalesce(p_item->>'details',''),600),'enabled',coalesce((p_item->>'enabled')::boolean,false)));
 elsif p_action='sale' then
 if exists(select 1 from jsonb_array_elements(d->'sales') x where x->>'id'=ident) then raise exception 'La venta ya existe'; end if;
 if not coalesce((d#>>array['members',p_item->>'referrer','active'])::boolean,false) then raise exception 'Referidor no habilitado'; end if;
 old:=d#>array['products',p_item->>'product'];
 if not coalesce((old->>'enabled')::boolean,false) then raise exception 'Equipo no habilitado'; end if;
 total:=(p_item->>'total')::numeric;
 if total is null or total<=0 or total>100000000000 then raise exception 'Total inválido'; end if;
 if p_item->>'currency' not in ('USD','ARS') then raise exception 'Moneda inválida'; end if;
 sale:=jsonb_build_object('id',ident,'referrer',p_item->>'referrer','product',p_item->>'product','label',left(p_item->>'label',150),'client',left(p_item->>'client',100),'total',total,'currency',p_item->>'currency','commission',old->'commission','commissionCurrency',old->'currency','collected',0,'paid',0,'delivered',false,'created',now(),'history','[]'::jsonb);
 d:=jsonb_set(d,'{sales}',(d->'sales')||jsonb_build_array(sale));
 elsif p_action='receipt' or p_action='payout' or p_action='deliver' then
 select x into sale from jsonb_array_elements(d->'sales') x where x->>'id'=ident;
 if sale is null then raise exception 'Venta inexistente'; end if;
 total:=(sale->>'total')::numeric; reward:=(sale->>'commission')::numeric; paid:=(sale->>'paid')::numeric; collected:=(sale->>'collected')::numeric;
 amount:=coalesce((p_item->>'amount')::numeric,0);
 if p_action='receipt' then
 if amount<=0 or collected+amount>total then raise exception 'El cobro debe ser positivo y no superar el saldo'; end if;
 sale:=jsonb_set(sale,'{collected}',to_jsonb(collected+amount));
 elsif p_action='payout' then
 if not (sale->>'delivered')::boolean or amount<=0 or paid+amount>round(reward*collected/total,2) then raise exception 'El pago supera la comisión disponible o falta confirmar la entrega'; end if;
 sale:=jsonb_set(sale,'{paid}',to_jsonb(paid+amount));
 else sale:=jsonb_set(sale,'{delivered}','true'); end if;
 sale:=jsonb_set(sale,'{history}',(sale->'history')||jsonb_build_array(jsonb_build_object('action',p_action,'amount',amount,'at',now())));
 d:=jsonb_set(d,'{sales}',(select jsonb_agg(case when x->>'id'=ident then sale else x end) from jsonb_array_elements(d->'sales') x));
 else raise exception 'Operación inválida'; end if;
 update iclub_private.referrals set data=d,revision=v+1 where id=1;
 return jsonb_build_object('ok',true);
end $$;
create or replace function iclub_private.wallet_totals(d jsonb) returns table(wallet text,amount numeric)
language sql set search_path='' as $$
 select w,sum(a) from (
 select case when m->>'met' ilike '%transfer%' then 'ARS-Transferencia' else 'ARS-Efectivo' end w,(m->>'imp')::numeric a
 from jsonb_each(coalesce(d->'clients','{}')) c cross join lateral jsonb_array_elements(coalesce(c.value->'movs','[]')) m
 where m->>'tipo'='Pago' and coalesce(m->>'met','') not in ('Plan canje','Tarjeta pendiente')
 union all
 select coalesce(g->>'wallet',case when g->>'met' ilike '%transfer%' then 'ARS-Transferencia' else 'ARS-Efectivo' end),-coalesce((g->>'walletAmount')::numeric,(g->>'monto')::numeric,0)
 from jsonb_array_elements(coalesce(d->'gastos','[]')) g
 ) q group by w
$$;
create or replace function public.iclub_save_state(p_token text,p_data jsonb,p_expected_version timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare before_db jsonb; result jsonb; d jsonb; refs jsonb; sale jsonb; vs jsonb; pm jsonb; c jsonb; received numeric; arr jsonb:='[]'; e record; entries jsonb; changed boolean:=false;
begin
 -- Lock order is portal then referrals for every operation.
 select data into before_db from public.portal_state where id='main' for update;
 result:=iclub_private.save_core(p_token,p_data,p_expected_version);
 if not coalesce((result->>'ok')::boolean,false) then return result; end if;
 d:=result->'data';
 if d ? 'cashOpening' then
 entries:=coalesce(d->'cashEntries','[]');
 for e in select coalesce(n.wallet,o.wallet) wallet,coalesce(n.amount,0)-coalesce(o.amount,0) delta from iclub_private.wallet_totals(d) n full join iclub_private.wallet_totals(before_db) o using(wallet) loop
 if e.delta<>0 then entries:=entries||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'wallet',e.wallet,'amount',e.delta,'at',now(),'reason','Cobros / gastos registrados')); end if;
 end loop;
 d:=jsonb_set(d,'{cashEntries}',entries);
 end if;
 select data into refs from iclub_private.referrals where id=1 for update;
 for sale in select value from jsonb_array_elements(coalesce(refs->'sales','[]')) loop
 if coalesce((sale->>'linked')::boolean,false) then
 select value into vs from jsonb_array_elements(coalesce(d->'ventas','[]')) where value->>'id'=sale->>'id';
 if vs is null or (vs->>'ventaArs')::numeric<>(sale->>'total')::numeric then raise exception 'Una venta vinculada a Referidos no puede eliminarse ni cambiar de total. Registrá los cobros en su cuenta.'; end if;
 c:=d#>array['clients',vs->>'clientKey'];
 select value into pm from jsonb_array_elements(coalesce(c->'movs','[]')) where value->>'grp'=sale->>'id' and value->>'tipo'='Compra';
 if pm is null then raise exception 'No se puede quitar la compra de una venta referida'; end if;
 select coalesce(sum((m->>'imp')::numeric),0) into received from jsonb_array_elements(coalesce(c->'movs','[]')) m where m->>'tipo'='Pago' and (m->>'grp'=sale->>'id' or m->>'plan'=pm->>'doc');
 received:=least((sale->>'total')::numeric,greatest(0,received));
 if coalesce((sale->>'delivered')::boolean,false) and (sale->>'paid')::numeric>round((sale->>'commission')::numeric*received/(sale->>'total')::numeric,2) then raise exception 'No se puede reducir el cobro: ya hay comisión pagada. Revisá primero esa operación.'; end if;
 if received<>(sale->>'collected')::numeric then sale:=jsonb_set(sale,'{collected}',to_jsonb(received));changed:=true;end if;
 end if;
 arr:=arr||jsonb_build_array(sale);
 end loop;
 if changed then update iclub_private.referrals set data=jsonb_set(refs,'{sales}',arr),revision=revision+1 where id=1;end if;
 update public.portal_state set data=d where id='main';
 return jsonb_set(result,'{data}',d);
end $$;
create or replace function public.iclub_ref_change(p_token text,p_revision integer,p_action text,p_item jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; rule jsonb; d jsonb; s jsonb; amount numeric; reward numeric; total numeric; cash numeric; cost numeric; extra numeric; fc numeric; pct numeric; v timestamptz; pd jsonb; g jsonb;
begin
 if not exists(select 1 from iclub_private.users where phone=iclub_private.session_phone(p_token) and role='admin') then return jsonb_build_object('ok',false,'error','Se requiere acceso de administrador.');end if;
 select data,updated_at into pd,v from public.portal_state where id='main' for update;
 select data into d from iclub_private.referrals where id=1 for update;
 rule:=d#>array['products',p_item->>'product'];
 if p_action='receipt' and exists(select 1 from jsonb_array_elements(d->'sales') x where x->>'id'=p_item->>'id' and coalesce((x->>'linked')::boolean,false)) then raise exception 'Registrá este cobro en la cuenta del cliente: la comisión se actualiza automáticamente.';end if;
 if p_action='product' then
 pct:=coalesce((p_item->>'percent')::numeric,0);
 if pct<0 or pct>100 or coalesce(p_item->>'mode','fixed') not in ('fixed','percent') then raise exception 'Porcentaje inválido';end if;
 end if;
 result:=iclub_private.ref_core(p_token,p_revision,p_action,p_item);
 if not coalesce((result->>'ok')::boolean,false) then return result;end if;
 select data into d from iclub_private.referrals where id=1;
 if p_action='product' then
 rule:=d#>array['products',p_item->>'id'];
 rule:=rule||jsonb_build_object('mode',coalesce(p_item->>'mode','fixed'),'percent',pct,'includeFinance',coalesce((p_item->>'includeFinance')::boolean,false));
 d:=jsonb_set(d,array['products',p_item->>'id'],rule);
 elsif p_action='sale' then
 if rule->>'mode'='percent' then
 total:=(p_item->>'total')::numeric;cash:=(p_item->>'cashArs')::numeric;cost:=(p_item->>'costArs')::numeric;extra:=coalesce((p_item->>'extraCosts')::numeric,0);fc:=coalesce((p_item->>'financeCosts')::numeric,0);
 if p_item->>'currency'<>'ARS' or cash is null or cost is null or cash<=0 or cost<0 or extra<0 or fc<0 or cash>total then raise exception 'Para comisión porcentual completá contado, costo y gastos en ARS';end if;
 reward:=greatest(0,cash-cost-extra);
 if coalesce((rule->>'includeFinance')::boolean,false) then reward:=reward+greatest(0,total-cash-fc);end if;
 reward:=round(reward*(rule->>'percent')::numeric/100,2);
 end if;
 select x into s from jsonb_array_elements(d->'sales') x where x->>'id'=p_item->>'id';
 if rule->>'mode'='percent' then s:=s||jsonb_build_object('commission',reward,'commissionCurrency','ARS','commissionMode','percent','percent',rule->'percent','includeFinance',rule->'includeFinance');end if;
 s:=s||jsonb_build_object('linked',coalesce((p_item->>'linked')::boolean,false),'delivered',coalesce((p_item->>'delivered')::boolean,false));
 d:=jsonb_set(d,'{sales}',(select jsonb_agg(case when x->>'id'=p_item->>'id' then s else x end) from jsonb_array_elements(d->'sales') x));
 elsif p_action='deliver' then
 pd:=jsonb_set(pd,'{ventas}',coalesce((select jsonb_agg(case when x->>'id'=p_item->>'id' then x||'{"delivered":true}'::jsonb else x end) from jsonb_array_elements(coalesce(pd->'ventas','[]')) x),'[]'::jsonb));
 elsif p_action='payout' then
 select x into s from jsonb_array_elements(d->'sales') x where x->>'id'=p_item->>'id';
 amount:=(p_item->>'amount')::numeric;
 g:=jsonb_build_object('id',gen_random_uuid(),'f',to_char(now() at time zone 'America/Argentina/Buenos_Aires','DD/MM/YYYY'),'concepto','Comisión referidor · '||(s->>'label'),'cat','Comisiones','monto',round(amount*case when s->>'commissionCurrency'='USD' then coalesce((pd#>>'{settings,rate}')::numeric,1520) else 1 end,2),'wallet',(s->>'commissionCurrency')||'-Efectivo','walletAmount',amount,'refSale',s->>'id');
 pd:=jsonb_set(pd,'{gastos}',coalesce(pd->'gastos','[]')||jsonb_build_array(g));
 end if;
 update iclub_private.referrals set data=d where id=1;
 if p_action in ('payout','deliver') then
 result:=public.iclub_save_state(p_token,pd,v);if not (result->>'ok')::boolean then raise exception '%',result->>'error';end if;
 end if;
 return jsonb_build_object('ok',true);
end $$;
create or replace function public.iclub_checkout(p_token text,p_data jsonb,p_expected_version timestamptz,p_revision integer,p_ref jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; tmp jsonb;
begin
 perform id from public.portal_state where id='main' for update;
 if p_ref is not null and p_ref<>'null'::jsonb then
 -- Save client first, then reference sale, then sync its receipts; all roll back together.
 result:=public.iclub_save_state(p_token,p_data,p_expected_version);
 if not coalesce((result->>'ok')::boolean,false) then return result;end if;
 tmp:=public.iclub_ref_change(p_token,p_revision,'sale',p_ref||'{"linked":true}'::jsonb);
 if not coalesce((tmp->>'ok')::boolean,false) then raise exception '%',tmp->>'error';end if;
 result:=public.iclub_save_state(p_token,result->'data',(result->>'version')::timestamptz);
 if not coalesce((result->>'ok')::boolean,false) then raise exception '%',result->>'error';end if;
 return result;
 end if;
 return public.iclub_save_state(p_token,p_data,p_expected_version);
end $$;
revoke all on all functions in schema iclub_private from public,anon,authenticated;
revoke all on function public.iclub_checkout(text,jsonb,timestamptz,integer,jsonb) from public;
grant execute on function public.iclub_checkout(text,jsonb,timestamptz,integer,jsonb) to anon,authenticated;

create or replace function public.iclub_management_version(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from iclub_private.users where phone=iclub_private.session_phone(p_token) and role='admin') then return jsonb_build_object('ok',false,'error','Ingresá como administrador.');end if;
 return jsonb_build_object('ok',true,'version',6);
end $$;
create or replace function public.iclub_ref_member_create(p_token text,p_revision integer,p_name text,p_phone text,p_password text,p_existing boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d jsonb;v timestamptz;ph text;existing_user boolean;res jsonb;c jsonb;
begin
 if not exists(select 1 from iclub_private.users where phone=iclub_private.session_phone(p_token) and role='admin') then return jsonb_build_object('ok',false,'error','Se requiere acceso de administrador.');end if;
 ph:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if length(ph)<6 or length(ph)>20 or length(trim(coalesce(p_name,'')))<1 then raise exception 'Completá nombre y celular válido';end if;
 select data,updated_at into d,v from public.portal_state where id='main' for update;
 perform id from iclub_private.referrals where id=1 for update;
 if exists(select 1 from iclub_private.users where phone=ph and role<>'client') then raise exception 'Esta cuenta no se puede habilitar como referidor';end if;
 existing_user:=exists(select 1 from iclub_private.users where phone=ph and role='client');
 if existing_user and not coalesce(p_existing,false) then raise exception 'Este celular ya tiene cuenta. Marcá Usar cuenta existente para habilitarla sin cambiar su clave.';end if;
 if not existing_user and coalesce(p_existing,false) then raise exception 'No hay una cuenta con ese celular. Desmarcá Usar cuenta existente y creá su contraseña.';end if;
 c:=coalesce(d#>array['clients',ph],jsonb_build_object('movs','[]'::jsonb,'blocked',false,'lim',0,'createdAt',now()));
 if coalesce((c->>'blocked')::boolean,false) then raise exception 'La cuenta está bloqueada. Revisala en Clientes antes de habilitarla.';end if;
 c:=c||jsonb_build_object('name',left(trim(p_name),100));
 if not existing_user then
 if p_password is null or length(p_password)<8 or octet_length(p_password)>72 then raise exception 'La clave debe tener al menos 8 caracteres y como máximo 72 bytes';end if;
 c:=c||jsonb_build_object('pass',p_password);
 end if;
 d:=jsonb_set(d,array['clients',ph],c);
 res:=public.iclub_save_state(p_token,d,v);if not coalesce((res->>'ok')::boolean,false) then raise exception '%',res->>'error';end if;
 res:=public.iclub_ref_change(p_token,p_revision,'member',jsonb_build_object('id',ph,'name',trim(p_name),'active',true));
 if not coalesce((res->>'ok')::boolean,false) then raise exception '%',res->>'error';end if;
 return jsonb_build_object('ok',true);
end $$;
create or replace function public.iclub_ref_product_create(p_token text,p_revision integer,p_item jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d jsonb;v timestamptz;ident text;price numeric;res jsonb;
begin
 if not exists(select 1 from iclub_private.users where phone=iclub_private.session_phone(p_token) and role='admin') then return jsonb_build_object('ok',false,'error','Se requiere acceso de administrador.');end if;
 ident:=p_item->>'id';price:=(p_item->>'usd')::numeric;
 if ident is null or ident !~ '^[A-Za-z0-9_-]{1,100}$' or coalesce(trim(p_item->>'name'),'')='' or price is null or price<=0 or price>10000000 then raise exception 'Completá nombre y precio USD válido';end if;
 select data,updated_at into d,v from public.portal_state where id='main' for update;
 perform id from iclub_private.referrals where id=1 for update;
 if coalesce(d->'catalog','{}') ? ident then raise exception 'El identificador ya existe';end if;
 d:=jsonb_set(d,array['catalog',ident],jsonb_build_object('custom',true,'name',left(trim(p_item->>'name'),120),'spec',left(coalesce(p_item->>'spec',''),250),'cat',left(coalesce(p_item->>'cat','Otro'),80),'usd',price,'hidden',false,'stock',0));
 res:=public.iclub_save_state(p_token,d,v);if not coalesce((res->>'ok')::boolean,false) then raise exception '%',res->>'error';end if;
 res:=public.iclub_ref_change(p_token,p_revision,'product',jsonb_build_object('id',ident,'commission',0,'currency','USD','availability','order','enabled',false,'mode','fixed'));
 if not coalesce((res->>'ok')::boolean,false) then raise exception '%',res->>'error';end if;
 return jsonb_build_object('ok',true,'id',ident);
end $$;
revoke all on function public.iclub_management_version(text),public.iclub_ref_member_create(text,integer,text,text,text,boolean),public.iclub_ref_product_create(text,integer,jsonb) from public;
grant execute on function public.iclub_management_version(text),public.iclub_ref_member_create(text,integer,text,text,text,boolean),public.iclub_ref_product_create(text,integer,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
-- Al final debe aparecer version_instalada = 6 y los nombres de las funciones.
select 6 as version_instalada,to_regprocedure('public.iclub_ref_read(text)') as lectura_referidos,to_regprocedure('public.iclub_ref_member_create(text,integer,text,text,text,boolean)') as alta_referidores;
