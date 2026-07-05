import { Request } from 'express';

export function getParamId(req: Request, key = 'id'): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}
