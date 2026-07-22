'use client'

import type { TextFieldClientComponent, OptionObject } from 'payload'
import { FieldDescription, FieldLabel, SelectInput, useField, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

const MODELS_URL = '/payload/api/globals/translation-settings/openai-models'

export const OpenAiModelField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const lockField = useFormFields(([fields]) => fields?.lockTranslationSettings)
  const isLocked = lockField === undefined ? Boolean(readOnly) : Boolean(lockField.value)
  const [options, setOptions] = useState<OptionObject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(MODELS_URL, {
          credentials: 'include',
          signal: controller.signal,
        })
        const data = (await res.json()) as { models?: OptionObject[]; error?: string }
        if (!res.ok) {
          throw new Error(data.error || `Failed to load models (${res.status})`)
        }
        setOptions(Array.isArray(data.models) ? data.models : [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setLoadError(err instanceof Error ? err.message : 'Failed to load models')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  const optionsWithCurrent = useMemo(() => {
    if (!value || options.some((option) => option.value === value)) return options
    return [{ label: value, value }, ...options]
  }, [options, value])

  const description =
    typeof field.admin?.description === 'string' ? field.admin.description : undefined

  const disabled = isLocked || loading

  return (
    <div className="field-type select">
      <FieldLabel label={field.label} path={path} required={field.required} />
      <SelectInput
        description={description}
        Error={showError && errorMessage ? <div className="field-error">{errorMessage}</div> : null}
        isClearable={false}
        name={path}
        onChange={(option) => {
          if (disabled || !option || Array.isArray(option)) return
          if ('value' in option && typeof option.value === 'string') {
            setValue(option.value)
          }
        }}
        options={optionsWithCurrent}
        path={path}
        placeholder={loading ? 'Loading models…' : 'Select a model'}
        readOnly={disabled}
        required={field.required}
        showError={showError}
        value={value ?? ''}
      />
      {loadError ? (
        <FieldDescription description={`Could not load OpenAI models: ${loadError}`} path={path} />
      ) : null}
    </div>
  )
}
