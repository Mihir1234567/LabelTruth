"""
LabelTruth Inference Engine & XAI Feature Attribution
Encapsulates TF-IDF vectorization, multi-class prediction, token-level attribution,
and health-claim discrepancy detection.
"""

import os
import re
import json
import joblib
import numpy as np
from typing import Dict, Any, List, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Health claim regex from notebook
HEALTH_PATTERNS = [
    'organic', 'natural', 'bio', 'gluten[- ]free', 'high[- ]protein',
    'no[- ]sugar', 'zero[- ]sugar', 'low[- ]fat', 'fiber', 'healthy',
    'diet', 'light', 'vitamin', 'vegan', 'plant[- ]based'
]
CLAIM_REGEX = re.compile('|'.join(HEALTH_PATTERNS), re.IGNORECASE)

NOVA_DEFINITIONS = {
    1: {
        "title": "NOVA 1: Unprocessed or Minimally Processed Foods",
        "short_title": "Minimally Processed",
        "badge_color": "emerald",
        "description": "Edible parts of plants or animals unaltered or only cleaned, ground, pasteurized, frozen, or fermented without added salt, sugar, oils, or industrial additives.",
        "examples": "Fresh fruits, vegetables, whole grains, nuts, plain milk, eggs, fresh meats, herbal infusions.",
        "dietary_guidance": "Recommended as the primary foundation of a healthy, nutrient-dense diet."
    },
    2: {
        "title": "NOVA 2: Processed Culinary Ingredients",
        "short_title": "Culinary Ingredients",
        "badge_color": "blue",
        "description": "Substances extracted directly from nature or Group 1 foods (e.g., pressing, refining, mining). Rarely consumed alone; used to season and cook Group 1 foods.",
        "examples": "Olive oil, butter, cane sugar, sea salt, maple syrup, vinegar, lard, corn starch.",
        "dietary_guidance": "Use in small quantities to season and cook handmade meals."
    },
    3: {
        "title": "NOVA 3: Processed Foods",
        "short_title": "Processed Foods",
        "badge_color": "amber",
        "description": "Relatively simple food products manufactured by combining Group 2 ingredients (salt, oil, sugar) with Group 1 foods to preserve or enhance palatability.",
        "examples": "Canned vegetables in brine, canned fish in oil, traditional artisan breads, cured meats, natural cheeses.",
        "dietary_guidance": "Consume in moderate quantities as part of balanced culinary meals."
    },
    4: {
        "title": "NOVA 4: Ultra-Processed Food Products (UPFs)",
        "short_title": "Ultra-Processed (UPF)",
        "badge_color": "rose",
        "description": "Industrial formulations made mostly or entirely from substances derived from foods and additives (emulsifiers, colorants, flavor enhancers, high-fructose corn syrup) with little to no intact whole food.",
        "examples": "Carbonated soft drinks, packaged sweet/savory snacks, reconstituted meat nuggets, instant noodles, confectioneries.",
        "dietary_guidance": "Epidemiologically linked to obesity, metabolic disorders, and CVD. Limit or avoid wherever possible."
    }
}

