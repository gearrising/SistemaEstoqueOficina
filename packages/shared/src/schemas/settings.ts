import { z } from 'zod';

export const settingSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const settingsUpdateSchema = z.record(z.string());
