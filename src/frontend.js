// FRONTEND.JS
// Contains functions that perform various actions on the UI side of the application
// EX: Markers, folding

import { diff, parseEmbeddedJSON, isPlainObject, alphaSort } from "./comparison.js";
import { config, Range, _jdiff } from "./config.js";

/**
 * main() - Performs the diff on the two inputs JSON_A and JSON_B, and then displays the results to the two editors
 * @param {Object} JSON_A 
 * @param {Object} JSON_B 
 */
export function main(JSON_A, JSON_B) {
    let JSON_OBJECT_A = parseEmbeddedJSON(JSON_A);
    let JSON_OBJECT_B = parseEmbeddedJSON(JSON_B);

    // expand all existing ranges, getting rid of any code folds
    // the handler for synchronizing folds causes bugs at times, so at the start of each diff just get rid of all folds
    _jdiff.enable = false;
    _jdiff.leftEditor.session.unfold();
    _jdiff.rightEditor.session.unfold();
    _jdiff.enable = true;

    // delete all markers
    for (let marker_id in _jdiff.leftEditor.session.$backMarkers) {
        _jdiff.leftEditor.session.removeMarker(marker_id);
    }
    for (let marker_id in _jdiff.leftEditor.session.$frontMarkers) {
        _jdiff.leftEditor.session.removeMarker(marker_id);
    }
    for (let marker_id in _jdiff.rightEditor.session.$backMarkers) {
        _jdiff.rightEditor.session.removeMarker(marker_id);
    }
    for (let marker_id in _jdiff.rightEditor.session.$frontMarkers) {
        _jdiff.rightEditor.session.removeMarker(marker_id);
    }

    // call upon the functions in json_comp.js
    let diff_result = diff(JSON_OBJECT_A, JSON_OBJECT_B);

    // quick and dirty way of doing a deep copy of JSON_OBJECT_B
    // luckily the input should be guaranteed to be valid JSON, so this works
    let obj2 = JSON.parse(JSON.stringify(JSON_OBJECT_B));
    let unified_object = combineWith(JSON_OBJECT_A, obj2, diff_result);
    let unified_string = JSON.stringify(unified_object, alphaSort, 4);

    // call mapLinestoJSON on the unified string
    _jdiff.rightEditor.setValue(unified_string);
    // editor = _jdiff.rightEditor;
    _jdiff.lines = _jdiff.rightEditor.session.doc.getAllLines();
    let unified_mapping = mapLinestoJSON(0);

    // insert the JSON strings into the editors, and then DELETE / MODIFY the right lines
    _jdiff.leftEditor.setValue(unified_string);
    _jdiff.rightEditor.setValue(unified_string);

    // delete and edit the relevant fields in each version
    clearLeft(diff_result, unified_mapping.properties.root);
    clearRight(diff_result, unified_mapping.properties.root);

    // wait until the fold widgets are defined, so we can collapse the irrelevant ones
    _jdiff.ranges = markDiffs(diff_result, unified_mapping.properties.root);
    // console.log(_jdiff.ranges);
    // let markerRanges = editors.ranges.markerRanges;

    // for debugging purposes only
    // _jdiff.leftEditor.setValue(JSON.stringify(JSON_OBJECT_A, alphaSort, 4));
    // _jdiff.rightEditor.setValue(JSON.stringify(JSON_OBJECT_B, alphaSort, 4));

    // code fold all irrelevant areas of the diff
    if (config.FOLD_UNMARKED_SECTIONS) {
        if (_jdiff.leftEditor.getReadOnly() && _jdiff.rightEditor.getReadOnly()) {
            // unfold all
            _jdiff.enable = false;
            _jdiff.leftEditor.session.unfold();
            _jdiff.rightEditor.session.unfold();
            _jdiff.enable = true;

            // collapse all unmarked sections
            _jdiff.ranges.collapseRanges.forEach(function(value) {
                if (value[0] !== value[1]) {
                    foldAt(value[0], value[1]);
                }
            });
        }
    }

    // set up navigation, if any differences even exist
    if (!diff_result.equal) {
        _jdiff.currentIndex = 0;
        _jdiff.currentRange = new Range(_jdiff.ranges.markerRanges[_jdiff.currentIndex][0], 0, _jdiff.ranges.markerRanges[_jdiff.currentIndex][1], 1);
        _jdiff.currentLeft = _jdiff.leftEditor.session.addMarker(_jdiff.currentRange, "currentChange", "fullLine", true);
        _jdiff.currentRight = _jdiff.rightEditor.session.addMarker(_jdiff.currentRange, "currentChange", "fullLine", true);
        if (_jdiff.currentRange.start.row <= _jdiff.leftEditor.renderer.getFirstVisibleRow() || _jdiff.currentRange.start.row >= _jdiff.leftEditor.renderer.getLastVisibleRow()) {
            _jdiff.leftEditor.renderer.alignCursor(_jdiff.currentRange.start.row, 0.1);
            _jdiff.rightEditor.renderer.alignCursor(_jdiff.currentRange.start.row, 0.1);
        }
        _jdiff.mergeMarkerIDs = [];
        _jdiff.mergedRanges = {};
    }

    // prevent autohighlighting of everything in the _jdiff.leftEditor
    _jdiff.leftEditor.clearSelection();
    _jdiff.rightEditor.clearSelection();

    // set the appropriate file names to the screen
    if (_jdiff.isValidJSON) {
        document.getElementById("left-editor-label").innerHTML = _jdiff.JSON_A_NAME;
        document.getElementById("right-editor-label").innerHTML = _jdiff.JSON_B_NAME;
    }

    // sets the mode to readOnly, sets correct event handlers for viewing / merging diffs
    diffMode();

    return diff_result;
}

