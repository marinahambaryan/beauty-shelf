-- Beauty Shelf — admin console support (D22).
--
-- The console (beauty-shelf-admin) holds no service-role key: it signs in as an ordinary user
-- and every read and write goes through the admin_* functions below, each of which checks the
-- caller against public.admins first. Users' table grants do not change: the catalogue stays
-- read-only to them.
--
-- Privacy: libraries, notes and products added manually stay private. A product only reaches
-- an admin when its owner sends it with submit_personal_product, which copies what they chose
-- to share into catalog_submissions. The admin functions return counts about a person, never
-- the contents of their library, and not their display name (the app says only they see it).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

do $$ begin
  create type public.submission_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.catalog_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Deleting the product withdraws the submission.
  personal_product_id uuid not null references public.personal_products (id) on delete cascade,
  -- A copy of what the person shared; later edits to their product do not change it.
  brand_name text not null,
  name text not null,
  category public.product_category not null,
  variant_label text,
  image_path text,
  note text check (note is null or char_length(note) <= 500),
  status public.submission_status not null default 'pending',
  -- Shown to the person when a submission is rejected.
  review_note text check (review_note is null or char_length(review_note) <= 500),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists catalog_submissions_one_pending
  on public.catalog_submissions (personal_product_id) where status = 'pending';
create index if not exists catalog_submissions_status on public.catalog_submissions (status, created_at);
create index if not exists catalog_submissions_user on public.catalog_submissions (user_id);

-- Append-only record of what admins did. Summaries name products, never people's emails, so
-- nothing personal outlives a deleted account.
create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_recent on public.admin_activity (created_at desc);

alter table public.admins              enable row level security;
alter table public.catalog_submissions enable row level security;
alter table public.admin_activity      enable row level security;

-- New tables can inherit broad default grants on Supabase. Start from zero.
revoke all on public.admins, public.catalog_submissions, public.admin_activity from anon, authenticated;

-- People can read their own submissions, including the reason for a rejection.
grant select (id, personal_product_id, brand_name, name, category, variant_label, note, status,
              review_note, reviewed_at, product_id, variant_id, created_at)
  on public.catalog_submissions to authenticated;
drop policy if exists own_rows_read on public.catalog_submissions;
create policy own_rows_read on public.catalog_submissions for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

create or replace function public.assert_admin()
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501', hint = 'This account doesn''t have admin access.';
  end if;
end $$;

create or replace function public.record_admin_action(
  p_action text, p_target_type text, p_target_id uuid, p_summary text
)
returns void
language sql security definer set search_path = public as $$
  insert into public.admin_activity (actor_id, action, target_type, target_id, summary)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_summary);
$$;

