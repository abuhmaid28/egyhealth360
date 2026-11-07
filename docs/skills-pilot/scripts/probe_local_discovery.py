"""Query the actual local Codex catalog. No model turn or hosted task is run.

Run from the repository root with Codex CLI installed. Stdout is a sanitized
JSON record; non-pilot skills, unrelated errors and stderr are not exported.
"""
import hashlib
import json
import selectors
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

root = Path.cwd()
names = {"eh360-ux-review", "eh360-visual-exploration", "eh360-visual-qa"}
with tempfile.TemporaryDirectory(prefix="eh360-catalog-") as temp, tempfile.TemporaryFile() as err:
    proc = subprocess.Popen(["codex", "app-server", "--stdio"], cwd=temp,
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=err, text=True, bufsize=1)
    selector = selectors.DefaultSelector()
    selector.register(proc.stdout, selectors.EVENT_READ)

    def send(message):
        proc.stdin.write(json.dumps(message) + "\n")
        proc.stdin.flush()

    def receive(wanted):
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            if not selector.select(1):
                continue
            line = proc.stdout.readline()
            if not line:
                raise RuntimeError("Codex app-server stdout closed")
            message = json.loads(line)
            if message.get("id") == wanted:
                return message
        raise TimeoutError("No matching catalog RPC response within 30 seconds")

    try:
        initialize = {"id": 1, "method": "initialize", "params": {
            "clientInfo": {"name": "eh360_s1_discovery_probe", "version": "1"},
            "capabilities": {"experimentalApi": True}}}
        send(initialize)
        initialized = receive(1)
        assert "error" not in initialized, initialized.get("error")
        send({"method": "initialized", "params": {}})
        request = {"id": 2, "method": "skills/list", "params": {
            "cwds": [str(root)], "forceReload": True}}
        send(request)
        response = receive(2)
        assert "error" not in response, response.get("error")
        entries = response["result"]["data"]
        skills = [s for entry in entries for s in entry["skills"] if s["name"] in names]
        errors = [e for entry in entries for e in entry["errors"] if str(root) in e["path"]]
        assert {s["name"] for s in skills} == names and len(skills) == 3
        assert all(s["scope"] == "repo" and s["enabled"] for s in skills)
        assert not errors, errors
        result = {"kind": "ACTUAL_LOCAL_CODEX_CATALOG_NOT_HOSTED_INVOCATION",
                  "observed_at": datetime.now(timezone.utc).isoformat(),
                  "checkout_head_at_probe": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
                  "initialize_request": initialize,
                  "user_agent": initialized["result"]["userAgent"],
                  "request": request, "response_id": response["id"],
                  "pilot_skills": skills, "repository_errors": errors,
                  "skill_sha256": {s["name"]: hashlib.sha256(Path(s["path"]).read_bytes()).hexdigest() for s in skills},
                  "redaction": "Response filtered to three pilot skills and repository errors; unrelated catalog/config/stderr omitted",
                  "limits": "Local automatic catalog scan only; no model invocation, reference loading, hosted discovery or efficacy proof"}
        print(json.dumps(result, indent=2))
    finally:
        selector.close()
        proc.terminate()
        proc.wait(timeout=10)
