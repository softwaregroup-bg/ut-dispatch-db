module.exports = function(modules, destination = 'db') {
    const dispatchToDB = new RegExp('^(' + modules.join('|') + ')\\.');
    return (...params) => ({
        [modules[0] + 'Dispatch']: class extends require('ut-port-script')(...params) {
            get defaults() {
                return {
                    imports: modules,
                    concurrency: 200
                };
            }
            handlers() {
                return {
                    exec: (msg, $meta) => {
                        if ($meta.method && dispatchToDB.test($meta.method)) {
                            return this.bus.importMethod(destination + '/' + $meta.method)(msg, $meta);
                        } else {
                            return Promise.reject(this.bus.errors.methodNotFound({params: {method: $meta && $meta.method}}));
                        }
                    }
                };
            }
        }
    }[modules[0] + 'Dispatch']);
};
