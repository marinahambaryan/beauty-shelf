-- Beauty Shelf — Home v2, phase 4: public ratings and reviews (D25).
--
-- The first thing anyone else can see. It lives in its own table so library_items,
-- statuses, notes and opening dates stay private exactly as before. Reviews are per
-- catalogue product (not per shade or size); products added manually have none.
--
-- Other people never read the table itself: the table is limited to your own rows, and
-- everyone reads reviews through two narrow functions that return the rating, the text,
-- the date and the author's display name — never their id, library or status.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint product_reviews_one_per_person unique (user_id, product_id)
);
create index if not exists product_reviews_product on public.product_reviews (product_id, updated_at desc);

-- Blank text is no text; and a review shows a name, so you need one before posting.
create or replace function public.product_reviews_rules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.body := nullif(btrim(new.body), '');
  if tg_op = 'INSERT' and not exists (
    select 1 from public.profiles p where p.id = new.user_id and nullif(btrim(p.display_name), '') is not null
  ) then
    raise exception 'display_name_required' using errcode = 'P0001',
      hint = 'Add the name your reviews show before posting.';
  end if;
  return new;
end $$;
create or replace trigger product_reviews_rules before insert or update on public.product_reviews
  for each row execute function public.product_reviews_rules();
create or replace trigger product_reviews_touch before update on public.product_reviews
  for each row execute function public.touch_row();

alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from anon, authenticated;
grant select, delete on public.product_reviews to authenticated;
grant insert (product_id, rating, body), update (rating, body) on public.product_reviews to authenticated;
drop policy if exists own_rows on public.product_reviews;
create policy own_rows on public.product_reviews for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Average, counts and the 5→1 histogram for a product's "From everyone" block.
create or replace function public.product_rating_summary(p_product_id uuid)
returns table (average numeric, ratings int, reviews int, histogram int[])
language sql stable security definer set search_path = public as $$
  select round(avg(r.rating)::numeric, 1),
         count(*)::int,
         count(r.body)::int,
         array[
           count(*) filter (where r.rating = 5), count(*) filter (where r.rating = 4),
           count(*) filter (where r.rating = 3), count(*) filter (where r.rating = 2),
           count(*) filter (where r.rating = 1)
         ]::int[]
    from public.product_reviews r
   where r.product_id = p_product_id;
$$;

-- A page of written reviews, newest first. Only what a reader needs: no author id.
create or replace function public.product_reviews_page(p_product_id uuid, p_limit int default 20, p_offset int default 0)
returns table (id uuid, rating smallint, body text, created_at timestamptz, updated_at timestamptz,
               author_name text, is_mine boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.body, r.created_at, r.updated_at,
         coalesce(nullif(btrim(p.display_name), ''), 'A Beauty Shelf member'),
         r.user_id = auth.uid()
    from public.product_reviews r
    left join public.profiles p on p.id = r.user_id
   where r.product_id = p_product_id and r.body is not null
   order by r.updated_at desc, r.id
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Admin console: the latest reviews and removing one that breaks the rules.
-- Like the rest of the console (D22), it shows the review, not who wrote it.
create or replace function public.admin_list_reviews(p_limit int default 50, p_offset int default 0)
returns table (id uuid, product_id uuid, product_name text, rating smallint, body text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
    select r.id, r.product_id, p.name, r.rating, r.body, r.updated_at
      from public.product_reviews r join public.products p on p.id = r.product_id
     where r.body is not null
     order by r.updated_at desc, r.id
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.admin_delete_review(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_product text;
begin
  perform public.assert_admin();
  select p.name into v_product
    from public.product_reviews r join public.products p on p.id = r.product_id
   where r.id = p_id;
  if v_product is null then
    return;
  end if;
  delete from public.product_reviews where id = p_id;
  perform public.record_admin_action('review.deleted', 'review', p_id, 'Removed a review of ' || v_product);
end $$;

revoke all on function public.product_reviews_rules() from public, anon, authenticated;
revoke all on function public.product_rating_summary(uuid) from public, anon;
revoke all on function public.product_reviews_page(uuid, int, int) from public, anon;
revoke all on function public.admin_list_reviews(int, int) from public, anon;
revoke all on function public.admin_delete_review(uuid) from public, anon;
grant execute on function public.product_rating_summary(uuid) to authenticated;
grant execute on function public.product_reviews_page(uuid, int, int) to authenticated;
grant execute on function public.admin_list_reviews(int, int) to authenticated;
grant execute on function public.admin_delete_review(uuid) to authenticated;
