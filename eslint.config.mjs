import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Regras do React Compiler (o projeto não usa o compiler). Ficam como aviso para
    // orientar refatorações graduais sem bloquear o lint.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**"] },
]

export default config
