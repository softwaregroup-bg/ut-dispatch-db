module.exports = function(modules, destination = 'db') {
    const dispatchToDB = new RegExp('^(' + modules.join('|') + ')\\.');
    return {
        id: modules.join('-'),
        createPort: require('ut-port-script'),
        logLevel: 'trace',
        imports: modules,
        concurrency: 200,
        exec: function(msg, $meta) {
            if ($meta.method && dispatchToDB.test($meta.method)) {
                return this.bus.importMethod(destination + '/' + $meta.method)(msg, $meta);
            } else {
                return Promise.reject(this.bus.errors.methodNotFound({params: {method: $meta && $meta.method}}));
            }
        }
    };
};
