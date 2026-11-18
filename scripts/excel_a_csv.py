"""Convierte Book1.xlsx (hojas Pedidos y Supuestos) en CSV limpios para scripts/cargar.sql.

Uso:  python scripts/excel_a_csv.py <ruta/Book1.xlsx> [carpeta_salida=seed]

Los CSV tienen RUT, teléfonos y correos: la carpeta seed/ está en .gitignore y no se sube.
"""
import sys
from pathlib import Path

import pandas as pd

COLUMNAS = {
    "ID Pedido": "id_pedido",
    "Código Seguimiento": "codigo_seguimiento",
    "Fecha Emisión": "fecha_emision",
    "Hora Emisión": "hora_emision",
    "Canal de Venta": "canal_venta",
    "Tipo Cliente": "tipo_cliente",
    "RUT Remitente": "rut_remitente",
    "Nombre Remitente": "nombre_remitente",
    "Teléfono Remitente": "telefono_remitente",
    "Región Origen": "region_origen",
    "Comuna Origen": "comuna_origen",
    "Sucursal Origen": "sucursal_origen",
    "RUT Destinatario": "rut_destinatario",
    "Nombre Destinatario": "nombre_destinatario",
    "Teléfono Destinatario": "telefono_destinatario",
    "Email Destinatario": "email_destinatario",
    "Dirección Destino": "direccion_destino",
    "Comuna Destino": "comuna_destino",
    "Región Destino": "region_destino",
    "Zona Destino": "zona_destino",
    "Tipo Entrega": "tipo_entrega",
    "Sucursal Destino": "sucursal_destino",
    "Tipo Servicio": "tipo_servicio",
    "Tipo Bulto": "tipo_bulto",
    "Contenido Declarado": "contenido_declarado",
    "N° Bultos": "num_bultos",
    "Peso Real (kg)": "peso_real_kg",
    "Largo (cm)": "largo_cm",
    "Ancho (cm)": "ancho_cm",
    "Alto (cm)": "alto_cm",
    "Peso Volumétrico (kg)": "peso_volumetrico_kg",
    "Peso Facturable (kg)": "peso_facturable_kg",
    "Valor Declarado (CLP)": "valor_declarado",
    "Seguro Contratado": "seguro_contratado",
    "Condición de Pago": "condicion_pago",
    "Medio de Pago": "medio_pago",
    "Flete Neto (CLP)": "flete_neto",
    "Costo Seguro (CLP)": "costo_seguro",
    "Total Neto (CLP)": "total_neto",
    "IVA (CLP)": "iva",
    "Total con IVA (CLP)": "total_con_iva",
    "Fecha Comprometida": "fecha_comprometida",
    "Fecha Entrega Real": "fecha_entrega",
    "Estado": "estado",
    "Intentos de Entrega": "intentos_entrega",
    "Motivo Incidencia": "motivo_incidencia",
    "Recibido Por": "recibido_por",
    "Ruta / Conductor": "ruta_conductor",
    "Días Tránsito (hábiles)": "dias_transito",
    "Cumple SLA": "cumple_sla",
    "Calificación Cliente (1-5)": "calificacion",
}

PARAMETROS = {
    "IVA": ("iva", "Tasa de IVA sobre el total neto"),
    "Factor peso volumétrico (cm³/kg)": ("factor_peso_volumetrico", "cm³ por kg: largo × ancho × alto × bultos / factor"),
    "Tasa seguro sobre valor declarado": ("tasa_seguro", "Fracción del valor declarado que se cobra como seguro"),
    "Cobro mínimo seguro (CLP)": ("seguro_minimo_clp", "Cobro mínimo de seguro cuando se contrata (CLP)"),
}


def main(excel: str, salida: str = "seed") -> None:
    out = Path(salida)
    out.mkdir(parents=True, exist_ok=True)

    df = pd.read_excel(excel, sheet_name="Pedidos")
    faltan = set(COLUMNAS) - set(df.columns)
    if faltan:
        sys.exit(f"Faltan columnas en Pedidos: {sorted(faltan)}")
    df = df.rename(columns=COLUMNAS)[list(COLUMNAS.values())]

    for c in ("fecha_emision", "fecha_comprometida", "fecha_entrega"):
        df[c] = pd.to_datetime(df[c]).dt.strftime("%Y-%m-%d")
    df["hora_emision"] = df["hora_emision"].map(lambda t: t.strftime("%H:%M:%S"))
    for c in ("peso_real_kg", "peso_volumetrico_kg", "peso_facturable_kg"):
        df[c] = df[c].map(lambda v: f"{v:.2f}")
    for c in ("dias_transito", "calificacion"):
        df[c] = df[c].astype("Int64")
    df["seguro_contratado"] = df["seguro_contratado"].map({"Sí": "true", "No": "false"})
    if df["seguro_contratado"].isna().any():
        sys.exit("Seguro Contratado tiene valores distintos de Sí/No")
    for c in ("rut_remitente", "rut_destinatario"):
        df[c] = df[c].str.strip().str.upper()

    df.to_csv(out / "envios.csv", index=False)

    sup = pd.read_excel(excel, sheet_name="Supuestos", header=None).iloc[:, 1:3].dropna()
    filas = []
    for nombre, valor in sup.itertuples(index=False):
        if nombre in PARAMETROS:
            clave, desc = PARAMETROS[nombre]
            filas.append({"clave": clave, "valor": valor, "descripcion": desc})
    if len(filas) != len(PARAMETROS):
        sys.exit(f"Supuestos: se esperaban {len(PARAMETROS)} parámetros y hay {len(filas)}")
    pd.DataFrame(filas).to_csv(out / "parametros.csv", index=False)

    print(f"{len(df)} envíos y {len(filas)} parámetros escritos en {out}/")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(*sys.argv[1:3])
