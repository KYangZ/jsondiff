/**
 * The global variable jsondiff becomes available when jsondiff.js is imported into your project. Then call jsondiff.init(elemID) to initialize the tool.
 * @module jsondiff
 */

import "./json-diff-styles.css";
import ace from "ace-builds";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-merbivore";
import "ace-builds/src-noconflict/theme-clouds";
// import "ace-builds/webpack-resolver.js";
import { config, _jdiff } from "./config.js";
import * as comparison from "./comparison.js";
import * as frontend from "./frontend.js";
import * as eventhandlers from "./eventhandlers.js";

// use a CDN to deliver themes and modes
const CDN = "https://cdn.jsdelivr.net/npm/ace-builds@1.4.12/src-min-noconflict";
ace.config.set("basePath", CDN);
ace.config.set("modePath", CDN);
ace.config.set("themePath", CDN);
ace.config.set("workerPath", CDN);

export { 
    /**
     * Various internal variables used in the jsondiff tool. Any undocumented properties of _jdiff should be left untouched, to avoid undefined behavior.
     * @property {Object} leftEditor The left editor in the diff tool. For usage details, check Ace Editor's documentation of Editor.
     * @property {Object} rightEditor The right editor in the diff tool. For usage details, check Ace Editor's documentation of Editor.
     */
    _jdiff
} from "./config.js";

export {
    /**
     * A preset configuration that can be passed in via jsondiff.setOptions(CL_PORTAL_CONFIG).
     * @property {Array} ignore ["Id", "url"]
     * @property {Array} embed ["clcommon__Actor_Definition__c", "clcommon__data__c", "clcommon__Branding__c", "clcommon__Content__c"]
     * @property {Array} sortKeys ["Name", "clcommon__Actor_name__c"]
     * @property {Boolean} ignoreArrayOrder false
     * @property {Boolean} collapseSimilar true
     * @property {Boolean} oneWay true
     */
    CL_PORTAL_CONFIG
} from "./config.js";

/**
 * Initializes one instance of the json diff tool.
 * Attempting to call this function again (whether elemID is the same or not) results in undefined behavior.
 * 
 * @param {String} elemID where the diff tool should be placed in a webpage, in the form of the ID of an html element.
 */
