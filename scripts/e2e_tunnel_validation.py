"""
End-to-End Live Tunneling and Webhook Validation Runner for AutoHeal AI.
Automates ngrok tunnel binding to truth-crowbar-unbundle.ngrok-free.dev,
validates external reachability, and fires authenticated Sentry crash webhook.
"""

import hashlib
import hmac
import json
import os
import subprocess
import sys
import time
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
NGROK_BIN = r"C:\Users\acsds\bin\ngrok.exe"
TARGET_DOMAIN = "truth-crowbar-unbundle.ngrok-free.dev"
PUBLIC_ENDPOINT = f"https://{TARGET_DOMAIN}/api/v1/webhooks/sentry"
LOCAL_URL = "http://127.0.0.1:8000"


def check_local_backend():
    print(f"[*] Step 1: Checking local FastAPI backend on {LOCAL_URL}...")
    try:
        res = requests.get(f"{LOCAL_URL}/health", timeout=5)
        if res.status_code == 200:
            print(f"    [+] FastAPI is ACTIVE and healthy: {res.json()}")
            ready_res = requests.get(f"{LOCAL_URL}/ready", timeout=5)
            print(f"    [+] Services Readiness: {ready_res.json()}")
            return True
        else:
            print(f"    [-] FastAPI returned HTTP {res.status_code}")
            return False
    except Exception as e:
        print(f"    [-] FastAPI connection failed: {e}")
        return False


def start_ngrok(authtoken: str = None):
    print(f"[*] Step 2: Binding ngrok tunnel to {TARGET_DOMAIN}...")
    if authtoken:
        print("    [*] Applying ngrok authtoken...")
        subprocess.run([NGROK_BIN, "config", "add-authtoken", authtoken], check=True)

    cmd = [NGROK_BIN, "http", "8000", "--url", TARGET_DOMAIN]
    print(f"    [*] Launching: {' '.join(cmd)}")
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    time.sleep(3)

    if proc.poll() is not None:
        stdout, stderr = proc.communicate()
        print(f"    [-] ngrok failed to start (exit code {proc.returncode}):\n{stderr or stdout}")
        return None
    print(f"    [+] ngrok tunnel active with PID {proc.pid}")
    return proc


def test_tunnel_reachability():
    print(f"[*] Step 3: Verifying external tunnel reachability at {PUBLIC_ENDPOINT}...")
    for attempt in range(1, 6):
        try:
            res = requests.get(PUBLIC_ENDPOINT, timeout=10)
            print(f"    [+] Attempt {attempt}: Received HTTP {res.status_code} from {PUBLIC_ENDPOINT}")
            if res.status_code in (200, 405):
                print(f"    [+] Tunnel verification SUCCESSFUL! (Expected HTTP 405 Method Not Allowed for GET)")
                return True
        except Exception as e:
            print(f"    [-] Attempt {attempt} waiting for tunnel DNS propagation: {e}")
            time.sleep(2)
    return False


def trigger_live_webhook():
    print(f"[*] Step 4: Dispatching mock Sentry crash payload through live tunnel...")
    timestamp = int(time.time())
    payload = {
        "action": "triggered",
        "data": {
            "event": {
                "event_id": f"evt_live_{timestamp}",
                "title": "KeyError: user_id in get_current_user",
                "message": "KeyError: 'user_id'",
                "platform": "python",
                "environment": "production",
                "level": "error",
                "exception": {
                    "values": [
                        {
                            "type": "KeyError",
                            "value": "'user_id'",
                            "stacktrace": {
                                "frames": [
                                    {
                                        "filename": "app/services/auth.py",
                                        "function": "get_current_user",
                                        "lineno": 14,
                                        "in_app": True,
                                        "context_line": "user_id = session_data['user_id']",
                                    }
                                ]
                            },
                        }
                    ]
                },
            },
            "issue": {"id": f"ISSUE-LIVE-{timestamp}"},
        },
    }

    body_bytes = json.dumps(payload).encode("utf-8")
    secret = "sentry-mock-secret-for-testing"
    sig = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "sentry-hook-signature": sig,
        "sentry-hook-resource": "event_alert",
        "X-API-Key": "ah_live_test_secret_key_123456",
    }

    res = requests.post(PUBLIC_ENDPOINT, data=body_bytes, headers=headers, timeout=15)
    print(f"    [+] HTTP Response Status: {res.status_code}")
    print(f"    [+] Webhook Response Body: {res.text}")
    return res


if __name__ == "__main__":
    token = sys.argv[1] if len(sys.argv) > 1 else os.getenv("NGROK_AUTHTOKEN")
    if not check_local_backend():
        sys.exit(1)
    tunnel = start_ngrok(token)
    if not tunnel:
        print("\n[!] To complete the tunnel binding, provide your ngrok authtoken:")
        print(f"    python scripts/e2e_tunnel_validation.py <YOUR_NGROK_AUTHTOKEN>")
        sys.exit(1)
    try:
        if test_tunnel_reachability():
            trigger_live_webhook()
    finally:
        tunnel.terminate()
