#!/usr/bin/env python3
"""Helper to call GitHub write MCP endpoint via Copilot API"""
import os
import json
import subprocess
import urllib.request
import urllib.error
import base64

COPILOT_TOKEN = os.environ.get("GITHUB_COPILOT_API_TOKEN", "")
MCP_URL = "https://api.individual.githubcopilot.com/mcp/"

def mcp_call(method, params=None):
    """Make a single MCP tool call via HTTP SSE"""
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or {}
    }).encode()
    
    req = urllib.request.Request(
        MCP_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {COPILOT_TOKEN}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode()
            for line in body.split("\n"):
                line = line.strip()
                if line.startswith("data: "):
                    try:
                        d = json.loads(line[6:])
                        if "result" in d:
                            return d["result"]
                        if "error" in d:
                            return {"error": d["error"]}
                    except:
                        pass
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:200]}"}
    except Exception as e:
        return {"error": str(e)}

def tool_call(name, arguments):
    return mcp_call("tools/call", {"name": name, "arguments": arguments})

def get_file(owner, repo, path, ref=None):
    args = {"owner": owner, "repo": repo, "path": path}
    if ref:
        args["ref"] = ref
    result = tool_call("get_file_contents", args)
    if result and "content" in result:
        content_parts = result["content"]
        for part in content_parts:
            if part.get("type") == "text":
                text = part["text"]
                try:
                    d = json.loads(text)
                    if d.get("encoding") == "base64":
                        return base64.b64decode(d["content"].replace("\n","")).decode()
                    return d.get("content", text)
                except:
                    return text
    return None

def push_file(owner, repo, branch, path, content, message):
    result = tool_call("push_files", {
        "owner": owner,
        "repo": repo,
        "branch": branch,
        "message": message,
        "files": [{"path": path, "content": content}]
    })
    return result

def merge_pr(owner, repo, pull_number, merge_method="squash"):
    result = tool_call("merge_pull_request", {
        "owner": owner,
        "repo": repo,
        "pullNumber": pull_number,
        "mergeMethod": merge_method
    })
    return result

def close_pr(owner, repo, pull_number):
    result = tool_call("update_pull_request", {
        "owner": owner,
        "repo": repo,
        "pullNumber": pull_number,
        "state": "closed"
    })
    return result

if __name__ == "__main__":
    # Test
    result = tool_call("get_me", {})
    print("get_me:", result)
