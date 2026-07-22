from google import genai
from google.genai import errors
import os
import time
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

def test_gemini_connection():
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            print(f"Attempt {attempt + 1}: Contacting Gemini API...")
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents="Say Hello!"
            )
            print("\nSuccess! Response:")
            print(response.text)
            return
            
        except errors.ServerError as e:
            if e.code == 503:
                print(f"Server busy (503). Retrying in 5 seconds...")
                time.sleep(5)
            else:
                print(f"Server Error: {e}")
                break
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            break

if __name__ == "__main__":
    test_gemini_connection()