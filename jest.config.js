const ignorePatterns = [
	'cdav-library',
]

module.exports = {
	preset: '@vue/cli-plugin-unit-jest/presets/no-babel',
	testMatch: ['<rootDir>/src/**/*.(spec|test).(ts|js)'],
	collectCoverageFrom: [
		'<rootDir>/src/**/*.{js,vue}',
	],
	transformIgnorePatterns: [
		'node_modules/(?!(' + ignorePatterns.join('|') + ')/)',
	],
}
