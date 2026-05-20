import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  // Extend Next.js recommended config (includes @next/next/no-img-element)
  ...nextVitals,

  // Main rules for production source files
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "src/**/__tests__/**",
      "src/**/*.test.*",
      "src/**/*.spec.*",
      "src/components/ui/**",
    ],
    rules: {
      // Enforce next-intl: no hardcoded string literals in JSX
      "react/jsx-no-literals": [
        "warn",
        {
          noStrings: true,
          allowedStrings: [
            " ",
            "•",
            "·",
            "|",
            "/",
            "-",
            "(",
            ")",
            ":",
            ",",
            ".",
            "+",
          ],
          ignoreProps: true,
          noAttributeStrings: false,
        },
      ],
      // Enforce next/image: no <img> element (already from next config, ensure error level)
      "@next/next/no-img-element": "warn",
      "react-hooks/set-state-in-effect": "warn",
      // No console.log in production files      "react-hooks/refs": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      // No console.log in production files
      "no-console": [
        "error",
        {
          allow: ["warn", "error"],
        },
      ],
    },
  },

  // Relax rules for test files
  {
    files: [
      "src/**/__tests__/**/*.{ts,tsx,js,jsx}",
      "src/**/*.test.{ts,tsx,js,jsx}",
      "src/**/*.spec.{ts,tsx,js,jsx}",
    ],
    rules: {
      "react/jsx-no-literals": "off",
      "no-console": "off",
    },
  },
];

export default eslintConfig;
