export const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '')

  if (!digits) return ''

  if (digits.startsWith('44')) {
    const number = digits.slice(2)
    if (number.length <= 10) {
      return `+44 ${number.slice(0, 4)} ${number.slice(4)}`
    }
  } else if (digits.startsWith('0')) {
    const number = digits.slice(1)
    if (number.length <= 10) {
      return `+44 ${number.slice(0, 4)} ${number.slice(4)}`
    }
  } else if (digits.length <= 10) {
    return `+44 ${digits.slice(0, 4)} ${digits.slice(4)}`
  }

  return digits.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
}

export const validateUKPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('44')) {
    const number = digits.slice(2)
    return number.length >= 10 && /^[1-9]/.test(number)
  } else if (digits.startsWith('0')) {
    return digits.length >= 11 && /^0[1-9]/.test(digits)
  }

  return digits.length >= 10
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
  return emailRegex.test(email)
}

export const validateUKPostcode = (postcode: string): boolean => {
  const postcodeRegex = /^([A-Z]{1,2}\\d{1,2}[A-Z]?\\s?\\d[A-Z]{2}|GIR\\s?0AA)$/i
  return postcodeRegex.test(postcode)
}

