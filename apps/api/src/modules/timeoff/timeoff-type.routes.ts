import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createTimeOffTypeSchema, updateTimeOffTypeSchema } from './timeoff-type.validation';
import * as controller from './timeoff-type.controller';

const router = Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', requireCapability('MANAGE_TIME_OFF_TYPES'), validate(createTimeOffTypeSchema), controller.create);
router.patch('/:id', requireCapability('MANAGE_TIME_OFF_TYPES'), validate(updateTimeOffTypeSchema), controller.update);
router.delete('/:id', requireCapability('MANAGE_TIME_OFF_TYPES'), controller.remove);

export default router;