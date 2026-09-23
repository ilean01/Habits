#!/usr/bin/env python3
"""Asigna de forma administrativa la persona propietaria de una Biblioteca.

Este helper NO contiene correos ni UUIDs hardcodeados. Se ejecuta localmente con
la service role de Supabase y resuelve la cuenta por correo.

Variables requeridas:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  BIBLIOTECA_OWNER_EMAIL

Opcionales:
  BIBLIOTECA_NAME="Mi biblioteca"

Uso seguro:
  # 1) Verificar qué haría, sin modificar nada
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  BIBLIOTECA_OWNER_EMAIL=... \
  BIBLIOTECA_NAME="Biblioteca de mamá" \
  python3 scripts/assign-biblioteca-owner.py

  # 2) Aplicar
  ... python3 scripts/assign-biblioteca-owner.py --apply

Si ya existe otra persona en biblioteca_access(slot=1), el script se detiene.
Usá --force solamente si ya verificaste que ese registro es una asignación
administrativa anterior y NO una biblioteca distinta con datos propios.

Importante: este helper asigna/activa la propiedad y el nombre. No mueve un
catálogo ya importado desde otra persona. Para importar Biblioteca v18, usá el
UUID que imprime este script como BIBLIOTECA_OWNER_ID en
migrate-biblioteca-sqlite.py.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
EMAIL = os.environ.get("BIBLIOTECA_OWNER_EMAIL", "").strip().lower()
NAME = os.environ.get("BIBLIOTECA_NAME", "Mi biblioteca").strip() or "Mi biblioteca"
APPLY = "--apply" in sys.argv
FORCE = "--force" in sys.argv

if not URL or not KEY or not EMAIL:
    sys.exit("Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o BIBLIOTECA_OWNER_EMAIL.")


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


def find_user_by_email(email: str) -> dict:
    page = 1
    while True:
        endpoint = f"{URL}/auth/v1/admin/users?page={page}&per_page=1000"
        payload = request_json("GET", endpoint) or {}
        users = payload.get("users", payload if isinstance(payload, list) else [])
        for user in users:
            if str(user.get("email", "")).strip().lower() == email:
                return user
        if len(users) < 1000:
            break
        page += 1
    raise RuntimeError(f"No existe una cuenta de Habits/Supabase con el correo {email}.")


def rest_get(path: str):
    return request_json("GET", f"{URL}/rest/v1/{path}")


def rest_post(path: str, rows, prefer: str):
    return request_json(
        "POST",
        f"{URL}/rest/v1/{path}",
        rows,
        {"Prefer": prefer},
    )


def main():
    user = find_user_by_email(EMAIL)
    owner_id = user.get("id")
    if not owner_id:
        raise RuntimeError("La cuenta existe, pero Supabase no devolvió su UUID.")

    current = rest_get("biblioteca_access?slot=eq.1&select=user_id") or []
    if current and current[0].get("user_id") != owner_id and not FORCE:
        raise RuntimeError(
            "biblioteca_access(slot=1) ya apunta a otra cuenta. "
            "No se sobrescribió nada. Verificá primero si esa biblioteca tiene datos; "
            "solo después repetí con --force si corresponde."
        )

    print(json.dumps({
        "owner_email": EMAIL,
        "owner_id": owner_id,
        "library_name": NAME,
        "current_slot_owner": current[0].get("user_id") if current else None,
        "apply": APPLY,
    }, ensure_ascii=False, indent=2))

    if not APPLY:
        print("Verificación completada. No se modificó Supabase. Agregá --apply para aplicar.")
        return

    rest_post(
        "biblioteca_access?on_conflict=slot",
        [{"slot": 1, "user_id": owner_id}],
        "resolution=merge-duplicates,return=minimal",
    )

    rest_post(
        "biblioteca_config?on_conflict=owner_id,clave",
        [{"owner_id": owner_id, "clave": "nombre_biblioteca", "valor": NAME}],
        "resolution=merge-duplicates,return=minimal",
    )

    # La selección propia es útil con la migración de bibliotecas por cuenta.
    # Si la tabla todavía no existe, significa que faltan migraciones nuevas y
    # conviene detenerse en vez de dejar el entorno a medias.
    rest_post(
        "biblioteca_seleccion?on_conflict=user_id",
        [{"user_id": owner_id, "owner_id": owner_id}],
        "resolution=merge-duplicates,return=minimal",
    )

    print("Owner configurada correctamente.")
    print(f"Usá BIBLIOTECA_OWNER_ID={owner_id} al importar Biblioteca v18.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.exit(f"ERROR: {exc}")
