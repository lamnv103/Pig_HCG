from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyswip import Prolog
import threading
import os

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# INIT PROLOG
# =========================
prolog = Prolog()


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RULES_PATH = os.path.join(BASE_DIR, "prolog", "rules.pl")

# Thêm dòng này để ép nó về chuẩn của Prolog:
RULES_PATH = RULES_PATH.replace("\\", "/")

print("Loading Prolog rules...")

prolog.consult(RULES_PATH)

prolog_lock = threading.Lock()

# =========================
# Models
# =========================
class SymptomsInput(BaseModel):
    symptoms: dict

# =========================
# Utils
# =========================
def safe_decode(x):
    return x.decode("utf-8") if isinstance(x, bytes) else str(x)

def clamp_cf(value):
    return max(-1.0, min(1.0, float(value)))

# =========================
# API
# =========================
@app.post("/api/diagnose")
def diagnose_pig(data: SymptomsInput):

    try:
        with prolog_lock:

            # 1. Reset memory
            list(prolog.query("retractall(known(_, _))"))

            # 2. Inject symptoms
# 2. Inject symptoms
            print("--- DỮ LIỆU FRONTEND GỬI LÊN ---")
            print(data.symptoms) # In ra màn hình để debug

            for sym, cf in data.symptoms.items():
                # Thêm chốt chặn: Nếu cf là một dictionary (do bọc 2 lớp), lấy values bên trong ra
                if isinstance(cf, dict):
                    print("Cảnh báo: Dữ liệu bị bọc 2 lớp, đang tự động bóc lớp...")
                    for inner_sym, inner_cf in cf.items():
                        clean_cf = clamp_cf(inner_cf)
                        prolog.assertz(f"known({inner_sym}, {clean_cf})")
                    continue # Bỏ qua vòng lặp ngoài

                # Nếu dữ liệu chuẩn thì chạy bình thường
                clean_cf = clamp_cf(cf)
                prolog.assertz(f"known({sym}, {clean_cf})")

            # 3. Query Prolog
            results = list(prolog.query("diagnose_all(Result)"))

        # =========================
        # Parse result
        # =========================
        response = []

        if results and results[0]['Result']:
            for item in results[0]['Result']:
                disease = safe_decode(item[0])
                cf = float(item[1])
                rules_fired = [safe_decode(r) for r in item[2]]

                response.append({
                    "disease": disease,
                    "confidence": round(cf * 100, 2),
                    "rules_triggered": rules_fired
                })

        return {
            "status": "success",
            "total": len(response),
            "data": response
        }

    except Exception as e:
            import traceback
            traceback.print_exc()  # <--- THÊM DÒNG NÀY ĐỂ IN CHI TIẾT LỖI
            raise HTTPException(status_code=500, detail=str(e))