/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_ENV?: "production" | "staging" | "development";
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
