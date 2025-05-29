import { z } from 'zod/v4'

export const barrelObject = z.object({
  id: z.string().optional(),
  qr: z.string().min(1),
  rfid: z.string().min(1),
  nfc: z.string().min(1),
})

export type Barrel = z.infer<typeof barrelObject>
