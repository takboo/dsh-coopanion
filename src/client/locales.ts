export const zh = {
  nav: '桌宠', title: '桌宠', intro: '让大肥鱼陪你工作，并在任务完成或需要确认时提醒你。',
  languageHint: '界面语言跟随 Harness；未指定语言时自动使用系统语言。',
  runtime: '桌宠状态', running: '正在显示', hidden: '已隐藏', stopped: '已关闭', starting: '正在启动…', stopping: '正在关闭…', error: '启动或运行失败', loading: '正在连接…',
  start: '启动桌宠', show: '显示桌宠', hide: '隐藏桌宠', restart: '重启', stop: '关闭桌宠',
  runtimeHint: '关闭后可随时从此页面重新启动。隐藏时仍可接收系统通知。',
  preferences: '偏好设置', autoStart: '随 Harness 启动', autoStartHint: '下次启动 Harness 时自动打开桌宠。',
  roam: '闲时走动', roamHint: '桌宠空闲时在当前屏幕上缓慢移动。', notifications: '任务通知', notificationsHint: '任务完成、出错和等待确认时显示系统通知与桌宠提醒。',
  size: '角色尺寸', sizeHint: '90–240 像素，修改后立即生效。', duration: '气泡显示时长', durationHint: '2–60 秒；等待确认等进行中的提示保持显示。',
  characters: '角色与动画', charactersHint: '导入、预览、切换或删除自己的 .dshpet 角色包；选择会在重启后保留。', manage: '管理角色',
  saved: '已保存', saving: '正在保存…', refused: '配置已发生变化或无法保存，请根据当前值重新修改。', invalid: '请输入范围内的数字。', unavailable: '当前连接无法修改宿主配置。请在本机 Harness 中打开此页面。',
};
export type LocaleKey = keyof typeof zh;
export const en: Record<LocaleKey, string> = {
  nav: 'Desktop pet', title: 'Desktop pet', intro: 'Keep DeepSeek Whale by your side and get a reminder when a task finishes or needs your attention.',
  languageHint: 'The interface follows the Harness language, using the system language when no preference is set.',
  runtime: 'Pet status', running: 'Visible', hidden: 'Hidden', stopped: 'Closed', starting: 'Starting…', stopping: 'Closing…', error: 'Unable to start or run', loading: 'Connecting…',
  start: 'Start pet', show: 'Show pet', hide: 'Hide pet', restart: 'Restart', stop: 'Close pet',
  runtimeHint: 'You can start the pet again here after closing it. A hidden pet still receives system notifications.',
  preferences: 'Preferences', autoStart: 'Start with Harness', autoStartHint: 'Open the pet automatically the next time Harness starts.',
  roam: 'Roam when idle', roamHint: 'Move slowly across the current screen while idle.', notifications: 'Task notifications', notificationsHint: 'Show system notifications and pet reminders for completion, errors and approval requests.',
  size: 'Character size', sizeHint: '90–240 pixels. Changes apply immediately.', duration: 'Bubble duration', durationHint: '2–60 seconds. Active prompts such as approval requests remain visible.',
  characters: 'Characters and animation', charactersHint: 'Import, preview, switch or remove custom .dshpet character packs. Your selection survives restarts.', manage: 'Manage characters',
  saved: 'Saved', saving: 'Saving…', refused: 'The configuration changed or could not be saved. Review the current values and try again.', invalid: 'Enter a number within the allowed range.', unavailable: 'This connection cannot change Host preferences. Open this page in your local Harness.',
};
