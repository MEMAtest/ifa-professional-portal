import { describe, it, expect } from 'vitest'
import { sanitizeTemplateHtml } from './templateSanitizer'

describe('templateSanitizer', () => {
  it('removes scripts and dangerous attributes', () => {
    const input = [
      '<div>Hello</div>',
      '<script>alert(1)</script>',
      '<img src="x" onerror="alert(1)" />'
    ].join('\n')

    const out = sanitizeTemplateHtml(input)
    expect(out).toContain('Hello')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('onerror=')
  })

  it('scrubs url() from <style> content and filters unsafe inline styles', () => {
    const input = [
      '<style>',
      '@import url(https://evil.example/x.css);',
      '.a{background:url(https://evil.example/a.png)}',
      '.b{color:red}',
      '</style>',
      '<div style="background-image:url(https://evil.example/bg.png); color: red;">x</div>'
    ].join('\n')

    const out = sanitizeTemplateHtml(input)
    expect(out).toContain('<style>')
    expect(out).toContain('color:red')
    expect(out).not.toMatch(/@import/i)
    expect(out).not.toMatch(/url\s*\(/i)
  })

  it('preserves template syntax blocks', () => {
    const input =
      '<style>{{#if FIRM_PRIMARY_COLOR}}:root{--brand:{{FIRM_PRIMARY_COLOR}};}{{/if}}</style>' +
      '<p>{{CLIENT_NAME}}</p>' +
      '{{#if FIRM_EMAIL}}<p>{{FIRM_EMAIL}}</p>{{/if}}'

    const out = sanitizeTemplateHtml(input)
    expect(out).toContain('{{#if FIRM_PRIMARY_COLOR}}')
    expect(out).toContain('{{FIRM_PRIMARY_COLOR}}')
    expect(out).toContain('{{CLIENT_NAME}}')
    expect(out).toContain('{{#if FIRM_EMAIL}}')
  })
})

