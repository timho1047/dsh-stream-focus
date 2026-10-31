/** Stylesheet imports handled by the package's client bundler. */

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
