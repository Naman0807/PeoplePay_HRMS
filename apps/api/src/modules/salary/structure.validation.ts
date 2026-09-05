import { z } from 'zod';

export const createStructureSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  is_active: z.boolean().default(true),
});

export const updateStructureSchema = createStructureSchema.partial();

export type CreateStructureInput = z.infer<typeof createStructureSchema>;
export type UpdateStructureInput = z.infer<typeof updateStructureSchema>;
