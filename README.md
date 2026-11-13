# LabelTruth: Explainable ML for Food Processing & Health-Claim Analysis

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.1-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.5.2-F7931E.svg?style=flat&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An end-to-end Machine Learning web application and research platform that classifies commercial food products into their standardized **NOVA processing tier (1–4)** using unstructured ingredient text, extracts **Explainable AI (XAI) feature attributions**, and statistically audits packaging claims to detect **"Health-Washing"** (front-of-package marketing claims deployed on ultra-processed formulations).

---

## 🌟 Key Features

1. **Multi-Class NLP Classification Pipeline**:
   - Classifies food formulations across all 4 international NOVA groups:
     - **NOVA 1**: Unprocessed or minimally processed foods (fruits, whole oats, raw nuts, milk).
     - **NOVA 2**: Processed culinary ingredients (olive oil, butter, cane sugar, sea salt).
     - **NOVA 3**: Processed foods (canned vegetables, artisan breads, cured cheeses).
     - **NOVA 4**: Ultra-Processed Food Products / UPFs (soft drinks, confectionery, reconstituted snacks).
   - High test accuracy (**95.19%**) on held-out test data.

2. **Resolving the Accuracy Paradox**:
   - In Open Food Facts, NOVA 4 accounts for **67.09%** of products while NOVA 2 represents only **0.75%**.
   - Includes both **Default Logistic Regression** and **Cost-Sensitive Balanced Logistic Regression** ($w_j = \frac{N}{K \cdot N_j}$), recovering minority recall from **4.0% to 58.7%** and lifting Balanced Accuracy to **81.85%**.

3. **Explainable AI (XAI) Token Attribution**:
   - Extracts linear log-odds feature contributions ($\beta_j \cdot x_j$) for every ingredient token in the input.
   - Highlights tokens with live weights and importance metrics (e.g., identifying cosmetic additives, industrial sweeteners, emulsifiers, or whole-food tokens).

4. **Health-Washing Detection Engine (Objective B)**:
   - Scans packaging claims against an empirical lexicon (`organic`, `natural`, `gluten-free`, `high-protein`, `zero-sugar`, `plant-based`).
   - Flags products where packaging brandishes healthy marketing claims while the formulation is classified as NOVA 4 (Ultra-Processed).

5. **Interactive Single-Page Application (Frontend)**:
   - **Live Inspector**: Instant interactive prediction, 1-click curated benchmark presets, multi-class probability gauges, and XAI token pills.
   - **Research & Benchmarks Dashboard**: Visualizes the 50,000 Open Food Facts distribution, claim composition, model comparison matrix, and top 15 positive predictors for NOVA 1 and NOVA 4.
   - **Batch Scanner & CSV Auditor**: Drag-and-drop CSV upload, batch predictions, filterable results table, and audited CSV export.
   - **Methodology & Science**: Comprehensive documentation of the NOVA framework, mathematical formulations, and ethical considerations.

---

## 📂 Project Architecture

```
Project/
├── Miral_DS_Project.ipynb      # Original research Jupyter notebook
├── train_pipeline.py           # Standalone ML training, evaluation & serialization pipeline
├── run.py                      # Application launcher (trains models if missing, starts server)
├── requirements.txt            # Python dependencies
├── README.md                   # Complete documentation
│
├── backend/
│   ├── app.py                  # FastAPI web server, CORS, routes & CSV handler
│   └── inference.py            # Inference engine, XAI feature attribution & claim auditor
│
├── frontend/
│   ├── index.html              # Responsive Tailwind CSS & glassmorphism web UI
│   └── app.js                  # Client logic, Chart.js visualizers & batch processing
│
├── models/
│   ├── labeltruth_lr_model.joblib      # Serialized Default Logistic Regression
│   ├── labeltruth_lr_balanced.joblib   # Serialized Balanced Logistic Regression
│   ├── labeltruth_vectorizer.joblib    # Serialized TF-IDF Vectorizer (2,000 n-grams)
│   ├── labeltruth_rf_model.joblib      # Random Forest benchmark model
│   ├── labeltruth_nb_model.joblib      # Multinomial Naive Bayes benchmark model
│   └── labeltruth_metadata.json        # Research metrics, weights & hypothesis test stats
│
└── data/
    └── openfoodfacts_sample.csv        # Open Food Facts sample dataset cache
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure Python 3.10+ is installed.

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Launch the Application
```bash
python run.py
```
*The script automatically verifies model artifacts (or trains them if not yet present) and launches the server.*

- **Web Dashboard**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc API Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## ☁️ Deploying to Render (Free Tier)

This repository includes a native **Render Blueprint (`render.yaml`)** and **Dockerfile** for zero-configuration cloud deployment.

### Method A: Automated Deployment via Render Blueprint (Recommended)
1. Push this project to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Open your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** &rarr; **Blueprint**.
4. Select your GitHub repository. Render will automatically read `render.yaml` and configure:
   - **Environment**: Python 3.11.9
   - **Build Command**: `pip install -r requirements.txt && python train_pipeline.py`
   - **Start Command**: `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
