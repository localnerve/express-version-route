import { describe, it } from 'node:test';
import assert from 'node:assert';
import versionRouter, { RouteVersionUnmatchedError } from '../index.js';

describe('VersionRouter.route', () => {
  it('match the route', () => {
    const v1 = '1.0';
    const requestedVersion = '1.0.0';

    const routesMap = new Map();
    routesMap.set(v1, () => ({ testVersion: v1 }));

    const middleware = versionRouter.route(routesMap)
    const result = middleware({
      version: requestedVersion
    }, {}, () => {});

    assert.strictEqual(result.testVersion, v1);
  });

  it('dont match if requestVersion is not semver syntax', () => {
    const v1 = '1.0';
    const requestedVersion = '1.0';

    const routesMap = new Map();
    routesMap.set(v1, () => ({ testVersion: v1 }));

    const middleware = versionRouter.route(routesMap);
    const result = middleware({
      version: requestedVersion
    }, {}, () => {});

    assert.ok(!result);
  });

  it('dont match the requestVersion and error out if no match exists', t => {
    const v1 = '1.0';
    const requestedVersion = '3.0.0';
    const nextHandler = t.mock.fn(err => err);

    const routesMap = new Map();
    routesMap.set(v1, () => ({ testVersion: v1 }));

    const middleware = versionRouter.route(routesMap);

    const resIn = null;
    const result = middleware({
      version: requestedVersion
    }, resIn, nextHandler);
  
    assert.ok(!resIn);
    assert.strictEqual(nextHandler.mock.callCount(), 1);
    assert.ok(result instanceof Error);
    assert.ok(result instanceof RouteVersionUnmatchedError);
    assert.ok(result.name === 'RouteVersionUnmatchedError');
    assert.strictEqual(result.message, `${requestedVersion} doesn't match any versions`);
  });

  it('given 2 versions, first version matches', () => {
    const v1 = '1.0';
    const v2 = '2.0';
    const requestedVersion = '1.0.0';

    const routesMap = new Map();
    routesMap.set(v1, () => ({ testVersion: v1 }));
    routesMap.set(v2, () => ({ testVersion: v2 }));

    const middleware = versionRouter.route(routesMap);
    const result = middleware({
      version: requestedVersion
    }, {}, () => {});

    assert.strictEqual(result.testVersion, v1);
  });

  it('given 2 overlapping matching versions, first match wins', () => {
    const v1 = '>=1.0';
    const v2 = '>=2.0';
    const requestedVersion = '2.0.0';

    // Order matters here:
    const routesMap = new Map();
    routesMap.set(v2, () => ({ testVersion: v2 }));
    routesMap.set(v1, () => ({ testVersion: v1 }));

    const middleware = versionRouter.route(routesMap);
    const result = middleware({
      version: requestedVersion
    }, {}, () => {});

    assert.strictEqual(result.testVersion, v2);
  });

  it('given 2 versions, second version matches so the map insertion order doesnt count', () => {
    const v1 = '1.0';
    const v2 = '2.0';
    const requestedVersion = '1.0.0';

    // Order shouldn't matter here:
    const routesMap = new Map();
    routesMap.set(v2, () => ({ testVersion: v2 }));
    routesMap.set(v1, () => ({ testVersion: v1 }));

    const middleware = versionRouter.route(routesMap);
    const result = middleware({
      version: requestedVersion
    }, {}, () => {});

    assert.strictEqual(result.testVersion, v1);
  });

  it('when no version mapping is provided, throw', () => {
    const middleware = versionRouter.route();
    assert.throws(() => middleware({
      version: '1.0.0'
    }, {}, () => {}));
  });

  it('given 2 versions and a default, if no match is found the default route should be used', () => {
    const v1 = '1.0';
    const v2 = '2.0';
    const requestedVersion = '3.0.0';

    const routesMap = new Map();
    routesMap.set(v2, () => ({ testVersion: v2 }));
    routesMap.set(v1, () => ({ testVersion: v1 }));
    routesMap.set('default', () => ({ testVersion: 'default' }));

    const middleware = versionRouter.route(routesMap)
    const result = middleware({
      version: requestedVersion
    }, {}, () => {});

    assert.strictEqual(result.testVersion, 'default');
  });

  it('given 2 versions, max version matches', () => {
    const v1 = '1.2.0';
    const v2 = '1.2.3';
    const requestedVersion = '1.2';

    const routesMap = new Map();
    routesMap.set(v1, () => ({ testVersion: v1 }));
    routesMap.set(v2, () => ({ testVersion: v2 }));

    const middleware = versionRouter.route(routesMap, { useMaxVersion: true });
    const result = middleware({
      version: requestedVersion
    }, {}, () => {});

    assert.strictEqual(result.testVersion, v2);
  });

  it('given 2 versions, if no max version default matches', () => {
    const v1 = '1.2.0';
    const v2 = '1.2.3';
    const v3 = 'default';
    const requestedVersion = '1.2';

    const routesMap = new Map();
    routesMap.set(v1, () => ({ testVersion: v1 }));
    routesMap.set(v2, () => ({ testVersion: v2 }));
    routesMap.set(v3, () => ({ testVersion: v3 }));

    const middleware = versionRouter.route(routesMap);
    const result = middleware({
      version: requestedVersion
    }, {}, () => {});

    assert.strictEqual(result.testVersion, v3);
  });
});