import React from 'react'
import { Sparkles } from 'lucide-react'

import type { ConditionalFieldGroup } from '@/types/suitability'
import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface PersonalInformationConditionalFieldsProps {
  groups: ConditionalFieldGroup[]
  data: Record<string, any> | undefined
  isReadOnly: boolean
  onFieldChange: (fieldId: string, value: any) => void
}

export function PersonalInformationConditionalFields(props: PersonalInformationConditionalFieldsProps) {
  if (!props.groups.length) return null

  return (
    <>
      {props.groups.map((group, groupIndex) => (
        <div
          key={`group-${groupIndex}`}
          className={cn(
            'p-4 rounded-lg border-l-4',
            group.aiReason ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'
          )}
        >
          {group.aiReason && (
            <div className="flex items-start gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
              <p className="text-sm text-purple-700">{group.aiReason}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className={cn(field.required && "after:content-['*'] after:text-red-500 after:ml-1")}>
                  {field.label}
                </Label>

                {field.type === 'text' && (
                  <Input
                    id={field.id}
                    type="text"
                    value={props.data?.[field.id] || ''}
                    placeholder={field.placeholder}
                    onChange={(e) => props.onFieldChange(field.id, e.target.value)}
                    disabled={props.isReadOnly}
                    required={field.required}
                  />
                )}

                {field.type === 'number' && (
                  <Input
                    id={field.id}
                    type="number"
                    value={props.data?.[field.id] || ''}
                    placeholder={field.placeholder}
                    onChange={(e) => props.onFieldChange(field.id, parseFloat(e.target.value))}
                    disabled={props.isReadOnly}
                    required={field.required}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    id={field.id}
                    value={props.data?.[field.id] || ''}
                    onChange={(e) => props.onFieldChange(field.id, e.target.value)}
                    disabled={props.isReadOnly}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'radio' && (
                  <div className="space-y-2">
                    {field.options?.map((opt) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={field.id}
                          value={opt}
                          checked={props.data?.[field.id] === opt}
                          onChange={(e) => props.onFieldChange(field.id, e.target.value)}
                          disabled={props.isReadOnly}
                          className="text-blue-600"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'date' && (
                  <Input
                    id={field.id}
                    type="date"
                    value={props.data?.[field.id] || ''}
                    onChange={(e) => props.onFieldChange(field.id, e.target.value)}
                    disabled={props.isReadOnly}
                    required={field.required}
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    id={field.id}
                    value={props.data?.[field.id] || ''}
                    placeholder={field.placeholder}
                    onChange={(e) => props.onFieldChange(field.id, e.target.value)}
                    disabled={props.isReadOnly}
                    required={field.required}
                    rows={3}
                    className="w-full p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {field.type === 'list' && (
                  <div className="space-y-2">
                    {(() => {
                      const baseValues = Array.isArray(props.data?.[field.id]) ? props.data?.[field.id] : []
                      const rows = props.isReadOnly ? baseValues : baseValues.concat([''])

                      return rows.map((item: string, index: number, arr: string[]) => {
                        const isLast = index === arr.length - 1
                        return (
                          <div key={`${field.id}-${index}`} className="flex items-center gap-2">
                            <Input
                              id={index === 0 ? field.id : undefined}
                              type="text"
                              value={item || ''}
                              placeholder={field.placeholder}
                              onChange={(e) => {
                                const current = Array.isArray(props.data?.[field.id]) ? props.data?.[field.id] : []
                                const updated = [...current]
                                if (isLast) {
                                  updated.push(e.target.value)
                                } else {
                                  updated[index] = e.target.value
                                }
                                props.onFieldChange(
                                  field.id,
                                  updated.map((entry: string) => entry.trim()).filter((entry: string) => entry.length > 0)
                                )
                              }}
                              disabled={props.isReadOnly}
                            />
                            {!isLast && !props.isReadOnly && (
                              <button
                                type="button"
                                className="text-xs text-gray-500"
                                onClick={() => {
                                  const current = Array.isArray(props.data?.[field.id]) ? props.data?.[field.id] : []
                                  props.onFieldChange(
                                    field.id,
                                    current.filter((_: string, idx: number) => idx !== index)
                                  )
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}

                {field.type === 'checkbox' && (
                  <div className="space-y-2">
                    {field.options?.map((opt) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={opt}
                          checked={props.data?.[field.id]?.includes(opt) || false}
                          onChange={(e) => {
                            const current = props.data?.[field.id] || []
                            const updated = e.target.checked ? [...current, opt] : current.filter((v: string) => v !== opt)
                            props.onFieldChange(field.id, updated)
                          }}
                          disabled={props.isReadOnly}
                          className="text-blue-600"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