export function init(elemID) {
    // inject HTML into specified area on page
    document.getElementById(elemID).innerHTML = `
        <div id="json-diff-external-container">
            <div class="jdiff-sidebar">
                <div id="jdiff-logo">
                    <p style="font-family: Arial, Helvetica, sans-serif; color:white; font-size: x-large; font-weight: 750;">JSON DIFFS</p>
                </div>
                <div id="jdiff-file-inputs">
                    <input type="file" id="inputA" name="inputA" style="color:white;" accept="text/plain application/JSON">
                    <label for="inputA" id="statusA"></label>
                    <input type="file" id="inputB" name="inputB" style="color:white;" accept="text/plain application/JSON">
                    <label for="inputB" id="statusB"></label>
                </div>
                <button id="executeDiff" class="majorButtons">Diff Files</button>
                <div id="options">
                    <div id="ignoreOption" class="innerOption">
                        <p>Ignore Properties:</p>
                        <div id="ignoreInput" class="optionInput">
                            <input class="optionTextField" id="ignoreField" type="text" placeholder="Ignore diffs by property">
                            <button class="squareButtons" id="addIgnore">+</button>
                        </div>
                        <div class="listContainer">
                            <ul id="ignoreList"></ul>
                        </div>
                    </div>
                    <div id="embeddedOption" class="innerOption">
                        <p>Expand Embedded JSON:</p>
                        <div id="embeddedInput" class="optionInput">
                            <input class="optionTextField" id="embedField" type="text" placeholder="Embedded JSON by property">
                            <button class="squareButtons" id="addEmbedded">+</button>
                        </div>
                        <div class="listContainer">
                            <ul id="embedList"></ul>
                        </div>
                    </div>
                    <div id="sortingKeys" class="innerOption">
                        <p>Array Sorting Keys:</p>
                        <div id="keyInput" class="optionInput">
                            <input class="optionTextField" id="keyField" type="text" placeholder="Array key property names">
                            <button class="squareButtons" id="addKey">+</button>
                        </div>
                        <div class="listContainer">
                            <ul id="keyList"></ul>
                        </div>
                    </div>
                </div>
                <div id="submit">
                    <div id="exports">
                        <button id="exportLeft" class="majorButtons">Export Left</button>
                        <button id="exportRight" class="majorButtons">Export Right</button>
                    </div>
                    <button id="hideLinesButton" class="majorButtons">Hide Unmarked Lines</button>
                    <button id="foldUnmarkedButton" class="majorButtons">Hide Unmarked Objects</button>
                    <button id="expandButton" class="majorButtons">Show All Sections</button>
                </div>
            </div>
            <div class="jdiff-main-container">
                <div class="jdiff-topbar">
                    <div class="jdiff-topbar-section">
                        <div id="left-editor-label"></div>
                    </div>
                    <div class="jdiff-topbar-section">
                        <div id="right-editor-label"></div>
                        <button class="majorButtons" id="undo" title="undo last merge">&#8617;</button>
                        <button class="majorButtons" id="edit" title="enable editing">&#9998;</button>
                        <button class="majorButtons" id="reset">Reset</button>
                        <button class="majorButtons" id="rerun">Rerun Diff</button>
                    </div>
                </div>
                <div class="editor-container">
                    <div class="editor" id="jdiff-left-editor"></div>
                    <div class="editor" id="jdiff-right-editor"></div>
                </div>
            </div>
        </div>
        `;

    // integrate ACE code editors
    _jdiff.leftEditor = ace.edit("jdiff-left-editor");
    _jdiff.leftEditor.setTheme("ace/theme/merbivore");
    _jdiff.leftEditor.session.setMode("ace/mode/json");
    _jdiff.leftEditor.setOptions({
        readOnly: true,
        highlightActiveLine: false,
        highlightGutterLine: false,
        useWorker: false
    });
    _jdiff.leftEditor.on("change", _jdiff.leftEditor.$onChangeBackMarker);

    _jdiff.rightEditor = ace.edit("jdiff-right-editor");
    _jdiff.rightEditor.setTheme("ace/theme/merbivore");
    _jdiff.rightEditor.session.setMode("ace/mode/json");
    _jdiff.rightEditor.setOptions({
        readOnly: true,
        highlightActiveLine: false,
        highlightGutterLine: false,
        useWorker: false
    });
    _jdiff.rightEditor.on("change", _jdiff.rightEditor.$onChangeBackMarker);

    // resize height of the editors to match the sidebar
    document.getElementsByClassName("editor-container")[0].style.minHeight = (document.getElementsByClassName("jdiff-sidebar")[0].offsetHeight - 51) + "px";

    // console.log(_jdiff.JSON_B);
    // call the main function
    frontend.main(_jdiff.JSON_A, _jdiff.JSON_B);

    // add all front end event handlers
    // input file buttons
    document.getElementById("inputA").addEventListener("change", eventhandlers.loadFileA);
    document.getElementById("inputB").addEventListener("change", eventhandlers.loadFileB);

    // export buttons
    document.getElementById("exportLeft").addEventListener("click", eventhandlers.exportLeft);
    document.getElementById("exportRight").addEventListener("click", eventhandlers.exportRight);

    // viewing option buttons
    document.getElementById("hideLinesButton").addEventListener("click", hideSameLines);
    document.getElementById("foldUnmarkedButton").addEventListener("click", foldUnmarkedSections);
    document.getElementById("expandButton").addEventListener("click", expandAll);

    // undo, reset, edit, rerun buttons (top right)
    document.getElementById("undo").addEventListener("click", eventhandlers.undoLastMerge);
    document.getElementById("edit").addEventListener("click", frontend.editMode);
    document.getElementById("reset").addEventListener("click", discardChanges);
    document.getElementById("rerun").addEventListener("click", rerunDiff);

    // button for performing diff
    document.getElementById("executeDiff").addEventListener("click", function () {
        if (_jdiff.isValidJSON) {
            frontend.main(_jdiff.JSON_A, _jdiff.JSON_B);
        }
    });

    // option adding / subtracting
    document.getElementById("addIgnore").addEventListener("click", function () {
        // console.log(document.getElementById("ignoreField").value);
        let newAttr = document.getElementById("ignoreField").value;
        document.getElementById("ignoreField").value = "";
        eventhandlers.ignoreListAdd(newAttr);
    });

    document.getElementById("ignoreField").addEventListener("keypress", function (e) {
        if (e.keyCode === 13) {
            let newAttr = document.getElementById("ignoreField").value;
            document.getElementById("ignoreField").value = "";
            eventhandlers.ignoreListAdd(newAttr);
        }
    });

    document.getElementById("addEmbedded").addEventListener("click", function () {
        let newAttr = document.getElementById("embedField").value;
        document.getElementById("embedField").value = "";
        eventhandlers.embedListAdd(newAttr);
    });

    document.getElementById("embedField").addEventListener("keypress", function (e) {
        if (e.keyCode === 13) {
            let newAttr = document.getElementById("embedField").value;
            document.getElementById("embedField").value = "";
            eventhandlers.embedListAdd(newAttr);
        }
    });

    document.getElementById("addKey").addEventListener("click", function() {
        let newAttr = document.getElementById("keyField").value;
        document.getElementById("keyField").value = "";
        eventhandlers.sortKeyAdd(newAttr);
    });

    document.getElementById("keyField").addEventListener("keypress", function(e) {
        if (e.keyCode === 13) {
            let newAttr = document.getElementById("keyField").value;
            document.getElementById("keyField").value = "";
            eventhandlers.sortKeyAdd(newAttr);
        }
    });
}

