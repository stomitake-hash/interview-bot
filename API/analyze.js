export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const mode = body.mode || 'evaluate';

    let prompt;

    if (mode === 'followup') {
      const { question, axis, answer, category } = body;
      prompt = `あなたは採用面接の面接官AIです。
以下の質問と回答をもとに、より深く候補者を理解するための深掘り質問を1つ生成してください。

評価軸: ${axis}
質問: ${question}
回答: ${answer}
採用区分: ${category || '中途'}

## 指示
- 回答の具体的なエピソードや背景を引き出す質問にしてください
- 30〜60文字程度の自然な日本語で
- 質問文のみを返してください（前置き不要）`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const rawText = await response.text();
      if (!response.ok) return res.status(500).json({ error: rawText });

      const data = JSON.parse(rawText);
      const followupQuestion = data.content[0].text.trim();
      return res.status(200).json({ followupQuestion });

    } else {
      const { questions, answers, axes } = body;

      const qaText = questions.map((q, i) => {
        const a = answers[i];
        let text = `【質問${i+1}】評価軸: ${q.axis}\n質問: ${q.text}\n回答: ${a.answer || '（回答なし）'}`;
        if (a.followupQ || a.ownQ) {
          text += `\n深掘り質問: ${a.followupQ || a.ownQ}\n深掘り回答: ${a.followupA || '（回答なし）'}`;
        }
        if (a.memo) text += `\n面接官メモ: ${a.memo}`;
        return text;
      }).join('\n\n');

      prompt = `あなたは採用面接の評価専門AIです。以下の面接の質問と回答を分析し、評価してください。

## 面接内容
${qaText}

## 評価軸
${axes.join('、')}

## 指示
以下のJSON形式のみで回答してください。前置きや説明は不要です。

{
  "axisScores": {
    "評価軸名": {
      "score": 1から5の整数,
      "reason": "30文字以内の理由"
    }
  },
  "totalScore": 0から100の整数,
  "strengths": ["強み1", "強み2"],
  "concerns": ["懸念点1", "懸念点2"],
  "summary": "100文字以内の総評"
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const rawText = await response.text();
      if (!response.ok) return res.status(500).json({ error: rawText });

      const data = JSON.parse(rawText);
      const text = data.content[0].text.trim();
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      return res.status(200).json(result);
    }

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
