# Conectar LinkedIn, Facebook e Instagram (pasos del PO) · REQ-1082

Mientras no hagas esto, **no se publica nada solo**. Cada día, después de la entrada del blog, el workflow «Redes del día» abre un issue con los 3 textos y las láminas de Instagram listos para copiar y pegar. Las tres banderas están en `"false"`.

Reglas:
- Haz **un paso a la vez** y dime «listo» antes de seguir.
- Los tokens van **solo** como secretos de GitHub (Settings → Secrets and variables → Actions). Nunca en el repo, en un chat ni en un correo. Crearlos es tu candado.
- Si una pantalla ya no se llama igual, dime qué ves y lo ajustamos.

## A. Facebook (página) e Instagram (cuenta business)

**A1. Pasa Instagram a cuenta profesional de empresa.**
App de Instagram → tu perfil → menú ☰ → Configuración y privacidad → Tipo de cuenta y herramientas → «Cambiar a cuenta profesional» → Empresa.

**A2. Vincula Instagram con la página de Facebook de Travel Puzzle.**
business.facebook.com (Meta Business Suite) → Configuración → Cuentas → Cuentas de Instagram → «Conectar» → elige la cuenta de Travel Puzzle. La página y la cuenta de IG deben quedar en el mismo portafolio comercial.

**A3. Crea la app de Meta.**
developers.facebook.com → Mis apps → Crear app → tipo **Empresa** (Business) → nómbrala «Travel Puzzle Redes» → asígnala al portafolio comercial de Travel Puzzle.

**A4. Agrega los permisos a la app.**
Dentro de la app, en Casos de uso o Productos, agrega «Facebook Login para empresas» o «Administrar todo en tu página» y la «API de Instagram con inicio de sesión de Facebook». Activa estos permisos:
- `pages_manage_posts`
- `pages_read_engagement`
- `pages_show_list`
- `instagram_basic`
- `instagram_content_publish`
- `business_management`

Mientras la app esté en modo desarrollo y tú seas administrador, funcionan con tu propia página sin revisión de Meta.

**A5. Crea un usuario del sistema con token que no vence** (recomendado; un token personal vence a los 60 días).
business.facebook.com → Configuración del negocio → Usuarios → Usuarios del sistema → Agregar:
1. Rol: administrador.
2. «Asignar activos»: la página de Facebook y la cuenta de Instagram, con control total.
3. «Generar token»: elige la app de A3, marca los permisos de A4 y la caducidad «Nunca».
Copia el token a un lugar seguro solo un momento: lo pegas en A7.

**A6. Saca los dos identificadores.**
- **ID de la página:** página de Facebook → Información → Transparencia de la página (o en la URL de Meta Business Suite).
- **ID de la cuenta de Instagram:** developers.facebook.com/tools/explorer → elige la app y el token de A5 → consulta `GET /{ID de la página}?fields=instagram_business_account`. El número que regresa es el ID.

**A7. Guarda los secretos en GitHub.**
github.com/adrianrodvarmxb-cloud/travel-puzzle-web → Settings → Secrets and variables → Actions → New repository secret:
- `META_PAGE_ID` → el ID de la página (A6);
- `META_PAGE_TOKEN` → el token del usuario del sistema (A5);
- `META_IG_USER_ID` → el ID de Instagram (A6).
Opcional, en la pestaña «Variables»: `META_GRAPH_VERSION` (por omisión `v23.0`; si Meta la retira, se pone la vigente).

**A8. Enciende una red a la vez (PR con tu OK).**
Te preparo un PR con `SOCIAL_FACEBOOK_ENABLED: "true"`. Lo fusionas, se publica la entrada del día siguiente y revisamos que salió bien. Después, el de `SOCIAL_INSTAGRAM_ENABLED`.

## B. LinkedIn (página de empresa)

**B1. Confirma tu rol.**
Debes ser **superadministrador** de la página de empresa de Travel Puzzle en LinkedIn: página → Herramientas de administrador → Administrar administradores.

**B2. Crea la app.**
developer.linkedin.com → My apps → Create app → nombre «Travel Puzzle Redes» → asocia la página de empresa de Travel Puzzle → logo → acepta los términos.

**B3. Verifica la app desde la página.**
En la pestaña Settings de la app → «Verify» → copia la URL de verificación, ábrela con tu sesión de administrador y aprueba.

**B4. Pide el producto «Community Management API».**
Pestaña Products → «Community Management API» → Request access. LinkedIn pide verificar la empresa y llenar un formulario de uso; el nivel inicial (Development) basta para publicar en tu propia página. La aprobación puede tardar días.
Esta API no se puede mezclar con otros productos en la misma app: si ya tiene otros, crea una app solo para esto.

**B5. Genera el token.**
Pestaña Auth → OAuth 2.0 tools (Token generator):
1. Elige la app.
2. Marca los scopes `w_organization_social` y `r_organization_social`.
3. Inicia sesión como superadministrador y copia el token.
Ese token **vence a los 60 días**. Pon un recordatorio a los 50 días para generar otro y reemplazar el secreto. Cuando un token vence, el issue «Redes: no se publicó» lo dice.

**B6. Saca el ID de la organización.**
Abre la página de empresa como administrador: el número de la URL `linkedin.com/company/{número}/admin` es el ID.

**B7. Guarda los secretos en GitHub** (igual que A7):
- `LINKEDIN_ORG_ID` → el número de B6;
- `LINKEDIN_TOKEN` → el token de B5.
Opcional, en «Variables»: `LINKEDIN_API_VERSION` con la versión mensual vigente en formato `AAAAMM`. Por omisión es `202609`. LinkedIn retira cada versión al año: si el issue dice «version» o «426», se actualiza.

**B8. Enciende LinkedIn (PR con tu OK).**
Te preparo el PR con `SOCIAL_LINKEDIN_ENABLED: "true"`.

## Qué se publica (y qué no)
- El mismo tema de la entrada del día, adaptado a cada red:
  - LinkedIn: 1,200–1,800 caracteres, 3 a 5 viñetas, enlace con UTM y 3 a 5 hashtags;
  - Facebook: 400–800 caracteres, con enlace;
  - Instagram: caption con «link en bio», de 10 a 15 hashtags y un carrusel de 3 a 5 láminas 1080×1350.
- Las mismas reglas del blog. Sin datos inventados. Cada cifra debe estar con su fuente en el artículo. Sin «FREETOUR» ni su logo. Anunciar que hay free tours sí está permitido (cumplimiento B3).
- Las láminas viven en el sitio (`/blog/img/{slug}/ig-{n}.jpg`) porque Instagram las lee por URL pública.
- Para el link en bio de Instagram: apunta a `https://travelpuzzle.com.mx/blog` o a la entrada del día.
