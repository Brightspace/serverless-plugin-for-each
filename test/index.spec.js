'use strict';

const { expect } = require('chai');

const ForEachPlugin = require('../src/index');

describe('ForEachPlugin', function() {
	it('should create an instance', function() {
		expect(() => new ForEachPlugin())
			.to.not.throw();
	});
});
