import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as ts from 'typescript'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(projectRoot, 'src')

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']

async function resolveWithExtensions(absBasePath) {
  if (path.extname(absBasePath)) {
    try {
      await fs.access(absBasePath)
      return pathToFileURL(absBasePath).href
    } catch {
      // continue
    }
  }

  for (const ext of EXTENSIONS) {
    const candidate = `${absBasePath}${ext}`
    try {
      await fs.access(candidate)
      return pathToFileURL(candidate).href
    } catch {
      // continue
    }
  }

  for (const ext of EXTENSIONS) {
    const candidate = path.join(absBasePath, `index${ext}`)
    try {
      await fs.access(candidate)
      return pathToFileURL(candidate).href
    } catch {
      // continue
    }
  }

  return null
}

async function resolveAlias(specifier, parentURL) {
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2)
    const absBase = path.join(srcRoot, rel)
    return resolveWithExtensions(absBase)
  }

  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const parentPath = parentURL ? fileURLToPath(parentURL) : projectRoot
    const absBase = specifier.startsWith('/')
      ? specifier
      : path.resolve(path.dirname(parentPath), specifier)
    return resolveWithExtensions(absBase)
  }

  return null
}

export async function resolve(specifier, context, defaultResolve) {
  const aliasResolved = await resolveAlias(specifier, context.parentURL)
  if (aliasResolved) {
    return { url: aliasResolved, shortCircuit: true }
  }

  return defaultResolve(specifier, context, defaultResolve)
}

export async function load(url, context, defaultLoad) {
  const parsedUrl = new URL(url)
  const pathname = parsedUrl.pathname

  if (pathname.endsWith('.ts') || pathname.endsWith('.tsx')) {
    const source = await fs.readFile(fileURLToPath(url), 'utf8')
    const transpiled = ts.transpileModule(source, {
      fileName: fileURLToPath(url),
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        resolveJsonModule: true
      }
    })

    return { format: 'module', source: transpiled.outputText, shortCircuit: true }
  }

  return defaultLoad(url, context, defaultLoad)
}

