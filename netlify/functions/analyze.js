export default async (req) => {
  if (req.method !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
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

    console.log("Calling Anthropic API with:", { questions, states });

    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `You are an employment law compliance expert. Analyze these interview questions for legal compliance issues across these US states: ${states.join(', ')}.

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
          }
        ]
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error("Anthropic API error:", errorData);
      return {
        statusCode: apiResponse.status,
        body: JSON.stringify({ 
          error: "AI service error", 
          details: errorData 
        }),
      };
    }

    const data = await apiResponse.json();
    console.log("Anthropic API response:", data);
    
    const responseText = data.content[0].text;
    const cleanContent = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
    };

  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Server error", 
        message: error.message 
      }),
    };
  }
};
