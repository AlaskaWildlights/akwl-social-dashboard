# AKWL Social Dashboard — Manual Definitivo del Sistema

> **Última actualización:** 12 de julio 2026 · Cubre W17–W27
> Este documento contiene TODO el conocimiento del sistema: formatos, encodings, script, workflow, problemas históricos y prompts listos para usar. Si algo se rompe, empieza aquí.

---

## 1. REGLA DE ORO (NUNCA ROMPER)

- El email semanal se envía **ÚNICAMENTE a `info@alaskawildlights.com`**.
- **NUNCA** enviar a kyle, ashley, josh, caitlin, saray, ni ninguna otra dirección.
- Esto está hardcodeado en `Code.gs` línea 9: `var AKWL_EMAIL = "info@alaskawildlights.com";` — no tocar.

---

## 2. CÓMO FUNCIONA EL SISTEMA (visión general)

```
1. EXPORTAR    → 18 CSVs desde Meta Business Suite, TikTok Studio, Google Analytics
2. SUBIR       → Los CSVs van a la carpeta de Google Drive (ID: 1G861p7ZUSpLhoFZjLDRPmUykN5QKXFEz)
3. PROCESAR    → El script Code.gs (Apps Script) lee los CSVs, los clasifica,
                 escribe al Google Sheet y genera AKWL_data.json
4. NOTIFICAR   → El script manda el email con el resumen + JSON a info@alaskawildlights.com
5. PUBLICAR    → El JSON se sube al dashboard HTML con el botón "Update data"
                 (o se hardcodea en el HTML con Claude)
```

**IDs importantes:**
| Recurso | ID |
|---------|-----|
| Google Sheet | `15QgxsImalEM_At3fOkZDag1G1C_6ueEy2OsL8Cw7GZQ` |
| Carpeta Drive (inbox CSVs) | `1G861p7ZUSpLhoFZjLDRPmUykN5QKXFEz` |
| Repo GitHub | `AlaskaWildlights/akwl-social-dashboard` |
| Email destino | `info@alaskawildlights.com` |

---

## 3. CALENDARIO DE SEMANAS

**Las semanas AKWL van de DOMINGO a SÁBADO.** Esta es la fuente #1 de errores con TikTok (ver sección 10).

| Semana | Fechas 2026 |
|--------|-------------|
| W17 | Abr 19 – 25 |
| W18 | Abr 26 – May 2 |
| W19 | May 3 – 9 |
| W20 | May 10 – 16 |
| W21 | May 17 – 23 |
| W22 | May 24 – 30 |
| W23 | May 31 – Jun 6 |
| W24 | Jun 7 – 13 |
| W25 | Jun 14 – 20 |
| W26 | Jun 21 – 27 |
| W27 | Jun 28 – Jul 4 |
| W28 | Jul 5 – 11 |
| W29 | Jul 12 – 18 |
| W30 | Jul 19 – 25 |

**Regla:** al exportar cualquier CSV, selecciona SIEMPRE el rango domingo→sábado exacto de la semana.

---

## 4. LOS 18 ARCHIVOS SEMANALES (checklist de exportación)

### Instagram (7 archivos — Meta Business Suite → Insights)
| # | Archivo | Métrica en Meta |
|---|---------|-----------------|
| 1 | `IG_Reach_Wnn.csv` | Reach |
| 2 | `IG_Views_Wnn.csv` | Views |
| 3 | `IG_Follows_Wnn.csv` | Follows |
| 4 | `IG_Visits_Wnn.csv` | Profile visits |
| 5 | `IG_Interactions_Wnn.csv` | Interactions |
| 6 | `IG_LinkClicks_Wnn.csv` | Link clicks |
| 7 | `IG_Audience_Wnn.csv` | Audience (demographics) |

