'use strict';

const { expect } = require('chai');
const sinon = require('sinon');

const ForEachPlugin = require('../src/index');

function createTestInstance(service, other = {}) {
	const log = sinon.stub();
	const serverless = {
		service: {
			functions: [],
			provider: {},
			...service
		},
		cli: {
			log
		},
		...other
	};

	return {
		plugin: new ForEachPlugin(serverless, {}, { log }),
		serverless
	};
}

describe('ForEachPlugin', function() {
	afterEach(function() {
		sinon.restore();
	});

	describe('should throw validation error when', function() {
		[
			{
				scenario: 'config is not an object',
				config: [],
				message: 'custom/$forEach must be object'
			},
			{
				scenario: 'required keys are missing',
				config: {},
				message: 'custom/$forEach must have required property \'iterator\''
			},
			{
				scenario: 'additional keys are present',
				config: {
					iterator: [],
					template: [''],
					junk: ''
				},
				message: 'custom/$forEach must NOT have additional properties'
			},
			{
				scenario: 'iterator type is invalid',
				config: {
					iterator: '',
					template: ['']
				},
				message: 'custom/$forEach/iterator must be array, custom/$forEach/iterator must be object, custom/$forEach/iterator must match exactly one schema in oneOf'
			},
			{
				scenario: 'iterator has $env property together with some other property',
				config: {
					iterator: {
						$env: 'foo',
						junk: ''
					},
					template: ['']
				},
				message: 'custom/$forEach/iterator must NOT have additional properties'
			},
			{
				scenario: 'iterator has $env property that is not a string',
				config: {
					iterator: {
						$env: 12345
					},
					template: ['']
				},
				message: 'custom/$forEach/iterator must be array, custom/$forEach/iterator/$env must be string'
			},
			{
				scenario: 'template type is invalid',
				config: {
					iterator: [''],
					template: ''
				},
				message: 'custom/$forEach/template must be array, custom/$forEach/template must be object, custom/$forEach/template must match exactly one schema in oneOf'
			}
		].forEach(({ scenario, config, message }) => {
			it(scenario, function() {
				const { plugin } = createTestInstance({
					custom: {
						$forEach: config
					}
				});

				expect(
					() => plugin.replace()
				).to.throw(message);
			});
		});
	});

	it('should define function event schema when defineFunctionEvent method is available', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				foo: 'foo',
				$forEach: {
					iterator: {
						bar: 'bar',
						baz: 'baz'
					},
					template: {
						'$forEach.key': '$forEach.value'
					}
				}
			}
		}, {
			configSchemaHandler: {
				defineFunctionEvent: sinon.stub()
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		sinon.assert.callCount(serverless.configSchemaHandler.defineFunctionEvent, 1);
		sinon.assert.calledWithExactly(serverless.configSchemaHandler.defineFunctionEvent,
			'aws',
			'$forEach',
			sinon.match.object
		);
	});

	it('should handle defineFunctionEvent being not defined', function() {
		const { plugin } = createTestInstance({
			custom: {
				foo: 'foo',
				$forEach: {
					iterator: {
						bar: 'bar',
						baz: 'baz'
					},
					template: {
						'$forEach.key': '$forEach.value'
					}
				}
			}
		}, {
			configSchemaHandler: {}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();
	});

	it('should support object key replacement', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				foo: 'foo',
				$forEach: {
					iterator: {
						bar: 'bar',
						baz: 'baz'
					},
					template: {
						'$forEach.key': '$forEach.value'
					}
				}
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom).to.deep.equal({
			foo: 'foo',
			bar: 'bar',
			baz: 'baz'
		});
	});

	it('should support array item replacement', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				foo: [
					{ before: 'before' },
					{
						$forEach: {
							iterator: {
								bar: 'bar',
								baz: 'baz'
							},
							template: [
								{ '$forEach.key': '$forEach.value' }
							]
						}
					},
					{ after: 'after' }
				]
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom.foo).to.deep.equal([
			{ before: 'before' },
			{ bar: 'bar' },
			{ baz: 'baz' },
			{ after: 'after' }
		]);
	});

	it('should support array item replacement when array size is increased during replacement', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				foo: [
					{
						$forEach: {
							iterator: {
								bar: 'bar',
								baz: 'baz'
							},
							template: [
								{ '$forEach.key': '$forEach.value' }
							]
						}
					},
					{
						$forEach: {
							iterator: {
								bar2: 'bar2',
								baz2: 'baz2'
							},
							template: [
								{ '$forEach.key': '$forEach.value' }
							]
						}
					}
				]
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom.foo).to.deep.equal([
			{ bar: 'bar' },
			{ baz: 'baz' },
			{ bar2: 'bar2' },
			{ baz2: 'baz2' }
		]);
	});

	it('should support nested configuration replacement', function() {
		const { plugin, serverless } = createTestInstance({
			custom: [{
				$forEach: {
					iterator: [{
						$forEach: {
							iterator: ['foo', 'bar'],
							template: ['$forEach.value/first']
						}
					}],
					template: [{
						$forEach: {
							iterator: ['value'],
							template: ['$forEach.$forEach.value/second']
						}
					}]
				}
			}]
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom).to.deep.equal([
			'foo/first/second',
			'bar/first/second'
		]);
	});

	it('should support using iterators with objects as values', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				$forEach: {
					iterator: {
						bar: {
							'name': 'bar',
							'nicknames': {
								'main': 'barberator',
								'secondary': 'barbarella',
							},
						},
						baz: {
							'name': 'baz',
							'nicknames': {
								'main': 'bazerator',
								'secondary': 'big baz',
							},
						}
					},
					template: {
						'$forEach.key': '$forEach.value.name',
						'$forEach.key_nickname': '$forEach.value.nicknames.main'
					}
				}
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom).to.deep.equal({
			'bar': 'bar',
			'bar_nickname': 'barberator',
			'baz': 'baz',
			'baz_nickname': 'bazerator',
		});
	});

	describe('should throw an error when value is object and no valid key is used in template', function() {
		[
			{
				scenario: 'no value key used in template',
				config: {
					iterator: {
						bar: {
							'name': 'bar',
						},
						baz: {
							'name': 'baz',
						}
					},
					template: {
						'$forEach.key': '$forEach.value',
					},
				},
				message: 'ForEach value is an object, but the template did not use a valid key from the object.\nValue: {"name":"bar"}\nTemplate: {"bar":"$forEach.value"}'
			},
			{
				scenario: 'invalid key used in template',
				config: {
					iterator: {
						bar: {
							'name': 'bar',
						},
						baz: {
							'name': 'baz',
						}
					},
					template: {
						'$forEach.key': '$forEach.value.invalidKey',
					}
				},
				message: 'ForEach value is an object, but the template did not use a valid key from the object.\nValue: {"name":"bar"}\nTemplate: {"bar":"$forEach.value.invalidKey"}',
			}
		].forEach(({ scenario, config, message }) => {
			it(scenario, function() {
				const { plugin } = createTestInstance({
					custom: {
						$forEach: config
					}
				});

				expect(
					() => plugin.replace()
				).to.throw(message);

			});
		});
	});

	it('should flatten one level when replacing array item and template is an array', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				foo: [
					{
						$forEach: {
							iterator: {
								bar: 'bar',
								baz: 'baz'
							},
							template: [
								{ '$forEach.key': '$forEach.value' }
							]
						}
					}
				]
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom.foo).to.deep.equal([
			{ bar: 'bar' },
			{ baz: 'baz' }
		]);
	});

	it('should support environment variable regex iterator', function() {
		sinon.stub(process, 'env').value({
			...process.env,
			FOR_EACH_TEST1: 'foo',
			FOR_EACH_TEST2: 'bar',
			not_FOR_EACH_TEST2: 'baz'
		});

		const { plugin, serverless } = createTestInstance({
			custom: {
				$forEach: {
					iterator: {
						$env: '^FOR_EACH_TEST'
					},
					template: {
						'$forEach.key': '$forEach.value'
					}
				}
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom).to.deep.equal({
			FOR_EACH_TEST1: 'foo',
			FOR_EACH_TEST2: 'bar'
		});
	});

	it('should support array iterator', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				$forEach: {
					iterator: ['foo', 'bar'],
					template: {
						'$forEach.key': '$forEach.value'
					}
				}
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom).to.deep.equal({
			0: 'foo',
			1: 'bar'
		});
	});

	it('should support object iterator', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				$forEach: {
					iterator: {
						fookey: 'foo',
						barkey: 'bar'
					},
					template: {
						'$forEach.key': '$forEach.value'
					}
				}
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom).to.deep.equal({
			fookey: 'foo',
			barkey: 'bar'
		});
	});

	it('should exclude paths that should not be traversed', function() {
		const pathThatShouldNotBeTraversed = 'serverless';
		const { plugin, serverless } = createTestInstance({
			custom: {
				$forEach: {
					iterator: {
						fookey: 'foo',
						barkey: 'bar'
					},
					template: {
						'$forEach.key': '$forEach.value'
					}
				}
			},
			[pathThatShouldNotBeTraversed]: {
				foo: 'foo'
			}
		});

		sinon.spy(plugin, 'findAndReplace');

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service).to.have.property(pathThatShouldNotBeTraversed);

		sinon.assert.called(plugin.findAndReplace);
		sinon.assert.neverCalledWith(plugin.findAndReplace,
			sinon.match.any,
			pathThatShouldNotBeTraversed
		);
	});

	it('should replace all interpolation variables', function() {
		const { plugin, serverless } = createTestInstance({
			custom: {
				$forEach: {
					iterator: ['foo'],
					template: {
						result: '$forEach.key:$forEach.key:$forEach.value:$forEach.value'
					}
				}
			}
		});

		expect(
			() => plugin.replace()
		).to.not.throw();

		expect(serverless.service.custom).to.deep.equal({
			result: '0:0:foo:foo'
		});
	});

	it('should count all matches', function() {
		const { plugin } = createTestInstance({
			custom: [{
				$forEach: {
					iterator: [{
						$forEach: {
							iterator: ['foo'],
							template: ['$forEach.value']
						}
					}],
					template: [{
						$forEach: {
							iterator: ['bar'],
							template: ['$forEach.value']
						}
					}]
				}
			}]
		});

		expect(plugin.replace()).to.equal(3);
	});

	it('throw an error when interpolated template is not a valid JSON', function() {
		const { plugin } = createTestInstance({
			custom: {
				$forEach: {
					iterator: ['\\'],
					template: {
						'$forEach.value': '$forEach.value'
					}
				}
			}
		});

		expect(
			() => plugin.replace()
		).to.throw('Interpolated template is not a valid JSON');
	});

	it('throw an error when interpolated template is an array, but $forEach was a part of the object', function() {
		const { plugin } = createTestInstance({
			custom: {
				foo: 'foo',
				$forEach: {
					iterator: ['bar'],
					template: ['$forEach.value']
				}
			}
		});

		expect(
			() => plugin.replace()
		).to.throw('Can\'t merge array into object');
	});
});
