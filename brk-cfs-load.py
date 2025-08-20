import os
import math
import time
import json
from typing import List, Dict, Any
from datetime import datetime
import requests
from supabase import create_client, Client
from dotenv import load_dotenv


load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
FMP_API_KEY = os.environ["FMP_API_KEY"]  # <— now from .env

# Optional: guardrails
for var in ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FMP_API_KEY"]:
    if not os.getenv(var):
        raise RuntimeError(f"Missing required env var: {var}")

SYMBOL = "BRK-B"          # FMP uses BRK-B for Berkshire Class B  
PERIOD = "quarter"
LIMIT = 80                # Get even more quarters to see if recent data exists
FMP_BASE = "https://financialmodelingprep.com/stable/cash-flow-statement"  # Back to stable API

TABLE = "common_stock_repurchases"

def fetch_fmp_cash_flows(symbol: str, apikey: str, period: str = "quarter", limit: int = 20) -> List[Dict[str, Any]]:
    """Fetch cash-flow statements from FMP."""
    url = (
        f"{FMP_BASE}?symbol={symbol}"
        f"&apikey={apikey}"
        f"&period={period}"
        f"&limit={limit}"
    )
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, list):
        print(f"Warning: Unexpected FMP response type: {type(data)}")
        print(f"Response: {data}")
        return []
    return data

def normalize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map FMP fields into our table schema (one row per quarter)."""
    # Parse dates safely
    def to_date(s: Any):
        if not s:
            return None
        return datetime.fromisoformat(str(s)).date() if " " not in str(s) else datetime.fromisoformat(str(s)).date()

    def to_timestamptz(s: Any):
        if not s:
            return None
        # FMP acceptedDate looks like "YYYY-MM-DD HH:MM:SS" (no TZ). Treat as naive UTC.
        try:
            return datetime.strptime(str(s), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            try:
                return datetime.fromisoformat(str(s))
            except Exception:
                return None

    # Numbers can be None; keep them as-is to respect schema
    common_rep = row.get("commonStockRepurchased")

    accepted_at = to_timestamptz(row.get("acceptedDate"))
    
    return {
        "symbol": row.get("symbol"),
        "date": row.get("date"),  # already ISO date (YYYY-MM-DD)
        "cik": row.get("cik"),
        "reported_currency": row.get("reportedCurrency"),
        "filing_date": row.get("filingDate"),
        "accepted_at": accepted_at.isoformat() if accepted_at else None,
        "fiscal_year": int(row["fiscalYear"]) if row.get("fiscalYear") not in (None, "") else None,
        "period": row.get("period"),
        "common_stock_repurchased": common_rep,
        "raw": row,  # store original payload for audit/debug
        "source": "FMP",
    }

def chunked(iterable: List[Dict[str, Any]], size: int = 500):
    for i in range(0, len(iterable), size):
        yield iterable[i:i+size]

def upsert_rows(sb: Client, rows: List[Dict[str, Any]]):
    """Upsert into Supabase with unique(symbol, date)."""
    if not rows:
        return
    for batch in chunked(rows, 500):
        # Upsert with conflict target "symbol,date"
        (
            sb.table(TABLE)
              .upsert(batch, on_conflict="symbol,date", ignore_duplicates=False)
              .execute()
        )

def test_api_endpoints():
    """Test different API endpoints to find current data."""
    
    # Test different limits to see data availability
    for limit in [10, 20, 40, 80]:
        print(f"\n--- Testing limit={limit} ---")
        try:
            data = fetch_fmp_cash_flows(SYMBOL, FMP_API_KEY, PERIOD, limit)
            if data:
                print(f"Got {len(data)} records")
                print(f"Date range: {data[-1]['date']} to {data[0]['date']}")
            else:
                print("No data returned")
        except Exception as e:
            print(f"Error: {e}")

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Uncomment to test API endpoints
    # test_api_endpoints()
    # return

    print(f"Fetching FMP cash-flows for {SYMBOL} (period={PERIOD}, limit={LIMIT})...")
    data = fetch_fmp_cash_flows(SYMBOL, FMP_API_KEY, PERIOD, LIMIT)
    
    print(f"Fetched {len(data)} quarters of data")

    # Normalize and keep only fields we care about (plus raw)
    rows = [normalize_row(r) for r in data]

    # Optional: filter out rows missing date/symbol
    rows = [r for r in rows if r.get("symbol") and r.get("date")]
    print(f"Processed {len(rows)} valid records")

    print(f"Upserting {len(rows)} rows into {TABLE}...")
    upsert_rows(supabase, rows)
    print("Done.")

    # Quick sanity check: show date range and sample values
    res = (
        supabase.table(TABLE)
        .select("symbol,date,period,fiscal_year,common_stock_repurchased")
        .eq("symbol", SYMBOL)
        .order("date", desc=False)  # Get oldest to newest
        .execute()
    )
    
    if res.data:
        print(f"Date range: {res.data[0]['date']} to {res.data[-1]['date']}")
        print("Sample non-zero repurchases:")
        for r in res.data or []:
            if r.get('common_stock_repurchased', 0) != 0:
                amount_billions = abs(r['common_stock_repurchased']) / 1_000_000_000
                print(f"  {r['period']} {r['fiscal_year']}: ${amount_billions:.1f}B")
    else:
        print("No data found")

if __name__ == "__main__":
    main()