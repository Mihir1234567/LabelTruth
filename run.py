"""
LabelTruth Application Entry Point
Checks for trained model artifacts, generates them if missing,
and starts the high-performance FastAPI microservice and interactive frontend.
"""

import os
import sys
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_FILE = os.path.join(MODELS_DIR, "labeltruth_lr_model.joblib")

def ensure_model_artifacts():
    """Ensures model artifacts exist; trains them if missing."""
    if not os.path.exists(MODEL_FILE):
        print("[LabelTruth] Serialized model artifacts not found. Initiating training pipeline...")
        train_script = os.path.join(BASE_DIR, "train_pipeline.py")
        result = subprocess.run([sys.executable, train_script])
        if result.returncode != 0:
            print("[LabelTruth] Error: Model training failed. Check train_pipeline.py.")
            sys.exit(1)
        print("[LabelTruth] Model artifacts successfully generated!")
    else:
        print(f"[LabelTruth] Model artifacts verified at: {MODELS_DIR}")

def start_server(host="127.0.0.1", port=8000, reload=True):
    """Starts the Uvicorn web server."""
    import uvicorn
    print("\n" + "=" * 65)
    print("  LabelTruth: Explainable ML for Food Processing & Health Claims")
    print("=" * 65)
    print(f" * Web Dashboard & UI:  http://{host}:{port}/")
    print(f" * Interactive API Docs: http://{host}:{port}/docs")
    print(f" * Alternative API Docs: http://{host}:{port}/redoc")
    print(f" * API Health Endpoint:  http://{host}:{port}/api/health")
    print("=" * 65 + "\n")

    uvicorn.run("backend.app:app", host=host, port=port, reload=reload)

if __name__ == "__main__":
    ensure_model_artifacts()
    # Support Render / Cloud environment variables or CLI arguments
    default_host = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
    default_port = int(os.environ.get("PORT", 8000))

    host = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("HOST", default_host)
    port = int(sys.argv[2]) if len(sys.argv) > 2 else default_port
    start_server(host=host, port=port, reload=False)

