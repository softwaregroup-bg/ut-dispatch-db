module.exports = function(namespaces, imports = [], validations = [], destination = 'db') {
    const dispatchToDB = new RegExp(namespaces.map(n => `(^${n}\\.)`).join('|'));
    if (typeof validations === 'string') { // backwards compatibility
        destination = validations;
        validations = undefined;
    }
    const name = [namespaces[0] + 'Dispatch'];
    return {
        [name]: (...params) => ({
            [name]: class extends require('ut-port-script')(...params) {
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
                    const importConfig = !!params[0]?.config?.import;
                    return {
                        ...namespaces.reduce((prev, namespace) => ({
                            ...prev,
                            [`${namespace}.service.get`]: () => params[0].utMethod.pkg
                        }), {}),
                        exec: (msg, $meta) => {
                            if ($meta.method && dispatchToDB.test($meta.method)) {
                                return importConfig
                                    ? params[0].import[`${destination}/${$meta.method}`](msg, $meta)
                                    : this.bus.importMethod(`${destination}/${$meta.method}`)(msg, $meta);
                            } else {
                                return Promise.reject(this.bus.errors.methodNotFound({params: {method: $meta && $meta.method}}));
                            }
                        },
                        receive(msg, $meta) {
                            if (msg && msg.$outcome) {
                                this.outcome(msg.$outcome, $meta);
                                if (Object.keys(msg).length === 1) return [];
                                delete msg.$outcome;
                            }
                            return msg;
                        }
                    };
                }
            }
        }[name])
    }[name];
};
