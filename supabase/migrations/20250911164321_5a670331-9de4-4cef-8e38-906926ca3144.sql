-- Add foreign key constraints to establish proper relationships
ALTER TABLE check_ins 
ADD CONSTRAINT check_ins_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id);

ALTER TABLE equipment_loans 
ADD CONSTRAINT equipment_loans_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id);

ALTER TABLE equipment_loans 
ADD CONSTRAINT equipment_loans_equipment_id_fkey 
FOREIGN KEY (equipment_id) REFERENCES equipment(id);

ALTER TABLE pool_logs 
ADD CONSTRAINT pool_logs_checked_by_fkey 
FOREIGN KEY (checked_by) REFERENCES profiles(user_id);

ALTER TABLE pool_logs 
ADD CONSTRAINT pool_logs_confirmed_by_fkey 
FOREIGN KEY (confirmed_by) REFERENCES profiles(user_id);