// attempts to merge the changes from one side of the editor to the other, or vise-versa.
// merges the changes based on the current change selected by _jdiff.currentRange.
export function mergeChange(direction) {
    // prevent the user from editing the left side in a one-way-diff
    if (direction === "toLeft" && config.ONE_WAY_DIFF) {
        return;
    }
    let mergeRange;
    let replacerText;
    let currentView;
    switch (direction) {
        case "toLeft":
            if (_jdiff.mergedRanges.hasOwnProperty(_jdiff.currentRange.start.row)) break;

            // perform the merge
            mergeRange = new Range(_jdiff.currentRange.start.row, 0, _jdiff.currentRange.end.row + 1, 0);
            // store the information about the last merge so we might be able to undo it later
            _jdiff.lastMerge.range = mergeRange;
            _jdiff.lastMerge.editor = "left";
            _jdiff.lastMerge.original = _jdiff.leftEditor.session.getTextRange(mergeRange);
            for (let id in _jdiff.leftEditor.session.getMarkers(false)) {
                if (_jdiff.leftEditor.session.getMarkers(false)[id].range.start.row === _jdiff.currentRange.start.row) {
                    _jdiff.lastMerge.changeType = _jdiff.leftEditor.session.getMarkers(false)[id].clazz;
                    break;
                }
            }
            
            replacerText = _jdiff.rightEditor.session.getTextRange(mergeRange);
            replacerText = commaHandler(_jdiff.currentRange.start.row, _jdiff.currentRange.end.row, replacerText, _jdiff.leftEditor);
            _jdiff.leftEditor.session.replace(mergeRange, replacerText);
            let markerID_A = _jdiff.leftEditor.session.addMarker(new Range(_jdiff.currentRange.start.row, 0, _jdiff.currentRange.end.row, 1), "merge", "fullLine");
            _jdiff.mergeMarkerIDs.push(markerID_A);
            _jdiff.lastMerge.mergeMarkerID = markerID_A;

            _jdiff.mergedRanges[_jdiff.currentRange.start.row] = _jdiff.currentRange.end.row;
            currentView = _jdiff.leftEditor.renderer.getFirstVisibleRow();
            _jdiff.leftEditor.renderer.alignCursor(currentView, 0.0);
            _jdiff.rightEditor.renderer.alignCursor(currentView, 0.0);
            break;
        case "toRight":
            if (_jdiff.mergedRanges.hasOwnProperty(_jdiff.currentRange.start.row)) break;

            mergeRange = new Range(_jdiff.currentRange.start.row, 0, _jdiff.currentRange.end.row + 1, 0);
            // store the information about the last merge so we might be able to undo it later
            _jdiff.lastMerge.range = mergeRange;
            _jdiff.lastMerge.editor = "right";
            _jdiff.lastMerge.original = _jdiff.rightEditor.session.getTextRange(mergeRange);
            for (let id in _jdiff.rightEditor.session.getMarkers(false)) {
                if (_jdiff.rightEditor.session.getMarkers(false)[id].range.start.row === _jdiff.currentRange.start.row) {
                    _jdiff.lastMerge.changeType = _jdiff.rightEditor.session.getMarkers(false)[id].clazz;
                    // console.log(_jdiff.rightEditor.session.getMarkers(false)[id]);
                    break;
                }
            }
            replacerText = _jdiff.leftEditor.session.getTextRange(mergeRange);
            replacerText = commaHandler(_jdiff.currentRange.start.row, _jdiff.currentRange.end.row, replacerText, _jdiff.rightEditor);
            _jdiff.rightEditor.session.replace(mergeRange, replacerText);
            let markerID_B = _jdiff.rightEditor.session.addMarker(new Range(_jdiff.currentRange.start.row, 0, _jdiff.currentRange.end.row, 1), "merge", "fullLine");
            _jdiff.mergeMarkerIDs.push(markerID_B);
            _jdiff.lastMerge.mergeMarkerID = markerID_B;

            _jdiff.mergedRanges[_jdiff.currentRange.start.row] = _jdiff.currentRange.end.row;
            currentView = _jdiff.leftEditor.renderer.getFirstVisibleRow();
            _jdiff.leftEditor.renderer.alignCursor(currentView, 0.0);
            _jdiff.rightEditor.renderer.alignCursor(currentView, 0.0);
            break;
        default:
            console.log("invalid direction");
            break;
    }
}

// a function that helps remove commas when merging to maintain proper syntax
export function commaHandler(start, end, replacerText, editor) {
    // a change that starts at 0 and ends on the last line must be the entire JSON object (or, it's invalid)
    // therefore, there will be no commas to add or remove
    if (start === 0 && end === editor.session.doc.getAllLines().length - 1) {
        return replacerText;
    }

    // this is meant for debugging and should never be reached
    if (start === 0 || end === editor.session.doc.getAllLines().length - 1) {
        console.log("error: a change starts at 0 or ends at the end, but not both");
        return replacerText;
    }

    if (isBlank(replacerText)) {
        let above = start - 1;
        let below = end + 1;
        while (isBlank(editor.session.doc.getAllLines()[below])) {
            below++;
            if (below > editor.session.doc.getAllLines().length - 1) {
                console.log("couldn't find a line below that isn't blank");
                break;
            }
        }

        if (editor.session.doc.getAllLines()[below].trim().startsWith("}") || editor.session.doc.getAllLines()[below].trim().startsWith("]")) {
            while (isBlank(editor.session.doc.getAllLines()[above])) {
                above--;
                if (above < 0) {
                    console.log("couldn't find a line above that isn't blank");
                    break;
                }
            }

            // console.log(above + "," + _jdiff.leftEditor.session.doc.getAllLines()[above]);
            if (editor.session.doc.getAllLines()[above].trim().endsWith(",")) {
                let commaPosition = editor.session.doc.getAllLines()[above].lastIndexOf(",");
                let comma = new Range(above, commaPosition, above, commaPosition + 1);
                editor.session.replace(comma, "");
            }
        }
    } else {
        // non blank replacer
        let above = start - 1;
        let below = end + 1;

        while (isBlank(editor.session.doc.getAllLines()[below])) {
            below++;
            if (below > editor.session.doc.getAllLines().length - 1) {
                console.log("couldn't find a line below that isn't blank");
                break;
            }
        }

        // if the inserted text is the last in its object/array, then remove comma from replacement text (if applicable)
        if (editor.session.doc.getAllLines()[below].trim().startsWith("}") || editor.session.doc.getAllLines()[below].trim().startsWith("]")) {
            // remove comma from the end of the replacement text, if there is one
            if (replacerText.trim().endsWith(",")) {
                replacerText = replacerText.substring(0, replacerText.lastIndexOf(",")).concat("\n");
            }
        } else {    // if it's NOT the last element, then ensure replacerText ends with a comma
            if (!replacerText.trim().endsWith(",")) {
                replacerText = replacerText.substring(0, replacerText.lastIndexOf("\n")).concat(",\n");
            }
        }

        while (isBlank(editor.session.doc.getAllLines()[above])) {
            above--;
            if (above < 0) {
                console.log("couldn't find a line above that isn't blank");
                break;
            }
        }

        if (!editor.session.doc.getAllLines()[above].trim().endsWith(",") && !editor.session.doc.getAllLines()[above].trim().endsWith("{") && !editor.session.doc.getAllLines()[above].trim().endsWith("[")) {
            editor.session.insert({
                row: above,
                column: editor.session.doc.getAllLines()[above].length
            }, ",");
        }
    }
    return replacerText;
}

export function editMode() {
    // disable the arrow / diff controls
    _jdiff.leftEditor.commands.removeCommand("mergeLeft");
    _jdiff.leftEditor.commands.removeCommand("mergeRight");
    _jdiff.leftEditor.commands.removeCommand("nextChange");
    _jdiff.leftEditor.commands.removeCommand("prevChange");

    _jdiff.rightEditor.commands.removeCommand("mergeLeft");
    _jdiff.rightEditor.commands.removeCommand("mergeRight");
    _jdiff.rightEditor.commands.removeCommand("nextChange");
    _jdiff.rightEditor.commands.removeCommand("prevChange");
    
    // disable diff navigation via clicks
    _jdiff.leftEditor.removeEventListener("click", clickJump);
    _jdiff.rightEditor.removeEventListener("click", clickJump);

    // delete all the markers
    for (let marker_id in _jdiff.leftEditor.session.$backMarkers) {
        _jdiff.leftEditor.session.removeMarker(marker_id);
    }
    for (let marker_id in _jdiff.leftEditor.session.$frontMarkers) {
        _jdiff.leftEditor.session.removeMarker(marker_id);
    }
    for (let marker_id in _jdiff.rightEditor.session.$backMarkers) {
        _jdiff.rightEditor.session.removeMarker(marker_id);
    }
    for (let marker_id in _jdiff.rightEditor.session.$frontMarkers) {
        _jdiff.rightEditor.session.removeMarker(marker_id);
    }

    // disable synchronized scrolling
    _jdiff.leftEditor.session.removeEventListener("changeScrollTop", synchronizeScrollA);
    _jdiff.rightEditor.session.removeEventListener("changeScrollTop", synchronizeScrollB);

    // disable synchronized folding
    _jdiff.leftEditor.session.removeEventListener("changeFold", synchronizeFoldA);
    _jdiff.rightEditor.session.removeEventListener("changeFold", synchronizeFoldB);

    // enable editing on both editors, or just one editor if the diff is meant to be one-way
    if (!config.ONE_WAY_DIFF) {
        _jdiff.leftEditor.setReadOnly(false);
    }
    
    _jdiff.rightEditor.setReadOnly(false);
    _jdiff.leftEditor.renderer.$cursorLayer.element.style.display = "";
    _jdiff.rightEditor.renderer.$cursorLayer.element.style.display = "";
    _jdiff.leftEditor.setHighlightActiveLine(true);
    _jdiff.rightEditor.setHighlightActiveLine(true);
}

