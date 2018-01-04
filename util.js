var columnify = require('columnify');
var _ = require('lodash');
var moment = require('moment');
var fs = require('fs');

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

exports.writeToFileSync = function(filename, data) {
    fs.writeFileSync(filename, data);
};

exports.readFileSync = function(filename) {
    return fs.readFileSync(filename, 'utf8');
};

exports.writeJSONToFileSync = function(filename, data, pretty) {
    var s = "";
    if( !pretty ) {
        s = JSON.stringify(data);
    } else {
        s = JSON.stringify(data, null, 3);
    }
    try {
        exports.writeToFileSync(filename, s);
    }catch(err) {
        console.error(err);
    }
};

exports.readJSONFileSync = function(filename) {
    try {
        return JSON.parse( exports.readFileSync(filename) );
    }catch(err) {
        return {};
    }
};
