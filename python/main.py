# python/main.py
# =========================================================
# PIG DISEASE AI - UNIFIED API (Main nằm trong thư mục python/)
# =========================================================

import io
import json
import os
from pathlib import Path
import re
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
# CONFIG - ĐƯỜNG DẪN & CLOUD ENV
# =========================================================

APP_DIR = Path(__file__).parent.absolute()

def parse_allowed_origins():
    raw_origins = os.getenv("FRONTEND_ORIGINS", "")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    if origins:
        return origins

    # Local/dev fallback. Khi deploy, set FRONTEND_ORIGINS bằng link Vercel thật.
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

def resolve_project_dir():
    candidates = [
        APP_DIR,          # Docker/Hugging Face: /app/main.py + /app/prolog + /app/outputs
        APP_DIR.parent,   # Local repo: project/python/main.py + project/prolog + project/outputs
    ]

    for candidate in candidates:
        if (
            (candidate / "prolog" / "rules.pl").exists()
            and (candidate / "outputs" / "protonet" / "best_encoder.pth").exists()
        ):
            return candidate

    # Fallback để log đường dẫn dễ debug nếu thiếu model/tri thức trên cloud.
    return APP_DIR

BASE_DIR = resolve_project_dir()
ALLOWED_ORIGINS = parse_allowed_origins()

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
print(f"🌐 CORS origins: {ALLOWED_ORIGINS}")

# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(title="Pig Disease AI - Unified API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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

class KnowledgeRuleInput(BaseModel):
    rule_id: str
    if_symptoms: list[str]
    then_disease: str
    cf: float
    priority: int = 2

class KnowledgeSymptomInput(BaseModel):
    id: str
    question: str

class KnowledgeDiseaseInput(BaseModel):
    id: str
    name: str
    group: str = "custom"
    age_focus: str = "chưa xác định"
    hallmark: str = ""
    cause: str = ""
    prevention: str = ""
    treatment: str = ""
    cf_threshold: float = 0.7

def safe_decode(x):
    return x.decode("utf-8") if isinstance(x, bytes) else str(x)

def clamp_cf(value):
    return max(-1.0, min(1.0, float(value)))

def clamp_probability(value):
    return max(0.0, min(1.0, float(value)))

def validate_prolog_id(value, field_name="id"):
    clean_value = str(value).strip()
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", clean_value):
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} chỉ được dùng chữ cái, số, dấu gạch dưới và phải bắt đầu bằng chữ cái.",
        )
    return clean_value

def prolog_text(value):
    return str(value or "").replace("\\", "\\\\").replace("'", "\\'")

def quoted_atom(value, field_name="id"):
    return f"'{prolog_text(validate_prolog_id(value, field_name))}'"

def plain_atom(value, field_name="id"):
    return validate_prolog_id(value, field_name)

def fuzzy_label(cf):
    cf = float(cf)
    if cf >= 0.85:
        return "rất mạnh"
    if cf >= 0.6:
        return "mạnh"
    if cf >= 0.3:
        return "trung bình"
    if cf > 0:
        return "yếu"
    if cf == 0:
        return "không rõ"
    return "phủ định"

def load_symptoms_into_prolog(symptoms):
    list(prolog.query("retractall(known(_, _))"))

    for sym, cf in symptoms.items():
        if isinstance(cf, dict):
            for inner_sym, inner_cf in cf.items():
                clean_cf = clamp_cf(inner_cf)
                prolog.assertz(f"known({inner_sym}, {clean_cf})")
            continue

        clean_cf = clamp_cf(cf)
        prolog.assertz(f"known({sym}, {clean_cf})")

def flatten_symptoms(symptoms):
    flattened = {}
    for sym, cf in symptoms.items():
        if isinstance(cf, dict):
            for inner_sym, inner_cf in cf.items():
                flattened[inner_sym] = clamp_cf(inner_cf)
            continue
        flattened[sym] = clamp_cf(cf)
    return flattened

