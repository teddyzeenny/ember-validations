var setValidityMixin = Ember.Mixin.create({
  setValidity: function() {
    if (this.get('validators').compact().filterProperty('isRecordValid', false).get('length') > 0) {
      if (this.get('isRecordValid') === false) {
        this.notifyPropertyChange('isRecordValid');
      } else {
        this.set('isRecordValid', false);
      }
    } else {
      if (this.get('isRecordValid') === true) {
        this.notifyPropertyChange('isRecordValid');
      } else {
        this.set('isRecordValid', true);
      }
    }
  }.on('init')
});

var pushValidatableObject = function(model, property) {
  model.removeObserver(property, pushValidatableObject);
  if (model.get(property).constructor === Array) {
    model.validators.pushObject(ArrayValidatorProxy.create({model: model, property: property, content: model.get(property)}));
  } else {
    model.validators.pushObject(model.get(property));
  }
};

var findValidator = function(validator) {
  var klass = validator.classify();
  return Ember.Validations.validators.local[klass] || Ember.Validations.validators.remote[klass];
};

var ArrayValidatorProxy = Ember.ArrayProxy.extend(setValidityMixin, {
  init: function() {
    this._super();
    this.addObserver('@each.isRecordValid', this, this.setValidity);
    this.model.addObserver(''+this.property+'.[]', this, this.setValidity);
  },
  validate: function() {
    var promises;

    promises = this.get('content').map(function(validator) {
      return validator.validate();
    }).without(undefined);

    var all = Ember.RSVP.all(promises);
    all.then(null, Ember.K);
    return all;
  }.on('init'),
  validators: Ember.computed.alias('content')
});

Ember.Validations.Mixin = Ember.Mixin.create(setValidityMixin, {
  init: function() {
    this._super();
    this.errors = Ember.Validations.Errors.create();
    this._dependentValidationKeys = {};
    this.validators = Ember.makeArray();
    this.isRecordValid = undefined;
    if (this.get('validations') === undefined) {
      this.validations = {};
    }
    this.buildValidators();
    this.addObserver('validators.@each.isRecordValid', this, this.setValidity);
    this.validators.forEach(function(validator) {
      validator.addObserver('errors.[]', this, function(sender, key, value, context, rev) {
        var errors = Ember.makeArray();
        this.validators.forEach(function(validator) {
          if (validator.property === sender.property) {
            errors = errors.concat(validator.errors);
          }
        }, this);
        this.set('errors.' + sender.property, errors);
      });
    }, this);
  },
  isInvalid: function() {
    return !this.get('isRecordValid');
  }.property('isRecordValid'),
  buildValidators: function() {
    var property, validator;

    for (property in this.validations) {
      if (this.validations[property].constructor === Object) {
        this.buildRuleValidator(property);
      } else {
        this.buildObjectValidator(property);
      }
    }
  },
  buildRuleValidator: function(property) {
    var validator;
    for (validator in this.validations[property]) {
      if (this.validations[property].hasOwnProperty(validator)) {
        this.validators.pushObject(findValidator(validator).create({model: this, property: property, options: this.validations[property][validator]}));
      }
    }
  },
  buildObjectValidator: function(property) {
    if (this.get(property) === undefined) {
      this.addObserver(property, this, pushValidatableObject);
    } else {
      pushValidatableObject(this, property);
    }
  },
  validate: function() {
    var promises = this.validators.map(function(validator) {
      return validator.validate();
    }).without(undefined);

    var all = Ember.RSVP.all(promises);
    all.then(null, Ember.K);
    return all;
  }.on('init')
});
