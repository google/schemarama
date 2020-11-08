const gulp = require('gulp');
const browserify = require('browserify');
const babelify = require('babelify');
const buffer = require("vinyl-buffer");
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const source = require('vinyl-source-stream');

gulp.task('parsing', function () {
    return browserify({entries: ['./parsing-index.js'], extensions: ['.js'], debug: true, standalone: 'schemarama'})
        .transform(babelify, {
            global: true,
            presets: ["@babel/preset-env"],
            plugins: [
                [
                    '@babel/plugin-proposal-decorators',
                    {
                        legacy: true,
                    },
                ],
                '@babel/plugin-proposal-class-properties',
                [
                    '@babel/plugin-transform-runtime',
                    {
                        regenerator: true,
                    },
                ],
            ]
        })
        .bundle()
        .pipe(source('schemarama-parsing.bundle.js'))
        .pipe(gulp.dest('dist'))
        .pipe(rename('schemarama-parsing.bundle.min.js'))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});
