/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 8875:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1404)
const path = __nccwpck_require__(6928)
const mkdirsSync = (__nccwpck_require__(6813).mkdirsSync)
const utimesMillisSync = (__nccwpck_require__(1226).utimesMillisSync)
const stat = __nccwpck_require__(699)

function copySync (src, dest, opts) {
  if (typeof opts === 'function') {
    opts = { filter: opts }
  }

  opts = opts || {}
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    process.emitWarning(
      'Using the preserveTimestamps option in 32-bit node is not recommended;\n\n' +
      '\tsee https://github.com/jprichardson/node-fs-extra/issues/269',
      'Warning', 'fs-extra-WARN0002'
    )
  }

  const { srcStat, destStat } = stat.checkPathsSync(src, dest, 'copy', opts)
  stat.checkParentPathsSync(src, srcStat, dest, 'copy')
  if (opts.filter && !opts.filter(src, dest)) return
  const destParent = path.dirname(dest)
  if (!fs.existsSync(destParent)) mkdirsSync(destParent)
  return getStats(destStat, src, dest, opts)
}

function getStats (destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs.statSync : fs.lstatSync
  const srcStat = statSync(src)

  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts)
  else if (srcStat.isFile() ||
           srcStat.isCharacterDevice() ||
           srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts)
  else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts)
  else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`)
  else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`)
  throw new Error(`Unknown file: ${src}`)
}

function onFile (srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts)
  return mayCopyFile(srcStat, src, dest, opts)
}

function mayCopyFile (srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs.unlinkSync(dest)
    return copyFile(srcStat, src, dest, opts)
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`)
  }
}

function copyFile (srcStat, src, dest, opts) {
  fs.copyFileSync(src, dest)
  if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest)
  return setDestMode(dest, srcStat.mode)
}

function handleTimestamps (srcMode, src, dest) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode)
  return setDestTimestamps(src, dest)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode) {
  return setDestMode(dest, srcMode | 0o200)
}

function setDestMode (dest, srcMode) {
  return fs.chmodSync(dest, srcMode)
}

function setDestTimestamps (src, dest) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  const updatedSrcStat = fs.statSync(src)
  return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime)
}

function onDir (srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts)
  return copyDir(src, dest, opts)
}

function mkDirAndCopy (srcMode, src, dest, opts) {
  fs.mkdirSync(dest)
  copyDir(src, dest, opts)
  return setDestMode(dest, srcMode)
}

function copyDir (src, dest, opts) {
  const dir = fs.opendirSync(src)

  try {
    let dirent

    while ((dirent = dir.readSync()) !== null) {
      copyDirItem(dirent.name, src, dest, opts)
    }
  } finally {
    dir.closeSync()
  }
}

function copyDirItem (item, src, dest, opts) {
  const srcItem = path.join(src, item)
  const destItem = path.join(dest, item)
  if (opts.filter && !opts.filter(srcItem, destItem)) return
  const { destStat } = stat.checkPathsSync(srcItem, destItem, 'copy', opts)
  return getStats(destStat, srcItem, destItem, opts)
}

function onLink (destStat, src, dest, opts) {
  let resolvedSrc = fs.readlinkSync(src)
  if (opts.dereference) {
    resolvedSrc = path.resolve(process.cwd(), resolvedSrc)
  }

  if (!destStat) {
    return fs.symlinkSync(resolvedSrc, dest)
  } else {
    let resolvedDest
    try {
      resolvedDest = fs.readlinkSync(dest)
    } catch (err) {
      // dest exists and is a regular file or directory,
      // Windows may throw UNKNOWN error. If dest already exists,
      // fs throws error anyway, so no need to guard against it here.
      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs.symlinkSync(resolvedSrc, dest)
      throw err
    }
    if (opts.dereference) {
      resolvedDest = path.resolve(process.cwd(), resolvedDest)
    }
    // If both symlinks resolve to the same target, they are still distinct symlinks
    // that can be copied/overwritten. Only check subdirectory constraints when
    // the resolved paths are different.
    if (resolvedSrc !== resolvedDest) {
      if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`)
      }

      // prevent copy if src is a subdir of dest since unlinking
      // dest in this case would result in removing src contents
      // and therefore a broken symlink would be created.
      if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`)
      }
    }
    return copyLink(resolvedSrc, dest)
  }
}

function copyLink (resolvedSrc, dest) {
  fs.unlinkSync(dest)
  return fs.symlinkSync(resolvedSrc, dest)
}

module.exports = copySync


/***/ }),

/***/ 4027:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const { mkdirs } = __nccwpck_require__(6813)
const { pathExists } = __nccwpck_require__(6949)
const { utimesMillis } = __nccwpck_require__(1226)
const stat = __nccwpck_require__(699)
const { asyncIteratorConcurrentProcess } = __nccwpck_require__(4645)

async function copy (src, dest, opts = {}) {
  if (typeof opts === 'function') {
    opts = { filter: opts }
  }

  opts.clobber = 'clobber' in opts ? !!opts.clobber : true // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    process.emitWarning(
      'Using the preserveTimestamps option in 32-bit node is not recommended;\n\n' +
      '\tsee https://github.com/jprichardson/node-fs-extra/issues/269',
      'Warning', 'fs-extra-WARN0001'
    )
  }

  const { srcStat, destStat } = await stat.checkPaths(src, dest, 'copy', opts)

  await stat.checkParentPaths(src, srcStat, dest, 'copy')

  const include = await runFilter(src, dest, opts)

  if (!include) return

  // check if the parent of dest exists, and create it if it doesn't exist
  const destParent = path.dirname(dest)
  const dirExists = await pathExists(destParent)
  if (!dirExists) {
    await mkdirs(destParent)
  }

  await getStatsAndPerformCopy(destStat, src, dest, opts)
}

async function runFilter (src, dest, opts) {
  if (!opts.filter) return true
  return opts.filter(src, dest)
}

async function getStatsAndPerformCopy (destStat, src, dest, opts) {
  const statFn = opts.dereference ? fs.stat : fs.lstat
  const srcStat = await statFn(src)

  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts)

  if (
    srcStat.isFile() ||
    srcStat.isCharacterDevice() ||
    srcStat.isBlockDevice()
  ) return onFile(srcStat, destStat, src, dest, opts)

  if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts)
  if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`)
  if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`)
  throw new Error(`Unknown file: ${src}`)
}

async function onFile (srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts)

  if (opts.overwrite) {
    await fs.unlink(dest)
    return copyFile(srcStat, src, dest, opts)
  }
  if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`)
  }
}

async function copyFile (srcStat, src, dest, opts) {
  await fs.copyFile(src, dest)
  if (opts.preserveTimestamps) {
    // Make sure the file is writable before setting the timestamp
    // otherwise open fails with EPERM when invoked with 'r+'
    // (through utimes call)
    if (fileIsNotWritable(srcStat.mode)) {
      await makeFileWritable(dest, srcStat.mode)
    }

    // Set timestamps and mode correspondingly

    // Note that The initial srcStat.atime cannot be trusted
    // because it is modified by the read(2) system call
    // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
    const updatedSrcStat = await fs.stat(src)
    await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime)
  }

  return fs.chmod(dest, srcStat.mode)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode) {
  return fs.chmod(dest, srcMode | 0o200)
}

async function onDir (srcStat, destStat, src, dest, opts) {
  // the dest directory might not exist, create it
  if (!destStat) {
    await fs.mkdir(dest)
  }

  // iterate through the files in the current directory to copy everything
  await asyncIteratorConcurrentProcess(await fs.opendir(src), async (item) => {
    const srcItem = path.join(src, item.name)
    const destItem = path.join(dest, item.name)

    const include = await runFilter(srcItem, destItem, opts)
    // only copy the item if it matches the filter function
    if (include) {
      const { destStat } = await stat.checkPaths(srcItem, destItem, 'copy', opts)
      // If the item is a copyable file, `getStatsAndPerformCopy` will copy it
      // If the item is a directory, `getStatsAndPerformCopy` will call `onDir` recursively
      await getStatsAndPerformCopy(destStat, srcItem, destItem, opts)
    }
  })

  if (!destStat) {
    await fs.chmod(dest, srcStat.mode)
  }
}

async function onLink (destStat, src, dest, opts) {
  let resolvedSrc = await fs.readlink(src)
  if (opts.dereference) {
    resolvedSrc = path.resolve(process.cwd(), resolvedSrc)
  }
  if (!destStat) {
    return fs.symlink(resolvedSrc, dest)
  }

  let resolvedDest = null
  try {
    resolvedDest = await fs.readlink(dest)
  } catch (e) {
    // dest exists and is a regular file or directory,
    // Windows may throw UNKNOWN error. If dest already exists,
    // fs throws error anyway, so no need to guard against it here.
    if (e.code === 'EINVAL' || e.code === 'UNKNOWN') return fs.symlink(resolvedSrc, dest)
    throw e
  }
  if (opts.dereference) {
    resolvedDest = path.resolve(process.cwd(), resolvedDest)
  }
  // If both symlinks resolve to the same target, they are still distinct symlinks
  // that can be copied/overwritten. Only check subdirectory constraints when
  // the resolved paths are different.
  if (resolvedSrc !== resolvedDest) {
    if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`)
    }

    // do not copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.
    if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`)
    }
  }

  // copy the link
  await fs.unlink(dest)
  return fs.symlink(resolvedSrc, dest)
}

module.exports = copy


/***/ }),

/***/ 424:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
module.exports = {
  copy: u(__nccwpck_require__(4027)),
  copySync: __nccwpck_require__(8875)
}


/***/ }),

/***/ 198:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const mkdir = __nccwpck_require__(6813)
const remove = __nccwpck_require__(3073)

const emptyDir = u(async function emptyDir (dir) {
  let items
  try {
    items = await fs.readdir(dir)
  } catch {
    return mkdir.mkdirs(dir)
  }

  return Promise.all(items.map(item => remove.remove(path.join(dir, item))))
})

function emptyDirSync (dir) {
  let items
  try {
    items = fs.readdirSync(dir)
  } catch {
    return mkdir.mkdirsSync(dir)
  }

  items.forEach(item => {
    item = path.join(dir, item)
    remove.removeSync(item)
  })
}

module.exports = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
}


/***/ }),

/***/ 3693:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const path = __nccwpck_require__(6928)
const fs = __nccwpck_require__(9238)
const mkdir = __nccwpck_require__(6813)

async function createFile (file) {
  let stats
  try {
    stats = await fs.stat(file)
  } catch { }
  if (stats && stats.isFile()) return

  const dir = path.dirname(file)

  let dirStats = null
  try {
    dirStats = await fs.stat(dir)
  } catch (err) {
    // if the directory doesn't exist, make it
    if (err.code === 'ENOENT') {
      await mkdir.mkdirs(dir)
      await fs.writeFile(file, '')
      return
    } else {
      throw err
    }
  }

  if (dirStats.isDirectory()) {
    await fs.writeFile(file, '')
  } else {
    // parent is not a directory
    // This is just to cause an internal ENOTDIR error to be thrown
    await fs.readdir(dir)
  }
}

function createFileSync (file) {
  let stats
  try {
    stats = fs.statSync(file)
  } catch { }
  if (stats && stats.isFile()) return

  const dir = path.dirname(file)
  try {
    if (!fs.statSync(dir).isDirectory()) {
      // parent is not a directory
      // This is just to cause an internal ENOTDIR error to be thrown
      fs.readdirSync(dir)
    }
  } catch (err) {
    // If the stat call above failed because the directory doesn't exist, create it
    if (err && err.code === 'ENOENT') mkdir.mkdirsSync(dir)
    else throw err
  }

  fs.writeFileSync(file, '')
}

module.exports = {
  createFile: u(createFile),
  createFileSync
}


/***/ }),

/***/ 4895:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { createFile, createFileSync } = __nccwpck_require__(3693)
const { createLink, createLinkSync } = __nccwpck_require__(1147)
const { createSymlink, createSymlinkSync } = __nccwpck_require__(5788)

module.exports = {
  // file
  createFile,
  createFileSync,
  ensureFile: createFile,
  ensureFileSync: createFileSync,
  // link
  createLink,
  createLinkSync,
  ensureLink: createLink,
  ensureLinkSync: createLinkSync,
  // symlink
  createSymlink,
  createSymlinkSync,
  ensureSymlink: createSymlink,
  ensureSymlinkSync: createSymlinkSync
}


/***/ }),

/***/ 1147:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const path = __nccwpck_require__(6928)
const fs = __nccwpck_require__(9238)
const mkdir = __nccwpck_require__(6813)
const { pathExists } = __nccwpck_require__(6949)
const { areIdentical } = __nccwpck_require__(699)

async function createLink (srcpath, dstpath) {
  let dstStat
  try {
    dstStat = await fs.lstat(dstpath, { bigint: true })
  } catch {
    // ignore error
  }

  let srcStat
  try {
    srcStat = await fs.lstat(srcpath, { bigint: true })
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink')
    throw err
  }

  if (dstStat && areIdentical(srcStat, dstStat)) return

  const dir = path.dirname(dstpath)

  const dirExists = await pathExists(dir)

  if (!dirExists) {
    await mkdir.mkdirs(dir)
  }

  await fs.link(srcpath, dstpath)
}

function createLinkSync (srcpath, dstpath) {
  let dstStat
  try {
    dstStat = fs.lstatSync(dstpath, { bigint: true })
  } catch {}

  try {
    const srcStat = fs.lstatSync(srcpath, { bigint: true })
    if (dstStat && areIdentical(srcStat, dstStat)) return
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink')
    throw err
  }

  const dir = path.dirname(dstpath)
  const dirExists = fs.existsSync(dir)
  if (dirExists) return fs.linkSync(srcpath, dstpath)
  mkdir.mkdirsSync(dir)

  return fs.linkSync(srcpath, dstpath)
}

module.exports = {
  createLink: u(createLink),
  createLinkSync
}


/***/ }),

/***/ 9933:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const path = __nccwpck_require__(6928)
const fs = __nccwpck_require__(9238)
const { pathExists } = __nccwpck_require__(6949)

const u = (__nccwpck_require__(2977).fromPromise)

/**
 * Function that returns two types of paths, one relative to symlink, and one
 * relative to the current working directory. Checks if path is absolute or
 * relative. If the path is relative, this function checks if the path is
 * relative to symlink or relative to current working directory. This is an
 * initiative to find a smarter `srcpath` to supply when building symlinks.
 * This allows you to determine which path to use out of one of three possible
 * types of source paths. The first is an absolute path. This is detected by
 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
 * see if it exists. If it does it's used, if not an error is returned
 * (callback)/ thrown (sync). The other two options for `srcpath` are a
 * relative url. By default Node's `fs.symlink` works by creating a symlink
 * using `dstpath` and expects the `srcpath` to be relative to the newly
 * created symlink. If you provide a `srcpath` that does not exist on the file
 * system it results in a broken symlink. To minimize this, the function
 * checks to see if the 'relative to symlink' source file exists, and if it
 * does it will use it. If it does not, it checks if there's a file that
 * exists that is relative to the current working directory, if does its used.
 * This preserves the expectations of the original fs.symlink spec and adds
 * the ability to pass in `relative to current working direcotry` paths.
 */

async function symlinkPaths (srcpath, dstpath) {
  if (path.isAbsolute(srcpath)) {
    try {
      await fs.lstat(srcpath)
    } catch (err) {
      err.message = err.message.replace('lstat', 'ensureSymlink')
      throw err
    }

    return {
      toCwd: srcpath,
      toDst: srcpath
    }
  }

  const dstdir = path.dirname(dstpath)
  const relativeToDst = path.join(dstdir, srcpath)

  const exists = await pathExists(relativeToDst)
  if (exists) {
    return {
      toCwd: relativeToDst,
      toDst: srcpath
    }
  }

  try {
    await fs.lstat(srcpath)
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureSymlink')
    throw err
  }

  return {
    toCwd: srcpath,
    toDst: path.relative(dstdir, srcpath)
  }
}

function symlinkPathsSync (srcpath, dstpath) {
  if (path.isAbsolute(srcpath)) {
    const exists = fs.existsSync(srcpath)
    if (!exists) throw new Error('absolute srcpath does not exist')
    return {
      toCwd: srcpath,
      toDst: srcpath
    }
  }

  const dstdir = path.dirname(dstpath)
  const relativeToDst = path.join(dstdir, srcpath)
  const exists = fs.existsSync(relativeToDst)
  if (exists) {
    return {
      toCwd: relativeToDst,
      toDst: srcpath
    }
  }

  const srcExists = fs.existsSync(srcpath)
  if (!srcExists) throw new Error('relative srcpath does not exist')
  return {
    toCwd: srcpath,
    toDst: path.relative(dstdir, srcpath)
  }
}

module.exports = {
  symlinkPaths: u(symlinkPaths),
  symlinkPathsSync
}


/***/ }),

/***/ 7489:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const u = (__nccwpck_require__(2977).fromPromise)

async function symlinkType (srcpath, type) {
  if (type) return type

  let stats
  try {
    stats = await fs.lstat(srcpath)
  } catch {
    return 'file'
  }

  return (stats && stats.isDirectory()) ? 'dir' : 'file'
}

function symlinkTypeSync (srcpath, type) {
  if (type) return type

  let stats
  try {
    stats = fs.lstatSync(srcpath)
  } catch {
    return 'file'
  }
  return (stats && stats.isDirectory()) ? 'dir' : 'file'
}

module.exports = {
  symlinkType: u(symlinkType),
  symlinkTypeSync
}


/***/ }),

/***/ 5788:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const path = __nccwpck_require__(6928)
const fs = __nccwpck_require__(9238)

const { mkdirs, mkdirsSync } = __nccwpck_require__(6813)

const { symlinkPaths, symlinkPathsSync } = __nccwpck_require__(9933)
const { symlinkType, symlinkTypeSync } = __nccwpck_require__(7489)

const { pathExists } = __nccwpck_require__(6949)

const { areIdentical } = __nccwpck_require__(699)

async function createSymlink (srcpath, dstpath, type) {
  let stats
  try {
    stats = await fs.lstat(dstpath)
  } catch { }

  if (stats && stats.isSymbolicLink()) {
    // When srcpath is relative, resolve it relative to dstpath's directory
    // (standard symlink behavior) or fall back to cwd if that doesn't exist
    let srcStat
    if (path.isAbsolute(srcpath)) {
      srcStat = await fs.stat(srcpath, { bigint: true })
    } else {
      const dstdir = path.dirname(dstpath)
      const relativeToDst = path.join(dstdir, srcpath)
      try {
        srcStat = await fs.stat(relativeToDst, { bigint: true })
      } catch {
        srcStat = await fs.stat(srcpath, { bigint: true })
      }
    }

    const dstStat = await fs.stat(dstpath, { bigint: true })
    if (areIdentical(srcStat, dstStat)) return
  }

  const relative = await symlinkPaths(srcpath, dstpath)
  srcpath = relative.toDst
  const toType = await symlinkType(relative.toCwd, type)
  const dir = path.dirname(dstpath)

  if (!(await pathExists(dir))) {
    await mkdirs(dir)
  }

  return fs.symlink(srcpath, dstpath, toType)
}

function createSymlinkSync (srcpath, dstpath, type) {
  let stats
  try {
    stats = fs.lstatSync(dstpath)
  } catch { }
  if (stats && stats.isSymbolicLink()) {
    // When srcpath is relative, resolve it relative to dstpath's directory
    // (standard symlink behavior) or fall back to cwd if that doesn't exist
    let srcStat
    if (path.isAbsolute(srcpath)) {
      srcStat = fs.statSync(srcpath, { bigint: true })
    } else {
      const dstdir = path.dirname(dstpath)
      const relativeToDst = path.join(dstdir, srcpath)
      try {
        srcStat = fs.statSync(relativeToDst, { bigint: true })
      } catch {
        srcStat = fs.statSync(srcpath, { bigint: true })
      }
    }

    const dstStat = fs.statSync(dstpath, { bigint: true })
    if (areIdentical(srcStat, dstStat)) return
  }

  const relative = symlinkPathsSync(srcpath, dstpath)
  srcpath = relative.toDst
  type = symlinkTypeSync(relative.toCwd, type)
  const dir = path.dirname(dstpath)
  const exists = fs.existsSync(dir)
  if (exists) return fs.symlinkSync(srcpath, dstpath, type)
  mkdirsSync(dir)
  return fs.symlinkSync(srcpath, dstpath, type)
}

module.exports = {
  createSymlink: u(createSymlink),
  createSymlinkSync
}


/***/ }),

/***/ 9238:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// This is adapted from https://github.com/normalize/mz
// Copyright (c) 2014-2016 Jonathan Ong me@jongleberry.com and Contributors
const u = (__nccwpck_require__(2977).fromCallback)
const fs = __nccwpck_require__(1404)

const api = [
  'access',
  'appendFile',
  'chmod',
  'chown',
  'close',
  'copyFile',
  'cp',
  'fchmod',
  'fchown',
  'fdatasync',
  'fstat',
  'fsync',
  'ftruncate',
  'futimes',
  'glob',
  'lchmod',
  'lchown',
  'lutimes',
  'link',
  'lstat',
  'mkdir',
  'mkdtemp',
  'open',
  'opendir',
  'readdir',
  'readFile',
  'readlink',
  'realpath',
  'rename',
  'rm',
  'rmdir',
  'stat',
  'statfs',
  'symlink',
  'truncate',
  'unlink',
  'utimes',
  'writeFile'
].filter(key => {
  // Some commands are not available on some systems. Ex:
  // fs.cp was added in Node.js v16.7.0
  // fs.statfs was added in Node v19.6.0, v18.15.0
  // fs.glob was added in Node.js v22.0.0
  // fs.lchown is not available on at least some Linux
  return typeof fs[key] === 'function'
})

// Export cloned fs:
Object.assign(exports, fs)

// Universalify async methods:
api.forEach(method => {
  exports[method] = u(fs[method])
})

// We differ from mz/fs in that we still ship the old, broken, fs.exists()
// since we are a drop-in replacement for the native module
exports.exists = function (filename, callback) {
  if (typeof callback === 'function') {
    return fs.exists(filename, callback)
  }
  return new Promise(resolve => {
    return fs.exists(filename, resolve)
  })
}

// fs.read(), fs.write(), fs.readv(), & fs.writev() need special treatment due to multiple callback args

exports.read = function (fd, buffer, offset, length, position, callback) {
  if (typeof callback === 'function') {
    return fs.read(fd, buffer, offset, length, position, callback)
  }
  return new Promise((resolve, reject) => {
    fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
      if (err) return reject(err)
      resolve({ bytesRead, buffer })
    })
  })
}

// Function signature can be
// fs.write(fd, buffer[, offset[, length[, position]]], callback)
// OR
// fs.write(fd, string[, position[, encoding]], callback)
// We need to handle both cases, so we use ...args
exports.write = function (fd, buffer, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.write(fd, buffer, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.write(fd, buffer, ...args, (err, bytesWritten, buffer) => {
      if (err) return reject(err)
      resolve({ bytesWritten, buffer })
    })
  })
}

// Function signature is
// s.readv(fd, buffers[, position], callback)
// We need to handle the optional arg, so we use ...args
exports.readv = function (fd, buffers, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.readv(fd, buffers, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.readv(fd, buffers, ...args, (err, bytesRead, buffers) => {
      if (err) return reject(err)
      resolve({ bytesRead, buffers })
    })
  })
}

// Function signature is
// s.writev(fd, buffers[, position], callback)
// We need to handle the optional arg, so we use ...args
exports.writev = function (fd, buffers, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.writev(fd, buffers, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.writev(fd, buffers, ...args, (err, bytesWritten, buffers) => {
      if (err) return reject(err)
      resolve({ bytesWritten, buffers })
    })
  })
}

// fs.realpath.native sometimes not available if fs is monkey-patched
if (typeof fs.realpath.native === 'function') {
  exports.realpath.native = u(fs.realpath.native)
} else {
  process.emitWarning(
    'fs.realpath.native is not a function. Is fs being monkey-patched?',
    'Warning', 'fs-extra-WARN0003'
  )
}


/***/ }),

/***/ 1348:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  // Export promiseified graceful-fs:
  ...__nccwpck_require__(9238),
  // Export extra methods:
  ...__nccwpck_require__(424),
  ...__nccwpck_require__(198),
  ...__nccwpck_require__(4895),
  ...__nccwpck_require__(5219),
  ...__nccwpck_require__(6813),
  ...__nccwpck_require__(5256),
  ...__nccwpck_require__(5241),
  ...__nccwpck_require__(6949),
  ...__nccwpck_require__(3073)
}


/***/ }),

/***/ 5219:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const jsonFile = __nccwpck_require__(1891)

jsonFile.outputJson = u(__nccwpck_require__(7597))
jsonFile.outputJsonSync = __nccwpck_require__(6917)
// aliases
jsonFile.outputJSON = jsonFile.outputJson
jsonFile.outputJSONSync = jsonFile.outputJsonSync
jsonFile.writeJSON = jsonFile.writeJson
jsonFile.writeJSONSync = jsonFile.writeJsonSync
jsonFile.readJSON = jsonFile.readJson
jsonFile.readJSONSync = jsonFile.readJsonSync

module.exports = jsonFile


/***/ }),

/***/ 1891:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const jsonFile = __nccwpck_require__(3588)

module.exports = {
  // jsonfile exports
  readJson: jsonFile.readFile,
  readJsonSync: jsonFile.readFileSync,
  writeJson: jsonFile.writeFile,
  writeJsonSync: jsonFile.writeFileSync
}


/***/ }),

/***/ 6917:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { stringify } = __nccwpck_require__(8173)
const { outputFileSync } = __nccwpck_require__(5241)

function outputJsonSync (file, data, options) {
  const str = stringify(data, options)

  outputFileSync(file, str, options)
}

module.exports = outputJsonSync


/***/ }),

/***/ 7597:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { stringify } = __nccwpck_require__(8173)
const { outputFile } = __nccwpck_require__(5241)

async function outputJson (file, data, options = {}) {
  const str = stringify(data, options)

  await outputFile(file, str, options)
}

module.exports = outputJson


/***/ }),

/***/ 6813:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const u = (__nccwpck_require__(2977).fromPromise)
const { makeDir: _makeDir, makeDirSync } = __nccwpck_require__(6293)
const makeDir = u(_makeDir)

module.exports = {
  mkdirs: makeDir,
  mkdirsSync: makeDirSync,
  // alias
  mkdirp: makeDir,
  mkdirpSync: makeDirSync,
  ensureDir: makeDir,
  ensureDirSync: makeDirSync
}


/***/ }),

/***/ 6293:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const fs = __nccwpck_require__(9238)
const { checkPath } = __nccwpck_require__(7496)

const getMode = options => {
  const defaults = { mode: 0o777 }
  if (typeof options === 'number') return options
  return ({ ...defaults, ...options }).mode
}

module.exports.makeDir = async (dir, options) => {
  checkPath(dir)

  return fs.mkdir(dir, {
    mode: getMode(options),
    recursive: true
  })
}

module.exports.makeDirSync = (dir, options) => {
  checkPath(dir)

  return fs.mkdirSync(dir, {
    mode: getMode(options),
    recursive: true
  })
}


/***/ }),

/***/ 7496:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Adapted from https://github.com/sindresorhus/make-dir
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const path = __nccwpck_require__(6928)

// https://github.com/nodejs/node/issues/8987
// https://github.com/libuv/libuv/pull/1088
module.exports.checkPath = function checkPath (pth) {
  if (process.platform === 'win32') {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path.parse(pth).root, ''))

    if (pathHasInvalidWinCharacters) {
      const error = new Error(`Path contains invalid characters: ${pth}`)
      error.code = 'EINVAL'
      throw error
    }
  }
}


/***/ }),

/***/ 5256:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
module.exports = {
  move: u(__nccwpck_require__(3219)),
  moveSync: __nccwpck_require__(1523)
}


/***/ }),

/***/ 1523:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1404)
const path = __nccwpck_require__(6928)
const copySync = (__nccwpck_require__(424).copySync)
const removeSync = (__nccwpck_require__(3073).removeSync)
const mkdirpSync = (__nccwpck_require__(6813).mkdirpSync)
const stat = __nccwpck_require__(699)

function moveSync (src, dest, opts) {
  opts = opts || {}
  const overwrite = opts.overwrite || opts.clobber || false

  const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, 'move', opts)
  stat.checkParentPathsSync(src, srcStat, dest, 'move')
  if (!isParentRoot(dest)) mkdirpSync(path.dirname(dest))
  return doRename(src, dest, overwrite, isChangingCase)
}

function isParentRoot (dest) {
  const parent = path.dirname(dest)
  const parsedPath = path.parse(parent)
  return parsedPath.root === parent
}

function doRename (src, dest, overwrite, isChangingCase) {
  if (isChangingCase) return rename(src, dest, overwrite)
  if (overwrite) {
    removeSync(dest)
    return rename(src, dest, overwrite)
  }
  if (fs.existsSync(dest)) throw new Error('dest already exists.')
  return rename(src, dest, overwrite)
}

function rename (src, dest, overwrite) {
  try {
    fs.renameSync(src, dest)
  } catch (err) {
    if (err.code !== 'EXDEV') throw err
    return moveAcrossDevice(src, dest, overwrite)
  }
}

function moveAcrossDevice (src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  }
  copySync(src, dest, opts)
  return removeSync(src)
}

module.exports = moveSync


/***/ }),

/***/ 3219:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const { copy } = __nccwpck_require__(424)
const { remove } = __nccwpck_require__(3073)
const { mkdirp } = __nccwpck_require__(6813)
const { pathExists } = __nccwpck_require__(6949)
const stat = __nccwpck_require__(699)

async function move (src, dest, opts = {}) {
  const overwrite = opts.overwrite || opts.clobber || false

  const { srcStat, isChangingCase = false } = await stat.checkPaths(src, dest, 'move', opts)

  await stat.checkParentPaths(src, srcStat, dest, 'move')

  // If the parent of dest is not root, make sure it exists before proceeding
  const destParent = path.dirname(dest)
  const parsedParentPath = path.parse(destParent)
  if (parsedParentPath.root !== destParent) {
    await mkdirp(destParent)
  }

  return doRename(src, dest, overwrite, isChangingCase)
}

async function doRename (src, dest, overwrite, isChangingCase) {
  if (!isChangingCase) {
    if (overwrite) {
      await remove(dest)
    } else if (await pathExists(dest)) {
      throw new Error('dest already exists.')
    }
  }

  try {
    // Try w/ rename first, and try copy + remove if EXDEV
    await fs.rename(src, dest)
  } catch (err) {
    if (err.code !== 'EXDEV') {
      throw err
    }
    await moveAcrossDevice(src, dest, overwrite)
  }
}

async function moveAcrossDevice (src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  }

  await copy(src, dest, opts)
  return remove(src)
}

module.exports = move


/***/ }),

/***/ 5241:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = (__nccwpck_require__(2977).fromPromise)
const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const mkdir = __nccwpck_require__(6813)
const pathExists = (__nccwpck_require__(6949).pathExists)

async function outputFile (file, data, encoding = 'utf-8') {
  const dir = path.dirname(file)

  if (!(await pathExists(dir))) {
    await mkdir.mkdirs(dir)
  }

  return fs.writeFile(file, data, encoding)
}

function outputFileSync (file, ...args) {
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) {
    mkdir.mkdirsSync(dir)
  }

  fs.writeFileSync(file, ...args)
}

module.exports = {
  outputFile: u(outputFile),
  outputFileSync
}


/***/ }),

/***/ 6949:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const u = (__nccwpck_require__(2977).fromPromise)
const fs = __nccwpck_require__(9238)

function pathExists (path) {
  return fs.access(path).then(() => true).catch(() => false)
}

module.exports = {
  pathExists: u(pathExists),
  pathExistsSync: fs.existsSync
}


/***/ }),

/***/ 3073:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1404)
const u = (__nccwpck_require__(2977).fromCallback)

function remove (path, callback) {
  fs.rm(path, { recursive: true, force: true }, callback)
}

function removeSync (path) {
  fs.rmSync(path, { recursive: true, force: true })
}

module.exports = {
  remove: u(remove),
  removeSync
}


/***/ }),

/***/ 4645:
/***/ ((module) => {

"use strict";


// https://github.com/jprichardson/node-fs-extra/issues/1056
// Performing parallel operations on each item of an async iterator is
// surprisingly hard; you need to have handlers in place to avoid getting an
// UnhandledPromiseRejectionWarning.
// NOTE: This function does not presently handle return values, only errors
async function asyncIteratorConcurrentProcess (iterator, fn) {
  const promises = []
  for await (const item of iterator) {
    promises.push(
      fn(item).then(
        () => null,
        (err) => err ?? new Error('unknown error')
      )
    )
  }
  await Promise.all(
    promises.map((promise) =>
      promise.then((possibleErr) => {
        if (possibleErr !== null) throw possibleErr
      })
    )
  )
}

module.exports = {
  asyncIteratorConcurrentProcess
}


/***/ }),

/***/ 699:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const path = __nccwpck_require__(6928)
const u = (__nccwpck_require__(2977).fromPromise)

function getStats (src, dest, opts) {
  const statFunc = opts.dereference
    ? (file) => fs.stat(file, { bigint: true })
    : (file) => fs.lstat(file, { bigint: true })
  return Promise.all([
    statFunc(src),
    statFunc(dest).catch(err => {
      if (err.code === 'ENOENT') return null
      throw err
    })
  ]).then(([srcStat, destStat]) => ({ srcStat, destStat }))
}

function getStatsSync (src, dest, opts) {
  let destStat
  const statFunc = opts.dereference
    ? (file) => fs.statSync(file, { bigint: true })
    : (file) => fs.lstatSync(file, { bigint: true })
  const srcStat = statFunc(src)
  try {
    destStat = statFunc(dest)
  } catch (err) {
    if (err.code === 'ENOENT') return { srcStat, destStat: null }
    throw err
  }
  return { srcStat, destStat }
}

async function checkPaths (src, dest, funcName, opts) {
  const { srcStat, destStat } = await getStats(src, dest, opts)
  if (destStat) {
    if (areIdentical(srcStat, destStat)) {
      const srcBaseName = path.basename(src)
      const destBaseName = path.basename(dest)
      if (funcName === 'move' &&
        srcBaseName !== destBaseName &&
        srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true }
      }
      throw new Error('Source and destination must not be the same.')
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`)
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`)
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName))
  }

  return { srcStat, destStat }
}

function checkPathsSync (src, dest, funcName, opts) {
  const { srcStat, destStat } = getStatsSync(src, dest, opts)

  if (destStat) {
    if (areIdentical(srcStat, destStat)) {
      const srcBaseName = path.basename(src)
      const destBaseName = path.basename(dest)
      if (funcName === 'move' &&
        srcBaseName !== destBaseName &&
        srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true }
      }
      throw new Error('Source and destination must not be the same.')
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`)
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`)
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return { srcStat, destStat }
}

// recursively check if dest parent is a subdirectory of src.
// It works for all file types including symlinks since it
// checks the src and dest inodes. It starts from the deepest
// parent and stops once it reaches the src parent or the root path.
async function checkParentPaths (src, srcStat, dest, funcName) {
  const srcParent = path.resolve(path.dirname(src))
  const destParent = path.resolve(path.dirname(dest))
  if (destParent === srcParent || destParent === path.parse(destParent).root) return

  let destStat
  try {
    destStat = await fs.stat(destParent, { bigint: true })
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }

  if (areIdentical(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName))
  }

  return checkParentPaths(src, srcStat, destParent, funcName)
}

function checkParentPathsSync (src, srcStat, dest, funcName) {
  const srcParent = path.resolve(path.dirname(src))
  const destParent = path.resolve(path.dirname(dest))
  if (destParent === srcParent || destParent === path.parse(destParent).root) return
  let destStat
  try {
    destStat = fs.statSync(destParent, { bigint: true })
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }
  if (areIdentical(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName)
}

function areIdentical (srcStat, destStat) {
  // stat.dev can be 0n on windows when node version >= 22.x.x
  return destStat.ino !== undefined && destStat.dev !== undefined && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev
}

// return true if dest is a subdir of src, otherwise false.
// It only checks the path strings.
function isSrcSubdir (src, dest) {
  const srcArr = path.resolve(src).split(path.sep).filter(i => i)
  const destArr = path.resolve(dest).split(path.sep).filter(i => i)
  return srcArr.every((cur, i) => destArr[i] === cur)
}

function errMsg (src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`
}

module.exports = {
  // checkPaths
  checkPaths: u(checkPaths),
  checkPathsSync,
  // checkParent
  checkParentPaths: u(checkParentPaths),
  checkParentPathsSync,
  // Misc
  isSrcSubdir,
  areIdentical
}


/***/ }),

/***/ 1226:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(9238)
const u = (__nccwpck_require__(2977).fromPromise)

async function utimesMillis (path, atime, mtime) {
  const fd = await fs.open(path, 'r+')

  let error = null

  try {
    await fs.futimes(fd, atime, mtime)
  } catch (futimesErr) {
    error = futimesErr
  } finally {
    try {
      await fs.close(fd)
    } catch (closeErr) {
      if (!error) error = closeErr
    }
  }

  if (error) {
    throw error
  }
}

function utimesMillisSync (path, atime, mtime) {
  const fd = fs.openSync(path, 'r+')

  let error = null

  try {
    fs.futimesSync(fd, atime, mtime)
  } catch (futimesErr) {
    error = futimesErr
  } finally {
    try {
      fs.closeSync(fd)
    } catch (closeErr) {
      if (!error) error = closeErr
    }
  }

  if (error) {
    throw error
  }
}

module.exports = {
  utimesMillis: u(utimesMillis),
  utimesMillisSync
}


/***/ }),

/***/ 7472:
/***/ ((module) => {

"use strict";


module.exports = clone

var getPrototypeOf = Object.getPrototypeOf || function (obj) {
  return obj.__proto__
}

function clone (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: getPrototypeOf(obj) }
  else
    var copy = Object.create(null)

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key))
  })

  return copy
}


/***/ }),

/***/ 1404:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var fs = __nccwpck_require__(9896)
var polyfills = __nccwpck_require__(3545)
var legacy = __nccwpck_require__(2674)
var clone = __nccwpck_require__(7472)

var util = __nccwpck_require__(9023)

/* istanbul ignore next - node 0.x polyfill */
var gracefulQueue
var previousSymbol

/* istanbul ignore else - node 0.x polyfill */
if (typeof Symbol === 'function' && typeof Symbol.for === 'function') {
  gracefulQueue = Symbol.for('graceful-fs.queue')
  // This is used in testing by future versions
  previousSymbol = Symbol.for('graceful-fs.previous')
} else {
  gracefulQueue = '___graceful-fs.queue'
  previousSymbol = '___graceful-fs.previous'
}

function noop () {}

function publishQueue(context, queue) {
  Object.defineProperty(context, gracefulQueue, {
    get: function() {
      return queue
    }
  })
}

var debug = noop
if (util.debuglog)
  debug = util.debuglog('gfs4')
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util.format.apply(util, arguments)
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ')
    console.error(m)
  }

// Once time initialization
if (!fs[gracefulQueue]) {
  // This queue can be shared by multiple loaded instances
  var queue = global[gracefulQueue] || []
  publishQueue(fs, queue)

  // Patch fs.close/closeSync to shared queue version, because we need
  // to retry() whenever a close happens *anywhere* in the program.
  // This is essential when multiple graceful-fs instances are
  // in play at the same time.
  fs.close = (function (fs$close) {
    function close (fd, cb) {
      return fs$close.call(fs, fd, function (err) {
        // This function uses the graceful-fs shared queue
        if (!err) {
          resetQueue()
        }

        if (typeof cb === 'function')
          cb.apply(this, arguments)
      })
    }

    Object.defineProperty(close, previousSymbol, {
      value: fs$close
    })
    return close
  })(fs.close)

  fs.closeSync = (function (fs$closeSync) {
    function closeSync (fd) {
      // This function uses the graceful-fs shared queue
      fs$closeSync.apply(fs, arguments)
      resetQueue()
    }

    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    })
    return closeSync
  })(fs.closeSync)

  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', function() {
      debug(fs[gracefulQueue])
      __nccwpck_require__(2613).equal(fs[gracefulQueue].length, 0)
    })
  }
}

if (!global[gracefulQueue]) {
  publishQueue(global, fs[gracefulQueue]);
}

module.exports = patch(clone(fs))
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
    module.exports = patch(fs)
    fs.__patched = true;
}

function patch (fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs)
  fs.gracefulify = patch

  fs.createReadStream = createReadStream
  fs.createWriteStream = createWriteStream
  var fs$readFile = fs.readFile
  fs.readFile = readFile
  function readFile (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$readFile(path, options, cb)

    function go$readFile (path, options, cb, startTime) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path, options, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  var fs$writeFile = fs.writeFile
  fs.writeFile = writeFile
  function writeFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$writeFile(path, data, options, cb)

    function go$writeFile (path, data, options, cb, startTime) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path, data, options, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  var fs$appendFile = fs.appendFile
  if (fs$appendFile)
    fs.appendFile = appendFile
  function appendFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$appendFile(path, data, options, cb)

    function go$appendFile (path, data, options, cb, startTime) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path, data, options, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  var fs$copyFile = fs.copyFile
  if (fs$copyFile)
    fs.copyFile = copyFile
  function copyFile (src, dest, flags, cb) {
    if (typeof flags === 'function') {
      cb = flags
      flags = 0
    }
    return go$copyFile(src, dest, flags, cb)

    function go$copyFile (src, dest, flags, cb, startTime) {
      return fs$copyFile(src, dest, flags, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$copyFile, [src, dest, flags, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  var fs$readdir = fs.readdir
  fs.readdir = readdir
  var noReaddirOptionVersions = /^v[0-5]\./
  function readdir (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    var go$readdir = noReaddirOptionVersions.test(process.version)
      ? function go$readdir (path, options, cb, startTime) {
        return fs$readdir(path, fs$readdirCallback(
          path, options, cb, startTime
        ))
      }
      : function go$readdir (path, options, cb, startTime) {
        return fs$readdir(path, options, fs$readdirCallback(
          path, options, cb, startTime
        ))
      }

    return go$readdir(path, options, cb)

    function fs$readdirCallback (path, options, cb, startTime) {
      return function (err, files) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([
            go$readdir,
            [path, options, cb],
            err,
            startTime || Date.now(),
            Date.now()
          ])
        else {
          if (files && files.sort)
            files.sort()

          if (typeof cb === 'function')
            cb.call(this, err, files)
        }
      }
    }
  }

  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs)
    ReadStream = legStreams.ReadStream
    WriteStream = legStreams.WriteStream
  }

  var fs$ReadStream = fs.ReadStream
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype)
    ReadStream.prototype.open = ReadStream$open
  }

  var fs$WriteStream = fs.WriteStream
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype)
    WriteStream.prototype.open = WriteStream$open
  }

  Object.defineProperty(fs, 'ReadStream', {
    get: function () {
      return ReadStream
    },
    set: function (val) {
      ReadStream = val
    },
    enumerable: true,
    configurable: true
  })
  Object.defineProperty(fs, 'WriteStream', {
    get: function () {
      return WriteStream
    },
    set: function (val) {
      WriteStream = val
    },
    enumerable: true,
    configurable: true
  })

  // legacy names
  var FileReadStream = ReadStream
  Object.defineProperty(fs, 'FileReadStream', {
    get: function () {
      return FileReadStream
    },
    set: function (val) {
      FileReadStream = val
    },
    enumerable: true,
    configurable: true
  })
  var FileWriteStream = WriteStream
  Object.defineProperty(fs, 'FileWriteStream', {
    get: function () {
      return FileWriteStream
    },
    set: function (val) {
      FileWriteStream = val
    },
    enumerable: true,
    configurable: true
  })

  function ReadStream (path, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy()

        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
        that.read()
      }
    })
  }

  function WriteStream (path, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy()
        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
      }
    })
  }

  function createReadStream (path, options) {
    return new fs.ReadStream(path, options)
  }

  function createWriteStream (path, options) {
    return new fs.WriteStream(path, options)
  }

  var fs$open = fs.open
  fs.open = open
  function open (path, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null

    return go$open(path, flags, mode, cb)

    function go$open (path, flags, mode, cb, startTime) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path, flags, mode, cb], err, startTime || Date.now(), Date.now()])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
        }
      })
    }
  }

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1])
  fs[gracefulQueue].push(elem)
  retry()
}

// keep track of the timeout between retry() calls
var retryTimer

// reset the startTime and lastTime to now
// this resets the start of the 60 second overall timeout as well as the
// delay between attempts so that we'll retry these jobs sooner
function resetQueue () {
  var now = Date.now()
  for (var i = 0; i < fs[gracefulQueue].length; ++i) {
    // entries that are only a length of 2 are from an older version, don't
    // bother modifying those since they'll be retried anyway.
    if (fs[gracefulQueue][i].length > 2) {
      fs[gracefulQueue][i][3] = now // startTime
      fs[gracefulQueue][i][4] = now // lastTime
    }
  }
  // call retry to make sure we're actively processing the queue
  retry()
}

function retry () {
  // clear the timer and remove it to help prevent unintended concurrency
  clearTimeout(retryTimer)
  retryTimer = undefined

  if (fs[gracefulQueue].length === 0)
    return

  var elem = fs[gracefulQueue].shift()
  var fn = elem[0]
  var args = elem[1]
  // these items may be unset if they were added by an older graceful-fs
  var err = elem[2]
  var startTime = elem[3]
  var lastTime = elem[4]

  // if we don't have a startTime we have no way of knowing if we've waited
  // long enough, so go ahead and retry this item now
  if (startTime === undefined) {
    debug('RETRY', fn.name, args)
    fn.apply(null, args)
  } else if (Date.now() - startTime >= 60000) {
    // it's been more than 60 seconds total, bail now
    debug('TIMEOUT', fn.name, args)
    var cb = args.pop()
    if (typeof cb === 'function')
      cb.call(null, err)
  } else {
    // the amount of time between the last attempt and right now
    var sinceAttempt = Date.now() - lastTime
    // the amount of time between when we first tried, and when we last tried
    // rounded up to at least 1
    var sinceStart = Math.max(lastTime - startTime, 1)
    // backoff. wait longer than the total time we've been retrying, but only
    // up to a maximum of 100ms
    var desiredDelay = Math.min(sinceStart * 1.2, 100)
    // it's been long enough since the last retry, do it again
    if (sinceAttempt >= desiredDelay) {
      debug('RETRY', fn.name, args)
      fn.apply(null, args.concat([startTime]))
    } else {
      // if we can't do this job yet, push it to the end of the queue
      // and let the next iteration check again
      fs[gracefulQueue].push(elem)
    }
  }

  // schedule our next run if one isn't already scheduled
  if (retryTimer === undefined) {
    retryTimer = setTimeout(retry, 0)
  }
}


/***/ }),

/***/ 2674:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var Stream = (__nccwpck_require__(2203).Stream)

module.exports = legacy

function legacy (fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

    Stream.call(this);

    var self = this;

    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    })
  }

  function WriteStream (path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

    Stream.call(this);

    this.path = path;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}


/***/ }),

/***/ 3545:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var constants = __nccwpck_require__(9140)

var origCwd = process.cwd
var cwd = null

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform

process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process)
  return cwd
}
try {
  process.cwd()
} catch (er) {}

// This check is needed until node.js 12 is required
if (typeof process.chdir === 'function') {
  var chdir = process.chdir
  process.chdir = function (d) {
    cwd = null
    chdir.call(process, d)
  }
  if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir)
}

module.exports = patch

function patch (fs) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs)
  }

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs)
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = chownFix(fs.chown)
  fs.fchown = chownFix(fs.fchown)
  fs.lchown = chownFix(fs.lchown)

  fs.chmod = chmodFix(fs.chmod)
  fs.fchmod = chmodFix(fs.fchmod)
  fs.lchmod = chmodFix(fs.lchmod)

  fs.chownSync = chownFixSync(fs.chownSync)
  fs.fchownSync = chownFixSync(fs.fchownSync)
  fs.lchownSync = chownFixSync(fs.lchownSync)

  fs.chmodSync = chmodFixSync(fs.chmodSync)
  fs.fchmodSync = chmodFixSync(fs.fchmodSync)
  fs.lchmodSync = chmodFixSync(fs.lchmodSync)

  fs.stat = statFix(fs.stat)
  fs.fstat = statFix(fs.fstat)
  fs.lstat = statFix(fs.lstat)

  fs.statSync = statFixSync(fs.statSync)
  fs.fstatSync = statFixSync(fs.fstatSync)
  fs.lstatSync = statFixSync(fs.lstatSync)

  // if lchmod/lchown do not exist, then make them no-ops
  if (fs.chmod && !fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchmodSync = function () {}
  }
  if (fs.chown && !fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchownSync = function () {}
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  if (platform === "win32") {
    fs.rename = typeof fs.rename !== 'function' ? fs.rename
    : (function (fs$rename) {
      function rename (from, to, cb) {
        var start = Date.now()
        var backoff = 0;
        fs$rename(from, to, function CB (er) {
          if (er
              && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY")
              && Date.now() - start < 60000) {
            setTimeout(function() {
              fs.stat(to, function (stater, st) {
                if (stater && stater.code === "ENOENT")
                  fs$rename(from, to, CB);
                else
                  cb(er)
              })
            }, backoff)
            if (backoff < 100)
              backoff += 10;
            return;
          }
          if (cb) cb(er)
        })
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename)
      return rename
    })(fs.rename)
  }

  // if read() returns EAGAIN, then just try it again.
  fs.read = typeof fs.read !== 'function' ? fs.read
  : (function (fs$read) {
    function read (fd, buffer, offset, length, position, callback_) {
      var callback
      if (callback_ && typeof callback_ === 'function') {
        var eagCounter = 0
        callback = function (er, _, __) {
          if (er && er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter ++
            return fs$read.call(fs, fd, buffer, offset, length, position, callback)
          }
          callback_.apply(this, arguments)
        }
      }
      return fs$read.call(fs, fd, buffer, offset, length, position, callback)
    }

    // This ensures `util.promisify` works as it does for native `fs.read`.
    if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read)
    return read
  })(fs.read)

  fs.readSync = typeof fs.readSync !== 'function' ? fs.readSync
  : (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0
    while (true) {
      try {
        return fs$readSync.call(fs, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          continue
        }
        throw er
      }
    }
  }})(fs.readSync)

  function patchLchmod (fs) {
    fs.lchmod = function (path, mode, callback) {
      fs.open( path
             , constants.O_WRONLY | constants.O_SYMLINK
             , mode
             , function (err, fd) {
        if (err) {
          if (callback) callback(err)
          return
        }
        // prefer to return the chmod error, if one occurs,
        // but still try to close, and report closing errors if they occur.
        fs.fchmod(fd, mode, function (err) {
          fs.close(fd, function(err2) {
            if (callback) callback(err || err2)
          })
        })
      })
    }

    fs.lchmodSync = function (path, mode) {
      var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode)

      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      var threw = true
      var ret
      try {
        ret = fs.fchmodSync(fd, mode)
        threw = false
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd)
          } catch (er) {}
        } else {
          fs.closeSync(fd)
        }
      }
      return ret
    }
  }

  function patchLutimes (fs) {
    if (constants.hasOwnProperty("O_SYMLINK") && fs.futimes) {
      fs.lutimes = function (path, at, mt, cb) {
        fs.open(path, constants.O_SYMLINK, function (er, fd) {
          if (er) {
            if (cb) cb(er)
            return
          }
          fs.futimes(fd, at, mt, function (er) {
            fs.close(fd, function (er2) {
              if (cb) cb(er || er2)
            })
          })
        })
      }

      fs.lutimesSync = function (path, at, mt) {
        var fd = fs.openSync(path, constants.O_SYMLINK)
        var ret
        var threw = true
        try {
          ret = fs.futimesSync(fd, at, mt)
          threw = false
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd)
            } catch (er) {}
          } else {
            fs.closeSync(fd)
          }
        }
        return ret
      }

    } else if (fs.futimes) {
      fs.lutimes = function (_a, _b, _c, cb) { if (cb) process.nextTick(cb) }
      fs.lutimesSync = function () {}
    }
  }

  function chmodFix (orig) {
    if (!orig) return orig
    return function (target, mode, cb) {
      return orig.call(fs, target, mode, function (er) {
        if (chownErOk(er)) er = null
        if (cb) cb.apply(this, arguments)
      })
    }
  }

  function chmodFixSync (orig) {
    if (!orig) return orig
    return function (target, mode) {
      try {
        return orig.call(fs, target, mode)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }


  function chownFix (orig) {
    if (!orig) return orig
    return function (target, uid, gid, cb) {
      return orig.call(fs, target, uid, gid, function (er) {
        if (chownErOk(er)) er = null
        if (cb) cb.apply(this, arguments)
      })
    }
  }

  function chownFixSync (orig) {
    if (!orig) return orig
    return function (target, uid, gid) {
      try {
        return orig.call(fs, target, uid, gid)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }

  function statFix (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options, cb) {
      if (typeof options === 'function') {
        cb = options
        options = null
      }
      function callback (er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 0x100000000
          if (stats.gid < 0) stats.gid += 0x100000000
        }
        if (cb) cb.apply(this, arguments)
      }
      return options ? orig.call(fs, target, options, callback)
        : orig.call(fs, target, callback)
    }
  }

  function statFixSync (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options) {
      var stats = options ? orig.call(fs, target, options)
        : orig.call(fs, target)
      if (stats) {
        if (stats.uid < 0) stats.uid += 0x100000000
        if (stats.gid < 0) stats.gid += 0x100000000
      }
      return stats;
    }
  }

  // ENOSYS means that the fs doesn't support the op. Just ignore
  // that, because it doesn't matter.
  //
  // if there's no getuid, or if getuid() is something other
  // than 0, and the error is EINVAL or EPERM, then just ignore
  // it.
  //
  // This specific case is a silent failure in cp, install, tar,
  // and most other unix tools that manage permissions.
  //
  // When running as root, or if other types of errors are
  // encountered, then it's strict.
  function chownErOk (er) {
    if (!er)
      return true

    if (er.code === "ENOSYS")
      return true

    var nonroot = !process.getuid || process.getuid() !== 0
    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM")
        return true
    }

    return false
  }
}


/***/ }),

/***/ 3588:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

let _fs
try {
  _fs = __nccwpck_require__(1404)
} catch (_) {
  _fs = __nccwpck_require__(9896)
}
const universalify = __nccwpck_require__(2977)
const { stringify, stripBom } = __nccwpck_require__(8173)

async function _readFile (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }

  const fs = options.fs || _fs

  const shouldThrow = 'throws' in options ? options.throws : true

  let data = await universalify.fromCallback(fs.readFile)(file, options)

  data = stripBom(data)

  let obj
  try {
    obj = JSON.parse(data, options ? options.reviver : null)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`
      throw err
    } else {
      return null
    }
  }

  return obj
}

const readFile = universalify.fromPromise(_readFile)

function readFileSync (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }

  const fs = options.fs || _fs

  const shouldThrow = 'throws' in options ? options.throws : true

  try {
    let content = fs.readFileSync(file, options)
    content = stripBom(content)
    return JSON.parse(content, options.reviver)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`
      throw err
    } else {
      return null
    }
  }
}

async function _writeFile (file, obj, options = {}) {
  const fs = options.fs || _fs

  const str = stringify(obj, options)

  await universalify.fromCallback(fs.writeFile)(file, str, options)
}

const writeFile = universalify.fromPromise(_writeFile)

function writeFileSync (file, obj, options = {}) {
  const fs = options.fs || _fs

  const str = stringify(obj, options)
  // not sure if fs.writeFileSync returns anything, but just in case
  return fs.writeFileSync(file, str, options)
}

// NOTE: do not change this export format; required for ESM compat
// see https://github.com/jprichardson/node-jsonfile/pull/162 for details
module.exports = {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync
}


/***/ }),

/***/ 8173:
/***/ ((module) => {

function stringify (obj, { EOL = '\n', finalEOL = true, replacer = null, spaces } = {}) {
  const EOF = finalEOL ? EOL : ''
  const str = JSON.stringify(obj, replacer, spaces)

  if (str === undefined) {
    throw new TypeError(`Converting ${typeof obj} value to JSON is not supported`)
  }

  return str.replace(/\n/g, EOL) + EOF
}

function stripBom (content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (Buffer.isBuffer(content)) content = content.toString('utf8')
  return content.replace(/^\uFEFF/, '')
}

module.exports = { stringify, stripBom }


/***/ }),

/***/ 2977:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


exports.fromCallback = function (fn) {
  return Object.defineProperty(function (...args) {
    if (typeof args[args.length - 1] === 'function') fn.apply(this, args)
    else {
      return new Promise((resolve, reject) => {
        args.push((err, res) => (err != null) ? reject(err) : resolve(res))
        fn.apply(this, args)
      })
    }
  }, 'name', { value: fn.name })
}

exports.fromPromise = function (fn) {
  return Object.defineProperty(function (...args) {
    const cb = args[args.length - 1]
    if (typeof cb !== 'function') return fn.apply(this, args)
    else {
      args.pop()
      fn.apply(this, args).then(r => cb(null, r), cb)
    }
  }, 'name', { value: fn.name })
}


/***/ }),

/***/ 4737:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/**
 * Agentforce context detector.
 * Scans the project for Agentforce-related metadata and provides recommendations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.detectAgentforceContext = detectAgentforceContext;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const AFV_SKILL_NAMES = [
    'agentforce', 'lightning', 'apex', 'soql', 'lwc', 'flow',
    'permissions', 'objects', 'fields', 'ui-bundle', 'samples',
];
async function detectAfvLibraryInstalled(rootPath) {
    const skillsDir = path.join(rootPath, '.cursor', 'skills');
    if (!(await fs.pathExists(skillsDir)))
        return false;
    try {
        const entries = await fs.readdir(skillsDir);
        return entries.some((e) => AFV_SKILL_NAMES.some((name) => e.toLowerCase().includes(name)));
    }
    catch {
        return false;
    }
}
/**
 * Walk a directory recursively and collect all files matching a predicate.
 */
async function findFiles(dir, predicate) {
    const results = [];
    if (!(await fs.pathExists(dir)))
        return results;
    async function recurse(current) {
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await recurse(fullPath);
            }
            else if (predicate(entry.name)) {
                results.push(fullPath);
            }
        }
    }
    await recurse(dir);
    return results;
}
/**
 * Extract the Apex class name from a .cls file path or content.
 * Falls back to the file basename without extension.
 */
function extractClassName(filePath, content) {
    // Try to find the class declaration
    const match = content.match(/\bclass\s+(\w+)\b/);
    if (match)
        return match[1];
    return path.basename(filePath, '.cls');
}
async function detectAgentforceContext(rootPath) {
    const forceAppDir = path.join(rootPath, 'force-app');
    // Run all scans in parallel
    const [clsFiles, promptFiles, topicFiles, botFiles, afvLibraryInstalled] = await Promise.all([
        findFiles(forceAppDir, (name) => name.endsWith('.cls')),
        findFiles(forceAppDir, (name) => name.endsWith('.prompt-meta.xml')),
        findFiles(forceAppDir, (name) => name.endsWith('.agentTopic-meta.xml')),
        findFiles(forceAppDir, (name) => name.endsWith('.bot-meta.xml')),
        detectAfvLibraryInstalled(rootPath),
    ]);
    // Find classes with @InvocableMethod
    const invocableActions = [];
    await Promise.all(clsFiles.map(async (filePath) => {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            if (/@InvocableMethod\b/i.test(content)) {
                invocableActions.push(extractClassName(filePath, content));
            }
        }
        catch {
            // skip unreadable files
        }
    }));
    // Prompt templates — filename without the double extension
    const promptTemplates = promptFiles.map((f) => path.basename(f).replace('.prompt-meta.xml', ''));
    // Agent topics — merge both kinds
    const agentTopics = [
        ...topicFiles.map((f) => path.basename(f).replace('.agentTopic-meta.xml', '')),
        ...botFiles.map((f) => path.basename(f).replace('.bot-meta.xml', '')),
    ];
    const hasAgentforceMetadata = invocableActions.length > 0 ||
        promptTemplates.length > 0 ||
        agentTopics.length > 0;
    const recommendations = [];
    if (invocableActions.length > 0 && !afvLibraryInstalled) {
        recommendations.push('AFV Library skills available for Agentforce development — run: npx skills add forcedotcom/afv-library');
    }
    if (promptTemplates.length > 0) {
        recommendations.push('Review Prompt Templates for security — use /review-security command');
    }
    return {
        hasAgentforceMetadata,
        invocableActions,
        promptTemplates,
        agentTopics,
        afvLibraryInstalled,
        recommendations,
    };
}
//# sourceMappingURL=agentforce-detector.js.map

/***/ }),

/***/ 6616:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.applySetup = applySetup;
const path = __importStar(__nccwpck_require__(6928));
const fs = __importStar(__nccwpck_require__(1348));
const templates_1 = __nccwpck_require__(9639);
const safe_write_1 = __nccwpck_require__(6157);
const backup_1 = __nccwpck_require__(3452);
function resolvePathInsideRoot(rootPath, relativePath) {
    const normalizedRoot = path.resolve(rootPath);
    const resolvedPath = path.resolve(normalizedRoot, relativePath);
    if (resolvedPath !== normalizedRoot && !resolvedPath.startsWith(normalizedRoot + path.sep)) {
        throw new Error(`Path escapes project root: ${relativePath}`);
    }
    return resolvedPath;
}
async function applySetup(rootPath, plan) {
    const result = {
        filesCreated: [],
        filesModified: [],
        filesSkipped: [],
        packageJsonUpdated: false,
        forceIgnoreUpdated: false,
        errors: [],
    };
    // Collect existing files that will be modified for backup
    const filesToBackup = [];
    for (const planned of plan.files) {
        if (planned.action !== 'create') {
            try {
                filesToBackup.push(resolvePathInsideRoot(rootPath, planned.relativePath));
            }
            catch (err) {
                result.errors.push(String(err));
            }
        }
    }
    if (plan.forceIgnoreLines.length > 0) {
        const fi = path.join(rootPath, '.forceignore');
        if (await fs.pathExists(fi))
            filesToBackup.push(fi);
    }
    if (Object.keys(plan.packageJsonScripts).length > 0) {
        filesToBackup.push(path.join(rootPath, 'package.json'));
    }
    if (!plan.dryRun && filesToBackup.length > 0) {
        try {
            const backupPath = await (0, backup_1.createBackup)(rootPath, filesToBackup);
            result.backupPath = backupPath;
        }
        catch (err) {
            result.errors.push(`Backup failed: ${String(err)}`);
        }
    }
    // Apply file operations
    for (const planned of plan.files) {
        if (planned.action === 'skip') {
            result.filesSkipped.push(planned.relativePath);
            continue;
        }
        let fullPath;
        try {
            fullPath = resolvePathInsideRoot(rootPath, planned.relativePath);
        }
        catch (err) {
            result.errors.push(`Failed to write ${planned.relativePath}: ${String(err)}`);
            continue;
        }
        const content = templates_1.TEMPLATES[planned.templateKey] ?? `# ${planned.relativePath}\n\n<!-- TODO: Add content -->\n`;
        try {
            const writeResult = await (0, safe_write_1.writeFileSafe)(fullPath, content, { dryRun: plan.dryRun });
            if (writeResult.action === 'create') {
                result.filesCreated.push(planned.relativePath);
            }
            else if (writeResult.action === 'append' || writeResult.action === 'merge') {
                result.filesModified.push(planned.relativePath);
            }
            else {
                result.filesSkipped.push(planned.relativePath);
            }
        }
        catch (err) {
            result.errors.push(`Failed to write ${planned.relativePath}: ${String(err)}`);
        }
    }
    // Update .forceignore
    if (plan.forceIgnoreLines.length > 0) {
        try {
            const fiPath = path.join(rootPath, '.forceignore');
            if (!plan.dryRun) {
                await (0, safe_write_1.appendMissingLines)(fiPath, plan.forceIgnoreLines);
            }
            result.forceIgnoreUpdated = true;
        }
        catch (err) {
            result.errors.push(`Failed to update .forceignore: ${String(err)}`);
        }
    }
    // Update package.json scripts
    if (Object.keys(plan.packageJsonScripts).length > 0) {
        try {
            if (!plan.dryRun) {
                const added = await (0, safe_write_1.mergePackageJsonScripts)(rootPath, plan.packageJsonScripts);
                result.packageJsonUpdated = added.length > 0;
            }
            else {
                result.packageJsonUpdated = true;
            }
        }
        catch (err) {
            result.errors.push(`Failed to update package.json: ${String(err)}`);
        }
    }
    return result;
}
//# sourceMappingURL=apply.js.map

/***/ }),

/***/ 3452:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createBackup = createBackup;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
function timestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return (`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
        `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`);
}
async function createBackup(rootPath, filePaths) {
    const normalizedRoot = path.resolve(rootPath);
    const backupDir = path.join(normalizedRoot, '.sf-ai-toolkit-backup', timestamp());
    await fs.ensureDir(backupDir);
    for (const filePath of filePaths) {
        const resolvedFilePath = path.resolve(filePath);
        if (resolvedFilePath !== normalizedRoot && !resolvedFilePath.startsWith(normalizedRoot + path.sep)) {
            throw new Error(`Refusing to back up file outside project root: ${filePath}`);
        }
        const exists = await fs.pathExists(resolvedFilePath);
        if (!exists)
            continue;
        const relativePath = path.relative(normalizedRoot, resolvedFilePath);
        if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            throw new Error(`Invalid backup path: ${filePath}`);
        }
        const backupFilePath = path.join(backupDir, relativePath + '.bak');
        const resolvedBackupPath = path.resolve(backupFilePath);
        if (resolvedBackupPath !== backupDir && !resolvedBackupPath.startsWith(backupDir + path.sep)) {
            throw new Error(`Refusing to write backup outside backup directory: ${backupFilePath}`);
        }
        await fs.ensureDir(path.dirname(backupFilePath));
        await fs.copy(resolvedFilePath, resolvedBackupPath);
    }
    return backupDir;
}
//# sourceMappingURL=backup.js.map

/***/ }),

/***/ 3994:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * Generates the salesforce-dx.json claude-mem mode file.
 * Drop it in the claude-mem plugin/modes/ directory to teach claude-mem
 * to capture Salesforce-specific observations across sessions.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SALESFORCE_DX_MODE = void 0;
exports.generateClaudeMemModeJson = generateClaudeMemModeJson;
exports.SALESFORCE_DX_MODE = {
    name: 'salesforce-dx',
    description: 'Captures Salesforce DX development observations — Apex patterns, deployment decisions, org config, MCP operations, security rules, and permission model choices.',
    version: '1.0.0',
    observation_types: [
        {
            id: 'apex-pattern',
            label: 'Apex Pattern',
            description: 'A reusable Apex design decision — service layer, trigger handler, selector, domain pattern, bulk handling approach, or async strategy.',
            emoji: '⚡',
            work_emoji: '🔨',
        },
        {
            id: 'deployment-issue',
            label: 'Deployment Issue',
            description: 'A deployment decision, validation error, test failure, coverage gap, or rollback action encountered during deployment.',
            emoji: '🚀',
            work_emoji: '🔧',
        },
        {
            id: 'permission-rule',
            label: 'Permission Rule',
            description: 'A decision about Permission Sets, Profiles, CRUD/FLS enforcement, sharing rules, or guest user access configuration.',
            emoji: '🔒',
            work_emoji: '🛡️',
        },
        {
            id: 'org-config',
            label: 'Org Config',
            description: 'An org alias, scratch org definition, sandbox configuration, Connected App setting, Named Credential setup, or remote site setting.',
            emoji: '🏢',
            work_emoji: '⚙️',
        },
        {
            id: 'mcp-operation',
            label: 'MCP Operation',
            description: 'A Salesforce DX MCP tool use — org query, metadata retrieval, deployment via MCP, SOQL run, or LWC expert guidance call.',
            emoji: '🤖',
            work_emoji: '🔗',
        },
        {
            id: 'security-finding',
            label: 'Security Finding',
            description: 'A SOQL injection risk, missing CRUD/FLS check, sharing violation, exposed credential, guest user gap, or production safety concern.',
            emoji: '🚨',
            work_emoji: '🔍',
        },
        {
            id: 'lwc-decision',
            label: 'LWC Decision',
            description: 'A Lightning Web Component design choice — wire adapter selection, component decomposition, state management, Apex integration pattern, or UX state handling.',
            emoji: '⚡',
            work_emoji: '🎨',
        },
        {
            id: 'test-strategy',
            label: 'Test Strategy',
            description: 'An Apex test design decision — test data strategy, mock approach, coverage gap fix, bulk test pattern, or security test scenario.',
            emoji: '🧪',
            work_emoji: '✅',
        },
        {
            id: 'agentforce-pattern',
            label: 'Agentforce Pattern',
            description: 'An Agentforce agent design decision — topic scope, invocable action design, Prompt Template approach, or AFV Library skill usage.',
            emoji: '🧠',
            work_emoji: '🤖',
        },
    ],
    observation_concepts: [
        {
            id: 'governor-limit',
            label: 'Governor Limit',
            description: 'Relates to Apex governor limits — SOQL rows, DML statements, CPU time, heap size.',
        },
        {
            id: 'security-critical',
            label: 'Security Critical',
            description: 'Relates to CRUD/FLS, sharing, SOQL injection, secrets, or production safety.',
        },
        {
            id: 'production-risk',
            label: 'Production Risk',
            description: 'Affects production org — deployment, permission change, data mutation, or metadata deletion.',
        },
        {
            id: 'reusable-pattern',
            label: 'Reusable Pattern',
            description: 'A pattern worth applying to other areas of the codebase.',
        },
        {
            id: 'mcp-preferred',
            label: 'MCP Preferred',
            description: 'This operation should use Salesforce DX MCP rather than CLI commands.',
        },
        {
            id: 'org-specific',
            label: 'Org Specific',
            description: 'Only applies to a particular org alias, sandbox, or production configuration.',
        },
        {
            id: 'ai-kit-generated',
            label: 'AI-Kit Generated',
            description: 'Created or modified by AI-Kit for Salesforce scaffold.',
        },
    ],
    prompts: {
        system_identity: 'You are a senior Salesforce DX observer embedded in the development session. ' +
            'Your role is to capture high-signal observations about Salesforce Apex patterns, ' +
            'deployment decisions, permission model choices, org configuration, MCP operations, ' +
            'and security findings. You help the team build institutional memory about this org.',
        spatial_awareness: 'This is a Salesforce DX project. Source lives under force-app/. ' +
            'The team uses sf CLI, Salesforce DX MCP, Cursor with project rules, ' +
            'Claude Code with CLAUDE.md rules, and AI-Kit for Salesforce scaffolding. ' +
            'Org operations prefer MCP over direct CLI. Production is read-only by default.',
        observer_role: 'Observe the development session and capture decisions that would be valuable to remember ' +
            'across sessions — especially patterns that are non-obvious, project-specific, or that ' +
            'took effort to figure out. Prioritise: Apex design patterns, deployment learnings, ' +
            'security decisions, org-specific configuration, and MCP operation results.',
        recording_focus: 'Focus on: Apex patterns (bulkification, service layer, trigger handler), ' +
            'deployment outcomes (what failed, what worked, why), ' +
            'permission model decisions (which Permission Sets, which CRUD/FLS patterns), ' +
            'org config (org aliases, Connected Apps, Named Credentials), ' +
            'MCP operations (what was queried, what was deployed), ' +
            'security findings (SOQL injection risks, sharing decisions), ' +
            'LWC decisions (wire adapters, component decomposition), ' +
            'test strategies (test data approach, coverage gaps fixed).',
        skip_guidance: 'Skip: trivial variable renames, minor formatting changes, ' +
            'obvious syntax fixes that are not project-specific, ' +
            'standard boilerplate that any Salesforce developer would know, ' +
            'and file saves without meaningful code changes.',
        type_guidance: 'Use apex-pattern for any reusable Apex design decision. ' +
            'Use deployment-issue for any deployment action, validation result, or test failure. ' +
            'Use permission-rule for any CRUD/FLS, sharing, or Permission Set decision. ' +
            'Use org-config for any org alias, auth, or integration configuration. ' +
            'Use mcp-operation when MCP tools are used for org interaction. ' +
            'Use security-finding for any security risk identified or resolved. ' +
            'Use lwc-decision for any LWC design or integration choice. ' +
            'Use test-strategy for any test design or coverage decision. ' +
            'Use agentforce-pattern for any Agentforce agent or invocable action design.',
        concept_guidance: 'Tag governor-limit for anything that could hit Apex limits. ' +
            'Tag security-critical for CRUD/FLS, sharing, injection, or secrets. ' +
            'Tag production-risk for anything affecting production org. ' +
            'Tag reusable-pattern for patterns worth applying elsewhere. ' +
            'Tag mcp-preferred when MCP should be used instead of CLI. ' +
            'Tag org-specific when the observation only applies to one org.',
        field_guidance: 'Include the org alias when known. ' +
            'Reference the specific Apex class, trigger, or component when relevant. ' +
            'Include the sf CLI or MCP command used when it is part of the observation. ' +
            'Note whether this applies to sandbox, scratch org, or production.',
    },
};
function generateClaudeMemModeJson() {
    return JSON.stringify(exports.SALESFORCE_DX_MODE, null, 2) + '\n';
}
//# sourceMappingURL=claude-mem-mode.js.map

/***/ }),

/***/ 3868:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DEFAULT_TOOLKIT_CONFIG = exports.TOOLKIT_CONFIG_PATH = void 0;
exports.loadToolkitConfig = loadToolkitConfig;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
exports.TOOLKIT_CONFIG_PATH = 'sf-ai-toolkit.config.json';
exports.DEFAULT_TOOLKIT_CONFIG = {
    quality: {
        pmd: {
            enabled: false,
            runCommand: 'pmd check -d "force-app/main/default/classes,force-app/main/default/triggers" -R category/apex/bestpractices.xml',
        },
    },
    git: {
        commitMessage: {
            enabled: true,
            pattern: '^(feat|fix|docs|chore|refactor|test|perf)(\\([a-z0-9_-]+\\))?: .{1,72}$',
            helpText: 'Use Conventional Commit format, e.g. feat(apex): add account service validation',
        },
    },
};
function mergeToolkitConfig(defaults, overrides) {
    if (!overrides)
        return defaults;
    return {
        quality: {
            pmd: {
                ...defaults.quality?.pmd,
                ...overrides.quality?.pmd,
            },
        },
        git: {
            commitMessage: {
                ...defaults.git?.commitMessage,
                ...overrides.git?.commitMessage,
            },
        },
    };
}
async function loadToolkitConfig(rootPath) {
    const configPath = path.join(rootPath, exports.TOOLKIT_CONFIG_PATH);
    const exists = await fs.pathExists(configPath);
    if (!exists)
        return exports.DEFAULT_TOOLKIT_CONFIG;
    try {
        const raw = await fs.readFile(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return mergeToolkitConfig(exports.DEFAULT_TOOLKIT_CONFIG, parsed);
    }
    catch {
        return exports.DEFAULT_TOOLKIT_CONFIG;
    }
}
//# sourceMappingURL=config.js.map

/***/ }),

/***/ 3736:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/**
 * Org-aware deploy diff preview.
 * Walks the source directory, classifies components by file extension/name,
 * reads org context, and assembles a deploy preview report.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildDeployPreview = buildDeployPreview;
exports.formatDeployPreview = formatDeployPreview;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const org_context_1 = __nccwpck_require__(140);
// ─── File extension → component type mapping ──────────────────────────────
function classifyFile(filePath, relativePath) {
    const basename = path.basename(filePath);
    const name = basename.replace(/\.[^.]+$/, '').replace(/\.[^.]+$/, ''); // strip double extension
    if (basename.endsWith('.cls')) {
        return { name: basename.replace('.cls', ''), type: 'ApexClass', filePath: relativePath };
    }
    if (basename.endsWith('.trigger')) {
        return { name: basename.replace('.trigger', ''), type: 'ApexTrigger', filePath: relativePath };
    }
    if (basename.endsWith('.js') && filePath.includes(`${path.sep}lwc${path.sep}`)) {
        // Only count the component folder once — use the JS file as the representative
        const parts = filePath.split(path.sep);
        const lwcIdx = parts.lastIndexOf('lwc');
        const compName = lwcIdx !== -1 ? parts[lwcIdx + 1] : name;
        // Only emit for the main component JS (same name as folder)
        if (basename === `${compName}.js`) {
            return { name: compName, type: 'LightningComponentBundle', filePath: relativePath };
        }
        return null;
    }
    if (basename.endsWith('.flow-meta.xml')) {
        return { name: basename.replace('.flow-meta.xml', ''), type: 'Flow', filePath: relativePath };
    }
    if (basename.endsWith('-meta.xml')) {
        if (basename.toLowerCase().includes('permissionset')) {
            return { name: basename.replace('-meta.xml', ''), type: 'PermissionSet', filePath: relativePath };
        }
        if (basename.toLowerCase().includes('profile')) {
            return { name: basename.replace('-meta.xml', ''), type: 'Profile', filePath: relativePath };
        }
    }
    // Fall-through — check parent directory name conventions for meta.xml files
    if (basename.endsWith('.permissionset-meta.xml')) {
        return { name: basename.replace('.permissionset-meta.xml', ''), type: 'PermissionSet', filePath: relativePath };
    }
    if (basename.endsWith('.profile-meta.xml')) {
        return { name: basename.replace('.profile-meta.xml', ''), type: 'Profile', filePath: relativePath };
    }
    return null;
}
async function walkDir(dir, rootPath) {
    const components = [];
    if (!(await fs.pathExists(dir)))
        return components;
    async function recurse(current) {
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await recurse(fullPath);
            }
            else {
                const relativePath = path.relative(rootPath, fullPath);
                const component = classifyFile(fullPath, relativePath);
                if (component) {
                    components.push(component);
                }
            }
        }
    }
    await recurse(dir);
    return components;
}
async function hasDestructiveChanges(rootPath) {
    // Check common locations for destructiveChanges.xml
    const candidates = [
        path.join(rootPath, 'destructiveChanges.xml'),
        path.join(rootPath, 'force-app', 'destructiveChanges.xml'),
        path.join(rootPath, 'manifest', 'destructiveChanges.xml'),
        path.join(rootPath, 'destructiveChangesPre.xml'),
        path.join(rootPath, 'destructiveChangesPost.xml'),
    ];
    const results = await Promise.all(candidates.map((c) => fs.pathExists(c)));
    return results.some(Boolean);
}
function isSafeSourceDir(sourceDir) {
    if (sourceDir.trim().length === 0)
        return false;
    if (path.isAbsolute(sourceDir))
        return false;
    if (sourceDir.includes('\0'))
        return false;
    if (sourceDir.split(/[\\/]/).some((segment) => segment === '..'))
        return false;
    return /^[a-zA-Z0-9._\-/]+$/.test(sourceDir);
}
function shellQuote(value) {
    return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}
/**
 * Build a deploy preview for the given project root.
 * All found components are treated as "to add" (we don't have org-side state without auth).
 */
async function buildDeployPreview(options) {
    const { rootPath, sourceDir = 'force-app' } = options;
    if (!isSafeSourceDir(sourceDir)) {
        throw new Error(`Invalid sourceDir: ${sourceDir}`);
    }
    const sourceDirPath = path.join(rootPath, sourceDir);
    // Resolve org context
    const orgCtx = await (0, org_context_1.readOrgContext)(rootPath);
    const resolvedOrg = options.targetOrg ?? orgCtx.defaultOrg ?? orgCtx.targetOrg ?? 'unknown';
    const lowerOrg = resolvedOrg.toLowerCase();
    const isProduction = lowerOrg === 'production' ||
        lowerOrg === 'prod' ||
        lowerOrg.includes('production') ||
        lowerOrg.includes('prod');
    // Walk source directory
    const components = await walkDir(sourceDirPath, rootPath);
    const risks = [];
    // Profile detection
    const hasProfiles = components.some((c) => c.type === 'Profile');
    if (hasProfiles) {
        risks.push('Profile metadata detected — consider using Permission Sets instead');
    }
    // Destructive changes detection
    const hasDestructive = await hasDestructiveChanges(rootPath);
    if (hasDestructive) {
        risks.push('Destructive changes file found — review before deploying');
    }
    // Flow detection
    const hasFlows = components.some((c) => c.type === 'Flow');
    if (hasFlows) {
        risks.push('Flow metadata included — test in sandbox first');
    }
    // Production warning
    if (isProduction) {
        risks.push('⚠ Target org appears to be production — explicit confirmation required');
    }
    const quotedSourceDir = shellQuote(sourceDir);
    const validationCommand = `sf project deploy validate --source-dir ${quotedSourceDir} --test-level RunLocalTests --wait 60`;
    const deployCommand = `sf project deploy start --source-dir ${quotedSourceDir} --test-level RunLocalTests --wait 60`;
    return {
        targetOrg: resolvedOrg,
        isProduction,
        componentsToAdd: components,
        componentsToModify: [],
        componentsToDelete: [],
        risks,
        validationCommand,
        deployCommand,
    };
}
/**
 * Returns a markdown-formatted string suitable for a VS Code webview.
 */
function formatDeployPreview(result) {
    const lines = [];
    lines.push('# Deploy Preview');
    lines.push('');
    lines.push(`**Target Org:** ${result.targetOrg}${result.isProduction ? ' ⚠ (PRODUCTION)' : ''}`);
    lines.push('');
    // Component counts by type
    const byType = new Map();
    for (const c of result.componentsToAdd) {
        byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
    }
    for (const c of result.componentsToModify) {
        byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
    }
    const totalComponents = result.componentsToAdd.length +
        result.componentsToModify.length +
        result.componentsToDelete.length;
    lines.push(`## Components (${totalComponents} total)`);
    lines.push('');
    if (byType.size > 0) {
        lines.push('| Type | Count |');
        lines.push('|------|-------|');
        for (const [type, count] of [...byType.entries()].sort()) {
            lines.push(`| ${type} | ${count} |`);
        }
    }
    else {
        lines.push('_No components found in source directory._');
    }
    lines.push('');
    if (result.componentsToAdd.length > 0) {
        lines.push('### Components to Add');
        lines.push('');
        for (const c of result.componentsToAdd) {
            lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
        }
        lines.push('');
    }
    if (result.componentsToModify.length > 0) {
        lines.push('### Components to Modify');
        lines.push('');
        for (const c of result.componentsToModify) {
            lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
        }
        lines.push('');
    }
    if (result.componentsToDelete.length > 0) {
        lines.push('### Components to Delete');
        lines.push('');
        for (const c of result.componentsToDelete) {
            lines.push(`- **${c.name}** (${c.type}) — \`${c.filePath}\``);
        }
        lines.push('');
    }
    if (result.risks.length > 0) {
        lines.push('## Risks');
        lines.push('');
        for (const risk of result.risks) {
            lines.push(`- ${risk}`);
        }
        lines.push('');
    }
    lines.push('## Commands');
    lines.push('');
    lines.push('**Validate:**');
    lines.push('```sh');
    lines.push(result.validationCommand);
    lines.push('```');
    lines.push('');
    lines.push('**Deploy:**');
    lines.push('```sh');
    lines.push(result.deployCommand);
    lines.push('```');
    return lines.join('\n');
}
//# sourceMappingURL=deploy-preview.js.map

/***/ }),

/***/ 4546:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FILE_SIGNALS = void 0;
exports.detectDrift = detectDrift;
exports.checkTeamSync = checkTeamSync;
exports.fetchTeamConfig = fetchTeamConfig;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
/** Key phrases that must be present in a file for it to be considered current */
const FILE_SIGNALS = {
    'CLAUDE.md': [
        'Workflow Orchestration',
        'Plan Mode Default',
        'Self-Improvement Loop',
        'Verification Before Done',
        'tasks/todo.md',
    ],
    '.cursor/rules/project.mdc': [
        'Plan Mode Default',
        'tasks/todo.md',
        'tasks/lessons.md',
        'Definition of Done',
    ],
    '.cursor/rules/apex.mdc': [
        'Bulkify',
        'SOQL or DML inside loops',
        'with sharing',
        'CRUD/FLS',
    ],
    '.cursor/rules/safety.mdc': [
        'Never expose secrets',
        'Named Credentials',
        'anonymous Apex',
    ],
    '.cursor/rules/salesforce-mcp.mdc': [
        'MCP',
        'read-only mode for production',
        'confirm the target org alias',
    ],
    'AGENTS.md': [
        'Salesforce DX Structure',
        'Deployment Safety Rules',
        'AI Tool Usage Rules',
    ],
};
exports.FILE_SIGNALS = FILE_SIGNALS;
/** Check local files for the tracked key-phrase signals */
async function detectDrift(rootPath, filesToCheck) {
    const targets = filesToCheck ?? Object.keys(FILE_SIGNALS);
    const drifted = [];
    const missing = [];
    const upToDate = [];
    await Promise.all(targets.map(async (relativePath) => {
        const fullPath = path.join(rootPath, relativePath);
        const signals = FILE_SIGNALS[relativePath];
        if (!signals)
            return; // no signals defined — skip
        const exists = await fs.pathExists(fullPath);
        if (!exists) {
            missing.push(relativePath);
            return;
        }
        const content = await fs.readFile(fullPath, 'utf8');
        const missingSignals = signals.filter((s) => !content.includes(s));
        if (missingSignals.length > 0) {
            drifted.push({
                relativePath,
                reason: `Missing ${missingSignals.length} expected section(s) from current AI-Kit template`,
                missingSignals: missingSignals.slice(0, 3),
            });
        }
        else {
            upToDate.push(relativePath);
        }
    }));
    return { drifted, missing, upToDate };
}
function isValidTeamConfig(input) {
    if (!input || typeof input !== 'object')
        return false;
    const cfg = input;
    if (typeof cfg.version !== 'string' || cfg.version.trim().length === 0)
        return false;
    if (!Array.isArray(cfg.requiredFiles) || !cfg.requiredFiles.every((f) => typeof f === 'string'))
        return false;
    if (cfg.signals !== undefined) {
        if (typeof cfg.signals !== 'object' || cfg.signals === null)
            return false;
        for (const values of Object.values(cfg.signals)) {
            if (!Array.isArray(values) || !values.every((v) => typeof v === 'string'))
                return false;
        }
    }
    if (cfg.description !== undefined && typeof cfg.description !== 'string')
        return false;
    return true;
}
function isSafeTeamConfigUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        return false;
    }
    if (parsed.protocol !== 'https:')
        return false;
    if (parsed.username || parsed.password)
        return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '::1')
        return false;
    const ipv4Private = /^10\./.test(host) ||
        /^127\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    if (ipv4Private)
        return false;
    return true;
}
async function checkTeamSync(rootPath, teamConfig) {
    const mergedSignals = {
        ...FILE_SIGNALS,
        ...(teamConfig.signals ?? {}),
    };
    const allTargets = [
        ...new Set([...Object.keys(mergedSignals), ...teamConfig.requiredFiles]),
    ];
    const drift = await detectDrift(rootPath, allTargets);
    // Also check required files that aren't in signals
    for (const f of teamConfig.requiredFiles) {
        if (!FILE_SIGNALS[f] && !(teamConfig.signals?.[f])) {
            const exists = await fs.pathExists(path.join(rootPath, f));
            if (!exists && !drift.missing.includes(f)) {
                drift.missing.push(f);
            }
            else if (exists && !drift.upToDate.includes(f) && !drift.drifted.find((d) => d.relativePath === f)) {
                drift.upToDate.push(f);
            }
        }
    }
    const issues = drift.drifted.length + drift.missing.length;
    const summary = issues === 0
        ? `In sync with team config v${teamConfig.version}. All ${drift.upToDate.length} tracked file(s) up to date.`
        : `${issues} issue(s) found vs team config v${teamConfig.version}. ${drift.drifted.length} drifted, ${drift.missing.length} missing.`;
    return {
        configVersion: teamConfig.version,
        drifted: drift.drifted,
        missing: drift.missing,
        upToDate: drift.upToDate,
        summary,
    };
}
/** Fetch a team config from a URL (for CLI/extension use). Returns null on failure. */
async function fetchTeamConfig(url) {
    try {
        if (!isSafeTeamConfigUrl(url))
            return null;
        // Use global fetch (Node 18+) or fall back gracefully
        const fetchFn = typeof globalThis.fetch === 'function'
            ? globalThis.fetch
            : // eslint-disable-next-line @typescript-eslint/no-var-requires
                (__nccwpck_require__(7009)["default"]);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetchFn(url, { signal: controller.signal });
            if (!res.ok)
                return null;
            const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
            if (contentType && !contentType.includes('application/json'))
                return null;
            const text = await res.text();
            if (text.length > 1024 * 1024)
                return null;
            const parsed = JSON.parse(text);
            if (!isValidTeamConfig(parsed))
                return null;
            return parsed;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=drift-detector.js.map

/***/ }),

/***/ 5046:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * Provides hover explanation content for AI-Kit diagnostics.
 * Maps diagnostic ruleFile → human-readable explanation with a link to the rule file.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getHoverContent = getHoverContent;
// ─── Lookup table keyed by ruleId or message keyword ──────────────────────
const RULE_ENTRIES = {
    // ── apex.mdc rules ────────────────────────────────────────────────────────
    'no-soql-in-loop': {
        title: 'SOQL inside a loop (no-soql-in-loop)',
        explanation: 'Executing SOQL queries inside loops causes N+1 database query problems and will hit Salesforce governor limits (max 100 SOQL queries per transaction). Always bulk-query before the loop.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Move the SOQL query outside the loop. Collect all required IDs first, then query in bulk using a WHERE ... IN :ids clause.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm',
    },
    'no-dml-in-loop': {
        title: 'DML inside a loop (no-dml-in-loop)',
        explanation: 'Performing DML (insert/update/delete/upsert) inside loops hits the Salesforce governor limit of 150 DML statements per transaction and causes poor performance.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Collect records in a List inside the loop, then perform a single bulk DML operation (e.g. insert recordList) after the loop completes.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm',
    },
    'missing-sharing-declaration': {
        title: 'Missing sharing declaration (missing-sharing-declaration)',
        explanation: 'Apex classes without an explicit sharing keyword default to `without sharing` behavior in some contexts, which can expose records the running user should not see. Always declare sharing mode explicitly.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add `with sharing` to your class declaration: `public with sharing class MyClass`. Use `without sharing` only when you have a documented business reason.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_keywords_sharing.htm',
    },
    'no-without-sharing-bypass': {
        title: 'Undocumented without sharing bypass (no-without-sharing-bypass)',
        explanation: '`without sharing` grants the code system-level record access regardless of the running user\'s permissions. This is a security-sensitive decision that must be justified.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add a comment on the line before the class declaration explaining why `without sharing` is required, e.g.: `// Intentionally without sharing — bulk data processing job runs in system context`.',
    },
    'no-hardcoded-id': {
        title: 'Hardcoded Salesforce ID (no-hardcoded-id)',
        explanation: 'Hardcoded IDs are org-specific and will break when code is deployed to a different sandbox or production. They also make automated testing impossible.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Replace hardcoded IDs with Custom Metadata Types, Custom Settings, or pass the ID as a parameter. Example: `MyConfig__mdt.getInstance(\'Default\').RecordId__c`.',
    },
    'missing-test-setup': {
        title: 'Missing @TestSetup method (missing-test-setup)',
        explanation: 'Test classes with multiple test methods that each create their own data can be slow and brittle. A shared @TestSetup method creates data once and is rolled back between tests.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Add a static `@TestSetup` method to create shared test data once:\n```apex\n@TestSetup\nstatic void makeData() {\n  // insert shared test records\n}\n```',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_testsetup_annotation.htm',
    },
    'no-seealldata': {
        title: 'SeeAllData=true is dangerous (no-seealldata)',
        explanation: '`SeeAllData=true` allows tests to access real org data, making tests fragile, environment-dependent, and a potential data security risk. Tests should create their own data.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Remove `SeeAllData=true` from `@IsTest(SeeAllData=true)`. Use `@TestSetup` or test factory classes to create isolated test data instead.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_seealldata_using.htm',
    },
    'no-naked-catch': {
        title: 'Empty catch block (no-naked-catch)',
        explanation: 'Empty catch blocks silently swallow exceptions, making bugs invisible. They hide problems that could corrupt data or leave transactions in an inconsistent state.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Always handle exceptions explicitly:\n```apex\ncatch (Exception e) {\n  System.debug(LoggingLevel.ERROR, \'Error: \' + e.getMessage());\n  throw e; // or AuraHandledException, etc.\n}\n```',
    },
    // ── lwc.mdc rules ─────────────────────────────────────────────────────────
    'no-console-log': {
        title: 'console.log() in LWC (no-console-log)',
        explanation: 'console.log and related methods left in production LWC code clutter browser dev-tools, can expose sensitive data, and fail security reviews. Use a custom logger service instead.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Remove the console statement or replace with a lwc/logger import, e.g.:\n```js\nimport { createLogger } from \'c/logger\';\nconst logger = createLogger();\nlogger.info(\'message\');\n```',
    },
    'no-inner-html': {
        title: 'innerHTML assignment in LWC (no-inner-html)',
        explanation: 'Setting innerHTML directly in an LWC component bypasses the Locker Service sandbox and creates XSS vulnerabilities. LWC\'s template engine already escapes values safely.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use LWC template bindings ({property}) or lightning-formatted-rich-text for user content. If you need dynamic HTML, sanitize with DOMPurify first.',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/security-locker-service.html',
    },
    'no-hardcoded-url': {
        title: 'Hardcoded Salesforce URL (no-hardcoded-url)',
        explanation: 'Hardcoded /apex/, /lightning/, or /setup/ URLs break across Experience Cloud sites, sandbox migrations, and org renames. They also fail when the org\'s My Domain changes.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use NavigationMixin for navigation:\n```js\nimport { NavigationMixin } from \'lightning/navigation\';\nthis[NavigationMixin.Navigate]({ type: \'standard__recordPage\', ... });\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/use-navigate-basic.html',
    },
    'missing-wire-error-handler': {
        title: 'Missing @wire error handler (missing-wire-error-handler)',
        explanation: '@wire adapters can fail if the user lacks permissions, the record doesn\'t exist, or the network is unavailable. Without error handling, the component silently shows blank content.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Destructure both data and error from the wired property:\n```js\n@wire(getRecord, { recordId: \'$recordId\', fields })\nwiredRecord({ data, error }) {\n  if (error) { this.error = error; }\n  else if (data) { this.record = data; }\n}\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/wire-service-component.html',
    },
    'missing-key-iterator': {
        title: 'Missing key in for:each (missing-key-iterator)',
        explanation: 'LWC requires a unique key= attribute on the direct child of for:each iterators. Without it, LWC cannot efficiently reconcile the DOM when the list changes, causing rendering bugs.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Add key={item.Id} (or another unique field) to the direct child element:\n```html\n<template for:each={items} for:item="item">\n  <c-my-item key={item.Id} item={item}></c-my-item>\n</template>\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/create-render-list.html',
    },
    'no-aura-syntax': {
        title: 'Aura syntax in LWC template (no-aura-syntax)',
        explanation: 'aura:* tags and attributes are only valid in Aura components. Using them in LWC templates causes runtime errors and will not compile.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Replace Aura equivalents: aura:if → lwc:if, aura:iteration → for:each, aura:attribute → @api property.',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/migrate-aura-to-lwc.html',
    },
    'no-onclick-inline': {
        title: 'Inline onclick string in LWC template (no-onclick-inline)',
        explanation: 'LWC requires event bindings to be expressions, not strings. onclick="handler()" is HTML syntax that won\'t work in LWC and may raise a compile error.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Use LWC expression binding:\n```html\n<!-- Wrong -->\n<button onclick="handleClick()">Click</button>\n<!-- Right -->\n<button onclick={handleClick}>Click</button>\n```',
        docsLink: 'https://developer.salesforce.com/docs/platform/lwc/guide/events-add-handler.html',
    },
    // ── safety.mdc rules ──────────────────────────────────────────────────────
    'no-debug-pii': {
        title: 'PII / credentials in debug log (no-debug-pii)',
        explanation: 'Logging sensitive data (passwords, tokens, SSNs, email addresses, credit card info) creates compliance and security risks. Salesforce debug logs can be accessed by admins.',
        ruleFile: '.cursor/rules/safety.mdc',
        fixSuggestion: 'Remove sensitive data from debug statements. If you must debug auth issues, log only non-sensitive identifiers, not the actual secret values.',
        docsLink: 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_debug_log.htm',
    },
};
// ─── Rule-file fallback tables ─────────────────────────────────────────────
const RULEFILE_DEFAULTS = {
    '.cursor/rules/apex.mdc': {
        explanation: 'This diagnostic is governed by the Apex coding rules defined in your project.',
        ruleFile: '.cursor/rules/apex.mdc',
        fixSuggestion: 'Open the rule file for detailed guidance.',
    },
    '.cursor/rules/safety.mdc': {
        explanation: 'This diagnostic is governed by the security and safety rules defined in your project.',
        ruleFile: '.cursor/rules/safety.mdc',
        fixSuggestion: 'Review the safety rule file and ensure no sensitive data is exposed.',
    },
    '.cursor/rules/deployment.mdc': {
        explanation: 'This diagnostic is governed by the deployment safety rules defined in your project.',
        ruleFile: '.cursor/rules/deployment.mdc',
        fixSuggestion: 'Review the deployment rule file before proceeding.',
    },
    '.cursor/rules/lwc.mdc': {
        explanation: 'This diagnostic is governed by the LWC development rules defined in your project.',
        ruleFile: '.cursor/rules/lwc.mdc',
        fixSuggestion: 'Review the LWC rule file and follow component best practices.',
    },
};
/**
 * Returns appropriate HoverContent based on ruleId (preferred), message patterns, or ruleFile fallback.
 */
function getHoverContent(ruleFile, message, ruleId) {
    // Direct ruleId lookup — fastest and most precise
    if (ruleId && RULE_ENTRIES[ruleId])
        return RULE_ENTRIES[ruleId];
    // Match by specific message patterns (for callers that don't pass ruleId)
    if (/SOQL query inside a loop/i.test(message))
        return RULE_ENTRIES['no-soql-in-loop'];
    if (/DML operation.*inside a loop/i.test(message))
        return RULE_ENTRIES['no-dml-in-loop'];
    if (/SeeAllData/i.test(message))
        return RULE_ENTRIES['no-seealldata'];
    if (/Empty catch block/i.test(message))
        return RULE_ENTRIES['no-naked-catch'];
    if (/hardcoded Salesforce ID/i.test(message))
        return RULE_ENTRIES['no-hardcoded-id'];
    if (/without sharing.*explanatory comment/i.test(message))
        return RULE_ENTRIES['no-without-sharing-bypass'];
    if (/Class declared without sharing/i.test(message))
        return RULE_ENTRIES['missing-sharing-declaration'];
    if (/@TestSetup/i.test(message))
        return RULE_ENTRIES['missing-test-setup'];
    if (/Debug statement may log sensitive/i.test(message))
        return RULE_ENTRIES['no-debug-pii'];
    if (/console\.\w+\(\) found/i.test(message))
        return RULE_ENTRIES['no-console-log'];
    if (/innerHTML assignment/i.test(message))
        return RULE_ENTRIES['no-inner-html'];
    if (/Hardcoded Salesforce URL/i.test(message))
        return RULE_ENTRIES['no-hardcoded-url'];
    if (/@wire adapter used without error/i.test(message))
        return RULE_ENTRIES['missing-wire-error-handler'];
    if (/for:each iterator is missing a key/i.test(message))
        return RULE_ENTRIES['missing-key-iterator'];
    if (/Aura syntax.*in an LWC/i.test(message))
        return RULE_ENTRIES['no-aura-syntax'];
    if (/Inline onclick/i.test(message))
        return RULE_ENTRIES['no-onclick-inline'];
    // Fall back to rule-file-level defaults
    const ruleFileDefault = RULEFILE_DEFAULTS[ruleFile];
    if (ruleFileDefault) {
        return {
            title: `AI-Kit Diagnostic (${ruleFile})`,
            ...ruleFileDefault,
        };
    }
    // Generic fallback
    return {
        title: 'AI-Kit Diagnostic',
        explanation: 'This location was flagged by an AI-Kit rule check.',
        ruleFile: ruleFile || 'unknown',
        fixSuggestion: 'Review the flagged code and the associated rule file for guidance.',
    };
}
//# sourceMappingURL=hover-provider.js.map

/***/ }),

/***/ 6808:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TOOLKIT_CONFIG_PATH = exports.DEFAULT_TOOLKIT_CONFIG = exports.loadToolkitConfig = exports.SALESFORCE_DX_MODE = exports.generateClaudeMemModeJson = exports.detectAgentforceContext = exports.formatDeployPreview = exports.buildDeployPreview = exports.getHoverContent = exports.getDiagnosticSummary = exports.detectFileType = exports.analyseFile = exports.skillToPickItem = exports.formatSkillReference = exports.listInstalledSkills = exports.validateMcpConfig = exports.bootstrapMcp = exports.buildMcpConfig = exports.FILE_SIGNALS = exports.fetchTeamConfig = exports.checkTeamSync = exports.detectDrift = exports.formatOrgContext = exports.readOrgContext = exports.wrapInMarker = exports.hasTemplate = exports.getTemplate = exports.MARKER_END = exports.MARKER_START = exports.TEMPLATES = exports.generateReadinessReport = exports.writeFileSafe = exports.appendMissingLines = exports.mergePackageJsonScripts = exports.createBackup = exports.applySetup = exports.planSetup = exports.scanProject = void 0;
var scanner_1 = __nccwpck_require__(9774);
Object.defineProperty(exports, "scanProject", ({ enumerable: true, get: function () { return scanner_1.scanProject; } }));
var planner_1 = __nccwpck_require__(5816);
Object.defineProperty(exports, "planSetup", ({ enumerable: true, get: function () { return planner_1.planSetup; } }));
var apply_1 = __nccwpck_require__(6616);
Object.defineProperty(exports, "applySetup", ({ enumerable: true, get: function () { return apply_1.applySetup; } }));
var backup_1 = __nccwpck_require__(3452);
Object.defineProperty(exports, "createBackup", ({ enumerable: true, get: function () { return backup_1.createBackup; } }));
var safe_write_1 = __nccwpck_require__(6157);
Object.defineProperty(exports, "mergePackageJsonScripts", ({ enumerable: true, get: function () { return safe_write_1.mergePackageJsonScripts; } }));
Object.defineProperty(exports, "appendMissingLines", ({ enumerable: true, get: function () { return safe_write_1.appendMissingLines; } }));
Object.defineProperty(exports, "writeFileSafe", ({ enumerable: true, get: function () { return safe_write_1.writeFileSafe; } }));
var reporter_1 = __nccwpck_require__(6591);
Object.defineProperty(exports, "generateReadinessReport", ({ enumerable: true, get: function () { return reporter_1.generateReadinessReport; } }));
__exportStar(__nccwpck_require__(5117), exports);
var templates_1 = __nccwpck_require__(9639);
Object.defineProperty(exports, "TEMPLATES", ({ enumerable: true, get: function () { return templates_1.TEMPLATES; } }));
Object.defineProperty(exports, "MARKER_START", ({ enumerable: true, get: function () { return templates_1.MARKER_START; } }));
Object.defineProperty(exports, "MARKER_END", ({ enumerable: true, get: function () { return templates_1.MARKER_END; } }));
Object.defineProperty(exports, "getTemplate", ({ enumerable: true, get: function () { return templates_1.getTemplate; } }));
Object.defineProperty(exports, "hasTemplate", ({ enumerable: true, get: function () { return templates_1.hasTemplate; } }));
Object.defineProperty(exports, "wrapInMarker", ({ enumerable: true, get: function () { return templates_1.wrapInMarker; } }));
var org_context_1 = __nccwpck_require__(140);
Object.defineProperty(exports, "readOrgContext", ({ enumerable: true, get: function () { return org_context_1.readOrgContext; } }));
Object.defineProperty(exports, "formatOrgContext", ({ enumerable: true, get: function () { return org_context_1.formatOrgContext; } }));
var drift_detector_1 = __nccwpck_require__(4546);
Object.defineProperty(exports, "detectDrift", ({ enumerable: true, get: function () { return drift_detector_1.detectDrift; } }));
Object.defineProperty(exports, "checkTeamSync", ({ enumerable: true, get: function () { return drift_detector_1.checkTeamSync; } }));
Object.defineProperty(exports, "fetchTeamConfig", ({ enumerable: true, get: function () { return drift_detector_1.fetchTeamConfig; } }));
Object.defineProperty(exports, "FILE_SIGNALS", ({ enumerable: true, get: function () { return drift_detector_1.FILE_SIGNALS; } }));
var mcp_bootstrap_1 = __nccwpck_require__(9167);
Object.defineProperty(exports, "buildMcpConfig", ({ enumerable: true, get: function () { return mcp_bootstrap_1.buildMcpConfig; } }));
Object.defineProperty(exports, "bootstrapMcp", ({ enumerable: true, get: function () { return mcp_bootstrap_1.bootstrapMcp; } }));
Object.defineProperty(exports, "validateMcpConfig", ({ enumerable: true, get: function () { return mcp_bootstrap_1.validateMcpConfig; } }));
var skills_picker_1 = __nccwpck_require__(3683);
Object.defineProperty(exports, "listInstalledSkills", ({ enumerable: true, get: function () { return skills_picker_1.listInstalledSkills; } }));
Object.defineProperty(exports, "formatSkillReference", ({ enumerable: true, get: function () { return skills_picker_1.formatSkillReference; } }));
Object.defineProperty(exports, "skillToPickItem", ({ enumerable: true, get: function () { return skills_picker_1.skillToPickItem; } }));
var inline_diagnostics_1 = __nccwpck_require__(3970);
Object.defineProperty(exports, "analyseFile", ({ enumerable: true, get: function () { return inline_diagnostics_1.analyseFile; } }));
Object.defineProperty(exports, "detectFileType", ({ enumerable: true, get: function () { return inline_diagnostics_1.detectFileType; } }));
Object.defineProperty(exports, "getDiagnosticSummary", ({ enumerable: true, get: function () { return inline_diagnostics_1.getDiagnosticSummary; } }));
var hover_provider_1 = __nccwpck_require__(5046);
Object.defineProperty(exports, "getHoverContent", ({ enumerable: true, get: function () { return hover_provider_1.getHoverContent; } }));
var deploy_preview_1 = __nccwpck_require__(3736);
Object.defineProperty(exports, "buildDeployPreview", ({ enumerable: true, get: function () { return deploy_preview_1.buildDeployPreview; } }));
Object.defineProperty(exports, "formatDeployPreview", ({ enumerable: true, get: function () { return deploy_preview_1.formatDeployPreview; } }));
var agentforce_detector_1 = __nccwpck_require__(4737);
Object.defineProperty(exports, "detectAgentforceContext", ({ enumerable: true, get: function () { return agentforce_detector_1.detectAgentforceContext; } }));
var claude_mem_mode_1 = __nccwpck_require__(3994);
Object.defineProperty(exports, "generateClaudeMemModeJson", ({ enumerable: true, get: function () { return claude_mem_mode_1.generateClaudeMemModeJson; } }));
Object.defineProperty(exports, "SALESFORCE_DX_MODE", ({ enumerable: true, get: function () { return claude_mem_mode_1.SALESFORCE_DX_MODE; } }));
var config_1 = __nccwpck_require__(3868);
Object.defineProperty(exports, "loadToolkitConfig", ({ enumerable: true, get: function () { return config_1.loadToolkitConfig; } }));
Object.defineProperty(exports, "DEFAULT_TOOLKIT_CONFIG", ({ enumerable: true, get: function () { return config_1.DEFAULT_TOOLKIT_CONFIG; } }));
Object.defineProperty(exports, "TOOLKIT_CONFIG_PATH", ({ enumerable: true, get: function () { return config_1.TOOLKIT_CONFIG_PATH; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 3970:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * Inline rule annotations — detects Salesforce anti-patterns in source files
 * and maps them back to the Cursor rule that governs them.
 *
 * Each rule produces zero or more Diagnostic entries with a file range,
 * message, and the source rule file for quick navigation.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.detectFileType = detectFileType;
exports.analyseFile = analyseFile;
exports.getDiagnosticSummary = getDiagnosticSummary;
// ─── SOQL-in-loop / DML-in-loop detection ─────────────────────────────────
// We track loop depth and flag any SOQL SELECT or DML found inside a loop block.
function apexDiagnostics(lines) {
    const diagnostics = [];
    let loopDepth = 0;
    let braceDepth = 0;
    // Track brace depths when a loop opened so we can close properly
    const loopOpenDepths = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // Count brace opens/closes on this line
        const opens = (line.match(/\{/g) ?? []).length;
        const closes = (line.match(/\}/g) ?? []).length;
        // Loop openers — for, while, do, forEach
        const isLoopOpener = /\b(for|while)\s*\(/.test(trimmed) ||
            /\.forEach\s*\(/.test(trimmed) ||
            /\bdo\s*\{/.test(trimmed);
        if (isLoopOpener) {
            loopDepth++;
            loopOpenDepths.push(braceDepth + opens - closes);
        }
        braceDepth += opens - closes;
        // Pop loop depth when we close back past the loop's open depth
        while (loopOpenDepths.length > 0 &&
            braceDepth < loopOpenDepths[loopOpenDepths.length - 1]) {
            loopOpenDepths.pop();
            loopDepth = Math.max(0, loopDepth - 1);
        }
        if (loopDepth > 0) {
            // SOQL inside loop
            if (/\[\s*SELECT\b/i.test(line)) {
                const col = line.search(/\[\s*SELECT/i);
                diagnostics.push({
                    line: i,
                    startCol: col,
                    endCol: -1,
                    message: 'SOQL query inside a loop — violates bulkification rules. Move query outside the loop.',
                    ruleFile: '.cursor/rules/apex.mdc',
                    severity: 'error',
                    ruleId: 'no-soql-in-loop',
                });
            }
            // DML inside loop
            const dmlMatch = line.match(/\b(insert|update|delete|upsert|undelete|merge)\s+/i);
            if (dmlMatch && !/\/\//.test(line.slice(0, (dmlMatch.index ?? 0)))) {
                diagnostics.push({
                    line: i,
                    startCol: dmlMatch.index ?? 0,
                    endCol: -1,
                    message: `DML operation (${dmlMatch[1]}) inside a loop — violates bulkification rules. Collect records first, then DML outside loop.`,
                    ruleFile: '.cursor/rules/apex.mdc',
                    severity: 'error',
                    ruleId: 'no-dml-in-loop',
                });
            }
        }
    }
    return diagnostics;
}
// ─── missing-test-setup detection ─────────────────────────────────────────
// In test classes (name ends with Test), warn if no @TestSetup and > 1 test method.
function testSetupDiagnostics(lines) {
    const diagnostics = [];
    // Check if this looks like a test class (class name ends with Test)
    const classLine = lines.findIndex((l) => /\bclass\s+\w+Test\b/.test(l));
    if (classLine === -1)
        return diagnostics;
    const hasTestSetup = lines.some((l) => /@TestSetup\b/i.test(l));
    if (hasTestSetup)
        return diagnostics;
    // Count @IsTest annotations (test methods)
    const testMethodCount = lines.filter((l) => /@IsTest\b/i.test(l)).length;
    if (testMethodCount > 1) {
        diagnostics.push({
            line: classLine,
            startCol: 0,
            endCol: -1,
            message: `Test class has ${testMethodCount} test methods but no @TestSetup method — consider adding a @TestSetup to avoid data setup duplication.`,
            ruleFile: '.cursor/rules/apex.mdc',
            severity: 'warning',
            ruleId: 'missing-test-setup',
        });
    }
    return diagnostics;
}
// ─── no-naked-catch detection ──────────────────────────────────────────────
// Flag empty catch blocks.
function nakedCatchDiagnostics(lines) {
    const diagnostics = [];
    const joined = lines.join('\n');
    // Match catch blocks that are effectively empty: only whitespace between braces
    // Handles: } catch (Exception e) { } or multiline empty catch
    const catchPattern = /\}\s*catch\s*\([^)]+\)\s*\{(\s*)\}/g;
    let match;
    while ((match = catchPattern.exec(joined)) !== null) {
        // Find which line this is on
        const before = joined.slice(0, match.index);
        const lineIndex = (before.match(/\n/g) ?? []).length;
        // Only flag if the body is truly empty (no statements)
        const body = match[1];
        if (/^\s*$/.test(body)) {
            diagnostics.push({
                line: lineIndex,
                startCol: 0,
                endCol: -1,
                message: 'Empty catch block (naked catch) — log or rethrow the exception instead of swallowing it.',
                ruleFile: '.cursor/rules/apex.mdc',
                severity: 'warning',
                ruleId: 'no-naked-catch',
            });
        }
    }
    return diagnostics;
}
const SIMPLE_CHECKS = [
    // ── without sharing class declaration (no sharing keyword at all) ──────────
    {
        ruleId: 'missing-sharing-declaration',
        message: 'Class declared without sharing — use `with sharing` by default. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line) => {
            if (!/\bclass\b/.test(line))
                return false;
            if (/\bwith sharing\b|\bwithout sharing\b|\binherited sharing\b/.test(line))
                return false;
            return /\b(public|global|private)\b.*\bclass\b/.test(line);
        },
    },
    // ── no-without-sharing-bypass ─────────────────────────────────────────────
    // Flags `without sharing` unless the previous line has an explanatory comment.
    {
        ruleId: 'no-without-sharing-bypass',
        message: '`without sharing` detected without an explanatory comment on the previous line. Add a comment explaining why this bypass is intentional.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line, i, all) => {
            if (!/\bwithout sharing\b/.test(line))
                return false;
            if (!/\bclass\b/.test(line))
                return false;
            // Check previous line for a comment
            if (i === 0)
                return true; // no previous line
            const prevLine = all[i - 1].trim();
            return !prevLine.startsWith('//') && !prevLine.startsWith('/*') && !prevLine.startsWith('*');
        },
    },
    // ── Hardcoded Salesforce-style IDs ────────────────────────────────────────
    {
        ruleId: 'no-hardcoded-id',
        message: 'Possible hardcoded Salesforce ID — use Custom Metadata or pass IDs as parameters. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'warning',
        test: (line) => {
            return /['"][a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?['"]/.test(line) && !/\/\/.*['"]/.test(line);
        },
    },
    // ── no-debug-pii ──────────────────────────────────────────────────────────
    // Expanded: also flags password, token, key, secret, jwt, ssn, credit
    {
        ruleId: 'no-debug-pii',
        message: 'Debug statement may log sensitive data — ensure no PII or credentials are included. See .cursor/rules/safety.mdc.',
        ruleFile: '.cursor/rules/safety.mdc',
        severity: 'warning',
        test: (line) => /System\.debug/i.test(line) &&
            /email|phone|ssn|password|token|secret|key|credential|jwt|credit/i.test(line),
    },
    // ── no-seealldata ─────────────────────────────────────────────────────────
    {
        ruleId: 'no-seealldata',
        message: 'SeeAllData=true is dangerous — tests should create their own data. Remove SeeAllData=true. See .cursor/rules/apex.mdc.',
        ruleFile: '.cursor/rules/apex.mdc',
        severity: 'error',
        test: (line) => /SeeAllData\s*=\s*true/i.test(line),
    },
];
// ─── LWC JS diagnostics ───────────────────────────────────────────────────────
function lwcJsDiagnostics(lines) {
    const diagnostics = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // no-console-log
        const consoleMatch = line.match(/\bconsole\.(log|warn|error|info|debug)\s*\(/);
        if (consoleMatch && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: consoleMatch.index ?? 0,
                endCol: -1,
                message: `console.${consoleMatch[1]}() found — remove before production. Use the lwc/logger module or a custom service instead.`,
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'no-console-log',
            });
        }
        // no-inner-html
        const innerHtmlIdx = line.search(/\.innerHTML\s*=/);
        if (innerHtmlIdx !== -1 && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: innerHtmlIdx,
                endCol: -1,
                message: 'Direct innerHTML assignment is an XSS risk in LWC — use template-based rendering instead.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-inner-html',
            });
        }
        // no-hardcoded-url
        if (/['"][^'"]*\/(apex|lightning|setup|s\/)\/[^'"]+['"]/.test(line) && !/^\s*\/\//.test(line)) {
            diagnostics.push({
                line: i,
                startCol: 0,
                endCol: -1,
                message: 'Hardcoded Salesforce URL detected — use NavigationMixin or a site-relative URL to support Experience Cloud and org migrations.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'no-hardcoded-url',
            });
        }
    }
    // missing-wire-error-handler: @wire property wiring without error handling
    const hasWire = lines.some((l) => /@wire\s*\(/.test(l));
    if (hasWire) {
        const fullContent = lines.join('\n');
        const hasErrorHandling = /\{\s*data\s*,\s*error\s*\}/.test(fullContent) ||
            /\{\s*error\s*,\s*data\s*\}/.test(fullContent) ||
            /this\.\w+\.error\b/.test(fullContent) ||
            /get\s+error\s*\(\)/.test(fullContent);
        if (!hasErrorHandling) {
            const wireLineIdx = lines.findIndex((l) => /@wire\s*\(/.test(l));
            diagnostics.push({
                line: wireLineIdx,
                startCol: 0,
                endCol: -1,
                message: '@wire adapter used without error property handling — destructure { data, error } or handle .error to display failures gracefully.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'warning',
                ruleId: 'missing-wire-error-handler',
            });
        }
    }
    return diagnostics;
}
// ─── LWC HTML diagnostics ─────────────────────────────────────────────────────
function lwcHtmlDiagnostics(lines) {
    const diagnostics = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // missing-key-iterator: for:each without key on the same or next line
        if (/for:each\s*=/.test(line) && !/\bkey\s*=/.test(line)) {
            diagnostics.push({
                line: i,
                startCol: Math.max(0, line.search(/for:each/)),
                endCol: -1,
                message: 'for:each iterator is missing a key= attribute — required by LWC for efficient DOM reconciliation.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'missing-key-iterator',
            });
        }
        // no-aura-syntax
        const auraIdx = line.search(/\baura:/);
        if (auraIdx !== -1) {
            diagnostics.push({
                line: i,
                startCol: auraIdx,
                endCol: -1,
                message: 'Aura syntax (aura:*) found in an LWC template — use lwc:* directives instead.',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-aura-syntax',
            });
        }
        // no-onclick-inline: raw onclick="handler()" without LWC binding
        if (/\bonclick\s*=\s*["'][^{]/.test(line)) {
            diagnostics.push({
                line: i,
                startCol: Math.max(0, line.search(/\bonclick/)),
                endCol: -1,
                message: 'Inline onclick handler string detected — LWC requires event bindings like onclick={handleClick}, not onclick="handleClick()".',
                ruleFile: '.cursor/rules/lwc.mdc',
                severity: 'error',
                ruleId: 'no-onclick-inline',
            });
        }
    }
    return diagnostics;
}
function detectFileType(filePath) {
    if (filePath.endsWith('.cls') || filePath.endsWith('.trigger'))
        return 'apex';
    if (filePath.endsWith('.js') && filePath.includes('/lwc/'))
        return 'lwc-js';
    if (filePath.endsWith('.html') && filePath.includes('/lwc/'))
        return 'lwc-html';
    return 'unknown';
}
function analyseFile(content, fileType) {
    const lines = content.split('\n');
    const diagnostics = [];
    if (fileType === 'apex') {
        diagnostics.push(...apexDiagnostics(lines));
        diagnostics.push(...testSetupDiagnostics(lines));
        diagnostics.push(...nakedCatchDiagnostics(lines));
        for (let i = 0; i < lines.length; i++) {
            for (const check of SIMPLE_CHECKS) {
                if (check.test(lines[i], i, lines)) {
                    const range = check.getRange ? check.getRange(lines[i]) : [0, -1];
                    diagnostics.push({
                        line: i,
                        startCol: range[0],
                        endCol: range[1],
                        message: check.message,
                        ruleFile: check.ruleFile,
                        severity: check.severity,
                        ruleId: check.ruleId,
                    });
                }
            }
        }
    }
    else if (fileType === 'lwc-js') {
        diagnostics.push(...lwcJsDiagnostics(lines));
    }
    else if (fileType === 'lwc-html') {
        diagnostics.push(...lwcHtmlDiagnostics(lines));
    }
    return diagnostics;
}
/**
 * Returns a 1-line summary like "3 errors, 2 warnings" or "No issues"
 */
function getDiagnosticSummary(diagnostics) {
    if (diagnostics.length === 0)
        return 'No issues';
    const errors = diagnostics.filter((d) => d.severity === 'error').length;
    const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
    const infos = diagnostics.filter((d) => d.severity === 'info').length;
    const parts = [];
    if (errors > 0)
        parts.push(`${errors} ${errors === 1 ? 'error' : 'errors'}`);
    if (warnings > 0)
        parts.push(`${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`);
    if (infos > 0)
        parts.push(`${infos} ${infos === 1 ? 'info' : 'infos'}`);
    return parts.join(', ');
}
//# sourceMappingURL=inline-diagnostics.js.map

/***/ }),

/***/ 9167:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildMcpConfig = buildMcpConfig;
exports.bootstrapMcp = bootstrapMcp;
exports.validateMcpConfig = validateMcpConfig;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const DEFAULT_TOOLSETS = ['orgs', 'metadata', 'data', 'users', 'lwc-experts'];
const DEFAULT_TOOLS = ['run_apex_test', 'guide_design_general'];
function buildMcpConfig(options) {
    const { orgAlias, allowNonGaTools = true } = options;
    const toolsets = options.toolsets ?? DEFAULT_TOOLSETS;
    const tools = options.tools ?? DEFAULT_TOOLS;
    const args = [
        '-y',
        '@salesforce/mcp@latest',
        '--orgs', orgAlias,
        '--toolsets', toolsets.join(','),
        '--tools', tools.join(','),
    ];
    if (allowNonGaTools) {
        args.push('--allow-non-ga-tools');
    }
    return {
        mcpServers: {
            'Salesforce DX': {
                command: 'npx',
                args,
            },
        },
    };
}
async function bootstrapMcp(rootPath, options) {
    const config = buildMcpConfig(options);
    const json = JSON.stringify(config, null, 2) + '\n';
    const cursorConfigPath = path.join(rootPath, '.cursor', 'mcp.json');
    const claudeConfigPath = path.join(rootPath, '.mcp.json');
    const cursorExists = await fs.pathExists(cursorConfigPath);
    const claudeExists = await fs.pathExists(claudeConfigPath);
    if (!cursorExists) {
        await fs.ensureDir(path.dirname(cursorConfigPath));
        await fs.writeFile(cursorConfigPath, json, 'utf8');
    }
    if (!claudeExists) {
        await fs.writeFile(claudeConfigPath, json, 'utf8');
    }
    return {
        cursorConfigPath,
        claudeConfigPath,
        config,
        alreadyExisted: { cursor: cursorExists, claude: claudeExists },
    };
}
async function validateMcpConfig(configPath) {
    const issues = [];
    const suggestions = [];
    if (!(await fs.pathExists(configPath))) {
        return {
            valid: false,
            issues: ['Config file not found'],
            suggestions: ['Run: ai-kit-sf bootstrap-mcp to create it'],
        };
    }
    let config;
    try {
        config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    }
    catch {
        return { valid: false, issues: ['Invalid JSON'], suggestions: ['Fix the JSON syntax'] };
    }
    const cfg = config;
    if (!cfg.mcpServers) {
        issues.push('Missing mcpServers key');
    }
    else {
        const servers = cfg.mcpServers;
        for (const [name, server] of Object.entries(servers)) {
            const s = server;
            if (!s.command)
                issues.push(`Server "${name}" missing command`);
            if (!Array.isArray(s.args)) {
                issues.push(`Server "${name}" args must be an array — do not use a single string`);
                suggestions.push('Each CLI flag and value must be a separate array item');
            }
            else {
                // Check for common mistake: all args in one string
                const combined = s.args.some((a) => typeof a === 'string' && a.includes('--orgs') && a.includes('--toolsets'));
                if (combined) {
                    issues.push(`Server "${name}" args appear to be combined into one string`);
                    suggestions.push('Split each flag and value into separate array items');
                }
                // Warn if DEFAULT_TARGET_ORG placeholder still present
                if (s.args.includes('DEFAULT_TARGET_ORG')) {
                    issues.push(`Server "${name}" still uses DEFAULT_TARGET_ORG placeholder`);
                    suggestions.push('Replace DEFAULT_TARGET_ORG with your actual org alias');
                }
            }
        }
    }
    return { valid: issues.length === 0, issues, suggestions };
}
//# sourceMappingURL=mcp-bootstrap.js.map

/***/ }),

/***/ 140:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readOrgContext = readOrgContext;
exports.formatOrgContext = formatOrgContext;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
async function readJsonSafe(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function readOrgContext(rootPath) {
    const p = (...parts) => path.join(rootPath, ...parts);
    // 1. .sf/config.json — modern SF CLI auth
    const sfConfig = await readJsonSafe(p('.sf', 'config.json'));
    if (sfConfig) {
        const target = sfConfig['target-org'];
        const defaultOrg = sfConfig['target-org'];
        if (target || defaultOrg) {
            return { defaultOrg: defaultOrg ?? target, targetOrg: target, source: 'sf-config' };
        }
    }
    // 2. sfdx-project.json — may carry defaultOrg key
    const sfdxProject = await readJsonSafe(p('sfdx-project.json'));
    if (sfdxProject) {
        const defaultOrg = sfdxProject['defaultOrg'];
        if (defaultOrg) {
            return { defaultOrg, source: 'sfdx-project' };
        }
    }
    // 3. .sfdx/sfdx-config.json — legacy
    const sfdxConfig = await readJsonSafe(p('.sfdx', 'sfdx-config.json'));
    if (sfdxConfig) {
        const defaultusername = sfdxConfig['defaultusername'];
        if (defaultusername) {
            return { defaultOrg: defaultusername, source: 'sfdx-config' };
        }
    }
    return { source: 'none' };
}
function formatOrgContext(ctx) {
    if (ctx.targetOrg)
        return ctx.targetOrg;
    if (ctx.defaultOrg)
        return ctx.defaultOrg;
    return 'unknown';
}
//# sourceMappingURL=org-context.js.map

/***/ }),

/***/ 5816:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.planSetup = planSetup;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const templates_1 = __nccwpck_require__(9639);
const RECOMMENDED_SCRIPTS = {
    'lint:lwc': 'eslint force-app/main/default/lwc',
    'format': 'prettier --write "force-app/**/*.{cls,trigger,js,html,css,xml,json}"',
    'format:check': 'prettier --check "force-app/**/*.{cls,trigger,js,html,css,xml,json}"',
    'test:apex': 'sf apex run test --test-level RunLocalTests --wait 30 --result-format human',
    'validate': 'sf project deploy validate --source-dir force-app --test-level RunLocalTests --wait 60',
    'deploy': 'sf project deploy start --source-dir force-app --test-level RunLocalTests --wait 60',
    'org:list': 'sf org list',
};
const FORCE_IGNORE_LINES = [
    '.env',
    '.env.*',
    '.sf/',
    '.sfdx/',
    'node_modules/',
    'coverage/',
    '.localdevserver/',
    '**/profiles/**',
    '**/installedPackages/**',
    '**/*.mpd-meta.xml',
];
const CORE_FILES = [
    'AI_INSTRUCTIONS.md',
    'AGENTS.md',
    'CLAUDE.md',
    'tasks/todo.md',
    'tasks/lessons.md',
    '.cursor/rules/project.mdc',
    '.cursor/rules/salesforce-mcp.mdc',
    '.cursor/rules/apex.mdc',
    '.cursor/rules/lwc.mdc',
    '.cursor/rules/deployment.mdc',
    '.cursor/rules/safety.mdc',
    '.cursor/skills/salesforce-apex/SKILL.md',
    '.cursor/skills/salesforce-lwc/SKILL.md',
    '.cursor/skills/salesforce-flow/SKILL.md',
    '.cursor/skills/salesforce-security-review/SKILL.md',
    '.cursor/skills/salesforce-agentforce/SKILL.md',
    '.cursor/skills/salesforce-data-cloud/SKILL.md',
    '.cursor/skills/salesforce-apex-tests/SKILL.md',
    '.cursor/skills/salesforce-deployment/SKILL.md',
    '.cursor/skills/salesforce-pr-review/SKILL.md',
    '.cursor/skills/salesforce-commit-message/SKILL.md',
    '.cursor/skills/salesforce-permissions/SKILL.md',
    // AFV Library skills (forcedotcom/afv-library)
    '.cursor/skills/afv-generating-apex/SKILL.md',
    '.cursor/skills/afv-generating-apex-test/SKILL.md',
    '.cursor/skills/afv-generating-flow/SKILL.md',
    '.cursor/skills/afv-generating-custom-object/SKILL.md',
    '.cursor/skills/afv-generating-custom-field/SKILL.md',
    '.cursor/skills/afv-generating-permission-set/SKILL.md',
    '.cursor/skills/afv-developing-agentforce/SKILL.md',
    '.cursor/skills/afv-testing-agentforce/SKILL.md',
    '.cursor/skills/afv-observing-agentforce/SKILL.md',
    '.cursor/skills/afv-generating-validation-rule/SKILL.md',
    '.cursor/skills/afv-generating-flexipage/SKILL.md',
    '.cursor/skills/afv-generating-lightning-app/SKILL.md',
    '.cursor/skills/afv-uplifting-to-slds2/SKILL.md',
    '.cursor/skills/afv-switching-org/SKILL.md',
    '.cursor/skills/afv-building-ui-bundle-app/SKILL.md',
    '.cursor/skills/afv-building-ui-bundle-frontend/SKILL.md',
    '.cursor/skills/afv-deploying-ui-bundle/SKILL.md',
    '.cursor/skills/afv-using-ui-bundle-salesforce-data/SKILL.md',
    '.cursor/skills/afv-creating-b2b-commerce-store/SKILL.md',
    '.cursor/skills/afv-generating-custom-application/SKILL.md',
    '.cursor/skills/afv-generating-custom-lightning-type/SKILL.md',
    '.cursor/skills/afv-generating-custom-tab/SKILL.md',
    '.cursor/skills/afv-generating-list-view/SKILL.md',
    '.cursor/skills/afv-searching-media/SKILL.md',
    '.cursor/skills/afv-generating-ui-bundle-features/SKILL.md',
    '.cursor/skills/afv-generating-ui-bundle-metadata/SKILL.md',
    '.cursor/skills/afv-generating-ui-bundle-site/SKILL.md',
    '.cursor/skills/afv-implementing-agentforce-conversation-client/SKILL.md',
    '.cursor/skills/afv-implementing-file-upload/SKILL.md',
    '.claude/commands/review-security.md',
    '.claude/commands/validate-deploy.md',
    '.claude/commands/write-tests.md',
    '.claude/commands/create-apex.md',
    '.claude/commands/create-lwc.md',
    '.claude/commands/prepare-pr.md',
    '.claude/agents/salesforce-architect.md',
    '.claude/agents/apex-developer.md',
    '.claude/agents/lwc-developer.md',
    '.claude/agents/qa-tester.md',
    '.claude/agents/security-reviewer.md',
    'docs/security.md',
    'docs/testing.md',
    'docs/deployment.md',
    'docs/mcp-usage.md',
    'docs/codex-setup.md',
    'docs/antigravity-setup.md',
    'docs/cursor-setup.md',
    'docs/claude-code-setup.md',
    'docs/afv-library.md',
    'docs/skills-ecosystem.md',
    'docs/agentforce-vibes-setup.md',
    '.windsurfrules',
    '.github/copilot-instructions.md',
];
const PRESET_EXTRA_FILES = {
    core: [],
    lwc: [], // placeholder
    agentforce: [], // afv-library docs included via core for agentforce
    'data-cloud': [],
    'experience-cloud': [],
};
async function planSetup(rootPath, options) {
    const { preset = 'core', dryRun = false } = options;
    const allFiles = [...CORE_FILES, ...(PRESET_EXTRA_FILES[preset] ?? [])];
    const files = await Promise.all(allFiles.map(async (relativePath) => {
        const fullPath = path.join(rootPath, relativePath);
        const fileExists = await fs.pathExists(fullPath);
        const templateKey = relativePath;
        const hasTemplate = templateKey in templates_1.TEMPLATES;
        return {
            relativePath,
            action: fileExists ? 'skip' : 'create',
            reason: fileExists
                ? 'File already exists — will not overwrite'
                : hasTemplate
                    ? 'Will be created from template'
                    : 'Template placeholder — will be created empty',
            templateKey,
        };
    }));
    // Determine which scripts are missing from package.json
    const packageJsonScripts = {};
    const pkgPath = path.join(rootPath, 'package.json');
    const hasPkg = await fs.pathExists(pkgPath);
    if (hasPkg) {
        const raw = await fs.readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(raw);
        for (const [name, cmd] of Object.entries(RECOMMENDED_SCRIPTS)) {
            if (!pkg.scripts?.[name]) {
                packageJsonScripts[name] = cmd;
            }
        }
    }
    // Determine which .forceignore lines are missing
    const forceIgnoreLines = [];
    const fiPath = path.join(rootPath, '.forceignore');
    const hasFi = await fs.pathExists(fiPath);
    if (!hasFi) {
        forceIgnoreLines.push(...FORCE_IGNORE_LINES);
    }
    else {
        const content = await fs.readFile(fiPath, 'utf8');
        for (const line of FORCE_IGNORE_LINES) {
            if (!content.includes(line)) {
                forceIgnoreLines.push(line);
            }
        }
    }
    return {
        rootPath,
        preset,
        dryRun,
        files,
        packageJsonScripts,
        forceIgnoreLines,
    };
}
//# sourceMappingURL=planner.js.map

/***/ }),

/***/ 6591:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.generateReadinessReport = generateReadinessReport;
function generateReadinessReport(result) {
    const lines = [];
    const score = result.score;
    const bar = buildBar(score);
    lines.push('');
    lines.push('AI-Kit for Salesforce — Readiness Report');
    lines.push('─'.repeat(50));
    lines.push('');
    if (result.isSalesforceDx) {
        lines.push('Salesforce DX project detected ✓');
    }
    else {
        lines.push('Salesforce DX project: NOT detected ✗');
    }
    if (result.hasForceApp) {
        lines.push('force-app found ✓');
    }
    else {
        lines.push('force-app: NOT found ✗');
    }
    lines.push('');
    lines.push(`AI Readiness Score: ${score}/100`);
    lines.push(`[${bar}] ${score}%`);
    lines.push('');
    if (result.missing.length > 0) {
        lines.push('Missing:');
        for (const m of result.missing) {
            lines.push(`  - ${m}`);
        }
        lines.push('');
    }
    if (result.warnings.length > 0) {
        lines.push('Warnings:');
        for (const w of result.warnings) {
            lines.push(`  ! ${w}`);
        }
        lines.push('');
    }
    if (result.recommendations.length > 0) {
        lines.push('Recommended:');
        for (const r of result.recommendations) {
            lines.push(`  → ${r}`);
        }
        lines.push('');
    }
    const details = [
        ['AGENTS.md', result.hasAgentsMd],
        ['CLAUDE.md', result.hasClaudeMd],
        ['.cursor/rules/project.mdc (Cursor workflow rules)', result.hasCursorProjectRule],
        ['tasks/todo.md + tasks/lessons.md', result.hasTasksTodo && result.hasTasksLessons],
        ['.cursor/rules/ (Apex, LWC, MCP, safety)', result.hasCursorRules],
        ['.cursor/skills/', result.hasCursorSkills],
        ['.claude/commands/', result.hasClaudeCommands],
        ['.claude/agents/', result.hasClaudeAgents],
        ['Security/testing/deployment docs', result.hasDocs],
        ['MCP guide/config', result.hasMcpGuide || result.hasMcpConfig],
        ['AFV-compatible skill templates', result.hasAfvSkills],
        ['AFV Library docs/skills', result.hasAfvLibraryDocs || result.hasAfvLibrarySkills],
    ];
    lines.push('Detail:');
    for (const [label, found] of details) {
        lines.push(`  ${found ? '✓' : '✗'} ${label}`);
    }
    lines.push('');
    return lines.join('\n');
}
function buildBar(score) {
    const filled = Math.round(score / 5);
    const empty = 20 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
//# sourceMappingURL=reporter.js.map

/***/ }),

/***/ 6157:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.writeFileSafe = writeFileSafe;
exports.appendMissingLines = appendMissingLines;
exports.mergePackageJsonScripts = mergePackageJsonScripts;
exports.determineAction = determineAction;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const templates_1 = __nccwpck_require__(9639);
async function writeFileSafe(filePath, content, options = {}) {
    const { dryRun = false, overwrite = false, markerLabel } = options;
    const exists = await fs.pathExists(filePath);
    if (!exists) {
        if (!dryRun) {
            await fs.ensureDir(path.dirname(filePath));
            const finalContent = markerLabel ? (0, templates_1.wrapInMarker)(content) : content;
            await fs.writeFile(filePath, finalContent, 'utf8');
        }
        return { path: filePath, action: 'create', skipped: false };
    }
    // File exists — decide what to do
    if (overwrite) {
        if (!dryRun) {
            await fs.writeFile(filePath, content, 'utf8');
        }
        return { path: filePath, action: 'create', skipped: false };
    }
    if (markerLabel) {
        // Append or replace inside marker block
        return updateMarkerBlock(filePath, content, dryRun);
    }
    // No marker, no overwrite — skip
    return {
        path: filePath,
        action: 'skip',
        skipped: true,
        reason: 'File already exists and overwrite is disabled',
    };
}
async function updateMarkerBlock(filePath, newContent, dryRun) {
    const existing = await fs.readFile(filePath, 'utf8');
    const startIdx = existing.indexOf(templates_1.MARKER_START);
    const endIdx = existing.indexOf(templates_1.MARKER_END);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        // Replace content inside existing marker block
        const before = existing.slice(0, startIdx);
        const after = existing.slice(endIdx + templates_1.MARKER_END.length);
        const updated = before + (0, templates_1.wrapInMarker)(newContent) + after;
        if (!dryRun) {
            await fs.writeFile(filePath, updated, 'utf8');
        }
        return { path: filePath, action: 'merge', skipped: false };
    }
    // No marker found — append new marker block
    const appended = existing.trimEnd() + '\n\n' + (0, templates_1.wrapInMarker)(newContent);
    if (!dryRun) {
        await fs.writeFile(filePath, appended, 'utf8');
    }
    return { path: filePath, action: 'append', skipped: false };
}
async function appendMissingLines(filePath, lines) {
    const exists = await fs.pathExists(filePath);
    let currentContent = '';
    if (exists) {
        currentContent = await fs.readFile(filePath, 'utf8');
    }
    const missing = lines.filter((line) => !currentContent.includes(line));
    if (missing.length === 0)
        return [];
    const toAppend = '\n' + missing.join('\n') + '\n';
    await fs.ensureDir(path.dirname(filePath));
    await fs.appendFile(filePath, toAppend, 'utf8');
    return missing;
}
async function mergePackageJsonScripts(rootPath, scripts) {
    const pkgPath = path.join(rootPath, 'package.json');
    const exists = await fs.pathExists(pkgPath);
    if (!exists)
        return [];
    const raw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    if (!pkg.scripts)
        pkg.scripts = {};
    const added = [];
    for (const [name, cmd] of Object.entries(scripts)) {
        if (!pkg.scripts[name]) {
            pkg.scripts[name] = cmd;
            added.push(name);
        }
    }
    if (added.length > 0) {
        await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
    return added;
}
function determineAction(filePath, fileExists) {
    if (!fileExists)
        return 'create';
    return 'skip';
}
//# sourceMappingURL=safe-write.js.map

/***/ }),

/***/ 9774:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.scanProject = scanProject;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
const AFV_SKILL_NAMES = [
    'agentforce', 'lightning', 'apex', 'soql', 'lwc', 'flow',
    'permissions', 'objects', 'fields', 'ui-bundle', 'samples',
];
async function exists(p) {
    try {
        await fs.access(p);
        return true;
    }
    catch {
        return false;
    }
}
async function isDirectory(p) {
    try {
        const stat = await fs.stat(p);
        return stat.isDirectory();
    }
    catch {
        return false;
    }
}
async function detectAfvLibrarySkills(skillsDir) {
    if (!(await isDirectory(skillsDir)))
        return false;
    try {
        const entries = await fs.readdir(skillsDir);
        return entries.some((e) => AFV_SKILL_NAMES.some((name) => e.toLowerCase().includes(name)));
    }
    catch {
        return false;
    }
}
async function scanProject(rootPath) {
    const p = (...parts) => path.join(rootPath, ...parts);
    const [isSalesforceDx, hasForceApp, hasPackageJson, hasAgentsMd, hasClaudeMd, hasCursorRulesDir, hasCursorSkillsDir, hasClaudeCommandsDir, hasClaudeAgentsDir, hasSecurityDoc, hasTestingDoc, hasDeploymentDoc, hasMcpGuideDoc, hasForceIgnore, hasMcpConfig, hasAfvLibraryDocs, hasAfvLibrarySkills, hasTasksTodo, hasTasksLessons, hasCursorProjectRule,] = await Promise.all([
        exists(p('sfdx-project.json')),
        isDirectory(p('force-app')),
        exists(p('package.json')),
        exists(p('AGENTS.md')),
        exists(p('CLAUDE.md')),
        isDirectory(p('.cursor', 'rules')),
        isDirectory(p('.cursor', 'skills')),
        isDirectory(p('.claude', 'commands')),
        isDirectory(p('.claude', 'agents')),
        exists(p('docs', 'security.md')),
        exists(p('docs', 'testing.md')),
        exists(p('docs', 'deployment.md')),
        exists(p('docs', 'mcp-usage.md')),
        exists(p('.forceignore')),
        exists(p('.mcp.json')).then(async (v) => v || exists(p('.cursor', 'mcp.json'))),
        exists(p('docs', 'afv-library.md')),
        detectAfvLibrarySkills(p('.cursor', 'skills')),
        exists(p('tasks', 'todo.md')),
        exists(p('tasks', 'lessons.md')),
        exists(p('.cursor', 'rules', 'project.mdc')),
    ]);
    const hasAfvSkills = hasCursorSkillsDir;
    const hasDocs = hasSecurityDoc && hasTestingDoc && hasDeploymentDoc;
    const hasTaskManagement = hasTasksTodo && hasTasksLessons;
    let score = 0;
    const missing = [];
    const warnings = [];
    const recommendations = [];
    if (isSalesforceDx) {
        score += 20;
    }
    else {
        missing.push('sfdx-project.json (not a Salesforce DX project)');
        warnings.push('No sfdx-project.json found. AI-Kit works best with Salesforce DX projects.');
    }
    if (hasForceApp) {
        score += 10;
    }
    else {
        missing.push('force-app/ directory');
    }
    if (hasAgentsMd) {
        score += 10;
    }
    else {
        missing.push('AGENTS.md');
        recommendations.push('Add AGENTS.md with project context and AI tool usage rules.');
    }
    if (hasClaudeMd) {
        score += 8;
    }
    else {
        missing.push('CLAUDE.md');
        recommendations.push('Add CLAUDE.md with Claude Code workflow orchestration and Salesforce DX rules.');
    }
    if (hasCursorProjectRule) {
        score += 4;
    }
    else {
        missing.push('.cursor/rules/project.mdc (Cursor workflow rules)');
        recommendations.push('Add .cursor/rules/project.mdc — Cursor equivalent of CLAUDE.md.');
    }
    if (hasCursorRulesDir) {
        score += 8;
    }
    else {
        missing.push('.cursor/rules/ (Apex, LWC, MCP, deployment, safety rules)');
        recommendations.push('Add Cursor rules for Apex, LWC, MCP, deployment, and safety.');
    }
    if (hasCursorSkillsDir) {
        score += 8;
    }
    else {
        missing.push('.cursor/skills/');
        recommendations.push('Add Cursor skill templates for Apex, LWC, Flow, Agentforce, and Data Cloud.');
    }
    if (hasClaudeCommandsDir) {
        score += 6;
    }
    else {
        missing.push('.claude/commands/');
        recommendations.push('Add Claude commands for security review, deploy validation, test writing, and PR prep.');
    }
    if (hasClaudeAgentsDir) {
        score += 6;
    }
    else {
        missing.push('.claude/agents/');
        recommendations.push('Add Claude subagents for architect, Apex developer, LWC developer, QA, and security review.');
    }
    if (hasTaskManagement) {
        score += 6;
    }
    else {
        if (!hasTasksTodo) {
            missing.push('tasks/todo.md');
        }
        if (!hasTasksLessons) {
            missing.push('tasks/lessons.md');
        }
        recommendations.push('Add tasks/ folder for plan-first task tracking and lessons learned.');
    }
    if (hasDocs) {
        score += 6;
    }
    else {
        if (!hasSecurityDoc) {
            missing.push('docs/security.md');
        }
        if (!hasTestingDoc) {
            missing.push('docs/testing.md');
        }
        if (!hasDeploymentDoc) {
            missing.push('docs/deployment.md');
        }
        recommendations.push('Add security, testing, and deployment docs.');
    }
    if (hasMcpGuideDoc || hasMcpConfig) {
        score += 4;
    }
    else {
        missing.push('docs/mcp-usage.md');
        recommendations.push('Add Salesforce DX MCP usage guide and config.');
    }
    if (hasAfvSkills) {
        score += 2;
    }
    else {
        missing.push('AFV-compatible Salesforce skill templates');
        recommendations.push('Add AI-Kit Salesforce skill templates (compatible with Cursor skills workflow).');
    }
    if (hasAfvLibraryDocs || hasAfvLibrarySkills) {
        score += 2;
    }
    else {
        missing.push('Salesforce AFV Library docs/support');
        recommendations.push('Add AFV Library documentation (Salesforce curated agent skills).');
    }
    if (!hasPackageJson) {
        warnings.push('No package.json found. Script merging will be skipped.');
    }
    if (!hasForceIgnore) {
        warnings.push('.forceignore not found — recommended entries will be created.');
    }
    if (recommendations.length === 0 && missing.length === 0) {
        recommendations.push('Your project looks great! Run ai-kit-sf scan periodically to keep it up to date.');
    }
    else if (missing.length > 0) {
        recommendations.unshift(`Run: ai-kit-sf init --preset core`);
    }
    return {
        rootPath,
        isSalesforceDx,
        hasForceApp,
        hasPackageJson,
        hasAgentsMd,
        hasClaudeMd,
        hasCursorRules: hasCursorRulesDir,
        hasCursorSkills: hasCursorSkillsDir,
        hasClaudeCommands: hasClaudeCommandsDir,
        hasClaudeAgents: hasClaudeAgentsDir,
        hasDocs,
        hasMcpGuide: hasMcpGuideDoc,
        hasForceIgnore,
        hasMcpConfig,
        hasAfvSkills,
        hasAfvLibraryDocs,
        hasAfvLibrarySkills,
        hasTasksTodo,
        hasTasksLessons,
        hasCursorProjectRule,
        score,
        missing,
        warnings,
        recommendations,
    };
}
//# sourceMappingURL=scanner.js.map

/***/ }),

/***/ 3683:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.listInstalledSkills = listInstalledSkills;
exports.formatSkillReference = formatSkillReference;
exports.skillToPickItem = skillToPickItem;
const fs = __importStar(__nccwpck_require__(1348));
const path = __importStar(__nccwpck_require__(6928));
async function readSkillDescription(skillDir) {
    const skillMd = path.join(skillDir, 'SKILL.md');
    try {
        const content = await fs.readFile(skillMd, 'utf8');
        const lines = content.split('\n');
        // Find the "When to Use" section or first meaningful description line
        const whenIdx = lines.findIndex((l) => l.toLowerCase().includes('when to use'));
        if (whenIdx !== -1) {
            for (let i = whenIdx + 1; i < lines.length; i++) {
                const line = lines[i].trim().replace(/^[-*>]/, '').trim();
                if (line.length > 10)
                    return line.slice(0, 120);
            }
        }
        // Fallback: first non-heading non-blank line
        for (const line of lines) {
            const clean = line.trim().replace(/^#+\s*/, '').replace(/^[-*>]/, '').trim();
            if (clean.length > 10 && !clean.startsWith('<!--'))
                return clean.slice(0, 120);
        }
        return '';
    }
    catch {
        return '';
    }
}
async function scanSkillsDir(dir, scope) {
    if (!(await fs.pathExists(dir)))
        return [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const skills = [];
    await Promise.all(entries
        .filter((e) => e.isDirectory())
        .map(async (entry) => {
        const skillDir = path.join(dir, entry.name);
        const hasMd = await fs.pathExists(path.join(skillDir, 'SKILL.md'));
        if (!hasMd)
            return;
        const description = await readSkillDescription(skillDir);
        skills.push({ name: entry.name, directory: skillDir, description, scope });
    }));
    return skills.sort((a, b) => a.name.localeCompare(b.name));
}
/** Discover all installed project-level skills */
async function listInstalledSkills(rootPath) {
    const projectSkillsDir = path.join(rootPath, '.cursor', 'skills');
    return scanSkillsDir(projectSkillsDir, 'project');
}
/** Format a skill reference for insertion into a chat prompt */
function formatSkillReference(skill) {
    return `@${skill.name}`;
}
/** Build a display label for a quick-pick UI */
function skillToPickItem(skill) {
    return {
        label: `@${skill.name}`,
        description: skill.scope === 'project' ? '(project skill)' : '(user skill)',
        detail: skill.description,
    };
}
//# sourceMappingURL=skills-picker.js.map

/***/ }),

/***/ 9639:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/**
 * All template content is defined inline here so the package is self-contained
 * with no runtime template file dependencies.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TEMPLATES = exports.MARKER_END = exports.MARKER_START = void 0;
exports.getTemplate = getTemplate;
exports.hasTemplate = hasTemplate;
exports.wrapInMarker = wrapInMarker;
exports.MARKER_START = '<!-- SF-AI-TOOLKIT:START -->';
exports.MARKER_END = '<!-- SF-AI-TOOLKIT:END -->';
exports.TEMPLATES = {
    // ─── Root markdown ──────────────────────────────────────────────────────────
    'AGENTS.md': `# AGENTS.md — AI Tool Usage Guide

> This file was generated by AI-Kit for Salesforce.
> Update the placeholders below to reflect your project.

## Project Overview

<!-- TODO: Describe your Salesforce project, its purpose, and key stakeholders -->
- **Project name:** _your project name_
- **Org type:** Sandbox / Scratch org / Production
- **Primary workstreams:** Apex, LWC, Flow, Agentforce, Data Cloud, etc.

## Salesforce DX Structure

\`\`\`
force-app/
  main/
    default/
      classes/       Apex classes and tests
      triggers/      Apex triggers
      lwc/           Lightning Web Components
      flows/         Flow metadata
      permissionsets/ Permission sets
      profiles/      Profiles (avoid committing unless required)
      objects/       Custom objects and fields
\`\`\`

## Org Alias Notes

- Use \`sf org list\` to see available orgs.
- Confirm the target org alias before every deploy.
- Use scratch orgs or sandboxes for development.
- Never run destructive operations against production without explicit confirmation.

## AI Tool Coverage Matrix

- Cursor: \`.cursor/rules/\` + \`.cursor/skills/\`
- Claude Code: \`CLAUDE.md\` + \`.claude/commands/\` + \`.claude/agents/\`
- Codex CLI: \`AI_INSTRUCTIONS.md\` + project docs in \`docs/\`
- Antigravity or other agentic tools: \`AI_INSTRUCTIONS.md\` + \`AGENTS.md\`

Use \`AI_INSTRUCTIONS.md\` as the canonical cross-tool policy file and keep tool-specific files in sync.

## Salesforce DX MCP Usage

Salesforce DX MCP allows Cursor and Claude Code to interact with your Salesforce org safely.

- Prefer MCP for org operations (metadata, queries, deploys, LWC guidance).
- Confirm the target org before any write operation.
- Use read-only mode for production orgs.
- See \`docs/mcp-usage.md\` for setup and safety rules.

## Cursor Skills / Jag's Salesforce Skills / AFV Library

- Project-level skill templates are under \`.cursor/skills/\`.
- These are AI-Kit local Salesforce skill templates (Cursor-compatible).
- Jag's Salesforce Skills and Salesforce AFV Library can be optionally installed later.
- See \`docs/skills-ecosystem.md\` for the full skills strategy.

## Development Rules

- Use \`sf\` CLI (not deprecated \`sfdx\`) unless required.
- Bulkify all Apex logic — no SOQL or DML inside loops.
- Use \`with sharing\` unless there is a documented reason not to.
- Avoid hardcoded IDs. Use Custom Metadata or Custom Labels.
- Enforce CRUD/FLS where user-accessible data is involved.
- Use Named Credentials for all external callouts.

## Deployment Safety Rules

- Always validate before deploying: \`npm run validate\`
- Confirm org alias before every deploy.
- Do not deploy Profiles unless explicitly required. Prefer Permission Sets.
- Be careful with destructive changes — review before applying.
- Never deploy to production without explicit confirmation and sign-off.

## Testing Expectations

- Every Apex class should have a corresponding test class.
- Tests must cover positive, negative, bulk, and security scenarios.
- Minimum 75% code coverage. Target 85%+.
- Run \`npm run test:apex\` to execute tests.
- See \`docs/testing.md\` for full testing standards.

## Security Expectations

- Never expose secrets, tokens, JWTs, session IDs, or private keys.
- Never log or paste sensitive customer data.
- Do not run anonymous Apex that mutates data without approval.
- Review CRUD/FLS, sharing, SOQL injection, and guest user access.
- See \`docs/security.md\` for full security standards.

## AI Tool Usage Rules

- AI tools should read project files before making changes.
- AI tools must confirm the target org before any deployment.
- AI tools must not deploy to production without explicit human confirmation.
- AI tools must not delete metadata without approval.
- AI tools must not store credentials or create auth files.
- AI tools must not collect telemetry.

## What Not To Do

- Do not hardcode org IDs, user IDs, or record IDs.
- Do not deploy Profiles without a documented reason.
- Do not run destructive metadata operations without a rollback plan.
- Do not bypass sharing rules without a documented exception.
- Do not use \`sfdx\` deprecated commands when \`sf\` equivalents exist.
- Do not expose sensitive data in Apex debug logs or test assertions.
`,
    'CLAUDE.md': `# CLAUDE.md — Claude Code Project Rules

> This file was generated by AI-Kit for Salesforce.
> Claude Code reads this file automatically when you open this project.

---

# Workflow Orchestration

## 1. Plan Mode Default

For any non-trivial task, Claude must enter plan mode first.

Use plan mode when:
- The task has 3 or more steps
- The task involves architectural decisions
- The task affects multiple files
- The task changes deployment behaviour
- The task changes security, permissions, data access, or Salesforce metadata
- The task requires verification or testing

Rules:
- Write a clear plan before implementation.
- Write detailed specs upfront to reduce ambiguity.
- If something goes sideways, stop and re-plan immediately.
- Do not keep pushing through a broken approach.
- Use plan mode for verification steps, not just building.
- For simple and obvious fixes, keep the plan short.

## 2. Subagent Strategy

Use subagents liberally to keep the main context clean.

Rules:
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, use more compute through focused subagents.
- Give each subagent one clear task.
- Do not give one subagent multiple unrelated responsibilities.
- Use specialist subagents for:
  - Salesforce architecture review
  - Apex implementation
  - LWC implementation
  - Security review
  - Test strategy
  - Deployment validation
  - Documentation review

### Subagent Skill Binding (Required)

Subagents do not reliably auto-load project skills. Always bind required skills explicitly in the prompt.

Required mapping:
- Apex subagent: \`salesforce-apex\`, \`salesforce-apex-tests\`
- LWC subagent: \`salesforce-lwc\`
- Integrator subagent: \`salesforce-architect\`, \`salesforce-deployment\`
- Security subagent: \`salesforce-security-review\`

Prompt pattern:
- "Use skills: <comma-separated skill names>"
- "Follow \`AI_INSTRUCTIONS.md\`, \`AGENTS.md\`, and relevant \`.cursor/rules/*.mdc\` files"

For parallel execution:
- Assign explicit file ownership per subagent (no overlap).
- Require an integration pass by a dedicated integrator subagent.
- Require final verification before completion.

## 3. Self-Improvement Loop

After any correction from the user, Claude must update:

\`tasks/lessons.md\`

Rules:
- Capture the mistake pattern.
- Write a rule that prevents the same mistake from happening again.
- Review relevant lessons at the start of each new task.
- Ruthlessly iterate on lessons until mistake rate drops.
- Keep lessons practical, specific, and project-relevant.

Example:

\`\`\`
## Lesson: Do not overwrite existing project files

When updating AI-Kit generated files, never replace an existing file without
checking for marker blocks first. Use safe merge mode and create backups before
modification.
\`\`\`

## 4. Verification Before Done

Never mark a task complete without proving it works.

Rules:
- Run relevant tests where possible.
- Run lint or formatting checks where relevant.
- Check logs when debugging.
- Demonstrate correctness with evidence.
- Diff behaviour between main and the new changes when relevant.
- Ask: "Would a staff engineer approve this?"
- If tests cannot be run, explain exactly why and provide the command the user should run.

Before saying the task is done, include:
- What changed
- What was verified
- What tests or commands were run
- Any remaining risks or manual steps

## 5. Demand Elegance, But Stay Practical

For non-trivial changes, pause and ask:

> "Is there a more elegant way?"

Rules:
- If a fix feels hacky, rethink it.
- Prefer clean, simple, maintainable solutions.
- Avoid over-engineering simple fixes.
- Keep impact minimal.
- Challenge your own work before presenting it.
- Use the smallest change that solves the root cause properly.

Guiding question:

> "Knowing everything I know now, what is the cleanest implementation?"

## 6. Autonomous Bug Fixing

When given a bug report, Claude should investigate and fix it.

Rules:
- Do not ask the user for hand-holding.
- Inspect logs, errors, failing tests, and relevant files.
- Identify the root cause.
- Implement the fix.
- Verify the fix.
- Explain the result clearly.

For failing CI:
- Read the failure.
- Reproduce locally where possible.
- Fix the issue.
- Re-run the relevant validation command.
- Summarise the fix.

---

# Task Management

Claude must use local task files for non-trivial work.

## Plan First

Before implementation, write the plan to:

\`tasks/todo.md\`

Use checkable items:

\`\`\`markdown
- [ ] Scan existing project structure
- [ ] Identify missing AI-Kit assets
- [ ] Generate safe setup plan
- [ ] Apply file changes in safe merge mode
- [ ] Run tests
- [ ] Document results
\`\`\`

## Verify Plan

Before starting implementation:
- Review the plan.
- Confirm assumptions.
- Identify files likely to change.
- Identify risks.

For high-risk work, ask for confirmation before continuing.

High-risk work includes:
- Production deployment
- Destructive metadata
- Permission changes
- Anonymous Apex that mutates data
- Large refactors
- Package/dependency changes

## Track Progress

As work progresses:
- Mark completed items in \`tasks/todo.md\`.
- Add notes when the plan changes.
- Do not silently change direction.

## Explain Changes

At meaningful checkpoints, provide a short high-level summary:
- What changed
- Why it changed
- What remains

## Document Results

At the end of the task, add a review section to \`tasks/todo.md\`:

\`\`\`markdown
## Review

- **Summary:** What was done
- **Files changed:** list
- **Tests run:** commands and results
- **Verification:** what was confirmed
- **Known risks:** anything the developer should watch
- **Follow-up:** remaining items
\`\`\`

## Capture Lessons

After any user correction or failed approach, update \`tasks/lessons.md\`:

\`\`\`markdown
## Lesson: <short title>

- **What went wrong:** description
- **Root cause:** why it happened
- **New rule:** how to prevent it
- **Example:** (optional)
\`\`\`

---

# Core Principles

## Simplicity First

Make every change as simple as possible.

Rules:
- Touch the minimum amount of code.
- Avoid unnecessary abstractions.
- Prefer readable code over clever code.
- Do not introduce new dependencies unless clearly justified.
- Keep generated project setup easy to understand.

## No Laziness

Work like a senior developer.

Rules:
- Find root causes.
- Do not apply temporary fixes unless explicitly requested.
- Do not hide uncertainty.
- Do not skip verification.
- Do not leave broken tests unexplained.
- Do not mark incomplete work as done.

## Minimal Impact

Changes should only touch what is necessary.

Rules:
- Avoid unrelated refactors.
- Avoid formatting unrelated files.
- Avoid changing existing project conventions without reason.
- Preserve user code.
- Preserve existing project structure.
- Avoid introducing bugs through broad changes.

## Secure by Default

For Salesforce projects:
- Never store secrets.
- Never expose org auth files.
- Never log tokens, session IDs, JWTs, private keys, or PII.
- Never deploy to production without explicit confirmation.
- Never run anonymous Apex that mutates data without approval.
- Prefer read-only inspection first.
- Use Salesforce DX MCP safely.
- Confirm target org before deployment.

## Definition of Done

A task is only done when:
- [ ] The planned work is complete
- [ ] Relevant files are updated
- [ ] Tests or validation commands were run where possible
- [ ] Results are documented
- [ ] Risks are clearly stated
- [ ] \`tasks/todo.md\` has a review section
- [ ] \`tasks/lessons.md\` is updated if any correction or mistake occurred

---

# Project Context

This is a Salesforce DX project. Use \`sf\` CLI commands (not deprecated \`sfdx\`) unless a specific command requires it.

Source lives under \`force-app/\`. Configuration is in \`sfdx-project.json\`.

## AI Tool Setup

This project is configured for multiple AI tools. Each reads its own config file:

| AI Tool | Config File |
|---------|-------------|
| Claude Code | \`CLAUDE.md\` (this file) + \`.claude/commands/\` + \`.claude/agents/\` |
| Cursor | \`.cursor/rules/\` + \`.cursor/skills/\` |
| Windsurf | \`.windsurfrules\` |
| GitHub Copilot | \`.github/copilot-instructions.md\` |
| Any MCP-capable tool | \`.mcp.json\` |

All tools share the canonical policy in \`AI_INSTRUCTIONS.md\` and \`AGENTS.md\`.

## Skills

Skill templates live under \`.cursor/skills/\` and follow the [agentskills.io](https://agentskills.io) SKILL.md specification. Reference them in Cursor or Claude by typing \`@skill-name\`.

**SF AI Toolkit skills (11) — architect-level:**
- \`@salesforce-apex\` — Service/Selector/Domain, bulkification, \`WITH USER_MODE\`, governor limits
- \`@salesforce-lwc\` — Wire adapters, reactivity, SLDS 2, accessibility
- \`@salesforce-flow\` — Flow design, bulkification, fault handling, best practices
- \`@salesforce-security-review\` — CRUD/FLS, SOQL injection, sharing model, permissions
- \`@salesforce-agentforce\` — Atlas Reasoning Engine, topics, actions, testing
- \`@salesforce-data-cloud\` — Ingestion, segmentation, activation, privacy
- \`@salesforce-apex-tests\` — @IsTest patterns, mocks, governors, 85%+ coverage
- \`@salesforce-deployment\` — Validate-first, destructive changes, rollback safety
- \`@salesforce-pr-review\` — PR checklist: security, coverage, API versions
- \`@salesforce-commit-message\` — Conventional Commits for Salesforce DX
- \`@salesforce-permissions\` — Permission sets, profiles, security model

**AFV Library skills (29) — Salesforce-official:**
- \`@afv-generating-apex\`, \`@afv-generating-apex-test\`, \`@afv-generating-flow\`
- \`@afv-developing-agentforce\`, \`@afv-testing-agentforce\`, \`@afv-observing-agentforce\`
- \`@afv-building-ui-bundle-app\`, \`@afv-building-ui-bundle-frontend\`, \`@afv-deploying-ui-bundle\`
- \`@afv-generating-custom-object\`, \`@afv-generating-custom-field\`, \`@afv-generating-permission-set\`
- And 17 more — see \`docs/afv-library.md\` for the full list.

## Subagents

Use subagents from \`.claude/agents/\` for non-trivial work:
- \`salesforce-architect\` — architecture decisions, metadata structure, data model
- \`apex-developer\` — Apex, triggers, async jobs, invocable actions
- \`lwc-developer\` — LWC components, JS, HTML, CSS, Apex integration
- \`qa-tester\` — test strategy, Apex tests, LWC tests, regression
- \`security-reviewer\` — security, CRUD/FLS, sharing, SOQL injection, production risks

## Slash Commands

Use commands from \`.claude/commands/\` for common workflows:
- \`/review-security\` — run a full security review checklist
- \`/validate-deploy\` — validate before deploying to any org
- \`/write-tests\` — generate Apex test class for a given class
- \`/create-apex\` — scaffold a new Apex service/selector/domain class
- \`/create-lwc\` — scaffold a new LWC component
- \`/prepare-pr\` — generate PR description with checklist

## Salesforce DX Rules

- Read existing files before making changes.
- Follow existing naming conventions and patterns.
- Do not create files outside \`force-app/\` unless explicitly asked.
- Prefer Permission Sets and Permission Set Groups over Profiles.
- Bulkify all Apex: no SOQL or DML inside loops.
- Use \`with sharing\` by default. Use \`WITH USER_MODE\` on all SOQL queries.
- Avoid hardcoded IDs. Use Custom Metadata for configurable values.
- Enforce CRUD/FLS — \`WITH USER_MODE\` is the preferred modern approach.
- Use Named Credentials for callouts.
- Add \`@SuppressWarnings('PMD')\` only with a written justification.

## Apex Architecture

Follow the Service/Selector/Domain pattern:
- **Service layer** — business logic, called by triggers, LWC, APIs, invocable actions
- **Selector layer** — all SOQL queries, enforces sharing, returns typed SObject lists
- **Domain layer** — DML operations, trigger logic, object-specific validation rules
- **Trigger handlers** — thin, delegate immediately to Domain or Service

## MCP Rules

- Prefer Salesforce DX MCP for org operations where available.
- Use MCP for: list orgs, metadata queries, data queries, deploys, LWC expert guidance.
- Fall back to \`sf\` CLI only if MCP is unavailable.
- Confirm org alias before any write operation.
- Use read-only mode for production orgs.
- See \`docs/mcp-usage.md\` for full config reference.

## Security Rules

- Never expose secrets, tokens, session IDs, JWTs, or private keys.
- Never log or paste sensitive customer data.
- Do not run anonymous Apex that mutates data without explicit approval.
- Do not make production changes without human confirmation.
- Avoid destructive metadata operations without a preview step first.
- Do not store credentials or create auth files.
- Do not collect telemetry.
- See \`docs/security.md\` for the full security checklist.

## Testing Rules

- Write Apex tests for every class you create or modify.
- Cover: positive cases, negative cases, bulk scenarios (200+ records), and security (with/without sharing).
- Use \`@TestSetup\` for shared test data. Use \`Test.startTest()\` / \`Test.stopTest()\` around DML.
- Do not use \`SeeAllData=true\` unless explicitly required.
- Target 85%+ coverage. 75% is the hard minimum.
- Run tests with: \`npm run test:apex\`
- See \`docs/testing.md\` for full test strategy.

## Deployment Rules

- Validate before deploying: \`npm run validate\`
- Confirm target org alias before every deploy.
- Do not deploy Profiles unless explicitly required.
- Explain deployment impact before running deploy commands.
- Never deploy to production without explicit human confirmation.
- See \`docs/deployment.md\` for the full deployment runbook.

## Agentforce Rules

When building Agentforce agents:
- Use Atlas Reasoning Engine for multi-step orchestration.
- Define Topics with clear scope boundaries and discrete actions.
- Invocable actions must be bulkified and respect object-level sharing.
- Test agent behaviour with the Agentforce Testing framework before deploying.
- Reference \`@salesforce-agentforce\` and \`@afv-developing-agentforce\` skills.
- See \`docs/agentforce-vibes-setup.md\` for the full Agentforce Vibes setup guide.
`,
    // ─── Cursor rules ───────────────────────────────────────────────────────────
    '.cursor/rules/salesforce-mcp.mdc': `---
description: Always prefer Salesforce DX MCP for org operations. Use MCP for orgs, metadata, queries, deploys, users, and LWC guidance when available.
globs: ["**/*.cls", "**/*.trigger", "**/*.js", "**/*.html", "**/*.xml"]
alwaysApply: true
---

# Salesforce DX MCP Rules

## Core Rule
Always prefer Salesforce DX MCP for Salesforce org operations. Fall back to \`sf\` CLI only if MCP is unavailable or the operation is not supported.

## MCP First

Use MCP for:
- Listing and switching orgs
- Querying metadata
- Running SOQL queries
- Deploying and validating metadata
- Managing users and permissions
- LWC expert guidance

## Org Safety

- **Always confirm the target org alias before any write operation.**
- Use read-only mode for production orgs.
- Ask before running any destructive operation (delete metadata, modify permissions, run data mutations).
- Never expose org tokens, auth files, or secrets.

## Example MCP Config

\`\`\`json
{
  "mcpServers": {
    "Salesforce DX": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs",
        "DEFAULT_TARGET_ORG",
        "--toolsets",
        "orgs,metadata,data,users,lwc-experts",
        "--tools",
        "run_apex_test,guide_design_general",
        "--allow-non-ga-tools"
      ]
    }
  }
}
\`\`\`

## Never

- Never deploy to production without explicit human confirmation.
- Never delete metadata without approval.
- Never modify users or permissions without approval.
- Never run anonymous Apex that mutates data without approval.
`,
    '.cursor/rules/apex.mdc': `---
description: Apex coding standards for Salesforce DX projects.
globs: ["**/*.cls", "**/*.trigger"]
alwaysApply: false
---

# Apex Coding Standards

## Core Rules

- **Bulkify all logic.** Handle collections, not single records.
- **No SOQL or DML inside loops.** Ever.
- **Use \`with sharing\`** by default unless there is a documented reason.
- **Avoid hardcoded IDs.** Use Custom Metadata or Custom Labels.
- **Use Custom Metadata for configurable values.**
- **Enforce CRUD/FLS** where user-accessible data is involved.
- **Use Named Credentials** for all external callouts.

## Testing

- Write tests for every class and trigger.
- Cover: positive, negative, bulk (200+ records), and security scenarios.
- Use \`@TestSetup\` for shared test data.
- Never use \`SeeAllData=true\` unless required.
- Minimum 75% coverage. Target 85%+.
- Do not log PII or secrets in debug statements.

## Patterns

- Use Service layer pattern for reusable logic.
- Use Trigger Handler pattern — keep triggers thin.
- Use Domain classes for object-specific business logic.
- Use Selector classes for SOQL queries.

## Naming

- Classes: \`PascalCase\`
- Methods: \`camelCase\`
- Test classes: \`ClassNameTest\`
- Constants: \`ALL_CAPS_WITH_UNDERSCORES\`
`,
    '.cursor/rules/lwc.mdc': `---
description: LWC coding standards for Salesforce DX projects.
globs: ["**/lwc/**/*.js", "**/lwc/**/*.html", "**/lwc/**/*.css"]
alwaysApply: false
---

# LWC Coding Standards

## Core Rules

- Keep components small and focused on a single responsibility.
- Always handle loading, error, and empty states explicitly.
- Do not hardcode labels — use Custom Labels where appropriate.
- Use wire adapters for reactive data where suitable.
- Keep Apex controllers cacheable where appropriate (\`@AuraEnabled(cacheable=true)\`).
- Run ESLint after changes: \`npm run lint:lwc\`
- Follow existing component patterns in the project.

## Accessibility

- Use ARIA attributes and semantic HTML.
- Ensure keyboard navigation works.
- Test with screen readers where possible.

## Security

- Validate all inputs in Apex controllers.
- Never expose sensitive data through wire adapters.
- Enforce CRUD/FLS in Apex methods.
- Do not pass sensitive data in component attributes.

## Patterns

- Parent-to-child: properties and attributes
- Child-to-parent: custom events
- Cross-component: Lightning Message Service
- Server data: wire service or imperative Apex

## Testing

- Write Jest tests for non-trivial component logic.
- Mock wire adapters and Apex calls in tests.
- Test user interactions and error states.
`,
    '.cursor/rules/deployment.mdc': `---
description: Deployment safety rules for Salesforce DX projects.
globs: ["**/sfdx-project.json", "**/.forceignore", "**/package.json"]
alwaysApply: true
---

# Deployment Safety Rules

## Before Every Deploy

1. Confirm the target org alias: \`sf org display\`
2. Validate first: \`npm run validate\`
3. Review the list of components being deployed.
4. Check for destructive changes.

## Rules

- **Always validate before deploying.**
- **Never deploy to production without explicit human confirmation.**
- Do not deploy Profiles unless explicitly required. Prefer Permission Sets.
- Be careful with destructive changes — explain the impact before applying.
- Do not use \`--ignore-errors\` or bypass validation in CI pipelines.
- Explain deployment impact clearly before running deploy commands.

## Commands

\`\`\`bash
# Validate only (no deploy)
npm run validate

# Deploy with tests
npm run deploy

# Org info
npm run org:list
\`\`\`

## Production Checklist

- [ ] Validation passed in sandbox/scratch org
- [ ] All tests passing (75%+ coverage)
- [ ] Change set reviewed by second developer
- [ ] Rollback plan documented
- [ ] Deployment window confirmed with team
- [ ] Human sign-off obtained
`,
    '.cursor/rules/safety.mdc': `---
description: Security and AI safety rules — always applied.
globs: ["**/*"]
alwaysApply: true
---

# Security and AI Safety Rules

## Secrets and Credentials

- **Never expose secrets, tokens, session IDs, JWTs, or private keys.**
- Do not paste credentials in code, comments, or logs.
- Do not create \`.env\` files with real credentials.
- Use Named Credentials for all external callouts.
- Use Connected App settings, not hardcoded consumer keys.

## Data Safety

- Never paste or log sensitive customer data.
- Do not expose PII in Apex debug logs or test assertions.
- Do not store sensitive data in Custom Metadata if it is not encrypted.

## Org Safety

- Do not run anonymous Apex that mutates data without explicit approval.
- Do not make production changes without human confirmation.
- Avoid destructive metadata operations without a rollback plan.
- Do not modify users or permission assignments without approval.

## AI Tool Safety

- Do not collect telemetry from the project or org.
- Do not store credentials or create org auth files.
- Do not run external package installs without user approval.
- Do not use AI-generated code in production without review.

## Guest User

- Review all publicly accessible Apex and API endpoints.
- Enforce CRUD/FLS for guest user access.
- Never expose internal data through guest user accessible components.
`,
    // ─── Cursor skills ──────────────────────────────────────────────────────────
    '.cursor/skills/salesforce-apex/SKILL.md': `---
name: salesforce-apex
description: "Production-grade Apex authoring: Service/Selector/Domain pattern, bulkification, USER_MODE, governor limits, and test coverage."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Apex Skill

> SF AI Toolkit — project-level skill. AFV Library reference: forcedotcom/afv-library (generating-apex, generating-apex-test).

## When to Use

- Writing new Apex classes, triggers, batch jobs, queueables, or REST resources
- Reviewing existing Apex for quality, security, or governor limit issues
- Creating invocable actions for Flow or Agentforce
- Refactoring legacy Apex to follow modern patterns

## Architecture Patterns

Use the **Service / Selector / Domain** layered pattern:

| Layer | Responsibility | Naming |
|-------|---------------|--------|
| **Selector** | All SOQL queries, enforce FLS with \`WITH USER_MODE\` | \`AccountSelector\` |
| **Domain** | Business logic on a single SObject collection | \`Accounts\` |
| **Service** | Orchestrate cross-object operations, call external systems | \`AccountService\` |
| **Controller** | Thin LWC/VF entry point — delegates to Service immediately | \`AccountController\` |

Never put SOQL or DML directly in a Controller or trigger handler.

## Hard Rules (never break these)

1. **No SOQL or DML inside loops.** Collect records first, operate outside the loop.
2. **Explicit sharing keyword on every class.** Use \`with sharing\` unless there is a documented security exception approved by the architect.
3. **Enforce USER_MODE on all SOQL.** \`[SELECT Id FROM Account WITH USER_MODE]\` — this enforces both CRUD and FLS.
4. **Bulkify everything.** Methods must accept and return collections (\`List<>\`, \`Map<>\`). Never write a method that loops internally to call a single-record method.
5. **Named Credentials for all callouts.** No hardcoded endpoints, auth tokens, or credentials anywhere.
6. **No hardcoded IDs.** Use Custom Metadata, Custom Labels, or Custom Settings.
7. **Meaningful exception handling.** Never swallow exceptions silently. Log with context; rethrow or surface to the user.
8. **Test behaviour, not coverage.** Every test asserts an outcome. 85%+ coverage target; 100% on Service and Domain layers.

## Class Type Patterns

**Batch Apex**
\`\`\`apex
global class AccountBatch implements Database.Batchable<SObject>, Database.Stateful {
    global Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([SELECT Id FROM Account WITH USER_MODE]);
    }
    global void execute(Database.BatchableContext bc, List<Account> scope) { }
    global void finish(Database.BatchableContext bc) { }
}
\`\`\`

**Queueable**
\`\`\`apex
public with sharing class AccountQueueable implements Queueable, Database.AllowsCallouts {
    public void execute(QueueableContext ctx) { }
}
\`\`\`

**Invocable Action (for Flow / Agentforce)**
\`\`\`apex
public with sharing class GetAccountSummary {
    @InvocableMethod(label='Get Account Summary' description='Returns account summary for Agentforce')
    public static List<Response> execute(List<Request> requests) { }
    public class Request { @InvocableVariable(required=true) public Id accountId; }
    public class Response { @InvocableVariable public String summary; }
}
\`\`\`

## Checklist

- [ ] No SOQL or DML inside any loop
- [ ] Every class has an explicit sharing keyword
- [ ] All SOQL uses \`WITH USER_MODE\` (or \`WITH SYSTEM_MODE\` with documented reason)
- [ ] No hardcoded IDs, endpoints, or credentials
- [ ] All callouts use Named Credentials
- [ ] Exception handling logs context and does not swallow silently
- [ ] Trigger delegates immediately to a handler/service class (no logic in trigger body)
- [ ] Tests cover: positive path, bulk (200+ records), null/empty input, negative/error path
- [ ] Test coverage ≥ 85% on new code
- [ ] No \`System.debug\` statements that could log PII (email, SSN, token, password)
- [ ] Code reviewed against OWASP Apex Security Cheatsheet

## Done Criteria

All checklist items pass, tests are green, and a peer has reviewed the diff.
`,
    '.cursor/skills/salesforce-lwc/SKILL.md': `---
name: salesforce-lwc
description: "Lightning Web Component development: wire adapters, async state handling, Locker Security, Jest tests, and CRUD/FLS enforcement."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce LWC Skill

> SF AI Toolkit — project-level skill. AFV Library reference: forcedotcom/afv-library (building-ui-bundle-frontend, using-ui-bundle-salesforce-data).

## When to Use

- Building or reviewing Lightning Web Components
- Integrating LWC with Apex, wire adapters, or Lightning Message Service
- Migrating Aura components to LWC
- Writing LWC Jest tests

## Architecture Rules

1. **Single responsibility.** One component does one thing. Decompose into container + presentational components.
2. **Always handle all three async states:** loading, error, and empty — never assume data is always present.
3. **Wire adapters for reactive data.** Use \`@wire\` for Salesforce data; imperative Apex only for mutations or conditional fetches.
4. **Custom Labels for all user-facing strings.** Never hardcode display text.
5. **Lightning Message Service for cross-component communication.** Never use window events or global state.
6. **No \`innerHTML\` assignment.** Use \`lwc:ref\`, template directives, or \`lightning-formatted-*\` components instead — innerHTML bypasses Locker Service.
7. **Apex controllers must enforce CRUD/FLS.** Never trust data sent from the client.
8. **No hardcoded Salesforce URLs.** Use \`NavigationMixin\` or \`@salesforce/community/basePath\`.

## Component Structure

\`\`\`
myComponent/
├── myComponent.html       # Template — no logic, only directives
├── myComponent.js         # Controller — wire + imperative calls, event handling
├── myComponent.css        # Scoped styles only
├── myComponent.js-meta.xml # Targets, isExposed
└── __tests__/
    └── myComponent.test.js
\`\`\`

## Wire Pattern

\`\`\`js
@wire(getAccountList)
wiredAccounts({ error, data }) {
    if (data) { this.accounts = data; this.error = undefined; }
    else if (error) { this.error = error; this.accounts = undefined; }
}
\`\`\`
Always destructure both \`data\` and \`error\`. Never access \`this.wiredAccounts.data\` directly in the template.

## Checklist

- [ ] Component handles loading, error, and empty states in the template
- [ ] All user-facing strings use Custom Labels (\`@salesforce/label/...\`)
- [ ] No \`innerHTML\` assignment
- [ ] No hardcoded Salesforce URLs
- [ ] Wire adapters handle both data and error branches
- [ ] Apex controllers enforce CRUD/FLS (\`WITH USER_MODE\`)
- [ ] Component exposes only necessary \`@api\` properties
- [ ] ESLint passes with no warnings: \`npm run lint:lwc\`
- [ ] Jest tests cover: render, user interaction, wire data, wire error, empty state
- [ ] No sensitive data in \`@api\` properties, events, or console output

## Done Criteria

Component renders correctly in all states, ESLint is clean, and Jest tests are green.
`,
    '.cursor/skills/salesforce-flow/SKILL.md': `---
name: salesforce-flow
description: "Salesforce Flow creation and review: type selection, Before/After Save rules, bulk handling, and fault path coverage."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Flow Skill

> SF AI Toolkit — project-level skill. AFV Library reference: forcedotcom/afv-library (generating-flow, generating-validation-rule).

## When to Use

- Creating or reviewing Flow metadata (\`.flow-meta.xml\`)
- Migrating Process Builder or Workflow Rules to Flow
- Documenting Flow logic for handover or review
- Diagnosing Flow performance or governor limit issues

## Flow Type Selection

| Trigger | Correct Flow Type | Notes |
|---------|-----------------|-------|
| Record save, field updates only | Record-Triggered — **Before Save** | Fastest; no DML consumed |
| Record save + related record DML | Record-Triggered — **After Save** | Uses DML statement |
| UI interaction | Screen Flow | Use in Lightning pages, Quick Actions |
| Called from Apex / another Flow | Autolaunched — No Trigger | Reusable logic unit |
| Time-based / scheduled | Scheduled Flow | Avoid for high-volume |

**Never use Process Builder or Workflow Rules for new development** — both are deprecated.

## Hard Rules

1. **No SOQL or DML inside a Flow loop.** Use collection variables; perform Get/Update Records outside loops.
2. **Before Save over After Save** when only updating fields on the triggering record — saves a DML statement.
3. **Bulkify collection operations.** Flow processes records in batches of 200 in record-triggered context.
4. **No hardcoded record IDs** in conditions, assignments, or variables.
5. **Describe every Flow element.** Set the Description field on complex Decision, Assignment, and Loop elements.
6. **Handle null values.** Every Get Records element should have a fault path or null check before use.
7. **One Flow per object per trigger timing** where possible — multiple flows on the same event compound governor usage.

## Checklist

- [ ] Correct flow type selected for the use case
- [ ] No SOQL or DML inside loops
- [ ] Before Save used where no related-record DML is needed
- [ ] No hardcoded record IDs in conditions or variables
- [ ] All Get Records elements handle the null/no-records case
- [ ] Fault connectors wired on every DML and callout element
- [ ] Flow API name follows convention: \`Object_Action_Description\` (e.g., \`Account_AfterSave_SyncToERP\`)
- [ ] Flow description explains purpose and owner team
- [ ] Tested in scratch org or sandbox with bulk data (200+ records)
- [ ] Flow reviewed by architect if it touches >2 objects

## Done Criteria

Flow passes review, handles edge cases, and is tested with representative volume.
`,
    '.cursor/skills/salesforce-security-review/SKILL.md': `---
name: salesforce-security-review
description: "Salesforce security gate: SOQL injection, CRUD/FLS, sharing model, guest user exposure, secrets, and XSS checks."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Security Review Skill

> SF AI Toolkit — project-level skill. Use before every production deployment and AppExchange security review.

## When to Use

- Pre-deployment security gate for any Apex, LWC, Flow, or metadata change
- AppExchange Security Review preparation
- Post-incident root cause analysis
- Quarterly security posture review

## OWASP Salesforce Top Issues

### 1. SOQL Injection
Dynamic SOQL built from user input without sanitisation allows attackers to exfiltrate data.
\`\`\`apex
// BAD
String q = 'SELECT Id FROM Account WHERE Name = \'' + userInput + '\'';
// GOOD — bind variable (preferred)
String q = [SELECT Id FROM Account WHERE Name = :userInput];
// GOOD — escape if dynamic SOQL is truly required
String safe = String.escapeSingleQuotes(userInput);
\`\`\`

### 2. Missing CRUD / FLS
Every query and DML must respect object and field permissions.
\`\`\`apex
// GOOD — enforces both CRUD and FLS automatically
List<Account> accs = [SELECT Id, Name FROM Account WITH USER_MODE];
\`\`\`

### 3. Sharing Violations
\`\`\`apex
// Every class must declare sharing explicitly
public with sharing class AccountService { }   // standard
public without sharing class AccountIntegration { } // document why
public inherited sharing class AccountUtil { }  // explicit inheritance
\`\`\`

### 4. Hardcoded Secrets
Scan for: passwords, tokens, client secrets, API keys, session IDs, private keys.
Store secrets in: **Named Credentials**, **Protected Custom Metadata**, or **org secrets vault**.

### 5. Guest User Over-Exposure
Guest users run without authentication. Review:
- Apex classes with \`global\` or \`@AuraEnabled\` that are accessible without login
- Experience Cloud pages accessible to guest
- Sharing rules that expose records to guest

### 6. Cross-Site Scripting (XSS) in LWC
- No \`innerHTML\` assignment
- No \`eval()\` or \`Function()\`
- Use \`lightning-formatted-*\` components for user-provided content

### 7. Insecure Direct Object Reference
Every record access must go through the sharing model. Never query by Id received from the client without verifying the running user has access.

## Checklist — Apex

- [ ] No dynamic SOQL without bind variables or \`escapeSingleQuotes\`
- [ ] All SOQL uses \`WITH USER_MODE\` (exceptions documented)
- [ ] Every class has explicit \`with sharing\` / \`without sharing\` / \`inherited sharing\`
- [ ] No hardcoded credentials, tokens, or secrets
- [ ] All callouts use Named Credentials
- [ ] No sensitive data in \`System.debug\` statements
- [ ] \`@AuraEnabled\` methods do not expose data beyond the user's sharing

## Checklist — LWC

- [ ] No \`innerHTML\` assignment
- [ ] No hardcoded Salesforce URLs
- [ ] No sensitive data in \`@api\` properties or dispatched events
- [ ] CSP compliance — no inline scripts

## Checklist — Profiles & Permission Sets

- [ ] No "Modify All Data" or "View All Data" granted to non-admin profiles
- [ ] Field-level security tightened on sensitive fields (SSN, DOB, salary, etc.)
- [ ] Guest user profile reviewed — minimum necessary access only
- [ ] Named Credentials not accessible to guest or community users

## Checklist — Deployment

- [ ] No test data containing real PII
- [ ] No \`@IsTest(SeeAllData=true)\` in new tests
- [ ] Deployment does not remove existing sharing rules without review

## Done Criteria

Zero critical findings. High findings have documented mitigations. Review signed off by security owner.
`,
    '.cursor/skills/salesforce-agentforce/SKILL.md': `---
name: salesforce-agentforce
description: "Agentforce agent and invocable action development: Atlas routing, topic scoping, prompt guardrails, and Testing Center specs."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Agentforce Skill

> SF AI Toolkit — project-level skill. AFV Library reference: forcedotcom/afv-library (developing-agentforce, testing-agentforce, observing-agentforce, generating-apex for invocable actions).
> Install full AFV Library: \`npx skills add forcedotcom/afv-library\`

## When to Use

- Building Agentforce agents, topics, and actions
- Creating or reviewing \`@InvocableMethod\` Apex actions
- Writing or reviewing Prompt Templates
- Testing agent behaviour in the Testing Center
- Diagnosing agent errors via session traces

## Agentforce Architecture

\`\`\`
Agent
├── Topics (domain boundaries — one topic per domain)
│   ├── Agent Actions (invocable Apex, Flow, or Prompt)
│   └── Instructions (natural language rules)
└── Prompt Template (system prompt, grounding context)
\`\`\`

**Atlas Reasoning Engine** selects topics and actions based on user intent. Keep topic names and descriptions precise — they are the routing signal.

## Invocable Action Rules

\`\`\`apex
public with sharing class GetCaseHistory {
    @InvocableMethod(
        label='Get Case History'
        description='Returns the last 10 cases for an account. Use when the user asks about case history.'
        category='Case Management'
    )
    public static List<Response> execute(List<Request> requests) {
        // Bulkify: process all requests in one SOQL
        Set<Id> accountIds = new Set<Id>();
        for (Request r : requests) accountIds.add(r.accountId);
        // query with USER_MODE to enforce CRUD/FLS
        List<Case> cases = [SELECT Id, Subject, Status FROM Case
                            WHERE AccountId IN :accountIds
                            WITH USER_MODE ORDER BY CreatedDate DESC LIMIT 10];
        // map results back to responses
        List<Response> responses = new List<Response>();
        for (Request r : requests) {
            Response res = new Response();
            // populate res from cases map
            responses.add(res);
        }
        return responses;
    }
    public class Request  { @InvocableVariable(required=true) public Id accountId; }
    public class Response { @InvocableVariable public List<Case> cases; }
}
\`\`\`

## Prompt Template Best Practices

- **Ground every prompt** with object field context (\`{!Record.FieldName}\`) — do not rely on LLM knowledge of your data model
- **Set explicit guardrails** in system instructions: "Only discuss topics related to this account. Do not reveal internal notes."
- **Use Merge Fields** for record context, not static text
- **Test with adversarial inputs** — attempt prompt injection to verify guardrails

## Testing Checklist (AFV Library: testing-agentforce)

Use the Agentforce Testing Center for batch regression tests.

- [ ] Agent topics are scoped — one domain per topic
- [ ] Each action has a clear \`description\` that guides Atlas routing
- [ ] Invocable actions are bulkified (process all items in \`List<Request>\`)
- [ ] Invocable actions use \`WITH USER_MODE\` — no data beyond user's access
- [ ] Prompt Templates have explicit guardrails against out-of-scope responses
- [ ] Agent tested in sandbox with representative data
- [ ] Agentforce Testing Center YAML specs committed to repo
- [ ] Sensitive data (PII, credentials) never appears in agent responses
- [ ] Session traces reviewed via Observation skill before production launch

## Observability (AFV Library: observing-agentforce)

\`\`\`soql
SELECT Id, AgentType, Status, ErrorMessage, CreatedDate
FROM AgentWork
WHERE CreatedDate = LAST_N_DAYS:7
ORDER BY CreatedDate DESC
LIMIT 50
\`\`\`
Use session traces to diagnose wrong topic selection, failed actions, or unexpected responses.

## Done Criteria

Agent topics scoped, actions bulkified, Testing Center specs committed, guardrails verified, and session traces reviewed in staging.
`,
    '.cursor/skills/salesforce-data-cloud/SKILL.md': `---
name: salesforce-data-cloud
description: "Salesforce Data Cloud: ingestion design, identity resolution, segment criteria, calculated insights, and privacy compliance."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Data Cloud Skill

> SF AI Toolkit — project-level skill. Data Cloud (formerly CDP) — unified customer data platform.

## When to Use

- Designing or reviewing Data Cloud data streams and data models
- Building ingestion pipelines (Connector, API, or Salesforce CRM connector)
- Creating segments, calculated insights, or activation targets
- Reviewing Data Cloud performance or compliance posture

## Data Model Layers

\`\`\`
Raw Data Layer        — Ingested as-is from source systems
Harmonised Layer      — Mapped to standard Data Cloud objects (Individual, Contact Point, etc.)
Insight Layer         — Calculated Insights, Segments derived from harmonised data
Activation Layer      — Segment activations to Marketing Cloud, Ad platforms, CRM
\`\`\`

Always map to the **Individual** object for identity resolution. Use **Contact Point Email / Phone** objects for identity graph matching.

## Ingestion Rules

1. **Use the Salesforce CRM Connector** for standard CRM objects — it handles incremental sync automatically.
2. **Use Ingestion API** for streaming event data or non-CRM sources.
3. **Schema changes** to a data stream require a full re-ingestion — plan field additions carefully.
4. **Primary Key must be stable and unique** across all source records — a changing PK breaks identity resolution.
5. **DateTime fields must be ISO 8601** format for correct ingestion.

## Segment & Calculated Insight Rules

1. **Test segment criteria** in a sandbox Data Cloud org before production — segment refresh can be slow to debug.
2. **Calculated Insights use ANSI SQL** — test queries in Data Cloud Query Editor first.
3. **Segment refresh schedule** affects activation latency — understand the SLA before committing to near-real-time activation.
4. **Avoid cross-DMO joins** on very large datasets without confirmed indexing.

## Compliance & Privacy

1. **Data residency** — confirm which region Data Cloud is provisioned in; applies to GDPR, PDPA, CCPA obligations.
2. **Consent fields** — map consent and preference data; segments must respect opt-out flags.
3. **Right to erasure** — test the individual deletion / suppression workflow before go-live.
4. **No PII in debug logs, Apex test assertions, or AI prompts** — use anonymised or synthetic test data.
5. **Activation target review** — every new activation must be reviewed for privacy compliance before enabling.

## Checklist

- [ ] Data stream primary key is stable and unique
- [ ] All records mapped to Individual object for identity resolution
- [ ] Calculated Insights tested in Query Editor before deployment
- [ ] Segment criteria validated in sandbox org
- [ ] Consent fields mapped and segment honours opt-outs
- [ ] Data residency region confirmed and documented
- [ ] Individual deletion workflow tested end-to-end
- [ ] Activation target reviewed for privacy compliance
- [ ] No PII in test data, debug logs, or prompts

## Done Criteria

Data model reviewed, compliance sign-off obtained, segment and activation tested in staging.
`,
    '.cursor/skills/salesforce-apex-tests/SKILL.md': `---
name: salesforce-apex-tests
description: "Apex test class authoring: Arrange/Act/Assert, TestDataFactory, 251+ bulk coverage, callout mocks, and System.runAs patterns."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Apex Test Writing Skill

> SF AI Toolkit — project-level skill. AFV Library reference: forcedotcom/afv-library (generating-apex-test).

## When to Use

- Writing new Apex test classes from scratch
- Increasing coverage on existing untested code
- Reviewing test quality (not just coverage percentage)
- Setting up \`@TestSetup\` for a test suite

## Test Anatomy

\`\`\`apex
@IsTest
private class AccountServiceTest {

    @TestSetup
    static void makeData() {
        // Create all test data once — shared across all test methods
        Account acc = new Account(Name = 'Test Account');
        insert acc;
    }

    @IsTest
    static void getAccount_returnsAccount_whenValidId() {
        // Arrange
        Account acc = [SELECT Id FROM Account LIMIT 1];
        // Act
        Test.startTest();
        Account result = AccountService.getAccount(acc.Id);
        Test.stopTest();
        // Assert
        Assert.areEqual(acc.Id, result.Id, 'Should return correct account');
    }

    @IsTest
    static void getAccount_throwsException_whenIdIsNull() {
        // Act & Assert
        try {
            Test.startTest();
            AccountService.getAccount(null);
            Test.stopTest();
            Assert.fail('Expected exception was not thrown');
        } catch (IllegalArgumentException e) {
            Assert.isTrue(e.getMessage().contains('Id'), 'Error should mention Id');
        }
    }

    @IsTest
    static void getAccount_handlesBulk_with200Records() {
        // Arrange — insert 200 records in TestSetup, verify bulk path
        List<Account> accounts = [SELECT Id FROM Account];
        // Act
        Test.startTest();
        List<Account> results = AccountService.getAccounts(new Map<Id,Account>(accounts).keySet());
        Test.stopTest();
        // Assert
        Assert.areEqual(200, results.size(), 'Should process all 200 records');
    }
}
\`\`\`

## Rules

1. **Arrange / Act / Assert structure** in every test method. No implicit assertions.
2. **\`@TestSetup\` for shared data.** Do not insert the same records in every \`@IsTest\` method.
3. **\`Test.startTest() / stopTest()\`** around the code under test — resets governor limits and runs async jobs.
4. **Use \`Assert\` class** (not \`System.assert\`) — provides better failure messages.
5. **Test the negative path.** Every public method that can throw must have a test that triggers the exception.
6. **Test bulk with 200 records.** The Apex platform processes triggers in batches of 200.
7. **No \`@IsTest(SeeAllData=true)\`.** Create all test data in \`@TestSetup\` or the test method itself.
8. **No hardcoded IDs** in test data.
9. **Mock callouts** with \`HttpCalloutMock\` — tests must not make real HTTP requests.
10. **Test as a specific user** for permission/sharing scenarios: \`System.runAs(testUser) { ... }\`

## Coverage Targets

| Layer | Target |
|-------|--------|
| Service / Domain | 100% |
| Selector | 90%+ |
| Controller (thin) | 85%+ |
| Utility | 85%+ |
| Minimum to deploy | 75% |

## Checklist

- [ ] Every test class has \`@TestSetup\` if more than one test method exists
- [ ] Tests cover: happy path, null/empty input, bulk (200+), error/exception path
- [ ] \`Test.startTest() / stopTest()\` used in every test method
- [ ] \`Assert\` class used (not \`System.assert\`)
- [ ] No \`@IsTest(SeeAllData=true)\`
- [ ] No hardcoded IDs in test data
- [ ] Callout tests use \`HttpCalloutMock\`
- [ ] Sharing/permission scenarios tested with \`System.runAs\`
- [ ] All assertions have a descriptive failure message

## Done Criteria

Test suite achieves coverage targets, all assertions pass, and bulk paths are verified.
`,
    '.cursor/skills/salesforce-deployment/SKILL.md': `---
name: salesforce-deployment
description: "Salesforce deployment safety: pre-deploy gates, metadata ordering, destructive change risk matrix, and rollback playbook."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Deployment Safety Skill

> SF AI Toolkit — project-level skill. Use before every sandbox-to-sandbox or sandbox-to-production deployment.

## When to Use

- Planning a deployment package
- Running pre-deployment risk assessment
- Reviewing a destructiveChanges manifest
- Deploying to production

## Deployment Checklist — Before You Run

### Code Quality Gates
- [ ] All Apex tests pass locally: \`sf apex run test --synchronous\`
- [ ] Overall org test coverage ≥ 75% (confirm, do not assume)
- [ ] No compilation errors in any class being deployed
- [ ] Security review completed (use the Security Review skill)
- [ ] No \`@IsTest(SeeAllData=true)\` in any test class

### Metadata Safety
- [ ] No Profiles in the deployment package — use Permission Sets instead
- [ ] destructiveChanges.xml reviewed line by line — deletions are irreversible
- [ ] No custom field deletion without confirming zero usage (Reports, Flows, Apex)
- [ ] Page layouts do not remove required fields from edit views
- [ ] Sharing settings changes reviewed — can expose data broadly if misconfigured

### Production-Specific Gates
- [ ] Deployment window confirmed with stakeholders (avoid peak business hours)
- [ ] Rollback plan documented — what will you do if deployment fails mid-way?
- [ ] All dependent metadata deployed in the correct order (Custom Object before fields, Permission Set before assignment)
- [ ] Quick Deploy artefact tested in full-copy sandbox first (if using Quick Deploy)
- [ ] Change Management record created and approved (if org has a change process)

## Deployment Order

Always deploy in this order to avoid dependency errors:

1. Custom Objects
2. Custom Fields
3. Record Types
4. Validation Rules
5. Apex Classes (non-test)
6. Apex Triggers
7. Flows
8. Lightning Web Components
9. Lightning Pages (FlexiPages)
10. Permission Sets
11. Profiles (avoid — use Permission Sets)
12. Apex Test Classes

## Destructive Changes Risk Matrix

| Metadata Type | Risk | Action Required |
|---------------|------|----------------|
| Custom Field deletion | **HIGH** — data loss | Confirm zero usage in Reports, Flow, Apex, integrations |
| Custom Object deletion | **CRITICAL** — data loss | Full impact analysis; archive data first |
| Permission Set removal | **HIGH** — access loss | Confirm no users rely on it |
| Flow deactivation | **MEDIUM** | Check active processes and scheduled interviews |
| Apex Class removal | **MEDIUM** | Confirm no callers via grep and dependency API |

## Rollback Playbook

If a production deployment fails:
1. Note exact failure message and metadata type
2. Do NOT re-run immediately — diagnose first
3. If partial deployment: deploy a fix forward (not a rollback) — Salesforce does not support true rollback
4. If data was changed by a Flow/Trigger that deployed partially: use Data Loader to restore from backup
5. Communicate status to stakeholders within 15 minutes of failure

## Done Criteria

All gates passed, deployment executed in maintenance window, and post-deployment smoke tests confirmed.
`,
    '.cursor/skills/salesforce-pr-review/SKILL.md': `---
name: salesforce-pr-review
description: "Pull request review for Salesforce projects: correctness, security, performance, and maintainability across Apex, LWC, Flow, and metadata."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce PR Review Skill

> SF AI Toolkit — project-level skill. Use on every pull request before merge to any shared branch.

## When to Use

- Reviewing a pull request for Apex, LWC, Flow, or metadata changes
- Acting as PR author self-review before requesting review
- Acting as reviewer providing structured feedback

## PR Review Framework

A good PR review covers four dimensions:

| Dimension | Questions to Answer |
|-----------|-------------------|
| **Correctness** | Does the code do what the ticket says? Are edge cases handled? |
| **Security** | Does it pass the Security Review skill checklist? |
| **Performance** | Are there governor limit risks? N+1 SOQL patterns? |
| **Maintainability** | Is it readable? Is it consistent with the codebase? Does it need a test? |

## Apex Review Checklist

- [ ] No SOQL or DML inside loops
- [ ] All classes have explicit sharing keyword
- [ ] All SOQL uses \`WITH USER_MODE\` (or has a documented reason not to)
- [ ] No hardcoded IDs, credentials, or endpoints
- [ ] All callouts use Named Credentials
- [ ] Exception handling is meaningful — not swallowed silently
- [ ] New public methods have corresponding test methods
- [ ] Test methods cover bulk path (200+ records)
- [ ] Trigger delegates to a handler class immediately

## LWC Review Checklist

- [ ] Component handles loading, error, and empty states
- [ ] No \`innerHTML\` assignment
- [ ] No hardcoded Salesforce URLs
- [ ] Wire adapters handle both \`data\` and \`error\` branches
- [ ] Custom Labels used for user-visible strings
- [ ] ESLint passes

## Flow Review Checklist

- [ ] Correct flow type for the use case (Before Save vs After Save)
- [ ] No SOQL or DML inside loops
- [ ] Fault paths wired on all DML and callout elements
- [ ] No hardcoded record IDs

## Metadata Review Checklist

- [ ] No Profile changes — Permission Sets only
- [ ] No custom field deletions without impact analysis
- [ ] Sharing rules changes reviewed

## Feedback Format

Structure review comments as:

\`\`\`
[BLOCKER] — Must fix before merge. Explain why.
[SUGGESTION] — Recommended improvement. Not blocking.
[QUESTION] — Clarification needed to complete the review.
[PRAISE] — Acknowledge good patterns worth repeating.
\`\`\`

Blockers: security issues, missing tests, SOQL/DML in loops, hardcoded credentials.
Suggestions: naming improvements, refactor opportunities, additional test cases.

## PR Description Quality Check

A good PR description answers:
- **What** changed (1–2 sentence summary)
- **Why** it changed (ticket link or business reason)
- **How** to test it (steps, test class name, or sandbox URL)
- **Risk** — any areas the reviewer should pay extra attention to

## Done Criteria

Zero blockers. All suggestions acknowledged (addressed or explicitly deferred with reason). PR description is complete.
`,
    '.cursor/skills/salesforce-commit-message/SKILL.md': `---
name: salesforce-commit-message
description: "Conventional Commits for Salesforce DX: type taxonomy, scope conventions, real examples, and anti-patterns to reject in PR review."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Commit Message Skill

> SF AI Toolkit — project-level skill. Consistent commit history makes \`git log\`, \`git bisect\`, and release notes generation reliable.

## When to Use

- Writing a commit message for any Salesforce DX change
- Reviewing commit messages in a PR
- Generating release notes from git history

## Commit Message Format

Follow the **Conventional Commits** specification, extended for Salesforce:

\`\`\`
<type>(<scope>): <short summary>

[optional body — explain WHY, not WHAT]

[optional footer — ticket reference, breaking change notice]
\`\`\`

**Rules:**
- Summary line ≤ 72 characters
- Use imperative mood: "add", "fix", "remove" — not "added", "fixed", "removed"
- Body explains motivation and context, not line-by-line description of the diff
- Footer contains ticket ID and any breaking change notice

## Types

| Type | Use For |
|------|---------|
| \`feat\` | New feature, new Apex class, new LWC, new Flow |
| \`fix\` | Bug fix — includes governor limit fixes, sharing fixes |
| \`sec\` | Security fix — SOQL injection, CRUD/FLS, credential exposure |
| \`test\` | Adding or updating Apex test classes only |
| \`refactor\` | Code restructuring with no behaviour change |
| \`perf\` | Performance improvement — SOQL optimisation, bulkification |
| \`meta\` | Metadata only — Permission Sets, Profiles, Custom Fields, Custom Objects |
| \`flow\` | Flow or Process Builder changes |
| \`deploy\` | Deployment config, pipeline, scratch org definition changes |
| \`docs\` | Documentation only — CLAUDE.md, README, inline comments |
| \`chore\` | Build scripts, .gitignore, tooling — no production code |

## Scope (optional but recommended)

Use the primary SObject or component name:
- \`feat(Account)\`, \`fix(CaseService)\`, \`meta(OpportunityStage)\`, \`flow(LeadAssignment)\`

## Examples

\`\`\`
feat(AccountService): add bulk account merge with duplicate detection

Merges duplicate accounts identified by DuplicateRule. Uses Database.merge()
in batches of 10 to stay within DML row limits. Fires a platform event on
completion for downstream notification.

Closes: SF-1234
\`\`\`

\`\`\`
fix(OpportunityTrigger): move SOQL outside loop to prevent governor limit

Was executing one query per opportunity in the before-insert trigger.
Refactored to collect all account IDs first, query once, then map results.
Peak load scenario was hitting the 101 SOQL limit with ~120 records.

Fixes: SF-2019
\`\`\`

\`\`\`
sec(ContactController): enforce WITH USER_MODE on all queries

Previously using default system context, allowing AuraEnabled endpoints
to return fields the running user does not have FLS access to.
All queries now use WITH USER_MODE.

BREAKING CHANGE: Users without FLS on restricted fields will no longer
receive those fields in API responses.
Closes: SEC-087
\`\`\`

\`\`\`
meta(LeadStatus): add 'Qualified - Partner' picklist value

Required by the partner portal team for partner-sourced lead tracking.
Value maps to 'Working' stage in the lead scoring model.

Ticket: SF-3301
\`\`\`

## Anti-Patterns to Reject in PR Review

| Bad | Why | Better |
|-----|-----|--------|
| \`fix bug\` | No context | \`fix(CaseTrigger): prevent null pointer on missing AccountId\` |
| \`WIP\` | Never merge WIP | Squash before merge |
| \`Updated files\` | States the obvious | Explain what changed and why |
| \`Per John's request\` | Names rot; reasons don't | Describe the business reason |
| \`misc changes\` | Untraceable | Split into typed commits |

## Done Criteria

Every commit on the branch has a type, a summary under 72 characters, and a ticket reference (where applicable).
`,
    '.cursor/skills/salesforce-permissions/SKILL.md': `---
name: salesforce-permissions
description: "Salesforce permissions and sharing model: OWD, Role Hierarchy, Permission Set design, CRUD/FLS enforcement, and guest user hardening."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# Salesforce Permissions & Security Model Skill

> SF AI Toolkit — project-level skill. Org security model: Profiles → Permission Sets → Permission Set Groups → Sharing Rules → Manual Sharing.

## When to Use

- Designing object, field, or record access for a new feature
- Reviewing Permission Sets before deployment
- Troubleshooting "insufficient privileges" errors
- Hardening a guest user or community user profile
- Preparing for an AppExchange security review

## Security Model Layers

\`\`\`
Organisation-Wide Defaults (OWD) — baseline record visibility for each object
  └── Role Hierarchy — managers inherit subordinates' record access
       └── Sharing Rules — criteria-based or ownership-based record sharing
            └── Manual Sharing — ad-hoc record shares
                 └── Apex Managed Sharing — programmatic sharing (uses Share objects)

Object Access: Profile / Permission Set — CRUD per object
Field Access:  Profile / Permission Set — Read / Edit per field
Record Access: OWD + Role Hierarchy + Sharing Rules + Manual Sharing
\`\`\`

## Golden Rules

1. **Never modify Profiles for new functionality.** Add a Permission Set and assign it.
2. **Minimum necessary access.** Grant only the CRUD and FLS needed for the task — never "View All" as a shortcut.
3. **OWD should be restrictive** (Private or Public Read Only) — open up with Sharing Rules, not by relaxing OWD globally.
4. **Guest user = most restrictive.** Treat Guest as an untrusted external user. Never grant Modify All or View All.
5. **Test as a non-admin user** before every deployment — admin sees everything; your users may not.
6. **Use Permission Set Groups** to bundle related permissions — easier to assign and audit than individual Permission Sets.

## Permission Set Design

\`\`\`
PS_FeatureName_Read      — Object Read + relevant field reads
PS_FeatureName_Write     — Object CRUD + relevant field reads/edits
PS_FeatureName_Admin     — Above + admin-only fields and Apex class access
\`\`\`

Assign the narrowest set. Use Groups to combine:
\`\`\`
PSG_SalesRep = PS_Account_Read + PS_Opportunity_Write + PS_Case_Read
\`\`\`

## Apex CRUD/FLS Enforcement

\`\`\`apex
// WITH USER_MODE enforces both CRUD and FLS automatically (API v50+)
List<Account> accs = [SELECT Id, Name, AnnualRevenue FROM Account WITH USER_MODE];

// For DML with USER_MODE
Database.insert(records, AccessLevel.USER_MODE);

// Manual FLS check when USER_MODE is not possible
Schema.DescribeSObjectResult objDesc = Schema.SObjectType.Account;
if (!objDesc.isAccessible()) throw new SecurityException('No access to Account');
\`\`\`

## Sharing Model Design

| OWD | Use When |
|-----|---------|
| Private | Records are sensitive and users should only see their own (e.g., HR records) |
| Public Read Only | Users need to view all records but only edit their own |
| Public Read/Write | Collaboration object — most users need full access |
| Controlled by Parent | Detail in a Master-Detail — inherits parent sharing |

Open up from Private/Read-Only using:
- **Role Hierarchy** — managers see subordinates' records (automatic, no config)
- **Ownership-Based Sharing Rules** — share records owned by Role X with Role Y
- **Criteria-Based Sharing Rules** — share records matching field criteria with a group
- **Apex Managed Sharing** — programmatic, survives recalculation if \`rowCause != Manual\`

## Checklist

- [ ] No new feature grants added to Profiles — Permission Sets used instead
- [ ] Permission Sets follow minimum-access principle
- [ ] OWD is Private or Read-Only for sensitive objects
- [ ] Sharing Rules designed to open from restrictive OWD — not to tighten from Public
- [ ] Guest user profile reviewed — no object CRUD beyond what is necessary
- [ ] \`WITH USER_MODE\` (or manual CRUD/FLS checks) on all Apex data access
- [ ] Permission Sets tested by logging in as an assigned user in sandbox
- [ ] Permission Set assignments do not duplicate Profile grants (audit for redundancy)

## Done Criteria

Access model documented, Permission Sets peer-reviewed, tested as a non-admin user, and sign-off from data owner.
`,
    // ─── AFV Library skills (forcedotcom/afv-library) ───────────────────────────
    // Install the full library with: npx skills add forcedotcom/afv-library
    // These are summaries — the library's own SKILL.md files take precedence when installed.
    '.cursor/skills/afv-generating-apex/SKILL.md': `---
name: afv-generating-apex
description: "AFV Library: production-grade Apex class generation with Service/Selector/Domain pattern and hard-stop governor limit constraints."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Apex

> Source: forcedotcom/afv-library · generating-apex
> Install full library: \`npx skills add forcedotcom/afv-library\`

Production-grade Apex authoring: services, selectors, domains, batch/queueable jobs, triggers, DTOs, REST resources, and code review.

## When to Activate

- User mentions Apex, \`.cls\`, \`.trigger\`, or asks to create/refactor a class
- Requests involve SObject CRUD, collections, async jobs, or trigger design

## Core Workflow (8 steps)

1. Discover project conventions (Service-Selector-Domain pattern, logging)
2. Choose the smallest correct pattern
3. Read matching template from \`assets/\`
4. Author with guardrails (apply all Rules)
5. Generate test classes via generating-apex-test skill
6. Run code analyzer and remediate violations
7. Execute tests and capture coverage
8. Report with actual tool output

## Hard-Stop Rules

- **Sharing keyword required** on every class; default \`with sharing\`
- **SOQL/DML outside loops** — governor limit protection
- **Bind variables** for any dynamic SOQL with user input
- **Exception handling** — log, rethrow, or recover; never silent fail
- **No \`@future\`** — use Queueable + Finalizer instead
- **No hardcoded IDs** — use Custom Metadata/Labels
- **No \`System.debug()\` in main paths** — use logging framework
- **Collections over single-record methods** — List, Map, Set always

## Naming Patterns

| Type | Pattern | Example |
|---|---|---|
| Service | \`{SObject}Service\` | \`AccountService\` |
| Selector | \`{SObject}Selector\` | \`AccountSelector\` |
| Batch | \`{Descriptive}Batch\` | \`AccountDeduplicationBatch\` |
| Queueable | \`{Descriptive}Queueable\` | \`ExternalSyncQueueable\` |
| REST Resource | \`{SObject}RestResource\` | \`AccountRestResource\` |

## What to Provide

- Class type (service, selector, batch, queueable, etc.)
- Target object(s) and business goal
- Current project conventions (if known)
- Deployment constraints (API version, org-specific rules)
`,
    '.cursor/skills/afv-generating-apex-test/SKILL.md': `---
name: afv-generating-apex-test
description: "AFV Library: disciplined Apex test creation with one-behaviour-per-method, 251+ bulk records, and Assert class usage."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Apex Tests

> Source: forcedotcom/afv-library · generating-apex-test
> Install full library: \`npx skills add forcedotcom/afv-library\`

Disciplined Apex test creation with production-quality patterns.

## Core Priorities

- **One behavior per test method** — separate positive, negative, and bulk scenarios
- **Bulkify with 251+ records** to cross trigger batch boundaries
- **Isolate test data** via \`TestDataFactory\` — no inline records, no org data
- **Assert with exact values** using the \`Assert\` class exclusively (not legacy \`System.assert*\`)
- **Mock external dependencies** — callouts, SOSL, database operations
- **Wrap code under test** in \`Test.startTest() / Test.stopTest()\`

## Workflow

1. Gather context — identify target classes, existing factories, coverage goals
2. Generate test class using Given/When/Then structure
3. Run tests narrowly before broader regression suites
4. Analyze failures — root cause (test data, assertions, or production logic)
5. Fix in disciplined loops (max 3 iterations) before escalating design issues
6. Validate coverage — target 90%+ with 100% on critical paths

## Test Structure

\`\`\`apex
@isTest
static void shouldUpdateStatus_WhenValidInput() {
    // Given — setup via TestDataFactory
    // When — execute under Test.startTest/stopTest
    // Then — assert with exact expected values using Assert class
}
\`\`\`

**Deliverables:** Always create both the \`.cls\` test file and its \`.cls-meta.xml\` metadata file. If no \`TestDataFactory\` exists, create that too.
`,
    '.cursor/skills/afv-generating-flow/SKILL.md': `---
name: afv-generating-flow
description: "AFV Library: Salesforce Flow generation via mandatory 3-step MCP pipeline — fetchGroundedObjectMetadata, flowElementSelection, flowElementGeneration."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Flow

> Source: forcedotcom/afv-library · generating-flow
> Install full library: \`npx skills add forcedotcom/afv-library\`

Generates Salesforce Flow metadata using a mandatory 3-step MCP pipeline.

## The Pipeline (Non-Negotiable)

1. **fetchGroundedObjectMetadata** — Fetch org schema metadata relevant to the flow
2. **flowElementSelection** — Select flow elements and connections based on user prompt
3. **flowElementGeneration** — Generate metadata element-by-element in a loop until \`isComplete\` returns \`true\`

"This pipeline is the ONLY supported way to generate flows. Any deviation will produce invalid or broken metadata."

## Critical Rules

- **No manual XML creation** — flows must only be generated through this pipeline
- **Loop Step 3 continuously** until \`isComplete\` is \`true\` — do not pause or ask for confirmation
- **Multiple flows** require sequential pipelines — split into separate single-flow prompts
- **inflightMetadata must be an array** containing custom objects/fields from the local SFDX project
- **Pass groundingMetadata directly** from Step 1 to Step 2 without re-serializing
- **Use \`"A4V"\` for requestSource** in Step 3 to obtain XML format output

## Single Exception

Manual XML edits are permitted only when the user explicitly requests fixes to validation or deployment errors in an already-generated flow.
`,
    '.cursor/skills/afv-generating-custom-object/SKILL.md': `---
name: afv-generating-custom-object
description: "AFV Library: deployable Custom Object metadata with correct sharing model, name field type, and Master-Detail constraints."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Custom Object

> Source: forcedotcom/afv-library · generating-custom-object
> Install full library: \`npx skills add forcedotcom/afv-library\`

Mandatory constraints for creating deployable \`.object-meta.xml\` files.

## Required Elements

- \`<label>\` (singular) and \`<pluralLabel>\` (plural)
- \`<sharingModel>\` — \`ReadWrite\` unless the object has a Master-Detail relationship
- \`<deploymentStatus>\` set to \`Deployed\`
- \`<nameField>\` with label and type
- \`<visibility>\` set to \`Public\`

## Critical Sharing Model Rule

If the object contains a Master-Detail relationship field, \`<sharingModel>\` MUST be \`ControlledByParent\`. Using \`ReadWrite\` with Master-Detail causes deployment errors.

## Name Field Options

- **Text**: Default for entities like projects or teams
- **AutoNumber**: For transactions/IDs — requires \`<displayFormat>\` and \`<startingNumber>\`

## Common Mistakes

1. Never include \`<fullName>\` tags in the XML root — API name derives from the filename
2. Validation rule names cannot end with \`__c\`
3. Do not exceed 2 Master-Detail relationships per object
4. Avoid reserved words (\`Select\`, \`User\`, \`Date\`) in API names

## Feature Enablement

Enable \`<enableSearch>\`, \`<enableReports>\`, \`<enableActivities>\`, \`<enableHistory>\` for user-facing objects only.
`,
    '.cursor/skills/afv-generating-custom-field/SKILL.md': `---
name: afv-generating-custom-field
description: "AFV Library: Custom Field metadata generation preventing high-failure-rate deployment errors on Master-Detail and Roll-Up Summary fields."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Custom Field

> Source: forcedotcom/afv-library · generating-custom-field
> Install full library: \`npx skills add forcedotcom/afv-library\`

Generates and validates Salesforce custom field metadata, preventing the most common deployment errors.

## Supported Field Types

Simple: Text, Number, Email, Phone, Date/Time, Checkbox, URL
Relationship: Lookup, Master-Detail
Computed: Formula, Roll-Up Summary
Picklists: Standard and multi-select
Specialized: Geolocation, AutoNumber

## High-Failure-Rate Field Rules

**Master-Detail fields** — these attributes are FORBIDDEN and cause deployment errors:
- \`<required>\`
- \`<deleteConstraint>\`
- \`<lookupFilter>\`

**Roll-Up Summary fields:**
- \`summaryForeignKey\` and \`summarizedField\` must use \`ChildObject__c.FieldName__c\` format
- Exclude precision/scale attributes

## Mandatory Attributes on All Fields

- \`fullName\` — API name
- \`label\` — display label
- \`description\` — what the field stores
- \`inlineHelpText\` — user-facing help

## Numeric Constraints

- precision ≤ 18
- scale ≤ precision
`,
    '.cursor/skills/afv-generating-permission-set/SKILL.md': `---
name: afv-generating-permission-set
description: "AFV Library: deployable Permission Set metadata with least-privilege principles and required-field exclusion from FLS."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Permission Set

> Source: forcedotcom/afv-library · generating-permission-set
> Install full library: \`npx skills add forcedotcom/afv-library\`

Creates deployable Salesforce permission set metadata compatible with Metadata API v60.0+.

## Core Structure (Required)

Three foundational elements before any access controls:
1. \`fullName\` — API name
2. \`label\` — display label
3. \`description\` — purpose and scope

## Object & Field Permissions

- Configure CRUD operations at the object level first
- Then specify field-level security
- **CRITICAL: Required fields must NEVER appear in field permissions** — causes deployment failure

## User Permissions

Grant capabilities like API access, report execution, user management via \`userPermissions\`. Sensitive permissions like \`ViewAllData\` require security review.

## Application Visibility

- Custom tabs require the \`__c\` suffix
- Standard objects use the \`standard-\` prefix format

## Deployment Requirements

- Verify API names match exactly
- Follow least privilege principles
- Exclude required fields from FLS configurations
- Avoid duplicate entries
- Deploy via Salesforce CLI: \`sf project deploy start\`
`,
    '.cursor/skills/afv-developing-agentforce/SKILL.md': `---
name: afv-developing-agentforce
description: "AFV Library: build, modify, debug, and deploy Agentforce agents using Agent Script and AiAuthoringBundle metadata."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Developing Agentforce

> Source: forcedotcom/afv-library · developing-agentforce
> Install full library: \`npx skills add forcedotcom/afv-library\`

Builds, modifies, debugs, and deploys AI agents using Agent Script on the Atlas Reasoning Engine.

## Core Artifact

**AiAuthoringBundle** — directory containing a \`.agent\` file (Agent Script source) and bundle metadata.

Agent Script is NOT AppleScript, JavaScript, Python, or any other language.

## Task Domains (7)

1. **Create an Agent** — design, validate, generate code, stub backing logic, test, publish, activate
2. **Comprehend an Existing Agent** — reverse-engineer purpose and structure
3. **Modify an Existing Agent** — add, remove, or change subagents and flow control
4. **Diagnose Compilation Errors** — resolve validation failures using error taxonomy
5. **Diagnose Behavioral Issues** — fix runtime mismatches using session trace analysis
6. **Deploy, Publish, and Activate** — move from development to production
7. **Diagnose Production Issues** — troubleshoot live agent problems

## Critical Rules

- Always include \`--json\` on every CLI command
- Verify target org before interactions
- Never proceed past Agent Spec creation without explicit user approval
- Follow required steps verbatim — do not substitute custom plans
- Diagnose with live-action previews before modifying code

## The Agent Spec

The authoritative design document throughout the lifecycle — captures purpose, subagent graphs, actions, variables, gating logic, and behavioral intent.

## Quality Rubric (100 points)

Evaluated across 7 categories: structure, safety, deterministic logic, instruction resolution, FSM architecture, action configuration, deployment readiness.

## Key CLI Commands

\`\`\`bash
sf agent validate authoring-bundle --json --api-name <AgentName> -o <org>
sf agent publish authoring-bundle --json --api-name <AgentName> -o <org>
sf agent preview start --json --authoring-bundle <BundleName> -o <org>
sf agent preview send --json --session-id "$SID" --utterance "<text>" --authoring-bundle <BundleName> -o <org>
\`\`\`
`,
    '.cursor/skills/afv-testing-agentforce/SKILL.md': `---
name: afv-testing-agentforce
description: "AFV Library: Agentforce agent testing via sf agent preview (Mode A) and Testing Center YAML specs (Mode B)."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Testing Agentforce

> Source: forcedotcom/afv-library · testing-agentforce
> Install full library: \`npx skills add forcedotcom/afv-library\`

Automated testing for Salesforce Agentforce agents. Requires sf CLI 2.121.7 or later.

## Two Primary Modes

**Mode A — Ad-Hoc Preview Testing**
Uses \`sf agent preview\` for quick smoke tests during development. Automatically derives utterances from agent subagents. Generates local trace files for analysis.

**Mode B — Batch Testing**
Deploys persistent YAML test suites to Testing Center for regression testing and CI/CD integration.

\`\`\`bash
# Mode A
sf agent preview start --json --authoring-bundle <BundleName> -o <org>
sf agent preview send --json --session-id "$SID" --utterance "<text>" --authoring-bundle <BundleName> -o <org>

# Mode B
sf agent test run --json --api-name <TestSuiteName> --wait 10 --result-format json -o <org>
sf agent test results --json --job-id "$JOB_ID" --result-format json -o <org>
\`\`\`

## Safety Rule

"Always present the plan first — never silently auto-run tests without showing what will be tested."

## Key Features

- Automated utterance derivation from agent subagent descriptions
- Trace analysis using jq commands
- Iterative fix loops (max 3 iterations)
- Explicit safety verdicts: SAFE / UNSAFE / NEEDS_REVIEW
- Direct REST API invocation of Flow and Apex actions for isolated testing

## Trace File Location

\`.sfdx/agents/{BundleName}/sessions/{sessionId}/traces/{planId}.json\`
`,
    '.cursor/skills/afv-observing-agentforce/SKILL.md': `---
name: afv-observing-agentforce
description: "AFV Library: analyze production Agentforce behavior using STDM session traces — Observe, Reproduce, and Improve workflow."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Observing Agentforce

> Source: forcedotcom/afv-library · observing-agentforce
> Install full library: \`npx skills add forcedotcom/afv-library\`

Analyzes production Agentforce agent behavior using session traces and Data Cloud STDM.

**Use when:** querying STDM session data, investigating production failures, analyzing session traces, reproducing reported issues.
**Do not use when:** creating/modifying \`.agent\` files (use developing-agentforce), writing test specs (use testing-agentforce).

## Three-Phase Workflow

### Phase 1 — Observe
Query STDM sessions from Data Cloud (if available), or use test suites + preview with local traces as fallback.

\`\`\`bash
# Check STDM availability
sf apex run -o <org> -f /dev/stdin << 'APEX'
ConnectApi.CdpQueryInput qi = new ConnectApi.CdpQueryInput();
qi.sql = 'SELECT ssot__Id__c FROM "ssot__AiAgentSession__dlm" LIMIT 1';
ConnectApi.CdpQueryOutputV2 out = ConnectApi.CdpQuery.queryAnsiSqlV2(qi, 'default');
System.debug('STDM_CHECK:OK');
APEX
\`\`\`

If STDM unavailable: run test suites + \`sf agent preview --authoring-bundle\` with local trace analysis.

### Phase 2 — Reproduce
Use \`sf agent preview\` to simulate problematic conversations live. Run each scenario 3 times:
- \`[CONFIRMED]\` — fails in 3/3 runs
- \`[INTERMITTENT]\` — fails in 1–2 of 3 runs
- \`[NOT REPRODUCED]\` — passes in 3/3 runs

Only CONFIRMED and INTERMITTENT issues proceed to Phase 3.

### Phase 3 — Improve
Edit the \`.agent\` file directly, validate, publish, and verify.

\`\`\`bash
sf agent validate authoring-bundle --json --api-name <AgentName> -o <org>
sf agent publish authoring-bundle --json --api-name <AgentName> -o <org>
\`\`\`

After 24–48 hours, re-run Phase 1 to compare against baseline.
`,
    '.cursor/skills/afv-generating-validation-rule/SKILL.md': `---
name: afv-generating-validation-rule
description: "AFV Library: Salesforce Validation Rule metadata with correct formula functions, CDATA handling, and errorMessage constraints."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Validation Rule

> Source: forcedotcom/afv-library · generating-validation-rule
> Install full library: \`npx skills add forcedotcom/afv-library\`

Creates, modifies, and validates Salesforce Validation Rules.

## Required Metadata Properties

- \`fullName\` — API name (letters/numbers/underscores, max 40 chars, cannot end with underscore)
- \`active\` — Boolean (true = enabled)
- \`errorConditionFormula\` — Boolean formula; TRUE triggers the error
- \`errorMessage\` — User-facing message (max 255 chars)

## File Format

Always use \`.validationRule-meta.xml\` extension.

## Critical Formula Rules

| Mistake | Fix |
|---------|-----|
| \`TEXT()\` with text fields | Remove the function — it's for picklists |
| \`CASE()\` without default | Add default value as final parameter |
| \`VALUE()\` on non-text fields | Only works with text fields |
| \`DAY()\`/\`MONTH()\` on datetime | Convert with \`DATEVALUE()\` first |
| Comparing picklist fields with \`=\` | Use \`ISPICKVAL()\` instead |
| Detecting value changes | Use \`ISCHANGE()\` |

## XML Handling

Wrap \`errorConditionFormula\` containing \`<\`, \`>\`, \`&\` in CDATA sections to prevent XML parse errors.

## Update Rule

Distinguish between replacement ("update to") versus addition ("also add") — these are different operations on the formula.
`,
    '.cursor/skills/afv-generating-flexipage/SKILL.md': `---
name: afv-generating-flexipage
description: "AFV Library: Lightning Page (FlexiPage) generation using CLI template bootstrap with strict XML encoding and unique identifier rules."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating FlexiPage

> Source: forcedotcom/afv-library · generating-flexipage
> Install full library: \`npx skills add forcedotcom/afv-library\`

Creates and modifies Salesforce Lightning Pages (FlexiPages).

## Critical Rule

"Always use the CLI template command when creating a new FlexiPage." The CLI generates valid XML structure, proper regions, and correct metadata.

## Workflow

1. Bootstrap with CLI template command
2. Deploy base page (dry-run validation first)
3. Stop — do not add further modifications until the base page deploys cleanly

## Template Requirements

| Page Type | Required Flags |
|-----------|--------------|
| RecordPage | \`--sobject\`, \`--primary-field\`, \`--secondary-fields\`, \`--detail-fields\` |
| AppPage | No additional flags |
| HomePage | No additional flags |

## XML Rules

- **Property encoding order:** \`&\` first, then \`<\`, \`>\`, \`"\`, \`'\`
- **Field references:** must use \`Record.{FieldApiName}\` format — never \`ObjectName.Field\`
- **Unique identifiers:** all \`<identifier>\` and \`<name>\` values must be unique across the entire file
- **Duplicate regions:** combine multiple components targeting the same facet into one region with multiple \`<itemInstances>\` — never create separate regions with duplicate names
- **Each fieldInstance** requires its own \`<itemInstances>\` wrapper with \`uiBehavior\`
`,
    '.cursor/skills/afv-generating-lightning-app/SKILL.md': `---
name: afv-generating-lightning-app
description: "AFV Library: complete Lightning app orchestration across five phases — Data Model, Business Logic, UI, Assembly, and Security."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Lightning App

> Source: forcedotcom/afv-library · generating-lightning-app
> Install full library: \`npx skills add forcedotcom/afv-library\`

Builds complete Salesforce Lightning Experience applications from natural language descriptions.

**Use when:** users request "complete apps" or "end-to-end solutions" involving multiple interconnected components — not for isolated objects or pages.

## Five Sequential Phases

1. **Data Model** — Custom Objects and Fields
2. **Business Logic** — Validation Rules and Flows (if requested)
3. **User Interface** — List Views, Tabs, and FlexiPages
4. **Application Assembly** — The Lightning App container
5. **Security** — Permission Sets

## Execution Pattern (For Each Phase)

1. Load the specialized skill for the metadata type
2. Call API context tools to confirm valid values
3. Record completion status
4. Generate files only after both previous steps complete

"The skill provides structure; API context provides version-specific accuracy. Both are essential."

## Key Rule

Skills must be invoked when available rather than generating metadata directly. This prevents deployment failures.

## Output

- Organized SFDX project directories
- Deployment manifests
- Build summaries documenting all created components and relationships
`,
    '.cursor/skills/afv-uplifting-to-slds2/SKILL.md': `---
name: afv-uplifting-to-slds2
description: "AFV Library: migrate Lightning Web Components from SLDS 1 to SLDS 2 using the SLDS linter and styling hook categories."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Uplifting Components to SLDS 2

> Source: forcedotcom/afv-library · uplifting-components-to-slds2
> Install full library: \`npx skills add forcedotcom/afv-library\`

Migrates Lightning Web Components from SLDS 1 to SLDS 2 using the SLDS linter.

## Workflow

\`\`\`bash
npx @salesforce-ux/slds-linter@latest lint --fix .
\`\`\`

Then systematically fix the four violation types in order.

## Four Violation Types

1. **Hardcoded values** → Replace with SLDS 2 styling hooks + fallbacks
2. **Deprecated LWC tokens** → Migrate to SLDS 2 hooks
3. **SLDS class overrides** → Rename CSS classes and update markup
4. **Legacy Aura syntax** → Convert \`t()\`/\`token()\` to modern hooks

## Styling Hook Categories

| Category | Hook Pattern | Example |
|----------|------------|---------|
| Color | \`--slds-g-color-*\` | \`--slds-g-color-brand-base-60\` |
| Spacing | \`--slds-g-spacing-*\` | \`--slds-g-spacing-4\` |
| Sizing | \`--slds-g-sizing-*\` | — |
| Typography | \`--slds-g-font-*\` | — |
| Borders | \`--slds-g-color-border-*\` | — |
| Radius/Shadows | \`--slds-g-radius-*\` | — |

## Key Principles

- Always include fallback values preserving original CSS
- Never invent hook names — use only documented SLDS hooks
- Skip layout values: \`100%\`, \`auto\`, \`0\`, \`inherit\`, \`none\`
- Match hook intensity to the original value
- Use \`color-mix()\` for transparency preservation
`,
    '.cursor/skills/afv-switching-org/SKILL.md': `---
name: afv-switching-org
description: "AFV Library: change active Salesforce org using sf config set target-org with local and global scope."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Switching Org

> Source: forcedotcom/afv-library · switching-org
> Install full library: \`npx skills add forcedotcom/afv-library\`

Changes your active Salesforce org using the Salesforce CLI (sf v2+).

## Steps

**1. Identify the org:** Provide a username or alias.
\`\`\`bash
sf org list
\`\`\`

**2. Set the default org:**
\`\`\`bash
# Local scope (project-specific) — use this for normal project work
sf config set target-org <orgIdentifier>

# Global scope (system-wide) — only when explicitly requested
sf config set target-org <orgIdentifier> --global
\`\`\`

**3. Verify the change:**
\`\`\`bash
sf config get target-org --json
\`\`\`

## Notes

- Use \`target-org\` and \`target-dev-hub\` (not the deprecated \`defaultusername\`)
- Local scope is the default — no \`--local\` flag needed
- If org doesn't change, check whether \`SF_TARGET_ORG\` environment variable is set (it overrides config)
- If authentication fails: \`sf org login web\`
`,
    '.cursor/skills/afv-building-ui-bundle-app/SKILL.md': `---
name: afv-building-ui-bundle-app
description: "AFV Library: orchestrate end-to-end Salesforce React UI bundle app through seven phases — scaffold, features, data, UI, integrations, deploy, site."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Building UI Bundle App

> Source: forcedotcom/afv-library · building-ui-bundle-app
> Install full library: \`npx skills add forcedotcom/afv-library\`

Coordinates end-to-end development of complete, deployable Salesforce React UI bundle applications.

**Triggers when:** user requests building a React app, UI bundle, or full-stack Salesforce web application.

## Seven-Phase Build Architecture

Each phase requires: load the corresponding sub-skill → execute its workflow → verify results before proceeding.

| Phase | Sub-Skill | What It Does |
|-------|----------|-------------|
| 1. Scaffolding | generating-ui-bundle-metadata | Scaffold the UI bundle structure |
| 2. Features | generating-ui-bundle-features | Install auth, search, and other features |
| 3. Data Access | using-ui-bundle-salesforce-data | Wire up Data SDK and GraphQL |
| 4. UI | building-ui-bundle-frontend | Build pages, components, layout, styling |
| 5. Integrations | implementing-ui-bundle-agentforce-conversation-client / implementing-ui-bundle-file-upload | Add Agentforce chat or file upload |
| 6. Deployment | deploying-ui-bundle | Deploy metadata, permissions, schema |
| 7. Experience Site (optional) | generating-ui-bundle-site | Create Digital Experience site to host the app |

## Quality Standards

- No boilerplate text in the UI
- Linting passes without errors
- Functional navigation and data integration demonstrated
`,
    '.cursor/skills/afv-building-ui-bundle-frontend/SKILL.md': `---
name: afv-building-ui-bundle-frontend
description: "AFV Library: frontend development for UI bundle apps — pages, components, layout, styling, Tailwind CSS, and TypeScript standards."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Building UI Bundle Frontend

> Source: forcedotcom/afv-library · building-ui-bundle-frontend
> Install full library: \`npx skills add forcedotcom/afv-library\`

Frontend development for files under \`uiBundles/*/src/\` — pages, components, layout, styling.

**Triggers when:** editing pages, components, layout, styling, colors, fonts, navigation, animations, or look-and-feel in an existing UI bundle app.

## Task Types

| Task | Scope |
|------|-------|
| Page | New route + component under \`src/pages/\` |
| Header/Footer | Layout changes in \`appLayout.tsx\` |
| Component | Reusable component under \`src/components/\` |

## Standards

**React & TypeScript**
- Routing with dynamic base paths
- Component library: shadcn/ui
- Styling: Tailwind CSS
- Strict TypeScript — no \`any\`
- No restricted module imports

**Design Thinking (before coding)**
- Typography hierarchy
- Color contrast and brand consistency
- Motion and transitions
- Spatial composition and white space
- Mobile responsiveness

## Verification Requirements

After every change:
- Linting passes
- Navigation works end-to-end
- Data loads and renders correctly
- Mobile layout is acceptable
`,
    '.cursor/skills/afv-deploying-ui-bundle/SKILL.md': `---
name: afv-deploying-ui-bundle
description: "AFV Library: UI bundle deployment in correct order — build, deploy metadata, permissions, data, schema codegen, final build."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Deploying UI Bundle

> Source: forcedotcom/afv-library · deploying-ui-bundle
> Install full library: \`npx skills add forcedotcom/afv-library\`

Critical order of operations for deploying Salesforce UI bundles.

## Deployment Sequence (Must Follow This Order)

1. **Org Authentication** — verify target org is authenticated
2. **Pre-deploy UI Bundle Build** — build the React app before deploying metadata
3. **Deploy Metadata** — deploy SFDX metadata to the org
4. **Post-deploy Configuration** — assign permission sets, profiles, custom settings
5. **Data Import** (optional) — import seed or reference data
6. **GraphQL Schema and Codegen** — fetch schema, regenerate TypeScript types
7. **Final UI Bundle Build** — rebuild with correct schema types

## Critical Rules

- Deploy metadata BEFORE fetching GraphQL schema
- Assign permission sets BEFORE schema fetch — schema fetch requires access
- Never skip permission set assignment silently
- Never skip data import silently if it is required

## Why Order Matters

Schema fetch fails if the user running it does not have object/field access. The permission set grants that access. Deploying metadata first ensures the objects exist for the schema fetch to discover.
`,
    '.cursor/skills/afv-using-ui-bundle-salesforce-data/SKILL.md': `---
name: afv-using-ui-bundle-salesforce-data
description: "AFV Library: access Salesforce data from React UI bundles using the Data SDK with GraphQL, @optional directives, and TypeScript codegen."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Using UI Bundle Salesforce Data

> Source: forcedotcom/afv-library · using-ui-bundle-salesforce-data
> Install full library: \`npx skills add forcedotcom/afv-library\`

Accessing Salesforce records from React UI bundles using the Data SDK (\`@salesforce/sdk-data\`).

## Core Requirement

ALL Salesforce data access from a UI bundle MUST use the Data SDK. No direct REST calls to Salesforce APIs from frontend code.

## Supported APIs (in preference order)

1. **GraphQL** (preferred) — for all record queries and mutations
2. **UI API** — for record forms and layout-aware data
3. **Apex REST** — for complex business logic
4. **Connect REST** — for Salesforce Connect/platform APIs
5. **Einstein LLM** — for AI/LLM capabilities

**Blocked:** Enterprise REST query endpoint (\`/services/data/vXX.X/query\`) — use GraphQL instead.

## GraphQL Non-Negotiable Rules

1. Every nullable field must use \`@optional\` directive
2. All queries must handle HTTP 200 with \`errors\` array (partial success)
3. Use \`useQuery\` hook for reads, \`useMutation\` for writes
4. Always generate TypeScript types from schema: \`npx @salesforce/code-analyzer-graphql-codegen\`
5. Acquire schema before writing queries: \`sf data graphql schema generate\`
6. Queries must be in \`src/api/\` directory
7. Error handling is mandatory — never assume data is present

## Workflow

1. Acquire schema (\`sf data graphql schema generate\`)
2. Look up entities in schema
3. Generate query
4. Generate TypeScript types from query
5. Validate in Query Editor
`,
    '.cursor/skills/afv-creating-b2b-commerce-store/SKILL.md': `---
name: afv-creating-b2b-commerce-store
description: "AFV Library: create a Salesforce B2B Commerce Store and retrieve its storefront metadata via a 7-step guided workflow."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Creating B2B Commerce Store

> Source: forcedotcom/afv-library · creating-b2b-commerce-store
> Install full library: \`npx skills add forcedotcom/afv-library\`

Establishes a Salesforce Commerce B2B Store and retrieves its associated storefront metadata.

## Key Concept

"Commerce has Store (data) + Storefront (metadata). Store must be created first."

- **Store** = the data record created in the Commerce app UI
- **Storefront** = the metadata retrieved via CLI after the store exists

## 7-Step Process

1. Explain the Store vs Storefront concept to the user
2. Guide the user through the Commerce wizard in Setup to create the store
3. Ask the user to confirm the exact store name once created
4. List available sites: \`sf org list metadata --metadata-type Network --json -o <org>\`
5. Present sites for user selection
6. Retrieve storefront metadata: \`sf project retrieve start --metadata "Network:<StoreName>" --json -o <org>\`
7. Confirm success and explain next steps

## CLI Rules

- All CLI commands must include the \`--json\` flag
- Always verify target org before any command
`,
    '.cursor/skills/afv-generating-custom-application/SKILL.md': `---
name: afv-generating-custom-application
description: "AFV Library: Lightning Application metadata with correct navType, formFactors, branding, and profile action overrides."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Custom Application

> Source: forcedotcom/afv-library · generating-custom-application
> Install full library: \`npx skills add forcedotcom/afv-library\`

Creates Salesforce Lightning Application metadata.

## Key Choice: navType

\`navType\` is the most important configuration decision:

| Value | Use For |
|-------|---------|
| \`Standard\` | General-purpose apps with tab navigation |
| \`Console\` | Service Cloud, Sales Engagement — multi-panel workspace |

## Required Properties

\`\`\`xml
<fullName>MyApp</fullName>
<label>My App</label>
<uiType>Lightning</uiType>
<navType>Standard</navType>  <!-- or Console -->
<formFactors>
    <formFactor>Large</formFactor>
    <formFactor>Small</formFactor>
</formFactors>
\`\`\`

## Highly Recommended

- Branding (logo, colors) via \`<brandingSet>\`
- Action overrides for consistent UX
- Profile action overrides for role-based navigation

## Best Practices

- Consistent naming: app API name matches business domain
- Logical tab grouping — related objects together
- Cross-device testing (Large + Small form factors)
- Accessibility review before deployment
`,
    '.cursor/skills/afv-generating-custom-lightning-type/SKILL.md': `---
name: afv-generating-custom-lightning-type
description: "AFV Library: Custom Lightning Type (CLT) JSON Schema definitions for structured Einstein Agent action inputs and outputs."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Custom Lightning Type (CLT)

> Source: forcedotcom/afv-library · generating-custom-lightning-type
> Install full library: \`npx skills add forcedotcom/afv-library\`

Custom Lightning Types (CLTs) are JSON Schema-based definitions that structure inputs/outputs for Lightning Platform, controlling editor and renderer UI for Einstein Agent actions.

## When to Use CLTs

- Structured input/output for Einstein Agent actions
- Complex nested data shapes that Apex \`@InvocableVariable\` cannot express cleanly
- Reusable type definitions across multiple actions

## Configuration Choices

| Pattern | Use When |
|---------|---------|
| Referenced CLT | Type reused across multiple actions |
| Standard Lightning types | Simple primitives (String, Number, Boolean, Date) |
| Apex class types | Business logic requires Apex processing |

## Critical Array Rules (SEVERE RESTRICTIONS)

Arrays in CLTs have significant limitations — consult AFV Library full SKILL.md for the complete constraint list before using array types. Incorrect array configuration causes deployment failures that are hard to diagnose.

## Root Object Schema Requirements

- Must include \`type: "object"\`
- Must include \`properties\` definition
- Required fields listed in \`required\` array

## Deployment Errors

If you encounter CLT deployment errors, install the full AFV Library skill for the comprehensive error reference:
\`npx skills add forcedotcom/afv-library\`
`,
    '.cursor/skills/afv-generating-custom-tab/SKILL.md': `---
name: afv-generating-custom-tab
description: "AFV Library: Custom Tab metadata for Object, Web, and Visualforce tab types with correct XML structure."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating Custom Tab

> Source: forcedotcom/afv-library · generating-custom-tab
> Install full library: \`npx skills add forcedotcom/afv-library\`

Creates Salesforce Custom Tab metadata via \`.tab-meta.xml\` files.

## Three Tab Types

**Object Tab** — for custom or standard objects
\`\`\`xml
<CustomTab xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>MyObject__c</fullName>
    <label>My Objects</label>
    <motif>Custom58: Handsaw</motif>
    <sobjectName>MyObject__c</sobjectName>
</CustomTab>
\`\`\`

**Web Tab** — external website in an iframe
\`\`\`xml
<CustomTab xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>MyWebTab</fullName>
    <label>My Web Tab</label>
    <motif>Custom58: Handsaw</motif>
    <url>https://example.com</url>
    <urlEncodingKey>UTF-8</urlEncodingKey>
</CustomTab>
\`\`\`

**Visualforce Tab** — Visualforce page
\`\`\`xml
<CustomTab xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>MyVFTab</fullName>
    <label>My VF Tab</label>
    <motif>Custom58: Handsaw</motif>
    <page>MyVFPage</page>
</CustomTab>
\`\`\`

## Critical Rules

- Root element must be \`<CustomTab>\` with namespace attribute
- \`fullName\` must match the filename (without extension)
- For sobjectName: custom objects use \`__c\` suffix; standard objects use the API name
- Forbidden elements that cause deployment errors vary by tab type — consult full skill
`,
    '.cursor/skills/afv-generating-list-view/SKILL.md': `---
name: afv-generating-list-view
description: "AFV Library: Salesforce List View metadata with correct column API names, filter scope, and booleanFilterLogic."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating List View

> Source: forcedotcom/afv-library · generating-list-view
> Install full library: \`npx skills add forcedotcom/afv-library\`

Creates Salesforce List View metadata.

## Storage Location

\`force-app/main/default/objects/<ObjectName>/listViews/<ViewName>.listView-meta.xml\`

## Required Elements

- \`label\` — display name
- \`fullName\` — API name (must match filename without extension)
- \`filterScope\` — \`Everything\`, \`Mine\`, \`MyTeam\`, \`Queue\`, etc.
- \`filters\` — filter criteria (optional but common)
- \`booleanFilterLogic\` — \`AND\` / \`OR\` logic across filters
- \`columns\` — fields to display as columns

## Column Naming Rules

- Custom fields: use API name WITH \`__c\` suffix
- Standard fields: use API name WITHOUT suffix (e.g., \`Name\`, \`CreatedDate\`)
- Relationship fields: use the relationship name (e.g., \`Account.Name\`)

## Common Deployment Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Invalid column field | Wrong API name format | Check __c suffix rules |
| Invalid filterScope | Unsupported scope for object | Use \`Everything\` as fallback |
| booleanFilterLogic mismatch | Filter count doesn't match logic | Count filters match logic string |

## Verification Checklist

- [ ] File path matches \`objects/<ObjectName>/listViews/<ViewName>.listView-meta.xml\`
- [ ] \`fullName\` matches filename
- [ ] All column API names verified against object schema
`,
    '.cursor/skills/afv-searching-media/SKILL.md': `---
name: afv-searching-media
description: "AFV Library: search and retrieve existing visual media from Salesforce CMS and Data 360 — present sources before executing."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Searching Media

> Source: forcedotcom/afv-library · searching-media
> Install full library: \`npx skills add forcedotcom/afv-library\`

Routes requests for searching and retrieving existing visual media from Salesforce CMS and Data 360.

**Triggers when:** user asks to "search for logo", "find hero image", "get existing image", or similar media retrieval requests.
**Does NOT trigger for:** AI image generation, editing existing images, or creating new visual assets.

## Three-Step Process (Strict)

1. **Present available search sources as text-only options** — list Salesforce CMS and Data 360 as choices
2. **Wait for user selection** — do NOT call any tool before the user picks a source
3. **Execute the chosen search method**

## Available Search Methods

**Salesforce CMS**
- Keywords search across CMS content
- Filters by content type, channel, and tags

**Data 360**
- Hybrid search combining keyword and semantic matching
- Access to brand assets stored in Data Cloud

## Rule

Never call any search tool before the user has explicitly selected a source. Presenting options first is mandatory.
`,
    '.cursor/skills/afv-generating-ui-bundle-features/SKILL.md': `---
name: afv-generating-ui-bundle-features
description: "AFV Library: install pre-built authentication and search features into Salesforce React UI bundles using the features CLI."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating UI Bundle Features

> Source: forcedotcom/afv-library · generating-ui-bundle-features
> Install full library: \`npx skills add forcedotcom/afv-library\`

Installs pre-built features into UI bundles using the CLI.

## Two Available Features

| Feature | What It Installs |
|---------|----------------|
| **authentication** | Login, logout, protected routes, session management |
| **search** | Global search across pages and content |

## Workflow

1. Search project code to check if the feature is already installed
2. Search available features: \`npx @salesforce/ui-bundle-features list --search <query>\`
3. Describe the feature in detail: add \`--verbose\` flag
4. Install: \`npx @salesforce/ui-bundle-features install <featureName>\`

## Conflict Handling

Uses a two-pass approach:
- Pass 1: install non-conflicting files
- Pass 2: review conflicting files with the user and merge selectively

## Post-Install

Integrate example files from the installed feature into the main app:
- Wire up routes in \`appLayout.tsx\`
- Add navigation links
- Test the full flow end-to-end
`,
    '.cursor/skills/afv-generating-ui-bundle-metadata/SKILL.md': `---
name: afv-generating-ui-bundle-metadata
description: "AFV Library: scaffold Salesforce UI bundle metadata structure using sf template generate with alphanumeric naming rules."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating UI Bundle Metadata

> Source: forcedotcom/afv-library · generating-ui-bundle-metadata
> Install full library: \`npx skills add forcedotcom/afv-library\`

Scaffolds the metadata structure for Salesforce UI bundles.

## Scaffold Command

\`\`\`bash
sf template generate ui-bundle --template reactbasic --name <BundleName>
\`\`\`

**UI bundle names must be alphanumeric only** — no hyphens, underscores, or spaces.

## UI Bundle Structure

\`\`\`
uiBundles/
└── <BundleName>/
    ├── <BundleName>.uibundle-meta.xml   # Salesforce metadata file
    ├── dist/                             # Build output (generated)
    └── src/                             # React source
\`\`\`

## ui-bundle.json Configuration

\`\`\`json
{
    "outputDir": "dist",
    "routing": {
        "basePath": "/s/<BundleName>"
    },
    "headers": {
        "Content-Security-Policy": "..."
    }
}
\`\`\`

## CSP Trusted Sites

For any external domain accessed from the bundle, register a CSP Trusted Site in Setup:
Setup → Security → CSP Trusted Sites → New

Register both the base domain and the specific endpoint if they differ.
`,
    '.cursor/skills/afv-generating-ui-bundle-site/SKILL.md': `---
name: afv-generating-ui-bundle-site
description: "AFV Library: create a Digital Experience Site to host a React UI bundle with five required metadata components."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Generating UI Bundle Site

> Source: forcedotcom/afv-library · generating-ui-bundle-site
> Install full library: \`npx skills add forcedotcom/afv-library\`

Creates and configures a Digital Experience Site to host React UI bundles.

**Triggers when:** project contains \`uiBundles/*/src/\` directories requiring site infrastructure.

## Five Properties to Resolve

1. **siteName** — display name of the Experience Site
2. **siteUrlPathPrefix** — URL path (e.g., \`/s/myapp\`)
3. **appNamespace** — namespace prefix (empty string for no namespace)
4. **appDevName** — developer name of the UI bundle
5. **enableGuestAccess** — boolean (true for public sites)

## Four Implementation Steps

1. Resolve all five properties using fallback strategies (ask user if not determinable)
2. Establish project directory structure with five metadata components
3. Populate metadata using the prescribed templates
4. Preserve non-templated default values (do not overwrite them)

## Metadata Components Required

- \`ExperienceBundle\` — the site container
- \`Network\` — the site configuration
- \`NavigationMenu\` — site navigation
- \`ConnectedApp\` (if OAuth required)
- \`CustomSite\` — site branding and settings

## Pre-Deployment Verification

- [ ] All five properties resolved
- [ ] Directory structure matches SFDX project layout
- [ ] Non-templated defaults preserved
- [ ] Guest access setting matches intended audience
`,
    '.cursor/skills/afv-implementing-agentforce-conversation-client/SKILL.md': `---
name: afv-implementing-agentforce-conversation-client
description: "AFV Library: integrate AgentforceConversationClient into React UI bundles — never create custom chat widgets."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Implementing Agentforce Conversation Client

> Source: forcedotcom/afv-library · implementing-ui-bundle-agentforce-conversation-client
> Install full library: \`npx skills add forcedotcom/afv-library\`

Integrates the \`<AgentforceConversationClient />\` component into React UI bundle applications.

## THE ONE RULE

**NEVER create a custom agent, chatbot, or chat widget component.** Always use \`AgentforceConversationClient\` from \`@salesforce/agentforce-conversation-client\`.

## Prerequisites

- Cookie settings configured for the Experience Site
- Trusted domains registered for Agentforce endpoints
- Agent created and activated in the org

## Key Props

| Prop | Type | Description |
|------|------|-------------|
| \`agentId\` | string (required) | The Agentforce agent ID |
| \`inline\` | boolean | Render inline vs floating widget |
| \`width\` | string | Widget width (e.g., \`'400px'\`) |
| \`height\` | string | Widget height |
| \`headerEnabled\` | boolean | Show/hide header bar |
| \`styleTokens\` | object | ALL styling via this prop |

## Styling Rule

ALL styling customisation must go through the \`styleTokens\` prop. The prop accepts tokens for Container, Header, Welcome Block, Messages, Input, and Error Block sections.

Never apply CSS directly to the component or its shadow DOM.
`,
    '.cursor/skills/afv-implementing-file-upload/SKILL.md': `---
name: afv-implementing-file-upload
description: "AFV Library: programmatic file upload API for UI bundles with basic, immediate-linking, and deferred-linking patterns."
license: MIT
compatibility: claude-code cursor windsurf
allowed-tools: Bash Read Write Edit Glob Grep
---

# AFV Library — Implementing UI Bundle File Upload

> Source: forcedotcom/afv-library · implementing-ui-bundle-file-upload
> Install full library: \`npx skills add forcedotcom/afv-library\`

Programmatic file upload API for React UI bundle applications.

## Key Fact

The package exports APIs only — NOT React components. You must build the custom upload UI yourself.

## Three Upload Patterns

**Pattern 1 — Basic Upload** (returns contentBodyId)
\`\`\`ts
import { upload } from '@salesforce/ui-bundle-file-upload';
const { contentBodyId } = await upload({ file, fileName });
\`\`\`

**Pattern 2 — Immediate Linking** (upload + attach to existing record)
\`\`\`ts
import { upload, createContentDocumentLink } from '@salesforce/ui-bundle-file-upload';
const { contentBodyId } = await upload({ file, fileName });
await createContentDocumentLink({ contentBodyId, linkedEntityId: recordId });
\`\`\`

**Pattern 3 — Deferred Linking** (upload first, create record, then link)
\`\`\`ts
const { contentBodyId } = await upload({ file, fileName });
const recordId = await createRecord({ ... });
await createContentDocumentLink({ contentBodyId, linkedEntityId: recordId });
\`\`\`

## Progress Tracking

\`\`\`ts
await upload({
    file,
    fileName,
    onProgress: (percent: number) => setProgress(percent)
});
\`\`\`
`,
    // ─── Claude commands ─────────────────────────────────────────────────────────
    '.claude/commands/review-security.md': `# /review-security

Review the changed files in this project for Salesforce security issues.

## What to check

1. **SOQL injection** — dynamic SOQL without \`escapeSingleQuotes\` or bind variables
2. **CRUD/FLS** — all DML and queries enforce appropriate object and field permissions
3. **Sharing** — all Apex classes use \`with sharing\` (or have documented exceptions)
4. **Secrets** — no tokens, credentials, session IDs, JWTs, or private keys in code or metadata
5. **Named Credentials** — all external callouts use Named Credentials
6. **Guest user** — no sensitive data accessible without authentication
7. **Hardcoded IDs** — no hardcoded org IDs, record IDs, or user IDs
8. **Permissions** — no over-privileged Permission Set assignments

## Output format

For each file reviewed:
- List any security issues found (severity: Critical / High / Medium / Low)
- Provide the specific line or code that is the concern
- Suggest the fix

End with a summary table: File | Issues Found | Severity.

If no issues found, state clearly: "No security issues found."
`,
    '.claude/commands/validate-deploy.md': `# /validate-deploy

Validate the deployment safely before applying it to any org.

## Steps

1. Identify the target org alias from \`sfdx-project.json\` or ask the developer.
2. Confirm this is NOT production, or get explicit confirmation if it is.
3. Show the list of components that will be deployed.
4. Run: \`npm run validate\`
5. Review the output for errors.
6. Report: tests passed, coverage %, any failures.

## Safety checks

- [ ] Target org alias confirmed
- [ ] Not deploying to production without sign-off
- [ ] All tests passing
- [ ] Coverage ≥ 75%
- [ ] No destructive changes included (unless approved)
- [ ] Profiles not included (unless required)

## If validation fails

- Show the exact error messages.
- Identify the affected component.
- Suggest the fix.
- Do not apply the deployment until validation passes.
`,
    '.claude/commands/write-tests.md': `# /write-tests

Create or update Apex tests and LWC tests for the specified code.

## For Apex tests

1. Read the existing class or trigger being tested.
2. Identify the main scenarios: positive, negative, bulk (200+ records), security.
3. Create or update the test class using this structure:
   - \`@TestSetup\` for shared test data
   - Individual test methods for each scenario
   - \`Test.startTest()\` / \`Test.stopTest()\` around DML
4. Do not use \`SeeAllData=true\`.
5. Cover at least: positive case, null/empty inputs, bulk (200 records), with/without sharing.

## For LWC Jest tests

1. Read the component JS file.
2. Create a Jest test file that:
   - Tests initial render
   - Tests user interactions
   - Mocks wire adapters and Apex calls
   - Tests error states
3. Follow the patterns in the existing \`__tests__\` folders.

## Output

Provide the complete test file(s). State the expected coverage improvement.
`,
    '.claude/commands/create-apex.md': `# /create-apex

Create a new Apex class with service/test structure and security checks.

## Required input

- Class purpose and name
- Object(s) involved
- Operations needed (query, insert, update, delete, callout, etc.)
- Sharing model requirement

## What to create

1. **Service class** (\`ClassName.cls\`) — bulkified business logic
2. **Test class** (\`ClassNameTest.cls\`) — positive, negative, bulk, security tests

## Rules

- Use \`with sharing\` unless told otherwise
- No SOQL or DML inside loops
- Use Collections and Maps for bulk handling
- Enforce CRUD/FLS where needed
- Use Custom Metadata for any configurable values
- Use Named Credentials for any callouts
- Add class-level Javadoc comment explaining purpose

## Output

Provide both files. Explain the design choices made.
`,
    '.claude/commands/create-lwc.md': `# /create-lwc

Create a new Lightning Web Component with loading, error, empty state, and secure Apex integration.

## Required input

- Component name and purpose
- Data needed (object, fields)
- User interactions required
- Whether an Apex controller is needed

## What to create

1. **HTML template** — with loading spinner, error display, empty state, and main content
2. **JavaScript controller** — wire or imperative Apex, error handling, loading state
3. **CSS** — minimal, follows existing patterns
4. **Apex controller** (if needed) — cacheable where appropriate, CRUD/FLS enforced
5. **Jest test** — renders correctly, handles wire data and errors

## Rules

- Always show loading, error, and empty states
- Use Custom Labels for user-visible strings
- Enforce CRUD/FLS in Apex controller
- No sensitive data in component attributes or events
- Follow existing component patterns in the project

## Output

Provide all files. Explain the component structure and data flow.
`,
    '.claude/commands/prepare-pr.md': `# /prepare-pr

Summarise this branch's changes and prepare it for pull request.

## What to produce

### 1. Change summary

List every file changed. For each file:
- Type of change (new / modified / deleted)
- One-sentence description of what changed and why

### 2. Apex tests

- Which test classes cover these changes?
- What is the expected code coverage?
- Run command: \`npm run test:apex\`

### 3. Deployment impact

- What metadata components are included?
- Any destructive changes?
- Any Profiles (flag if yes — requires review)?
- Estimated deployment time?
- Any dependencies (packages, other orgs, data)?

### 4. Risks

- Security concerns?
- Governor limit risks?
- User-visible changes?
- Production risk level: Low / Medium / High

### 5. Checklist

- [ ] Tests written and passing
- [ ] Security reviewed
- [ ] Deployment validated
- [ ] Profiles excluded (or justified)
- [ ] No hardcoded IDs
- [ ] No secrets exposed
- [ ] Reviewer assigned
`,
    // ─── Claude agents ───────────────────────────────────────────────────────────
    '.claude/agents/salesforce-architect.md': `---
name: salesforce-architect
description: Reviews Salesforce project architecture, metadata structure, data model design, integration patterns, and deployment risk. Use for non-trivial architecture decisions, large feature design, or pre-release review.
---

# Salesforce Architect Agent

You are a senior Salesforce architect reviewing this project.

## Your role

- Review the overall metadata structure and data model.
- Evaluate integration patterns (Named Credentials, callouts, platform events).
- Assess governor limit risks at scale.
- Review deployment strategy and rollback approach.
- Identify technical debt or anti-patterns.
- Recommend the right Salesforce feature for the use case (Apex vs Flow vs Configuration).

## Rules

- Read \`AGENTS.md\`, \`CLAUDE.md\`, and relevant metadata files before reviewing.
- Be specific — name the files, classes, or components with concerns.
- Rate risk: Low / Medium / High / Critical.
- Suggest the minimal viable change rather than a complete rewrite.
- Do not make changes — report findings only unless asked.

## Output format

1. Architecture summary (what the change does at a high level)
2. Concerns found (specific, with file references)
3. Recommendations (specific, actionable)
4. Risk rating and justification
`,
    '.claude/agents/apex-developer.md': `---
name: apex-developer
description: Builds and reviews Apex classes, triggers, batch jobs, queueable jobs, scheduled jobs, invocable actions, and Apex tests. Follows Salesforce DX best practices and bulkification patterns.
---

# Apex Developer Agent

You are a senior Salesforce Apex developer.

## Your role

- Build and review Apex classes, triggers, and asynchronous jobs.
- Create invocable actions for Agentforce and Flow.
- Write comprehensive Apex tests (positive, negative, bulk, security).
- Follow Service/Selector/Domain patterns.
- Enforce CRUD/FLS, sharing, and SOQL/DML rules.

## Rules

- Always bulkify. Handle collections. No SOQL or DML inside loops.
- Use \`with sharing\` by default.
- Avoid hardcoded IDs. Use Custom Metadata for config.
- Enforce CRUD/FLS where user-accessible data is involved.
- Use Named Credentials for callouts.
- Minimum 75% test coverage. Target 85%+.
- Do not log PII or secrets in debug statements.
- Use \`Test.startTest()\` / \`Test.stopTest()\` around DML in tests.

## Output format

Provide complete code files. Explain key design decisions. List the test scenarios covered.
`,
    '.claude/agents/lwc-developer.md': `---
name: lwc-developer
description: Builds and reviews Lightning Web Components — HTML, JavaScript, CSS, Apex integration, wire adapters, events, and Jest tests. Follows LWC best practices and accessibility standards.
---

# LWC Developer Agent

You are a senior Salesforce LWC developer.

## Your role

- Build and review Lightning Web Components.
- Create secure, accessible, and well-tested UI components.
- Integrate components with Apex controllers and wire services.
- Write Jest tests for component logic.
- Follow existing project component patterns.

## Rules

- Always handle loading, error, and empty states.
- Use Custom Labels for user-visible strings.
- Use wire adapters for reactive data.
- Keep Apex methods cacheable where appropriate.
- Enforce CRUD/FLS in all Apex controllers.
- No sensitive data in component attributes or events.
- Run ESLint before completing: \`npm run lint:lwc\`
- Follow SLDS design system patterns.

## Output format

Provide all component files (HTML, JS, CSS, Apex if needed, Jest test). Explain the component's data flow and state management.
`,
    '.claude/agents/qa-tester.md': `---
name: qa-tester
description: Creates test strategy, Apex test classes, LWC Jest tests, validation checklists, and regression checklists. Ensures code coverage, edge cases, and security scenarios are covered.
---

# QA Tester Agent

You are a senior Salesforce QA engineer.

## Your role

- Create comprehensive test strategies for Apex and LWC changes.
- Write Apex test classes with full scenario coverage.
- Write LWC Jest tests for component logic and interactions.
- Create validation and regression checklists.
- Identify missing test coverage and edge cases.

## Apex testing rules

- Test each public method.
- Cover: positive case, null/empty inputs, bulk (200 records), permission boundary.
- Use \`@TestSetup\` for shared data.
- Use \`Test.startTest()\` / \`Test.stopTest()\`.
- Never use \`SeeAllData=true\`.
- Minimum 75% coverage per class.

## LWC testing rules

- Test initial render with expected data.
- Test user interactions (clicks, input changes).
- Test wire adapter responses (data, errors).
- Test loading and error states.
- Mock Apex calls and wire adapters.

## Output format

1. Test strategy summary
2. Apex test class(es) — complete code
3. LWC Jest test file(s) — complete code
4. Validation checklist
5. Coverage estimate
`,
    '.claude/agents/security-reviewer.md': `---
name: security-reviewer
description: Reviews Salesforce code and configuration for security issues — SOQL injection, CRUD/FLS, sharing violations, exposed secrets, guest user risk, and production change safety.
---

# Security Reviewer Agent

You are a senior Salesforce security engineer.

## Your role

- Review Apex, LWC, Flow, and configuration changes for security vulnerabilities.
- Check SOQL injection, CRUD/FLS, sharing, guest user access, secrets, and production risks.
- Rate findings by severity: Critical / High / Medium / Low.
- Provide specific remediation steps.

## What to check

1. **SOQL injection** — dynamic SOQL without bind variables or \`escapeSingleQuotes\`
2. **CRUD/FLS** — object and field permissions enforced on all data access
3. **Sharing** — \`with sharing\` on all user-data-touching classes
4. **Secrets** — no tokens, passwords, keys, session IDs in code, metadata, or logs
5. **Named Credentials** — all callouts use Named Credentials, not hardcoded URLs/auth
6. **Guest user** — no sensitive data or operations accessible without authentication
7. **Permissions** — no over-privileged Permission Set assignments
8. **Hardcoded IDs** — no org IDs, record IDs, or user IDs
9. **Production safety** — changes that could affect production flagged explicitly

## Output format

For each file reviewed:
- Security issues found (severity, line reference, explanation)
- Recommended fix (specific code change)

Summary table: File | Issue Count | Highest Severity
Final recommendation: Approve / Request Changes / Reject
`,
    // ─── Docs ─────────────────────────────────────────────────────────────────
    'docs/security.md': `# Security Standards

> Generated by AI-Kit for Salesforce. Review and customise for your project.

## Secrets Policy

- **Never** store tokens, passwords, session IDs, JWTs, or private keys in code, metadata, comments, or logs.
- Use **Named Credentials** for all external system credentials.
- Use **Connected App settings** for OAuth flows — not hardcoded consumer keys.
- Rotate credentials immediately if accidentally exposed.
- Add \`.env\` and \`.env.*\` to \`.forceignore\` and \`.gitignore\`.

## PII Policy

- Do not log or print PII (names, emails, phone numbers, SSNs, etc.) in Apex debug statements.
- Do not use real customer data in test methods.
- Do not expose PII through LWC component attributes or custom events.
- Review Data Cloud data streams for PII compliance before activation.

## Named Credentials

- All HTTP callouts must use Named Credentials.
- Do not hardcode endpoint URLs or authentication headers.
- Review Named Credential permissions — restrict to necessary profiles/permission sets.

## CRUD and FLS

- Enforce object-level CRUD using \`Schema.DescribeSObjectResult.isAccessible()\` etc.
- Enforce field-level security using \`Schema.DescribeFieldResult.isAccessible()\` etc.
- Use \`Security.stripInaccessible()\` for lightweight FLS enforcement.
- Document any intentional bypasses with a clear comment.

## Sharing

- Use \`with sharing\` on all Apex classes that access user data by default.
- Use \`without sharing\` only when there is a documented business reason.
- Use \`inherited sharing\` for utility classes called from both contexts.

## SOQL Injection

- Never concatenate user input directly into SOQL strings.
- Use bind variables (e.g., \`WHERE Id = :recordId\`) wherever possible.
- Use \`String.escapeSingleQuotes()\` when dynamic SOQL is unavoidable.
- Review all dynamic SOQL in code review.

## Guest User Risk

- Review all Apex and APIs accessible without authentication.
- Guest user should never access sensitive objects or fields.
- Apply IP restrictions to Experience Cloud guest user profile where appropriate.
- Regularly audit guest user profile permissions.

## Production Safety

- No direct write operations against production without explicit sign-off.
- All production deployments require validation in sandbox first.
- All production deployments require a rollback plan.
- Production read-only access only for AI tools and MCP by default.

## AI Prompt and Data Safety

- Do not paste sensitive customer data into AI tool prompts.
- Do not include org credentials in prompts or context.
- Review AI-generated code before deploying — do not auto-deploy.
- Do not use AI tools against production orgs without read-only restrictions.
`,
    'docs/testing.md': `# Testing Standards

> Generated by AI-Kit for Salesforce. Review and customise for your project.

## Apex Testing Standards

### Coverage

- Minimum: 75% code coverage per class (Salesforce requirement).
- Target: 85%+ for all business logic.
- 100% target for security-critical methods.

### Test structure

\`\`\`apex
@IsTest
private class MyClassTest {

    @TestSetup
    static void makeData() {
        // Insert shared test records here
    }

    @IsTest
    static void testPositiveCase() {
        // Arrange
        // Act
        Test.startTest();
        // ... call your method
        Test.stopTest();
        // Assert
    }

    @IsTest
    static void testNegativeCase() { ... }

    @IsTest
    static void testBulkCase() {
        // Create 200 records
    }

    @IsTest
    static void testSecurityCase() {
        // Run as a limited-permission user
        User limitedUser = [SELECT Id FROM User WHERE ...];
        System.runAs(limitedUser) {
            ...
        }
    }
}
\`\`\`

### Rules

- Use \`@TestSetup\` for shared test data.
- Use \`Test.startTest()\` / \`Test.stopTest()\` around DML and async operations.
- Never use \`SeeAllData=true\` unless absolutely required.
- Do not test for coverage only — test for correctness.
- Use \`System.assertEquals\`, \`System.assertNotEquals\`, \`System.assert\` with descriptive messages.

## LWC Testing Standards

- Use Jest for LWC unit tests.
- Test initial render, user interactions, wire responses, and error states.
- Mock wire adapters and Apex calls — do not make real callouts in Jest.
- Store tests in \`__tests__\` folder alongside the component.

## Deployment Validation

\`\`\`bash
# Validate without deploying
npm run validate

# Run Apex tests
npm run test:apex

# Run LWC Jest tests
npx jest
\`\`\`

## Test Data Strategy

- Use \`@TestSetup\` for data shared across multiple test methods.
- Create minimal test data — only what the test needs.
- Do not rely on existing org data (\`SeeAllData=false\`).
- Use \`Test.createStub()\` for mocking external callouts.
- Use \`StaticResourceCalloutMock\` for HTTP callout mocks.

## Scenarios to Cover

Every feature must include tests for:
- **Positive:** Happy path works correctly.
- **Negative:** Invalid inputs, missing data, errors handled gracefully.
- **Bulk:** 200 records processed without hitting governor limits.
- **Security:** Correct behaviour when run as a restricted user.
`,
    'docs/deployment.md': `# Deployment Standards

> Generated by AI-Kit for Salesforce. Review and customise for your project.

## Validate Before Deploy

Always validate your changes before deploying:

\`\`\`bash
npm run validate
\`\`\`

This runs: \`sf project deploy validate --source-dir force-app --test-level RunLocalTests --wait 60\`

Validation runs all local tests and checks the metadata without committing it to the org.

## Dry-Run Process

1. Run \`npm run validate\` — check for errors.
2. Review the components list in the output.
3. Check test results and coverage.
4. Only proceed to deploy if validation passes.

## Production Checklist

Before deploying to production:

- [ ] Validation passed in a sandbox or scratch org
- [ ] All tests passing with ≥ 75% coverage
- [ ] Security review completed
- [ ] Changes reviewed by a second developer
- [ ] Destructive changes reviewed and approved
- [ ] Profiles excluded (or explicitly justified)
- [ ] Rollback plan documented
- [ ] Deployment window confirmed with team and stakeholders
- [ ] Human sign-off obtained (manager or tech lead)

## Destructive Changes Checklist

Destructive changes remove metadata from the org. Extra care required:

- [ ] Confirm the metadata being deleted is no longer used
- [ ] Check if deleted fields/objects have dependencies
- [ ] Test in sandbox that deletion does not break anything
- [ ] Get explicit approval from the project owner
- [ ] Ensure rollback is possible (recreate from Git if needed)

## Rollback Notes

- Metadata deployed via source tracking can be reverted by redeploying the previous version.
- For data changes (DML in anonymous Apex), ensure a data backup or reversible script exists.
- For schema changes (new fields), removal requires a destructive change deployment.
- Keep Git tags or branch snapshots at each production deployment for reference.

## Target Org Confirmation

Before every deployment:

\`\`\`bash
sf org display
sf org list
\`\`\`

Confirm the org alias and type (Sandbox / Scratch / Production) before proceeding.

## Deploy Commands

\`\`\`bash
# Validate only
npm run validate

# Deploy with tests
npm run deploy

# List orgs
npm run org:list
\`\`\`
`,
    'docs/mcp-usage.md': `# Salesforce DX MCP Usage Guide

> Generated by AI-Kit for Salesforce.

## What is Salesforce DX MCP?

Salesforce DX MCP (Model Context Protocol) is a server that allows AI tools like Cursor and Claude Code to interact with your Salesforce org in a structured, controlled way.

Instead of copy-pasting metadata or running CLI commands manually, Cursor and Claude Code can use MCP to:
- Query org metadata
- Run SOQL queries
- List and manage orgs
- Deploy and validate metadata
- Get LWC expert guidance
- Manage users and permissions

## Why Should Teams Use It?

- **Faster development** — AI tools have live org context without manual copy-paste.
- **Fewer errors** — structured API access reduces misinterpretation.
- **Auditable** — MCP operations are explicit and confirmable.
- **Safer** — production can be locked to read-only via config.

## How Cursor and Claude Code Use It

Once MCP is configured in \`.cursor/mcp.json\` or \`.mcp.json\`, Cursor and Claude Code will automatically use the Salesforce DX MCP server when they need org data.

They will:
1. Ask the MCP server for metadata or org info.
2. Show you what they found.
3. Propose changes for your review before applying them.

## Example MCP Configuration

Create \`.cursor/mcp.json\` (for Cursor) or \`.mcp.json\` (for Claude Code):

\`\`\`json
{
  "mcpServers": {
    "Salesforce DX": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs",
        "DEFAULT_TARGET_ORG",
        "--toolsets",
        "orgs,metadata,data,users,lwc-experts",
        "--tools",
        "run_apex_test,guide_design_general",
        "--allow-non-ga-tools"
      ]
    }
  }
}
\`\`\`

**Important:** Replace \`DEFAULT_TARGET_ORG\` with your default org alias (e.g., \`my-sandbox\`).

Each CLI flag and value must be a separate item in the \`args\` array — do not combine them into a single string.

## Toolset Explanation

| Toolset | What it gives the AI |
|---------|----------------------|
| \`orgs\` | List orgs, get org info, switch default org |
| \`metadata\` | Query and retrieve metadata components |
| \`data\` | Run SOQL queries, view records |
| \`users\` | List users, view permission assignments |
| \`lwc-experts\` | LWC expert guidance and patterns |

## Safe Org Rules

- **Always confirm the target org alias** before any write operation.
- **Read-only mode for production** — do not allow writes to production via MCP.
- **Confirm before destructive operations** — metadata deletion, permission changes.
- **Never expose org tokens or auth files** — MCP uses existing \`sf\` CLI auth.

## Production Read-Only Recommendation

For production orgs, restrict MCP to read-only toolsets:

\`\`\`json
{
  "mcpServers": {
    "Salesforce DX (Production - READ ONLY)": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs",
        "production",
        "--toolsets",
        "orgs,metadata,data",
        "--allow-non-ga-tools"
      ]
    }
  }
}
\`\`\`

## Risky Operations Requiring Confirmation

The following operations must always require explicit human confirmation before the AI proceeds:

- Deploying metadata to production
- Deleting or destructive-deploying metadata
- Running anonymous Apex that modifies data
- Modifying user profiles or permission assignments
- Accessing sensitive customer data
`,
    'docs/cursor-setup.md': `# Cursor Setup Guide

> Generated by AI-Kit for Salesforce.

## Cursor Rules

Project-level Cursor rules are stored in \`.cursor/rules/\`.

| Rule file | Purpose |
|-----------|---------|
| \`salesforce-mcp.mdc\` | MCP-first org operations, org safety |
| \`apex.mdc\` | Apex coding standards |
| \`lwc.mdc\` | LWC coding standards |
| \`deployment.mdc\` | Deployment safety |
| \`safety.mdc\` | Security and AI safety (always applied) |

Rules with \`alwaysApply: true\` are applied to every conversation. Rules with \`globs\` are applied when matching files are open.

## Cursor Skills

Project-level skills are stored in \`.cursor/skills/\`. Each skill is a directory with a \`SKILL.md\` file.

| Skill | When to use |
|-------|-------------|
| \`salesforce-apex\` | Writing, reviewing, or fixing Apex |
| \`salesforce-lwc\` | Building or reviewing LWC |
| \`salesforce-flow\` | Reviewing or documenting Flow |
| \`salesforce-security-review\` | Security review before deploy |
| \`salesforce-agentforce\` | Agentforce and invocable actions |
| \`salesforce-data-cloud\` | Data Cloud integrations |

### How to manually invoke a skill

In Cursor chat:
1. Type \`@\` and select the skill from the dropdown.
2. Or mention the skill name in your prompt: _"Using the salesforce-apex skill, review this trigger."_

### Project-level vs user-level skills

- **Project-level** (this project): \`.cursor/skills/\`
- **User-level** (all projects): \`~/.cursor/skills/\`

AI-Kit for Salesforce creates project-level skills so the whole team shares the same standards.

## MCP Configuration

See \`docs/mcp-usage.md\` for the full Salesforce DX MCP setup guide.

Quick setup:
1. Copy the example config from \`docs/mcp-usage.md\`.
2. Save it as \`.cursor/mcp.json\` for Cursor.
3. Replace \`DEFAULT_TARGET_ORG\` with your org alias.
4. Restart Cursor.

## Skills Ecosystem

See \`docs/skills-ecosystem.md\` for the full guide to AI-Kit templates, Jag's Salesforce Skills, and Salesforce AFV Library.
`,
    'docs/claude-code-setup.md': `# Claude Code Setup Guide

> Generated by AI-Kit for Salesforce.

## CLAUDE.md Purpose

\`CLAUDE.md\` is the main project rules file for Claude Code. Claude reads it automatically when you open the project. It tells Claude:
- What kind of project this is
- What rules to follow
- What tools to use
- What is off-limits

Keep \`CLAUDE.md\` up to date as your project evolves.

## Claude Commands

Claude commands are slash commands stored in \`.claude/commands/\`. Run them in Claude Code chat.

| Command | Purpose |
|---------|---------|
| \`/review-security\` | Review changed files for Salesforce security issues |
| \`/validate-deploy\` | Validate deployment safely before applying |
| \`/write-tests\` | Create or update Apex and LWC tests |
| \`/create-apex\` | Create Apex service class with tests |
| \`/create-lwc\` | Create LWC with full state handling |
| \`/prepare-pr\` | Summarise changes and prepare PR description |

## Claude Agents (Subagents)

Subagents are specialised Claude instances stored in \`.claude/agents/\`. Use them for complex tasks.

| Agent | Role |
|-------|------|
| \`salesforce-architect\` | Architecture, data model, deployment risk |
| \`apex-developer\` | Apex, triggers, tests, async jobs |
| \`lwc-developer\` | LWC components, JS, HTML, Apex integration |
| \`qa-tester\` | Test strategy, Apex tests, LWC Jest tests |
| \`security-reviewer\` | Security, CRUD/FLS, SOQL injection, production risk |

To use a subagent, mention it in Claude Code: _"Ask the security-reviewer agent to review this class."_

## Hooks (Placeholder)

Claude Code supports pre/post-tool hooks for automation. Examples:

- Run \`sf project deploy validate\` before any deployment command.
- Run \`npm run lint:lwc\` after LWC file edits.
- Post a Slack notification when a deploy is complete.

Hook configuration goes in \`.claude/hooks/\`. See Claude Code documentation for setup.

## Multi-Terminal Orchestration (Placeholder)

Claude Code supports running multiple agents in parallel terminals. Example setup:

- Terminal 1: Apex developer agent — builds the service class.
- Terminal 2: QA tester agent — writes the test class in parallel.
- Terminal 3: Security reviewer agent — reviews both in parallel.

This is supported in Claude Code Max plan. See Claude Code documentation for setup.

## MCP Configuration

See \`docs/mcp-usage.md\`. Save the MCP config as \`.mcp.json\` for Claude Code to use.
`,
    'docs/afv-library.md': `# Salesforce AFV Library

> Generated by AI-Kit for Salesforce.

## What is Salesforce AFV Library?

Salesforce AFV Library is Salesforce's curated collection of agent skills for building applications. It is maintained by Salesforce's engineering teams and is optimized for **Agentforce Vibes** — the AI-native development workflow for Salesforce.

Official repository: [https://github.com/forcedotcom/afv-library](https://github.com/forcedotcom/afv-library)

## Why It Matters

AFV Library provides battle-tested skill patterns for:
- Agentforce agents and topics
- Lightning app development
- Salesforce Flow
- Apex development
- SOQL queries
- Lightning Web Components
- UI bundles
- Objects and fields
- Permission sets
- And more

These skills help AI tools like Cursor and Claude Code give more accurate, Salesforce-specific guidance when working on your org.

## Relationship to Agentforce Vibes

Agentforce Vibes is Salesforce's approach to AI-native development — where AI agents assist with the full development lifecycle on Salesforce. AFV Library provides the skill layer that makes AI tools aware of Salesforce-specific patterns, APIs, and best practices.

## How It Relates to Cursor and Claude Code

AFV Library skills follow the same \`SKILL.md\`-based format used by Cursor skills. When installed, they live under \`.cursor/skills/\` and are picked up automatically by skill-aware AI tools.

## How It Differs from AI-Kit Local Templates

| | AI-Kit Local Templates | Salesforce AFV Library |
|--|------------------------|----------------------|
| Source | Bundled with AI-Kit | External — Salesforce GitHub |
| Maintenance | AI-Kit team | Salesforce engineering |
| Install | Auto-created offline | Manual install required |
| Connectivity | Works offline | Requires internet to install |
| Review needed | No — included by AI-Kit | Yes — review before installing |

## How Teams Can Optionally Install It

To install Salesforce AFV Library in your project:

\`\`\`bash
# Review the source first: https://github.com/forcedotcom/afv-library
# Then run:
npx skills add forcedotcom/afv-library
\`\`\`

Or use AI-Kit CLI (generates docs and optional setup guide only in MVP):

\`\`\`bash
ai-kit-sf add-afv-library
\`\`\`

## Security Note

> **AI-Kit for Salesforce does not automatically install external skills in the MVP.**
>
> Teams should review external skills before adding them to customer or enterprise projects.
> Pin versions where possible to avoid unexpected updates.
> Commit project-level skills to Git only after review.

## Recommended Approach

1. Start with AI-Kit local Salesforce skill templates (already installed).
2. Review AFV Library at [https://github.com/forcedotcom/afv-library](https://github.com/forcedotcom/afv-library).
3. If appropriate for your project, install with \`npx skills add forcedotcom/afv-library\`.
4. Commit the installed skills to your project repo after review.

For Agentforce projects, AFV Library is especially recommended.
`,
    'docs/skills-ecosystem.md': `# Salesforce Skills Ecosystem

> Generated by AI-Kit for Salesforce.

## Overview

AI-Kit for Salesforce supports two complementary approaches to Salesforce AI skills:

1. **SF AI Toolkit Skill Templates** — 11 architect-level skills, bundled, offline, immediate
2. **Salesforce AFV Library** — 29 Salesforce-official curated agent skills

Each serves a different need. This guide explains when to use each.

---

## 1. SF AI Toolkit Skill Templates

**What:** Local skill templates generated by SF AI Toolkit under \`.cursor/skills/\`.

**Skills included:**
- \`salesforce-apex\` — Apex coding standards: Service/Selector/Domain, bulkification, USER_MODE
- \`salesforce-lwc\` — LWC standards: wire adapters, reactivity, accessibility, SLDS2
- \`salesforce-flow\` — Flow design: triggers, bulkification, fault handling, best practices
- \`salesforce-security-review\` — Security review: CRUD/FLS, SOQL injection, permissions
- \`salesforce-agentforce\` — Agentforce: Atlas Reasoning Engine, topics, actions, testing
- \`salesforce-data-cloud\` — Data Cloud: ingestion, segmentation, activation, privacy
- \`salesforce-apex-tests\` — Test patterns: @IsTest, mocks, governors, coverage
- \`salesforce-deployment\` — Deployment safety: validate, destructive changes, rollback
- \`salesforce-pr-review\` — PR review checklist: security, coverage, API versions
- \`salesforce-commit-message\` — Conventional Commits for Salesforce DX
- \`salesforce-permissions\` — Permission sets, profiles, security model

**When to use:** Always — these are safe, bundled, and available offline.

**Install:** Auto-created by \`ai-kit-sf init\` or \`ai-kit-sf add-cursor\`.

---

## 2. Salesforce AFV Library

**What:** Salesforce's curated collection of 29 agent skills — optimized for Agentforce Vibes development.

**Repository:** [https://github.com/forcedotcom/afv-library](https://github.com/forcedotcom/afv-library)

**Skills included (29):** generating-apex, generating-apex-test, generating-flow, generating-custom-object, generating-custom-field, generating-permission-set, developing-agentforce, testing-agentforce, observing-agentforce, generating-validation-rule, generating-flexipage, generating-lightning-app, uplifting-to-slds2, switching-org, building-ui-bundle-app, building-ui-bundle-frontend, deploying-ui-bundle, using-ui-bundle-salesforce-data, creating-b2b-commerce-store, generating-custom-application, generating-custom-lightning-type, generating-custom-tab, generating-list-view, searching-media, generating-ui-bundle-features, generating-ui-bundle-metadata, generating-ui-bundle-site, implementing-agentforce-conversation-client, implementing-file-upload

**When to use:** Recommended for Agentforce and UI Bundle projects. Covers advanced Salesforce-official patterns.

**Optional install (review before running):**

\`\`\`bash
# Review source first: https://github.com/forcedotcom/afv-library
npx skills add forcedotcom/afv-library
\`\`\`

Or use AI-Kit to add bundled AFV skill templates:

\`\`\`bash
ai-kit-sf add-afv-skills
\`\`\`

See \`docs/afv-library.md\` for more details.

---

## Recommended Enterprise Approach

1. **Start with SF AI Toolkit templates** — safe, offline, immediately useful.
2. **Review AFV Library** before installing — read the source at GitHub.
3. **Pin versions** where possible to avoid unexpected updates.
4. **Commit project-level skills to Git** only after review.
5. **Avoid auto-updating skills** in sensitive customer or enterprise projects without approval.

---

## Summary Table

| | SF AI Toolkit Templates | AFV Library |
|--|--|--|
| Source | Bundled with AI-Kit | Salesforce GitHub |
| Skills | 11 architect-level | 29 official |
| Offline | Yes | No (install required) |
| Auto-install | Yes | Optional |
| Agentforce focus | Partial | Strong |
| Enterprise review | Not needed | Recommended |
| Install | \`ai-kit-sf init\` | \`npx skills add forcedotcom/afv-library\` |
`,
    // ─── Task management ─────────────────────────────────────────────────────────
    'tasks/todo.md': `# Task Tracker

> This file is managed by Claude Code following the workflow standards in CLAUDE.md.
> Use it to plan, track, and review work on this Salesforce DX project.

<!-- SF-AI-TOOLKIT:START -->

## How to use this file

Before any non-trivial task, write a plan here using checkable items:

\`\`\`markdown
## Task: <short title>

- [ ] Step one
- [ ] Step two
- [ ] Run tests
- [ ] Document results
\`\`\`

As work progresses, mark items complete. At the end of each task, add a Review section:

\`\`\`markdown
## Review

- **Summary:** What was done
- **Files changed:** list
- **Tests run:** commands and results
- **Verification:** what was confirmed
- **Known risks:** anything to watch
- **Follow-up:** remaining items
\`\`\`

<!-- SF-AI-TOOLKIT:END -->
`,
    'tasks/lessons.md': `# Lessons Learned

> Claude Code updates this file after any correction or failed approach.
> Review relevant lessons at the start of each new task.

<!-- SF-AI-TOOLKIT:START -->

## How to use this file

After any correction from the user or failed approach, Claude should add an entry:

\`\`\`markdown
## Lesson: <short title>

- **What went wrong:** description
- **Root cause:** why it happened
- **New rule:** how to prevent it
- **Example:** (optional)
\`\`\`

Keep lessons practical, specific, and project-relevant.
Ruthlessly iterate — if a mistake repeats, strengthen the rule.

---

## Lesson: Do not overwrite existing project files

- **What went wrong:** AI-Kit generated files replaced developer customisations.
- **Root cause:** Wrote to file without checking if it already existed.
- **New rule:** Always check for existing files before writing. Use safe merge mode with marker blocks. Create backups before modification.

<!-- SF-AI-TOOLKIT:END -->
`,
    // ─── Cursor project rule ──────────────────────────────────────────────────
    '.cursor/rules/project.mdc': `---
description: Project-wide workflow orchestration rules for Cursor. Mirrors CLAUDE.md. Applies to all files in this Salesforce DX project.
globs: ["**/*"]
alwaysApply: true
---

# Project Workflow Rules

> This is the Cursor equivalent of CLAUDE.md.
> AGENTS.md = shared project briefing for all AI tools.
> CLAUDE.md = Claude Code workflow rules.
> This file = Cursor workflow rules.

---

## 1. Plan Mode Default

For any non-trivial task, plan before you implement.

Use a plan when:
- The task has 3 or more steps
- The task involves architectural decisions
- The task affects multiple files
- The task changes deployment behaviour
- The task changes security, permissions, data access, or Salesforce metadata
- The task requires verification or testing

Rules:
- Write a clear plan before writing code.
- Write specs upfront to reduce ambiguity.
- If something goes sideways, stop and re-plan.
- Do not keep pushing through a broken approach.
- For simple fixes, keep the plan short.

## 2. Task Management

Write plans and progress to \`tasks/todo.md\`.

Use checkable items:

\`\`\`markdown
- [ ] Step one
- [ ] Step two
- [ ] Run tests
- [ ] Document results
\`\`\`

Add a review section when the task is done:

\`\`\`markdown
## Review
- Summary, files changed, tests run, risks, follow-ups
\`\`\`

## 3. Capture Lessons

After any correction or failed approach, update \`tasks/lessons.md\`.

Include:
- What went wrong
- Root cause
- New rule to prevent it

## 4. Verification Before Done

Never mark a task complete without proving it works.

- Run relevant tests where possible.
- Run lint or formatting checks where relevant.
- Check logs when debugging.
- Demonstrate correctness with evidence.
- If tests cannot be run, explain why and give the command.

Before finishing, include:
- What changed
- What was verified
- What tests or commands were run
- Any remaining risks or manual steps

## 5. Demand Elegance, But Stay Practical

For non-trivial changes, ask: "Is there a more elegant way?"

- If a fix feels hacky, rethink it.
- Prefer clean, simple, maintainable solutions.
- Avoid over-engineering simple fixes.
- Use the smallest change that solves the root cause properly.

Guiding question: "Knowing everything I know now, what is the cleanest implementation?"

## 6. Autonomous Bug Fixing

When given a bug report:
- Do not ask for hand-holding.
- Inspect logs, errors, failing tests, and relevant files.
- Identify the root cause.
- Implement the fix.
- Verify the fix.
- Explain the result clearly.

---

## Salesforce DX Rules

- Use \`sf\` CLI (not deprecated \`sfdx\`) unless required.
- Read existing files before making changes.
- Bulkify all Apex: no SOQL or DML inside loops.
- Use \`with sharing\` by default.
- Avoid hardcoded IDs. Use Custom Metadata for configurable values.
- Enforce CRUD/FLS where needed.
- Use Named Credentials for callouts.
- Prefer Permission Sets over Profiles.

## MCP Rules

- Prefer Salesforce DX MCP for all org operations.
- Confirm org alias before any write operation.
- Use read-only mode for production orgs.
- Ask before any destructive or data-mutating operation.

## Security Rules

- Never expose secrets, tokens, session IDs, JWTs, or private keys.
- Never log or paste sensitive customer data.
- Do not run anonymous Apex that mutates data without explicit approval.
- Do not make production changes without human confirmation.
- Do not store credentials or create auth files.

## Minimal Impact

- Touch the minimum amount of code.
- Avoid unrelated refactors or formatting changes.
- Preserve existing project conventions and structure.
- Avoid introducing bugs through broad changes.

---

## Definition of Done

A task is only done when:
- [ ] The planned work is complete
- [ ] Relevant files are updated
- [ ] Tests or validation commands were run where possible
- [ ] Results are documented in \`tasks/todo.md\`
- [ ] \`tasks/lessons.md\` is updated if any correction occurred
- [ ] No credentials or secrets are exposed
- [ ] Security reviewed where relevant
`,
    'AI_INSTRUCTIONS.md': `# AI_INSTRUCTIONS.md

Canonical cross-tool AI policy file for this repository.

This file is intended for any AI coding assistant, including Cursor, Claude Code,
Codex CLI, Antigravity, and other MCP-capable agents.

## Core Principles

1. Keep changes minimal and reversible.
2. Never overwrite existing files without explicit approval.
3. Never expose secrets or credentials in code, docs, commits, or logs.
4. Validate before done (tests/build/lint where relevant).
5. Confirm target org and environment before deploy-related actions.

## Salesforce Safety Rules

- Use \`sf\` CLI (not deprecated \`sfdx\`) when possible.
- No SOQL or DML inside loops.
- Use \`with sharing\` unless an exception is documented.
- Enforce CRUD/FLS for user-context data access.
- Prefer Permission Sets over Profiles.
- Never run destructive changes on production without explicit confirmation.

## MCP Usage Rules

- Prefer MCP for org reads and metadata inspection.
- Treat production orgs as read-only by default.
- Ask before any data mutation, deployment, or destructive operation.

## Output Quality Rules

- Explain what changed and why.
- Call out any residual risks.
- Include verification evidence (commands/tests run).
- If verification is skipped, explicitly state why and what should be run.
`,
    'docs/codex-setup.md': `# Codex Setup for Salesforce DX

This project supports Codex-style agents by using shared repository instructions
and Salesforce-specific guardrails.

## Recommended Files

- \`AI_INSTRUCTIONS.md\` (cross-tool canonical policy)
- \`AGENTS.md\` (project workflow and org safety context)
- \`docs/mcp-usage.md\` (MCP configuration and usage model)
- \`.cursor/rules/\` and \`.cursor/skills/\` (reusable Salesforce constraints)

## Usage Pattern

1. Start with a scan/assessment task.
2. Confirm target org alias before any deploy or mutation task.
3. Use MCP for org operations whenever possible.
4. Require tests/validation before completion.

## Safety Checklist

- [ ] No secrets exposed
- [ ] No destructive change without explicit approval
- [ ] No production deploy without confirmation
- [ ] Apex/LWC standards respected
`,
    'docs/antigravity-setup.md': `# Antigravity Setup for Salesforce DX

This project is compatible with Antigravity-style agent workflows through
shared AI policy files and MCP-first Salesforce operations.

## Recommended Integration

- Load \`AI_INSTRUCTIONS.md\` as the primary instruction file.
- Load \`AGENTS.md\` for project and workflow context.
- Follow \`docs/mcp-usage.md\` for safe org interaction patterns.

## Operational Guardrails

- Confirm org alias before metadata or data operations.
- Treat production as read-only unless explicitly approved.
- Prefer non-destructive previews before deploy commands.
- Keep changes minimal and provide verification evidence.

## Team Standardization

Use drift checks to keep local AI setup aligned with team expectations and
reduce variation in AI-generated code quality.
`,
    'sf-ai-toolkit.config.json': `{
  "quality": {
    "pmd": {
      "enabled": false,
      "runCommand": "pmd check -d \\"force-app/main/default/classes,force-app/main/default/triggers\\" -R category/apex/bestpractices.xml"
    }
  },
  "git": {
    "commitMessage": {
      "enabled": true,
      "pattern": "^(feat|fix|docs|chore|refactor|test|perf)(\\\\([a-z0-9_-]+\\\\))?: .{1,72}$",
      "helpText": "Use Conventional Commit format, e.g. feat(apex): add account service validation"
    }
  }
}
`,
    '.githooks/pre-commit': `#!/usr/bin/env sh
set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CONFIG_PATH="$REPO_ROOT/sf-ai-toolkit.config.json"

if [ ! -f "$CONFIG_PATH" ]; then
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  PMD_ENABLED="$(node -e "const fs=require('fs');const p=process.argv[1];const c=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(String(Boolean(c.quality?.pmd?.enabled)));\" \"$CONFIG_PATH\" 2>/dev/null || echo false)"
  PMD_COMMAND="$(node -e "const fs=require('fs');const p=process.argv[1];const c=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(String(c.quality?.pmd?.runCommand||''));\" \"$CONFIG_PATH\" 2>/dev/null || true)"
else
  PMD_ENABLED="false"
  PMD_COMMAND=""
fi

if [ "$PMD_ENABLED" = "true" ] && [ -n "$PMD_COMMAND" ]; then
  echo "[sf-ai-toolkit] Running PMD check..."
  sh -c "$PMD_COMMAND"
fi

exit 0
`,
    '.githooks/commit-msg': `#!/usr/bin/env sh
set -eu

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CONFIG_PATH="$REPO_ROOT/sf-ai-toolkit.config.json"
MSG_FILE="$1"

if [ ! -f "$CONFIG_PATH" ]; then
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  exit 0
fi

node - "$CONFIG_PATH" "$MSG_FILE" <<'NODE'
const fs = require('fs');
const [, , configPath, msgPath] = process.argv;
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const enabled = Boolean(cfg.git?.commitMessage?.enabled);
if (!enabled) process.exit(0);
const pattern = String(cfg.git?.commitMessage?.pattern || '');
if (!pattern) process.exit(0);
const help = String(cfg.git?.commitMessage?.helpText || 'Commit message does not match configured pattern.');
const msg = fs.readFileSync(msgPath, 'utf8').trim();
let re;
try {
  re = new RegExp(pattern);
} catch {
  process.stderr.write('[sf-ai-toolkit] Invalid commit message regex in sf-ai-toolkit.config.json\\n');
  process.exit(1);
}
if (!re.test(msg)) {
  process.stderr.write('[sf-ai-toolkit] Commit message policy failed.\\n');
  process.stderr.write(\`\${help}\\n\`);
  process.stderr.write(\`Message: "\${msg}"\\n\`);
  process.exit(1);
}
NODE

exit 0
`,
    // ─── Windsurf ─────────────────────────────────────────────────────────────
    '.windsurfrules': `# Windsurf Rules for Salesforce DX

> Generated by SF AI Toolkit. Read AI_INSTRUCTIONS.md for the canonical cross-tool AI policy.

You are working on a Salesforce DX project. Follow these rules strictly.

## Identity

You are a senior Salesforce developer assistant. You understand Apex, LWC, Salesforce Flow, MCP-based org operations, and Salesforce security models.

## Safety First

- NEVER deploy to production without explicit user confirmation.
- NEVER run destructive operations (delete fields, objects, components) without a preview and approval.
- NEVER expose secrets, credentials, or org usernames in generated content.
- Treat production orgs as read-only unless the user explicitly requests a production change.
- Always confirm the target org alias before any sf deploy or sf apex run command.

## Salesforce Development Standards

### Apex
- Use Service/Selector/Domain pattern for business logic separation.
- All DML and SOQL must be bulkified (no DML/SOQL inside loops).
- Enforce CRUD/FLS with \`WITH USER_MODE\` on all SOQL queries.
- Minimum 85% test coverage. Use @IsTest with realistic data, not mocked shortcuts.
- Never use \`SeeAllData=true\` in test classes.

### Lightning Web Components (LWC)
- Follow SLDS 2 design tokens and accessibility standards.
- Use \`@wire\` for read operations, \`@AuraEnabled(cacheable=true)\` for Apex wire methods.
- Handle loading, error, and empty states explicitly.
- LWC naming: camelCase for JS, kebab-case for HTML references.

### Salesforce Flow
- Prefer Flow for declarative automation. Use Apex only when Flow can't meet requirements.
- Bulkify all Flow loops — use collections, not record-by-record operations.
- Always add fault paths on every DML element.
- Document Flow with a Description on every element.

## MCP Usage

When MCP tools are available, prefer them over CLI commands for org operations:
- Use MCP for SOQL queries, metadata describe, and running Apex.
- Use CLI (\`sf\`) for deploy/validate, test runs, and org management.

See \`docs/mcp-usage.md\` for full MCP setup and usage guide.

## Skills

Skill templates are in \`.cursor/skills/\`. Reference them for domain-specific guidance:
- \`salesforce-apex\` — Apex patterns and governor limit guidance
- \`salesforce-lwc\` — LWC standards and SLDS 2
- \`salesforce-agentforce\` — Agentforce and Atlas Reasoning Engine
- \`salesforce-security-review\` — Security and permissions checklist

## Task Workflow

1. Read \`tasks/todo.md\` before starting work.
2. Confirm the org alias before any deployment.
3. Validate first (\`sf project deploy validate\`) before a real deploy.
4. Update \`tasks/todo.md\` and \`tasks/lessons.md\` after completing work.
`,
    // ─── GitHub Copilot ───────────────────────────────────────────────────────
    '.github/copilot-instructions.md': `# GitHub Copilot Instructions for Salesforce DX

> Generated by SF AI Toolkit. See AI_INSTRUCTIONS.md for the full cross-tool AI policy.

You are working on a Salesforce DX project. Follow these instructions for all Copilot suggestions in this repository.

## Salesforce Development Standards

### Apex
- Apply Service/Selector/Domain layered architecture. Services own business logic; Selectors own SOQL; Domains own DML trigger patterns.
- All SOQL and DML must be outside loops (bulkification is mandatory).
- Use \`WITH USER_MODE\` on all SOQL queries to enforce CRUD/FLS automatically.
- Write @IsTest classes with \`@TestSetup\`, realistic test data, and no SeeAllData=true.
- Minimum 85% test coverage. Cover both happy path and edge cases (empty collections, large datasets, exception handling).

### Lightning Web Components (LWC)
- Use \`@wire\` adapters for Salesforce data access.
- Mark \`@AuraEnabled\` methods as \`cacheable=true\` for wire methods; use non-cacheable for mutations.
- Apply SLDS 2 design tokens. Do not hardcode colors or spacing.
- Handle loading, error, and empty states in every component.

### Salesforce Flow
- Use Flow for declarative automation. Escalate to Apex only when Flow is insufficient.
- All Flow loops must use collections to avoid record-by-record DML.
- Add a Fault element after every DML operation.

## Safety Guidelines

- Do not suggest deploying to production without a validate-first step.
- Do not suggest destructive metadata changes without showing a preview.
- Do not generate code that stores credentials, tokens, or PII in Apex variables or debug logs.
- Always include null-checks and empty-list guards in Apex collections.

## Code Quality

- Follow Apex naming conventions: \`PascalCase\` for classes, \`camelCase\` for methods/variables.
- LWC file names: camelCase for JS, kebab-case as HTML component tag names.
- No inline SOQL or DML in for-loops, triggers without handler classes, or \`System.debug\` with sensitive data.

## MCP and Org Operations

- Prefer Salesforce MCP tools for SOQL and metadata operations when available.
- Use \`sf project deploy validate\` before \`sf project deploy start\`.
- See \`docs/mcp-usage.md\` for org-safe MCP configuration.
`,
    // ─── Agentforce Vibes ─────────────────────────────────────────────────────
    'docs/agentforce-vibes-setup.md': `# Agentforce Vibes Setup

> Generated by SF AI Toolkit.

Agentforce Vibes is Salesforce's AI-native development workflow where AI agents assist with the full development lifecycle — from writing Apex and LWC to deploying metadata and running tests.

## What Is Agentforce Vibes?

Agentforce Vibes combines:
- **Salesforce AFV Library** — Salesforce-official curated skill templates for AI tools
- **Cursor/Claude Code/Windsurf** — AI-native IDEs that load and apply skills
- **MCP (Salesforce DX)** — model context protocol for safe org interaction
- **agentskills.io specification** — standardized SKILL.md format for reusable AI skills

This project is pre-configured for Agentforce Vibes workflows.

## What SF AI Toolkit Sets Up

| Component | Where | Purpose |
|-----------|-------|---------|
| 11 architect skills | \`.cursor/skills/salesforce-*\` | Senior-level Salesforce guidance |
| 29 AFV skills | \`.cursor/skills/afv-*\` | Official Salesforce patterns |
| Cursor rules | \`.cursor/rules/\` | Workflow enforcement |
| Claude agents | \`.claude/agents/\` | Specialized sub-agents |
| Windsurf rules | \`.windsurfrules\` | Windsurf-native guardrails |
| Copilot instructions | \`.github/copilot-instructions.md\` | GitHub Copilot guidance |
| MCP config | \`.mcp.json\` / \`.cursor/mcp.json\` | Org-safe tool calls |

## AFV Library Skills (Official Salesforce)

Install the full AFV Library alongside SF AI Toolkit templates:

\`\`\`bash
# Review first: https://github.com/forcedotcom/afv-library
npx skills add forcedotcom/afv-library
\`\`\`

Or use the bundled AFV-compatible templates already installed by SF AI Toolkit.

## Recommended AI Tool Stack

| AI Tool | Config File | Notes |
|---------|-------------|-------|
| Cursor | \`.cursor/rules/\` + \`.cursor/skills/\` | Primary IDE for Agentforce Vibes |
| Claude Code | \`CLAUDE.md\` + \`.claude/\` | Agent orchestration and sub-agents |
| Windsurf | \`.windsurfrules\` | Rule-file native support |
| GitHub Copilot | \`.github/copilot-instructions.md\` | Repo-level instructions |
| VS Code (extension) | via SF AI Toolkit extension | Readiness scan and commands |
| Any MCP-capable tool | \`.mcp.json\` | Standardized org access |

## Agentforce Development with AFV Skills

For building Agentforce agents and topics, use the skill references:

- \`@afv-developing-agentforce\` — Topic and action design, Atlas Reasoning Engine
- \`@afv-testing-agentforce\` — Agentforce testing strategy
- \`@afv-observing-agentforce\` — Monitoring and debugging agents
- \`@salesforce-agentforce\` — Invocable actions and agent integration

## Getting Started

1. Run \`ai-kit-sf scan\` to check your project readiness.
2. Run \`ai-kit-sf init\` to apply the full setup.
3. Run \`ai-kit-sf bootstrap-mcp\` to configure your org MCP connection.
4. Reference skills in Cursor/Claude by typing \`@skill-name\` in the chat.
`,
};
function getTemplate(key) {
    const tpl = exports.TEMPLATES[key];
    if (!tpl)
        throw new Error(`Template not found: ${key}`);
    return tpl;
}
function hasTemplate(key) {
    return key in exports.TEMPLATES;
}
/** Returns template content wrapped in AI-KIT marker block */
function wrapInMarker(content) {
    return `${exports.MARKER_START}\n${content}\n${exports.MARKER_END}\n`;
}
//# sourceMappingURL=templates.js.map

/***/ }),

/***/ 5117:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
//# sourceMappingURL=types.js.map

/***/ }),

/***/ 361:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__nccwpck_require__(5325));
const path = __importStar(__nccwpck_require__(6928));
const core_1 = __nccwpck_require__(6808);
const fs = __importStar(__nccwpck_require__(1348));
const diagnostics_provider_1 = __nccwpck_require__(4379);
const hover_provider_1 = __nccwpck_require__(2949);
const team_sync_provider_1 = __nccwpck_require__(4242);
const status_bar_provider_1 = __nccwpck_require__(2685);
// ─── State ───────────────────────────────────────────────────────────────────
let statusBarProvider;
let diagnosticsProvider;
// ─── Activate ────────────────────────────────────────────────────────────────
function activate(context) {
    // Status bar — managed by StatusBarProvider
    statusBarProvider = status_bar_provider_1.StatusBarProvider.create(context);
    // Inline diagnostics — managed by DiagnosticsProvider
    diagnosticsProvider = diagnostics_provider_1.DiagnosticsProvider.create(context);
    // Hover provider — shows rule explanations on hover
    // We need access to the internal collection; create a shared one
    const sharedDiagCollection = vscode.languages.createDiagnosticCollection('sf-ai-toolkit-hover');
    context.subscriptions.push(sharedDiagCollection);
    (0, hover_provider_1.registerHoverProvider)(context, sharedDiagCollection);
    // Team sync — auto-checks on startup
    const teamSyncProvider = team_sync_provider_1.TeamSyncProvider.create(context);
    const rootPath = getRootPath();
    if (rootPath) {
        // Run in background — don't await
        void teamSyncProvider.checkOnStartup(rootPath);
    }
    // Register all commands
    context.subscriptions.push(vscode.commands.registerCommand('ai-kit-sf.scan', () => cmdScan()), vscode.commands.registerCommand('ai-kit-sf.init', () => cmdInit()), vscode.commands.registerCommand('ai-kit-sf.openReport', () => cmdScan()), vscode.commands.registerCommand('ai-kit-sf.addCursor', () => cmdAddFiles('cursor')), vscode.commands.registerCommand('ai-kit-sf.addCursorSkills', () => cmdAddFiles('cursor-skills')), vscode.commands.registerCommand('ai-kit-sf.addClaude', () => cmdAddFiles('claude')), vscode.commands.registerCommand('ai-kit-sf.addMcp', () => cmdAddFiles('mcp')), vscode.commands.registerCommand('ai-kit-sf.addHooks', () => cmdAddHooks()), vscode.commands.registerCommand('ai-kit-sf.addAfvSkills', () => cmdAddFiles('afv-skills')), vscode.commands.registerCommand('ai-kit-sf.addAfvLibrary', () => cmdAddFiles('afv-library')), vscode.commands.registerCommand('ai-kit-sf.bootstrapMcp', () => cmdBootstrapMcp()), vscode.commands.registerCommand('ai-kit-sf.checkDrift', () => cmdCheckDrift()), vscode.commands.registerCommand('ai-kit-sf.addClaudeMem', () => cmdAddClaudeMem()), vscode.commands.registerCommand('ai-kit-sf.pickSkill', () => cmdPickSkill()), vscode.commands.registerCommand('ai-kit-sf.checkTeamSync', () => cmdCheckTeamSync()));
    // File watcher — refresh status bar when AI setup files change
    const watcher = vscode.workspace.createFileSystemWatcher('**/{CLAUDE.md,AGENTS.md,.cursor/rules/**,.claude/**,tasks/**}');
    watcher.onDidCreate(() => statusBarProvider.scheduleRefresh());
    watcher.onDidDelete(() => statusBarProvider.scheduleRefresh());
    watcher.onDidChange(() => statusBarProvider.scheduleRefresh());
    context.subscriptions.push(watcher);
    // Initial status bar scan
    statusBarProvider.scheduleRefresh(500);
}
function deactivate() {
    diagnosticsProvider?.dispose();
}
// ─── Commands ─────────────────────────────────────────────────────────────────
function getRootPath() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return undefined;
    return folders[0].uri.fsPath;
}
function requireTrustedWorkspace() {
    if (vscode.workspace.isTrusted)
        return true;
    void vscode.window.showWarningMessage('AI-Kit: This command requires a trusted workspace.');
    return false;
}
function isAllowedTeamConfigUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        return parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function renderList(items) {
    return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}
async function cmdScan() {
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Scanning project...' }, async () => {
        const [result, orgCtx, drift] = await Promise.all([
            (0, core_1.scanProject)(rootPath),
            (0, core_1.readOrgContext)(rootPath),
            (0, core_1.detectDrift)(rootPath),
        ]);
        const report = (0, core_1.generateReadinessReport)(result);
        const panel = vscode.window.createWebviewPanel('ai-kit-report', 'AI-Kit Readiness Report', vscode.ViewColumn.One, { enableScripts: false });
        panel.webview.html = buildReportHtml(result, report, orgCtx, drift);
        // Refresh status bar
        statusBarProvider.scheduleRefresh(100);
    });
}
async function cmdInit() {
    if (!requireTrustedWorkspace())
        return;
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    // Show org context in the preset picker header
    const orgCtx = await (0, core_1.readOrgContext)(rootPath);
    const orgInfo = orgCtx.source !== 'none' ? ` (org: ${orgCtx.defaultOrg})` : '';
    const presetItems = [
        { label: 'core', description: `Standard Salesforce DX project${orgInfo}`, value: 'core' },
        { label: 'lwc', description: 'Adds extra LWC rules and skills', value: 'lwc' },
        { label: 'agentforce', description: 'Adds Agentforce / AFV Library support', value: 'agentforce' },
        { label: 'data-cloud', description: 'Adds Data Cloud docs and rules', value: 'data-cloud' },
        { label: 'experience-cloud', description: 'Adds Experience Cloud rules', value: 'experience-cloud' },
    ];
    const selected = await vscode.window.showQuickPick(presetItems, {
        placeHolder: 'Select a setup preset',
    });
    if (!selected)
        return;
    const preset = selected.value;
    const plan = await (0, core_1.planSetup)(rootPath, { preset, dryRun: false });
    const toCreate = plan.files.filter((f) => f.action === 'create');
    const confirmed = await vscode.window.showInformationMessage(`AI-Kit will create ${toCreate.length} file(s)${orgInfo}. Existing files will NOT be overwritten.`, { modal: true }, 'Apply Setup', 'Cancel');
    if (confirmed !== 'Apply Setup')
        return;
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Applying setup...' }, async () => {
        const result = await (0, core_1.applySetup)(rootPath, plan);
        statusBarProvider.scheduleRefresh(500);
        vscode.window.showInformationMessage(`AI-Kit setup complete! ${result.filesCreated.length} created, ${result.filesSkipped.length} skipped.`, 'Open AGENTS.md').then(async (action) => {
            if (action === 'Open AGENTS.md') {
                try {
                    const doc = await vscode.workspace.openTextDocument(path.join(rootPath, 'AGENTS.md'));
                    await vscode.window.showTextDocument(doc);
                }
                catch { /* already existed and was skipped */ }
            }
        });
    });
}
async function cmdBootstrapMcp() {
    if (!requireTrustedWorkspace())
        return;
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    const orgCtx = await (0, core_1.readOrgContext)(rootPath);
    const orgAlias = await vscode.window.showInputBox({
        prompt: 'Enter your Salesforce org alias',
        value: orgCtx.defaultOrg ?? '',
        placeHolder: 'e.g. my-sandbox',
        validateInput: (v) => (v.trim().length === 0 ? 'Org alias is required' : undefined),
    });
    if (!orgAlias)
        return;
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Configuring MCP...' }, async () => {
        const result = await (0, core_1.bootstrapMcp)(rootPath, { orgAlias });
        const msgs = [];
        if (!result.alreadyExisted.cursor)
            msgs.push('.cursor/mcp.json created');
        else
            msgs.push('.cursor/mcp.json already existed (skipped)');
        if (!result.alreadyExisted.claude)
            msgs.push('.mcp.json created');
        else
            msgs.push('.mcp.json already existed (skipped)');
        const validation = await (0, core_1.validateMcpConfig)(result.cursorConfigPath);
        const validMsg = validation.valid ? 'Config is valid.' : `Warning: ${validation.issues[0]}`;
        vscode.window.showInformationMessage(`${msgs.join(' | ')} — ${validMsg} Org: ${orgAlias}. Restart to activate.`, 'Open .cursor/mcp.json').then(async (action) => {
            if (action === 'Open .cursor/mcp.json') {
                try {
                    const doc = await vscode.workspace.openTextDocument(result.cursorConfigPath);
                    await vscode.window.showTextDocument(doc);
                }
                catch { /* */ }
            }
        });
    });
}
async function cmdCheckDrift() {
    if (!requireTrustedWorkspace())
        return;
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Checking drift...' }, async () => {
        const drift = await (0, core_1.detectDrift)(rootPath);
        const panel = vscode.window.createWebviewPanel('ai-kit-drift', 'AI-Kit Drift Report', vscode.ViewColumn.One, { enableScripts: false });
        panel.webview.html = buildDriftHtml(drift);
    });
}
async function cmdAddClaudeMem() {
    if (!requireTrustedWorkspace())
        return;
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    const docsDir = path.join(rootPath, 'docs', 'claude-mem');
    const outputPath = path.join(docsDir, 'salesforce-dx.json');
    await fs.ensureDir(docsDir);
    if (await fs.pathExists(outputPath)) {
        vscode.window.showInformationMessage('AI-Kit: salesforce-dx.json already exists.', 'Open File').then(async (a) => {
            if (a === 'Open File') {
                const doc = await vscode.workspace.openTextDocument(outputPath);
                await vscode.window.showTextDocument(doc);
            }
        });
        return;
    }
    await fs.writeFile(outputPath, (0, core_1.generateClaudeMemModeJson)(), 'utf8');
    vscode.window.showInformationMessage('AI-Kit: claude-mem salesforce-dx mode created at docs/claude-mem/salesforce-dx.json.', 'Open File').then(async (a) => {
        if (a === 'Open File') {
            const doc = await vscode.workspace.openTextDocument(outputPath);
            await vscode.window.showTextDocument(doc);
        }
    });
}
async function cmdPickSkill() {
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    const skills = await (0, core_1.listInstalledSkills)(rootPath);
    if (skills.length === 0) {
        vscode.window.showWarningMessage('No Cursor skills found. Run AI-Kit: Add Cursor Skills first.');
        return;
    }
    const items = skills.map((s) => ({
        label: `@${s.name}`,
        description: '(project skill)',
        detail: s.description,
        skillName: s.name,
    }));
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a skill to insert its @mention',
        matchOnDescription: true,
        matchOnDetail: true,
    });
    if (!selected)
        return;
    const mention = `@${selected.skillName}`;
    await vscode.env.clipboard.writeText(mention);
    vscode.window.showInformationMessage(`Copied to clipboard: ${mention}`, 'Paste in Chat');
}
async function cmdCheckTeamSync() {
    if (!requireTrustedWorkspace())
        return;
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    const url = await vscode.window.showInputBox({
        prompt: 'Enter the URL of your team AI-Kit config JSON',
        placeHolder: 'https://raw.githubusercontent.com/your-org/your-repo/main/ai-kit-team.json',
    });
    if (!url)
        return;
    if (!isAllowedTeamConfigUrl(url.trim())) {
        vscode.window.showErrorMessage('AI-Kit: Team config URL must be a valid https URL.');
        return;
    }
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Checking team sync...' }, async () => {
        const { fetchTeamConfig } = await Promise.resolve().then(() => __importStar(__nccwpck_require__(6808)));
        const cfg = await fetchTeamConfig(url);
        if (!cfg) {
            vscode.window.showErrorMessage('AI-Kit: Could not fetch team config. Check the URL.');
            return;
        }
        const result = await (0, core_1.checkTeamSync)(rootPath, cfg);
        const panel = vscode.window.createWebviewPanel('ai-kit-team-sync', 'AI-Kit Team Sync', vscode.ViewColumn.One, { enableScripts: false });
        panel.webview.html = buildTeamSyncHtml(result);
    });
}
async function cmdAddHooks() {
    if (!requireTrustedWorkspace())
        return;
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    const hookPaths = ['sf-ai-toolkit.config.json', '.githooks/pre-commit', '.githooks/commit-msg'];
    const files = await Promise.all(hookPaths.map(async (relativePath) => {
        const fullPath = path.join(rootPath, relativePath);
        const fileExists = await fs.pathExists(fullPath);
        return {
            relativePath,
            action: (fileExists ? 'skip' : 'create'),
            reason: fileExists ? 'File already exists — will not overwrite' : 'Will be created from template',
            templateKey: relativePath,
        };
    }));
    const hooksPlan = {
        rootPath,
        preset: 'core',
        dryRun: false,
        files,
        packageJsonScripts: {},
        forceIgnoreLines: [],
    };
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'AI-Kit: Adding Git hooks...' }, async () => {
        const result = await (0, core_1.applySetup)(rootPath, hooksPlan);
        for (const hookPath of ['.githooks/pre-commit', '.githooks/commit-msg']) {
            const fullPath = path.join(rootPath, hookPath);
            if (await fs.pathExists(fullPath)) {
                await fs.chmod(fullPath, 0o755);
            }
        }
        vscode.window.showInformationMessage(`AI-Kit: ${result.filesCreated.length} hook/config file(s) created, ${result.filesSkipped.length} skipped. Run: git config core.hooksPath .githooks`);
    });
}
async function cmdAddFiles(type) {
    if (!requireTrustedWorkspace())
        return;
    const rootPath = getRootPath();
    if (!rootPath) {
        vscode.window.showErrorMessage('AI-Kit: No workspace folder open.');
        return;
    }
    const fileMap = {
        cursor: ['.cursor/rules/project.mdc', '.cursor/rules/salesforce-mcp.mdc', '.cursor/rules/apex.mdc', '.cursor/rules/lwc.mdc', '.cursor/rules/deployment.mdc', '.cursor/rules/safety.mdc'],
        'cursor-skills': ['docs/afv-library.md', 'docs/skills-ecosystem.md'],
        claude: ['AGENTS.md', 'CLAUDE.md', 'tasks/todo.md', 'tasks/lessons.md', '.claude/commands/review-security.md', '.claude/commands/validate-deploy.md', '.claude/commands/write-tests.md', '.claude/commands/create-apex.md', '.claude/commands/create-lwc.md', '.claude/commands/prepare-pr.md', '.claude/agents/salesforce-architect.md', '.claude/agents/apex-developer.md', '.claude/agents/lwc-developer.md', '.claude/agents/qa-tester.md', '.claude/agents/security-reviewer.md'],
        mcp: ['docs/mcp-usage.md', '.cursor/rules/salesforce-mcp.mdc'],
        'afv-skills': ['docs/afv-library.md', 'docs/skills-ecosystem.md'],
        'afv-library': ['docs/afv-library.md', 'docs/skills-ecosystem.md'],
    };
    const targetFiles = fileMap[type] ?? [];
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `AI-Kit: Adding ${type}...` }, async () => {
        const plan = await (0, core_1.planSetup)(rootPath, { preset: 'core', dryRun: false });
        const filteredFiles = plan.files.filter((f) => {
            if (type === 'cursor-skills' || type === 'afv-skills') {
                return f.relativePath.startsWith('.cursor/skills/') || targetFiles.includes(f.relativePath);
            }
            return targetFiles.includes(f.relativePath);
        });
        const filteredPlan = { ...plan, files: filteredFiles, packageJsonScripts: {}, forceIgnoreLines: [] };
        const result = await (0, core_1.applySetup)(rootPath, filteredPlan);
        statusBarProvider.scheduleRefresh(500);
        vscode.window.showInformationMessage(`AI-Kit: ${result.filesCreated.length} file(s) created, ${result.filesSkipped.length} skipped.`);
    });
}
// ─── Webview HTML builders ────────────────────────────────────────────────────
function buildReportHtml(result, report, orgCtx, drift) {
    const score = result.score;
    const scoreColor = score >= 80 ? '#4caf50' : score >= 50 ? '#ff9800' : '#f44336';
    const orgBanner = orgCtx.source !== 'none'
        ? `<div class="org-banner">Working against org: <strong>${escapeHtml(orgCtx.defaultOrg ?? 'unknown')}</strong> <span class="dim">(${escapeHtml(orgCtx.source)})</span></div>`
        : '<div class="org-banner warn">No org context detected — run ai-kit-sf bootstrap-mcp</div>';
    const driftSection = drift.drifted.length > 0
        ? `<div class="section"><h2>⚠ Drift Detected</h2><ul>${drift.drifted.map((d) => `<li><strong>${escapeHtml(d.relativePath)}</strong> — ${escapeHtml(d.reason)}<br><small>${d.missingSignals.map(escapeHtml).join(', ')}</small></li>`).join('')}</ul></div>`
        : `<div class="section"><p style="color:#4caf50">✓ No template drift detected.</p></div>`;
    const escaped = report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
  body{font-family:var(--vscode-font-family,system-ui);padding:20px;color:var(--vscode-foreground);max-width:800px}
  h1{margin-bottom:4px} h2{border-bottom:1px solid #444;padding-bottom:4px;margin-top:24px}
  .score{font-size:2.4em;font-weight:bold;color:${scoreColor}}
  .org-banner{background:#1e3a5f;border-left:4px solid #4fc3f7;padding:8px 12px;margin:12px 0;border-radius:2px}
  .org-banner.warn{background:#3a2a00;border-color:#ff9800}
  .dim{opacity:.6;font-size:.85em} ul{padding-left:20px} li{margin:4px 0}
  .section{margin-top:20px}
  pre{background:var(--vscode-editor-background);padding:16px;border-radius:4px;white-space:pre-wrap;font-size:13px}
</style></head><body>
<h1>AI-Kit for Salesforce</h1>
${orgBanner}
<p style="margin:4px 0;opacity:.7">AI Readiness Score</p>
<div class="score">${score}/100</div>
${result.missing.length > 0 ? `<div class="section"><h2>Missing</h2><ul>${renderList(result.missing)}</ul></div>` : '<p style="color:#4caf50;margin-top:12px">✓ No missing items!</p>'}
${result.recommendations.length > 0 ? `<div class="section"><h2>Recommendations</h2><ul>${renderList(result.recommendations)}</ul></div>` : ''}
${driftSection}
<div class="section"><h2>Full Report</h2><pre>${escaped}</pre></div>
</body></html>`;
}
function buildDriftHtml(drift) {
    const driftedRows = drift.drifted.map((d) => `<tr><td><strong>${escapeHtml(d.relativePath)}</strong></td><td>${escapeHtml(d.reason)}</td><td>${d.missingSignals.map(escapeHtml).join('<br>')}</td></tr>`).join('');
    const missingRows = drift.missing.map((m) => `<tr><td><strong>${escapeHtml(m)}</strong></td><td>File not found</td><td>—</td></tr>`).join('');
    const okRows = drift.upToDate.map((f) => `<tr><td>${escapeHtml(f)}</td><td colspan="2" style="color:#4caf50">✓ Up to date</td></tr>`).join('');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
  body{font-family:var(--vscode-font-family,system-ui);padding:20px;color:var(--vscode-foreground)}
  h1{margin-bottom:8px} table{width:100%;border-collapse:collapse;margin-top:12px}
  th{text-align:left;padding:8px;background:#1e1e1e;border-bottom:2px solid #444}
  td{padding:8px;border-bottom:1px solid #333;vertical-align:top}
  .warn{color:#ff9800} .ok{color:#4caf50}
</style></head><body>
<h1>AI-Kit Drift Report</h1>
<p>${drift.drifted.length + drift.missing.length === 0 ? '<span style="color:#4caf50">✓ All tracked files are up to date.</span>' : `${drift.drifted.length} drifted, ${drift.missing.length} missing, ${drift.upToDate.length} up to date.`}</p>
<table>
  <thead><tr><th>File</th><th>Status</th><th>Details</th></tr></thead>
  <tbody>${driftedRows}${missingRows}${okRows}</tbody>
</table>
${drift.drifted.length > 0 ? '<p style="margin-top:16px;opacity:.7">To fix: delete drifted files and run AI-Kit: Apply Recommended Setup</p>' : ''}
</body></html>`;
}
function buildTeamSyncHtml(result) {
    return buildDriftHtml({
        drifted: result.drifted,
        missing: result.missing,
        upToDate: result.upToDate,
    }).replace('<h1>AI-Kit Drift Report</h1>', `<h1>AI-Kit Team Sync — v${escapeHtml(result.configVersion)}</h1><p>${escapeHtml(result.summary)}</p>`);
}
//# sourceMappingURL=extension.js.map

/***/ }),

/***/ 4379:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/**
 * DiagnosticsProvider — real-time inline diagnostics for Apex and LWC files.
 * Debounces change events and pushes to a VS Code DiagnosticCollection.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DiagnosticsProvider = void 0;
const vscode = __importStar(__nccwpck_require__(5325));
const core_1 = __nccwpck_require__(6808);
const DEBOUNCE_MS = 400;
class DiagnosticsProvider {
    constructor(collection) {
        this.disposables = [];
        this.debounceTimers = new Map();
        this.collection = collection;
    }
    static create(context) {
        const collection = vscode.languages.createDiagnosticCollection('sf-ai-toolkit-inline');
        context.subscriptions.push(collection);
        const provider = new DiagnosticsProvider(collection);
        // Register document event listeners
        provider.disposables.push(vscode.workspace.onDidOpenTextDocument((doc) => provider.updateDiagnostics(doc)), vscode.workspace.onDidChangeTextDocument((e) => provider.scheduleUpdate(e.document)), vscode.workspace.onDidCloseTextDocument((doc) => {
            collection.delete(doc.uri);
            provider.debounceTimers.delete(doc.uri.toString());
        }));
        // Run on already-open editors
        for (const doc of vscode.workspace.textDocuments) {
            provider.updateDiagnostics(doc);
        }
        return provider;
    }
    scheduleUpdate(document) {
        const key = document.uri.toString();
        const existing = this.debounceTimers.get(key);
        if (existing)
            clearTimeout(existing);
        const timer = setTimeout(() => {
            this.debounceTimers.delete(key);
            this.updateDiagnostics(document);
        }, DEBOUNCE_MS);
        this.debounceTimers.set(key, timer);
    }
    updateDiagnostics(document) {
        const fileType = (0, core_1.detectFileType)(document.fileName);
        if (fileType === 'unknown')
            return;
        const content = document.getText();
        const aiKitDiags = (0, core_1.analyseFile)(content, fileType);
        const vsDiags = aiKitDiags.map((d) => {
            const lineCount = document.lineCount;
            const lineIndex = Math.min(d.line, lineCount - 1);
            const line = document.lineAt(lineIndex);
            const startCol = Math.min(d.startCol, line.text.length);
            const endCol = d.endCol === -1 ? line.text.length : Math.min(d.endCol, line.text.length);
            const range = new vscode.Range(lineIndex, startCol, lineIndex, endCol);
            const severity = d.severity === 'error'
                ? vscode.DiagnosticSeverity.Error
                : d.severity === 'warning'
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Information;
            const diag = new vscode.Diagnostic(range, d.message, severity);
            diag.source = `AI-Kit (${d.ruleFile})`;
            if (d.ruleId) {
                diag.code = d.ruleId;
            }
            return diag;
        });
        this.collection.set(document.uri, vsDiags);
    }
    /**
     * Returns the number of diagnostics for a given URI.
     */
    getDiagnosticCount(uri) {
        const diags = this.collection.get(uri);
        return diags ? diags.length : 0;
    }
    dispose() {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        for (const d of this.disposables) {
            d.dispose();
        }
        this.collection.dispose();
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
//# sourceMappingURL=diagnostics-provider.js.map

/***/ }),

/***/ 2949:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/**
 * AI-Kit Hover Provider — shows rule explanations and fix suggestions
 * when the cursor hovers over a position covered by an AI-Kit diagnostic.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AiKitHoverProvider = void 0;
exports.registerHoverProvider = registerHoverProvider;
const vscode = __importStar(__nccwpck_require__(5325));
const core_1 = __nccwpck_require__(6808);
class AiKitHoverProvider {
    constructor(diagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
    }
    provideHover(document, position, _token) {
        // Find any AI-Kit diagnostic at this position
        const diags = this.diagnosticCollection.get(document.uri);
        if (!diags || diags.length === 0)
            return undefined;
        const matching = diags.filter((d) => d.range.contains(position));
        if (matching.length === 0)
            return undefined;
        // Use the first matching diagnostic
        const diag = matching[0];
        // Extract ruleFile from the source string "AI-Kit (.cursor/rules/apex.mdc)"
        const ruleFileMatch = diag.source?.match(/AI-Kit \((.+)\)$/);
        const ruleFile = ruleFileMatch ? ruleFileMatch[1] : '';
        const hoverContent = (0, core_1.getHoverContent)(ruleFile, diag.message);
        const md = new vscode.MarkdownString('', true);
        md.isTrusted = { enabledCommands: ['_vscode.open'] };
        md.supportHtml = false;
        // Title (bold)
        md.appendMarkdown(`**${hoverContent.title}**\n\n`);
        // Explanation
        md.appendMarkdown(`${hoverContent.explanation}\n\n`);
        // Fix suggestion
        md.appendMarkdown(`**Fix:** ${hoverContent.fixSuggestion}\n\n`);
        // Rule file link
        if (hoverContent.ruleFile) {
            md.appendMarkdown(`[Open rule: ${hoverContent.ruleFile}](command:_vscode.open?${encodeURIComponent(JSON.stringify(vscode.Uri.file(hoverContent.ruleFile).toString()))})`);
        }
        // Optional docs link
        if (hoverContent.docsLink) {
            md.appendMarkdown(`  |  [Salesforce Docs](${hoverContent.docsLink})`);
        }
        return new vscode.Hover(md, diag.range);
    }
}
exports.AiKitHoverProvider = AiKitHoverProvider;
/**
 * Register the hover provider for Apex files.
 * Returns the disposable so the caller can add it to context.subscriptions.
 */
function registerHoverProvider(context, diagnosticCollection) {
    const provider = new AiKitHoverProvider(diagnosticCollection);
    const disposable = vscode.languages.registerHoverProvider([
        { scheme: 'file', language: 'apex' },
        { scheme: 'file', pattern: '**/*.cls' },
        { scheme: 'file', pattern: '**/*.trigger' },
    ], provider);
    context.subscriptions.push(disposable);
    return disposable;
}
//# sourceMappingURL=hover-provider.js.map

/***/ }),

/***/ 2685:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/**
 * StatusBarProvider — manages the AI-Kit status bar item.
 * Shows the readiness score and current org alias.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StatusBarProvider = void 0;
const vscode = __importStar(__nccwpck_require__(5325));
const core_1 = __nccwpck_require__(6808);
class StatusBarProvider {
    constructor(statusBarItem) {
        this.disposables = [];
        this.statusBarItem = statusBarItem;
    }
    static create(context) {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
        statusBarItem.command = 'ai-kit-sf.openReport';
        statusBarItem.tooltip = 'AI-Kit for Salesforce — click to open readiness report';
        statusBarItem.text = '$(loading~spin) AI-Kit';
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);
        const provider = new StatusBarProvider(statusBarItem);
        context.subscriptions.push(new vscode.Disposable(() => provider.dispose()));
        return provider;
    }
    /**
     * Schedule a refresh after an optional delay (defaults to 2000ms).
     * Cancels any pending refresh first.
     */
    scheduleRefresh(delayMs = 2000) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = undefined;
            void this.refresh();
        }, delayMs);
    }
    /**
     * Run scanProject + readOrgContext in parallel and update the status bar.
     */
    async refresh() {
        const rootPath = this.getRootPath();
        if (!rootPath) {
            this.statusBarItem.text = '$(circle-slash) AI-Kit';
            this.statusBarItem.tooltip = 'AI-Kit: No workspace open';
            return;
        }
        try {
            const [result, orgCtx] = await Promise.all([
                (0, core_1.scanProject)(rootPath),
                (0, core_1.readOrgContext)(rootPath),
            ]);
            const score = result.score;
            const icon = score >= 80 ? '$(check)' : score >= 50 ? '$(warning)' : '$(error)';
            const orgAlias = orgCtx.source !== 'none' && orgCtx.defaultOrg
                ? orgCtx.defaultOrg
                : undefined;
            this.statusBarItem.text = orgAlias
                ? `${icon} AI-Kit ${score}% | ${orgAlias}`
                : `${icon} AI-Kit ${score}%`;
            // Build tooltip breakdown
            const missingCount = result.missing.length;
            const orgLine = orgAlias
                ? `\nOrg: ${orgAlias}  (from ${orgCtx.source})`
                : '';
            const scoreLabel = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Critical';
            this.statusBarItem.tooltip =
                `AI-Kit for Salesforce\n` +
                    `Readiness: ${score}/100 (${scoreLabel})${orgLine}\n` +
                    (missingCount > 0
                        ? `${missingCount} item(s) missing — click to see report`
                        : 'All items present!');
        }
        catch {
            this.statusBarItem.text = '$(question) AI-Kit';
            this.statusBarItem.tooltip = 'AI-Kit: Error during scan';
        }
    }
    getRootPath() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0)
            return undefined;
        return folders[0].uri.fsPath;
    }
    dispose() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.StatusBarProvider = StatusBarProvider;
//# sourceMappingURL=status-bar-provider.js.map

/***/ }),

/***/ 4242:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

/**
 * TeamSyncProvider — auto-checks team config on workspace open.
 * Reads the teamConfigUrl from VS Code settings and silently runs
 * drift detection in the background. Shows a notification if there is drift.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TeamSyncProvider = void 0;
const vscode = __importStar(__nccwpck_require__(5325));
const core_1 = __nccwpck_require__(6808);
const CONFIG_KEY = 'sf-ai-toolkit.teamConfigUrl';
function isAllowedTeamConfigUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        return parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
class TeamSyncProvider {
    constructor() {
        this.disposables = [];
    }
    static create(context) {
        const provider = new TeamSyncProvider();
        context.subscriptions.push(new vscode.Disposable(() => provider.dispose()));
        return provider;
    }
    /**
     * Check team sync on startup.
     * Reads the teamConfigUrl from settings. If set, fetches and checks silently.
     * If drift is found, shows an info message with a "View Report" button.
     * If up to date, does nothing.
     */
    async checkOnStartup(rootPath) {
        if (!vscode.workspace.isTrusted)
            return;
        const config = vscode.workspace.getConfiguration();
        const teamConfigUrl = config.get(CONFIG_KEY, '');
        if (!teamConfigUrl || teamConfigUrl.trim() === '') {
            // No URL configured — nothing to do
            return;
        }
        if (!isAllowedTeamConfigUrl(teamConfigUrl.trim())) {
            return;
        }
        // Silently fetch in background
        try {
            const teamConfig = await (0, core_1.fetchTeamConfig)(teamConfigUrl.trim());
            if (!teamConfig) {
                // Network error or bad URL — don't bother the user
                return;
            }
            const result = await (0, core_1.checkTeamSync)(rootPath, teamConfig);
            const issueCount = result.drifted.length + result.missing.length;
            if (issueCount === 0) {
                // Up to date — no noise
                return;
            }
            // Show informational message with option to view the full report
            const action = await vscode.window.showInformationMessage(`AI-Kit: ${issueCount} drift issue(s) found vs team config v${result.configVersion}. ${result.drifted.length} drifted, ${result.missing.length} missing.`, 'View Report');
            if (action === 'View Report') {
                // Open a webview with the drift report
                const panel = vscode.window.createWebviewPanel('ai-kit-team-sync-auto', `AI-Kit Team Sync — v${result.configVersion}`, vscode.ViewColumn.One, { enableScripts: false });
                panel.webview.html = buildTeamSyncHtml(result);
            }
        }
        catch {
            // Silently ignore all errors — don't disturb the user on startup
        }
    }
    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.TeamSyncProvider = TeamSyncProvider;
// ─── Helper HTML builder ──────────────────────────────────────────────────────
function buildTeamSyncHtml(result) {
    const driftedRows = result.drifted
        .map((d) => `<tr><td><strong>${escapeHtml(d.relativePath)}</strong></td><td class="warn">${escapeHtml(d.reason)}</td><td>${d.missingSignals.map(escapeHtml).join('<br>')}</td></tr>`)
        .join('');
    const missingRows = result.missing
        .map((m) => `<tr><td><strong>${escapeHtml(m)}</strong></td><td class="error">File not found</td><td>—</td></tr>`)
        .join('');
    const okRows = result.upToDate
        .map((f) => `<tr><td>${escapeHtml(f)}</td><td colspan="2" class="ok">✓ Up to date</td></tr>`)
        .join('');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
  body{font-family:var(--vscode-font-family,system-ui);padding:20px;color:var(--vscode-foreground)}
  h1{margin-bottom:8px} table{width:100%;border-collapse:collapse;margin-top:12px}
  th{text-align:left;padding:8px;background:#1e1e1e;border-bottom:2px solid #444}
  td{padding:8px;border-bottom:1px solid #333;vertical-align:top}
  .warn{color:#ff9800} .ok{color:#4caf50} .error{color:#f44336}
</style></head><body>
<h1>AI-Kit Team Sync — v${escapeHtml(result.configVersion)}</h1>
<p>${escapeHtml(result.summary)}</p>
<table>
  <thead><tr><th>File</th><th>Status</th><th>Details</th></tr></thead>
  <tbody>${driftedRows}${missingRows}${okRows}</tbody>
</table>
${result.drifted.length > 0 ? '<p style="margin-top:16px;opacity:.7">To fix: delete drifted files and run AI-Kit: Apply Recommended Setup</p>' : ''}
</body></html>`;
}
//# sourceMappingURL=team-sync-provider.js.map

/***/ }),

/***/ 7009:
/***/ ((module) => {

module.exports = eval("require")("node-fetch");


/***/ }),

/***/ 2613:
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ 9140:
/***/ ((module) => {

"use strict";
module.exports = require("constants");

/***/ }),

/***/ 9896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 6928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 2203:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ 9023:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 5325:
/***/ ((module) => {

"use strict";
module.exports = require("vscode");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(361);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;