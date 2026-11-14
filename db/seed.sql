-- MedDo demo data. Fabricated only: no real medical document, no real person.
-- Uses the single user (select id from auth.users limit 1).
-- Dates are relative to today so the dashboard shows every zone.

do $$
declare
  uid uuid := (select id from auth.users order by created_at limit 1);
  i_back uuid; i_blood uuid; i_physio uuid; i_eyes uuid; i_ear uuid;
  d_visit uuid; d_result uuid; d_referral uuid; d_rx uuid; d_receipt uuid;
begin
  if uid is null then
    raise exception 'No user found. Create the single user in Supabase Auth first.';
  end if;

  -- Medical issues (4 open, 1 closed)
  insert into public.medical_issues (user_id, name, status, next_step, created_at)
    values (uid, 'כאבי גב תחתון', 'open', 'לקבוע תור לאורתופד', now() - interval '33 days') returning id into i_back;
  insert into public.medical_issues (user_id, name, status, next_step, created_at)
    values (uid, 'בדיקות דם שנתיות', 'open', 'להמתין לתוצאות', now() - interval '20 days') returning id into i_blood;
  insert into public.medical_issues (user_id, name, status, next_step, created_at)
    values (uid, 'החזר פיזיותרפיה', 'open', 'לשלוח קבלה לקופה', now() - interval '15 days') returning id into i_physio;
  insert into public.medical_issues (user_id, name, status, next_step, created_at)
    values (uid, 'בדיקת עיניים', 'open', null, now() - interval '5 days') returning id into i_eyes;
  insert into public.medical_issues (user_id, name, status, next_step, created_at)
    values (uid, 'דלקת אוזן חיצונית', 'closed', null, now() - interval '90 days') returning id into i_ear;

  -- Documents: one per content type, all as free text (no Storage file needed)
  insert into public.documents (user_id, input_text, extracted_text, content_type, specialty, doc_date, provider, key_info, medical_issue_id, fields)
  values (uid,
    'סיכום ביקור - מרפאה אורתופדית (מסמך דמה). תאריך: ' || to_char(current_date - 30, 'DD.MM.YYYY') || '. רופא: ד"ר נ. אבני. תלונה: כאבי גב תחתון. המלצה: צילום רנטגן עמוד שדרה מותני, ביקורת בעוד חודשיים.',
    'סיכום ביקור - מרפאה אורתופדית (מסמך דמה). תאריך: ' || to_char(current_date - 30, 'DD.MM.YYYY') || '. רופא: ד"ר נ. אבני. תלונה: כאבי גב תחתון. המלצה: צילום רנטגן עמוד שדרה מותני, ביקורת בעוד חודשיים.',
    'visit_summary', 'אורתופדיה', current_date - 30, 'ד"ר נ. אבני', 'כאבי גב תחתון. הופנתה לצילום רנטגן ולביקורת.', i_back,
    jsonb_build_object(
      'content_type', jsonb_build_object('value', 'visit_summary', 'certain', true, 'source', 'ai'),
      'specialty',    jsonb_build_object('value', 'אורתופדיה', 'certain', true, 'source', 'ai'),
      'doc_date',     jsonb_build_object('value', to_char(current_date - 30, 'YYYY-MM-DD'), 'certain', true, 'source', 'ai'),
      'provider',     jsonb_build_object('value', 'ד"ר נ. אבני', 'certain', true, 'source', 'ai'),
      'key_info',     jsonb_build_object('value', 'כאבי גב תחתון. הופנתה לצילום רנטגן ולביקורת.', 'certain', true, 'source', 'ai')))
  returning id into d_visit;

  insert into public.documents (user_id, input_text, extracted_text, content_type, specialty, doc_date, provider, key_info, medical_issue_id, fields)
  values (uid,
    'תוצאות בדיקת דם (מסמך דמה). ספירת דם מלאה ופרופיל שומנים. חלק מהתוצאות טרם התקבלו.',
    'תוצאות בדיקת דם (מסמך דמה). ספירת דם מלאה ופרופיל שומנים. חלק מהתוצאות טרם התקבלו.',
    'result', 'מעבדה', current_date - 10, 'מעבדת דמה', 'ספירת דם מלאה. פרופיל שומנים בהמתנה.', i_blood,
    jsonb_build_object(
      'content_type', jsonb_build_object('value', 'result', 'certain', true, 'source', 'ai'),
      'specialty',    jsonb_build_object('value', 'מעבדה', 'certain', false, 'source', 'ai'),
      'doc_date',     jsonb_build_object('value', to_char(current_date - 10, 'YYYY-MM-DD'), 'certain', true, 'source', 'ai'),
      'provider',     jsonb_build_object('value', 'מעבדת דמה', 'certain', true, 'source', 'ai'),
      'key_info',     jsonb_build_object('value', 'ספירת דם מלאה. פרופיל שומנים בהמתנה.', 'certain', true, 'source', 'ai')))
  returning id into d_result;

  insert into public.documents (user_id, input_text, extracted_text, content_type, specialty, doc_date, provider, key_info, medical_issue_id, fields)
  values (uid,
    'הפניה לפיזיותרפיה (מסמך דמה). 6 טיפולים. יש לתאם מול מכון פיזיותרפיה.',
    'הפניה לפיזיותרפיה (מסמך דמה). 6 טיפולים. יש לתאם מול מכון פיזיותרפיה.',
    'referral', 'פיזיותרפיה', current_date - 28, 'ד"ר נ. אבני', 'הפניה ל-6 טיפולי פיזיותרפיה.', i_back,
    jsonb_build_object(
      'content_type', jsonb_build_object('value', 'referral', 'certain', true, 'source', 'ai'),
      'specialty',    jsonb_build_object('value', 'פיזיותרפיה', 'certain', true, 'source', 'ai'),
      'doc_date',     jsonb_build_object('value', to_char(current_date - 28, 'YYYY-MM-DD'), 'certain', true, 'source', 'ai'),
      'provider',     jsonb_build_object('value', 'ד"ר נ. אבני', 'certain', true, 'source', 'ai'),
      'key_info',     jsonb_build_object('value', 'הפניה ל-6 טיפולי פיזיותרפיה.', 'certain', true, 'source', 'ai')))
  returning id into d_referral;

  insert into public.documents (user_id, input_text, extracted_text, content_type, specialty, doc_date, provider, key_info, medical_issue_id, fields)
  values (uid,
    'מרשם (מסמך דמה). וולטרן, לפי הצורך. מרשם לחודש אחד.',
    'מרשם (מסמך דמה). וולטרן, לפי הצורך. מרשם לחודש אחד.',
    'prescription', null, current_date - 25, null, 'וולטרן, לפי הצורך, לחודש.', i_back,
    jsonb_build_object(
      'content_type', jsonb_build_object('value', 'prescription', 'certain', true, 'source', 'ai'),
      'specialty',    jsonb_build_object('value', null, 'certain', false, 'source', 'ai'),
      'doc_date',     jsonb_build_object('value', to_char(current_date - 25, 'YYYY-MM-DD'), 'certain', true, 'source', 'ai'),
      'provider',     jsonb_build_object('value', null, 'certain', false, 'source', 'ai'),
      'key_info',     jsonb_build_object('value', 'וולטרן, לפי הצורך, לחודש.', 'certain', true, 'source', 'ai')))
  returning id into d_rx;

  insert into public.documents (user_id, input_text, extracted_text, content_type, specialty, doc_date, provider, key_info, medical_issue_id, fields)
  values (uid,
    'קבלה (מסמך דמה). מכון פיזיותרפיה דמה. טיפול פיזיותרפיה אחד. סכום: 120 ש"ח.',
    'קבלה (מסמך דמה). מכון פיזיותרפיה דמה. טיפול פיזיותרפיה אחד. סכום: 120 ש"ח.',
    'receipt_invoice', 'פיזיותרפיה', current_date - 14, 'מכון פיזיותרפיה דמה', 'קבלה על טיפול פיזיותרפיה, 120 ש"ח.', i_physio,
    jsonb_build_object(
      'content_type', jsonb_build_object('value', 'receipt_invoice', 'certain', true, 'source', 'ai'),
      'specialty',    jsonb_build_object('value', 'פיזיותרפיה', 'certain', true, 'source', 'ai'),
      'doc_date',     jsonb_build_object('value', to_char(current_date - 14, 'YYYY-MM-DD'), 'certain', true, 'source', 'ai'),
      'provider',     jsonb_build_object('value', 'מכון פיזיותרפיה דמה', 'certain', true, 'source', 'ai'),
      'key_info',     jsonb_build_object('value', 'קבלה על טיפול פיזיותרפיה, 120 ש"ח.', 'certain', true, 'source', 'ai')))
  returning id into d_receipt;

  -- Tasks: all three statuses, all five types, from documents and manual
  insert into public.tasks (user_id, description, type, status, due_date, due_time, document_id, medical_issue_id) values
    (uid, 'לקבוע תור לאורתופד',              'appointment', 'todo',    current_date + 3,  '09:30', d_visit,    i_back),   -- now zone
    (uid, 'צילום רנטגן - עמוד שדרה מותני',    'test',        'todo',    current_date - 2,  null,    d_visit,    i_back),   -- overdue
    (uid, 'חידוש מרשם וולטרן',               'medication',  'todo',    current_date + 30, null,    d_rx,       i_back),   -- later zone
    (uid, 'תוצאות בדיקת דם',                 'result',      'waiting', current_date + 7,  null,    d_result,   i_blood),
    (uid, 'ממתינים לפרופיל שומנים',           'result',      'waiting', null,              null,    d_result,   i_blood),  -- waiting, no date
    (uid, 'החזר על פיזיותרפיה',              'refund',      'waiting', current_date + 10, null,    d_receipt,  i_physio),
    (uid, 'תור לפיזיותרפיה',                 'appointment', 'todo',    current_date + 12, null,    d_referral, i_back),   -- appointment without time
    (uid, 'להתקשר לקופה לגבי החזר קודם',      'refund',      'done',    current_date - 5,  null,    null,       i_physio), -- manual, done
    (uid, 'לקנות טיפות עיניים',               'medication',  'todo',    current_date + 1,  null,    null,       null);     -- manual, no issue
end $$;
