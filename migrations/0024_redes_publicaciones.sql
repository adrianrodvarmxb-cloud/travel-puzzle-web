-- REQ-1090: registro de publicaciones de redes por artículo y red. Evita publicar dos veces el mismo artículo en la
-- misma red y permite el tope de una publicación por red al día. Solo agrega una tabla; no toca datos existentes.
CREATE TABLE IF NOT EXISTS "RedPublicacion" (
  "slug" TEXT NOT NULL,
  "red" TEXT NOT NULL,
  "publicadoEn" TEXT NOT NULL,
  PRIMARY KEY ("slug", "red")
);
CREATE INDEX IF NOT EXISTS "RedPublicacion_red_fecha_idx" ON "RedPublicacion"("red", "publicadoEn");