export function diffMode() {
    // set keybindings to allow for navigation through changes
    _jdiff.leftEditor.commands.addCommand({
        name: "mergeLeft",
        bindKey: {win: "Left", mac: "Left"},
        exec: function() {
            mergeChange("toLeft");  
        },
        readOnly: true
    });

    _jdiff.leftEditor.commands.addCommand({
        name: "mergeRight",
        bindKey: {win: "Right", mac: "Right"},
        exec: function() {
            mergeChange("toRight");  
        },
        readOnly: true
    });

    _jdiff.leftEditor.commands.addCommand({
        name: "nextChange",
        bindKey: {win: "Down", mac: "Down"},
        exec: function() {
            nextRange();
        },
        readOnly: true
    });

    _jdiff.leftEditor.commands.addCommand({
        name: "prevChange",
        bindKey: {win: "Up", mac: "Up"},
        exec: function() {
            prevRange(); 
        },
        readOnly: true
    });

    _jdiff.rightEditor.commands.addCommand({
        name: "mergeLeft",
        bindKey: {win: "Left", mac: "Left"},
        exec: function() {
            mergeChange("toLeft");   
        },
        readOnly: true
    });

    _jdiff.rightEditor.commands.addCommand({
        name: "mergeRight",
        bindKey: {win: "Right", mac: "Right"},
        exec: function() {
            mergeChange("toRight");  
        },
        readOnly: true
    });

    _jdiff.rightEditor.commands.addCommand({
        name: "nextChange",
        bindKey: {win: "Down", mac: "Down"},
        exec: function() {
            nextRange();
        },
        readOnly: true
    });

    _jdiff.rightEditor.commands.addCommand({
        name: "prevChange",
        bindKey: {win: "Up", mac: "Up"},
        exec: function() {
            prevRange(); 
        },
        readOnly: true
    });

    // allow to jump to another change based on a click
    _jdiff.leftEditor.on("click", clickJump);
    _jdiff.rightEditor.on("click", clickJump);
    
    // synchronized scrolling
    _jdiff.leftEditor.session.on('changeScrollTop', synchronizeScrollA);
    _jdiff.rightEditor.session.on('changeScrollTop', synchronizeScrollB);

    // enable synchronized folding
    _jdiff.leftEditor.session.on("changeFold", synchronizeFoldA);
    _jdiff.rightEditor.session.on("changeFold", synchronizeFoldB);

    // disable editing on both editors and hide the cursors
    _jdiff.leftEditor.setReadOnly(true);
    _jdiff.rightEditor.setReadOnly(true);
    _jdiff.leftEditor.renderer.$cursorLayer.element.style.display = "none";
    _jdiff.rightEditor.renderer.$cursorLayer.element.style.display = "none";

    // disable active line highlighting
    _jdiff.leftEditor.setHighlightActiveLine(false);
    _jdiff.rightEditor.setHighlightActiveLine(false);
}

// given a start line and a global variable lines that stores the lines in the editor,
// return an object that maps objects and its properties to a range of line numbers.
export function mapLinestoJSON(start, arrIndex = null) {
    let line_mapping = {
        start: start,
        end: _jdiff.lines.length - 1,
        properties: {},
        i: arrIndex
    };

    for (let line_num = start; line_num < _jdiff.lines.length; line_num++) {
        // if it's a JSON object, the first line is always "{" or "["
        if (_jdiff.lines[line_num].trim().startsWith("[") && line_num === 0) {
            line_mapping.i = "root";
        }

        // edge case: one of the properties has an empty object as a value
        if (_jdiff.lines[line_num].trim().endsWith("{}") || _jdiff.lines[line_num].trim().endsWith("{},") || 
            _jdiff.lines[line_num].trim().endsWith("[]") || _jdiff.lines[line_num].trim().endsWith("[],") ) {
            let attr = "root";
            if (_jdiff.lines[line_num].trim().startsWith("\"")) {
                // regex - on a line, remove the first instance of a string between nonescaped quotes (attribute), then remove all escape characters.
                let attr_quoted = _jdiff.lines[line_num].trim().match(/"(?:[^"\\]|\\.)*"/)[0].replace(/\\"/g, '"');
                attr = attr_quoted.substring(1, attr_quoted.length - 1);
            }

            // if we're in an array, the attribute should be whatever the index is
            if (line_mapping.i !== null) {
                attr = line_mapping.i;
            }

            line_mapping.properties[attr] = {
                start: line_num,
                end: line_num,
                properties: null
            };
        // if it's the end of the nested object / array, return
        } else if (_jdiff.lines[line_num].trim().endsWith("}") || _jdiff.lines[line_num].trim().endsWith("},") ||
            _jdiff.lines[line_num].trim().endsWith("]") || _jdiff.lines[line_num].trim().endsWith("],")) {
            line_mapping.end = line_num;
            return line_mapping;
        // first check to see if it's an array
        } else if (line_mapping.i !== null) {
            if (_jdiff.lines[line_num].trim().endsWith("{")) {
                line_mapping.properties[line_mapping.i] = mapLinestoJSON(line_num + 1);
                line_mapping.properties[line_mapping.i].start--;
                line_num = line_mapping.properties[line_mapping.i].end;
            } else if (_jdiff.lines[line_num].trim().endsWith("[")) {
                line_mapping.properties[line_mapping.i] = mapLinestoJSON(line_num + 1, 0);
                line_mapping.properties[line_mapping.i].start--;
                line_num = line_mapping.properties[line_mapping.i].end;
            } else {
                line_mapping.properties[line_mapping.i] = {
                    start: line_num,
                    end: line_num,
                    properties: null,
                    i: line_mapping.i
                };
            }
            if (line_mapping.i !== "root") {
                line_mapping.i++;
            }
        // otherwise, check to see if it's a property / nested object
        } else {
            let attr = "root";
            if (_jdiff.lines[line_num].trim().startsWith("\"")) {
                // regex - on a line, remove the first instance of a string between nonescaped quotes (attribute), then remove all escape characters.
                let attr_quoted = _jdiff.lines[line_num].trim().match(/"(?:[^"\\]|\\.)*"/)[0].replace(/\\"/g, '"');
                attr = attr_quoted.substring(1, attr_quoted.length - 1);
            }

            // nested object
            if (_jdiff.lines[line_num].trim().endsWith("{")) {
                line_mapping.properties[attr] = mapLinestoJSON(line_num + 1);
                line_mapping.properties[attr].start--;
                line_num = line_mapping.properties[attr].end;
            } else if (_jdiff.lines[line_num].trim().endsWith("[")) {
                line_mapping.properties[attr] = mapLinestoJSON(line_num + 1, 0);
                line_mapping.properties[attr].start--;
                line_num = line_mapping.properties[attr].end;
            } else {
                line_mapping.properties[attr] = {
                    start: line_num,
                    end: line_num,
                    properties: null
                };
            }
        }
    }

    return line_mapping;
}

