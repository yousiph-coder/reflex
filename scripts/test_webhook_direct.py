import hashlib
import hmac
import json
import time
import requests

def send_test_webhook(target_url: str = "http://127.0.0.1:8000/api/v1/webhooks/sentry"):
    event_id = f"evt_{int(time.time())}"
    issue_id = f"ISSUE-AUTH-KEYERROR-{int(time.time())}"
    payload = {
        "action": "triggered",
        "data": {
            "event": {
                "event_id": event_id,
                "title": "KeyError: user_id",
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
                                        "context_line": "user_id = session_data['user_id']"
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            "issue": {
                "id": issue_id
            }
        }
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

    print(f"Sending test webhook to: {target_url}")
    res = requests.post(target_url, data=body_bytes, headers=headers, timeout=10)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.text}")
    return res

if __name__ == "__main__":
    send_test_webhook()
