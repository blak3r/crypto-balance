var columnify = require('columnify');
var _ = require('lodash');
var moment = require('moment');

/**
 *
 * @param data
 * @param opts - columnify table opts, see columnify package details
 * @returns {*}
 */
exports.makeTable = function makeTable(data, opts) {
    var defaultOpts = {
        showHeaders: true,
        truncate: true,
        truncateMarker: "",
        columnSplitter: ' ',
        headingTransform: function(data) {
            return data;   // Default transform is to Uppercase
        },
        config: {
        }
    };

    var s = columnify(data, _.extend(defaultOpts, opts) );
    return s;
};

exports.makeTableForSpreadsheetPasting = function(data, opts) {
    return this.makeTable(data, _.extend({columnSplitter: ','}, opts) );
}

exports.writeAsCsv = function(filename, data, columns) {
    var s = this.makeTable(data, {columns: columns, columnSplitter: ";", showHeaders:true});
    console.log(s);
    fs.writeFileSync(filename, s, {encoding:"utf-8"});
}