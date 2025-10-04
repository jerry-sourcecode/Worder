const propertyMetadata = new Map<any, Map<string, PropertyMetadata>>();

interface PropertyMetadata {
    ignore?: boolean;
    synonym?: string;
}


interface TypedObject {
    _TP_: string;
    [key: string]: any;
}

type AnyConstructor<T> = new (...args: any[]) => T;

type ConstructorItem<T> = {
    func: AnyConstructor<T>;
    param: any[];
};

// Vue 兼容的装饰器工厂函数
function TypeJsonIgnore(): PropertyDecorator {
    return function(target: any, propertyKey: string | symbol) {
        const constructor = target.constructor;
        if (!propertyMetadata.has(constructor)) {
            propertyMetadata.set(constructor, new Map());
        }

        const classMetadata = propertyMetadata.get(constructor)!;
        classMetadata.set(propertyKey as string, {
            ...classMetadata.get(propertyKey as string),
            ignore: true
        });
    };
}

function TypeJsonSynonym(alias: string): PropertyDecorator {
    return function(target: any, propertyKey: string | symbol) {
        const constructor = target.constructor;
        if (!propertyMetadata.has(constructor)) {
            propertyMetadata.set(constructor, new Map());
        }

        const classMetadata = propertyMetadata.get(constructor)!;
        classMetadata.set(propertyKey as string, {
            ...classMetadata.get(propertyKey as string),
            synonym: alias
        });
    };
}

/**
 * 带有类型检查的JSON格式化
 */
class TypeJson {
    private static typeRegistry = new Map<string, ConstructorItem<any>>([
        [
            Date.name,
            {
                func: Date,
                param: [],
            },
        ],
    ]);

    static register<T extends new (...args: any[]) => any>(
        newType: T,
        ...param: ConstructorParameters<T>
    ): void {
        TypeJson.typeRegistry.set(newType.name, {
            param: param,
            func: newType,
        });
    }

    static stringify(obj: any): string {
        return JSON.stringify(obj, TypeJson.serializeReplacer);
    }

    /**
     * 序列化替换器函数
     * @param _ - 当前属性的键
     * @param value - 当前属性的值
     * @returns 处理后的值
     */
    private static serializeReplacer(_: string, value: any): any {
        if (value === null || value === undefined) {
            return value;
        }

        // 如果是数组，递归处理每个元素
        if (Array.isArray(value)) {
            return value.map((item) => TypeJson.serializeReplacer('', item));
        }

        // 如果是对象且具有构造函数（非常规对象）
        if (
            typeof value === 'object' &&
            value.constructor !== Object &&
            value.constructor.name !== 'Array' &&
            TypeJson.typeRegistry.get(value.constructor.name) !== undefined
        ) {
            const result: TypedObject = {
                _TP_: value.constructor.name,
            };

            if (value.constructor.name === 'Date') {
                result['value'] = (value as Date).toJSON();
                return result;
            }

            // 获取类的属性元数据
            const classMetadata = propertyMetadata.get(value.constructor);

            // 复制所有属性并递归处理
            Object.keys(value).forEach((prop) => {
                // 检查属性元数据
                const propMetadata = classMetadata?.get(prop);

                // 如果被忽略，跳过
                if (propMetadata?.ignore) {
                    return;
                }

                // 使用别名或原属性名
                const serializedKey = propMetadata?.synonym || prop;
                result[serializedKey] = TypeJson.serializeReplacer(prop, value[prop]);
            });

            return result;
        }

        // 如果是普通对象，递归处理每个属性
        if (typeof value === 'object') {
            const result: { [key: string]: any } = {};
            Object.keys(value).forEach((prop) => {
                result[prop] = TypeJson.serializeReplacer(prop, value[prop]);
            });
            return result;
        }

        return value;
    }

    static parse<T>(str: string): T {
        const obj = JSON.parse(str);
        return TypeJson.parseReplacer<T>(obj);
    }

    private static parseReplacer<T>(obj: any): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => TypeJson.parseReplacer(item)) as any;
        }

        const tp = obj._TP_;

        let result: any;

        if (tp !== undefined && TypeJson.typeRegistry.get(tp) !== undefined) {
            if (obj._TP_ === 'Date') {
                return new Date(obj.value) as any;
            }
            const item = TypeJson.typeRegistry.get(tp)!;
            result = new item.func!(item.param);

            // 获取类的属性元数据
            const classMetadata = propertyMetadata.get(item.func);

            // 处理所有属性，支持别名反向映射
            Object.keys(obj).forEach((key) => {
                if (key !== '_TP_') {
                    let targetProperty = key;

                    // 查找是否有属性使用了这个别名
                    if (classMetadata) {
                        for (const [propName, metadata] of classMetadata.entries()) {
                            if (metadata.synonym === key) {
                                targetProperty = propName;
                                break;
                            }
                        }
                    }

                    // 如果这个属性没有被忽略，则赋值
                    const propMetadata = classMetadata?.get(targetProperty);
                    if (!propMetadata?.ignore) {
                        result[targetProperty] = TypeJson.parseReplacer(obj[key]);
                    }
                }
            });
        } else {
            result = {};
            Object.keys(obj).forEach((key) => {
                result[key] = TypeJson.parseReplacer(obj[key]);
            });
        }
        return result;
    }

    /**
     * 清除引用的深拷贝
     * @param obj 原本
     */
    static copy<T>(obj: T): T {
        return TypeJson.parse(TypeJson.stringify(obj));
    }
}

export { TypeJson, TypeJsonSynonym, TypeJsonIgnore };
