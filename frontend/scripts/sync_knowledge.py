from __future__ import annotations

from pathlib import Path
import json
import re


def parse_rules(rules_text: str) -> tuple[list[dict], list[dict]]:
    str_pat = r"'((?:[^']|'')*)'"
    symptom_pattern = re.compile(rf"^symptom\(([^,]+),\s*{str_pat}\)\.", re.M)
    disease_pattern = re.compile(
        rf"^disease\(([^,]+),\s*{str_pat},\s*{str_pat},\s*{str_pat},\s*{str_pat},\s*{str_pat},\s*{str_pat},\s*{str_pat},\s*([0-9.]+)\)\.",
        re.M,
    )

    symptoms = []
    for match in symptom_pattern.finditer(rules_text):
        symptoms.append(
            {
                "id": match.group(1).strip(),
                "question": match.group(2).replace("''", "'"),
            }
        )

    diseases = []
    for match in disease_pattern.finditer(rules_text):
        diseases.append(
            {
                "id": match.group(1).strip(),
                "name": match.group(2).replace("''", "'"),
                "group": match.group(3).replace("''", "'"),
                "age_focus": match.group(4).replace("''", "'"),
                "hallmark": match.group(5).replace("''", "'"),
                "cause": match.group(6).replace("''", "'"),
                "prevention": match.group(7).replace("''", "'"),
                "treatment_principle": match.group(8).replace("''", "'"),
                "cf_threshold": float(match.group(9)),
            }
        )

    return symptoms, diseases


def write_knowledge(output_path: Path, symptoms: list[dict], diseases: list[dict]) -> None:
    content = []
    content.append("export const symptomCatalog = ")
    content.append(json.dumps(symptoms, ensure_ascii=False, indent=2))
    content.append(";\n\n")
    content.append("export const diseaseCatalog = ")
    content.append(json.dumps(diseases, ensure_ascii=False, indent=2))
    content.append(";\n\n")
    content.append("export const diseaseById = Object.fromEntries(diseaseCatalog.map((d) => [d.id, d]));\n")
    output_path.write_text("".join(content), encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    rules_path = root / "prolog" / "rules.pl"
    output_path = root / "frontend" / "src" / "data" / "knowledge.js"

    rules_text = rules_path.read_text(encoding="utf-8")
    symptoms, diseases = parse_rules(rules_text)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    write_knowledge(output_path, symptoms, diseases)

    print(f"Synced {len(symptoms)} symptoms and {len(diseases)} diseases.")


if __name__ == "__main__":
    main()
