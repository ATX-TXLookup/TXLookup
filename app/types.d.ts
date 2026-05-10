// Ambient declarations for non-TS imports.
// Next 14 with `moduleResolution: "bundler"` doesn't provide a default
// module type for `.css` side-effect imports — the editor (TS) flags
// `import "./globals.css"` with TS2882. This declaration tells TS those
// imports have no exported shape, only side effects.
declare module "*.css";
