/**
 * Vendored client-bundle preset for a third-party DSH plugin, mirroring the
 * official harness helper `packages/client/tsdown.client.ts` (client face
 * only) at 0.1.2-alpha.1 (commit cd5ef8148158c3a752a658978873241fdf8e2bbc).
 *
 * Emits the ModuleLoader closure-factory artifact the browser loader expects:
 *
 *   window.__ModuleLoader__.load({ id, factory: (require) => { ... } })
 *
 * Externals are the shell baseline module table (react, react-dom, cordis,
 * client-store, ui-slots, ui-primitives — implicit for every dynamic bundle)
 * plus the plugin-specific rows named in `external` (the `dsh.client.external`
 * requests). CSS is compiled by lightningcss inside the bundle: `x.module.css`
 * yields its hashed class map and injects a `style[data-plugin-css]` tag at
 * factory execution; `x.css?inline` exports compiled text for plugin-owned
 * lifecycle effects; plain `x.css` injects a global plugin-tagged sheet.
 *
 * The build-time purity gate rejects any other `@deepseek-ai/*` value import:
 * cross-plugin collaboration goes through cordis services and slots, never a
 * duplicated runtime copy. Type-only imports are erased before the gate runs.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, resolve as resolvePath, sep } from 'node:path'
import type { UserConfig, Plugin } from 'tsdown'
import { transform } from 'lightningcss'

/** Shell baseline module-table rows (packages/client/web/src/platform.ts). */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
] as const

const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const GLOBAL_CSS_VIRTUAL_PREFIX = '\0dsh-global-css:'
const INLINE_CSS_VIRTUAL_PREFIX = '\0dsh-inline-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'
const INLINE_CSS_QUERY = '?inline'

/** Options of {@link clientBundle}. */
export interface ClientBundleOptions {
  /**
   * Client entry. Point it at the tsc-emitted `lib/types/client/index.js` to
   * chain the tsc sourcemaps into the standalone plugin map (the official
   * two-step: `tsc -p tsconfig.client.json && tsdown`). @default 'src/client/index.ts'
   */
  entry?: string
  /**
   * Module-table rows this bundle requests beyond the baseline — the same
   * specifiers declared under `dsh.client.external` in package.json.
   */
  external?: readonly string[]
}

/** Emit one plugin-owned style injector and an optional CSS Modules export. */
function styleInjectionModule(
  id: string,
  fileId: string,
  css: string,
  classMap?: Readonly<Record<string, string>>,
): string {
  const source = [
    `const css = ${JSON.stringify(css)};`,
    `const tagId = ${JSON.stringify(`${id}/${basename(fileId)}`)};`,
    'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
    '  const tag = document.createElement(\'style\');',
    `  tag.dataset.plugin = ${JSON.stringify(id)};`,
    '  tag.dataset.pluginCss = tagId;',
    '  tag.textContent = css;',
    '  document.head.appendChild(tag);',
    '}',
  ]
  if (classMap !== undefined) {
    source.push(`export default ${JSON.stringify(classMap, null, 2)};`)
  }
  return source.join('\n')
}

/** Resolve an imported stylesheet against its importer, without emitted-tree fallback. */
function sourceAssetPath(source: string, importer: string): string {
  const emitted = resolvePath(dirname(importer), source)
  if (existsSync(emitted)) return emitted
  // Emitted JS may live under lib/types while its stylesheets stay under src:
  // recover the source-tree counterpart through the marker.
  const boundary = emitted.indexOf(TYPES_MARKER)
  if (boundary < 0) return emitted
  return resolvePath(emitted.slice(0, boundary), 'src', emitted.slice(boundary + TYPES_MARKER.length))
}

/** Path segment separating a package's tsc output from the sources it was emitted from. */
const TYPES_MARKER = `${sep}lib${sep}types${sep}`

/** Trailing sourcemap reference tsc appends to every emitted module. */
const SOURCEMAP_COMMENT = /\n\/\/# sourceMappingURL=.*\s*$/

/** Chain tsc's emitted maps into the bundle when the entry consumes `lib/types`. */
function tscSourceMapPlugin(): Plugin {
  return {
    name: 'dsh-tsc-sourcemap',
    async load(id: string) {
      if (!id.includes(TYPES_MARKER) || !id.endsWith('.js') || !existsSync(`${id}.map`)) return null
      const code = await readFile(id, 'utf8')
      const mapPath = `${id}.map`
      const map = JSON.parse(await readFile(mapPath, 'utf8')) as {
        sourceRoot?: unknown
        sources?: unknown
        sourcesContent?: unknown
        [key: string]: unknown
      }
      if (!Array.isArray(map.sources) || map.sources.some(source => typeof source !== 'string')) {
        throw new Error(`client sourcemap: ${mapPath} has invalid sources`)
      }
      const sources = map.sources as string[]
      if (
        !Array.isArray(map.sourcesContent)
        || map.sourcesContent.length !== sources.length
        || map.sourcesContent.some(source => typeof source !== 'string')
      ) {
        const sourceRoot = typeof map.sourceRoot === 'string' ? map.sourceRoot : ''
        map.sourcesContent = await Promise.all(sources.map(async source =>
          await readFile(resolvePath(dirname(mapPath), sourceRoot, source), 'utf8')))
      }
      return { code: code.replace(SOURCEMAP_COMMENT, ''), map }
    },
  }
}