/**
 * Allows the user to set up configurations by passing them in through an object.
 * @param {Object} options an object containing various properties that correspond to config settings (see the function body for names)
 * @param {Array} options.ignore an array of properties to add to config.IGNORE_ATTR
 * @param {Array} options.embed an array of properties to add to config.EMBEDDED_JSON_ATTR
 * @param {Array} options.sortKeys an array of properties to add to config.SORTING_KEYS
 * @param {Boolean} options.ignoreArrayOrder sets config.IGNORE_ARRAY_ORDER
 * @param {Boolean} options.oneWayDiff set config.ONE_WAY_DIFF
 */
export function setOptions(options) {
    if (typeof options.ignore !== "undefined" && Array.isArray(options.ignore)) {
        options.ignore.forEach(function(prop) {
            addIgnoredAttr(prop);
        });
    }
    if (typeof options.embed !== "undefined" && Array.isArray(options.embed)) {
        options.embed.forEach(function(prop) {
            addEmbeddedAttr(prop);
        });
    }
    if (typeof options.sortKeys !== "undefined") {
        options.sortKeys.forEach(function(prop){
            addSortingKeys(prop);
        });
    }
    if (typeof options.ignoreArrayOrder !== "undefined") config.IGNORE_ARRAY_ORDER = options.ignoreArrayOrder;
    if (typeof options.collapseSimilar !== "undefined") config.FOLD_UNMARKED_SECTIONS = options.foldUnmarkedSections;
    if (typeof options.oneWay !== "undefined") config.ONE_WAY_DIFF = options.oneWay;
}

/**
 * Resets all configurations to their default values.
 */
export function resetConfig() {
    document.getElementById("ignoreList").innerHTML = "";
    document.getElementById("embedList").innerHTML = "";
    document.getElementById("keyList").innerHTML = "";
    config.IGNORE_ATTR = {};
    config.EMBEDDED_JSON_ATTR = {};
    config.SORTING_KEYS = [];
    config.IGNORE_ARRAY_ORDER = false;
    config.FOLD_UNMARKED_SECTIONS = true;
    config.ONE_WAY_DIFF = false;
}

/**
 * 
 * Sets the first file to run in the diff tool. Corresponds to the left editor on the interface.
 * Accepts JSON strings, JSON objects, or urls that lead to json data.
 * 
 * @param {*} json the input data. Can be either a string, a json object, or a url pointing to JSON data.
 * @param {String} type states the input format: "string", "json-object", or "url"
 * @param {Object} metadata optional - an object containing the author, name of the file, and date modified
 * @param {String} metadata.fileName optional - the name of the file
 * @param {String} metadata.author optional - the author of the file
 * @param {String} metadata.date optional - the date when the file was last modified
 * @param {function} callback optional - state a callback function to be executed once the url data is loaded.
 * @return returns true if the input JSON is valid JSON, false otherwise.
 */
