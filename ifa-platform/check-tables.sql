-- Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('client_services', 'communications', 'documents', 'consumer_duty_assessments', 'vulnerability_assessments')
ORDER BY table_name;

-- Check documents table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
ORDER BY ordinal_position;
