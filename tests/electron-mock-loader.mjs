// Route the native `import('electron')` of the library to the CJS test mock.
// A loader hook is necessary because `require` patches do not apply to ESM.
const mockUrl = new URL('./electron-mock-esm.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'electron') {
    return { shortCircuit: true, url: mockUrl };
  }
  return nextResolve(specifier, context);
}
