"""Sube seed/envios.csv a la tabla temporal public.stg_envios por la API REST de Supabase.

Uso:  python scripts/subir_staging.py <url_proyecto> <llave_publicable> <codigo_lote> [csv=seed/envios.csv]

La tabla stg_envios solo acepta inserciones de anon cuyo `lote` coincide con el código de la
política; después de la carga se borra (ver docs/modelo-datos.md, sección Carga).
"""
import csv
import json
import sys
import urllib.error
import urllib.request

LOTE_FILAS = 1000


def main(url: str, llave: str, lote: str, ruta_csv: str = "seed/envios.csv") -> None:
    with open(ruta_csv, newline="", encoding="utf-8") as f:
        filas = [{k: (v if v != "" else None) for k, v in r.items()} | {"lote": lote} for r in csv.DictReader(f)]

    destino = f"{url.rstrip('/')}/rest/v1/stg_envios"
    cabeceras = {"apikey": llave, "Content-Type": "application/json", "Prefer": "return=minimal"}
    for i in range(0, len(filas), LOTE_FILAS):
        cuerpo = json.dumps(filas[i : i + LOTE_FILAS], ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(destino, data=cuerpo, headers=cabeceras, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                estado = r.status
        except urllib.error.HTTPError as e:
            sys.exit(f"Lote {i // LOTE_FILAS + 1} falló: {e.code} {e.read().decode()[:500]}")
        print(f"filas {i + 1}-{min(i + LOTE_FILAS, len(filas))}: HTTP {estado}")
    print(f"{len(filas)} filas subidas")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(*sys.argv[1:5])
