import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const doc = readFileSync("docs/redes/conexion.md", "utf8");

describe("guía de conexión de redes", () => {
  it("REQ-1082: pasos del PO uno por uno para Meta (página, IG business, app y permisos) y LinkedIn (app, Community Management, admin)", () => {
    for (const s of ["**A1.", "**A2.", "**A3.", "**A4.", "**A5.", "**A6.", "**A7.", "**A8.", "**B1.", "**B2.", "**B3.", "**B4.", "**B5.", "**B6.", "**B7.", "**B8."]) expect(doc).toContain(s);
    for (const p of ["pages_manage_posts", "instagram_basic", "instagram_content_publish", "Community Management API", "superadministrador", "w_organization_social"]) expect(doc).toContain(p);
    for (const k of ["META_PAGE_ID", "META_PAGE_TOKEN", "META_IG_USER_ID", "LINKEDIN_ORG_ID", "LINKEDIN_TOKEN"]) expect(doc).toContain(`\`${k}\``);
    expect(doc).toContain("un paso a la vez");
  });
});
