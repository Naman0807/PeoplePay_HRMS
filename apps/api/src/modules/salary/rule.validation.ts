import { z } from 'zod';

export const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  category: z.enum(['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET']),
  sequence: z.number().int().min(1),
  computation_type: z.enum(['FIXED', 'PERCENTAGE', 'FORMULA']),
  amount_fixed: z.number().nonnegative().optional(),
  percentage_rate: z.number().nonnegative().optional(),
  formula_string: z.string().optional(),
  is_active: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.computation_type === 'FIXED' && data.amount_fixed === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'amount_fixed is required for FIXED computation', path: ['amount_fixed'] });
  }
  if (data.computation_type === 'PERCENTAGE' && data.percentage_rate === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'percentage_rate is required for PERCENTAGE computation', path: ['percentage_rate'] });
  }
  if (data.computation_type === 'FORMULA' && !data.formula_string) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'formula_string is required for FORMULA computation', path: ['formula_string'] });
  }
});

export const updateRuleSchema = createRuleSchema.innerType().partial();

export const reorderRulesSchema = z.object({
  rule_ids: z.array(z.string().uuid()).min(1),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type ReorderRulesInput = z.infer<typeof reorderRulesSchema>;