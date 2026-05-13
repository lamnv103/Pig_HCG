// knowledge_map.js
// Ánh xạ: English class name (từ ProtoNet AI) → disease ID (trong diseaseCatalog của knowledge.js)
// Được dùng bởi ImageClassifier để lấy phác đồ điều trị sau khi AI nhận diện ảnh

export const ENGLISH_TO_DISEASE_ID = {
  "Healthy":                                  null, // Da khỏe mạnh - không cần lookup
  "Infected_Bacterial_Erysipelas":            "dis_erysipelas",
  "Infected_Bacterial_Greasy_Pig_Disease":    "dis_greasy_pig",
  "Infected_Environmental_Dermatitis":        "dis_env_dermatitis",
  "Infected_Environmental_Sunburn":           "dis_sunburn",
  "Infected_Fungal_Pityriasis_Rosea":         "dis_pityriasis_rosea",
  "Infected_Fungal_Ringworm":                 "dis_ringworm",
  "Infected_Parasitic_Mange":                 "dis_sarcoptic_mange",
  "Infected_Viral_Foot_and_Mouth_Disease":    "dis_fmd",
  "Infected_Viral_Swinepox":                  "dis_swinepox",
};

// Màu sắc cảnh báo theo loại bệnh
export const DISEASE_TYPE_COLORS = {
  "Bacterial":    { border: "border-orange-400", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-800", icon: "🦠" },
  "Fungal":       { border: "border-yellow-400", bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800", icon: "🍄" },
  "Viral":        { border: "border-red-400",    bg: "bg-red-50",    badge: "bg-red-100 text-red-800",    icon: "⚠️" },
  "Parasitic":    { border: "border-purple-400", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-800", icon: "🪲" },
  "Environmental":{ border: "border-blue-400",   bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-800",  icon: "🌿" },
  "Healthy":      { border: "border-emerald-400",bg: "bg-emerald-50",badge: "bg-emerald-100 text-emerald-800", icon: "✅" },
};

// Lấy loại bệnh từ English class name
export function getDiseaseType(englishName) {
  if (!englishName || englishName === "Healthy") return "Healthy";
  const parts = englishName.split("_");
  // Infected_Bacterial_... → Bacterial
  if (parts.length >= 2) return parts[1];
  return "Unknown";
}

// Lấy thông tin màu sắc dựa trên loại bệnh
export function getDiseaseTypeStyle(englishName) {
  const type = getDiseaseType(englishName);
  return DISEASE_TYPE_COLORS[type] || DISEASE_TYPE_COLORS["Environmental"];
}
