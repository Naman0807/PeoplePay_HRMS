import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  listUsersQuerySchema,
} from './user.validation';
import * as controller from './user.controller';

const router = Router();

router.use(authenticate, requireCapability('USER_MANAGEMENT'));

router.get('/', validate(listUsersQuerySchema, 'query'), controller.list);
router.get('/pending', controller.listPending);
router.get('/:id', controller.get);
router.post('/', validate(createUserSchema), controller.create);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', controller.reject);
router.patch('/:id/status', validate(updateUserStatusSchema), controller.updateStatus);
router.patch('/:id', validate(updateUserSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;