export function setLeft(json, type, metadata = null, callback = null) {
    switch (type) {
        case "string": {
            try {
                _jdiff.JSON_A = JSON.parse(json);
                if (metadata !== null) {
                    let fileName = typeof metadata.fileName !== "undefined" ? metadata.fileName : "";
                    let author = typeof metadata.author !== "undefined" ? ", " + metadata.author : "";
                    let date = typeof metadata.date !== "undefined" ? ", " + metadata.date : "";
                    _jdiff.JSON_A_NAME = fileName + author + date;
                }
                _jdiff.isValidJSON = true;
            } catch (e) {
                _jdiff.isValidJSON = false;
            }
            return _jdiff.isValidJSON;
        }

        case "url": {
            try {
                fetch(json)
                .then((response) => response.json())
                .then(function(data) {
                    _jdiff.JSON_A = data;
                    if (metadata !== null) {
                        let fileName = typeof metadata.fileName !== "undefined" ? metadata.fileName : "";
                        let author = typeof metadata.author !== "undefined" ? ", " + metadata.author : "";
                        let date = typeof metadata.date !== "undefined" ? ", " + metadata.date : "";
                        _jdiff.JSON_A_NAME = fileName + author + date;
                    }
                    if (callback !== null) callback();
                });
                _jdiff.isValidJSON = true;
            } catch (e) {
                _jdiff.isValidJSON = false;
            }
            return _jdiff.isValidJSON;
        }

        case "json-object": {
            try {
                _jdiff.JSON_A = JSON.parse(JSON.stringify(json));
                if (metadata !== null) {
                    let fileName = typeof metadata.fileName !== "undefined" ? metadata.fileName : "";
                    let author = typeof metadata.author !== "undefined" ? ", " + metadata.author : "";
                    let date = typeof metadata.date !== "undefined" ? ", " + metadata.date : "";
                    _jdiff.JSON_A_NAME = fileName + author + date;
                }
                _jdiff.isValidJSON = true;
            } catch (e) {
                _jdiff.isValidJSON = false;
            }
            return _jdiff.isValidJSON;
        }
    }  
}

/**
 * 
 * Sets the second file to run in the diff tool. Corresponds to the right editor on the interface.
 * Accepts JSON strings, JSON objects, or urls that lead to json data.
 * 
 * @param {*} json the input data. Can be either a string, a json object, or a url pointing to JSON data.
 * @param {String} type states the input format: "string", "json-object", or "url"
 * @param {Object} metadata optional - an object containing the author, name of the file, and date modified
 * @param {String} metadata.fileName optional - the name of the file
 * @param {String} metadata.author optional - the author of the file
 * @param {String} metadata.date optional - the date when the file was last modified
 * @param {function} callback optional - state a callback function to be executed once the url data is loaded.
 * @return returns true if the input JSON is valid JSON, false otherwise.
 */
export function setRight(json, type, metadata = null, callback = null) {
    switch (type) {
        case "string": {
            try {
                _jdiff.JSON_B = JSON.parse(json);
                _jdiff.isValidJSON = true;
                if (metadata !== null) {
                    let fileName = typeof metadata.fileName !== "undefined" ? metadata.fileName : "";
                    let author = typeof metadata.author !== "undefined" ? ", " + metadata.author : "";
                    let date = typeof metadata.date !== "undefined" ? ", " + metadata.date : "";
                    _jdiff.JSON_B_NAME = fileName + author + date;
                }
            } catch (e) {
                _jdiff.isValidJSON = false;
            }
            return _jdiff.isValidJSON;
        }

        case "url": {
            try {
                fetch(json)
                .then((response) => response.json())
                .then(function(data) {
                    _jdiff.JSON_B = data;
                    if (metadata !== null) {
                        let fileName = typeof metadata.fileName !== "undefined" ? metadata.fileName : "";
                        let author = typeof metadata.author !== "undefined" ? ", " + metadata.author : "";
                        let date = typeof metadata.date !== "undefined" ? ", " + metadata.date : "";
                        _jdiff.JSON_A_NAME = fileName + author + date;
                    }
                    if (callback !== null) callback();
                });
                _jdiff.isValidJSON = true;
            } catch (e) {
                _jdiff.isValidJSON = false;
            }
            return _jdiff.isValidJSON;
        }

        case "json-object": {
            try {
                _jdiff.JSON_B = JSON.parse(JSON.stringify(json));
                if (metadata !== null) {
                    let fileName = typeof metadata.fileName !== "undefined" ? metadata.fileName : "";
                    let author = typeof metadata.author !== "undefined" ? ", " + metadata.author : "";
                    let date = typeof metadata.date !== "undefined" ? ", " + metadata.date : "";
                    _jdiff.JSON_A_NAME = fileName + author + date;
                }
                _jdiff.isValidJSON = true;
            } catch (e) {
                _jdiff.isValidJSON = false;
            }
            return _jdiff.isValidJSON;
        }
    }  
}

