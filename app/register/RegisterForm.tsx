'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { registerSchema, type RegisterInput } from '@/lib/validations/student'
import { BELT_GRADES } from '@/lib/constants/karate'
import type { ApiError } from '@/lib/api-response'
import { Toast } from '@/components/ui/Toast'

export default function RegisterForm() {
  const router = useRouter()
  const [apiError, setApiError] = useState<string | null>(null)

  function showError(msg: string) {
    setApiError(msg)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(values: RegisterInput) {
    setApiError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) {
        const err = json as ApiError
        showError(err.error?.message ?? 'Registration failed. Please try again.')
        return
      }
      router.push(json.data.redirectTo)
      router.refresh()
    } catch {
      showError('A network error occurred. Please check your connection.')
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
      hasError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
    }`

  return (
    <>
      <Toast message={apiError} variant="error" onClear={() => setApiError(null)} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <input
            type="text"
            {...register('full_name')}
            className={inputClass(!!errors.full_name)}
            placeholder="Kasun Perera"
            disabled={isSubmitting}
          />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
          <input
            type="email"
            {...register('email')}
            className={inputClass(!!errors.email)}
            placeholder="you@example.com"
            disabled={isSubmitting}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            type="password"
            {...register('password')}
            className={inputClass(!!errors.password)}
            placeholder="Minimum 8 characters"
            disabled={isSubmitting}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
          <input
            type="date"
            {...register('date_of_birth')}
            className={inputClass(!!errors.date_of_birth)}
            disabled={isSubmitting}
          />
          {errors.date_of_birth && <p className="mt-1 text-xs text-red-600">{errors.date_of_birth.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
          <select
            {...register('gender')}
            className={inputClass(!!errors.gender)}
            disabled={isSubmitting}
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
          <input
            type="tel"
            {...register('phone')}
            className={inputClass(!!errors.phone)}
            placeholder="0771234567"
            disabled={isSubmitting}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2 mt-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating account…
          </>
        ) : (
          'Create Account'
        )}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <a href="/login" className="text-red-600 hover:underline font-medium">Sign in</a>
      </p>
    </form>
    </>
  )
}
