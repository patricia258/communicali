-- ComuniCALI (03/11/2026): no espaço do membro o parceiro aparece com o logo original; o site continua com a versão branca de partners.logo_url.
insert into public.communicali_partner_profiles (partner_id, logo_original_url) values
  ('57127612-9db2-4759-b129-6e6ae415066d', 'https://cyyrrtekbkltdiatixhp.supabase.co/storage/v1/object/public/site/parceiros/791dc6e0-e208-422c-86a7-0ab4f5412ed1-Captura-de-Tela-2026-11-01-as-15.58.56.png'),
  ('306369d3-b3c3-4338-97f0-a88b6874e77c', 'https://cyyrrtekbkltdiatixhp.supabase.co/storage/v1/object/public/site/parceiros/1ec90943-427f-4aa7-8548-b23d274611ba-Captura-de-Tela-2026-11-01-as-16.02.00.png'),
  ('9ca2a3a2-bb84-48bc-b299-1b67cc5395d5', 'https://cyyrrtekbkltdiatixhp.supabase.co/storage/v1/object/public/site/parceiros/11517afb-1e60-425a-822d-90700de70b0d-Captura-de-Tela-2026-11-01-as-16.04.34.png'),
  ('245548db-22b3-4eff-afef-93c4414adafc', 'https://cyyrrtekbkltdiatixhp.supabase.co/storage/v1/object/public/site/parceiros/5f6ddb73-1eaa-4895-b337-24f7e2f658cd-Captura-de-Tela-2026-11-01-as-15.57.00.png')
on conflict (partner_id) do update set logo_original_url = coalesce(public.communicali_partner_profiles.logo_original_url, excluded.logo_original_url), updated_at = now();
