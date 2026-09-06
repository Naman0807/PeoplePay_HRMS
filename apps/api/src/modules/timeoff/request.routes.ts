import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createRequestSchema, updateRequestSchema, listRequestsQuerySchema } from './request.validation';
import * as controller from './request.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(listRequestsQuerySchema, 'query'), controller.list);
router.get('/:id', controller.get);
router.post('/', requireCapability('CREATE_TIME_OFF_REQUEST'), validate(createRequestSchema), controller.create);
router.post('/:id/submit', controller.submit);
router.post('/:id/approve', requireCapability('APPROVE_TIME_OFF'), controller.approve);
router.post('/:id/refuse', requireCapability('APPROVE_TIME_OFF'), controller.refuse);
router.patch('/:id', requireCapability('CREATE_TIME_OFF_REQUEST'), validate(updateRequestSchema), controller.update);
router.delete('/:id', requireCapability('CREATE_TIME_OFF_REQUEST'), controller.remove);

export default router;