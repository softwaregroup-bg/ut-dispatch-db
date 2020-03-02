module.exports = function(namespaces, imports = [], validations = [], destination = 'db') {
    const dispatchToDB = new RegExp(namespaces.map(n => `(^${n}\\.)`).join('|'));
    if (typeof validations === 'string') { // backwards compatibility
        destination = validations;
        validations = undefined;
    }
    return (...params) => ({
        [namespaces[0] + 'Dispatch']: class extends require('ut-port-script')(...params) {
            get defaults() {
                return {
                    namespace: namespaces,
                    imports,
                    validations,
                    concurrency: 200
                };
            }

            handlers() {
                return {
                    ...namespaces.reduce((prev, namespace) => ({
                        ...prev,
                        [`${namespace}.service.get`]: () => params[0].utMethod.pkg
                    }), {}),
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
    }[namespaces[0] + 'Dispatch']);
};
