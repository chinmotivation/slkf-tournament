'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { profileUpdateSchema } from '@/lib/validations/student'
import { BELT_GRADES } from '@/lib/constants/karate'
import { Toast } from '@/components/ui/Toast'
import type { z } from 'zod'

type ProfileUpdateInput = z.input<typeof profileUpdateSchema>

interface Props {
  initialValues: {
    full_name: string
    date_of_birth: string
    belt_grade: string
    phone: string
  }
}

function getMaxDob() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export default function ProfileEditForm({ initialValues }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: initialValues,
  })

  const inputClass = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
      hasError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
    }`

  async function onSubmit(values: ProfileUpdateInput) {
    setToast(null)
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) {
        setToast({ message: json.error?.message ?? 'Update failed. Please try again.', variant: 'error' })
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      router.push('/student/dashboard')
      router.refresh()
    } catch {
      setToast({ message: 'A network error occurred. Please check your connection.', variant: 'error' })
    }
  }

  return (
    <>
      <Toast message={toast?.message ?? null} variant={toast?.variant} onClear={() => setToast(null)} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <input
            type="text"
            {...register('full_name')}
            className={inputClass(!!errors.full_name)}
            disabled={isSubmitting}
          />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
          <input
            type="date"
            {...register('date_of_birth')}
            max={getMaxDob()}
            className={inputClass(!!errors.date_of_birth)}
            disabled={isSubmitting}
          />
          {errors.date_of_birth && <p className="mt-1 text-xs text-red-600">{errors.date_of_birth.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Belt Grade</label>
          <select
            {...register('belt_grade')}
            className={inputClass(!!errors.belt_grade)}
            disabled={isSubmitting}
          >
            <option value="">Select belt grade</option>
            {BELT_GRADES.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {errors.belt_grade && <p className="mt-1 text-xs text-red-600">{errors.belt_grade.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number <span className="text-gray-400 font-normal">(WhatsApp)</span>
          </label>
          <input
            type="tel"
            {...register('phone')}
            className={inputClass(!!errors.phone)}
            placeholder="0771234567"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">Sri Lanka number — 077 1234567 is saved as +94 771234567</p>
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : 'Save Changes'}
          </button>
        </div>

      </form>
    </>
  )
}
