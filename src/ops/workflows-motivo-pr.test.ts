import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [".github/workflows/blog-diario.yml", ".github/workflows/guias-ciudad.yml"];

describe("motivo exacto cuando no se puede crear el PR", () => {
  for (const f of files) {
    const wf = readFileSync(f, "utf8");
    it(`REQ-1237: ${f} guarda el error exacto de crear el PR y, si es el 403 de Actions, qué opción encender`, () => {
      expect(wf).toMatch(/if ! n=\$\(gh api "repos\/\$REPO\/pulls"[^\n]*--jq \.number 2> "\$B\/pr-error\.log"\); then/);
      expect(wf).toContain(`printf '%s\\n' "$n" >> "$B/pr-error.log"`);
      expect(wf).toContain('grep -qi "not permitted to create or approve pull requests" "$B/pr-error.log"');
      expect(wf).toContain("Settings → Actions → General → Workflow permissions → «Allow GitHub Actions to create and approve pull requests»");
      expect(wf).toMatch(/\} > "\$B\/motivo"\n\s+exit 1/);
      expect(wf).toMatch(/git push -q origin "\$rama" 2> "\$B\/push-error\.log" \|\| \{ echo "- no se pudo subir la rama/);
    });
    it(`REQ-1237: ${f} usa una rama por intento para que «Re-run jobs» no choque con la anterior`, () => {
      expect(wf).toMatch(/rama="[^"\n]*-\$\{\{ github\.run_attempt \}\}"/);
    });
  }
});
