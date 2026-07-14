import { nodeConfig, setDirectoryConfigs } from 'eslint-config-brightspace';

export default setDirectoryConfigs(
	nodeConfig,
	{
		test: [
			...nodeConfig,
			{
				languageOptions: {
					globals: {
						after: 'readonly',
						afterEach: 'readonly',
						before: 'readonly',
						beforeEach: 'readonly',
						describe: 'readonly',
						it: 'readonly'
					}
				},
				rules: {
					'no-invalid-this': 'off'
				}
			}
		]
	}
);
