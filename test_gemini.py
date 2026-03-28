import os
from google import genai
from google.genai import types

def generate():
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-3-flash-preview"

    prompt = """
You are a wellness data assistant.

Summarize this health JSON in simple language.
Return:
1. one short summary
2. three bullet insights
3. three practical recommendations

Health JSON:
{
  "steps": 6200,
  "sleep_hours": 6.1,
  "heart_rate_avg": 74
}
"""

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        ),
    ]

    response = client.models.generate_content(
        model=model,
        contents=contents,
    )

    print(response.text)

if __name__ == "__main__":
    generate()