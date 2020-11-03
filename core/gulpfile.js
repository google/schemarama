const gulp = require('gulp');
const browserify = require('browserify');
const babelify = require('babelify');
const buffer = require("vinyl-buffer");
const uglify = require('gulp-uglify');
const source = require('vinyl-source-stream');

gulp.task('build', function () {
    return browserify({entries: ['./index.js'], extensions: ['.js'], debug: true, standalone: 'schemarama'})
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
        .pipe(source('schemarama.bundle.js'))
        // uncomment to minimize bundle
        // .pipe(buffer())
        // .pipe(uglify())
        .pipe(gulp.dest('dist'));
});
