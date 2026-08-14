const apiKey = "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";

async function test() {
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-ai/deepseek-v4-flash-0731",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10
      })
    });
    
    console.log("Status:", response.status);
    const data = await response.text();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