def prolog_list_to_python(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [safe_decode(item) for item in value]
    return [safe_decode(value)]

def get_rule_detail(rule_id):
    safe_rule_id = str(rule_id).replace("'", "\\'")
    query = f"rule('{safe_rule_id}', Symptoms, Disease, CF, Priority)"
    rows = list(prolog.query(query))
    if not rows:
        return None

    row = rows[0]
    return {
        "rule_id": safe_decode(rule_id),
        "symptoms": prolog_list_to_python(row.get("Symptoms")),
        "disease": safe_decode(row.get("Disease")),
        "cf": float(row.get("CF", 0)),
        "priority": int(row.get("Priority", 1)),
    }

def build_uncertainty_report(disease_id, cf_score, rules_fired, user_symptoms):
    rule_details = [detail for rule_id in rules_fired if (detail := get_rule_detail(rule_id))]
    evidence_items = []
    fuzzy_rule_scores = []
    bayes_complements = []

    for detail in rule_details:
        symptom_values = [
            max(0.0, float(user_symptoms.get(symptom_id, 0)))
            for symptom_id in detail["symptoms"]
        ]
        fuzzy_score = min(symptom_values) if symptom_values else 0.0
        fuzzy_rule_scores.append(fuzzy_score)

        weighted_likelihood = clamp_probability(detail["cf"] * fuzzy_score)
        bayes_complements.append(1.0 - weighted_likelihood)

        evidence_items.append({
            "rule_id": detail["rule_id"],
            "base_cf": round(detail["cf"], 3),
            "priority": detail["priority"],
            "fuzzy_match": round(fuzzy_score * 100, 2),
            "symptoms": [
                {
                    "id": symptom_id,
                    "cf": round(float(user_symptoms.get(symptom_id, 0)), 3),
                    "fuzzy_label": fuzzy_label(user_symptoms.get(symptom_id, 0)),
                }
                for symptom_id in detail["symptoms"]
            ],
        })

    fuzzy_score = max(fuzzy_rule_scores) if fuzzy_rule_scores else cf_score
    bayes_score = 0.0
    if bayes_complements:
        product = 1.0
        for complement in bayes_complements:
            product *= complement
        bayes_score = 1.0 - product

    return {
        "disease_id": disease_id,
        "cf_score": round(cf_score * 100, 2),
        "fuzzy_score": round(fuzzy_score * 100, 2),
        "bayes_score": round(bayes_score * 100, 2),
        "note": "CF là điểm chính của hệ chuyên gia; fuzzy và Bayes là điểm tham khảo để giải thích mức khớp triệu chứng.",
        "evidence": evidence_items,
    }

def load_knowledge_base():
    with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def collect_prolog_rules():
    rows = list(prolog.query("rule(RuleId, Symptoms, Disease, CF, Priority)"))
    rules = []
    for row in rows:
        rules.append({
            "rule_id": safe_decode(row.get("RuleId")),
            "if": prolog_list_to_python(row.get("Symptoms")),
            "then": safe_decode(row.get("Disease")),
            "cf": float(row.get("CF", 0)),
            "priority": int(row.get("Priority", 1)),
        })
    return rules

def collect_prolog_symptoms():
    rows = list(prolog.query("symptom(SymptomId, Question)"))
    symptoms = []
    for row in rows:
        symptoms.append({
            "id": safe_decode(row.get("SymptomId")),
            "question": safe_decode(row.get("Question")),
        })
    return symptoms

def collect_prolog_diseases():
    rows = list(prolog.query("disease(Id, Name, Group, AgeFocus, Hallmark, Cause, Prevention, Treatment, Threshold)"))
    diseases = []
    for row in rows:
        diseases.append({
            "id": safe_decode(row.get("Id")),
            "name": safe_decode(row.get("Name")),
            "group": safe_decode(row.get("Group")),
            "age_focus": safe_decode(row.get("AgeFocus")),
            "hallmark": safe_decode(row.get("Hallmark")),
            "cause": safe_decode(row.get("Cause")),
            "prevention": safe_decode(row.get("Prevention")),
            "treatment": safe_decode(row.get("Treatment")),
            "cf_threshold": float(row.get("Threshold", 0)),
        })
    return diseases

def upsert_prolog_symptom(payload: KnowledgeSymptomInput):
    symptom_id = plain_atom(payload.id, "symptom id")
    question = prolog_text(payload.question)
    if not question.strip():
        raise HTTPException(status_code=400, detail="Câu hỏi triệu chứng không được để trống.")

    list(prolog.query(f"retractall(symptom({symptom_id}, _))"))
    prolog.assertz(f"symptom({symptom_id}, '{question}')")
    return {"id": symptom_id, "question": payload.question}

def delete_prolog_symptom(symptom_id: str):
    clean_id = plain_atom(symptom_id, "symptom id")
    list(prolog.query(f"retractall(symptom({clean_id}, _))"))
    return clean_id

def upsert_prolog_disease(payload: KnowledgeDiseaseInput):
    disease_id = plain_atom(payload.id, "disease id")
    threshold = clamp_probability(payload.cf_threshold)
    values = [
        payload.name,
        payload.group,
        payload.age_focus,
        payload.hallmark,
        payload.cause,
        payload.prevention,
        payload.treatment,
    ]
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Tên bệnh không được để trống.")

    escaped_values = [f"'{prolog_text(value)}'" for value in values]
    list(prolog.query(f"retractall(disease({disease_id}, _, _, _, _, _, _, _, _))"))
    prolog.assertz(
        f"disease({disease_id}, {escaped_values[0]}, {escaped_values[1]}, {escaped_values[2]}, "
        f"{escaped_values[3]}, {escaped_values[4]}, {escaped_values[5]}, {escaped_values[6]}, {threshold})"
    )
    return {
        "id": disease_id,
        "name": payload.name,
        "group": payload.group,
        "age_focus": payload.age_focus,
        "hallmark": payload.hallmark,
        "cause": payload.cause,
        "prevention": payload.prevention,
        "treatment": payload.treatment,
        "cf_threshold": threshold,
    }

def delete_prolog_disease(disease_id: str):
    clean_id = plain_atom(disease_id, "disease id")
    list(prolog.query(f"retractall(disease({clean_id}, _, _, _, _, _, _, _, _))"))
    return clean_id

def upsert_prolog_rule(payload: KnowledgeRuleInput):
    rule_id = quoted_atom(payload.rule_id, "rule id")
    symptoms = [plain_atom(symptom_id, "symptom id") for symptom_id in payload.if_symptoms]
    disease_id = plain_atom(payload.then_disease, "disease id")
    cf = clamp_probability(payload.cf)
    priority = max(1, min(3, int(payload.priority)))

    if not symptoms:
        raise HTTPException(status_code=400, detail="Luật cần ít nhất một triệu chứng IF.")

    symptoms_list = "[" + ",".join(symptoms) + "]"
    list(prolog.query(f"retractall(rule({rule_id}, _, _, _, _))"))
    prolog.assertz(f"rule({rule_id}, {symptoms_list}, {disease_id}, {cf}, {priority})")
    return {
        "rule_id": payload.rule_id,
        "if": symptoms,
        "then": disease_id,
        "cf": cf,
        "priority": priority,
    }

def delete_prolog_rule(rule_id: str):
    clean_rule_id = quoted_atom(rule_id, "rule id")
    list(prolog.query(f"retractall(rule({clean_rule_id}, _, _, _, _))"))
    return rule_id

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

@app.get("/api/knowledge")
def get_knowledge():
    try:
        knowledge_base = load_knowledge_base()
        return {
            "status": "success",
            "metadata": knowledge_base.get("metadata", {}),
            "symptoms": collect_prolog_symptoms(),
            "diseases": collect_prolog_diseases(),
            "rules": collect_prolog_rules(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/knowledge/symptoms")
def save_knowledge_symptom(payload: KnowledgeSymptomInput):
    try:
        with prolog_lock:
            symptom = upsert_prolog_symptom(payload)
        return {"status": "success", "symptom": symptom}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/knowledge/symptoms/{symptom_id}")
def remove_knowledge_symptom(symptom_id: str):
    try:
        with prolog_lock:
            deleted_id = delete_prolog_symptom(symptom_id)
        return {"status": "success", "deleted_id": deleted_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/knowledge/diseases")
def save_knowledge_disease(payload: KnowledgeDiseaseInput):
    try:
        with prolog_lock:
            disease = upsert_prolog_disease(payload)
        return {"status": "success", "disease": disease}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/knowledge/diseases/{disease_id}")
def remove_knowledge_disease(disease_id: str):
    try:
        with prolog_lock:
            deleted_id = delete_prolog_disease(disease_id)
        return {"status": "success", "deleted_id": deleted_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/knowledge/rules")
def save_knowledge_rule(payload: KnowledgeRuleInput):
    try:
        with prolog_lock:
            rule = upsert_prolog_rule(payload)
        return {"status": "success", "rule": rule}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/knowledge/rules/{rule_id}")
def remove_knowledge_rule(rule_id: str):
    try:
        with prolog_lock:
            deleted_id = delete_prolog_rule(rule_id)
        return {"status": "success", "deleted_id": deleted_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/next-question")
def next_question(data: SymptomsInput):
    try:
        with prolog_lock:
            flattened = flatten_symptoms(data.symptoms)
            load_symptoms_into_prolog(flattened)
            rows = list(prolog.query("backward_next_question(SymptomId, Disease, RuleId, Score)"))

            if not rows:
                return {
                    "status": "done",
                    "question": None,
                    "reason": "Không còn tiền đề thiếu có giá trị suy luận lùi.",
                }

            row = rows[0]
            symptom_id = safe_decode(row.get("SymptomId"))
            symptom_text_rows = list(prolog.query(f"symptom({symptom_id}, Question)"))
            question_text = symptom_id
            if symptom_text_rows:
                question_text = safe_decode(symptom_text_rows[0].get("Question"))

        return {
            "status": "question",
            "question": {
                "id": symptom_id,
                "question": question_text,
                "target_disease": safe_decode(row.get("Disease")),
                "source_rule": safe_decode(row.get("RuleId")),
                "score": round(float(row.get("Score", 0)), 4),
                "strategy": "backward_chaining",
            },
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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
            flattened = flatten_symptoms(data.symptoms)
            load_symptoms_into_prolog(flattened)

            results = list(prolog.query("diagnose_all(Result)"))

        response = []
        if results and results[0].get('Result'):
            for item in results[0]['Result']:
                disease = safe_decode(item[0])
                cf = float(item[1])
                rules_fired = [safe_decode(r) for r in item[2]]
                cf_score = max(0.0, min(1.0, cf))
                response.append({
                    "disease": disease,
                    "confidence": round(cf * 100, 2),
                    "rules_triggered": rules_fired,
                    "uncertainty": build_uncertainty_report(disease, cf_score, rules_fired, flattened)
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
