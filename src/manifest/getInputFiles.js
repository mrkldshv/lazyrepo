import glob from 'fast-glob'
import fs from 'fs'
import kleur from 'kleur'
import path from 'path'
import { getTask } from '../config.js'
import { timeSince } from '../logger/formatting.js'
import { uniq } from '../uniq.js'
import { workspaceRoot } from '../workspaceRoot.js'

/**
 *
 * @param {import('../types.js').GlobConfig | null | undefined} glob
 * @returns {{include: string[], exclude: string[]}}
 */
function extractGlobPattern(glob) {
  if (!glob) {
    return {
      include: ['**/*'],
      exclude: [],
    }
  }
  if (Array.isArray(glob)) {
    return {
      include: glob,
      exclude: [],
    }
  }

  return { include: glob.include ?? ['**/*'], exclude: glob.exclude ?? [] }
}

/**
 * @param {{task: import('../types.js').ScheduledTask, includes: string[], excludes: string[]}} param
 */
function globCacheConfig({ includes, excludes, task }) {
  /**
   * @type {Set<string>}
   */
  const files = new Set()

  for (const pattern of includes) {
    const start = Date.now()
    for (const file of glob.sync(pattern, {
      cwd: task.taskDir,
      ignore: ['node_modules', '**/node_modules', ...excludes],
      absolute: true,
    })) {
      if (fs.statSync(file).isDirectory()) {
        visitAllFiles(file, (filePath) => files.add(filePath))
      } else {
        files.add(path.relative(workspaceRoot, file))
      }
    }
    // todo: always log this if verbose
    if (Date.now() - start > 100) {
      task.logger.note(`Searching ${pattern} took ${kleur.cyan(timeSince(start))}`)
    }
  }

  return files
}

/**
 *
 * @param {import('../TaskGraph.js').TaskGraph} tasks
 * @param {import('../types.js').ScheduledTask} task
 * @param {string[]} extraFiles
 * @returns
 */
export async function getInputFiles(tasks, task, extraFiles) {
  const { cache } = (await getTask({ taskName: task.taskName })) ?? {}

  if (cache === 'none') {
    return null
  }

  const { include: taskIncludes, exclude: taskExcludes } = extractGlobPattern(cache?.inputs)
  const globalIncludes = tasks.config.baseCacheConfig?.includes ?? [
    '<rootDir>/{yarn.lock,pnpm-lock.yaml,package-lock.json}',
    '<rootDir>/lazy.config.*',
  ]
  const globalExcludes = tasks.config.baseCacheConfig?.excludes ?? []

  const localFiles = globCacheConfig({
    task,
    includes: replaceRootDirPragmas(uniq([...globalIncludes, ...taskIncludes])),
    excludes: replaceRootDirPragmas(uniq([...globalExcludes, ...taskExcludes])),
  })

  return [...new Set([...localFiles, ...extraFiles])].sort()
}

/**
 * @param {string[]} arr
 * @returns
 */
const replaceRootDirPragmas = (arr) =>
  arr.map((str) =>
    str.startsWith('<rootDir>/') ? path.join(workspaceRoot, str.replace('<rootDir>/', '')) : str,
  )

/**
 *
 * @param {string} dir
 * @param {(filePath: string) => void} visit
 */
function visitAllFiles(dir, visit) {
  for (const fileName of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, fileName)
    if (fs.statSync(fullPath).isDirectory()) {
      visitAllFiles(fullPath, visit)
    } else {
      visit(fullPath)
    }
  }
}
