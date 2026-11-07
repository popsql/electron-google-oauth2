// Route the native `import('electron')` and `import('@electron/remote')` of the
// library to the CJS test mocks. A loader hook is necessary because `require`
// patches do not apply to ESM.
const mockUrl = new URL('./electron-mock-esm.mjs', import.meta.url).href;
const remoteMockUrl = new URL('./electron-remote-mock.cjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'electron') {
    return { shortCircuit: true, url: mockUrl };
  }
  if (specifier === '@electron/remote') {
    return { shortCircuit: true, url: remoteMockUrl };
  }
  return nextResolve(specifier, context);
}
