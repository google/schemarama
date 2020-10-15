
module.exports = {
    entry: './index.js',
    resolve:  {
        modules: ['./node_modules']
    },
    optimization: {
        minimize: false
    },
    output: {
        filename: 'schemarama.bundle.js',
        library: 'schemarama'
    },
    node: {
        tls: "empty",
        fs: "empty",
        net: "empty"
    }
};