from flask import Flask, jsonify
import threading
import time
import math
import random
import os

app = Flask(__name__)

stats = {
    "total_requests": 0,
    "error_count": 0,
    "cpu_jobs_run": 0,
    "memory_allocated_mb": 0,
    "start_time": time.time(),
    "response_times": [],
    "last_request_time": None
}

# Keep allocated memory globally so it persists
_memory_hog = []

@app.route('/')
def home():
    start = time.time()
    stats["total_requests"] += 1
    stats["last_request_time"] = time.time()
    elapsed = (time.time() - start) * 1000
    stats["response_times"].append(elapsed)
    if len(stats["response_times"]) > 100:
        stats["response_times"].pop(0)
    return jsonify({"status": "running", "requests": stats["total_requests"]})

@app.route('/work')
def do_work():
    start = time.time()
    stats["total_requests"] += 1
    stats["cpu_jobs_run"] += 1
    def is_prime(n):
        if n < 2: return False
        for i in range(2, int(math.sqrt(n)) + 1):
            if n % i == 0: return False
        return True
    primes = [n for n in range(2, 50000) if is_prime(n)]
    elapsed = (time.time() - start) * 1000
    stats["response_times"].append(elapsed)
    if len(stats["response_times"]) > 100:
        stats["response_times"].pop(0)
    return jsonify({"primes_found": len(primes), "response_time_ms": round(elapsed, 2)})

@app.route('/memory')
def use_memory():
    global _memory_hog
    stats["total_requests"] += 1
    # Allocate 100MB and KEEP it (don't free)
    chunk = ['x' * 1024 * 1024 for _ in range(100)]
    _memory_hog.extend(chunk)
    stats["memory_allocated_mb"] += 100
    return jsonify({"allocated_mb": 100, "total_kept_mb": stats["memory_allocated_mb"]})

@app.route('/memory/free')
def free_memory():
    global _memory_hog
    _memory_hog = []
    stats["memory_allocated_mb"] = 0
    return jsonify({"status": "memory freed"})

@app.route('/error')
def trigger_error():
    stats["total_requests"] += 1
    stats["error_count"] += 1
    return jsonify({"error": "Simulated application error", "error_count": stats["error_count"]}), 500

@app.route('/slow')
def slow_response():
    stats["total_requests"] += 1
    time.sleep(3)
    return jsonify({"status": "slow response", "delay_ms": 3000})

@app.route('/stats')
def get_stats():
    uptime = round(time.time() - stats["start_time"], 1)
    avg_response = round(sum(stats["response_times"]) / len(stats["response_times"]), 2) if stats["response_times"] else 0
    error_rate = round((stats["error_count"] / stats["total_requests"] * 100), 2) if stats["total_requests"] > 0 else 0
    return jsonify({
        "total_requests": stats["total_requests"],
        "error_count": stats["error_count"],
        "error_rate_percent": error_rate,
        "cpu_jobs_run": stats["cpu_jobs_run"],
        "memory_allocated_mb": stats["memory_allocated_mb"],
        "avg_response_time_ms": avg_response,
        "uptime_seconds": uptime,
        "status": "healthy" if error_rate < 5 else "degraded"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
