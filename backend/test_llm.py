import os
import requests

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

MODEL = os.getenv(
    "LLM_MODEL",
    "deepseek/deepseek-chat",
)

URL = "https://openrouter.ai/api/v1/chat/completions"


def main():

    if not API_KEY:

        print("=" * 60)
        print("ERROR")
        print("OPENROUTER_API_KEY not found in .env")
        print("=" * 60)

        return

    print("=" * 60)
    print("Testing OpenRouter...")
    print("=" * 60)

    try:

        response = requests.post(

            URL,

            headers={

                "Authorization": f"Bearer {API_KEY}",

                "Content-Type": "application/json",

            },

            json={

                "model": MODEL,

                "messages": [

                    {

                        "role": "user",

                        "content": "Reply with exactly: OpenRouter connection successful."

                    }

                ],

            },

            timeout=30,

        )

        print(f"HTTP Status : {response.status_code}")

        response.raise_for_status()

        data = response.json()

        print("\nSUCCESS\n")

        print(data["choices"][0]["message"]["content"])

    except requests.exceptions.Timeout:

        print("\nERROR")
        print("Request timed out.")

    except requests.exceptions.ConnectionError:

        print("\nERROR")
        print("Unable to connect to OpenRouter.")

    except requests.exceptions.HTTPError:

        print("\nHTTP ERROR")

        try:

            print(response.json())
        except Exception:
            print(response.text)

    except Exception as e:

        print("\nUNEXPECTED ERROR")

        print(type(e).__name__)

        print(e)


if __name__ == "__main__":

    main()