import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next ships native flat configs as of v16. Routing them through
// @eslint/eslintrc's FlatCompat crashes on a circular plugin reference, which left lint
// non-functional — importing the flat configs directly is both the supported path and the
// working one.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: [".next/**", "node_modules/**", "out/**"] },
];

export default eslintConfig;
