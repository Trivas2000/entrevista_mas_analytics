import io
from datetime import date
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response


# CAMBIAR DPS
CSV_PATH = Path(r"C:\Users\Yoga Slim7\Desktop\Entrevista Mas\CSV\sales_transactions.csv")

CSV_OPTS = dict(
    parse_dates=["date"],
    dtype={
        "transaction_id": "string",
        "store_id": "category",  # Ahorra memoria con muchas filas
        "product_id": "category",
        "category": "category",
        "quantity": "int32",
        "unit_price": "float64",
        "customer_id": "string",
    },
)


def load(source) -> pd.DataFrame:
    df = pd.read_csv(source, **CSV_OPTS)
    df["revenue"] = df["quantity"] * df["unit_price"]
    return df


DATA = load(CSV_PATH)


def agg_by(col: str) -> pd.DataFrame:
    return (
        DATA.groupby(col, observed=True)
        .agg(
            revenue=("revenue", "sum"),
            units=("quantity", "sum"),
            transactions=("transaction_id", "count"),
        )
        .round(2)
        .sort_values("revenue", ascending=False)
        .reset_index()
    )


def as_json(df: pd.DataFrame) -> Response:
    # to_json maneja NaN, categorical y datetime de un toque.
    return Response(df.to_json(orient="records", date_format="iso"), media_type="application/json")


BY_STORE = agg_by("store_id")
BY_CATEGORY = agg_by("category")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/summary")
def summary():
    return {
        "rows": len(DATA),
        "date_range": {
            "start": DATA["date"].min().date().isoformat(),
            "end": DATA["date"].max().date().isoformat(),
        },
        "stores": int(DATA["store_id"].nunique()),
        "products": int(DATA["product_id"].nunique()),
        "categories": int(DATA["category"].nunique()),
        "customers": int(DATA["customer_id"].nunique()),
        "missing_customer_pct": round(float(DATA["customer_id"].isna().mean()) * 100, 2),
        "total_revenue": round(float(DATA["revenue"].sum()), 2),
        "total_units": int(DATA["quantity"].sum()),
    }


@app.get("/top-products")
def top_products(start: date | None = None, end: date | None = None, n: int = Query(10, ge=1, le=100)):
    df = DATA
    if start:
        df = df[df["date"] >= pd.Timestamp(start)]
    if end:
        df = df[df["date"] <= pd.Timestamp(end)]
    return as_json(
        df.groupby("product_id", observed=True)
        .agg(units=("quantity", "sum"), revenue=("revenue", "sum"), category=("category", "first"))
        .round(2)
        .sort_values("units", ascending=False)
        .head(n)
        .reset_index()
    )


@app.get("/sales-by-store")
def sales_by_store():
    return as_json(BY_STORE)


@app.get("/sales-by-category")
def sales_by_category():
    return as_json(BY_CATEGORY)


@app.get("/anomalies")
def anomalies():
    return as_json(DATA[(DATA["quantity"] <= 0) | (DATA["unit_price"] <= 0)])


@app.post("/upload")
async def upload(file: UploadFile):
    global DATA, BY_STORE, BY_CATEGORY
    try:
        df = load(io.BytesIO(await file.read()))
    except Exception as e:
        raise HTTPException(400, f"CSV inválido: {e}")
    DATA = df
    BY_STORE = agg_by("store_id")
    BY_CATEGORY = agg_by("category")
    return {"rows": len(DATA)}
