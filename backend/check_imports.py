import sys
import os

try:
    import main
    print("SUCCESS: main.py imported without errors.")
except ModuleNotFoundError as e:
    print(f"MISSING_MODULE: {e.name}")
except Exception as e:
    print(f"OTHER_ERROR: {e}")