/**
 * Removes any both editors to their original state, removing any changes made.
 * 
 * @return returns the result of the diff
 */
export function discardChanges() {
    return frontend.main(_jdiff.JSON_A, _jdiff.JSON_B);
}

/**
 *
 * Runs the diff algorithm on the two current JSON inputs. 
 * Can optionally specify JSON string inputs instead of calling setLeft() and setRight() beforehand.
 * If your inputs are not Strings, use setLeft() and setRight() to set the inputs instead.
 * 
 * @param {String} json_string_a optional - a JSON string to be compared (not a JSON object)
 * @param {String} json_string_b optional - a JSON string to be compared (not a JSON object)
 * @return returns the result of the diff, returns false if either JSON_A or JSON_B is invalid.
 */
export function runDiff(json_string_a, json_string_b) {
    if (typeof json_string_a !== "undefined") {
        if (!setLeft(json_string_a, "string")) return false;
    }

    if (typeof json_string_b !== "undefined") {
        if (!setRight(json_string_b, "string")) return false;
    }

    if (!_jdiff.isValidJSON) {
        return false;
    }

    return frontend.main(_jdiff.JSON_A, _jdiff.JSON_B);
}

/**
 * Reruns the diff on the current contents of the text editors. 
 * Should be called after merging changes and/or editing the text directly.
 * 
 * @return the results of the diff, false if any of the JSON is invalid.
 */
export function rerunDiff() {
    try {
        // run the diff again, but with the contents of the editors this time
        let currentView = _jdiff.leftEditor.renderer.getFirstVisibleRow();
        let result = frontend.main(JSON.parse(_jdiff.leftEditor.getValue()), JSON.parse(_jdiff.rightEditor.getValue()));
        _jdiff.leftEditor.renderer.alignCursor(currentView, 0.0);
        _jdiff.rightEditor.renderer.alignCursor(currentView, 0.0);
        return result;
    } catch (e) {
        console.log(e);
        return false;
    }
}

/**
 * Exports the current contents of the left editor, including any changes made.
 * Output is minified by default, but can be pretty printed using the input prettyPrint.
 * 
 * @param {Boolean} prettyPrint optional parameter to pretty print the result. False by default.
 * @return the current contents of the left editor as a string. Returns false if the JSON is invalid.
 */
export function exportLeft(prettyPrint = false) {
    let spacing = prettyPrint ? 4 : 0;
    try {
        return JSON.stringify(comparison.exportJSON(JSON.parse(_jdiff.leftEditor.getValue())), null, spacing);
    } catch (e) {
        // console.log(e);
        return false;
    }
}

/**
 * Exports the current contents of the right editor, including any changes made.
 * Output is minified by default, but can be pretty printed using the input prettyPrint.
 * 
 * @param {Boolean} prettyPrint optional parameter to pretty print the result. False by default.
 * @return the current contents of the right editor as a string. Returns false if the JSON is invalid.
 */
export function exportRight(prettyPrint = false) {
    let spacing = prettyPrint ? 4 : 0;
    try {
        return JSON.stringify(comparison.exportJSON(JSON.parse(_jdiff.rightEditor.getValue())), null, spacing);
    } catch (e) {
        // console.log(e);
        return false;
    }
}

/**
 * Expands all folded segments of code in both editors.
 */
export function expandAll() {
    _jdiff.enable = false;
    _jdiff.leftEditor.session.unfold();
    _jdiff.rightEditor.session.unfold();
    _jdiff.enable = true;
}

/**
 * Folds all segments of code on both editors that do not contain changes, or segments where any changes have been ignored.
 */
export function foldUnmarkedSections() {
    if (_jdiff.leftEditor.getReadOnly() && _jdiff.rightEditor.getReadOnly()) {
        expandAll();
        _jdiff.ranges.collapseRanges.forEach(function(value) {
            if (value[0] !== value[1]) {
                frontend.foldAt(value[0], value[1]);
            }
        });
    }
}

/**
 * Hides any lines without changes in both editors.
 */
