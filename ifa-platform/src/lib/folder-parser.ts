// src/lib/folder-parser.ts
// Parses a FileList from <input webkitdirectory> or drag-and-drop
// into structured client folder data for bulk setup.

import type { ParsedClientFolder, ParsedFile } from '@/types/bulk-setup'

const IGNORED_FILES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
  '.gitkeep',
])

const IGNORED_PREFIXES = ['.', '__MACOSX']

const MAX_TOTAL_FILES = 500

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  msg: 'application/vnd.ms-outlook',
  eml: 'message/rfc822',
  txt: 'text/plain',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
}

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-outlook',
  'message/rfc822',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
])

function shouldIgnoreFile(name: string, relativePath: string): boolean {
  const lower = name.toLowerCase()
  if (IGNORED_FILES.has(lower)) return true
  if (IGNORED_PREFIXES.some(prefix => lower.startsWith(prefix.toLowerCase()))) return true
  // Ignore files inside __MACOSX directories
  if (relativePath.includes('__MACOSX')) return true
  return false
}

function getMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return MIME_MAP[ext] || 'application/octet-stream'
}

function generateClientRef(surname: string, index: number): string {
  const clean = surname.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return `${clean}-${String(index).padStart(3, '0')}`
}

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

/**
 * Parse a FileList from a webkitdirectory input or drag-and-drop.
 *
 * Auto-detection logic:
 * - If all files share the same first path segment → single client (folder name = surname)
 * - If files have different first segments → multiple clients (each subfolder = a client)
 */
export function parseFileList(fileList: FileList): ParsedClientFolder[] {
  const files = Array.from(fileList)

  if (files.length > MAX_TOTAL_FILES) {
    throw new Error(`Too many files (${files.length}). Maximum is ${MAX_TOTAL_FILES}.`)
  }

  // Group files by first path segment
  const groups = new Map<string, { file: File; relativePath: string }[]>()

  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name
    if (shouldIgnoreFile(file.name, relativePath)) continue

    const segments = relativePath.split('/')
    // webkitRelativePath always starts with the selected folder name
    // e.g. "Bucknill/file.pdf" or "AllClients/Bucknill/file.pdf"
    const firstSegment = segments[0]

    if (!groups.has(firstSegment)) {
      groups.set(firstSegment, [])
    }
    groups.get(firstSegment)!.push({ file, relativePath })
  }

  // If there's only one top-level folder (the selected folder), look deeper
  if (groups.size === 1) {
    const [rootFolder, rootFiles] = [...groups.entries()][0]

    // Check if files are directly in the root folder or in subfolders
    const subfolderGroups = new Map<string, { file: File; relativePath: string }[]>()
    let hasDirectFiles = false

    for (const { file, relativePath } of rootFiles) {
      const segments = relativePath.split('/')
      if (segments.length === 2) {
        // File directly in root: "RootFolder/file.pdf"
        hasDirectFiles = true
      } else if (segments.length >= 3) {
        // File in subfolder: "RootFolder/SubFolder/file.pdf"
        const subfolder = segments[1]
        if (shouldIgnoreFile(subfolder, relativePath)) continue
        if (!subfolderGroups.has(subfolder)) {
          subfolderGroups.set(subfolder, [])
        }
        subfolderGroups.get(subfolder)!.push({ file, relativePath })
      }
    }

    // Single client: files directly in root folder
    if (hasDirectFiles && subfolderGroups.size === 0) {
      const directFiles = rootFiles.filter(({ relativePath }) => {
        return relativePath.split('/').length === 2
      })
      return [buildClientFolder(rootFolder, directFiles, 1)]
    }

    // Multiple clients: subfolders with files
    if (subfolderGroups.size > 0 && !hasDirectFiles) {
      let index = 1
      const results: ParsedClientFolder[] = []
      for (const [subfolder, subFiles] of subfolderGroups) {
        results.push(buildClientFolder(subfolder, subFiles, index++))
      }
      return results
    }

    // Mixed: has both direct files and subfolders
    // Treat direct files as one client (root folder name), subfolders as additional clients
    const results: ParsedClientFolder[] = []
    let index = 1

    if (hasDirectFiles) {
      const directFiles = rootFiles.filter(({ relativePath }) => {
        return relativePath.split('/').length === 2
      })
      results.push(buildClientFolder(rootFolder, directFiles, index++))
    }

    for (const [subfolder, subFiles] of subfolderGroups) {
      results.push(buildClientFolder(subfolder, subFiles, index++))
    }

    return results
  }

  // Multiple top-level groups (shouldn't happen with webkitdirectory, but handle for drag-drop)
  let index = 1
  const results: ParsedClientFolder[] = []
  for (const [folder, folderFiles] of groups) {
    results.push(buildClientFolder(folder, folderFiles, index++))
  }
  return results
}

function buildClientFolder(
  folderName: string,
  files: { file: File; relativePath: string }[],
  index: number
): ParsedClientFolder {
  const parsedFiles: ParsedFile[] = files.map(({ file }) => {
    const mimeType = getMimeType(file)
    return {
      name: file.name,
      file,
      size: file.size,
      mimeType,
      isSupported: SUPPORTED_MIME_TYPES.has(mimeType),
    }
  })

  const surname = toTitleCase(folderName)

  return {
    folderName,
    files: parsedFiles,
    suggestedLastName: surname,
    suggestedClientRef: generateClientRef(folderName, index),
  }
}

/**
 * Read all files from a dropped directory entry recursively.
 * Used with DataTransferItem.webkitGetAsEntry() for drag-and-drop support.
 */
export async function readDirectoryEntry(
  entry: FileSystemDirectoryEntry
): Promise<File[]> {
  const files: File[] = []

  async function readEntry(dirEntry: FileSystemDirectoryEntry, path: string): Promise<void> {
    if (files.length >= MAX_TOTAL_FILES) return

    const entries = await readAllEntries(dirEntry)

    for (const entry of entries) {
      if (files.length >= MAX_TOTAL_FILES) return

      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry
        const file = await getFileFromEntry(fileEntry, path)
        if (file) files.push(file)
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry
        await readEntry(dirEntry, `${path}/${entry.name}`)
      }
    }
  }

  await readEntry(entry, entry.name)
  return files
}

function readAllEntries(dirEntry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = dirEntry.createReader()
    const allEntries: FileSystemEntry[] = []

    function readBatch() {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(allEntries)
          } else {
            allEntries.push(...entries)
            readBatch()
          }
        },
        reject
      )
    }

    readBatch()
  })
}

function getFileFromEntry(
  fileEntry: FileSystemFileEntry,
  parentPath: string
): Promise<File | null> {
  return new Promise((resolve) => {
    fileEntry.file(
      (file) => {
        // Reconstruct webkitRelativePath by creating a new File with the path
        const relativePath = `${parentPath}/${file.name}`
        const newFile = new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        })
        // webkitRelativePath is read-only, so we store the path on the object
        Object.defineProperty(newFile, 'webkitRelativePath', {
          value: relativePath,
          writable: false,
        })
        resolve(newFile)
      },
      () => resolve(null)
    )
  })
}
