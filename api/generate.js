const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { keyword, audience, style } = req.body;

    if (!keyword || !audience) {
      return res.status(400).json({ error: '缺少必填参数' });
    }

    const styleGuide = {
      '种草': '以种草安利的口吻，强调产品的优点和必买理由，语气热情有感染力，像闺蜜推荐好物一样',
      '教程': '以干货教程的口吻，分步骤讲解，条理清晰，给出实用可操作的建议，让读者觉得学到了',
      '分享': '以真实分享的口吻，像和朋友聊天一样自然，有个人体验感受，真实不做作',
      '测评': '以客观测评的口吻，从多个维度分析优缺点，给出专业评价和购买建议，有理有据'
    };
    const guide = styleGuide[style] || styleGuide['种草'];

    const prompt = `你是一个资深的小红书博主，擅长写出高赞爆款笔记。请根据以下信息生成一篇小红书笔记：

【产品/主题】${keyword}
【目标受众】${audience}
【笔记风格】${style} —— ${guide}

请严格按照以下 JSON 格式输出（不要输出任何其他内容，不要用 markdown 代码块包裹）：
{
  "title": "标题文字（包含1-2个emoji，15字以内，吸引眼球，可适当夸张但不要标题党）",
  "content": "正文内容（300-500字，要有emoji点缀，分段清晰，每段2-3句话，使用换行符\\n分段，语言口语化接地气，符合小红书社区风格，${guide}）",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5", "标签6", "标签7", "标签8"]
}

要求：
- 标题要有网感和吸引力，让人忍不住点进来
- 正文开头要用一句金句或共鸣的话抓住读者
- 适当使用"姐妹们""绝绝子""冲""YYDS"等小红书常用表达但不要过度
- 标签要包含热门词和长尾词混合，8个左右
- 整体风格要像真人写的，不要像AI生成的`;

    const response = await fetch(ZHIPU_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Zhipu API error:', response.status, errText);
      return res.status(response.status).json({ error: 'AI服务暂时不可用，请稍后重试' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'AI返回内容为空' });
    }

    return res.status(200).json({ content });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
