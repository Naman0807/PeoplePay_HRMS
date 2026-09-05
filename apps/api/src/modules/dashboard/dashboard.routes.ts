import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireCapability } from '../../middleware/rbac';
import * as controller from './dashboard.controller';

const router = Router();

router.use(authenticate, requireCapability('VIEW_PAYROLL_DASHBOARD'));

router.get('/kpis', controller.getKpis);
router.get('/attendance-chart', controller.getAttendanceChart);
router.get('/department-chart', controller.getDepartmentChart);
router.get('/payroll-chart', controller.getPayrollChart);

export default router;
