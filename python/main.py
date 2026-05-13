# python/main.py
# =========================================================
# PIG DISEASE AI - UNIFIED API (Main nằm trong thư mục python/)
# =========================================================

import io
import json
import os
from pathlib import Path
import threading

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import torch.nn as nn
import torch.nn.functional as F

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0
from pydantic import BaseModel
from pyswip import Prolog

# =========================================================
# CONFIG - ĐƯỜNG DẪN TỪ THƯ MỤC python/
# =========================================================

# Lấy đường dẫn gốc của project (một level lên từ python/)
BASE_DIR = Path(__file__).parent.parent.absolute()

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

MODEL_PATH = BASE_DIR / "outputs" / "protonet" / "best_encoder.pth"
PROTO_PATH = BASE_DIR / "outputs" / "protonet" / "prototypes.pt"
RULES_PATH = BASE_DIR / "prolog" / "rules.pl"
KNOWLEDGE_PATH = BASE_DIR / "data" / "pig_diagnostic_expert_system_v4_expanded.json"

IMAGE_SIZE = 224

print(f"📂 Project root: {BASE_DIR}")
print(f"📍 Model path : {MODEL_PATH}")
print(f"📍 Rules path : {RULES_PATH}")
print(f"📍 Knowledge  : {KNOWLEDGE_PATH}")

# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(title="Pig Disease AI - Unified API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# 1. PROTO NET - IMAGE CLASSIFICATION
# =========================================================

transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

class ProtoEncoder(nn.Module):
    def __init__(self, embed_dim=256):
        super().__init__()
        backbone = efficientnet_b0(weights=None)
        in_feat = backbone.classifier[1].in_features
        backbone.classifier = nn.Identity()

        self.backbone = backbone
        hidden = 512

        self.projector = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_feat, hidden),
            nn.BatchNorm1d(hidden),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Linear(hidden, embed_dim),
        )

    def forward(self, x):
        feat = self.backbone(x)
        feat = self.projector(feat)
        return F.normalize(feat, p=2, dim=-1)

# Load model
print("\n🚀 Loading ProtoNet model...")
ckpt = torch.load(MODEL_PATH, map_location=DEVICE)
class_names = ckpt["class_names"]
embed_dim = ckpt["embed_dim"]

model = ProtoEncoder(embed_dim=embed_dim).to(DEVICE)
model.load_state_dict(ckpt["state_dict"])
model.eval()

prototypes = torch.load(PROTO_PATH, map_location=DEVICE)
prototypes = F.normalize(prototypes, p=2, dim=-1)

print(f"✅ ProtoNet loaded successfully: {len(class_names)} classes | Device: {DEVICE}")

# Vietnamese mapping
VIETNAMESE_NAMES = {
    "Healthy": "Da khỏe mạnh",
    "Infected_Bacterial_Erysipelas": "Nhiễm khuẩn đóng dấu lợn",
    "Infected_Bacterial_Greasy_Pig_Disease": "Bệnh da nhờn do vi khuẩn",
    "Infected_Environmental_Dermatitis": "Viêm da do môi trường",
    "Infected_Environmental_Sunburn": "Cháy nắng trên da",
    "Infected_Fungal_Pityriasis_Rosea": "Nấm hồng da",
    "Infected_Fungal_Ringworm": "Nấm da hắc lào",
    "Infected_Parasitic_Mange": "Ghẻ ký sinh",
    "Infected_Viral_Foot_and_Mouth_Disease": "Lở mồm long móng",
    "Infected_Viral_Swinepox": "Đậu mùa lợn"
}

# Ánh xạ từ English class name → Disease ID (knowledge base)
ENGLISH_TO_DISEASE_ID = {
    "Healthy":                               None,
    "Infected_Bacterial_Erysipelas":         "dis_erysipelas",
    "Infected_Bacterial_Greasy_Pig_Disease": "dis_greasy_pig",
    "Infected_Environmental_Dermatitis":     "dis_env_dermatitis",
    "Infected_Environmental_Sunburn":        "dis_sunburn",
    "Infected_Fungal_Pityriasis_Rosea":      "dis_pityriasis_rosea",
    "Infected_Fungal_Ringworm":              "dis_ringworm",
    "Infected_Parasitic_Mange":              "dis_sarcoptic_mange",
    "Infected_Viral_Foot_and_Mouth_Disease": "dis_fmd",
    "Infected_Viral_Swinepox":               "dis_swinepox",
}

