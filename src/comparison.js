import { config } from "./config.js";

// Snippet of code to sort object keys with stringify from 
// https://gist.github.com/davidfurlong/463a83a33b70a3b6618e97ec9679e490
export const alphaSort = (key, value) =>
	value instanceof Object && !(value instanceof Array) ? 
		Object.keys(value)
		.sort()
		.reduce((sorted, key) => {
			sorted[key] = value[key];
			return sorted 
		}, {}) :
        value;

/**
 * diff(obj1, obj2) - takes in two JSON objects and returns all differences between the two objects.
 * 
 * @param {Object} obj1 - a valid JSON object.
 * @param {Object} obj2 - a valid JSON object.
 */
export function diff(obj1, obj2) {
    // three types of changes: additions, deletions, and modifications
    let result = {
        equal: true,
        ignoredEquals: true,
        isLeaf: false,
        key: null,
        keyValue: null,
        additions: {},
        deletions: {},
        modifications: {
            left: {},
            right: {}
        }
    };

    if ((isPlainObject(obj1) && Array.isArray(obj2)) ||
        (isPlainObject(obj2) && Array.isArray(obj1))) {
        result.isLeaf = true;
        result.equal = false;
        result.ignoredEquals = false;
        result.modifications.left = JSON.stringify(obj1, alphaSort, 4);
        result.modifications.right = JSON.stringify(obj2, alphaSort, 4);
        return result;
    }

    // recursive function for comparing two JSON objects    
    // base case: if both are not nested objects, then run straight comparison
    if (typeof obj1 !== "object" || typeof obj2 !== "object") {
        result.isLeaf = true;
        if (obj1 !== obj2) {
            result.equal = false;
            result.ignoredEquals = false;
            result.modifications.left = JSON.stringify(obj1, alphaSort, 4);
            result.modifications.right = JSON.stringify(obj2, alphaSort, 4);
        }
    } else if (Array.isArray(obj1) && Array.isArray(obj2)) {
        // set the key value to sort by
        let key = null;
        let key_index = 0;
        let isASorted = false;
        let isBSorted = false;

        while (key_index < config.SORTING_KEYS.length) {
            isASorted = true;
            isBSorted = true;
            key = config.SORTING_KEYS[key_index];

            obj1.sort(function(a, b) {
                if (a.hasOwnProperty(key) && b.hasOwnProperty(key) && a[key] !== b[key]) {
                    return a[key] < b[key] ? -1 : 1;
                } else {
                    isASorted = false;
                    return 0;
                }
            });
    
            obj2.sort(function(a, b) {
                if (a.hasOwnProperty(key) && b.hasOwnProperty(key) && a[key] !== b[key]) {
                    return a[key] < b[key] ? -1 : 1;
                } else {
                    isBSorted = false;
                    return 0;
                }
            });

            if (isASorted && isBSorted) {
                break;
            } else {
                key_index++;
            }
        }
        
        // if both arrays have been sorted by key, we can run a comparison in O(n) time
        if (isASorted && isBSorted) {
            result.key = key;

            let index_1 = 0;
            let index_2 = 0;

            while (index_1 < obj1.length && index_2 < obj2.length) {
                if (obj1[index_1][key] < obj2[index_2][key]) {
                    result.equal = false;
                    result.ignoredEquals = false;
                    result.deletions[index_1] = obj1[index_1];
                    index_1++;
                } else if (obj1[index_1][key] > obj2[index_2][key]) {
                    result.equal = false;
                    result.ignoredEquals = false;
                    result.additions[index_2] = obj2[index_2];
                    index_2++;
                } else {    // the keys are equal, and they're the same object!
                    let comp = diff(obj1[index_1], obj2[index_2]);
                    if (!comp.equal) {
                        result.equal = false;
                        result.ignoredEquals = false;
                        comp.keyValue = obj1[index_1][key];
                        result.modifications.left[index_1] = comp;   // experimental
                        result.modifications.right[index_2] = comp;
                    }
                    index_1++;
                    index_2++;
                }
            }

            while (index_1 < obj1.length) {
                result.equal = false;
                result.ignoredEquals = false;
                result.deletions[index_1] = obj1[index_1];
                index_1++;
            }

            while (index_2 < obj2.length) {
                result.equal = false;
                result.ignoredEquals = false;
                result.additions[index_2] = obj2[index_2];
                index_2++;
            }
            
        } else if (config.IGNORE_ARRAY_ORDER) {   
            // console.log("avoid");

            // otherwise, default to standard set comparison, O(n^2)
            let intersect1 = {};
            let intersect2 = {};

            // check which elements of each are equal (independent of ordering)
            obj1.forEach(function (value_1, index_1) {
                obj2.forEach(function (value_2, index_2) {
                    let arrElem = diff(value_1, value_2);
                    if (arrElem.equal) {
                        intersect1[index_1] = index_2;
                        intersect2[index_2] = index_1;
                    }
                });
            });

            // console.log(intersect1);
            // console.log(intersect2);

            // set definition: if both sets are subsets of each other then they're equal
            Object.keys(intersect1).length == obj1.length && Object.keys(intersect2).length == obj2.length 
            ? result.equal = true : result.equal = false;
            // console.log(Object.keys(intersect1).length);

            // iterate through each array and compare by index, unless the index is taken already.
            // treat the same index, but different values as a modification
            // if either index is part of the intersection, then treat it as an addition / deletion.
            obj1.forEach(function (value_1, index_1) {
                if (!intersect1.hasOwnProperty(index_1)) {
                    if (!intersect2.hasOwnProperty(index_1) && index_1 < obj2.length) {
                        let subObject = diff(obj1[index_1], obj2[index_1]);
                        if (!subObject.equal) {
                            result.equal = false;
                            result.modifications.left[index_1] = subObject;
                            result.modifications.right[index_1] = subObject;
                        }
                    } else {
                        result.deletions[index_1] = value_1;
                    }
                    // result.deletions[index_1] = value_1;
                }
            });

            obj2.forEach(function (value_2, index_2) {
                if (!intersect2.hasOwnProperty(index_2)) {
                    if (!intersect1.hasOwnProperty(index_2) && index_2 < obj1.length) {
                        let subObject = diff(obj1[index_2], obj2[index_2]);
                        if (!subObject.equal) {
                            result.equal = false;
                            result.modifications.left[index_2] = subObject;
                            result.modifications.right[index_2] = subObject;
                        }
                    } else {
                        result.additions[index_2] = value_2;
                    }
                    // result.additions[index_2] = value_2;
                }
            });
        } else {
            // standard index-by-index comparison
            obj1.forEach(function (value_1, index_1) {
                if (index_1 < obj2.length) {
                    let subObject = diff(obj1[index_1], obj2[index_1]);
                    if (!subObject.equal) {
                        result.equal = false;
                        result.ignoredEquals = false;
                        result.modifications.left[index_1] = subObject;
                        result.modifications.right[index_1] = subObject;
                    }
                } else {
                    result.deletions[index_1] = value_1;
                }
            });

            obj2.forEach(function (value_2, index_2) {
                if (index_2 < obj1.length) {
                    let subObject = diff(obj1[index_2], obj2[index_2]);
                    if (!subObject.equal) {
                        result.equal = false;
                        result.ignoredEquals = false;
                        result.modifications.left[index_2] = subObject;
                        result.modifications.right[index_2] = subObject;
                    }
                } else {
                    result.additions[index_2] = value_2;
                }
            });
        }
    } else {
        // It's an object, call recursively
        for (let i in obj2) {
            if (!obj1.hasOwnProperty(i)) {  // an addition
                result.equal = false;
                if (!config.IGNORE_ATTR.hasOwnProperty(i)) {
                    result.ignoredEquals = false;
                }
                result.additions[i] = obj2[i];
            } else {
                let subObject = diff(obj1[i], obj2[i]);
                if (!subObject.equal) {
                    result.equal = false;
                    if (!subObject.ignoredEquals && !config.IGNORE_ATTR.hasOwnProperty(i)) {
                        result.ignoredEquals = false;
                    }
                    result.modifications.left[i] = subObject;
                    result.modifications.right[i] = subObject;
                }
            }
        }
    
        // deletion
        for (let i in obj1) {
            if (!obj2.hasOwnProperty(i)) {
                result.equal = false;
                if (!config.IGNORE_ATTR.hasOwnProperty(i)) {
                    result.ignoredEquals = false;
                }
                result.deletions[i] = obj1[i];
            }
        }
    }

    return result;
}