5. Click **Apply**. Render will build and deploy your application live at `https://<your-service-name>.onrender.com`.

### Method B: Manual Web Service Setup
If creating a Web Service manually in Render:
1. Click **New +** &rarr; **Web Service** &rarr; Connect your GitHub repository.
2. Configure settings:
   - **Name**: `labeltruth-food-ml`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python train_pipeline.py`
   - **Start Command**: `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
3. Click **Create Web Service**.

---

## 📡 REST API Reference

### `POST /api/predict`
Analyzes a commercial food formulation.

**Request Body**:
```json
{
  "product_name": "Healthy Choice Zero-Sugar Citrus Energy Blast",
  "ingredients_text": "carbonated water, citric acid, aspartame, potassium benzoate, yellow 5, artificial flavor",
  "model_type": "default"
}
```

**Response**:
```json
{
  "product_name": "Healthy Choice Zero-Sugar Citrus Energy Blast",
  "prediction": {
    "nova_group": 4,
    "confidence": 99.46,
    "title": "NOVA 4: Ultra-Processed Food Products (UPFs)",
    "short_title": "Ultra-Processed (UPF)",
    "dietary_guidance": "Epidemiologically linked to obesity, metabolic disorders, and CVD. Limit or avoid wherever possible."
  },
  "health_claim_audit": {
    "has_health_claim": true,
    "detected_claims": ["healthy", "zero-sugar"],
    "is_health_washed": true,
    "severity": "Severe",
    "explanation": "Discrepancy Detected: This product prominently displays marketing claims (healthy, zero-sugar), yet its ingredient profile matches NOVA 4 (Ultra-Processed Food) with 99.46% confidence."
  },
  "explainable_ai": {
    "top_contributors": [
      { "token": "artificial", "weight": 2.348, "contribution": 0.812 },
      { "token": "yellow", "weight": 1.954, "contribution": 0.643 }
    ]
  }
}
```

### `POST /api/upload-csv`
Accepts a `.csv` file with columns `product_name` and `ingredients_text`, returning batch predictions, summary health-washing statistics, and distribution metrics.

### `GET /api/model-insights`
Returns empirical scientific findings:
- 50,000 Open Food Facts baseline distribution
- Multi-model benchmarking comparison
- Chi-Square test ($\chi^2 = 409.96$, $p = 1.54 \times 10^{-88}$, Cramér's $V = 0.0905$)
- Top 15 positive predictors for NOVA 1 and NOVA 4

---

## 🔬 Scientific & Empirical Summary

| Objective | Method | Empirical Finding |
|---|---|---|
| **Objective A (Supervised NLP)** | TF-IDF (1,2 n-grams) + Logistic Regression | **95.19% test accuracy**. Balanced weighting raises Balanced Accuracy to **81.85%** and cures minority starvation. |
| **Objective B (Health-Washing)** | Pearson's $\chi^2$ Test & Cramér's $V$ | $\chi^2 = 409.96$ ($p < 10^{-80}$), Cramér's $V = 0.0905$. Over **53.67% of products bearing health claims are ultra-processed (NOVA 4)**, proving packaging claims are decoupled from processing. |

---

## 📄 License
This project is open-source under the MIT License.