def load_disease_details_from_kb():
    try:
        with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
            knowledge_base = json.load(f)

        details = {}
        for disease in knowledge_base.get("diseases", []):
            disease_id = disease.get("id")
            if not disease_id:
                continue

            details[disease_id] = {
                "name": disease.get("name"),
                "group": disease.get("group"),
                "age_focus": disease.get("age_focus"),
                "hallmark": disease.get("hallmark"),
                "cause": disease.get("cause"),
                "prevention": disease.get("prevention"),
                "treatment": disease.get("treatment") or disease.get("treatment_principle"),
            }

        print(f"✅ Loaded {len(details)} disease details from knowledge base")
        return details
    except Exception as exc:
        print(f"⚠️ Cannot load knowledge base details: {exc}")
        return {}

# Chi tiết bệnh (phác đồ) để trả về cùng kết quả AI
DISEASE_DETAILS = {
    "dis_erysipelas": {
        "name": "Đóng dấu son",
        "hallmark": "Sốt cao, dấu đỏ/tím hình thoi trên da, có thể sưng khớp.",
        "cause": "Erysipelothrix rhusiopathiae.",
        "prevention": "Vaccine, sát trùng, giảm stress.",
        "treatment": "Kháng sinh theo thú y, hạ sốt và trợ sức.",
    },
    "dis_greasy_pig": {
        "name": "Bệnh heo da dầu (Exudative epidermitis)",
        "hallmark": "Da ẩm nhớt, nâu đen, mùi hôi, heo yếu nhanh.",
        "cause": "Staphylococcus hyicus sinh độc tố.",
        "prevention": "Giảm trầy xước, vệ sinh chuồng và kiểm soát bội nhiễm.",
        "treatment": "Kháng sinh, sát trùng và chăm sóc da theo thú y.",
    },
    "dis_env_dermatitis": {
        "name": "Viêm da do môi trường",
        "hallmark": "Da viêm đỏ, nứt nẻ, ẩm ướt ở vùng tiếp xúc nền chuồng bẩn.",
        "cause": "Tiếp xúc kéo dài với nền ẩm, phân nước hoặc chất kích ứng.",
        "prevention": "Giữ nền chuồng khô ráo sạch sẽ; giảm mật độ nuôi; vệ sinh định kỳ.",
        "treatment": "Làm sạch và sát trùng vùng da tổn thương, bôi kem kháng viêm/kháng khuẩn theo thú y; cải thiện môi trường nuôi.",
    },
    "dis_sunburn": {
        "name": "Cháy nắng trên da",
        "hallmark": "Da đỏ, phồng rộp, bong tróc ở vùng hở sau tiếp xúc nắng mạnh.",
        "cause": "Bức xạ UV cường độ cao chiếu trực tiếp lên da thiếu sắc tố melanin.",
        "prevention": "Cung cấp bóng râm đầy đủ, tránh chăn thả lúc nắng gắt 10h-15h.",
        "treatment": "Chuyển lợn vào bóng râm ngay; chườm mát; bôi thuốc làm dịu và chống nhiễm trùng vết phồng rộp.",
    },
    "dis_pityriasis_rosea": {
        "name": "Nấm hồng da (Pityriasis Rosea)",
        "hallmark": "Các vòng tròn hồng/đỏ nổi rõ rìa, lan ra ngoài, thường ở bụng và sườn.",
        "cause": "Nguyên nhân chưa rõ; nghi liên quan yếu tố di truyền và một số virus.",
        "prevention": "Không có biện pháp phòng đặc hiệu; vệ sinh chuồng và giảm stress.",
        "treatment": "Thường tự khỏi trong 6-8 tuần. Điều trị hỗ trợ: giữ da sạch, tránh bội nhiễm.",
    },
    "dis_ringworm": {
        "name": "Nấm da hắc lào (Dermatophytosis)",
        "hallmark": "Vảy tròn rụng lông thành mảng, ngứa nhẹ, lan rộng dần.",
        "cause": "Nấm Microsporum hoặc Trichophyton xâm nhiễm lớp keratin da và lông.",
        "prevention": "Cách ly lợn mới nhập, vệ sinh dụng cụ chăm sóc; tránh độ ẩm cao kéo dài.",
        "treatment": "Điều trị nấm bằng thuốc chống nấm (griseofulvin, itraconazole) theo thú y.",
    },
    "dis_sarcoptic_mange": {
        "name": "Ghẻ Sarcoptes",
        "hallmark": "Ngứa dữ dội, cọ xát, đóng vảy, dày sừng.",
        "cause": "Sarcoptes scabiei var. suis.",
        "prevention": "Tẩy ghẻ định kỳ, vệ sinh chuồng, cách ly đàn mới nhập.",
        "treatment": "Điều trị ký sinh trùng theo thú y cho cả đàn liên quan và xử lý môi trường.",
    },
    "dis_fmd": {
        "name": "Lở mồm long móng (FMD)",
        "hallmark": "Mụn nước ở mõm/kẽ móng, loét, đi thọt, sùi bọt mép.",
        "cause": "Virus FMD.",
        "prevention": "Vaccine và kiểm soát tiếp xúc/di chuyển đàn.",
        "treatment": "Điều trị triệu chứng, sát trùng vết loét, giảm đau và ngừa bội nhiễm theo thú y.",
    },
    "dis_swinepox": {
        "name": "Đậu mùa lợn (Swinepox)",
        "hallmark": "Mụn nước nhỏ → đóng vảy nâu đen rải rác toàn thân, có thể kèm sốt nhẹ.",
        "cause": "Swinepox virus (Suipoxvirus), lây qua tiếp xúc hoặc ký sinh trùng (rận heo).",
        "prevention": "Kiểm soát ký sinh trùng (rận, ghẻ); vệ sinh chuồng; cách ly lợn bệnh.",
        "treatment": "Không có thuốc đặc hiệu; điều trị hỗ trợ, ngăn bội nhiễm bằng sát trùng da.",
    },
}

