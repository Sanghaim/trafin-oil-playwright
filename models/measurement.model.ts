import { z } from 'zod/v4'

export const measurementObject = z.object({
  id: z.uuid().optional(),
  barrelId: z.uuid(),
  dirtLevel: z.float32(),
  weight: z.float32(),
})

export type Measurement = z.infer<typeof measurementObject>