export default async (req, res) => {
  if (req.method !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {
    const { questions, states } = JSON.parse(req.body);

    if (!questions || !states || !Array.isArray(states)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request body" }),
      };
    }

    const apiResponse = await fetch("https://api.anthropic.com/v1/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens_to_sample: 4000,
        temperature: 0,
        stop_sequences: ["\n\n"],
        input: `You are an employment law compliance expert. Analyze these interview questions for legal compliance issues across these US states: ${states.join(', ')}.

Interview Questions:
${questions}

For each question, identify:
1. Whether it's compliant or problematic
2. Specific legal issues (if any)
3. Which states have concerns
4. Risk level (Low/Medium/High)
5. A compliant alternative question

Format your response as JSON with this structure:
{
  "overallRisk": "Low/Medium/High",
  "summary": "Brief overview of findings",
  "analyses": [
    {
      "question": "The original question",
      "status": "compliant/problematic",
      "riskLevel": "Low/Medium/High",
      "issues": ["Issue 1", "Issue 2"],
      "affectedStates": ["State1", "State2"],
      "legalBasis": "Explanation of the legal concern",
      "alternative": "Suggested compliant question"
    }
  ]
}

Respond ONLY with valid JSON, no other text.`
      }),
    });

    const data = await apiResponse.json();

    // If API returned a string (Anthropic often returns text), parse it
    let parsed;
    if (typeof data.completion === "string") {
      const cleanContent = data.completion.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } else if (typeof data.completion === "object") {
      parsed = data.completion; // Already JSON
    } else {
      throw new Error("Unexpected API response format");
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", message: error.message }),
    };
  }
};
