/*
 * grunt-yaspeller
 * https://github.com/avlasof/grunt-yaspeller
 *
 * Copyright (c) 2015 Alexander Sofin
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs'),
    async = require('async'),
    yaspeller = require('yaspeller'),
    report = require('yaspeller/lib/report'),
    utils = require('yaspeller/lib/utils');

module.exports = function(grunt) {
    var initReports = 0,
        addReports = function(reports) {
            if (!initReports) {
                report.addReports(reports);
                initReports++;
            }
        };

    grunt.registerMultiTask('yaspeller', 'Search tool typos in the text, files and websites', function() {
        var done = this.async(),
            tasks = [],
            options = this.options({
                format: 'auto',
                lang: 'en,ru',
                dictionary: [],
                report: ['console'],
                byWords: false,
                findRepeatWords: true,
                flagLatin: false,
                ignoreTags: ['code', 'kbd', 'object', 'samp', 'script', 'style', 'var'],
                ignoreCapitalization: true,
                ignoreDigits: true,
                ignoreLatin: true,
                ignoreRomanNumerals: true,
                ignoreUppercase: true,
                ignoreUrls: true,
                maxRequests: 5
            }),
                hasData = function(err, data) {
                return !err && data && Array.isArray(data.data) && data.data.length;
            },
                onResource = function(err, data) {
                if(hasData(err, data)) {
                    data.data = utils.delDictWords(data.data, options.dictionary);
                    data.data = utils.delDuplicates(data.data);
                }

                if(err) {
                    grunt.log.error(err);
                    done();
                    return;
                }

                report.oneach(err, data);
            };

        grunt.log.writeln('Processing task...');
        addReports(options.report);

        this.files.forEach(function(f) {
            var files = f.src;

            tasks.push(function(cb) {
                var subTasks = [];

                files.forEach(function(file) {
                    if (!grunt.file.exists(file)) {
                        onResource(true, Error(file + ': is not exists'));
                        return cb();
                    }
                    subTasks.push(function(subcb) {
                        yaspeller.checkFile(file, function(err, data) {
                            onResource(err, data);
                            subcb();
                        }, options);
                    });
                });

                async.parallelLimit(subTasks, options.maxRequests || 2, function() {
                    cb();
                });
            });

            async.series(tasks, function() {
                report.onend();
                done();
            });
        });
    });
};