// combines obj1 and obj2. The purpose of this function is so that there are enough lines on both sides 
// so that we can simply delete / modify some lines without having to insert new lines anywhere.
// NOTE: Intended to make line navigation easier. This is not a merge function.
export function combineWith(obj1, obj2, changes) {
    // there is no need to merge if the diff tool says they're equal
    if (changes.equal) {
        return obj2;
    }

    // comparing an object to an array
    if ((isPlainObject(obj1) && Array.isArray(obj2)) || (isPlainObject(obj2) && Array.isArray(obj1))) {
        _jdiff.leftEditor.setValue(JSON.stringify(obj1, null, 4));
        let lenA = _jdiff.leftEditor.session.doc.getAllLines().length;
        _jdiff.leftEditor.setValue(JSON.stringify(obj2, null, 4));
        let lenB = _jdiff.leftEditor.session.doc.getAllLines().length;

        if (lenA > lenB) {
            return obj1;
        } else {
            return obj2;
        }
    }

    if (typeof obj1 !== "object" && typeof obj2 !== "object") {
        // if they're both primitive types, then they both take up one line.
        return obj1 + "->" + obj2;
    } else if (typeof obj1 !== "object" || typeof obj2 !== "object") {
        // if one is an object and the other isn't, then the object will take up more lines.
        return typeof obj1 === "object" ? obj1 : obj2;
    } else if (Array.isArray(obj1) && Array.isArray(obj2)) {
        let newAdditions = {};
        let newDeletions = {};
        let newModifications = {};
        let inverseList = {};

        // if they were sorted by a key, just combine the two arrays, then sort by the key
        if (changes.key !== null) {
            for (let d in changes.deletions) {
                obj2.push(changes.deletions[d]);
            }
            
            obj2.sort(function(a, b) {
                if (a[changes.key] === b[changes.key]) {
                    return 0;
                } else {
                    return a[changes.key] < b[changes.key] ? -1 : 1;
                }
            });

            obj2.forEach(function (value, index) {
                inverseList[value[changes.key]] = index;
            });

            let obj1_inverseList = {};
            obj1.forEach(function (value, index) {
                obj1_inverseList[value[changes.key]] = index;
            });

            for (let a in changes.additions) {
                let obj = changes.additions[a];
                newAdditions[inverseList[obj[changes.key]]] = obj;
            }

            for (let d in changes.deletions) {
                let obj = changes.deletions[d];
                newDeletions[inverseList[obj[changes.key]]] = obj;
            }

            for (let m in changes.modifications.right) {
                let obj = changes.modifications.right[m];
                newModifications[inverseList[obj.keyValue]] = obj;
            }

            changes.deletions = newDeletions;
            changes.additions = newAdditions;
            changes.modifications.left = newModifications;
            changes.modifications.right = newModifications;

            for (let m in changes.modifications.right) {
                obj2[m] = combineWith(obj1[obj1_inverseList[changes.modifications.right[m].keyValue]], obj2[m], changes.modifications.right[m]);
            }

        } else {
            // otherwise, treat array as index-by-index comparison
            let arrIndices = [];
            for (let d in changes.deletions) {
                arrIndices.push(d);
            }
            arrIndices.sort();

            arrIndices.forEach(function(value, index) {
                obj2.push(changes.deletions[value]);
            });

            for (let m in changes.modifications.right) {
                obj2[m] = combineWith(obj1[m], obj2[m], changes.modifications.right[m]);
            }
        }

        // TODO: think of a way to display the difference between array elements when order is ignored AND no key is specified
        if (false) {
            // let deletePos = [];
            // let addPos = [];
            // let modPos = [];
            // let newAdditions = {};
            // let newDeletions = {};
            // let newModifications = {};
            
            // for (let d in changes.deletions) {
            //     deletePos.push(d);
            // }
            // deletePos.sort();

            // for (let a in changes.additions) {
            //     addPos.push(a);
            // }
            // addPos.sort();

            // for (let m in changes.modifications.right) {
            //     modPos.push(m);
            // }
            // modPos.sort();

            // // console.log(modPos);

            // let offset = 0;
            // let i = 0;
            // let j = 0;
            // let k = 0;

            // while (i < deletePos.length && j < addPos.length && k < modPos.length) {
            //     if (deletePos[i] <= addPos[j] && deletePos[i] <= modPos[k]) {
            //         // insert right in front
            //         obj2.splice(parseInt(deletePos[i]) + offset, 0, changes.deletions[deletePos[i]]);
            //         newDeletions[parseInt(deletePos[i]) + offset] = changes.deletions[deletePos[i]];
            //         offset++;

            //         // newAdditions[parseInt(addPos[j]) + offset] = changes.additions[addPos[j]];
            //         // newModifications[parseInt(modPos[k]) + offset] = changes.modifications.right[modPos[k]];

            //         i++;
            //     } else {
            //         if (deletePos[i] > addPos[j]) {
            //             newAdditions[parseInt(addPos[j]) + offset] = changes.additions[addPos[j]];
            //             j++;  
            //         }
            //         if (deletePos[i] > modPos[k]) {
            //             newModifications[parseInt(modPos[k]) + offset] = changes.modifications.right[modPos[k]];
            //             k++;
            //         }
            //     }
            // }

            // while (i < deletePos.length && j < addPos.length) {
            //     // try {
            //     //     console.log(JSON.stringify(newAdditions, null, 4));
            //     //     console.log(JSON.stringify(newDeletions, null, 4));
            //     //     console.log(i + "," + deletePos[i] + "," + changes.deletions[deletePos[i]].Name);
            //     //     console.log(j + "," + addPos[j] + "," + changes.additions[addPos[j]].Name);
            //     //     console.log(k + "," + modPos[k] + "," + changes.modifications.right[modPos[k]].Name);
            //     // } catch (e) {
        
            //     // }

            //     if (deletePos[i] <= addPos[j]) {
            //         // insert right in front
            //         obj2.splice(parseInt(deletePos[i]) + offset, 0, changes.deletions[deletePos[i]]);
            //         newDeletions[parseInt(deletePos[i]) + offset] = changes.deletions[deletePos[i]];
            //         offset++;
            //         // newAdditions[parseInt(addPos[j]) + offset] = changes.additions[addPos[j]];
            //         // console.log(addPos[j]);
            //         // console.log(parseInt(addPos[j]) + offset);
            //         // console.log(newAdditions[parseInt(addPos[j]) + offset]);

            //         i++;
            //     } else {
            //         if (deletePos[i] > addPos[j]) {
            //             newAdditions[parseInt(addPos[j]) + offset] = changes.additions[addPos[j]];
            //             j++;  
            //         }
            //     }

            // }

            // while (i < deletePos.length && k < modPos.length) {
            //     if (deletePos[i] <= modPos[k]) {
            //         // insert right in front
            //         obj2.splice(parseInt(deletePos[i]) + offset, 0, changes.deletions[deletePos[i]]);
            //         newDeletions[parseInt(deletePos[i]) + offset] = changes.deletions[deletePos[i]];
            //         offset++;

            //         // newModifications[parseInt(modPos[k]) + offset] = changes.modifications.right[modPos[k]];

            //         i++;
            //     } else {
            //         if (deletePos[i] > modPos[k]) {
            //             newModifications[parseInt(modPos[k]) + offset] = changes.modifications.right[modPos[k]];
            //             k++;
            //         }
            //     }
            // }

            // while (i < deletePos.length) {
            //     obj2.splice(parseInt(deletePos[i]) + offset, 0, changes.deletions[deletePos[i]]);
            //     newDeletions[parseInt(deletePos[i]) + offset] = changes.deletions[deletePos[i]];
            //     offset++;
            //     i++;
            // }

            // while (j < addPos.length) {
            //     newAdditions[parseInt(addPos[j]) + offset] = changes.additions[addPos[j]];
            //     j++;
            // }

            // while (k < modPos.length) {
            //     newModifications[parseInt(modPos[k]) + offset] = changes.modifications.right[modPos[k]];
            //     k++;
            // }

            // changes.deletions = newDeletions;
            // changes.additions = newAdditions;
            // changes.modifications.left = newModifications;
            // changes.modifications.right = newModifications;

            // console.log(changes);
        }

    } else {
        // It's an object, call recursively
        for (let i in obj1) {
            // if obj2 lacks the other property, add it
            if (!obj2.hasOwnProperty(i)) { 
                obj2[i] = obj1[i];
            } else {    
                // if they were equal, it's already on the left (i.e. no need to add it again)
                if (changes.modifications.left.hasOwnProperty(i)) {
                    obj2[i] = combineWith(obj1[i], obj2[i], changes.modifications.left[i]);
                }
            }
        }
    }
    return obj2;
}