### Facebook (7 archivos — Meta Business Suite → Insights)
| # | Archivo | Métrica en Meta |
|---|---------|-----------------|
| 8 | `FB_Views_Wnn.csv` | Views |
| 9 | `FB_Visits_Wnn.csv` | Page visits |
| 10 | `FB_Viewers_Wnn.csv` | Viewers |
| 11 | `FB_Follows_Wnn.csv` | Follows |
| 12 | `FB_Interactions_Wnn.csv` | Interactions |
| 13 | `FB_LinkClicks_Wnn.csv` | Link clicks |
| 14 | `FB_Audience_Wnn.csv` | Audience (demographics) |

### TikTok (3 archivos — TikTok Studio → Analytics)
| # | Archivo | Sección en TikTok |
|---|---------|-------------------|
| 15 | `TT_Overview_Wnn.csv` | Overview (Video views, Reach, Likes, etc.) |
| 16 | `TT_Video_Wnn.csv` | Content/Videos (por video) |
| 17 | `TT_Audience_Wnn.csv` | Followers (total + nuevos por día) |

⚠️ **TikTok exporta Lunes–Domingo por defecto.** Ajusta el rango manualmente a Dom–Sáb. Si no puedes, no importa: el script filtra por fecha (línea 484 de Code.gs), pero el domingo de tu semana puede quedar en el export ANTERIOR — revisa que las fechas cubran tu semana completa.

### Google Analytics (1 archivo)
| # | Archivo | Reporte en GA4 |
|---|---------|----------------|
| 18 | `GA_Traffic_Wnn.csv` | Reports → Acquisition → Traffic acquisition → Export CSV |

**Nombres de archivo:** el script clasifica por palabras clave (ig+reach, fb+views, tt+overview, ga+traffic...). Guiones bajos, puntos, espacios y dobles extensiones (`.csv.csv`) NO importan — el script normaliza todo. Lo que importa es que el nombre contenga la plataforma y la métrica.

---

## 5. ENCODINGS DE LOS CSV (por qué se ven "rotos")

| Origen | Encoding | Cómo se ve si lo abres mal |
|--------|----------|---------------------------|
| Meta (IG/FB) | **UTF-16 LE con BOM** | `� s e p =` con espacios entre letras |
| TikTok | **UTF-8 con BOM** | Normal, a veces `ï»¿` al inicio |
| Google Analytics | **UTF-8** | Normal, empieza con `# ----` comentarios |

**Detección correcta en cualquier lenguaje:**
```python
with open(path, 'rb') as f: raw = f.read()
if raw[:2] == b'\xff\xfe':   text = raw.decode('utf-16-le')   # Meta
elif raw[:2] == b'\xfe\xff': text = raw.decode('utf-16-be')
else:                        text = raw.decode('utf-8-sig')    # TikTok/GA
```

**Estructura interna Meta:** línea 1 = `sep=,` · línea 2 = título de métrica · línea 3 = header `Date,Primary` · resto = filas `2026-05-10T00:00:00,88`. El total semanal = SUMA de los valores diarios.

**Estructura GA:** ~9 líneas de comentarios `#`, luego header `Session source / medium,Sessions,...`, luego filas por fuente. Columnas clave: `[1]`=Sessions, `[2]`=Engaged sessions, `[4]`=Avg engagement time, `[8]`=Total revenue, `[11]`=Key events.

**Estructura TT_Overview:** header directo con `Date,Video views,Reached audience,Profile views,Likes,Shares,Comments,Website clicks,...,Net growth,New followers,Lost followers`. Fechas formato `2026/05/10`.

---

## 6. FORMATO JSON CANÓNICO

El JSON que consume el HTML (el que genera el script y el que se hardcodea) tiene esta estructura EXACTA. **Este es el contrato — cualquier JSON que no cumpla esto rompe el dashboard.**

