import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

np.random.seed(42)

# Same synthetic data generation pattern as train_model.py
# Normal: low CPU/RAM/disk, moderate network, low load
normal = np.column_stack([
    np.random.uniform(5, 30, 10000),      # cpu
    np.random.uniform(20, 55, 10000),     # ram
    np.random.uniform(30, 70, 10000),     # disk
    np.random.uniform(1000, 50000, 10000),# net_in
    np.random.uniform(0.1, 1.0, 10000),   # load
])
# Anomalies: spikes
anomaly = np.column_stack([
    np.random.uniform(70, 99, 200),
    np.random.uniform(75, 98, 200),
    np.random.uniform(85, 99, 200),
    np.random.uniform(100000, 500000, 200),
    np.random.uniform(2.5, 8.0, 200),
])

X = np.vstack([normal, anomaly])
y = np.concatenate([np.ones(10000), -np.ones(200)])  # 1=normal, -1=anomaly

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = IsolationForest(n_estimators=100, contamination=0.02, random_state=42)
model.fit(X_tr)
pred = model.predict(X_te)

print("Confusion matrix (rows=true, cols=pred):")
print(confusion_matrix(y_te, pred, labels=[1, -1]))
print()
print(classification_report(y_te, pred, labels=[1, -1], target_names=["Normal", "Anomaly"], digits=4))
