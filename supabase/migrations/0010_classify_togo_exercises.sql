-- One-time best-effort auto-classification of the 1053 imported TOGO
-- exercises by keyword matching on their (Spanish) name. Anything that
-- doesn't match a keyword is left null and expected to be fixed by hand via
-- the "Editar" action in /biblioteca.

update public.exercises set laterality = 'Unilateral'
where source = 'togo' and laterality is null
  and name ~* '(individual|unilateral|alternad|alterno|alterna|unipodal|a una pierna|un brazo|single leg|single arm)';

update public.exercises set laterality = 'Bilateral'
where source = 'togo' and laterality is null;

update public.exercises set equipment = 'Mancuernas'
where source = 'togo' and equipment is null and name ~* 'mancuerna';

update public.exercises set equipment = 'Kettlebell'
where source = 'togo' and equipment is null and name ~* '(kettlebell|\mkb\M)';

update public.exercises set equipment = 'Barra'
where source = 'togo' and equipment is null and name ~* '\mbarra\M';

update public.exercises set equipment = 'Poleas'
where source = 'togo' and equipment is null and name ~* 'polea';

update public.exercises set equipment = 'Bandas'
where source = 'togo' and equipment is null and name ~* 'banda';

update public.exercises set equipment = 'Máquinas'
where source = 'togo' and equipment is null and name ~* 'm[aá]quina';

update public.exercises set equipment = 'Peso corporal'
where source = 'togo' and equipment is null
  and name ~* '(peso corporal|burpee|flexion|flexión|plancha|hollow|sit up|sit-up|crunch|zancada|estocada|salto|jump|push ?up)';

update public.exercises set pattern = 'Sentadilla'
where source = 'togo' and pattern is null and name ~* 'sentadilla';

update public.exercises set pattern = 'Estocada'
where source = 'togo' and pattern is null and name ~* '(estocada|zancada|lunge|step down|step up)';

update public.exercises set pattern = 'Bisagra'
where source = 'togo' and pattern is null
  and name ~* '(peso muerto|hip thrust|puente|isquio|buenos dias|good morning|hiperextensi)';

update public.exercises set pattern = 'Tracción vertical'
where source = 'togo' and pattern is null
  and name ~* '(dominada|jal[oó]n|pull ?up|chin ?up|lat ?pull)';

update public.exercises set pattern = 'Tracción horizontal'
where source = 'togo' and pattern is null and name ~* '(remo|row)';

update public.exercises set pattern = 'Empuje vertical'
where source = 'togo' and pattern is null
  and name ~* '(press.*(hombro|militar|arnold)|hombro.*press|overhead press|ohp)';

update public.exercises set pattern = 'Empuje horizontal'
where source = 'togo' and pattern is null
  and name ~* '(press.*(banca|pecho|inclinad|declinad|plano)|apertura|flexion|flexión|push ?up|fondos)';

update public.exercises set pattern = 'Core'
where source = 'togo' and pattern is null
  and name ~* '(core|abdominal|crunch|sit ?up|plancha|hollow|dead ?bug|pallof)';

update public.exercises set pattern = 'Pliométricos'
where source = 'togo' and pattern is null
  and name ~* '(salto|jump|burpee|pliom[eé]tric|bound|skip)';

update public.exercises set pattern = 'Isométricos'
where source = 'togo' and pattern is null
  and name ~* '(is[oó]metric|iso hold|wall sit)';

update public.exercises set pattern = 'DLO'
where source = 'togo' and pattern is null
  and name ~* '(rotaci[oó]n|rotacional|diagonal|le[ñn]ador|chop|lift|antirotaci)';

-- second pass: training-jargon abbreviations (RDL, KB, thruster, etc.)
update public.exercises set pattern = 'Bisagra'
where source = 'togo' and pattern is null and name ~* '\mrdl\M|swing|deadlift|arranque|clean';

update public.exercises set pattern = 'Sentadilla'
where source = 'togo' and pattern is null and name ~* 'thruster|squat';

update public.exercises set equipment = 'Kettlebell'
where source = 'togo' and equipment is null and name ~* '\mkbs?\M';

update public.exercises set equipment = 'Bandas'
where source = 'togo' and equipment is null and name ~* 'mini band|band|suspensi[oó]n|trx';