export function hideSameLines() {
    if (_jdiff.leftEditor.getReadOnly() && _jdiff.rightEditor.getReadOnly()) {
        expandAll();
        let start = 0;
        let end = _jdiff.leftEditor.session.doc.getAllLines().length - 1;
        let markerIndex = 0;
    
        while (markerIndex < _jdiff.ranges.markerRanges.length) {
            end = _jdiff.ranges.markerRanges[markerIndex][0] - 1;
            if (start <= end) {
                frontend.hideLines(start, end);
            }
            start = _jdiff.ranges.markerRanges[markerIndex][1] + 1;
            markerIndex++;
        }
    
        end = _jdiff.leftEditor.session.doc.getAllLines().length - 1;
        if (start <= end) {
            frontend.hideLines(start, end);
        }
    }
}

/**
 * Allows the user to enable / disable one-way-diffs. 
 * @param {boolean} isOneWay true to enable, false to disable.
 * @return returns config.ONE_WAY_DIFF if successful, otherwise returns null.
 */
export function setOneWayDiff(isOneWay) {
    if (typeof isOneWay !== "boolean") return null;
    config.ONE_WAY_DIFF = isOneWay;
    return config.ONE_WAY_DIFF;
}

/**
 * Allows the user to add attributes by name so the diff tool can ignore changes on a specified set of keys.
 * Can input either a string to add one attribute, or an array of strings to insert multiple values.
 * Ignores non-Strings or array entries that are not strings.
 * @param {Array|String} ignoreAttr an array of Strings containing the names of multiple properties, or a single String corresponding to one property.
 * @return the updated config.IGNORE_ATTR, false if ignoreAttr is not an Array or String
 */
export function addIgnoredAttr(ignoreAttr) {
    if (typeof ignoreAttr === "string") {
        eventhandlers.ignoreListAdd(ignoreAttr);
        return config.IGNORE_ATTR;
    }
    if (!Array.isArray(ignoreAttr)) return false;
    ignoreAttr.forEach(function(value) {
        eventhandlers.ignoreListAdd(value);
    });
    return config.IGNORE_ATTR;
}

/**
 * Allows the user to add attributes to see the diffs on properties that contain escaped JSON strings.
 * Can input either a string to add one attribute, or an array of strings to insert multiple values.
 * Ignores non-Strings or array entries that are not strings.
 * @param {Array|String} embedAttr an array of Strings containing the names of multiple properties, or a single String corresponding to one property.
 * @return the updated config.EMBED_JSON_ATTR, false if embedAttr is not an Array or String
 */
export function addEmbeddedAttr(embedAttr) {
    if (typeof embedAttr === "string") {
        eventhandlers.embedListAdd(embedAttr);
        return config.EMBEDDED_JSON_ATTR;
    }
    if (!Array.isArray(embedAttr)) return false;
    embedAttr.forEach(function(value) {
        eventhandlers.embedListAdd(value);
    });
    return config.EMBEDDED_JSON_ATTR;
}

/**
 * Allows the user to specify certain attributes as "keys" in order to ignore the order of arrays when performing a diff.
 * Because the property names are global, the underlying data structure is an array - the diff algorithm will attempt to check any array for these keys,
 * choosing the first key that is present in every element, prioritizing keys towards the start of the array.
 * @param {Array|String} keyAttr an array of Strings containing the names of multiple properties, or a single String corresponding to one property.
 * @return the updated config.SORTING_KEYS, false if keyAttr is not an Array or String
 */
export function addSortingKeys(keyAttr) {
    if (typeof keyAttr === "string") {
        eventhandlers.sortKeyAdd(keyAttr);
        return config.SORTING_KEYS;
    }
    if (!Array.isArray(keyAttr)) return false;
    keyAttr.forEach(function(value) {
        eventhandlers.sortKeyAdd(value);
    });
    return config.SORTING_KEYS;
}

/**
 * Removes an element from the set of ignored property keys.
 * @param {String} prop the property name to remove
 * @return the updated config.IGNORE_ATTR, or false if the input was invalid.
 */
export function removeIgnoredAttr(prop) {
    if (typeof prop !== "string") return false;
    if (config.IGNORE_ATTR.hasOwnProperty(prop)) {
        for (let i = 0; i < document.getElementById("ignoreList").childNodes.length; i++) {
            if (document.getElementById("ignoreList").childNodes[i].textContent === prop + "x") {
                document.getElementById("ignoreList").removeChild(document.getElementById("ignoreList").childNodes[i]);
                break;
            }
        }
        delete config.IGNORE_ATTR[prop];
    }
    return config.IGNORE_ATTR;
}

/**
 * Removes an element from the set of embedded JSON property keys.
 * @param {String} prop the property name to remove
 * @return the updated config.EMBEDDED_JSON_ATTR, or false if the input was invalid.
 */