// in _jdiff.leftEditor (the left editor), clear out all the additions from the ranges obtained in combineWith() and mark the modifications
export function clearLeft(changes, map) {
    let additions = changes.additions;
    let replacer = "";

    // additions should not be displayed on the left
    for (let a in additions) {
        replacer = "\n";
        // console.log(map.properties[a].start + "," + map.properties[a].end);
        for (let num = 0; num < map.properties[a].end - map.properties[a].start; num++) {
            replacer = replacer.concat("\n");
        }
        
        let range = new Range(map.properties[a].start, 0, map.properties[a].end + 1, 0);
        _jdiff.leftEditor.session.replace(range, replacer);

        let s = map.properties[a].start;
        let e = map.properties[a].end;

        let above = s - 1;
        let below = e + 1;

        while (isBlank(_jdiff.leftEditor.session.doc.getAllLines()[below])) {
            below++;
            if (below > _jdiff.leftEditor.session.doc.getAllLines().length - 1) {
                console.log("couldn't find a line below that isn't blank");
                break;
            }
        }

        if (_jdiff.leftEditor.session.doc.getAllLines()[below].trim().startsWith("}") || _jdiff.leftEditor.session.doc.getAllLines()[below].trim().startsWith("]")) {
            while (isBlank(_jdiff.leftEditor.session.doc.getAllLines()[above])) {
                above--;
                if (above < 0) {
                    console.log("couldn't find a line above that isn't blank");
                    break;
                }
            }

            // console.log(above + "," + _jdiff.leftEditor.session.doc.getAllLines()[above]);
            if (_jdiff.leftEditor.session.doc.getAllLines()[above].trim().endsWith(",")) {
                let comma_line = new Range(above, 0, above + 1, 0);
                let comma_removed = _jdiff.leftEditor.session.doc.getAllLines()[above].substring(0, _jdiff.leftEditor.session.doc.getAllLines()[above].lastIndexOf(","));
                comma_removed = comma_removed.concat("\n");
                _jdiff.leftEditor.session.replace(comma_line, comma_removed);
            }
        }
    }

    // hard coded case: if the fundamental types of the files differ (array vs object)
    if (typeof changes.modifications.left !== "object") {
        let l = _jdiff.leftEditor.session.doc.getAllLines()[map.start];
        let spacing = l.substring(0, l.indexOf("\""));
        let replacer = l.substring(0, l.search(/[^\s]/g));

        // REGEX: identify number of lines in object, 
        let objLines = changes.modifications.left.split(/\n/);
        let lineCount = objLines.length;

        for (let i = 0; i < lineCount; i++) {
            if (i !== 0) {
                objLines[i] = spacing.concat(objLines[i]);
            }
            replacer = replacer.concat(objLines[i]);
            if (i === lineCount - 1) {
                if (_jdiff.leftEditor.session.doc.getAllLines()[map.end].trim().endsWith(",")) {
                    replacer = replacer.concat(",");
                }
            }
            replacer = replacer.concat("\n");
        }

        let range = new Range(map.start, 0, map.end + 1, 0);
        // let length = map.properties[m].end - map.properties[m].start + 1;
        // console.log(map.properties[m].end - map.properties[m].start - lineCount);
        for (let num = 0; num < map.end - map.start - lineCount + 1; num++) {
            replacer = replacer.concat("\n");
        }
        _jdiff.leftEditor.session.replace(range, replacer);
        return;
    }

    for (let m in changes.modifications.left) {
        if (changes.modifications.left[m].isLeaf) {
            let temp = changes.modifications.left[m].modifications.left;
            try {
                temp = JSON.parse(temp);
            } catch (e) {
                temp = changes.modifications.left[m].modifications.left;
            }
            if (typeof temp !== "object") {
                let l = _jdiff.leftEditor.session.doc.getAllLines()[map.properties[m].start];
                let colonIndex = l.indexOf(l.match(/"(?:[^"\\]|\\.)*"/)[0]) + l.match(/"(?:[^"\\]|\\.)*"/)[0].length;
                replacer = l.charAt(colonIndex) === ":" ? l.substring(0, colonIndex + 2) : l.substring(0, l.indexOf(l.match(/"(?:[^"\\]|\\.)*"/)[0]));
                replacer = replacer.concat(changes.modifications.left[m].modifications.left);
                if (_jdiff.leftEditor.session.doc.getAllLines()[map.properties[m].end].trim().endsWith(",")) {
                    replacer = replacer.concat(",");
                }
                replacer = replacer.concat("\n");
                
                let range = new Range(map.properties[m].start, 0, map.properties[m].end + 1, 0);
                for (let num = 0; num < map.properties[m].end - map.properties[m].start; num++) {
                    replacer = replacer.concat("\n");
                }
                _jdiff.leftEditor.session.replace(range, replacer);
            } else {
                let l = _jdiff.leftEditor.session.doc.getAllLines()[map.properties[m].start];
                let spacing = l.substring(0, l.indexOf("\""));
                if (map.i !== null) {
                    replacer = l.substring(0, l.search(/[^\s]/g));
                } else {
                    replacer = l.substring(0, l.indexOf(l.match(/"(?:[^"\\]|\\.)*"/)[0]) + l.match(/"(?:[^"\\]|\\.)*"/)[0].length + 2);
                }
                
                // replacer = replacer.concat(changes.modifications.left[m].modifications.left);

                // REGEX: identify number of lines in object, 
                // WILL BREAK IF ESCAPED NEWLINES ARE PRESENT
                let objLines = changes.modifications.left[m].modifications.left.split(/\n/);
                let lineCount = objLines.length;

                for (let i = 0; i < lineCount; i++) {
                    if (i !== 0) {
                        objLines[i] = spacing.concat(objLines[i]);
                    }
                    replacer = replacer.concat(objLines[i]);
                    if (i === lineCount - 1) {
                        if (_jdiff.leftEditor.session.doc.getAllLines()[map.properties[m].end].trim().endsWith(",")) {
                            replacer = replacer.concat(",");
                        }
                    }
                    replacer = replacer.concat("\n");
                    // console.log(replacer);
                }

                let range = new Range(map.properties[m].start, 0, map.properties[m].end + 1, 0);
                // let length = map.properties[m].end - map.properties[m].start + 1;
                // console.log(map.properties[m].end - map.properties[m].start - lineCount);
                for (let num = 0; num < map.properties[m].end - map.properties[m].start - lineCount + 1; num++) {
                    replacer = replacer.concat("\n");
                }

                // replacer = replacer.concat("\n");

                _jdiff.leftEditor.session.replace(range, replacer);
            }
        } else {
            clearLeft(changes.modifications.left[m], map.properties[m]);
        }
    }
}

// identical to clearLeft(), but clears deletions for the right editor (_jdiff.rightEditor) instead.
export function clearRight(changes, map) {
    let deletions = changes.deletions;
    let replacer = "";

    // clear all deletions from the left
    for (let d in deletions) {
        replacer = "\n";
        for (let num = 0; num < map.properties[d].end - map.properties[d].start; num++) {
            replacer = replacer.concat("\n");
        }
        let range = new Range(map.properties[d].start, 0, map.properties[d].end + 1, 0);
        _jdiff.rightEditor.session.replace(range, replacer);

        let s = map.properties[d].start;
        let e = map.properties[d].end;

        let above = s - 1;
        let below = e + 1;

        while (isBlank(_jdiff.rightEditor.session.doc.getAllLines()[below])) {
            below++;
            if (below > _jdiff.rightEditor.session.doc.getAllLines().length - 1) {
                console.log("couldn't find a line below that isn't blank");
                break;
            }
        }
        
        if (_jdiff.rightEditor.session.doc.getAllLines()[below].trim().startsWith("}") || _jdiff.rightEditor.session.doc.getAllLines()[below].trim().startsWith("]")) {
            while (isBlank(_jdiff.rightEditor.session.doc.getAllLines()[above])) {
                above--;
                if (above < 0) {
                    console.log("couldn't find a line above that isn't blank");
                    break;
                }
            }

            // console.log(above + "," + _jdiff.rightEditor.session.doc.getAllLines()[above]);
            if (_jdiff.rightEditor.session.doc.getAllLines()[above].trim().endsWith(",")) {
                let comma_line = new Range(above, 0, above + 1, 0);
                let comma_removed = _jdiff.rightEditor.session.doc.getAllLines()[above].substring(0, _jdiff.rightEditor.session.doc.getAllLines()[above].lastIndexOf(","));
                comma_removed = comma_removed.concat("\n");
                _jdiff.rightEditor.session.replace(comma_line, comma_removed);
            }
        }
    }

    // hard coded case: if the fundamental types of the files differ (array vs object)
    if (typeof changes.modifications.right !== "object") {
        // _jdiff.rightEditor.setValue(changes.modifications.right);
        let l = _jdiff.rightEditor.session.doc.getAllLines()[map.start];
        let spacing = l.substring(0, l.indexOf("\""));
        let replacer = l.substring(0, l.search(/[^\s]/g));

        // REGEX: identify number of lines in object, 
        let objLines = changes.modifications.right.split(/\n/);
        let lineCount = objLines.length;

        for (let i = 0; i < lineCount; i++) {
            if (i !== 0) {
                objLines[i] = spacing.concat(objLines[i]);
            }
            replacer = replacer.concat(objLines[i]);
            if (i === lineCount - 1) {
                if (_jdiff.rightEditor.session.doc.getAllLines()[map.end].trim().endsWith(",")) {
                    replacer = replacer.concat(",");
                }
            }
            replacer = replacer.concat("\n");
        }

        let range = new Range(map.start, 0, map.end + 1, 0);
        // let length = map.properties[m].end - map.properties[m].start + 1;
        // console.log(map.end - map.start - lineCount);
        for (let num = 0; num < map.end - map.start - lineCount + 1; num++) {
            replacer = replacer.concat("\n");
        }
        _jdiff.rightEditor.session.replace(range, replacer);
        return;
    }

    for (let m in changes.modifications.right) {
        if (changes.modifications.right[m].isLeaf) {
            let temp = changes.modifications.right[m].modifications.right;
            try {
                temp = JSON.parse(temp);
            } catch (e) {
                temp = changes.modifications.right[m].modifications.right;
            }
            if (typeof temp !== "object") {
                let l = _jdiff.rightEditor.session.doc.getAllLines()[map.properties[m].start];
                let colonIndex = l.indexOf(l.match(/"(?:[^"\\]|\\.)*"/)[0]) + l.match(/"(?:[^"\\]|\\.)*"/)[0].length;
                replacer = l.charAt(colonIndex) === ":" ? l.substring(0, colonIndex + 2) : l.substring(0, l.indexOf(l.match(/"(?:[^"\\]|\\.)*"/)[0]));
                replacer = replacer.concat(changes.modifications.right[m].modifications.right);
                if (_jdiff.rightEditor.session.doc.getAllLines()[map.properties[m].end].trim().endsWith(",")) {
                    replacer = replacer.concat(",");
                }
                replacer = replacer.concat("\n");
                let range = new Range(map.properties[m].start, 0, map.properties[m].end + 1, 0);
                for (let num = 0; num < map.properties[m].end - map.properties[m].start; num++) {
                    replacer = replacer.concat("\n");
                }
                _jdiff.rightEditor.session.replace(range, replacer);
            } else {
                let l = _jdiff.rightEditor.session.doc.getAllLines()[map.properties[m].start];
                let spacing = l.substring(0, l.indexOf("\""));
                if (map.i !== null) {
                    replacer = l.substring(0, l.search(/[^\s]/g));
                } else {
                    replacer = l.substring(0, l.indexOf(l.match(/"(?:[^"\\]|\\.)*"/)[0]) + l.match(/"(?:[^"\\]|\\.)*"/)[0].length + 2);
                }
                // replacer = replacer.concat(changes.modifications.left[m].modifications.left);

                // REGEX: identify number of lines in object, 
                let objLines = changes.modifications.right[m].modifications.right.split(/\n/);
                let lineCount = objLines.length;

                for (let i = 0; i < lineCount; i++) {
                    if (i !== 0) {
                        objLines[i] = spacing.concat(objLines[i]);
                    }
                    replacer = replacer.concat(objLines[i]);
                    if (i === lineCount - 1) {
                        if (_jdiff.rightEditor.session.doc.getAllLines()[map.properties[m].end].trim().endsWith(",")) {
                            replacer = replacer.concat(",");
                        }
                    }
                    replacer = replacer.concat("\n");
                }

                let range = new Range(map.properties[m].start, 0, map.properties[m].end + 1, 0);
                // let length = map.properties[m].end - map.properties[m].start + 1;
                // console.log(map.properties[m].end - map.properties[m].start - lineCount);
                for (let num = 0; num < map.properties[m].end - map.properties[m].start - lineCount + 1; num++) {
                    replacer = replacer.concat("\n");
                }

                // replacer = replacer.concat("\n");

                _jdiff.rightEditor.session.replace(range, replacer);
            }
        } else {
            clearRight(changes.modifications.right[m], map.properties[m]);
        }
    }
}

// helper recursive function for markDiffs(), marks all changes on both editors
export function markDiffsHelper(changes, map) {
    let additions = changes.additions;
    let deletions = changes.deletions;
    let modifications = changes.modifications;

    let ranges = {
        markerRanges: [],
        collapseRanges: []
    };

    // console.log(changes);
    // console.log(map);

    if (changes.equal || changes.ignoredEquals) {
        // console.log("folded at " + map.start);
        ranges.collapseRanges[map.start] = true;
        ranges.collapseRanges.push([map.start, map.end]);
    } else {
        for (let i in map.properties) {
            if (additions.hasOwnProperty(i) || deletions.hasOwnProperty(i) || modifications.left.hasOwnProperty(i)) {
                if (config.IGNORE_ATTR.hasOwnProperty(i)) {
                    // ranges.collapseRanges[map.properties[i].start] = true;
                    ranges.collapseRanges.push([map.properties[i].start, map.properties[i].end]);
                }
            } else {
                // ranges.collapseRanges[map.properties[i].start] = true;
                ranges.collapseRanges.push([map.properties[i].start, map.properties[i].end]);
            }
        }
    }

    // mark all lines that have been deleted
    for (let d in deletions) {
        if (config.IGNORE_ATTR.hasOwnProperty(d)) {
            continue;
        }

        let range = new Range(map.properties[d].start, 0, map.properties[d].end, 1);
        range.start = _jdiff.leftEditor.session.doc.createAnchor(range.start);
        range.end = _jdiff.leftEditor.session.doc.createAnchor(range.end);
        _jdiff.leftEditor.session.addMarker(range, "deletion", "fullLine");
        // console.log(range);
        // console.log(range.start);
        // console.log(range.end);
        ranges.markerRanges.push([map.properties[d].start, map.properties[d].end]);

        // the other side might contain blank lines, which act strangely when you try to mark them
        // there's a special case for marking only one blank line captured in the if statement below
        if (map.properties[d].start === map.properties[d].end) {
            let alt_range = new Range(map.properties[d].start, 0, map.properties[d].end, 1);

            if (_jdiff.rightEditor.session.doc.getAllLines()[map.properties[d].start] === "") {
                _jdiff.rightEditor.session.replace(alt_range, " ");
            }

            alt_range.start = _jdiff.rightEditor.session.doc.createAnchor(alt_range.start);
            alt_range.end = _jdiff.rightEditor.session.doc.createAnchor(alt_range.end);
            _jdiff.rightEditor.session.addMarker(alt_range, "deletion", "fullLine");
        } else {
            let alt_range = new Range(map.properties[d].start, 0, map.properties[d].end, 1);
            alt_range.start = _jdiff.rightEditor.session.doc.createAnchor(alt_range.start);
            alt_range.end = _jdiff.rightEditor.session.doc.createAnchor(alt_range.end);
            _jdiff.rightEditor.session.addMarker(alt_range, "deletion", "fullLine");
        }
    }

    // mark all lines that have been added
    for (let a in additions) {
        if (config.IGNORE_ATTR.hasOwnProperty(a)) {
            continue;
        }

        let range = new Range(map.properties[a].start, 0, map.properties[a].end, 1);
        range.start = _jdiff.rightEditor.session.doc.createAnchor(range.start);
        range.end = _jdiff.rightEditor.session.doc.createAnchor(range.end);
        _jdiff.rightEditor.session.addMarker(range, "addition", "fullLine");
        ranges.markerRanges.push([map.properties[a].start, map.properties[a].end]);

        // the other side might contain blank lines, which act strangely when you try to mark them
        // there's a special case for marking only one blank line captured in the if statement below
        if (map.properties[a].start === map.properties[a].end) {
            let alt_range = new Range(map.properties[a].start, 0, map.properties[a].end, 1);

            if (_jdiff.leftEditor.session.doc.getAllLines()[map.properties[a].start] === "") {
                _jdiff.leftEditor.session.replace(alt_range, " ");
            }

            alt_range.start = _jdiff.leftEditor.session.doc.createAnchor(alt_range.start);
            alt_range.end = _jdiff.leftEditor.session.doc.createAnchor(alt_range.end);
            _jdiff.leftEditor.session.addMarker(alt_range, "addition", "fullLine");
        } else {
            let alt_range = new Range(map.properties[a].start, 0, map.properties[a].end, 1);
            alt_range.start = _jdiff.leftEditor.session.doc.createAnchor(alt_range.start);
            alt_range.end = _jdiff.leftEditor.session.doc.createAnchor(alt_range.end);
            _jdiff.leftEditor.session.addMarker(alt_range, "addition", "fullLine");
        }
    }

    // hard coded case: if the fundamental types of the files differ (array vs object)
    if (typeof changes.modifications.left !== "object") {
        let rangeA = new Range(map.start, 0, map.end, 1);
        rangeA.start = _jdiff.leftEditor.session.doc.createAnchor(rangeA.start);
        rangeA.end = _jdiff.leftEditor.session.doc.createAnchor(rangeA.end);
        _jdiff.leftEditor.session.addMarker(rangeA, "modification", "fullLine");

        let rangeB = new Range(map.start, 0, map.end, 1);
        rangeB.start = _jdiff.rightEditor.session.doc.createAnchor(rangeB.start);
        rangeB.end = _jdiff.rightEditor.session.doc.createAnchor(rangeB.end);
        _jdiff.rightEditor.session.addMarker(rangeB, "modification", "fullLine");

        ranges.markerRanges.push([map.start, map.end]);
        return ranges;
    }

    // marks modifications on both sides
    for (let m in changes.modifications.left) {
        if (config.IGNORE_ATTR.hasOwnProperty(m)) {
            continue;
        }

        if (changes.modifications.left[m].isLeaf) {
            let rangeA = new Range(map.properties[m].start, 0, map.properties[m].end, 1);
            rangeA.start = _jdiff.leftEditor.session.doc.createAnchor(rangeA.start);
            rangeA.end = _jdiff.leftEditor.session.doc.createAnchor(rangeA.end);
            _jdiff.leftEditor.session.addMarker(rangeA, "modification", "fullLine");

            let rangeB = new Range(map.properties[m].start, 0, map.properties[m].end, 1);
            rangeB.start = _jdiff.rightEditor.session.doc.createAnchor(rangeB.start);
            rangeB.end = _jdiff.rightEditor.session.doc.createAnchor(rangeB.end);
            _jdiff.rightEditor.session.addMarker(rangeB, "modification", "fullLine");

            ranges.markerRanges.push([map.properties[m].start, map.properties[m].end]);
        } else {
            let temp = markDiffsHelper(changes.modifications.left[m], map.properties[m]);
            ranges.markerRanges = ranges.markerRanges.concat(temp.markerRanges);
            // ranges.collapseRanges = ranges.collapseRanges.concat(temp.collapseRanges);
            // console.log(temp);
            // ranges.collapseRanges = { ...ranges.collapseRanges, ...temp.collapseRanges};
            ranges.collapseRanges = ranges.collapseRanges.concat(temp.collapseRanges);
        }
    }

    return ranges;
}

// marks all the differences on both sides
export function markDiffs(changes, mapping) {
    let ranges = markDiffsHelper(changes, mapping);
    // let markerRanges = markDiffsHelper(changes, mapping).markerRanges;
    ranges.markerRanges.sort(function(a, b) {
        return a[0] > b[0] ? 1 : -1;
    });
    return ranges;
}

// helper function to determine if an input string is blank / just whitespace
function isBlank(str) {
    return str.replace(/\s/g, "") === "";
}

// toggles folded code at any given row
export function foldAt(start, end) {
    // regex: get the index of the first non whitespace character on a line (how many spaces before text)
    _jdiff.enable = false;
    _jdiff.leftEditor.session.addFold("...", new Range(start, _jdiff.leftEditor.session.doc.getAllLines()[start].length, end, _jdiff.leftEditor.session.doc.getAllLines()[end].search(/[^\s]/g)));
    _jdiff.rightEditor.session.addFold("...", new Range(start, _jdiff.rightEditor.session.doc.getAllLines()[start].length, end, _jdiff.rightEditor.session.doc.getAllLines()[end].search(/[^\s]/g)));
    _jdiff.enable = true;
}

export function hideLines(start, end) {
    _jdiff.enable = false;
    _jdiff.leftEditor.session.addFold("...", new Range(start, 0, end, _jdiff.leftEditor.session.doc.getAllLines()[end].length));
    _jdiff.rightEditor.session.addFold("...", new Range(start, 0, end, _jdiff.rightEditor.session.doc.getAllLines()[end].length));
    _jdiff.enable = true;
}

// NAVIGATION / MERGE FUNCTIONS
// functions that handle navigating from one change to another and merging changes.
export function nextRange() {
    if (++_jdiff.currentIndex > _jdiff.ranges.markerRanges.length - 1) {
        _jdiff.currentIndex = 0;
    }

    // update the markerRanges
    _jdiff.currentRange.start.row = _jdiff.ranges.markerRanges[_jdiff.currentIndex][0];
    _jdiff.currentRange.end.row = _jdiff.ranges.markerRanges[_jdiff.currentIndex][1];

    // update editor screen and set position
    _jdiff.leftEditor.renderer.updateFrontMarkers();
    _jdiff.rightEditor.renderer.updateFrontMarkers();
    if (_jdiff.currentRange.start.row <= _jdiff.leftEditor.renderer.getFirstVisibleRow() || _jdiff.currentRange.start.row >= _jdiff.leftEditor.renderer.getLastVisibleRow()) {
        _jdiff.leftEditor.renderer.alignCursor(_jdiff.currentRange.start.row, 0.1);
        _jdiff.rightEditor.renderer.alignCursor(_jdiff.currentRange.start.row, 0.1);
    }
}

export function prevRange() {
    if (--_jdiff.currentIndex < 0) {
        _jdiff.currentIndex = _jdiff.ranges.markerRanges.length - 1;
    }

    // update the markerRanges
    _jdiff.currentRange.start.row = _jdiff.ranges.markerRanges[_jdiff.currentIndex][0];
    _jdiff.currentRange.end.row = _jdiff.ranges.markerRanges[_jdiff.currentIndex][1];

    // update editor screen and set position
    _jdiff.leftEditor.renderer.updateFrontMarkers();
    _jdiff.rightEditor.renderer.updateFrontMarkers();

    if (_jdiff.currentRange.start.row <= _jdiff.leftEditor.renderer.getFirstVisibleRow() || _jdiff.currentRange.start.row >= _jdiff.leftEditor.renderer.getLastVisibleRow()) {
        _jdiff.leftEditor.renderer.alignCursor(_jdiff.currentRange.start.row, 0.1);
        _jdiff.rightEditor.renderer.alignCursor(_jdiff.currentRange.start.row, 0.1);
    }
}

export function jumpTo(row) {
    // first, find if the inputted row corresponds to a range in markerRanges[]
    // for now, take the slowest approach (linear search)
    if (_jdiff.ranges.markerRanges.length == 0) {
        return;
    }

    _jdiff.ranges.markerRanges.forEach(function(value, index){
        if (row >= value[0] && row <= value[1]) {
            _jdiff.currentIndex = index;
        }
    });

    // update the markerRanges
    _jdiff.currentRange.start.row = _jdiff.ranges.markerRanges[_jdiff.currentIndex][0];
    _jdiff.currentRange.end.row = _jdiff.ranges.markerRanges[_jdiff.currentIndex][1];

    // update editor screen and set position
    _jdiff.leftEditor.renderer.updateFrontMarkers();
    _jdiff.rightEditor.renderer.updateFrontMarkers();

    // _jdiff.leftEditor.renderer.alignCursor(changes.currentRange.start.row, 0.1);
    // _jdiff.rightEditor.renderer.alignCursor(changes.currentRange.start.row, 0.1);
}

export function clickJump(e) {
    jumpTo(e.getDocumentPosition().row);
}

export function synchronizeScrollA(scroll) {
    _jdiff.rightEditor.getSession().setScrollTop(parseInt(scroll) || 0);
}

export function synchronizeScrollB(scroll) {
    _jdiff.leftEditor.getSession().setScrollTop(parseInt(scroll) || 0)
}

export function synchronizeFoldA(e) {
    if (_jdiff.enable) {
        _jdiff.enable = false;

        // if there's a widget on the other side, fold it
        // e.action tells us whether something is expanding or collapsing
        if (_jdiff.rightEditor.session.foldWidgets[e.data.start.row] === "start") {
            _jdiff.rightEditor.session.$toggleFoldWidget(e.data.start.row, {});
        } else if (e.action === "add") {
            // console.log("contract"); 
            _jdiff.rightEditor.session.addFold("", new Range(e.data.start.row, 0, e.data.end.row, 0));
        } else if (e.action === "remove") {
            // console.log("expand");
            _jdiff.rightEditor.session.unfold(new Range(e.data.start.row, 0, e.data.end.row, 0), true);
        }
        // else, fail silently

        _jdiff.enable = true;
    }
    // console.log(_jdiff.leftEditor.getCursorPosition());
    // console.log(_jdiff.rightEditor.getCursorPosition());
}

export function synchronizeFoldB(e) {
    if (_jdiff.enable) {
        _jdiff.enable = false;

        // if there's a widget on the other side, fold it
        // e.action tells us whether something is expanding or collapsing
        if (_jdiff.leftEditor.session.foldWidgets[e.data.start.row] === "start") {
            _jdiff.leftEditor.session.$toggleFoldWidget(e.data.start.row, {});
        } else if (e.action === "add") {
            _jdiff.leftEditor.session.addFold("", new Range(e.data.start.row, 0, e.data.end.row, 0));
        } else if (e.action === "remove") {
            _jdiff.leftEditor.session.unfold(new Range(e.data.start.row, 0, e.data.end.row, 0), true);
        }
        // else, fail silently

        _jdiff.enable = true;
    }
}


