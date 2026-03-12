#!/usr/bin/env python3
"""
Script to upload sutech-apples (Problem A) to the IEEE ECPC Platform.
Reads all 21 sample test cases from the statement-sections folder and
uploads them to the backend API.
"""

import os
import json
import requests

# ─── Config ────────────────────────────────────────────────────────────────
BASE_URL      = "http://localhost:3000/api"
ADMIN_USER    = "admin"
ADMIN_PASS    = "admin123"
CONTEST_ID    = "69b1fd7ef09400f0195f1e7d"
EXAMPLES_DIR  = os.path.join(os.path.dirname(__file__),
                              "sutechapples-4", "statement-sections", "english")

# ─── Login ─────────────────────────────────────────────────────────────────
def get_token():
    resp = requests.post(f"{BASE_URL}/auth/admin/login",
                         json={"username": ADMIN_USER, "password": ADMIN_PASS})
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"Login failed: {data}")
    token = data["data"]["accessToken"]
    print(f"[✓] Logged in as admin")
    return token

# ─── Load test cases ────────────────────────────────────────────────────────
def load_test_cases():
    cases = []
    i = 1
    while True:
        inp_path = os.path.join(EXAMPLES_DIR, f"example.{i:02d}")
        out_path = os.path.join(EXAMPLES_DIR, f"example.{i:02d}.a")
        if not os.path.exists(inp_path) or not os.path.exists(out_path):
            break
        with open(inp_path, "r", encoding="utf-8") as f:
            inp = f.read()
        with open(out_path, "r", encoding="utf-8") as f:
            out = f.read()
        cases.append({"input": inp, "expectedOutput": out, "isVisible": True})
        i += 1
    print(f"[✓] Loaded {len(cases)} test cases from statement-sections")
    return cases

# ─── Check if problem A already exists ─────────────────────────────────────
def find_existing_problem(headers):
    resp = requests.get(f"{BASE_URL}/problems?contestId={CONTEST_ID}", headers=headers)
    resp.raise_for_status()
    problems = resp.json()["data"]
    for p in problems:
        if p["letter"] == "A":
            return p["_id"]
    return None

# ─── Create problem ─────────────────────────────────────────────────────────
def create_problem(headers, test_cases):
    description = (
        "The IEEE SUTech branch is organizing a welcome event for the students "
        "who registered for the upcoming ECPC qualifications. To keep everyone "
        "energetic during the contest, the organizing committee decided to distribute "
        "fresh apples.\n\n"
        "There are $N$ students standing in a line. The $i$-th student requested "
        "exactly $A_i$ apples. However, the committee has a strict fairness policy: "
        "any student who asks for strictly more than $X$ apples is considered greedy "
        "and will be penalized by receiving exactly $0$ apples. All other students "
        "(who asked for $X$ apples or fewer) will receive exactly the number of apples "
        "they requested.\n\n"
        "Your task is to write a program that calculates the total number of apples "
        "the committee needs to distribute to all $N$ students."
    )

    input_description = (
        "The first line of the input contains two space-separated integers $N$ and $X$ "
        "($1 \\le N \\le 100$, $1 \\le X \\le 100$) — the number of students and the "
        "maximum allowed apples per student, respectively.\n"
        "The second line contains $N$ space-separated integers $A_1, A_2, \\dots, A_N$ "
        "($1 \\le A_i \\le 100$) — where $A_i$ is the number of apples requested by "
        "the $i$-th student."
    )

    output_description = (
        "Print a single integer representing the total number of apples the committee "
        "will distribute."
    )

    notes = (
        "Iterate through the array. For each element $A_i$, if $A_i \\le X$, add $A_i$ "
        "to a running sum variable. Finally, print the sum.\n"
        "Time Complexity: $O(N)$\n"
        "Space Complexity: $O(1)$ or $O(N)$ depending on input reading method."
    )

    payload = {
        "contestId":        CONTEST_ID,
        "letter":           "A",
        "title":            "sutech-apples",
        "description":      description,
        "inputDescription": input_description,
        "outputDescription": output_description,
        "notes":            notes,
        "timeLimitSeconds": 1,
        "memoryLimitMB":    256,
        "difficulty":       "easy",
        "order":            0,
        "testCases":        test_cases,
    }

    resp = requests.post(f"{BASE_URL}/problems", headers=headers, json=payload)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"Create problem failed: {data}")
    problem_id = data["data"]["_id"]
    print(f"[✓] Problem created → ID: {problem_id}")
    return problem_id

# ─── Publish problem ─────────────────────────────────────────────────────────
def publish_problem(headers, problem_id):
    resp = requests.patch(f"{BASE_URL}/problems/{problem_id}/publish", headers=headers)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"Publish failed: {data}")
    print(f"[✓] Problem published successfully")
    return data["data"]

# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  sutech-apples Upload Script")
    print("  IEEE ECPC Platform — Problem A")
    print("=" * 60)

    token = get_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Check if problem A already exists
    existing_id = find_existing_problem(headers)
    if existing_id:
        print(f"[!] Problem A already exists (ID: {existing_id})")
        print(f"[!] Skipping creation. Publishing existing problem...")
        result = publish_problem(headers, existing_id)
    else:
        test_cases = load_test_cases()
        problem_id = create_problem(headers, test_cases)
        result = publish_problem(headers, problem_id)

    print()
    print("=" * 60)
    print("  UPLOAD SUMMARY")
    print("=" * 60)
    print(f"  Title       : {result['title']}")
    print(f"  Letter      : {result['letter']}")
    print(f"  Status      : {result['status']}")
    print(f"  Time Limit  : {result['timeLimitSeconds']}s")
    print(f"  Memory      : {result['memoryLimitMB']} MB")
    print(f"  Test Cases  : {len(result['testCases'])}")
    print(f"  Problem ID  : {result['_id']}")
    print("=" * 60)
    print("[✓] Done! Problem is live on the platform.")

if __name__ == "__main__":
    main()
