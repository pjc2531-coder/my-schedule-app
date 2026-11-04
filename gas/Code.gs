const CONFIG = {
  SHEET_NAME: '일정관리',
  HEADERS: ['구분', '날짜', '시작', '종료', '내용', '완료', '메모'],
  CATEGORIES: ['일정', '약속', '시험', '업무', '기타']
};

/**
 * 기존 Apps Script 웹앱 화면을 유지하기 위한 doGet.
 * 새 프론트엔드는 Vercel에서 제공됩니다.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('일정 등록')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Vercel 서버 함수가 호출하는 JSON API.
 * Script Properties에 SCHEDULE_API_KEY를 설정해야 합니다.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('요청 내용이 비어 있습니다.');
    }

    const data = JSON.parse(e.postData.contents);
    const expectedKey = PropertiesService.getScriptProperties()
      .getProperty('SCHEDULE_API_KEY');

    if (!expectedKey) {
      throw new Error('Apps Script의 SCHEDULE_API_KEY 설정이 필요합니다.');
    }

    if (!data || data.apiKey !== expectedKey) {
      throw new Error('API 인증에 실패했습니다.');
    }

    delete data.apiKey;
    const result = saveSchedule(data);

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error && error.message ? error.message : '알 수 없는 오류가 발생했습니다.'
    });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 일정 저장 및 서버 측 입력값 검증
 */
function saveSchedule(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('입력 정보가 올바르지 않습니다.');
  }

  const category = String(data.category || '').trim();
  const dateText = String(data.date || '').trim();
  const startText = String(data.start || '').trim();
  const endText = String(data.end || '').trim();
  const content = String(data.content || '').trim();
  const memo = String(data.memo || '').trim();

  if (!CONFIG.CATEGORIES.includes(category)) {
    throw new Error('구분을 올바르게 선택해 주세요.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error('날짜를 올바르게 입력해 주세요.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timezone = ss.getSpreadsheetTimeZone();
  const dateValue = Utilities.parseDate(dateText, timezone, 'yyyy-MM-dd');
  const verifiedDate = Utilities.formatDate(dateValue, timezone, 'yyyy-MM-dd');

  if (verifiedDate !== dateText) {
    throw new Error('존재하지 않는 날짜입니다.');
  }

  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timePattern.test(startText)) {
    throw new Error('시작 시각을 올바르게 입력해 주세요.');
  }
  if (!timePattern.test(endText)) {
    throw new Error('종료 시각을 올바르게 입력해 주세요.');
  }

  const startParts = startText.split(':').map(Number);
  const endParts = endText.split(':').map(Number);
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];

  if (endMinutes <= startMinutes) {
    throw new Error('종료 시각은 시작 시각보다 늦어야 합니다.');
  }

  if (!content) {
    throw new Error('일정 내용을 입력해 주세요.');
  }
  if (content.length > 200) {
    throw new Error('일정 내용은 200자 이내로 입력해 주세요.');
  }
  if (memo.length > 1000) {
    throw new Error('메모는 1,000자 이내로 입력해 주세요.');
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error("'" + CONFIG.SHEET_NAME + "' 탭을 찾을 수 없습니다.");
  }

  const actualHeaders = sheet
    .getRange(1, 1, 1, CONFIG.HEADERS.length)
    .getDisplayValues()[0]
    .map(value => String(value).trim());

  const headersMatch = CONFIG.HEADERS.every(
    (header, index) => actualHeaders[index] === header
  );

  if (!headersMatch) {
    throw new Error(
      '시트 1행의 열 이름이나 순서가 올바르지 않습니다. ' +
      '구분, 날짜, 시작, 종료, 내용, 완료, 메모 순서인지 확인해 주세요.'
    );
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, 7).setValues([[
      category,
      dateValue,
      startMinutes / 1440,
      endMinutes / 1440,
      content,
      false,
      memo
    ]]);

    sheet.getRange(newRow, 2).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(newRow, 3, 1, 2).setNumberFormat('HH:mm');
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const displayDate = Utilities.formatDate(dateValue, timezone, 'M월 d일');

  return {
    success: true,
    message: displayDate + ' ' + content + ' ' +
      startText + '~' + endText + ' 저장했습니다.'
  };
}
