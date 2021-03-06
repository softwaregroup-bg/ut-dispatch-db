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

            outcome(params, $meta) {
                [].concat(params).forEach(async({method, ...params}) => {
                    if (method) {
                        try {
                            await this.bus.importMethod(method)(params, $meta);
                        } catch (error) {
                            this.error(error, $meta);
                        }
                    }
                });
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
                    },
                    receive(msg, $meta) {
                        if (msg && msg.$outcome) {
                            this.outcome(msg.$outcome, $meta);
                            delete msg.$outcome;
                        }
                        return msg;
                    }
                };
            }
        }
    }[namespaces[0] + 'Dispatch']);
};
