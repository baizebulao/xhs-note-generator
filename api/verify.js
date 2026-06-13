import codeHashes from './code-hashes.json' with { type: 'json' };

// 简易已使用记录（存内存，部署期间有效，重启清空）
// 更好的方案是接 Vercel KV，但 Hobby 免费版用这个够初期了
const usedCodes = new Set();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 限制 CORS：只允许自己的站点
  const allowedOrigins = [
    'https://xhs-note-generator.vercel.app',
    'https://xhs-note-generator-baizebulao.vercel.app'
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ valid: false, error: '请输入激活码' });
  }

  const normalized = code.trim().toUpperCase();

  // 简单限流：同一个IP最多尝试验证5次
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const attemptKey = `verify_${clientIP}`;
  if (!globalThis._verifyAttempts) globalThis._verifyAttempts = {};
  if (!globalThis._verifyAttempts[attemptKey]) {
    globalThis._verifyAttempts[attemptKey] = { count: 0, resetAt: Date.now() + 3600000 };
  }
  const attempts = globalThis._verifyAttempts[attemptKey];
  if (attempts.count >= 10) {
    return res.status(429).json({ valid: false, error: '尝试次数过多，请1小时后再试' });
  }
  attempts.count++;

  // 验证：SHA-256 比对
  const crypto = await import('crypto');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  const isValid = codeHashes.hashes.includes(hash);

  if (!isValid) {
    return res.status(200).json({ valid: false, error: '激活码无效' });
  }

  // 检查是否已使用（内存级别，重启后重置）
  if (usedCodes.has(normalized)) {
    return res.status(200).json({ 
      valid: false, 
      error: '该激活码已被使用，如需帮助请联系客服' 
    });
  }

  // 标记为已使用
  usedCodes.add(normalized);

  return res.status(200).json({ valid: true, message: '激活成功' });
}