/**
 * parseEmbeddedJSON() - goes through and expands JSON that might be encoded in a string in a JSON object.
 * @param {Object} json JSON object representing value to be compared
 * @param {String} attr_name optional - the name of the attribute to expand on
 * @return JSON object, with relevant fields expanded, or the original object if there were no properties to expand on.
 */
export function parseEmbeddedJSON(json, attr_name = null) {
    if (isEmpty(config.EMBEDDED_JSON_ATTR)) {
        return json;
    }

    if (typeof json !== "object") {
        if (config.EMBEDDED_JSON_ATTR.hasOwnProperty(attr_name)) {
            try {
                json = JSON.parse(json);
            } catch (e) {
                json = json;
            }
        }
        return json;
    } else if (Array.isArray(json)) {
        json.forEach(function (value, index) {
            json[index] = parseEmbeddedJSON(value);
        });
    } else {
        for (let i in json) {
            json[i] = parseEmbeddedJSON(json[i], i);
        }
    }

    return json;
}

/**
 * exportJSON() - the inverse of parseEmbeddedJSON(), turns the input json object into a string, also re-stringifies any JSON that was formerly expanded.
 * @param {Object} json 
 * @param {String} attr_name optional - the name of the field to re-stringify
 * @return a string representation of the input json
 */ 
export function exportJSON(json, attr_name = null) {
    if (isEmpty(config.EMBEDDED_JSON_ATTR)) {
        return json;
    }

    if (isPlainObject(json)) {
        if (config.EMBEDDED_JSON_ATTR.hasOwnProperty(attr_name)) {
            try {
                json = JSON.stringify(json);
            } catch (e) {
                json = json;
            }
        } else {
            for (let i in json) {
                json[i] = exportJSON(json[i], i);
            }
        }
    } else if (Array.isArray(json)) {
        json.forEach(function (value, index) {
            json[index] = exportJSON(value);  
        });
    }

    // for primitive types, just do nothing / just return

    return json;
}

// returns true if an object is empty.
export function isEmpty(obj) {
    for(let p in obj) {
      if(obj.hasOwnProperty(p)) {
        return false;
      }
    }
    return JSON.stringify(obj) === JSON.stringify({});
}

// returns true if an input is an object but not an array.
export function isPlainObject(input) {
    return input && !Array.isArray(input) && typeof input === "object";
}
