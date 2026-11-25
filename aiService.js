async function generateAIResponse({ prompt, webSearch, lang }) {
  const apiKey = process.env.AI_API_KEY || process.env.AI_PROVIDER_API_KEY; 

  // یہاں ہم نے ماڈلز کی ایک لسٹ بنا دی ہے۔ کوڈ باری باری ان کو ٹرائی کرے گا۔
  const modelsToTry = [
    process.env.AI_MODEL_NAME || 'gemini-3.5-flash-lite', // پہلا ماڈل (سب سے تیز)
    'gemini-3.5-flash',                                    // دوسرا ماڈل (اگر پہلا مصروف ہو)
    'gemini-2.5-flash'                                     // تیسرا ماڈل (بیک اپ)
  ];

  if (!apiKey) {
    return {
      reply: `Talivexa AI Server Response (Created by Mr. Irfan):\n\nYour backend received: "${prompt}" (lang: ${lang}, webSearch: ${Boolean(webSearch)}).\nConfigure AI_API_KEY in Vercel to connect a live model provider.`,
      providerConfigured: false
    };
  }

  let lastError = "تمام ماڈلز مصروف ہیں، براہ کرم کچھ دیر بعد کوشش کریں۔";

  // ہم ہر ماڈل کو باری باری ٹرائی کریں گے
  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Respond in language code "${lang}". ${webSearch ? 'Include structured research points for: ' : ''}${prompt}` }] }]
        })
      });
      
      const data = await response.json();
      
      // اگر گوگل کی طرف سے ایرر آیا
      if (data.error) {
        // اگر ایرر 503 (مصروف) یا 429 (حد سے زیادہ) ہے تو اگلے ماڈل پر جائیں
        if (data.error.code === 503 || data.error.code === 429) {
          lastError = `ماڈل ${model} مصروف ہے۔`;
          continue; // اگلے ماڈل پر جائیں
        }
        // اگر کوئی اور ایرر ہے (جیسے کی غلط ہے) تو وہیں رک جائیں
        return { reply: `API Error: ${data.error.message}`, providerConfigured: true };
      }

      // اگر کامیابی سے جواب آ گیا
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { reply: text, providerConfigured: true };
      }

    } catch (error) {
      // نیٹ ورک کا ایرر ہو تو بھی اگلے ماڈل پر جائیں
      lastError = `Network Error: ${error.message}`;
      continue; 
    }
  }

  // اگر سارے ماڈلز ناکام ہو جائیں
  return { reply: `Talivexa AI Error: ${lastError}`, providerConfigured: true };
}

module.exports = { generateAIResponse };