class LabelTruthEngine:
    def __init__(self):
        self.model_default = None
        self.model_balanced = None
        self.vectorizer = None
        self.metadata = {}
        self.feature_names = None
        self.load_artifacts()

    def load_artifacts(self):
        """Loads serialized models, vectorizer, and scientific metadata."""
        default_model_path = os.path.join(MODELS_DIR, "labeltruth_lr_model.joblib")
        balanced_model_path = os.path.join(MODELS_DIR, "labeltruth_lr_balanced.joblib")
        vectorizer_path = os.path.join(MODELS_DIR, "labeltruth_vectorizer.joblib")
        metadata_path = os.path.join(MODELS_DIR, "labeltruth_metadata.json")

        if os.path.exists(default_model_path):
            self.model_default = joblib.load(default_model_path)
        if os.path.exists(balanced_model_path):
            self.model_balanced = joblib.load(balanced_model_path)
        if os.path.exists(vectorizer_path):
            self.vectorizer = joblib.load(vectorizer_path)
            self.feature_names = np.array(self.vectorizer.get_feature_names_out())

        if os.path.exists(metadata_path):
            with open(metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

    def detect_claims(self, text: str) -> List[str]:
        """Detects health marketing claims present in the product text."""
        if not text:
            return []
        matches = CLAIM_REGEX.findall(text)
        # Normalize and remove duplicates while preserving order
        unique_matches = []
        for m in matches:
            norm = m.lower().strip()
            if norm not in unique_matches:
                unique_matches.append(norm)
        return unique_matches

    def explain_prediction(self, ingredients_text: str, pred_class: int, model) -> Dict[str, Any]:
        """
        XAI Feature Attribution:
        Extracts token-level linear weights contributing to the predicted NOVA class
        versus opposing NOVA classes.
        """
        if not self.vectorizer or not hasattr(model, 'coef_'):
            return {"top_contributors": [], "token_highlights": []}

        # Analyze n-grams extracted from this specific text
        feature_vector = self.vectorizer.transform([ingredients_text])
        non_zero_indices = feature_vector.nonzero()[1]

        if len(non_zero_indices) == 0:
            return {"top_contributors": [], "token_highlights": []}

        class_idx = pred_class - 1  # 0-indexed class index
        class_coefs = model.coef_[class_idx]

        attributions = []
        for idx in non_zero_indices:
            token = self.feature_names[idx]
            tfidf_weight = feature_vector[0, idx]
            linear_contrib = float(class_coefs[idx] * tfidf_weight)
            attributions.append({
                "token": token,
                "weight": round(float(class_coefs[idx]), 3),
                "tfidf": round(float(tfidf_weight), 3),
                "contribution": round(linear_contrib, 3)
            })

        # Sort by absolute contribution
        attributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        return {
            "top_contributors": attributions[:10]
        }

    def predict(
        self,
        product_name: str,
        ingredients_text: str,
        model_type: str = "default"
    ) -> Dict[str, Any]:
        """
        Runs comprehensive analysis on a food product:
        - NOVA multi-class classification
        - Confidence distribution
        - XAI token explanations
        - Health-washing audit
        """
        if not self.model_default or not self.vectorizer:
            raise RuntimeError("Model pipeline artifacts are not loaded.")

        model = self.model_balanced if model_type == "balanced" and self.model_balanced else self.model_default

        clean_ing = ingredients_text.strip() if ingredients_text else ""
        if not clean_ing:
            return {
                "error": "Ingredients list cannot be empty."
            }

        # Vectorize
        vec = self.vectorizer.transform([clean_ing])
        pred_class = int(model.predict(vec)[0])
        probs = model.predict_proba(vec)[0]

        # Format probability distribution
        confidence_distribution = {
            f"NOVA_{i}": round(float(probs[i - 1]) * 100, 2)
            for i in [1, 2, 3, 4]
        }
        pred_confidence = round(float(probs[pred_class - 1]) * 100, 2)

        # Health claim detection
        combined_text = f"{product_name} {clean_ing}"
        detected_claims = self.detect_claims(product_name)
        has_health_claim = len(detected_claims) > 0

        # Health-washing evaluation (Objective B logic)
        # Health-washing occurs when a product brandishes health/wellness claims but is NOVA 4
        is_health_washed = (has_health_claim and pred_class == 4)
        health_washing_severity = "None"
        health_washing_explanation = ""

        if is_health_washed:
            if pred_confidence >= 80:
                health_washing_severity = "Severe"
            else:
                health_washing_severity = "Moderate"
            health_washing_explanation = (
                f"Discrepancy Detected: This product prominently displays marketing claims ({', '.join(detected_claims)}), "
                f"yet its ingredient profile matches NOVA 4 (Ultra-Processed Food) with {pred_confidence}% confidence. "
                f"This matches the 'Health-Washing' phenomenon uncovered in our research."
            )
        elif has_health_claim and pred_class == 3:
            health_washing_severity = "Mild"
            health_washing_explanation = (
                f"Minor Discrepancy: Product features claims ({', '.join(detected_claims)}) but is classified as "
                f"NOVA 3 (Processed Food) containing added culinary fats, sugars, or salts."
            )
        elif has_health_claim and pred_class <= 2:
            health_washing_explanation = (
                f"Claim Aligned: The marketing claims ({', '.join(detected_claims)}) are consistent with an "
                f"unprocessed or minimally processed whole-food composition (NOVA {pred_class})."
            )
        else:
            health_washing_explanation = "No marketing health claims detected on the packaging."

        # XAI Feature Attributions
        xai_info = self.explain_prediction(clean_ing, pred_class, model)

        nova_info = NOVA_DEFINITIONS.get(pred_class, {})

        return {
            "product_name": product_name,
            "ingredients_text": clean_ing,
            "model_used": "Balanced Logistic Regression (Minority Weighted)" if model_type == "balanced" else "Default Logistic Regression",
            "prediction": {
                "nova_group": pred_class,
                "confidence": pred_confidence,
                "title": nova_info.get("title"),
                "short_title": nova_info.get("short_title"),
                "badge_color": nova_info.get("badge_color"),
                "description": nova_info.get("description"),
                "examples": nova_info.get("examples"),
                "dietary_guidance": nova_info.get("dietary_guidance")
            },
            "probabilities": confidence_distribution,
            "health_claim_audit": {
                "has_health_claim": has_health_claim,
                "detected_claims": detected_claims,
                "is_health_washed": is_health_washed,
                "severity": health_washing_severity,
                "explanation": health_washing_explanation
            },
            "explainable_ai": xai_info
        }

    def batch_predict(self, items: List[Dict[str, str]], model_type: str = "default") -> Dict[str, Any]:
        """Runs batch analysis on a list of product dictionaries."""
        results = []
        counts = {1: 0, 2: 0, 3: 0, 4: 0}
        health_washed_count = 0
        total_claims_count = 0

        for item in items:
            name = item.get("product_name", "Unknown Product")
            ing = item.get("ingredients_text", "")
            if not ing:
                continue
            pred = self.predict(product_name=name, ingredients_text=ing, model_type=model_type)
            if "error" not in pred:
                results.append(pred)
                nova = pred["prediction"]["nova_group"]
                counts[nova] += 1
                if pred["health_claim_audit"]["has_health_claim"]:
                    total_claims_count += 1
                if pred["health_claim_audit"]["is_health_washed"]:
                    health_washed_count += 1

        total_valid = len(results)
        summary = {
            "total_processed": total_valid,
            "nova_breakdown": {
                f"NOVA_{k}": {
                    "count": counts[k],
                    "percentage": round(counts[k] / total_valid * 100, 2) if total_valid > 0 else 0
                } for k in [1, 2, 3, 4]
            },
            "health_claims_detected": total_claims_count,
            "health_washed_products": health_washed_count,
            "health_washing_rate_among_claims": round(health_washed_count / total_claims_count * 100, 2) if total_claims_count > 0 else 0
        }

        return {
            "summary": summary,
            "items": results
        }

# Global singleton engine instance
engine = LabelTruthEngine()

