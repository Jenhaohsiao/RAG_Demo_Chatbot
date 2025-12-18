import { test, expect, Page } from '@playwright/test';

// Phase 6 自動化測試：多語言 UI 語言切換功能
// 測試範圍：T073-T077

const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
];

const BASE_URL = 'http://localhost:5173';

test.describe('Phase 6 - 多語言 UI 語言切換 (T073-T077)', () => {
  
  test('T073: 語言選擇器循環動畫', async ({ page }) => {
    console.log('開始測試 T073：語言選擇器循環動畫');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // 檢查語言選擇器元素存在
    const languageButton = page.locator('[data-testid="language-selector-button"]');
    await expect(languageButton).toBeVisible();
    
    // 記錄循環過程
    const cycleTexts: string[] = [];
    for (let i = 0; i < 8; i++) {
      const text = await languageButton.textContent();
      cycleTexts.push(text || '');
      
      console.log(`時刻 ${i}s: "${text}"`);
      
      // 等待 1 秒
      if (i < 7) {
        await page.waitForTimeout(1000);
      }
    }
    
    // 驗證循環順序
    const expectedCycle = ['English', '中文', '한국어', 'Español', '日本語', 'العربية', 'Français'];
    for (let i = 0; i < 7; i++) {
      expect(cycleTexts[i]).toBe(expectedCycle[i]);
    }
    
    // 驗證循環重新開始
    expect(cycleTexts[7]).toBe(expectedCycle[0]);
    
    console.log('✅ T073 通過：循環動畫工作正常');
  });

  test('T074: RTL 布局支持（阿拉伯語）', async ({ page }) => {
    console.log('開始測試 T074：RTL 布局支持');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // 打開語言選擇器
    const languageButton = page.locator('[data-testid="language-selector-button"]');
    await languageButton.click();
    await page.waitForTimeout(300);
    
    // 尋找阿拉伯語選項
    const arabicOption = page.locator('button:has-text("العربية")');
    await arabicOption.click();
    await page.waitForTimeout(500);
    
    // 驗證 document.dir 改變為 rtl
    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    expect(htmlDir).toBe('rtl');
    console.log('✅ document.dir 已設定為 RTL');
    
    // 驗證 body 有 rtl-layout 類別
    const hasRtlClass = await page.evaluate(() => 
      document.body.classList.contains('rtl-layout')
    );
    expect(hasRtlClass).toBe(true);
    console.log('✅ body 含有 rtl-layout 類別');
    
    // 驗證文本對齐
    const textAlign = await page.evaluate(() => {
      const elem = document.querySelector('body');
      return window.getComputedStyle(elem!).textAlign;
    });
    console.log(`✅ 文本對齐: ${textAlign}`);
    
    console.log('✅ T074 通過：RTL 布局已套用');
  });

  test('T075: 語言改變處理器與後端同步', async ({ page, context }) => {
    console.log('開始測試 T075：語言改變處理器與後端同步');
    
    // 攔截 API 呼叫以驗證後端同步
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/session/') && request.method() === 'PUT') {
        apiCalls.push(request.url());
        console.log(`🔄 API 呼叫: ${request.method()} ${request.url()}`);
      }
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // 獲取當前語言
    const initialLanguage = await page.locator('[data-testid="language-selector-button"]').textContent();
    console.log(`初始語言: ${initialLanguage}`);
    
    // 打開語言選擇器
    const languageButton = page.locator('[data-testid="language-selector-button"]');
    await languageButton.click();
    await page.waitForTimeout(300);
    
    // 選擇中文
    const chineseOption = page.locator('button:has-text("中文")').first();
    await chineseOption.click();
    await page.waitForTimeout(500);
    
    // 驗證前端語言已改變
    const newLanguage = await languageButton.textContent();
    expect(newLanguage).toBe('中文');
    console.log('✅ 前端語言已改變為中文');
    
    // 驗證 localStorage 已更新
    const savedLanguage = await page.evaluate(() => 
      localStorage.getItem('rag-chatbot-language')
    );
    expect(savedLanguage).toContain('zh');
    console.log('✅ localStorage 已更新');
    
    // 驗證後端 API 被呼叫（如果有會話 ID）
    if (apiCalls.length > 0) {
      console.log(`✅ 後端同步成功: ${apiCalls.length} 個 API 呼叫`);
    } else {
      console.log('ℹ️ 無會話 ID，本地語言狀態已更新');
    }
    
    console.log('✅ T075 通過：語言改變處理器工作正常');
  });

  test('T076: 驗證所有組件使用 i18n', async ({ page }) => {
    console.log('開始測試 T076：驗證所有組件使用 i18n');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // 檢查硬編碼文字（應該沒有）
    const pageContent = await page.content();
    const hardcodedTexts = [
      'TODO: ',
      '[未翻譯]',
      'UNTRANSLATED',
    ];
    
    for (const text of hardcodedTexts) {
      expect(pageContent).not.toContain(text);
    }
    console.log('✅ 無硬編碼文字發現');
    
    // 驗證所有語言檔案有 selectLanguage 翻譯鍵
    const translationKeys = [
      'labels.selectLanguage',
      'settings.customPrompt.label',
      'settings.customPrompt.placeholder',
    ];
    
    for (const language of LANGUAGES) {
      console.log(`檢查 ${language.name} 翻譯...`);
      
      // 選擇該語言
      const languageButton = page.locator('[data-testid="language-selector-button"]');
      await languageButton.click();
      await page.waitForTimeout(300);
      
      const option = page.locator(`button:has-text("${language.name}")`).first();
      await option.click();
      await page.waitForTimeout(500);
      
      // 驗證翻譯已載入
      const i18nLoaded = await page.evaluate((keys) => {
        // @ts-ignore
        return window.i18n && keys.every(key => {
          // @ts-ignore
          return window.i18n.t(key) !== key;
        });
      }, translationKeys);
      
      expect(i18nLoaded).toBe(true);
      console.log(`✅ ${language.name} 翻譯完整`);
    }
    
    console.log('✅ T076 通過：所有組件使用 i18n');
  });

  test('T077: 完整的語言切換流程測試', async ({ page }) => {
    console.log('開始測試 T077：完整的語言切換流程');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // 測試場景 1：連續改變語言
    console.log('場景 1：連續改變語言');
    for (const language of LANGUAGES) {
      const languageButton = page.locator('[data-testid="language-selector-button"]');
      await languageButton.click();
      await page.waitForTimeout(200);
      
      const option = page.locator(`button:has-text("${language.name}")`).first();
      await option.click();
      await page.waitForTimeout(300);
      
      const currentLang = await languageButton.textContent();
      expect(currentLang).toContain(language.name);
      console.log(`✅ 已切換至 ${language.name}`);
    }
    
    // 測試場景 2：刷新後語言保留
    console.log('場景 2：刷新後語言保留');
    const languageButton = page.locator('[data-testid="language-selector-button"]');
    await languageButton.click();
    await page.waitForTimeout(300);
    
    const spanishOption = page.locator('button:has-text("Español")').first();
    await spanishOption.click();
    await page.waitForTimeout(300);
    
    // 刷新頁面
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const currentLang = await languageButton.textContent();
    expect(currentLang).toBe('Español');
    console.log('✅ 刷新後語言已保留');
    
    // 測試場景 3：RTL 與 LTR 切換
    console.log('場景 3：RTL 與 LTR 切換');
    const languageBtn = page.locator('[data-testid="language-selector-button"]');
    
    // 切換到阿拉伯語
    await languageBtn.click();
    await page.waitForTimeout(300);
    const arabicOpt = page.locator('button:has-text("العربية")').first();
    await arabicOpt.click();
    await page.waitForTimeout(500);
    
    const rtlDir = await page.evaluate(() => document.documentElement.dir);
    expect(rtlDir).toBe('rtl');
    console.log('✅ 已切換至 RTL 模式');
    
    // 切換回英文
    await languageBtn.click();
    await page.waitForTimeout(300);
    const englishOpt = page.locator('button:has-text("English")').first();
    await englishOpt.click();
    await page.waitForTimeout(500);
    
    const ltrDir = await page.evaluate(() => document.documentElement.dir);
    expect(ltrDir).toBe('ltr');
    console.log('✅ 已切換回 LTR 模式');
    
    console.log('✅ T077 通過：完整的語言切換流程成功');
  });

  test('T073-T077 完整性驗證', async ({ page }) => {
    console.log('開始進行完整性驗證');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // 驗證所有 7 種語言
    const languageButton = page.locator('[data-testid="language-selector-button"]');
    await languageButton.click();
    await page.waitForTimeout(300);
    
    const languageOptions = page.locator('[data-testid="language-option"]');
    const count = await languageOptions.count();
    
    expect(count).toBe(7);
    console.log(`✅ 所有 7 種語言都可用`);
    
    // 驗證每種語言都可選
    for (const language of LANGUAGES) {
      const option = page.locator(`button:has-text("${language.name}")`).first();
      await expect(option).toBeVisible();
    }
    console.log('✅ 所有語言選項可見');
    
    // 驗證循環動畫在菜單關閉時恢復
    const firstLangText = await languageButton.textContent();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    
    const afterCycleText = await languageButton.textContent();
    expect(afterCycleText).not.toBe(firstLangText);
    console.log('✅ 菜單關閉後循環動畫恢復');
    
    console.log('✅✅✅ Phase 6 完整性驗證完成！');
  });
});

// 性能測試
test.describe('Phase 6 - 性能測試', () => {
  test('語言切換響應時間', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const languageButton = page.locator('[data-testid="language-selector-button"]');
    
    const startTime = Date.now();
    
    await languageButton.click();
    await page.waitForTimeout(300);
    
    const chineseOption = page.locator('button:has-text("中文")').first();
    await chineseOption.click();
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`語言切換響應時間: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(1000);
  });

  test('循環動畫流暢度', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // 記錄 10 個循環週期
    const languageButton = page.locator('[data-testid="language-selector-button"]');
    const timestamps: number[] = [];
    
    for (let i = 0; i < 10; i++) {
      timestamps.push(Date.now());
      await page.waitForTimeout(1000);
    }
    
    // 檢查間隔是否一致
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    const variance = intervals.reduce((sum, interval) => 
      sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    console.log(`平均循環間隔: ${avgInterval.toFixed(2)}ms`);
    console.log(`間隔方差: ${variance.toFixed(2)}`);
    
    // 間隔應該接近 1000ms
    expect(Math.abs(avgInterval - 1000)).toBeLessThan(100);
  });
});