/**
 * Build the tsdown config for this plugin's browser client bundle.
 * @param id - package name; stamped into the __ModuleLoader__.load handoff and the injected style tags.
 * @param options - entry and extra module-table requests.
 * @returns The client-face tsdown config.
 */
export function clientBundle(id: string, options: ClientBundleOptions = {}): UserConfig {
  const entry = options.entry ?? 'src/client/index.ts'
  const requested = new Set<string>([...PLATFORM_MODULES, ...(options.external ?? [])])
  const isRequested = (specifier: string): boolean =>
    requested.has(specifier) || [...requested].some(row => specifier.startsWith(`${row}/`))
  const cssPlugins: Plugin[] = [{
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer !== undefined ? sourceAssetPath(source, importer) : source
      return CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      const exportEntries = Object.entries(cssExports ?? {})
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      for (const [local, exp] of exportEntries) classMap[local] = exp.name
      return styleInjectionModule(id, fileId, code.toString(), classMap)
    },
  }, {
    name: 'dsh-css-text-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith(`.css${INLINE_CSS_QUERY}`)) return null
      const stylesheet = source.slice(0, -INLINE_CSS_QUERY.length)
      const abs = importer !== undefined ? sourceAssetPath(stylesheet, importer) : stylesheet
      return INLINE_CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(INLINE_CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(INLINE_CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code } = transform({ filename: fileId, code: source, minify: true })
      return `export default ${JSON.stringify(code.toString())};`
    },
  }, {
    name: 'dsh-css-global-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.css') || source.endsWith('.module.css')) return null
      const abs = importer !== undefined ? sourceAssetPath(source, importer) : source
      return GLOBAL_CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(GLOBAL_CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(GLOBAL_CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code } = transform({ filename: fileId, code: source, minify: true })
      return styleInjectionModule(id, fileId, code.toString())
    },
  }]
  return {
    entry: { client: entry },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: false,
    sourcemap: true,
    clean: false,
    codeSplitting: false,
    deps: {
      neverBundle: isRequested,
      // Anything the loader module table cannot answer must inline. A
      // require() outside the requested rows is a guaranteed runtime throw.
      alwaysBundle: (specifier: string) => !isRequested(specifier),
    },
    inputOptions: {
      resolve: {
        conditionNames: [
          (process.env.NODE_ENV ?? 'production') === 'development' ? 'development' : 'production',
          'browser', 'import', 'module', 'default',
        ],
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    plugins: [{
      // Build-time mirror of the module-edge rules: the baseline and the
      // package's declared requests stay external; every other
      // `@deepseek-ai/*` value import is a build error (cross-plugin value
      // imports are forbidden — collaborate through cordis services instead).
      name: 'dsh-client-bundle-purity',
      resolveId(source: string) {
        if (!source.startsWith('@deepseek-ai/')) return null
        if (isRequested(source)) return null
        throw new Error(
          `client bundle purity: "${source}" is not in the baseline module table or ${id}'s declared external rows — `
          + 'declare it under dsh.client.external (and pass it here) or collaborate through cordis services; '
          + 'type-only imports are erased and never reach this gate',
        )
      },
    }, tscSourceMapPlugin(), ...cssPlugins],
    outputOptions: {
      entryFileNames: 'client.js',
      sourcemapExcludeSources: false,
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  } satisfies UserConfig
}

/**
 * Build the tsdown config for the Node-face runtime entries. The tsc pass
 * emits JavaScript plus declarations into `lib/types`; this face bundles each
 * entry back to `lib/<name>.js` as plain ESM for the host Loader. Every bare
 * specifier stays external (Node resolves it); sourcemaps chain the tsc maps.
 * @param id - package name, used in tsdown diagnostics.
 * @param libEntries - emitted JavaScript entries consumed from `lib/types`, one bundle each.
 * @returns The node-face tsdown config, or `undefined` when the package ships no Node half.
 */
export function nodeBundle(id: string, libEntries: readonly string[]): UserConfig[] {
  return libEntries.map(entry => {
    const name = basename(entry, '.js')
    return {
      entry: { [name]: entry },
      outDir: 'lib',
      format: 'esm',
      platform: 'node',
      target: 'es2024',
      dts: false,
      sourcemap: true,
      clean: false,
      codeSplitting: false,
      // Host code resolves its dependencies through Node: every bare
      // specifier stays an import so the runtime identity is not duplicated.
      deps: { alwaysBundle: (specifier: string) => specifier.startsWith('.') },
      outputOptions: { entryFileNames: '[name].js' },
      plugins: [tscSourceMapPlugin()],
    } satisfies UserConfig
  })
}
