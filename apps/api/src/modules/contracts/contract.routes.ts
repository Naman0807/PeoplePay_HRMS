import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createContractSchema, updateContractSchema, listContractsQuerySchema } from './contract.validation';
import * as controller from './contract.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), validate(listContractsQuerySchema, 'query'), controller.list);
router.get('/:id', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), controller.get);
router.post('/', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), validate(createContractSchema), controller.create);
router.patch('/:id', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), validate(updateContractSchema), controller.update);
router.delete('/:id', requireCapability('MANAGE_CONTRACTS_SCHEDULES'), controller.remove);

export default router;
