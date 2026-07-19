from flask import Flask, jsonify
from flask_cors import CORS
import requests
import time
import subprocess
import joblib
import numpy as np
from datetime import datetime
from alert_mailer import send_alert_email

app = Flask(__name__)
CORS(app)

PROMETHEUS_URL = "http://localhost:9090"

try:
    model = joblib.load('/home/ubuntu/aiops-backend/anomaly_model.pkl')
    print("Model loaded successfully")
except:
    model = None
    print("Model not found")

def query_prometheus(promql):
    try:
        response = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": promql})
        data = response.json()
        if data["status"] == "success" and data["data"]["result"]:
            return float(data["data"]["result"][0]["value"][1])
        return 0.0
    except:
        return 0.0

def query_range(promql):
    try:
        end = int(time.time())
        start = end - 3600
        response = requests.get(f"{PROMETHEUS_URL}/api/v1/query_range", params={"query": promql, "start": start, "end": end, "step": "60s"})
        data = response.json()
        if data["status"] == "success" and data["data"]["result"]:
            return data["data"]["result"][0]["values"]
        return []
    except:
        return []

def get_live_values():
    cpu = query_prometheus('100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)')
    ram_total = query_prometheus('node_memory_MemTotal_bytes')
    ram_free = query_prometheus('node_memory_MemAvailable_bytes')
    ram = ((ram_total - ram_free) / ram_total * 100) if ram_total > 0 else 0
    disk_total = query_prometheus('node_filesystem_size_bytes{mountpoint="/"}')
    disk_free = query_prometheus('node_filesystem_avail_bytes{mountpoint="/"}')
    disk = ((disk_total - disk_free) / disk_total * 100) if disk_total > 0 else 0
    net_in = query_prometheus('rate(node_network_receive_bytes_total{device="enX0"}[5m])')
    load = query_prometheus('node_load1')
    return cpu, ram, disk, net_in, load

@app.route('/api/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/api/metrics/live')
def live_metrics():
    cpu, ram, disk, net_in, load = get_live_values()
    net_out = query_prometheus('rate(node_network_transmit_bytes_total{device="enX0"}[5m])')
    uptime = query_prometheus('node_time_seconds - node_boot_time_seconds')
    return jsonify({"timestamp": datetime.utcnow().isoformat(), "cpu_percent": round(cpu, 2), "ram_percent": round(ram, 2), "disk_percent": round(disk, 2), "network_in_bytes": round(net_in, 2), "network_out_bytes": round(net_out, 2), "uptime_seconds": round(uptime, 0), "load_avg": round(load, 2)})

@app.route('/api/metrics/history')
def history_metrics():
    cpu_h = query_range('100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)')
    ram_h = query_range('(1 - node_memory_MemAvailable_bytes/node_memory_MemTotal_bytes) * 100')
    net_h = query_range('rate(node_network_receive_bytes_total{device="enX0"}[5m])')
    disk_h = query_range('100 - (node_filesystem_avail_bytes{mountpoint="/"}/node_filesystem_size_bytes{mountpoint="/"} * 100)')
    return jsonify({
        "cpu": [{"time": v[0], "value": round(float(v[1]), 2)} for v in cpu_h],
        "ram": [{"time": v[0], "value": round(float(v[1]), 2)} for v in ram_h],
        "network_in": [{"time": v[0], "value": round(float(v[1]), 2)} for v in net_h],
        "disk": [{"time": v[0], "value": round(float(v[1]), 2)} for v in disk_h]
    })

@app.route('/api/metrics/extended')
def extended_metrics():
    disk_read = query_prometheus('rate(node_disk_read_bytes_total[5m])')
    disk_write = query_prometheus('rate(node_disk_written_bytes_total[5m])')
    disk_read_ops = query_prometheus('rate(node_disk_reads_completed_total[5m])')
    disk_write_ops = query_prometheus('rate(node_disk_writes_completed_total[5m])')
    net_errors_in = query_prometheus('rate(node_network_receive_errs_total{device="enX0"}[5m])')
    net_errors_out = query_prometheus('rate(node_network_transmit_errs_total{device="enX0"}[5m])')
    net_drop_in = query_prometheus('rate(node_network_receive_drop_total{device="enX0"}[5m])')
    net_drop_out = query_prometheus('rate(node_network_transmit_drop_total{device="enX0"}[5m])')
    tcp_established = query_prometheus('node_netstat_Tcp_CurrEstab')
    tcp_time_wait = query_prometheus('node_sockstat_TCP_tw')
    tcp_total = query_prometheus('node_sockstat_sockets_used')
    disk_read_h = query_range('rate(node_disk_read_bytes_total[5m])')
    disk_write_h = query_range('rate(node_disk_written_bytes_total[5m])')
    return jsonify({
        "disk_io": {
            "read_bytes_sec": round(disk_read, 2),
            "write_bytes_sec": round(disk_write, 2),
            "read_ops_sec": round(disk_read_ops, 2),
            "write_ops_sec": round(disk_write_ops, 2)
        },
        "network_errors": {
            "errors_in": round(net_errors_in, 4),
            "errors_out": round(net_errors_out, 4),
            "drops_in": round(net_drop_in, 4),
            "drops_out": round(net_drop_out, 4)
        },
        "tcp": {
            "established": int(tcp_established),
            "time_wait": int(tcp_time_wait),
            "total_sockets": int(tcp_total)
        },
        "history": {
            "disk_read": [{"time": v[0], "value": round(float(v[1]), 2)} for v in disk_read_h],
            "disk_write": [{"time": v[0], "value": round(float(v[1]), 2)} for v in disk_write_h]
        }
    })

