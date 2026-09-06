import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { listAttendanceQuerySchema, updateAttendanceSchema } from './attendance.validation';
import * as controller from './attendance.controller';

const router = Router();

router.use(authenticate);

router.post('/punch-in', controller.punchIn);
router.post('/punch-out', controller.punchOut);
router.get('/me', validate(listAttendanceQuerySchema, 'query'), controller.listOwn);
router.get('/exceptions', requireCapability('VIEW_ALL_ATTENDANCE'), validate(listAttendanceQuerySchema, 'query'), controller.listExceptions);
router.get('/', requireCapability('VIEW_ALL_ATTENDANCE'), validate(listAttendanceQuerySchema, 'query'), controller.listAll);
router.patch('/:id', requireCapability('MANUAL_ATTENDANCE_CORRECTION'), validate(updateAttendanceSchema), controller.update);

export default router;
