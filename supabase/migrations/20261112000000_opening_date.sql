-- Beauty Shelf — Home v2, phase 3: when you opened something and how long it lasts.
--
-- Two private columns on library_items. Expiry is not stored: it is opened_on plus
-- lasts_months, worked out in the app (src/domain/library.ts), so changing either
-- never leaves a stale date behind. Opening something is logged as an 'opened' event
-- so it shows in Home's recent activity (D24).

alter table public.library_items
  add column if not exists opened_on date,
  add column if not exists lasts_months smallint;

alter table public.library_items drop constraint if exists library_items_lasts_months_range;
alter table public.library_items add constraint library_items_lasts_months_range
  check (lasts_months is null or lasts_months between 1 and 60);

-- Experience columns are editable by their owner (D9); RLS already limits rows.
grant insert (opened_on, lasts_months), update (opened_on, lasts_months)
  on public.library_items to authenticated;

alter type public.product_event_type add value if not exists 'opened';

-- Same as before, plus an 'opened' event the first time an opening date is set.
-- One update can change both the status and the date; each gets its own event.
create or replace function public.library_items_log_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ev public.product_event_type;
begin
  if tg_op = 'INSERT' then
    insert into public.product_events (library_item_id, user_id, event_type, to_status)
    values (new.id, new.user_id, 'added', new.ownership_status);
    if new.opened_on is not null then
      insert into public.product_events (library_item_id, user_id, event_type, to_status, metadata)
      values (new.id, new.user_id, 'opened', new.ownership_status, jsonb_build_object('opened_on', new.opened_on));
    end if;
    return null;
  end if;

  if new.ownership_status is distinct from old.ownership_status then
    ev := case
      when new.ownership_status = 'finished' then 'finished'
      when old.ownership_status = 'finished' and new.ownership_status = 'owned' then 'repurchased'
      else 'status_changed'
    end;
    insert into public.product_events (library_item_id, user_id, event_type, from_status, to_status)
    values (new.id, new.user_id, ev, old.ownership_status, new.ownership_status);
  end if;
  if old.opened_on is null and new.opened_on is not null then
    insert into public.product_events (library_item_id, user_id, event_type, to_status, metadata)
    values (new.id, new.user_id, 'opened', new.ownership_status, jsonb_build_object('opened_on', new.opened_on));
  end if;
  return null;
end $$;

create or replace trigger library_items_events after insert or update of ownership_status, opened_on
  on public.library_items for each row execute function public.library_items_log_event();
