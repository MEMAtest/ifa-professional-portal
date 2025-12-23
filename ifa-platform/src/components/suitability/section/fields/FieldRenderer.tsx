import React, { memo } from 'react'

import type { FieldProps } from './types'

import { AddressField } from './renderers/AddressField'
import { CheckboxField } from './renderers/CheckboxField'
import { DateField } from './renderers/DateField'
import { FallbackField } from './renderers/FallbackField'
import { NumberField } from './renderers/NumberField'
import { RadioField } from './renderers/RadioField'
import { SelectField } from './renderers/SelectField'
import { TextareaField } from './renderers/TextareaField'
import { TextField } from './renderers/TextField'

export const FieldRenderer = memo<FieldProps>((props) => {
  const isRequired = Boolean(props.isRequired ?? props.field.required)
  const showHelp = Boolean(props.showHelp ?? props.field.helpText)
  const rendererProps = { ...props, isRequired, showHelp }

  switch (props.field.type) {
    case 'text':
    case 'email':
    case 'tel':
      return <TextField {...rendererProps} />

    case 'number':
      return <NumberField {...rendererProps} />

    case 'select':
      return <SelectField {...rendererProps} />

    case 'textarea':
      return <TextareaField {...rendererProps} />

    case 'date':
      return <DateField {...rendererProps} />

    case 'checkbox':
      return <CheckboxField {...rendererProps} />

    case 'radio':
      return <RadioField {...rendererProps} />

    case 'address':
      return <AddressField {...rendererProps} />

    default:
      return <FallbackField {...rendererProps} />
  }
})

FieldRenderer.displayName = 'FieldRenderer'
