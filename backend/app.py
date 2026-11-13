"""
LabelTruth FastAPI Web Service
Provides RESTful APIs for real-time food processing classification,
Explainable AI (XAI) feature attribution, health-washing auditing, and research insights.
"""

import os
import io
import csv
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from backend.inference import engine, NOVA_DEFINITIONS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = FastAPI(
    title="LabelTruth: Explainable ML for Food Processing & Health-Claim Analysis",
    description="Production Machine Learning Microservice for NOVA Food Classification, XAI Token Attribution, and Marketing Deception Auditing.",
    version="1.0.0"
)

# CORS middleware for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request & Response Models
class PredictRequest(BaseModel):
    product_name: str = Field(..., example="All-Natural Zero-Sugar Sparkling Energy")
    ingredients_text: str = Field(..., example="carbonated water, corn syrup, artificial flavor, sodium benzoate, yellow 5")
    model_type: Optional[str] = Field("default", description="Model variant: 'default' or 'balanced'")

class BatchItem(BaseModel):
    product_name: str
    ingredients_text: str

class BatchPredictRequest(BaseModel):
    products: List[BatchItem]
    model_type: Optional[str] = "default"

SAMPLE_PRODUCTS = [
    {
        "id": "sample-1",
        "product_name": "Organic Apples, Cinnamon & Spring Water",
        "category": "Fruits & Beverages",
        "ingredients_text": "Organic apples, water, cinnamon",
        "expected_nova": 1,
        "notes": "Minimally processed whole fruit preparation. Demonstrates clean whole-food token attribution."
    },
    {
        "id": "sample-2",
        "product_name": "All-Natural Chamomile Herbal Infusion",
        "category": "Teas",
        "ingredients_text": "Chamomile flowers, lavender, dried mint leaves",
        "expected_nova": 1,
        "notes": "Group 1 botanicals and herbs without added culinary or cosmetic additives."
    },
    {
        "id": "sample-3",
        "product_name": "Organic Dark Cane Molasses",
        "category": "Culinary Sweeteners",
        "ingredients_text": "Cane sugar, molasses, sulfur dioxide",
        "expected_nova": 2,
        "notes": "Culinary extraction from sugar cane. Highlights boundary cases between Group 2 and Group 4."
    },
    {
        "id": "sample-4",
        "product_name": "Cold-Pressed Extra Virgin Olive Oil",
        "category": "Culinary Oils",
        "ingredients_text": "First cold pressed extra virgin olive oil",
        "expected_nova": 2,
        "notes": "Substance extracted from Group 1 olives via cold pressing."
    },
    {
        "id": "sample-5",
        "product_name": "Traditional Cultured Pasteurized Cheddar",
        "category": "Cheeses",
        "ingredients_text": "Cultured pasteurized milk, salt, microbial enzymes",
        "expected_nova": 3,
        "notes": "Group 1 milk combined with Group 2 salt and fermentation cultures."
    },
    {
        "id": "sample-6",
        "product_name": "Artisan Smoked Salami",
        "category": "Charcuterie",
        "ingredients_text": "Pork, sea salt, ground black pepper, wine, garlic, sodium nitrite",
        "expected_nova": 3,
        "notes": "Preserved whole meat with traditional culinary ingredients and preservative salt."
    },
    {
        "id": "sample-7",
        "product_name": "Healthy Choice Diet Zero-Sugar Sparkling Citrus Energy Blast",
        "category": "Soft Drinks",
        "ingredients_text": "carbonated purified water, citric acid, aspartame, potassium benzoate, potassium citrate, acesulfame potassium, natural flavors, calcium disodium edta",
        "expected_nova": 4,
        "notes": "Classic Health-Washing: Packaging advertises 'Healthy Choice', 'Diet', 'Zero-Sugar', but contains cosmetic additives, artificial sweeteners, and preservatives."
    },
    {
        "id": "sample-8",
        "product_name": "Pure Organic Fruit & Seed Clusters with Monk Fruit",
        "category": "Snacks",
        "ingredients_text": "Organic rolled oats, dried cranberries, organic pumpkin seeds, dried blueberries, natural vanilla flavor, monk fruit extract",
        "expected_nova": 4,
        "notes": "Notebook boundary error case: Whole oats and berries visually mask non-nutritive cosmetic sweetener (monk fruit extract)."
    },
    {
        "id": "sample-9",
        "product_name": "Gluten-Free High-Protein Plant-Based Power Bar",
        "category": "Bars",
        "ingredients_text": "isolated soy protein, maltitol syrup, palm kernel oil, polydextrose, hydrolyzed collagen, glycerin, calcium caseinate, cocoa powder, natural and artificial flavors, soy lecithin, sucralose",
        "expected_nova": 4,
        "notes": "Health-Washing: Brandishes 'Gluten-Free', 'High-Protein', 'Plant-Based' on packaging while built almost entirely on industrial deconstructed fractions and emulsifiers."
    },
    {
        "id": "sample-10",
        "product_name": "Frosted Chocolate Breakfast Puffs with Added Vitamins",
        "category": "Breakfast Cereals",
        "ingredients_text": "milled corn, sugar, malt flavor, high fructose corn syrup, salt, bht for freshness, cocoa, modified corn starch, caramel color, dextrose, artificial vanilla flavor, yellow 5, red 40, blue 1",
        "expected_nova": 4,
        "notes": "Ultra-processed industrial formulation with synthetic dyes, high fructose corn syrup, and chemical preservatives."
    }
]

