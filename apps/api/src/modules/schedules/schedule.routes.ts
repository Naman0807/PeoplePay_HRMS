import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createScheduleSchema, updateScheduleSchema, listSchedulesQuerySchema } from './schedule.validation';
import * as controller from './schedule.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), validate(listSchedulesQuerySchema, 'query'), controller.list);
router.get('/:id', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), controller.get);
router.post('/', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), validate(createScheduleSchema), controller.create);
router.patch('/:id', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), validate(updateScheduleSchema), controller.update);
router.delete('/:id', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), controller.remove);

export default router;
