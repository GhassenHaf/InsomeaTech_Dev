SET search_path TO insomea_tech, public;

UPDATE insomea_tech.users 
SET status = 'Active' 
WHERE email = 'gh.agintern@insomea.com';

RESET search_path;
