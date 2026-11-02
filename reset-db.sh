#!/bin/bash
# Crea una base limpia "iclub" con el esquema de producción (01 + 02 + ACTUALIZAR) y, si se pide, la migración nueva.
set -e
ROOT=${ROOT:-/home/claude/work/full}
P="psql -h /tmp -p 5433 -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists iclub" -c "create database iclub" >/dev/null
$P -d iclub >/dev/null <<SQL
do \$\$ begin create role anon; exception when duplicate_object then null; end \$\$;
do \$\$ begin create role authenticated; exception when duplicate_object then null; end \$\$;
create schema extensions; create extension pgcrypto schema extensions;
create table portal_state(id text primary key,data jsonb,updated_at timestamptz default now());
create publication supabase_realtime for table public.portal_state;
insert into portal_state(id,data) values('main','{"clients":{},"catalog":{},"inventory":[],"settings":{"rate":1500},"ventas":[],"nextRc":1,"nextFa":1}');
SQL
for f in migracion-01-catalogo-publico.sql migraciones/02-seguridad.sql ACTUALIZAR-SUPABASE.sql "$@"; do $P -d iclub -f "$ROOT/$f" >/dev/null; done
$P -d iclub -tAc "select iclub_set_admin_password('qa-admin-password')" >/dev/null
echo ok
