import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { listPayslipsQuerySchema } from './payslip.validation';
import * as controller from './payslip.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(listPayslipsQuerySchema, 'query'), controller.list);
router.get('/:id/items', controller.listItems);
router.get('/:id', controller.get);

export default router;