@app.route('/api/processes')
def get_processes():
    try:
        result = subprocess.check_output(['ps', 'aux', '--sort=-%cpu'], text=True)
        lines = result.strip().split('\n')[1:11]
        processes = []
        for line in lines:
            parts = line.split(None, 10)
            if len(parts) >= 11:
                processes.append({"user": parts[0], "pid": parts[1], "cpu": parts[2], "mem": parts[3], "name": parts[10][:40]})
        return jsonify(processes)
    except:
        return jsonify([])

@app.route('/api/alerts')
def get_alerts():
    alerts = []
    cpu, ram, disk, net_in, load = get_live_values()
    if cpu > 35:
        send_alert_email("CPU", round(cpu, 2), "critical", "High CPU detected — check for runaway processes.")
        alerts.append({"severity": "critical", "metric": "CPU", "value": round(cpu, 2), "message": f"CPU critical at {round(cpu,2)}% — possible runaway process", "timestamp": datetime.utcnow().isoformat()})
    elif cpu > 20:
        send_alert_email("CPU", round(cpu, 2), "warning", "CPU usage is high — monitor closely.")
        alerts.append({"severity": "warning", "metric": "CPU", "value": round(cpu, 2), "message": f"CPU high at {round(cpu,2)}% — monitor closely", "timestamp": datetime.utcnow().isoformat()})
    if ram > 60:
        send_alert_email("RAM", round(ram, 2), "critical", "High RAM usage — consider restarting services.")
        alerts.append({"severity": "critical", "metric": "RAM", "value": round(ram, 2), "message": f"RAM critical at {round(ram,2)}% — consider restarting services", "timestamp": datetime.utcnow().isoformat()})
    elif ram > 58:
        alerts.append({"severity": "warning", "metric": "RAM", "value": round(ram, 2), "message": f"RAM high at {round(ram,2)}%", "timestamp": datetime.utcnow().isoformat()})
    if disk > 90:
        send_alert_email("Disk", round(disk, 2), "critical", "Disk almost full — clean up immediately.")
        alerts.append({"severity": "critical", "metric": "Disk", "value": round(disk, 2), "message": f"Disk critical at {round(disk,2)}% — clean up space immediately", "timestamp": datetime.utcnow().isoformat()})
    elif disk > 80:
        alerts.append({"severity": "warning", "metric": "Disk", "value": round(disk, 2), "message": f"Disk usage high at {round(disk,2)}%", "timestamp": datetime.utcnow().isoformat()})
    if not alerts:
        alerts.append({"severity": "info", "metric": "System", "value": 0, "message": "All systems normal — no issues detected", "timestamp": datetime.utcnow().isoformat()})
    return jsonify(alerts)

@app.route('/api/anomaly')
def detect_anomaly():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
    cpu, ram, disk, net_in, load = get_live_values()
    features = np.array([[cpu, ram, disk, net_in, load]])
    prediction = model.predict(features)[0]
    score = model.decision_function(features)[0]
    confidence = min(100, max(0, round((1 - (score + 0.5)) * 100, 1)))
    is_anomaly = prediction == -1
    recommendation = "System is operating normally."
    if is_anomaly:
        if cpu > 20:
            recommendation = "High CPU detected — check for runaway processes. Consider restarting nginx or app server."
        elif ram > 80:
            recommendation = "High memory usage — possible memory leak. Consider restarting services or scaling up."
        elif disk > 85:
            recommendation = "High disk usage — clean up logs. Run: sudo journalctl --vacuum-size=100M"
        else:
            recommendation = "Unusual system behavior detected — monitor closely for the next 5 minutes."
    if is_anomaly:
        send_alert_email("Anomaly", round(cpu, 2), "critical", recommendation)
    return jsonify({
        "timestamp": datetime.utcnow().isoformat(),
        "is_anomaly": bool(is_anomaly),
        "confidence": confidence,
        "prediction": int(prediction),
        "metrics": {"cpu": round(cpu, 2), "ram": round(ram, 2), "disk": round(disk, 2), "network_in": round(net_in, 2), "load": round(load, 2)},
        "recommendation": recommendation
    })

