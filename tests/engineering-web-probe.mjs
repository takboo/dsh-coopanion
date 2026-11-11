import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Business probe for the shared engineering runner's clean rc.1 Web profile.
// The container has no graphical session; native startup is tested separately.
export async function prepareClient(page) {
  const entry = page.getByText(/^(Add API Key|添加 API Key)$/i).first();
  const welcome = page.getByRole('button', { name: /^(Continue|继续)$/ }).and(page.locator(':enabled')).first();
  await entry.or(welcome).first().waitFor();
  if (await welcome.isVisible()) await welcome.click();
  await entry.click();
  const skip = page.getByText(/^(Set up later|Configure later|稍后设置|稍后配置)$/i).first();
  await skip.click();
  await skip.waitFor({ state: 'hidden' });
}

const installedDisplay = {
  en: { language: 'en', sidebar: 'Plugins', section: 'Installed plugins',
    title: 'Coopanion · Desk Pet Pal',
    description: 'A desk pet that keeps you company while you work. Catch up on Harness replies and pending actions, then pick up the conversation from your desktop.' },
  zh: { language: 'zh-CN', sidebar: '插件', section: '已安装插件',
    title: 'Coopanion · 桌宠搭子',
    description: '一只陪你工作的桌宠，帮你收好 Harness 的回复和待办，想接着聊时就在手边。' },
};
const iconSha256 = 'c9b49505f035fa2e0947be79730c27c0f662285c4877837b7a8cbbc85967dabb';

async function verifyInstalledDisplay(page, expected) {
  const { language, sidebar, section } = expected;
  await page.waitForFunction(lang => document.documentElement.lang === lang, language);
  await page.getByRole('button', { name: sidebar, exact: true }).click();
  const group = page.locator('[data-plugin-group="bundles"]');
  const heading = group.getByRole('heading', { name: section, exact: true });
  await heading.waitFor();
  const card = group.locator('[data-plugin-package="@takboo/dsh-coopanion"]');
  await card.scrollIntoViewIfNeeded();
  const titleButton = card.locator('button[aria-describedby]');
  const descriptionId = await titleButton.getAttribute('aria-describedby');
  assert.ok(descriptionId, 'Installed title must describe its own card');
  const descriptionLabel = card.locator('[id=' + JSON.stringify(descriptionId) + ']');
  await descriptionLabel.waitFor();
  const title = await titleButton.innerText();
  const description = await descriptionLabel.innerText();
  assert.equal(title, expected.title, language + ' installed title');
  assert.equal(description, expected.description, language + ' installed description');

  const icon = card.locator('img');
  await icon.waitFor();
  const { src, width, height } = await icon.evaluate(async img => {
    await img.decode();
    return { src: img.currentSrc, width: img.naturalWidth, height: img.naturalHeight };
  });
  assert.ok(src.startsWith('data:image/png;base64,'), 'Installed icon must be a PNG');
  const sha256 = createHash('sha256').update(Buffer.from(src.split(',')[1], 'base64')).digest('hex');
  assert.equal(sha256, iconSha256, 'Installed icon bytes');
  assert.deepEqual([width, height], [180, 180], 'Installed icon dimensions');
  return { language, section, title, description, icon: { width, height, sha256 } };
}

export async function verifyClient(page) {
  await page.locator('style[data-plugin="dsh-coopanion"]').waitFor({ state: 'attached' });
  const english = await verifyInstalledDisplay(page, installedDisplay.en);
  const direct = page.getByRole('button', { name: /^(Settings|设置)$/ });
  const account = page.getByRole('button', { name: /^(Account menu|账号菜单)$/ });
  await direct.or(account).first().waitFor();
  if (await direct.isVisible()) await direct.click();
  else {
    await account.click();
    await page.getByRole('menuitem', { name: /^(Settings|设置)(?:\s|$)/ }).click();
  }
  await page.getByRole('button', { name: /^(Desktop pet|桌宠)$/ }).click();
  const section = page.getByTestId('coopanion-settings');
  const start = section.getByRole('button', { name: /^(Start pet|启动桌宠)$/ });
  await section.getByTestId('pet-status').filter({ hasText: /Unable to start or run|启动或运行失败/ }).waitFor();
  await section.getByRole('alert').filter({ hasText: '桌宠需要桌面显示环境' }).waitFor();
  assert.equal(await section.getByTestId('pet-runtime-failure').count(), 0, 'A headless Host is not a missing Electron runtime');
  await section.getByRole('button', { name: /^(Close pet|关闭桌宠)$/ }).click();
  await section.getByTestId('pet-status').filter({ hasText: /Closed|已关闭/ }).waitFor();
  await start.click();
  await section.getByRole('alert').filter({ hasText: '桌宠需要桌面显示环境' }).waitFor();
  assert.equal(await start.isEnabled(), true);
  const autoStart = section.getByRole('switch', { name: /^(Start with Harness|随 Harness 启动)$/ });
  await autoStart.click();
  await section.getByRole('status').filter({ hasText: /^(Saved|已保存)$/ }).waitFor();
  assert.equal(await autoStart.getAttribute('aria-checked'), 'false');

  // This last assertion exercises the new browser UI with a controlled
  // runtime failure. The headless carrier cannot start the native installer.
  const statusRoute = '**/api/coopanion/status';
  await page.route(statusRoute, async route => {
    const upstream = await route.fetch();
    const envelope = await upstream.json();
    if (envelope.result?.ok) envelope.result.value.runtimeFailure = { reason: 'http', httpStatus: 403 };
    await route.fulfill({ response: upstream, json: envelope });
  });
  try {
    const alert = section.getByTestId('pet-runtime-failure');
    await alert.filter({ hasText: 'HTTP 403' }).waitFor();
    assert.match(await alert.innerText(), /electronPath/);
    assert.match(await alert.getByRole('link').getAttribute('href'), /docs\/usage\.md#electron-/);
  } finally { await page.unroute(statusRoute); }
  await page.getByRole('button', { name: 'General', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('menuitem', { name: '中文', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
  await page.keyboard.press('Escape');
  const chinese = await verifyInstalledDisplay(page, installedDisplay.zh);
  return {
    settings: ['official settings loaded and Host status responded', 'headless failure shown; close and manual retry work', 'auto-start preference saved through Host', 'controlled HTTP 403 status renders a recovery guide'],
    installedDisplay: [english, chinese],
  };
}
