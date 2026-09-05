-- One employee, one login: nothing previously stopped two accounts from
-- claiming the same employee_id, which would let a second self-signup act
-- as someone else's employee (their attendance clock-in, their leave requests).
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");
