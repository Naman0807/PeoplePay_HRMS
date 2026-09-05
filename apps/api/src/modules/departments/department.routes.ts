import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createDepartmentSchema, updateDepartmentSchema } from './department.validation';
import * as controller from './department.controller';

const router = Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', requireCapability('MANAGE_EMPLOYEES'), validate(createDepartmentSchema), controller.create);
router.patch('/:id', requireCapability('MANAGE_EMPLOYEES'), validate(updateDepartmentSchema), controller.update);
router.delete('/:id', requireCapability('MANAGE_EMPLOYEES'), controller.remove);

export default router;
