import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

np.random.seed(42)

# Simulate 1 week of normal data (CPU, RAM, disk, network, load)
n_normal = 10000
normal_data = np.column_stack([
    np.random.normal(15, 8, n_normal).clip(0, 100),   # CPU normal 15%
    np.random.normal(50, 8, n_normal).clip(0, 100),   # RAM normal 50%
    np.random.normal(51, 2, n_normal).clip(0, 100),   # Disk stable
    np.random.normal(5000, 2000, n_normal).clip(0),   # Network
    np.random.normal(0.5, 0.3, n_normal).clip(0)      # Load avg
])

# Inject anomalies
n_anomaly = 200
anomaly_data = np.column_stack([
    np.random.normal(92, 5, n_anomaly).clip(0, 100),  # CPU spike
    np.random.normal(90, 5, n_anomaly).clip(0, 100),  # RAM spike
    np.random.normal(51, 2, n_anomaly).clip(0, 100),
    np.random.normal(50000, 10000, n_anomaly).clip(0),
    np.random.normal(8, 2, n_anomaly).clip(0)
])

data = np.vstack([normal_data, anomaly_data])

# Train Isolation Forest
model = IsolationForest(n_estimators=100, contamination=0.02, random_state=42)
model.fit(data)

# Save model
joblib.dump(model, '/home/ubuntu/aiops-backend/anomaly_model.pkl')
print("Model trained and saved successfully!")
print(f"Training samples: {len(data)}")