```json
{
  "generated": "2026-07-08T00:00:00.000Z",
  "goals": { "ig_followers": 1500, "ig_eng_rate": 6, "tt_followers": 100 },
  "weeks": [
    {
      "iso": "2026-W27",
      "label": "Jun 28–Jul 4",
      "ig_reach": 2618, "ig_views": 6709, "ig_follows": 21,
      "ig_visits": 127, "ig_inter": 390, "ig_clicks": 0,
      "ig_eng": 0.149, "ig_followers": 721,
      "fb_views": 2260, "fb_visits": 192, "fb_viewers": 1275,
      "fb_follows": 5, "fb_inter": 109, "fb_clicks": 8,
      "tt_views": 4058, "tt_reach": 3526, "tt_profile_views": 37,
      "tt_new_flw": 18, "tt_lost_flw": 0, "tt_net_growth": 18,
      "tt_likes": 257, "tt_comments": 10, "tt_shares": 17,
      "tt_website_clicks": 2, "tt_followers": 251,
      "tt_top_videos": [
        { "title": "…", "date": "2026/06/29", "views": 952, "likes": 57, "link": "https://…" }
      ],
      "ga_sessions": 1619, "ga_eng_sessions": 749,
      "ga_eng_rate": 0.4626, "ga_avg_eng_time": 35.2,
      "ga_key_events": 21, "ga_revenue": 2309.8,
      "ga_missing": false,
      "ga_sources": [
        { "src": "(direct) / (none)", "sessions": 1049, "revenue": 0.0 }
      ]
    }
  ],
  "audience": { "ig": { "...": "demographics" }, "fb": {}, "tt": {} }
}
```

**Reglas del contrato:**
1. `iso` = formato `"2026-Wnn"` (el formato viejo `"Wnn"` sin año también funciona, pero usa el nuevo).
2. `ig_eng` y `ga_eng_rate` son **decimales** (0.149 = 14.9%), NO porcentajes.
3. `ga_sources` usa la clave **`src`** (NO `source`) e incluye `revenue`.
4. `ig_followers` = total acumulado (viene del Manual Data sheet o de análisis del CSV Audience). `ig_follows` = NUEVOS follows brutos de la semana. **Son cosas distintas.**
5. `tt_followers` = total acumulado (encadenado: total anterior + net growth).
6. Si no hay dato, poner `0` — nunca `null` ni omitir la clave.
7. Semanas ordenadas cronológicamente en el array.

---

## 7. CÓMO FUNCIONA EL HTML (index.html)

- El dashboard **NO lee `data.json`** — tiene los datos **embebidos** dentro del propio HTML.
- Los datos viven entre estos dos marcadores (¡no borrarlos nunca!):
  ```javascript
  // == DATA_START ==
  var EMBEDDED_DATA = { ...todo el JSON... };
  // == DATA_END ===
  ```
- **Botón "Update data" (BLINDADO desde jul 2026):** sube un JSON semanal y lo fusiona con lo embebido, **campo por campo**:
  - Un valor en 0 o vacío en el JSON subido **nunca pisa** un valor real ya existente (protege `ig_followers`, `tt_top_videos`, etc.). Esto arregla de raíz el accidente que borró los ig_followers de W17–W19.
  - Los ISO `"W27"` y `"2026-W27"` se reconocen como la misma semana (no más duplicados).
- Para hardcodear con Claude: reemplazar el contenido entre los marcadores con el JSON completo actualizado (así se hizo W20–W27).

---

## 8. EL SCRIPT (Code.gs v7)

Container-bound al Google Sheet. 1,102 líneas. Está respaldado en este repo (`Code.gs`).

