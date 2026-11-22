"""
Orion Algo - Institutional Autonomous Trading System Unified Test Runner
Runs Unit, Integration, Stress, Simulation, and Frontend test suites in sequence.
Produces a unified Institutional Test Certification Report.
"""

import sys
import subprocess
import time
from typing import Dict, Any, List

def run_step(step_name: str, cmd: List[str], cwd: str = ".") -> Dict[str, Any]:
    print(f"\n================================================================================")
    print(f"▶ EXECUTING: {step_name}")
    print(f"  Command: {' '.join(cmd)}")
    print(f"================================================================================")
    start = time.time()
    try:
        proc = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        elapsed = round(time.time() - start, 2)
        print(proc.stdout)
        if proc.returncode == 0:
            print(f"✔ [PASS] {step_name} completed in {elapsed}s.")
            return {"name": step_name, "status": "PASS", "elapsed": elapsed, "output": proc.stdout}
        else:
            print(f"✘ [FAIL] {step_name} exited with code {proc.returncode} in {elapsed}s.")
            return {"name": step_name, "status": "FAIL", "elapsed": elapsed, "output": proc.stdout}
    except Exception as e:
        elapsed = round(time.time() - start, 2)
        print(f"✘ [ERROR] {step_name}: {e}")
        return {"name": step_name, "status": "ERROR", "elapsed": elapsed, "output": str(e)}

def main():
    print("=" * 80)
    print("       ORION ALGO COMPLETE AUTONOMOUS INSTITUTIONAL CERTIFICATION RUNNER       ")
    print("=" * 80)

    results = []

    # 1. Backend Pytest Unit & Integration Tests (RMS, Paper Matcher, Simulation, Stress)
    results.append(run_step(
        "Backend Pytest Suite (RMS, Matcher, Sim, Stress)",
        [sys.executable, "-m", "pytest", "backend/tests", "-v"],
        cwd="."
    ))

    # 2. Institutional Backend API Verification Checks
    results.append(run_step(
        "Backend End-to-End API Verification",
        [sys.executable, "tests_verification.py"],
        cwd="backend"
    ))

    # 3. Comprehensive Multi-Strategy Quant Stress Audit
    results.append(run_step(
        "Multi-Strategy Stress & Monte Carlo Simulation Audit",
        [sys.executable, "backend/run_comprehensive_audit.py"],
        cwd="."
    ))

    # 4. Frontend Vitest Suite (Cost config, Options, NSE validation, Kite data)
    results.append(run_step(
        "Frontend Vitest Suite (92 Unit/Component Tests)",
        ["npm.cmd", "test"],
        cwd="."
    ))

    print("\n" + "=" * 80)
    print("               INSTITUTIONAL CERTIFICATION AUDIT SUMMARY                        ")
    print("=" * 80)
    all_passed = True
    for r in results:
        status_mark = "✔ PASS" if r["status"] == "PASS" else "✘ FAIL"
        print(f"  [{status_mark}] {r['name']} ({r['elapsed']}s)")
        if r["status"] != "PASS":
            all_passed = False

    print("=" * 80)
    if all_passed:
        print("🎉 ALL INSTITUTIONAL TIERS PASSED! SYSTEM CERTIFIED FOR 100% AUTONOMOUS TRADING.")
        print("=" * 80)
        sys.exit(0)
    else:
        print("⚠️ CERTIFICATION FAILED: Review the error logs above.")
        print("=" * 80)
        sys.exit(1)

if __name__ == "__main__":
    main()
