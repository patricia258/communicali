begin;
alter table public.edition_photos add column if not exists original_url text;
alter table public.editions add column if not exists capa_original_url text;
alter table public.edition_album_photos add column if not exists original_storage_path text;
alter table public.edition_album_photos add constraint album_original_mesma_edicao check(original_storage_path is null or original_storage_path like edition_id::text || '/%');
update storage.buckets set file_size_limit=52428800 where id in ('site','edition-albums');
commit;
