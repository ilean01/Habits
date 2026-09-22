#!/usr/bin/env python3
"""Migra Biblioteca v18 (SQLite + portadas) a las tablas privadas de Supabase.

NO sube biblioteca.db ni las portadas a GitHub. Este script se ejecuta localmente.
Usa solo la librería estándar de Python.

Variables requeridas:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY   # solo local; nunca guardar en Git
  BIBLIOTECA_OWNER_ID         # UUID de auth.users que tendrá la biblioteca

Opcionales:
  BIBLIOTECA_DB=/ruta/biblioteca.db
  BIBLIOTECA_ROOT=/ruta/carpeta-biblioteca  (donde existe static/portadas)

Ejemplo:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... BIBLIOTECA_OWNER_ID=... \
  BIBLIOTECA_DB=/Users/.../biblioteca.db BIBLIOTECA_ROOT=/Users/.../biblioteca \
  python3 scripts/migrate-biblioteca-sqlite.py
"""

from __future__ import annotations

import json
import mimetypes
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
OWNER = os.environ.get("BIBLIOTECA_OWNER_ID", "")
DB = Path(os.environ.get("BIBLIOTECA_DB", "biblioteca.db")).expanduser().resolve()
ROOT = Path(os.environ.get("BIBLIOTECA_ROOT", str(DB.parent))).expanduser().resolve()

if not URL or not KEY or not OWNER:
    sys.exit("Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o BIBLIOTECA_OWNER_ID.")
if not DB.exists():
    sys.exit(f"No existe la base SQLite: {DB}")

REST = f"{URL}/rest/v1"
STORAGE = f"{URL}/storage/v1/object/biblioteca-portadas"


