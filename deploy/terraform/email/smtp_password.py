#!/usr/bin/env python3
# Converts an IAM secret access key into an SES SMTP password, via AWS's
# documented SigV4-derived conversion (the same thing the SES console's
# "Create SMTP credentials" button does — there's no API for this).
import base64
import hashlib
import hmac
import json
import sys

DATE = "11111111"
SERVICE = "ses"
TERMINAL = "aws4_request"
MESSAGE = "SendRawEmail"
VERSION = bytes([0x04])


def sign(key, msg):
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def main():
    query = json.load(sys.stdin)
    secret_access_key = query["secret_access_key"]
    region = query["region"]

    k = sign(("AWS4" + secret_access_key).encode("utf-8"), DATE)
    k = sign(k, region)
    k = sign(k, SERVICE)
    k = sign(k, TERMINAL)
    k = sign(k, MESSAGE)

    smtp_password = base64.b64encode(VERSION + k).decode("utf-8")
    print(json.dumps({"smtp_password": smtp_password}))


if __name__ == "__main__":
    main()
