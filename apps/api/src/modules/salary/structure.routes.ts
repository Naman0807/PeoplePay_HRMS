import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createStructureSchema, updateStructureSchema } from './structure.validation';
import * as controller from './structure.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireCapability('VIEW_SALARY_STRUCTURES'), controller.list);
router.get('/:id', requireCapability('VIEW_SALARY_STRUCTURES'), controller.get);
router.post('/', requireCapability('MANAGE_SALARY_RULES'), validate(createStructureSchema), controller.create);
router.patch('/:id', requireCapability('MANAGE_SALARY_RULES'), validate(updateStructureSchema), controller.update);
router.delete('/:id', requireCapability('MANAGE_SALARY_RULES'), controller.remove);

export default router;
