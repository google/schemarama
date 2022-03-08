const TerserJsPlugin = require('terser-webpack-plugin');
const LicensePlugin = require('webpack-license-plugin');

module.exports = {
    mode: 'production',
    entry: {
        'schemarama.bundle': ['babel-polyfill', './index.js'],
        'schemarama.bundle.min': ['babel-polyfill', './index.js'],
        'schemarama-parsing.bundle': ['babel-polyfill', './parsing-index.js'],
        'schemarama-parsing.bundle.min': ['babel-polyfill', './parsing-index.js'],
    },
    resolve: {
        modules: ['./node_modules']
    },
    module: {
        rules: [{
            test: /\.js$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ["@babel/preset-env"]
                }
            }
        }]
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserJsPlugin({
            include: /\.min\.js$/
        })]
    },
    plugins: [
        new LicensePlugin()
    ],
    output: {
        filename: '[name].js',
        library: 'schemarama'
    },
    resolve: {
        fallback: {
            tls: false,
            fs: false,
            net: false,
            buffer: false,
            util: false,
            stream: false,
            url: false
        }
    }
};
