import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createEmployeeSchema, updateEmployeeSchema, listEmployeesQuerySchema, directoryQuerySchema } from './employee.validation';
import * as controller from './employee.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(listEmployeesQuerySchema, 'query'), controller.list);
router.get('/directory', validate(directoryQuerySchema, 'query'), controller.getDirectory);
router.get('/me', controller.getMe);
router.get('/form-data', controller.getFormData);
router.get('/kanban', controller.getKanban);
router.get('/:id', controller.get);
router.post('/', requireCapability('MANAGE_EMPLOYEES'), validate(createEmployeeSchema), controller.create);
router.patch('/:id', requireCapability('MANAGE_EMPLOYEES'), validate(updateEmployeeSchema), controller.update);
router.delete('/:id', requireCapability('MANAGE_EMPLOYEES'), controller.remove);

export default router;