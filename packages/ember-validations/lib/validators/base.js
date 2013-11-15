Ember.Validations.validators.Base = Ember.Object.extend({
  init: function() {
    this.set('errors', Ember.makeArray());
    this.isRecordValid = undefined;
    this._dependentValidationKeys = Ember.makeArray();
    this.conditionals = {
      'if': this.get('options.if'),
      unless: this.get('options.unless')
    };
    this.model.addObserver(this.property, this, this.validate);
  },
  addObserversForDependentValidationKeys: function() {
    this._dependentValidationKeys.forEach(function(key) {
      this.model.addObserver(key, this, this.validate);
    }, this);
  }.on('init'),
  pushDependentValidaionKeyToModel: function() {
    var model = this.get('model');
    if (model._dependentValidationKeys[this.property] === undefined) {
      model._dependentValidationKeys[this.property] = Ember.makeArray();
    }
    model._dependentValidationKeys[this.property].addObjects(this._dependentValidationKeys);
  }.on('init'),
  call: function () {
    throw 'Not implemented!';
  },
  unknownProperty: function(key) {
    var model = this.get('model');
    if (model) {
      return model.get(key);
    }
  },
  validate: function() {
    this.errors.clear();
    this.set('isRecordValid', true);
    if (this.canValidate()) {
      this.call();
      if (this.errors.length > 0) {
        if (this.get('isRecordValid') === false) {
          this.notifyPropertyChange('isRecordValid');
        } else {
          this.set('isRecordValid', false);
        }
        var defer = Ember.RSVP.defer();
        defer.promise.then(null, Ember.K);
        defer.reject('Ember Validation Failed');
        return defer.promise;
      } else {
        if (this.get('isRecordValid') === true) {
          this.notifyPropertyChange('isRecordValid');
        } else {
          this.set('isRecordValid', true);
        }
        return Ember.RSVP.resolve();
      }
    }
  }.on('init'),
  canValidate: function() {
    if (typeof(this.conditionals) === 'object') {
      if (this.conditionals['if']) {
        if (typeof(this.conditionals['if']) === 'function') {
          return this.conditionals['if'](this.model);
        } else if (typeof(this.conditionals['if']) === 'string') {
          if (typeof(this.model[this.conditionals['if']]) === 'function') {
            return this.model[this.conditionals['if']]();
          } else {
            return this.model.get(this.conditionals['if']);
          }
        }
      } else if (this.conditionals.unless) {
        if (typeof(this.conditionals.unless) === 'function') {
          return !this.conditionals.unless(this.model);
        } else if (typeof(this.conditionals.unless) === 'string') {
          if (typeof(this.model[this.conditionals.unless]) === 'function') {
            return !this.model[this.conditionals.unless]();
          } else {
            return !this.model.get(this.conditionals.unless);
          }
        }
      } else {
        return true;
      }
    } else {
      return true;
    }
  }
});
