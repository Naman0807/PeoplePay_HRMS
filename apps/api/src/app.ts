import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import departmentRoutes from './modules/departments/department.routes';
import employeeRoutes from './modules/employees/employee.routes';
import scheduleRoutes from './modules/schedules/schedule.routes';
import contractRoutes from './modules/contracts/contract.routes';
import timeOffTypeRoutes from './modules/timeoff/timeoff-type.routes';
import allocationRoutes from './modules/timeoff/allocation.routes';
import requestRoutes from './modules/timeoff/request.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import structureRoutes from './modules/salary/structure.routes';
import ruleRoutes from './modules/salary/rule.routes';
import payrunRoutes from './modules/payroll/payrun.routes';
import payslipRoutes from './modules/payslips/payslip.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') return next();
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/time-off/types', timeOffTypeRoutes);
  app.use('/api/time-off/allocations', allocationRoutes);
  app.use('/api/time-off/requests', requestRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/salary/structures', structureRoutes);
  app.use('/api/salary', ruleRoutes);
  app.use('/api/payruns', payrunRoutes);
  app.use('/api/payslips', payslipRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // 404 + error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}