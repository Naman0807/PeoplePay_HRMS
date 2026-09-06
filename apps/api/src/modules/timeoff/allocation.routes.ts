import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createAllocationSchema, updateAllocationSchema, listAllocationsQuerySchema } from './allocation.validation';
import * as controller from './allocation.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(listAllocationsQuerySchema, 'query'), controller.list);
router.get('/:id', controller.get);
router.post('/', requireCapability('MANAGE_TIME_OFF_TYPES'), validate(createAllocationSchema), controller.create);
router.patch('/:id', requireCapability('MANAGE_TIME_OFF_TYPES'), validate(updateAllocationSchema), controller.update);
router.post('/:id/approve', requireCapability('MANAGE_TIME_OFF_TYPES'), controller.approve);
router.post('/:id/refuse', requireCapability('MANAGE_TIME_OFF_TYPES'), controller.refuse);
router.delete('/:id', requireCapability('MANAGE_TIME_OFF_TYPES'), controller.remove);

export default router;
