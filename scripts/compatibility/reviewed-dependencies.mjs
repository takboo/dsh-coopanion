// Exact companion dependencies reviewed against the published SDK peers and package sources.
// These apply only to isolated candidate proposals; unknown versions retain the production baseline.
const baselines = Object.freeze({
  '0.2.2-alpha.2': Object.freeze({
    '@deepseek-ai/cordis': '4.0.6-alpha.1', '@deepseek-ai/schemastery': '3.18.6-alpha.1',
    '@deepseek-ai/cordis-plugin-loader': '1.0.7-alpha.1', '@deepseek-ai/cordis-plugin-include': '1.0.11-alpha.1',
    '@deepseek-ai/cordis-plugin-group': '1.0.6-alpha.1', '@deepseek-ai/cosmokit': '1.8.7-alpha.1',
  }),
  '0.2.2-alpha.3': Object.freeze({
    '@deepseek-ai/cordis': '4.0.6-alpha.2', '@deepseek-ai/schemastery': '3.18.6-alpha.2',
    '@deepseek-ai/cordis-plugin-loader': '1.0.7-alpha.2', '@deepseek-ai/cordis-plugin-include': '1.0.11-alpha.2',
    '@deepseek-ai/cordis-plugin-group': '1.0.6-alpha.2', '@deepseek-ai/cosmokit': '1.8.7-alpha.2',
  }),
  '0.2.2-rc.1': Object.freeze({
    '@deepseek-ai/cordis': '4.1.0', '@deepseek-ai/schemastery': '3.19.0',
    '@deepseek-ai/cordis-plugin-loader': '1.1.0', '@deepseek-ai/cordis-plugin-include': '1.1.0',
    '@deepseek-ai/cordis-plugin-group': '1.1.0', '@deepseek-ai/cosmokit': '1.9.0',
  }),
});
export const reviewedDependencies = target => baselines[target];