@app.route('/api/action/stress')
def action_stress():
    subprocess.Popen(['stress', '--cpu', '4', '--timeout', '300'])
    return jsonify({"status": "stress test started", "duration": "300s"})

@app.route('/api/action/restart-app')
def action_restart():
    subprocess.Popen(['pkill', '-f', 'monitored_app.py'])
    time.sleep(1)
    subprocess.Popen(['python3', '/home/ubuntu/aiops-backend/monitored_app.py'])
    return jsonify({"status": "app restarted"})

@app.route('/api/action/clear-logs')
def action_clear_logs():
    subprocess.run(['sudo', 'journalctl', '--vacuum-size=50M'], capture_output=True)
    return jsonify({"status": "logs cleared"})

@app.route('/api/action/cpu-load')
def action_cpu_load():
    import requests as req
    for i in range(10):
        try: req.get('http://localhost:5001/work', timeout=5)
        except: pass
    return jsonify({"status": "cpu load generated"})

@app.route('/api/action/memory-load')
def action_memory_load():
    import requests as req
    for i in range(5):
        try: req.get('http://localhost:5001/memory', timeout=5)
        except: pass
    return jsonify({"status": "memory load generated"})

@app.route('/api/action/app-status')
def action_app_status():
    import requests as req
    try:
        r = req.get('http://localhost:5001/stats', timeout=5)
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/app-metrics')
def app_metrics():
    import requests as req
    try:
        r = req.get('http://localhost:5001/stats', timeout=5)
        data = r.json()
        if data.get('error_rate_percent', 0) > 5:
            send_alert_email("App Error Rate", data['error_rate_percent'], "critical", f"Application error rate is {data['error_rate_percent']}% — check application logs")
        if data.get('avg_response_time_ms', 0) > 2000:
            send_alert_email("Response Time", data['avg_response_time_ms'], "warning", "Average response time exceeds 2 seconds — possible performance degradation")
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e), "status": "unreachable"}), 500

@app.route('/api/action/memory-spike')
def action_memory_spike():
    import requests as req
    for i in range(8):
        try: req.get('http://localhost:5001/memory', timeout=10)
        except: pass
    return jsonify({"status": "memory spike triggered", "allocated_mb": 800})

@app.route('/api/action/free-memory')
def action_free_memory():
    import requests as req
    try:
        req.get('http://localhost:5001/memory/free', timeout=5)
        return jsonify({"status": "memory freed"})
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/action/trigger-errors')
def action_trigger_errors():
    import requests as req
    for i in range(20):
        try: req.get('http://localhost:5001/error', timeout=3)
        except: pass
    return jsonify({"status": "errors triggered"})

@app.route('/api/action/slow-response')
def action_slow_response():
    import requests as req
    for i in range(3):
        try: req.get('http://localhost:5001/slow', timeout=10)
        except: pass
    return jsonify({"status": "slow responses triggered"})

    app.run(host='0.0.0.0', port=5000, debug=True)

@app.route('/api/action/full-stress')
def action_full_stress():
    import threading
    import requests as req

    def cpu_stress():
        subprocess.Popen(['stress', '--cpu', '4', '--timeout', '180'])

    def memory_stress():
        for i in range(6):
            try: req.get('http://localhost:5001/memory', timeout=10)
            except: pass

    def app_stress():
        for i in range(10):
            try: req.get('http://localhost:5001/error', timeout=3)
            except: pass
        for i in range(5):
            try: req.get('http://localhost:5001/work', timeout=5)
            except: pass

    def disk_stress():
        subprocess.Popen(['bash', '-c', 'dd if=/dev/urandom of=/tmp/stresstest bs=1M count=200 && rm /tmp/stresstest'])

    t1 = threading.Thread(target=cpu_stress); t1.start()
    t2 = threading.Thread(target=memory_stress); t2.start()
    t3 = threading.Thread(target=app_stress); t3.start()
    t4 = threading.Thread(target=disk_stress); t4.start()

    return jsonify({"status": "full system stress started", "duration": "180s", "targets": ["cpu", "memory", "disk_io", "app_errors", "network"]})

@app.route('/api/action/full-stress-stop')
def action_full_stress_stop():
    subprocess.run(['pkill', '-f', 'stress'], capture_output=True)
    subprocess.run(['rm', '-f', '/tmp/stresstest'], capture_output=True)
    try:
        import requests as req
        req.get('http://localhost:5001/memory/free', timeout=5)
    except: pass
    return jsonify({"status": "all stress stopped, memory freed"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
