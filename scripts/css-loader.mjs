// Node loader hook that turns `import "./x.css"` into a no-op, so the verify
// scripts can import components that pull in their stylesheet (Vite does this
// in the real build).
export function resolve(specifier, context, next) {
  if (specifier.endsWith(".css")) {
    return {
      url: "data:text/javascript,export default {}",
      format: "module",
      shortCircuit: true,
    };
  }
  return next(specifier, context);
}
