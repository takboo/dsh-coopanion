import assert from 'node:assert/strict';

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

export async function verifyClient(page) {
  await page.locator('style[data-plugin="dsh-coopanion"]').waitFor({ state: 'attached' });
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
  return ['official settings loaded and Host status responded', 'headless failure shown; close and manual retry work', 'auto-start preference saved through Host', 'controlled HTTP 403 status renders a recovery guide'];
}