# Notebook 50,000-sample empirical benchmark results
NOTEBOOK_EMPIRICAL_BENCHMARKS = {
    "dataset": {
        "source": "Open Food Facts Global Database (Streaming Ingestion & Clean Sample)",
        "total_records": 50000,
        "training_samples": 40000,
        "test_samples": 10000,
        "features": "TF-IDF N-grams (1, 2), max_features=2000"
    },
    "class_distribution": {
        "NOVA_1": {"name": "Unprocessed / Minimally Processed", "count": 5955, "pct": 11.91},
        "NOVA_2": {"name": "Processed Culinary Ingredients", "count": 376, "pct": 0.75},
        "NOVA_3": {"name": "Processed Foods", "count": 10124, "pct": 20.25},
        "NOVA_4": {"name": "Ultra-Processed Foods (UPFs)", "count": 33545, "pct": 67.09}
    },
    "model_benchmarking": [
        {
            "model": "Multinomial Naive Bayes",
            "accuracy": 84.28,
            "balanced_accuracy": 54.30,
            "macro_f1": 0.53,
            "strengths": "Fast probabilistic inference, robust to high-dimensional sparsity.",
            "weaknesses": "Strong independence assumption degrades on correlated ingredient phrases."
        },
        {
            "model": "Random Forest (50 Trees, Max Depth 20)",
            "accuracy": 92.75,
            "balanced_accuracy": 66.82,
            "macro_f1": 0.69,
            "strengths": "Non-linear decision surfaces, resilient to outliers.",
            "weaknesses": "Memory intensive, prone to under-predicting minority class NOVA 2."
        },
        {
            "model": "Default Logistic Regression (L2)",
            "accuracy": 95.19,
            "balanced_accuracy": 71.75,
            "macro_f1": 0.72,
            "strengths": "Highest overall test accuracy, calibrated log-odds probabilities, directly interpretable XAI coefficients.",
            "weaknesses": "Accuracy paradox: NOVA 2 recall is only 4% due to extreme 0.75% class imbalance."
        },
        {
            "model": "Balanced Logistic Regression (Cost-Sensitive)",
            "accuracy": 91.80,
            "balanced_accuracy": 81.85,
            "macro_f1": 0.79,
            "strengths": "Trades ~3.4% accuracy to boost Balanced Accuracy by +10.1%, drastically recovering NOVA 2 recall from 4.0% to 58.7%.",
            "weaknesses": "Slightly higher false alarm rate on majority NOVA 4."
        }
    ],
    "objective_b_hypothesis_test": {
        "null_hypothesis": "The presence of marketing health claims is statistically independent of NOVA food processing tier.",
        "alternative_hypothesis": "The presence of marketing health claims is statistically dependent on NOVA food processing tier.",
        "chi_square_statistic": 409.9642,
        "p_value": 1.537e-88,
        "cramers_v": 0.0905,
        "decision": "Reject Null Hypothesis (H0) at alpha = 0.05",
        "health_washing_evidence": "Over 53.67% of products bearing front-of-package health claims (e.g. 'Natural', 'Gluten-Free', 'High-Protein') are classified as NOVA 4 (Ultra-Processed). Marketing claims do not reliably signal whole-food nutrition.",
        "contingency_table": {
            "No Claim": {"NOVA_1": 5209, "NOVA_2": 314, "NOVA_3": 9192, "NOVA_4": 31529},
            "Has Claim": {"NOVA_1": 746, "NOVA_2": 62, "NOVA_3": 932, "NOVA_4": 2016}
        }
    }
}

