// Next.js only ships declarations for `*.module.{css,sass,scss}`.
// Global stylesheets imported for their side effects need their own,
// otherwise TypeScript >= 7 reports TS2882.
declare module '*.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.sass' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.scss' {
  const classes: { readonly [key: string]: string }
  export default classes
}
