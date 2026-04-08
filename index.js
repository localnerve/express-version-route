import semver from 'semver';

export class RouteVersionUnmatchedError extends Error {
  constructor (message, options) {
    super(message, options);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default class VersionRouter {
  /**
   * Given a versionMap, create the version route Express middleware.
   * 
   * @param {Map} versionsMap - key = version spec string, value = middleware function
   * @param {Object} [options] - options
   * @param {Boolean} [options.useMaxVersion] - true to use the maximum version, false otherwise
   */
  static route (versionsMap, {
    useMaxVersion = false
  } = {}) {
    const checkVersionMatch = (requestedVersion, routeVersion) =>
      semver.valid(requestedVersion) && semver.satisfies(requestedVersion, routeVersion);

    return (req, res, next) => {
      const versionArray = [];

      for (const [versionKey, versionRouter] of versionsMap) {
        versionArray.push(versionKey);
        if (checkVersionMatch(req.version, versionKey)) {
          return versionRouter(req, res, next);
        }
      }

      if (useMaxVersion) {
        const maxVersion = semver.maxSatisfying(versionArray, req.version);

        if (maxVersion) {
          for (const [versionKey, versionRouter] of versionsMap) {
            if (checkVersionMatch(maxVersion, versionKey)) {
              return versionRouter(req, res, next);
            }
          }
        }
      }

      const defaultRoute = versionsMap.get('default');
      if (defaultRoute) {
        return defaultRoute(req, res, next);
      }

      return next(new RouteVersionUnmatchedError(`${req.version} doesn't match any versions`));
    }
  }
}