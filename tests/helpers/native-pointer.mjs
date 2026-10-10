/** A transparent native window enables input asynchronously after hovering. */
export async function petClick(page, options = {}, twice = false) {
  const pet = page.locator('#pet');
  await pet.hover();
  await page.waitForSelector('#pet[data-native-hit=true]');
  await pet[twice ? 'dblclick' : 'click'](options);
}