**Flujo de `processAllCSVs()` (función principal):**
1. Calcula el último sábado cerrado (cutoff) — no procesa semanas incompletas.
2. Lee todos los CSVs de la carpeta Drive (los no procesados).
3. Clasifica cada archivo por nombre (`classifyFile`) o por contenido (`classifyFileByContent`).
4. Detecta la semana por las fechas DENTRO del archivo (`detectWeekFromContent`), no por el nombre.
5. Parsea según el tipo (Meta UTF-16 / TikTok / GA).
6. `ig_followers` ← lee del sheet "Manual Data" (col A=weekISO, col C=total).
7. `tt_followers` ← usa total real del TT_Audience si existe; si no, encadena `total_anterior + new_followers`.
8. Escribe pestañas: Instagram, Facebook, TikTok, Analytics, Weekly Log, Audience.
9. Genera `AKWL_data.json` y lo guarda en Drive.
10. Envía el email a `info@alaskawildlights.com` con resumen + JSON adjunto.
11. Mueve los CSVs procesados a la subcarpeta "Processed".

**Fixes ya aplicados (no re-romper):**
- `ga_key_events` usa `"key events"` (con s) para no confundirse con "Session key event rate".
- `parseTikTokOverview` filtra filas fuera del rango de la semana (arregla el desfase Lun–Dom de TikTok).
- Archivos "Audience lifetime data" tienen excepción en la detección de semana.
- **JSON emite `iso: "2026-Wnn"`** — mismo formato que el HTML (antes emitía "Wnn" y el botón duplicaba semanas).
- **`ig_followers` se deriva automáticamente** del CSV IG_Audience si tiene la sección "Follows" (net diario): `total_anterior + net_semana`. El Manual Data sheet sigue teniendo prioridad si tiene la fila. Verificado: reproduce exactamente el 721 de W27.

**Funciones útiles:**
- `setupWeeklyTrigger()` — **correr UNA VEZ** desde el editor: instala el trigger de los lunes 6am. Re-correrla es seguro (reemplaza el trigger anterior).
- `testFiles()` — lista qué archivos ve y cómo los clasifica, SIN escribir nada.
- `clearSheetData()` — limpia las pestañas de datos.
- `clearAll()` — limpia todo incluyendo la carpeta procesados.

---

## 9. GOOGLE SHEET — pestañas

| Pestaña | Contenido | Quién escribe |
|---------|-----------|---------------|
| Instagram | Métricas IG por semana | Script |
| Facebook | Métricas FB por semana | Script |
| TikTok | Métricas TT por semana | Script |
| Analytics | Métricas GA por semana | Script |
| Weekly Log | Resumen consolidado | Script |
| Audience | Demographics más recientes | Script |
| **Manual Data** | col A=`2026-Wnn`, col C=`ig_followers` total | **TÚ (manual)** |

**`ig_followers` ya NO requiere entrada manual** (desde jul 2026): si el CSV `IG_Audience` incluye la sección "Follows" (el gráfico de followers net diario), el script lo deriva solo: `total_anterior + net_semana`. El Manual Data sheet sigue funcionando y **tiene prioridad** si la fila existe — úsalo para corregir manualmente cualquier semana.

⚠️ Para que funcione: al exportar el Audience de IG en Meta, incluye la métrica **Follows** en la vista antes de exportar (así salió en `Audience_1.csv`, que tenía Top countries + Age & gender + Follows + Top cities).

---

## 10. HISTORIAL DE PROBLEMAS (todo lo que salió mal en este chat y por qué)

