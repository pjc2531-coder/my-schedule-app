module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      message: 'POST 요청만 허용됩니다.'
    });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const apiKey = process.env.GAS_API_KEY;

  if (!gasUrl || !apiKey) {
    return res.status(500).json({
      success: false,
      message: 'Vercel 환경 변수 GAS_WEB_APP_URL 또는 GAS_API_KEY가 설정되지 않았습니다.'
    });
  }

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...req.body,
        apiKey
      }),
      redirect: 'follow'
    });

    const raw = await response.text();
    let result;

    try {
      result = JSON.parse(raw);
    } catch (_) {
      const contentType = response.headers.get('content-type') || 'unknown';
      const finalHost = (() => {
        try { return new URL(response.url).hostname; } catch (_) { return 'unknown'; }
      })();

      throw new Error(
        'GAS 응답 진단: HTTP ' + response.status +
        ', Content-Type=' + contentType +
        ', redirected=' + response.redirected +
        ', finalHost=' + finalHost
      );
    }

    if (!response.ok || !result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Google Sheets 저장에 실패했습니다.'
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: error.message || 'Google Apps Script 연결에 실패했습니다.'
    });
  }
};