create or replace function public.ensure_brand(p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_name = '' then
    raise exception 'brand_required' using errcode = 'P0001', hint = 'Add a brand.';
  end if;
  insert into public.brands (name) values (v_name) on conflict (normalized_name) do nothing returning id into v_id;
  if v_id is null then
    select b.id into v_id from public.brands b where b.normalized_name = lower(v_name);
  end if;
  return v_id;
end $$;

-- Every whitespace-separated term becomes an escaped ILIKE pattern, as in search_catalog.
create or replace function public.search_patterns(p_query text)
returns text[]
language sql immutable as $$
  select array_agg('%' || replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%')
  from unnest(regexp_split_to_array(lower(btrim(coalesce(p_query, ''))), '\s+')) t
  where t <> '';
$$;

create or replace function public.submission_has_pending_photo(p_name text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.catalog_submissions s where s.image_path = p_name and s.status = 'pending'
  );
$$;

-- ---------------------------------------------------------------------------
-- Storage: admins manage catalogue images, and can see only the photos people sent for review.
-- ---------------------------------------------------------------------------
drop policy if exists "catalog images: admins add" on storage.objects;
create policy "catalog images: admins add" on storage.objects for insert to authenticated
  with check (bucket_id = 'catalog-images' and public.is_admin());
drop policy if exists "catalog images: admins change" on storage.objects;
create policy "catalog images: admins change" on storage.objects for update to authenticated
  using (bucket_id = 'catalog-images' and public.is_admin())
  with check (bucket_id = 'catalog-images' and public.is_admin());
drop policy if exists "catalog images: admins delete" on storage.objects;
create policy "catalog images: admins delete" on storage.objects for delete to authenticated
  using (bucket_id = 'catalog-images' and public.is_admin());
drop policy if exists "photos: admins read submitted" on storage.objects;
create policy "photos: admins read submitted" on storage.objects for select to authenticated
  using (bucket_id = 'product-photos' and public.is_admin() and public.submission_has_pending_photo(name));

-- ---------------------------------------------------------------------------
-- For the app: send a product added manually to be considered for the catalogue.
-- ---------------------------------------------------------------------------
create or replace function public.submit_personal_product(p_personal_product_id uuid, p_note text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p public.personal_products;
  v_id uuid;
begin
  select * into p from public.personal_products
   where id = p_personal_product_id and user_id = auth.uid();
  if p.id is null then
    raise exception 'product not found' using errcode = 'P0002';
  end if;
  if p.linked_variant_id is not null then
    raise exception 'already_in_catalogue' using errcode = 'P0001', hint = 'This product is already in the catalogue.';
  end if;
  if (select count(*) from public.catalog_submissions s
       where s.user_id = auth.uid() and s.status = 'pending') >= 20 then
    raise exception 'too_many_pending' using errcode = 'P0001',
      hint = 'You have 20 products waiting for review. Try again once some are reviewed.';
  end if;

  insert into public.catalog_submissions
    (user_id, personal_product_id, brand_name, name, category, variant_label, image_path, note)
  values (p.user_id, p.id, p.brand_name, p.name, p.category, p.variant_label, p.image_path, nullif(btrim(p_note), ''))
  on conflict (personal_product_id) where status = 'pending' do nothing
  returning id into v_id;

  if v_id is null then
    select s.id into v_id from public.catalog_submissions s
     where s.personal_product_id = p.id and s.status = 'pending';
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Overview
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'pending', (select count(*) from public.catalog_submissions where status = 'pending'),
    'products', (select count(*) from public.products where catalog_status = 'active'),
    'people', (select count(*) from public.profiles)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Review
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_submissions(
  p_status public.submission_status default 'pending', p_limit int default 50, p_offset int default 0
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_limit int := least(greatest(p_limit, 1), 100);
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'total', (select count(*) from public.catalog_submissions s where s.status = p_status),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r)) from (
        select s.id, s.brand_name, s.name, s.category, s.variant_label, s.image_path, s.note, s.status,
               s.review_note, s.reviewed_at, s.created_at, s.product_id, u.email as submitted_by
        from public.catalog_submissions s
        join auth.users u on u.id = s.user_id
        where s.status = p_status
        -- Oldest first while waiting, newest first once reviewed.
        order by case when p_status = 'pending' then s.created_at end asc,
                 s.reviewed_at desc nulls last
        limit v_limit offset greatest(p_offset, 0)
      ) r
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_get_submission(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  s public.catalog_submissions;
  v_similar jsonb;
begin
  perform public.assert_admin();
  select * into s from public.catalog_submissions where id = p_id;
  if s.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) into v_similar from (
    select p.id, p.name, b.name as brand_name, p.category, p.image_url, p.catalog_status,
           (select jsonb_agg(jsonb_build_object('id', v.id, 'label', v.label, 'is_default', v.is_default)
                             order by v.sort_order, v.label)
              from public.product_variants v where v.product_id = p.id) as variants
    from public.products p
    join public.brands b on b.id = p.brand_id
    where similarity(p.search_text, lower(s.brand_name || ' ' || s.name)) > 0.2
    order by similarity(p.search_text, lower(s.brand_name || ' ' || s.name)) desc
    limit 5
  ) m;

  return to_jsonb(s) - 'user_id' || jsonb_build_object(
    'submitted_by', (select u.email from auth.users u where u.id = s.user_id),
    'submitter_id', s.user_id,
    'reviewer', (select u.email from auth.users u where u.id = s.reviewed_by),
    'product_name', (select p.name from public.products p where p.id = s.product_id),
    'similar', v_similar
  );
end $$;

create or replace function public.lock_pending_submission(p_id uuid)
returns public.catalog_submissions
language plpgsql security definer set search_path = public as $$
declare
  s public.catalog_submissions;
begin
  select * into s from public.catalog_submissions where id = p_id for update;
  if s.id is null then
    raise exception 'submission_not_found' using errcode = 'P0001', hint = 'This submission was withdrawn.';
  end if;
  if s.status <> 'pending' then
    raise exception 'already_reviewed' using errcode = 'P0001', hint = 'This submission has already been reviewed.';
  end if;
  return s;
end $$;

-- Approve as a new catalogue product. The person's product links to it (linked_variant_id);
-- their library entry, notes and photo stay as they are.
create or replace function public.admin_approve_submission(
  p_id uuid,
  p_brand_name text,
  p_name text,
  p_category public.product_category,
  p_description text default null,
  p_variant_label text default null,
  p_variant_kind text default 'shade'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s public.catalog_submissions;
  v_product uuid;
  v_variant uuid;
  v_label text := nullif(btrim(p_variant_label), '');
begin
  perform public.assert_admin();
  s := public.lock_pending_submission(p_id);

  v_product := public.admin_save_product(null, p_brand_name, p_name, p_category, p_description, null, v_label is null);
  if v_label is not null then
    insert into public.product_variants (product_id, label, shade_name, size_label, sort_order)
    values (v_product, v_label,
            case when p_variant_kind = 'shade' then v_label end,
            case when p_variant_kind = 'size' then v_label end, 1)
    returning id into v_variant;
  else
    select v.id into v_variant from public.product_variants v where v.product_id = v_product and v.is_default;
  end if;

  update public.personal_products set linked_variant_id = v_variant where id = s.personal_product_id;
  update public.catalog_submissions
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), product_id = v_product, variant_id = v_variant
   where id = s.id;
  perform public.record_admin_action('submission.approved', 'product', v_product, 'Approved ' || btrim(p_name));
  return v_product;
end $$;

-- Approve by linking to a shade or size that is already in the catalogue.
create or replace function public.admin_link_submission(p_id uuid, p_variant_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s public.catalog_submissions;
  v_product uuid;
  v_name text;
begin
  perform public.assert_admin();
  s := public.lock_pending_submission(p_id);
  select v.product_id, p.name into v_product, v_name
    from public.product_variants v join public.products p on p.id = v.product_id
   where v.id = p_variant_id;
  if v_product is null then
    raise exception 'variant_not_found' using errcode = 'P0001', hint = 'That shade or size no longer exists.';
  end if;

  update public.personal_products set linked_variant_id = p_variant_id where id = s.personal_product_id;
  update public.catalog_submissions
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), product_id = v_product, variant_id = p_variant_id
   where id = s.id;
  perform public.record_admin_action('submission.linked', 'product', v_product, 'Linked ' || s.name || ' to ' || v_name);
  return v_product;
end $$;

create or replace function public.admin_reject_submission(p_id uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s public.catalog_submissions;
begin
  perform public.assert_admin();
  s := public.lock_pending_submission(p_id);
  update public.catalog_submissions
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(btrim(p_note), '')
   where id = s.id;
  perform public.record_admin_action('submission.rejected', 'submission', s.id, 'Rejected ' || s.name);
end $$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_products(
  p_query text default null,
  p_category public.product_category default null,
  p_status public.catalog_status default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_pats text[] := public.search_patterns(p_query);
begin
  perform public.assert_admin();
  return (
    with hits as (
      select p.*, b.name as brand_name
      from public.products p
      join public.brands b on b.id = p.brand_id
      where (p_category is null or p.category = p_category)
        and (p_status is null or p.catalog_status = p_status)
        and (v_pats is null or p.search_text ilike all (v_pats))
    )
    select jsonb_build_object(
      'total', (select count(*) from hits),
      'rows', coalesce((
        select jsonb_agg(to_jsonb(r)) from (
          select h.id, h.name, h.brand_name, h.category, h.image_url, h.catalog_status,
                 (select count(*) from public.product_variants v where v.product_id = h.id) as variant_count
          from hits h
          order by h.brand_name, h.name
          limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
        ) r
      ), '[]'::jsonb)
    )
  );
end $$;

create or replace function public.admin_get_product(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  perform public.assert_admin();
  select to_jsonb(p) - 'search_text' || jsonb_build_object(
    'brand_name', b.name,
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pv.id, 'label', pv.label, 'shade_name', pv.shade_name, 'size_label', pv.size_label,
        'barcode', pv.barcode, 'is_default', pv.is_default,
        'in_libraries', (select count(*) from public.library_items li where li.catalog_variant_id = pv.id)
      ) order by pv.sort_order, pv.label)
      from public.product_variants pv where pv.product_id = p.id
    ), '[]'::jsonb)
  ) into v
  from public.products p join public.brands b on b.id = p.brand_id
  where p.id = p_id;
  return v;
end $$;

-- p_id null creates the product, with one unnamed default variant unless p_default_variant is
-- false (D2). A null p_image_url leaves the current image in place.
create or replace function public.admin_save_product(
  p_id uuid,
  p_brand_name text,
  p_name text,
  p_category public.product_category,
  p_description text default null,
  p_image_url text default null,
  p_default_variant boolean default true
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_name text := btrim(coalesce(p_name, ''));
  v_brand uuid;
begin
  perform public.assert_admin();
  if v_name = '' then
    raise exception 'name_required' using errcode = 'P0001', hint = 'Add a product name.';
  end if;
  v_brand := public.ensure_brand(p_brand_name);

  begin
    if v_id is null then
      insert into public.products (brand_id, name, category, description, image_url)
      values (v_brand, v_name, p_category, nullif(btrim(p_description), ''), p_image_url)
      returning id into v_id;
      if p_default_variant then
        insert into public.product_variants (product_id, is_default) values (v_id, true);
      end if;
      perform public.record_admin_action('product.created', 'product', v_id, 'Added ' || v_name);
    else
      update public.products
         set brand_id = v_brand, name = v_name, category = p_category,
             description = nullif(btrim(p_description), ''),
             image_url = coalesce(p_image_url, image_url)
       where id = v_id;
      if not found then
        raise exception 'product_not_found' using errcode = 'P0001', hint = 'This product no longer exists.';
      end if;
      perform public.record_admin_action('product.updated', 'product', v_id, 'Edited ' || v_name);
    end if;
  exception when unique_violation then
    raise exception 'product_exists' using errcode = 'P0001',
      hint = 'This brand already has a product with that name.';
  end;
  return v_id;
end $$;

create or replace function public.admin_clear_product_image(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  perform public.assert_admin();
  update public.products set image_url = null where id = p_id returning name into v_name;
  perform public.record_admin_action('product.updated', 'product', p_id, 'Removed the image from ' || v_name);
end $$;

-- Products are archived, never deleted: libraries may point at them.
create or replace function public.admin_set_product_status(p_id uuid, p_status public.catalog_status)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  perform public.assert_admin();
  update public.products set catalog_status = p_status where id = p_id returning name into v_name;
  if v_name is null then
    raise exception 'product_not_found' using errcode = 'P0001', hint = 'This product no longer exists.';
  end if;
  perform public.record_admin_action(
    case when p_status = 'archived' then 'product.archived' else 'product.restored' end, 'product', p_id,
    case when p_status = 'archived' then 'Archived ' else 'Restored ' end || v_name);
end $$;

create or replace function public.admin_save_variant(
  p_id uuid, p_product_id uuid, p_label text, p_kind text default 'shade', p_barcode text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_label text := nullif(btrim(p_label), '');
  v_barcode text := nullif(btrim(p_barcode), '');
  v_default boolean;
begin
  perform public.assert_admin();
  if v_barcode is not null and v_barcode !~ '^[0-9]{8,14}$' then
    raise exception 'invalid_barcode' using errcode = 'P0001', hint = 'A barcode is 8 to 14 digits.';
  end if;

  if v_id is null then
    if v_label is null then
      raise exception 'label_required' using errcode = 'P0001', hint = 'Add a shade or size name.';
    end if;
    -- A product can't offer an unnamed choice next to named ones (D2).
    if exists (select 1 from public.product_variants v
                where v.product_id = p_product_id and v.is_default and v.label is null) then
      raise exception 'unnamed_default' using errcode = 'P0001',
        hint = 'Name the existing entry first, so people can tell it apart.';
    end if;
  else
    select v.is_default into v_default from public.product_variants v where v.id = v_id;
    if v_label is null and (not coalesce(v_default, false)
        or (select count(*) from public.product_variants v where v.product_id = p_product_id) > 1) then
      raise exception 'label_required' using errcode = 'P0001', hint = 'Add a shade or size name.';
    end if;
  end if;

  begin
    if v_id is null then
      insert into public.product_variants (product_id, label, shade_name, size_label, barcode, sort_order)
      values (p_product_id, v_label,
              case when p_kind = 'shade' then v_label end,
              case when p_kind = 'size' then v_label end,
              v_barcode,
              coalesce((select max(v.sort_order) + 1 from public.product_variants v where v.product_id = p_product_id), 1))
      returning id into v_id;
    else
      update public.product_variants
         set label = v_label,
             shade_name = case when p_kind = 'shade' then v_label end,
             size_label = case when p_kind = 'size' then v_label end,
             barcode = v_barcode
       where id = v_id and product_id = p_product_id;
    end if;
  exception when unique_violation then
    raise exception 'variant_exists' using errcode = 'P0001',
      hint = 'That name or barcode is already in use.';
  end;
  perform public.record_admin_action('variant.saved', 'product', p_product_id,
    'Saved ' || coalesce(v_label, 'the default entry') || ' on ' || (select p.name from public.products p where p.id = p_product_id));
  return v_id;
end $$;

create or replace function public.admin_delete_variant(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.product_variants;
begin
  perform public.assert_admin();
  select * into v from public.product_variants where id = p_id;
  if v.id is null then
    return;
  end if;
  if (select count(*) from public.product_variants x where x.product_id = v.product_id) = 1 then
    raise exception 'last_variant' using errcode = 'P0001', hint = 'A product needs at least one entry. Archive the product instead.';
  end if;
  if exists (select 1 from public.library_items li where li.catalog_variant_id = p_id)
     or exists (select 1 from public.collection_items ci where ci.catalog_variant_id = p_id) then
    raise exception 'variant_in_use' using errcode = 'P0001', hint = 'People have this in their library or shopping list, so it can''t be deleted.';
  end if;
  delete from public.product_variants where id = p_id;
  perform public.record_admin_action('variant.deleted', 'product', v.product_id,
    'Deleted ' || coalesce(v.label, 'the default entry') || ' from ' || (select p.name from public.products p where p.id = v.product_id));
end $$;

create or replace function public.admin_list_brands()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(r)) from (
      select b.id, b.name, (select count(*) from public.products p where p.brand_id = b.id) as product_count
      from public.brands b order by b.normalized_name
    ) r
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_save_brand(p_id uuid, p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_name text := btrim(coalesce(p_name, ''));
begin
  perform public.assert_admin();
  if v_name = '' then
    raise exception 'brand_required' using errcode = 'P0001', hint = 'Add a brand.';
  end if;
  begin
    if v_id is null then
      insert into public.brands (name) values (v_name) returning id into v_id;
      perform public.record_admin_action('brand.created', 'brand', v_id, 'Added ' || v_name);
    else
      update public.brands set name = v_name where id = v_id;
      -- Product search text carries the brand name; the trigger rebuilds it.
      update public.products set name = name where brand_id = v_id;
      perform public.record_admin_action('brand.updated', 'brand', v_id, 'Renamed a brand to ' || v_name);
    end if;
  exception when unique_violation then
    raise exception 'brand_exists' using errcode = 'P0001', hint = 'There is already a brand with that name.';
  end;
  return v_id;
end $$;

create or replace function public.admin_delete_brand(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  perform public.assert_admin();
  if exists (select 1 from public.products p where p.brand_id = p_id) then
    raise exception 'brand_in_use' using errcode = 'P0001', hint = 'This brand still has products.';
  end if;
  delete from public.brands where id = p_id returning name into v_name;
  if v_name is not null then
    perform public.record_admin_action('brand.deleted', 'brand', p_id, 'Deleted ' || v_name);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- People. Counts only: nothing here opens a library.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_query text default null, p_limit int default 50, p_offset int default 0
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_pats text[] := public.search_patterns(p_query);
begin
  perform public.assert_admin();
  return (
    with hits as (
      select u.id, u.email, u.created_at, u.last_sign_in_at, u.banned_until
      from auth.users u
      where v_pats is null or u.email ilike all (v_pats)
    )
    select jsonb_build_object(
      'total', (select count(*) from hits),
      'rows', coalesce((
        select jsonb_agg(to_jsonb(r)) from (
          select h.id, h.email, h.created_at, h.last_sign_in_at,
                 coalesce(h.banned_until > now(), false) as is_suspended,
                 exists (select 1 from public.admins a where a.user_id = h.id) as is_admin,
                 (select count(*) from public.library_items li where li.user_id = h.id) as library_count
          from hits h
          order by h.created_at desc
          limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
        ) r
      ), '[]'::jsonb)
    )
  );
end $$;

create or replace function public.admin_get_user(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
    'is_suspended', coalesce(u.banned_until > now(), false),
    'is_admin', exists (select 1 from public.admins a where a.user_id = u.id),
    'is_self', u.id = auth.uid(),
    'library_count', (select count(*) from public.library_items li where li.user_id = u.id),
    'collection_count', (select count(*) from public.collections c where c.user_id = u.id and c.type = 'custom'),
    'shelf_count', (select count(*) from public.collections c where c.user_id = u.id and c.type = 'shelf'),
    'submissions', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'brand_name', s.brand_name,
                                          'status', s.status, 'created_at', s.created_at)
                       order by s.created_at desc)
      from public.catalog_submissions s where s.user_id = u.id
    ), '[]'::jsonb)
  ) into v
  from auth.users u where u.id = p_id;
  return v;
end $$;

-- You can't remove yourself, so there is always at least one admin.
create or replace function public.admin_set_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_is_admin then
    insert into public.admins (user_id, added_by) values (p_user_id, auth.uid()) on conflict do nothing;
    perform public.record_admin_action('admin.added', 'user', p_user_id, 'Gave someone admin access');
  else
    if p_user_id = auth.uid() then
      raise exception 'cannot_remove_self' using errcode = 'P0001',
        hint = 'Ask another admin to remove your access.';
    end if;
    delete from public.admins where user_id = p_user_id;
    perform public.record_admin_action('admin.removed', 'user', p_user_id, 'Removed someone''s admin access');
  end if;
end $$;

-- Called by the admin-users Edge Function after it suspends, restores or deletes an account.
create or replace function public.admin_record_user_action(p_action text, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_action not in ('user.suspended', 'user.restored', 'user.deleted') then
    raise exception 'unknown action' using errcode = '22023';
  end if;
  perform public.record_admin_action(p_action, 'user', p_user_id, case p_action
    when 'user.suspended' then 'Suspended an account'
    when 'user.restored' then 'Restored an account'
    else 'Deleted an account' end);
end $$;

create or replace function public.admin_list_activity(p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'total', (select count(*) from public.admin_activity),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r)) from (
        select a.id, a.action, a.target_type, a.target_id, a.summary, a.created_at, u.email as actor
        from public.admin_activity a
        left join auth.users u on u.id = a.actor_id
        order by a.created_at desc
        limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
      ) r
    ), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Function grants. On Supabase new functions can inherit broad default grants, so every one
-- is set explicitly: helpers are unreachable, admin_* functions check is_admin() themselves.
-- ---------------------------------------------------------------------------
do $$
declare
  f regprocedure;
  n text;
begin
  for f, n in
    select p.oid::regprocedure, p.proname from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and (p.proname like 'admin\_%' or p.proname in (
        'is_admin', 'assert_admin', 'record_admin_action', 'ensure_brand', 'search_patterns',
        'submission_has_pending_photo', 'lock_pending_submission', 'submit_personal_product'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    if n like 'admin\_%' or n in ('is_admin', 'submit_personal_product') then
      execute format('grant execute on function %s to authenticated', f);
    end if;
    -- Called inside storage policies, which run as the signed-in user.
    if n = 'submission_has_pending_photo' then
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
end $$;
