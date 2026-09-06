import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createPayrunSchema, selectEmployeesSchema, listPayrunsQuerySchema } from './payrun.validation';
import * as controller from './payrun.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireCapability('VIEW_PAYRUNS'), validate(listPayrunsQuerySchema, 'query'), controller.list);
router.get('/:id', requireCapability('VIEW_PAYRUNS'), controller.get);
router.post('/', requireCapability('PROCESS_PAYRUNS'), validate(createPayrunSchema), controller.create);
router.get('/:id/eligible-employees', requireCapability('PROCESS_PAYRUNS'), controller.getEligibleEmployees);
router.post('/:id/select-employees', requireCapability('PROCESS_PAYRUNS'), validate(selectEmployeesSchema), controller.selectEmployees);
router.post('/:id/compute', requireCapability('PROCESS_PAYRUNS'), controller.compute);
router.post('/:id/validate', requireCapability('VALIDATE_PAYRUNS'), controller.validate);
router.post('/:id/mark-paid', requireCapability('PROCESS_PAYRUNS'), controller.markPaid);
router.get('/:id/employees', requireCapability('VIEW_PAYRUNS'), controller.listEmployees);
router.get('/:id/payslips', requireCapability('VIEW_PAYRUNS'), controller.listPayslips);

export default router;