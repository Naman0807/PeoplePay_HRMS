import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createRuleSchema, updateRuleSchema, reorderRulesSchema } from './rule.validation';
import * as controller from './rule.controller';

const router = Router();

router.use(authenticate);

router.get('/structures/:structureId/rules', requireCapability('VIEW_SALARY_STRUCTURES'), controller.list);
router.post('/structures/:structureId/rules', requireCapability('MANAGE_SALARY_RULES'), validate(createRuleSchema), controller.create);
router.post('/rules/reorder', requireCapability('MANAGE_SALARY_RULES'), validate(reorderRulesSchema), controller.reorder);
router.get('/rules/:id', requireCapability('VIEW_SALARY_STRUCTURES'), controller.get);
router.patch('/rules/:id', requireCapability('MANAGE_SALARY_RULES'), validate(updateRuleSchema), controller.update);
router.delete('/rules/:id', requireCapability('MANAGE_SALARY_RULES'), controller.remove);

export default router;