const TerserJsPlugin = require('terser-webpack-plugin');
const LicensePlugin = require('webpack-license-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
    mode: 'production', // 'development'
    entry: {
        'schemarama.bundle': './index.js',
        'schemarama.bundle.min': './index.js',
        'schemarama-parsing.bundle': './parsing-index.js',
        'schemarama-parsing.bundle.min': './parsing-index.js',
    },
    resolve: {
        modules: ['./node_modules']
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserJsPlugin({
            include: /\.min\.js$/
        })]
    },
    plugins: [
        new NodePolyfillPlugin(),
        new LicensePlugin()
    ],
    output: {
        filename: '[name].js',
        library: 'schemarama'
    },
    resolve: {
        fallback: {
            fs: false
        }
    }
};
