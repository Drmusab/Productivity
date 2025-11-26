module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	rules: {
		'no-console': 'off',
	},
	ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
