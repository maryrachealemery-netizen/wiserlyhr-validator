export default async (req) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    // Parse the incoming data
    const { questions, states } = JSON.parse(req.body);
    
    // Validate the data
    if (!questions || !states || !Array.isArray(states)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request body" }),
      };
    }

    // Call the NEW Anthropic API (this is the fix!)
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

    // Check if the API call worked
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

    // Get the response from Claude
    const data = await apiResponse.json();
    
    // Extract the text from the new API format
    const responseText = data.content[0].text;
    
    // Clean up any markdown formatting that Claude might add
    const cleanContent = responseText.replace(/```json\n?|\n?```/g, '').trim();
    
    // Parse it into a JavaScript object
    const parsed = JSON.parse(cleanContent);

    // Send it back to the frontend
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
