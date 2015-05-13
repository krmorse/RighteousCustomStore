Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        Deft.Chain.pipeline([
            this._loadIterations,
            this._createAugmentedStoryModel,
            this._createGrid
        ], this);
    },

    _loadIterations: function() {
        var store = Ext.create('Rally.data.wsapi.Store', {
            model: 'Iteration',
            context: this.getContext().getDataContext(),
            filters: [
                {
                    property: 'State',
                    operator: '!=',
                    value: 'Accepted'
                }
            ],
            sorters: [
                {
                    property: 'StartDate',
                    direction: 'ASC'
                }
            ],
            limit: Infinity
        });

        return store.load().then({
            success: function(records) {
                var likeIterations =_.groupBy(records, this._getIterationKey);
                return _.map(_.values(likeIterations), _.first);
            },
            scope: this
        });
    },

    _getIterationKey: function(iteration) {
        return Ext.String.format('{0} - {1} - {2}',
            iteration.get('Name'),
            Rally.util.DateTime.toIsoString(iteration.get('StartDate')),
            Rally.util.DateTime.toIsoString(iteration.get('EndDate')));
    },

    _createAugmentedStoryModel: function(iterations) {
        return Rally.data.ModelFactory.getModel({
            type: 'hierarchicalrequirement'
        }).then({
            success: function(model) {
                this.iterationFields = _.map(iterations, function(iteration) {
                    return {
                        name: this._getIterationKey(iteration),
                        type: 'boolean',
                        iteration: iteration
                    };
                }, this);
                return Ext.define('AwesomeStoryModel', {
                    extend: model,
                    fields: this.iterationFields
                });
            },
            scope: this
        });
    },

    _createGrid: function(model) {
        this.add({
            xtype: 'rallygrid',
            columnCfgs: [
                'FormattedID',
                'Name',
                'ScheduleState'
            ].concat(_.map(this.iterationFields, function(iterationField) {
                    return {
                        dataIndex: iterationField.name,
                        text: iterationField.iteration.get('Name'),
                        iteration: iterationField.iteration,
                        renderer: function (value, metadata, record) {
                            var iteration = record.get('Iteration');
                            return iteration && iteration.Name === metadata.column.iteration.get('Name') ? 'x' : '';
                        }
                    };
                })),
            storeConfig: {
                model: model,
                fetch: ['FormattedID', 'Name', 'ScheduleState', 'Iteration', 'StartDate', 'EndDate'],
                filters: [
                    {
                        property: 'ScheduleState',
                        operator: '<',
                        value: 'Accepted'
                    }
                ]
            },
            context: this.getContext()
        });
    }
});
