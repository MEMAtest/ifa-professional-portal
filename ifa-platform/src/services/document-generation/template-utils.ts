export const populateTemplate = (template: string, variables: Record<string, any>): string => {
  let content = template

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    const safeValue = value !== null && value !== undefined ? String(value) : ''
    content = content.replace(regex, safeValue)
  })

  content = processConditionals(content, variables)
  content = processLoops(content, variables)

  return content
}

const processConditionals = (content: string, variables: Record<string, any>): string => {
  const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g

  return content.replace(ifRegex, (match, varName, innerContent) => {
    if (variables[varName]) {
      return innerContent
    }
    return ''
  })
}

const processLoops = (content: string, variables: Record<string, any>): string => {
  const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g

  return content.replace(eachRegex, (match, varName, innerContent) => {
    const items = variables[varName]
    if (Array.isArray(items)) {
      return items.map(item => {
        let itemContent = innerContent
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([key, value]) => {
            const regex = new RegExp(`{{this\\.${key}}}`, 'g')
            itemContent = itemContent.replace(regex, String(value))
          })
        } else {
          itemContent = itemContent.replace(/{{this}}/g, String(item))
        }
        return itemContent
      }).join('')
    }
    return ''
  })
}
