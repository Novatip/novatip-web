/**
 * src/test/setup.ts
 *
 * Global test setup — imported by Vitest before every test file.
 * Loads @testing-library/jest-dom so matchers like toBeInTheDocument()
 * are available in all tests without explicit imports.
 */
import "@testing-library/jest-dom";