@app.get("/api/health")
def health_check():
    """Health check endpoint confirming engine and artifact availability."""
    return {
        "status": "healthy",
        "engine_ready": engine.model_default is not None and engine.vectorizer is not None,
        "version": "1.0.0",
        "models_available": ["default", "balanced"]
    }

@app.get("/api/sample-products")
def get_sample_products():
    """Returns curated benchmark food products from the notebook for 1-click testing."""
    return {"samples": SAMPLE_PRODUCTS}

@app.post("/api/predict")
def predict_product(request: PredictRequest):
    """
    Analyzes a single food product:
    - Categorizes into NOVA 1-4
    - Generates confidence distribution
    - Extracts token-level XAI feature weights
    - Audits marketing claims against industrial processing
    """
    try:
        result = engine.predict(
            product_name=request.product_name,
            ingredients_text=request.ingredients_text,
            model_type=request.model_type or "default"
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/batch-predict")
def batch_predict(request: BatchPredictRequest):
    """Processes a batch of food products and aggregates statistical health-washing metrics."""
    items = [{"product_name": p.product_name, "ingredients_text": p.ingredients_text} for p in request.products]
    result = engine.batch_predict(items, model_type=request.model_type or "default")
    return result

@app.post("/api/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    model_type: str = Form("default")
):
    """
    Accepts an uploaded CSV file containing food items, runs multi-class classification,
    and returns processed rows with NOVA predictions and health-washing flags.
    Expected CSV columns: 'product_name' and 'ingredients_text' (or similar aliases).
    """
    try:
        content = await file.read()
        text_stream = io.StringIO(content.decode("utf-8", errors="replace"))
        reader = csv.DictReader(text_stream)

        # Detect columns flexibly
        fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
        name_col = None
        ing_col = None

        for col in reader.fieldnames or []:
            c = col.strip().lower()
            if "name" in c or "product" in c or "title" in c:
                name_col = col
            if "ingredient" in c or "text" in c or "contents" in c:
                ing_col = col

        if not ing_col:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must contain an ingredients column (e.g. 'ingredients_text'). Found columns: {reader.fieldnames}"
            )

        items = []
        for i, row in enumerate(reader):
            if i >= 500:  # Cap at 500 items for responsive web payload
                break
            name = row.get(name_col, f"Product #{i+1}") if name_col else f"Product #{i+1}"
            ing = row.get(ing_col, "")
            if ing and ing.strip():
                items.append({"product_name": name, "ingredients_text": ing})

        if not items:
            raise HTTPException(status_code=400, detail="No valid rows with non-empty ingredients found.")

        result = engine.batch_predict(items, model_type=model_type)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

@app.get("/api/model-insights")
def get_model_insights():
    """
    Returns comprehensive scientific metadata from the notebook research:
    - 50,000 Open Food Facts empirical distribution
    - Multi-model benchmarking comparison
    - Cost-sensitive accuracy paradox resolution
    - Inferential Chi-Square & Cramér's V hypothesis findings
    - Top 15 positive predictor tokens for NOVA 1 and NOVA 4
    """
    top_pred = engine.metadata.get("top_predictors", {
        "nova_1": [],
        "nova_4": []
    })

    return {
        "empirical_benchmarks": NOTEBOOK_EMPIRICAL_BENCHMARKS,
        "runtime_model_metadata": engine.metadata,
        "nova_definitions": NOVA_DEFINITIONS,
        "top_predictors": top_pred
    }

# Mount static files for the web frontend
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_frontend():
    """Serves the main single-page application frontend."""
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({
        "message": "LabelTruth Backend API is running.",
        "docs_url": "/docs",
        "api_health": "/api/health"
    })

