// # ThunderCats Action
//
// A ThunderCats Action is an Observable that can be called like a function!
const Rx = require('rx'),
    invariant = require('invariant'),
    // warning = require('warning'),
    assign = require('object.assign'),
    areObservable = require('../utils').areObservable,
    slice = Array.prototype.slice;

class Actions {
  constructor() {
    let actionDefs = this.__getActionNames(this)
      .map(name => {
        return {
          name: name,
          map: this[name]
        };
      });

    Actions._createActions(actionDefs, this);
  }

  __getActionNames(ctx) {
    invariant(
      ctx instanceof Actions,
      'internal method `getActionNames` called outside of Actions instance'
    );

    return Object.getOwnPropertyNames(ctx.constructor.prototype)
      .filter(function(name) {
        return name !== 'constructor' &&
          name.indexOf('__') === -1 &&
          typeof ctx[name] === 'function';
      });
  }

  static _create(map) {
    let observers = [];

    let actionStart = new Rx.Subject();
    let actionEnd = new Rx.Subject();

    function action(value) {
      if (typeof map === 'function') {
        value = map(value);
      }

      actionStart.onNext(value);
      let os = observers.slice(0);
      for (let i = 0, len = os.length; i < len; i++) {
        os[i].onNext(value);
      }
      actionEnd.onNext();

      return value;
    }

    assign(action, Rx.Observable.prototype, Rx.Subject.prototype);

    Rx.Observable.call(action, observer => {
      observers.push(observer);
      return {
        dispose: () => {
          observers.splice(observers.indexOf(observer), 1);
        }
      };
    });

    // ### Has Observers
    //
    // returns the current number of observers for this action
    action.hasObservers = function hasObservers() {
      return observers.length > 0 ||
        actionStart.hasObservers() ||
        actionEnd.hasObservers();
    };

    // ### Wait For
    //
    // takes observables as arguments and will
    // wait for each observable to publish a new value
    // before notifying its observers.
    //
    // NOTE: if any of the observables never publishes a new value
    // this observable will not either.
    action.waitFor = function(observables) {
      observables = slice.call(arguments);

      invariant(
        areObservable(observables),
        'action.waitFor takes only observables as arguments'
      );

      return actionStart
        .flatMap(function (value) {
          return Rx.Observable.combineLatest(
            observables.map(function (observable) {
              observable = observable.publish();
              observable.connect();
              return observable;
            }),
            function () {
              return value;
            }
          );
        });
    };

    return action;
  }

  static _createActions(actions, ctx) {
    ctx = ctx || {};
    invariant(
      typeof ctx === 'object',
      'thisArg supplied to createActions must be an object but got %s',
      ctx
    );

    invariant(
      Array.isArray(actions),
      'createActions requires an array of objects but got %s',
      actions
    );

    return actions.reduce(function(ctx, action) {
      invariant(
        typeof action === 'object',
        'createActions requires items in array to be either strings ' +
        'or objects but was supplied with %s',
        action
      );

      invariant(
        typeof action.name === 'string',
        'createActions requires objects to have a name key, but got %s',
        action.name
      );

      if (action.map) {
        invariant(
          typeof action.map === 'function',
          'createActions requires objects with map field to be a function ' +
          'but was given %s',
          action.map
        );
      }

      ctx[action.name] = Actions._create(action.map);

      return ctx;
    }, ctx);
  }
}

module.exports = Actions;