def request_json(method: str, endpoint: str, body=None, headers=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    h = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if headers:
        h.update(headers)
    req = urllib.request.Request(endpoint, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            raw = r.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} {endpoint}: {detail}") from e


def rest_upsert(table: str, rows: list[dict], on_conflict: str, batch=250):
    total = len(rows)
    out = []
    for start in range(0, total, batch):
        chunk = rows[start:start + batch]
        endpoint = f"{REST}/{table}?on_conflict={urllib.parse.quote(on_conflict)}"
        result = request_json(
            "POST", endpoint, chunk,
            {"Prefer": "resolution=merge-duplicates,return=representation"},
        ) or []
        out.extend(result)
        print(f"  {table}: {min(start + len(chunk), total)}/{total}")
    return out


def rest_delete_owner(table: str):
    endpoint = f"{REST}/{table}?owner_id=eq.{urllib.parse.quote(OWNER)}"
    request_json("DELETE", endpoint, headers={"Prefer": "return=minimal"})


def boolv(v):
    return bool(v or 0)


def datev(v):
    v = (str(v).strip() if v is not None else "")
    return v[:10] if v else None


def textv(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def rowdict(r):
    return {k: r[k] for k in r.keys()}


def upload_file(local: Path, object_name: str):
    mime = mimetypes.guess_type(local.name)[0] or "application/octet-stream"
    data = local.read_bytes()
    endpoint = f"{STORAGE}/{urllib.parse.quote(object_name, safe='/')}"
    h = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": mime,
        "x-upsert": "true",
    }
    req = urllib.request.Request(endpoint, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            r.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"No se pudo subir {local}: {e.code} {detail}") from e


def locate_cover(value: str | None):
    value = textv(value)
    if not value or value.startswith("http://") or value.startswith("https://"):
        return None
    candidates = [
        ROOT / value,
        ROOT / "static" / value,
        ROOT / "static" / "portadas" / Path(value).name,
        ROOT / "portadas" / Path(value).name,
    ]
    return next((p for p in candidates if p.exists() and p.is_file()), None)


def main():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")

    print("1/7 Autorizando una sola cuenta para Biblioteca...")
    request_json(
        "POST",
        f"{REST}/biblioteca_access?on_conflict=slot",
        [{"slot": 1, "user_id": OWNER}],
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )

    print("2/7 Migrando libros...")
    libros = []
    cover_sources = {}
    for r in con.execute("SELECT * FROM libros ORDER BY id"):
        d = rowdict(r)
        portada = textv(d.get("portada"))
        local = locate_cover(portada)
        if local:
            suffix = local.suffix.lower() or ".jpg"
            object_name = f"{OWNER}/legacy/{d['id']}{suffix}"
            cover_sources[d["id"]] = (local, object_name)
            portada = object_name
        libros.append({
            "owner_id": OWNER,
            "legacy_id": d["id"],
            "item": d.get("item"),
            "codigo_p": textv(d.get("codigo_p")),
            "dewey": textv(d.get("dewey")),
            "dewey_orden": d.get("dewey_orden"),
            "titulo": textv(d.get("titulo")) or "Sin título",
            "autor": textv(d.get("autor")),
            "genero": textv(d.get("genero")),
            "subdivision": textv(d.get("subdivision")),
            "editorial": textv(d.get("editorial")),
            "paginas": d.get("paginas"),
            "observaciones": textv(d.get("observaciones")),
            "isbn": textv(d.get("isbn")),
            "idioma": textv(d.get("idioma")) or "Español",
            "portada": portada,
            "descripcion": textv(d.get("descripcion")),
            "dedicatoria": textv(d.get("dedicatoria")),
            "rating": d.get("rating"),
            "estado_lectura": textv(d.get("estado_lectura")) or "no_leido",
            "pagina_actual": d.get("pagina_actual"),
            "lista": textv(d.get("lista")) or "catalogo",
            "relacionados": textv(d.get("relacionados")),
            "fecha_agregado": datev(d.get("fecha_agregado")),
            "fecha_inicio": datev(d.get("fecha_inicio")),
            "fecha_fin": datev(d.get("fecha_fin")),
            "autografiado": boolv(d.get("autografiado")),
            "favorito": boolv(d.get("favorito")),
            "proxima_lectura": boolv(d.get("proxima_lectura")),
            "eliminado": boolv(d.get("eliminado")),
            "fecha_eliminado": textv(d.get("fecha_eliminado")),
        })
    inserted = rest_upsert("biblioteca_libros", libros, "owner_id,legacy_id")
    book_map = {int(x["legacy_id"]): int(x["id"]) for x in inserted if x.get("legacy_id") is not None}
    if len(book_map) != len(libros):
        # recupera el mapa completo si PostgREST devolvió menos filas por configuración.
        result = request_json("GET", f"{REST}/biblioteca_libros?owner_id=eq.{OWNER}&select=id,legacy_id") or []
        book_map = {int(x["legacy_id"]): int(x["id"]) for x in result if x.get("legacy_id") is not None}

    print("3/7 Subiendo portadas privadas...")
    for i, (legacy_id, (local, object_name)) in enumerate(cover_sources.items(), 1):
        upload_file(local, object_name)
        print(f"  portadas: {i}/{len(cover_sources)} · {local.name}")

    print("4/7 Migrando personas y préstamos...")
    personas = []
    for r in con.execute("SELECT * FROM personas ORDER BY id"):
        d = rowdict(r)
        personas.append({
            "owner_id": OWNER, "legacy_id": d["id"],
            "nombre": textv(d.get("nombre")) or "Sin nombre",
            "telefono": textv(d.get("telefono")),
            "notas": textv(d.get("notas")),
            "fecha_creado": textv(d.get("fecha_creado")),
        })
    person_rows = rest_upsert("biblioteca_personas", personas, "owner_id,legacy_id") if personas else []
    person_map = {int(x["legacy_id"]): int(x["id"]) for x in person_rows if x.get("legacy_id") is not None}
    name_to_person = {x["nombre"].strip().casefold(): x["id"] for x in person_rows if x.get("nombre")}

    prestamos = []
    for r in con.execute("SELECT * FROM prestamos ORDER BY id"):
        d = rowdict(r)
        persona = textv(d.get("persona")) or "Sin nombre"
        prestamos.append({
            "owner_id": OWNER, "legacy_id": d["id"],
            "libro_id": book_map[d["libro_id"]],
            "persona": persona,
            "persona_id": name_to_person.get(persona.strip().casefold()),
            "fecha_prestamo": datev(d.get("fecha_prestamo")),
            "fecha_devolucion_prevista": datev(d.get("fecha_devolucion_prevista")),
            "fecha_devuelto": datev(d.get("fecha_devuelto")),
            "notas": textv(d.get("notas")),
            "activo": boolv(d.get("activo")),
            "estado": textv(d.get("estado")) or ("prestado" if boolv(d.get("activo")) else "devuelto"),
            "estado_devolucion": textv(d.get("estado_devolucion")),
        })
    if prestamos:
        rest_upsert("biblioteca_prestamos", prestamos, "owner_id,legacy_id")

    print("5/7 Migrando historial de lectura...")
    lecturas = []
    for r in con.execute("SELECT * FROM lecturas ORDER BY id"):
        d = rowdict(r)
        lecturas.append({
            "owner_id": OWNER, "legacy_id": d["id"],
            "libro_id": book_map[d["libro_id"]],
            "fecha": datev(d.get("fecha")),
            "pagina": d.get("pagina"),
            "paginas_leidas": d.get("paginas_leidas") or 0,
        })
    if lecturas:
        rest_upsert("biblioteca_lecturas", lecturas, "owner_id,legacy_id")

    finalizadas = []
    for r in con.execute("SELECT * FROM lecturas_finalizadas ORDER BY id"):
        d = rowdict(r)
        finalizadas.append({
            "owner_id": OWNER, "legacy_id": d["id"],
            "libro_id": book_map[d["libro_id"]],
            "fecha_inicio": datev(d.get("fecha_inicio")),
            "fecha_fin": datev(d.get("fecha_fin")),
            "tiempo_lectura": textv(d.get("tiempo_lectura")),
            "dias_lectura": d.get("dias_lectura"),
            "comentario": textv(d.get("comentario")),
        })
    if finalizadas:
        rest_upsert("biblioteca_lecturas_finalizadas", finalizadas, "owner_id,legacy_id")

    print("6/7 Migrando configuración...")
    configs = []
    for r in con.execute("SELECT clave, valor FROM config ORDER BY clave"):
        configs.append({"owner_id": OWNER, "clave": r["clave"], "valor": r["valor"]})
    if configs:
        rest_upsert("biblioteca_config", configs, "owner_id,clave")

    print("7/7 Verificación...")
    counts = {}
    for table in ("biblioteca_libros", "biblioteca_lecturas", "biblioteca_lecturas_finalizadas", "biblioteca_personas", "biblioteca_prestamos", "biblioteca_config"):
        rows = request_json("GET", f"{REST}/{table}?owner_id=eq.{OWNER}&select=id") or []
        counts[table] = len(rows)
    con.close()
    print(json.dumps(counts, indent=2, ensure_ascii=False))
    print("Migración terminada. No borres la SQLite original hasta revisar la app en Supabase.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