export function removeEmbeddedAttr(prop) {
    if (typeof prop !== "string") return false;
    if (config.EMBEDDED_JSON_ATTR.hasOwnProperty(prop)) {
        for (let i = 0; i < document.getElementById("embedList").childNodes.length; i++) {
            if (document.getElementById("embedList").childNodes[i].textContent === prop + "x") {
                document.getElementById("embedList").removeChild(document.getElementById("embedList").childNodes[i]);
                break;
            }
        }
        delete config.EMBEDDED_JSON_ATTR[prop];
    }
    return config.EMBEDDED_JSON_ATTR;
}

/**
 * Removes an element from the array of sorting keys.
 * @param {String} prop the property name to remove
 * @return the updated config.SORTING_KEYS, or false if the input was invalid.
 */
export function removeSortingKey(prop) {
    if (typeof prop !== "string") return false;
    if (config.SORTING_KEYS.includes(prop)) {
        for (let i = 0; i < document.getElementById("keyList").childNodes.length; i++) {
            if (document.getElementById("keyList").childNodes[i].textContent === prop + "x") {
                document.getElementById("keyList").removeChild(document.getElementById("keyList").childNodes[i]);
                break;
            }
        }
        config.SORTING_KEYS.splice(config.SORTING_KEYS.indexOf(prop), 1);
    }
    return config.SORTING_KEYS;
}

/**
 * Getter function for ignored property keys.
 */
export function getIgnoredAttr() {
    return config.IGNORE_ATTR;
}

/**
 * Getter function for properties to check for escaped JSON strings.
 */
export function getEmbeddedAttr() {
    return config.EMBEDDED_JSON_ATTR;
}

/**
 * Getter function for the array of sorting keys.
 */
export function getSortingKeys() {
    return config.SORTING_KEYS;
}

/**
 * Hides the left sidebar. Also see showSideBar().
 */
export function hideSidebar() {
    document.getElementsByClassName("jdiff-sidebar")[0].style.display = "none";
}

/**
 * Shows the left sidebar, if it was hidden by hideSideBar().
 */
export function showSidebar() {
    document.getElementsByClassName("jdiff-sidebar")[0].style.display = "flex";
}

/**
 * Hides the topbar. Also see showTopbar().
 */
export function hideTopbar() {
    document.getElementsByClassName("topbar")[0].style.display = "none";
}

/**
 * Shows the topbar, if it was hidden by hideTopbar().
 */
export function showTopbar() {
    document.getElementsByClassName("topbar")[0].style.display = "flex";
}

/**
 * Disables merging using the arrow keys. Can only be used while in diff mode (markers are showing)
 * This only works when called after jsondiff.runDiff(), because jsondiff.runDiff() adds event handlers for merging.
 */
export function disableMerging() {
    if (_jdiff.leftEditor.getReadOnly() && _jdiff.rightEditor.getReadOnly()) {
        _jdiff.leftEditor.commands.removeCommand("mergeLeft");
        _jdiff.leftEditor.commands.removeCommand("mergeRight");
    
        _jdiff.rightEditor.commands.removeCommand("mergeLeft");
        _jdiff.rightEditor.commands.removeCommand("mergeRight");
    }
}

/**
 * Enables merging using the arrow keys. Can only be used while in diff mode (markers are showing)
 */
export function enableMerging() {
    if (_jdiff.leftEditor.getReadOnly() && _jdiff.rightEditor.getReadOnly()) {
        _jdiff.leftEditor.commands.addCommand({
            name: "mergeLeft",
            bindKey: {win: "Left", mac: "Left"},
            exec: function() {
                frontend.mergeChange("toLeft");  
            },
            readOnly: true
        });
    
        _jdiff.leftEditor.commands.addCommand({
            name: "mergeRight",
            bindKey: {win: "Right", mac: "Right"},
            exec: function() {
                frontend.mergeChange("toRight");  
            },
            readOnly: true
        });
    
        _jdiff.rightEditor.commands.addCommand({
            name: "mergeLeft",
            bindKey: {win: "Left", mac: "Left"},
            exec: function() {
                frontend.mergeChange("toLeft");   
            },
            readOnly: true
        });
    
        _jdiff.rightEditor.commands.addCommand({
            name: "mergeRight",
            bindKey: {win: "Right", mac: "Right"},
            exec: function() {
                frontend.mergeChange("toRight");  
            },
            readOnly: true
        });
    }
}