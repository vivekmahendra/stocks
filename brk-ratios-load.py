import os
import math
import time
import json
from typing import List, Dict, Any, Union, Optional
from datetime import datetime
import requests
from supabase import create_client, Client
from dotenv import load_dotenv


load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
FMP_API_KEY = os.environ["FMP_API_KEY"]

# Optional: guardrails
for var in ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FMP_API_KEY"]:
    if not os.getenv(var):
        raise RuntimeError(f"Missing required env var: {var}")

SYMBOL = "BRK-B"          # FMP uses BRK-B for Berkshire Class B  
PERIOD = "quarter"
LIMIT = 80                # Get many quarters of historical data
FMP_BASE = "https://financialmodelingprep.com/stable/ratios"

TABLE = "financial_ratios"

def fetch_fmp_ratios(symbol: str, apikey: str, period: str = "quarter", limit: int = 20) -> List[Dict[str, Any]]:
    """Fetch financial ratios from FMP."""
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
    
    def safe_float(value: Any) -> Optional[float]:
        """Safely convert value to float, return None if invalid."""
        if value is None or value == "":
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def safe_int(value: Any) -> Optional[int]:
        """Safely convert value to int, return None if invalid."""
        if value is None or value == "":
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
    
    return {
        "symbol": row.get("symbol"),
        "date": row.get("date"),  # Already ISO date (YYYY-MM-DD)
        "fiscal_year": safe_int(row.get("fiscalYear")),
        "period": row.get("period"),
        "reported_currency": row.get("reportedCurrency", "USD"),
        
        # Key ratios we're targeting
        "book_value_per_share": safe_float(row.get("bookValuePerShare")),
        "price_to_book_ratio": safe_float(row.get("priceToBookRatio")),
        
        # Additional important ratios
        "price_to_earnings_ratio": safe_float(row.get("priceToEarningsRatio")),
        "price_to_sales_ratio": safe_float(row.get("priceToSalesRatio")),
        "net_profit_margin": safe_float(row.get("netProfitMargin")),
        "gross_profit_margin": safe_float(row.get("grossProfitMargin")),
        "operating_profit_margin": safe_float(row.get("operatingProfitMargin")),
        "debt_to_equity_ratio": safe_float(row.get("debtToEquityRatio")),
        "current_ratio": safe_float(row.get("currentRatio")),
        "quick_ratio": safe_float(row.get("quickRatio")),
        
        # Per share metrics
        "revenue_per_share": safe_float(row.get("revenuePerShare")),
        "net_income_per_share": safe_float(row.get("netIncomePerShare")),
        "cash_per_share": safe_float(row.get("cashPerShare")),
        "free_cash_flow_per_share": safe_float(row.get("freeCashFlowPerShare")),
        
        # Metadata
        "source": "FMP",
        "raw_data": row,  # Store original payload for audit/debug
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
            data = fetch_fmp_ratios(SYMBOL, FMP_API_KEY, PERIOD, limit)
            if data:
                print(f"Got {len(data)} records")
                print(f"Date range: {data[-1]['date']} to {data[0]['date']}")
                # Show sample of key ratios
                latest = data[0]
                print(f"Latest BVPS: ${latest.get('bookValuePerShare', 'N/A')}")
                print(f"Latest P/B: {latest.get('priceToBookRatio', 'N/A')}")
            else:
                print("No data returned")
        except Exception as e:
            print(f"Error: {e}")

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Uncomment to test API endpoints
    # test_api_endpoints()
    # return

    print(f"Fetching FMP financial ratios for {SYMBOL} (period={PERIOD}, limit={LIMIT})...")
    data = fetch_fmp_ratios(SYMBOL, FMP_API_KEY, PERIOD, LIMIT)
    
    print(f"Fetched {len(data)} quarters of ratios data")

    # Normalize and keep only fields we care about (plus raw)
    rows = [normalize_row(r) for r in data]

    # Optional: filter out rows missing essential fields
    rows = [r for r in rows if r.get("symbol") and r.get("date")]
    print(f"Processed {len(rows)} valid records")

    print(f"Upserting {len(rows)} rows into {TABLE}...")
    upsert_rows(supabase, rows)
    print("Done.")

    # Quick sanity check: show date range and sample values
    res = (
        supabase.table(TABLE)
        .select("symbol,date,period,fiscal_year,book_value_per_share,price_to_book_ratio")
        .eq("symbol", SYMBOL)
        .order("date", desc=False)  # Get oldest to newest
        .execute()
    )
    
    if res.data:
        print(f"\nStored data range: {res.data[0]['date']} to {res.data[-1]['date']}")
        print("Sample recent ratios:")
        for r in res.data[-5:] or []:  # Show last 5 records
            bvps = r.get('book_value_per_share')
            pb = r.get('price_to_book_ratio')
            bvps_str = f"${bvps:.2f}" if bvps is not None else "N/A"
            pb_str = f"{pb:.2f}" if pb is not None else "N/A"
            print(f"  {r['period']} {r['fiscal_year']}: BVPS={bvps_str}, P/B={pb_str}")
    else:
        print("No data found in database")

if __name__ == "__main__":
    main()