-- Pela lista de recepção da 1ª edição (PDF de 15/11/2026): quem veio como "Convidado de ..." continua Convidado.
update public.members set estagio_entrada = 'convidado'
where lower(email) in ('joaorolvr2@gmail.com','cintia.santos@ecx.com.br','email@email.com','inaieduarte.id@gmail.com','catcyclec@gmail.com','lidi.alexandrini@gmail.com','lucas.sarres15@gmail.com') and adesao_status is null;