| # | Problema | Causa raíz | Solución | Estado |
|---|----------|-----------|----------|--------|
| 1 | Repo/archivos "vacíos" al reconectar | El contenedor de la sesión es efímero; el clon local se resetea | Todo lo pusheado a GitHub está seguro; `git fetch` + `reset` lo recupera | Recurrente pero inofensivo |
| 2 | HTML mostraba solo hasta May 9 (W19) | El HTML no lee data.json — los datos van embebidos | Hardcodear EMBEDDED_DATA con todas las semanas | ✅ Resuelto |
| 3 | ig_followers y audience se pusieron en 0 | El botón "Update data" subió un JSON simple que PISÓ los datos ricos de W17–W19 | Restaurar del HTML deployed; regla: subir solo semanas nuevas con todos los campos | ✅ Resuelto |
| 4 | W25 ig_follows = 0 | El export original de Meta salió vacío | Re-export → 5 follows | ✅ Resuelto |
| 5 | W20 fb_views = 0 en un ZIP | El ZIP estaba incompleto (faltaban archivos 4–9) | Usar el ZIP completo | ✅ Resuelto |
| 6 | "Dropdown/dip" visible en W20 | NO era error: fb_views (−42%) y ga_revenue (−58%) cayeron de verdad esa semana | Verificado contra CSVs — dato real | ✅ Verificado |
| 7 | TT con datos que no cuadraban (W22/W24) | TikTok exporta Lun–Dom; la semana AKWL es Dom–Sáb | El script filtra por fecha; exportar Dom–Sáb cuando sea posible | ✅ Resuelto en script |
| 8 | W17/W18 TikTok = 0 | No había cuenta TT esas semanas | Correcto, es real | ✅ N/A |
| 9 | ga_key_events erróneo | El parser hacía match con "Session key event rate" | Fix: buscar "key events" exacto | ✅ Resuelto en script |
| 10 | GA sources inconsistentes ("google" vs "google / cpc") | GA cambió el formato del reporte entre semanas | Aceptado — no rompe nada | ⚠️ Cosmético |
| 11 | CSVs "ilegibles" (letras separadas por espacios) | Meta exporta UTF-16, no UTF-8 | Detectar BOM (sección 5) | ✅ Documentado |
| 12 | ig_followers W20+ = 0 en el repo | Sin acceso al Manual Data sheet desde el chat | Se restauraron del HTML deployed + CSV Audience | ✅ Resuelto |
| 13 | W23 ig_follows: 8 vs 12 | El export semanal difería del export lifetime (más completo) | Usar 12 (lifetime) | ✅ Corregido |
| 14 | W27 ig_followers | Sin Manual Data; derivado del CSV Audience: 716 + 5 net = **721** | Confirmado por análisis | ✅ 721 |
| 15 | Doble extensión `.csv.csv` | Renombrado manual antes de subir | El script lo tolera; no hace falta renombrar | ✅ N/A |

**Datos verificados W17–W27 (cadena ig_followers):**
`643 → 650 → 663 → 667 → 676 → 686 → 690 → 699 → 704 → 716 → 721`

---

## 11. WORKFLOW SEMANAL (el proceso ideal, automatizado al máximo)

### Lo que haces TÚ (10 minutos, una vez por semana — domingo o lunes):
1. Exportar los 18 CSVs (checklist sección 4) con rango **Dom–Sáb** de la semana cerrada. En el IG_Audience, incluir la métrica **Follows** en la vista.
2. Subirlos a la carpeta de Drive (`1G861p7ZUSpLhoFZjLDRPmUykN5QKXFEz`). Arrastrar y soltar, sin renombrar, sin ZIP.
3. (Opcional) Anotar el total de IG followers en "Manual Data" — solo si quieres forzar un valor exacto; si no, el script lo deriva del CSV Audience.

### Lo que hace el SCRIPT automáticamente:
4. **Trigger semanal** (configurar una vez): abrir el editor de Apps Script → seleccionar la función `setupWeeklyTrigger` → Run. Eso instala el trigger de los lunes 6–7am automáticamente.
   - Cada lunes: procesa todo lo que haya en la carpeta, escribe el Sheet, genera el JSON, **te manda el email** con el resumen y el JSON adjunto.
   - Si falla, te llega email con el error.
5. Alternativa manual: abrir el Sheet → menú del script → correr `processAllCSVs` (o desde el editor de Apps Script).

### Lo que haces TÚ para publicar (2 minutos):
6. Abrir el dashboard → botón **"Update data"** → subir el JSON del email.
7. O pedirle a Claude que lo hardcodee (prompt en sección 12).

