import { z } from 'zod'

export const associationProfileSchema = z.object({
  district: z.string().min(2, 'District is required').max(100),
  province: z.string().min(2, 'Province is required').max(100),
  association_name: z.string().min(2, 'Association name is required').max(200),
  slkf_registration_number: z
    .string()
    .min(5, 'Registration number is required')
    .max(50)
    .regex(/^SLKF\//, 'Must start with SLKF/'),
  instructor_name: z.string().min(2, 'Instructor name is required').max(150),
  whatsapp_number: z
    .string()
    .min(9, 'WhatsApp number is required')
    .max(20)
    .regex(/^[0-9+\s-]+$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email address').max(150).optional().or(z.literal('')),
})

export type AssociationProfileInput = z.infer<typeof associationProfileSchema>
