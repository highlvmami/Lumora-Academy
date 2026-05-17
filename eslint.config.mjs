<<<<<<< HEAD
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  
  // 🛠️ React Hooks kurallarını Flat Config yapısına uygun şekilde esnetiyoruz
  {
    rules: {
      "react-hooks/exhaustive-deps": "off", // Bağımlılık dizisi kırmızı çizgi uyarısını tamamen kapatır
      "react-hooks/rules-of-hooks": "error" // Temel hook kurallarını (örneğin döngü içinde useEffect kullanmama) korur
    }
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
=======
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
>>>>>>> 406b962f1fc3903d1e2855d51c1ccd8829583f5d
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

<<<<<<< HEAD
export default eslintConfig;
=======
export default eslintConfig;
>>>>>>> 406b962f1fc3903d1e2855d51c1ccd8829583f5d
