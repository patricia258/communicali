-- Formulário público devolve também o aviso (ex.: lista de espera).
create or replace function public.cali_form_public(p_slug text)
 returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public' as $function$
  select jsonb_build_object('id', f.id, 'slug', f.slug, 'title', f.title, 'description', f.description, 'thank_you', f.thank_you,
         'status', f.status, 'confirm_email', f.confirm_email, 'category', f.category,
         'submit_label', f.submit_label, 'success_text', f.success_text, 'aviso', f.aviso,
         'questions', case when f.status = 'open' then f.questions else '[]'::jsonb end)
    from public.forms f
   where f.slug = lower(btrim(coalesce(p_slug, ''))) and f.status in ('open', 'closed');
$function$;