### Por qué NO se puede automatizar el paso 1 (exportar):
Meta, TikTok y GA no tienen exportación programada de estos CSVs en sus planes actuales — requieren login y clicks. TODO lo demás ya es automático. Si algún día se quiere eliminar el paso manual, la ruta sería la API oficial de Meta/TikTok/GA4 (proyecto aparte, requiere developer setup).

---

## 12. PROMPTS LISTOS PARA CLAUDE (para ti o cualquiera del equipo)

### A. Procesar una semana nueva (con ZIP de CSVs)
```
Te subo un ZIP con los CSVs de la semana Wnn (fechas: DOM dd/mm a SAB dd/mm) del
sistema AKWL social dashboard. Lee el archivo MANUAL_SISTEMA.md del repo
AlaskaWildlights/akwl-social-dashboard para entender formatos y encodings.

Tareas:
1. Extrae y parsea los 18 CSVs (Meta=UTF-16, TikTok=UTF-8 BOM, GA=UTF-8).
2. Genera el JSON de la semana con el formato canónico de la sección 6 del manual.
3. tt_followers = total de la semana anterior + net growth de esta.
4. ig_followers: si te doy el número úsalo; si no, derívalo del CSV Audience
   (sección Follows) o déjalo en 0 y avísame.
5. Actualiza el EMBEDDED_DATA del index.html (entre // == DATA_START == y
   // == DATA_END ===) agregando la semana nueva SIN tocar las anteriores.
6. Verifica que los totales del JSON cuadran con los CSVs (muéstrame la comparación).
7. Commit y push a la rama que corresponda.
8. Dame el JSON de la semana y el index.html actualizado aquí en el chat.
```

### B. Verificar datos existentes
```
En el repo AlaskaWildlights/akwl-social-dashboard, lee MANUAL_SISTEMA.md.
Te subo los CSVs de la semana Wnn. Compara cada valor del EMBEDDED_DATA del
index.html contra los CSVs y dame una tabla de diferencias. NO cambies nada
sin mostrarme primero qué difiere y por qué.
```

### C. Arreglar el HTML si se rompió
```
El dashboard AKWL (index.html en AlaskaWildlights/akwl-social-dashboard) muestra
datos malos/vacíos. Lee MANUAL_SISTEMA.md secciones 6, 7 y 10. El HTML deployed
más reciente que funciona te lo subo aquí. Compara su EMBEDDED_DATA con el del
repo, dime qué se perdió, y restaura la versión buena manteniendo cualquier
semana nueva que exista solo en el repo.
```

### D. Si Claude no tiene contexto de nada
```
Trabajo con el sistema AKWL social dashboard: CSVs semanales de Instagram/
Facebook (Meta, UTF-16), TikTok (UTF-8 BOM) y Google Analytics se procesan a un
JSON que vive embebido en un index.html (dashboard). Todo está documentado en
MANUAL_SISTEMA.md del repo AlaskaWildlights/akwl-social-dashboard — léelo
completo antes de hacer nada. Las semanas van de domingo a sábado. El email del
sistema SOLO puede ir a info@alaskawildlights.com.
```

---

## 13. SI ALGO SE ROMPE — diagnóstico rápido

| Síntoma | Revisa primero |
|---------|---------------|
| Email no llegó | Apps Script → Executions: ¿corrió el trigger? ¿hay error rojo? |
| Un valor en 0 | ¿El CSV existe en Drive? ¿Tiene filas con fechas de esa semana? |
| Semana no aparece | ¿El script corrió DESPUÉS del sábado de cierre? (cutoff) |
| CSV ilegible | Es UTF-16 (normal en Meta) — sección 5 |
| Dashboard con datos viejos | El HTML embebe datos; hay que actualizar EMBEDDED_DATA o usar el botón |
| ig_followers en 0 | Falta la fila en Manual Data sheet para esa semana |
| TT no cuadra | Export Lun–Dom vs semana Dom–Sáb — el domingo está en el export anterior |
| Todo desapareció del repo local | El contenedor se reinició — `git fetch origin && git reset --hard origin/<rama>` |