DISEASE_DETAILS.update(load_disease_details_from_kb())


# =========================================================
# 2. PROLOG EXPERT SYSTEM
# =========================================================

prolog = Prolog()
prolog.consult(str(RULES_PATH).replace("\\", "/"))
prolog_lock = threading.Lock()

class SymptomsInput(BaseModel):
    symptoms: dict

def safe_decode(x):
    return x.decode("utf-8") if isinstance(x, bytes) else str(x)

def clamp_cf(value):
    return max(-1.0, min(1.0, float(value)))

# =========================================================
# API ROUTES
# =========================================================

@app.get("/")
def home():
    return {
        "message": "🐷 Pig Disease AI API Running",
        "features": ["Image Classification", "Symptom-based Diagnosis"],
        "device": DEVICE,
        "num_classes": len(class_names)
    }

@app.post("/api/predict")
async def predict_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        x = transform(image).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            emb = model(x)
            logits = torch.mm(emb, prototypes.T) * 10.0
            probs = F.softmax(logits, dim=1)

            conf, pred = torch.max(probs, dim=1)
            pred_idx = pred.item()

        english_name = class_names[pred_idx]
        disease_name = VIETNAMESE_NAMES.get(english_name, english_name)
        confidence = round(float(conf.item()) * 100, 2)

        topk = torch.topk(probs, k=min(3, len(class_names)))
        top_results = [
            {
                "disease": VIETNAMESE_NAMES.get(class_names[idx.item()], class_names[idx.item()]),
                "confidence": round(float(score.item()) * 100, 2)
            }
            for score, idx in zip(topk.values[0], topk.indices[0])
        ]

        disease_id = ENGLISH_TO_DISEASE_ID.get(english_name)
        disease_detail = DISEASE_DETAILS.get(disease_id) if disease_id else None

        return {
            "success": True,
            "predicted_class": disease_name,
            "english_name": english_name,
            "confidence": confidence,
            "top_predictions": top_results,
            "disease_id": disease_id,
            "disease_detail": disease_detail,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/diagnose")
def diagnose_pig(data: SymptomsInput):
    try:
        with prolog_lock:
            list(prolog.query("retractall(known(_, _))"))

            for sym, cf in data.symptoms.items():
                if isinstance(cf, dict):
                    for inner_sym, inner_cf in cf.items():
                        clean_cf = clamp_cf(inner_cf)
                        prolog.assertz(f"known({inner_sym}, {clean_cf})")
                    continue

                clean_cf = clamp_cf(cf)
                prolog.assertz(f"known({sym}, {clean_cf})")

            results = list(prolog.query("diagnose_all(Result)"))

        response = []
        if results and results[0].get('Result'):
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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
