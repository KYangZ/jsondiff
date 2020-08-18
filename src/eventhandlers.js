// EVENT HANDLERS
import { config, Range, _jdiff } from "./config.js";
import { commaHandler } from "./frontend.js";
import { exportJSON } from "./comparison.js";

// functions to be passed into event listeners
export function loadFileA() { 
    let f = new FileReader(); 
    f.onload = function() { 
        try {
            _jdiff.JSON_A = JSON.parse(f.result);
            document.getElementById("statusA").innerHTML = "";
            _jdiff.isValidJSON = true;
        } catch (e) {
            _jdiff.isValidJSON = false;
            document.getElementById("statusA").innerHTML = "<p style=\"color: red;\">invalid JSON</p>";
            // console.log("input is invalid JSON");
        }
    }    
    f.readAsText(this.files[0]);
    _jdiff.JSON_A_NAME = this.files[0].name;
}

export function loadFileB() { 
    let f = new FileReader(); 
    f.onload = function() { 
        try {
            _jdiff.JSON_B = JSON.parse(f.result);
            document.getElementById("statusB").innerHTML = "";
            _jdiff.isValidJSON = true;
        } catch (e) {
            _jdiff.isValidJSON = false;
            document.getElementById("statusB").innerHTML = "<p style=\"color: red;\">invalid JSON</p>";
            // console.log("input is invalid JSON");
        }
    }    
    f.readAsText(this.files[0]); 
    _jdiff.JSON_B_NAME = this.files[0].name;
}



export function ignoreListAdd(newAttr) {
    if (newAttr.length > 0 && !config.IGNORE_ATTR.hasOwnProperty(newAttr) && typeof newAttr === "string") {
        config.IGNORE_ATTR[newAttr] = true;
        let li = document.createElement("li");
        li.innerHTML = newAttr + "<span class=\"close\">x</span>";
        document.getElementById("ignoreList").appendChild(li);
    
        // create event listener for the new close button
        let closeButtons = li.getElementsByClassName("close");
        for (let i = 0; i < closeButtons.length; i++) {
            closeButtons[i].addEventListener("click", function() {
                this.parentElement.style.display = 'none';
                delete config.IGNORE_ATTR[newAttr];
            });
        }
        return true;
    }
    return false;
}

export function embedListAdd(newAttr) {
    if (newAttr.length > 0 && !config.EMBEDDED_JSON_ATTR.hasOwnProperty(newAttr) && typeof newAttr === "string") {
        config.EMBEDDED_JSON_ATTR[newAttr] = true;
        let li = document.createElement("li");
        li.innerHTML = newAttr + "<span class=\"close\">x</span>";
        document.getElementById("embedList").appendChild(li);

        // create event listener for the new close button
        let closeButtons = li.getElementsByClassName("close");
        for (let i = 0; i < closeButtons.length; i++) {
            closeButtons[i].addEventListener("click", function() {
                this.parentElement.style.display = 'none';
                delete config.EMBEDDED_JSON_ATTR[newAttr];
            });
        } 
        return true;
    }
    return false;
}

export function sortKeyAdd(newAttr) {
    if (newAttr.length > 0 && !config.SORTING_KEYS.includes(newAttr) && typeof newAttr === "string") {
        config.SORTING_KEYS.push(newAttr);
        let li = document.createElement("li");
        li.innerHTML = newAttr + "<span class=\"close\">x</span>";
        document.getElementById("keyList").appendChild(li);

        // create event listener for the new close button
        let closeButtons = li.getElementsByClassName("close");
        for (let i = 0; i < closeButtons.length; i++) {
            closeButtons[i].addEventListener("click", function() {
                this.parentElement.style.display = 'none';
                config.SORTING_KEYS.splice(config.SORTING_KEYS.indexOf(newAttr), 1);
            });
        } 
        return true;
    }
    return false;
}

export function undoLastMerge() {
    // in diff mode or in edit mode?
    // if both editors are read-only, we're in diff mode
    if (_jdiff.leftEditor.getReadOnly() && _jdiff.rightEditor.getReadOnly() && _jdiff.lastMerge.range !== null) {
        // find the last change made and reverse it
        let undoRange = _jdiff.lastMerge.range;
        let replacerText = _jdiff.lastMerge.original;
        delete _jdiff.mergedRanges[undoRange.start.row];

        if (_jdiff.lastMerge.editor === "left") {
            replacerText = commaHandler(undoRange.start.row, undoRange.end.row - 1, replacerText, _jdiff.leftEditor);
            _jdiff.leftEditor.session.replace(undoRange, replacerText);
            _jdiff.leftEditor.session.addMarker(new Range(undoRange.start.row, 0, undoRange.end.row - 1, 1), _jdiff.lastMerge.changeType, "fullLine");
            _jdiff.leftEditor.session.removeMarker(_jdiff.lastMerge.mergeMarkerID);
            _jdiff.leftEditor.renderer.alignCursor(_jdiff.leftEditor.renderer.getFirstVisibleRow(), 0.0);
            _jdiff.rightEditor.renderer.alignCursor(_jdiff.leftEditor.renderer.getFirstVisibleRow(), 0.0);
        } else if (_jdiff.lastMerge.editor === "right") {
            replacerText = commaHandler(undoRange.start.row, undoRange.end.row - 1, replacerText, _jdiff.rightEditor);
            _jdiff.rightEditor.session.replace(undoRange, replacerText);
            _jdiff.rightEditor.session.addMarker(new Range(undoRange.start.row, 0, undoRange.end.row - 1, 1), _jdiff.lastMerge.changeType, "fullLine");
            _jdiff.rightEditor.session.removeMarker(_jdiff.lastMerge.mergeMarkerID);
            _jdiff.leftEditor.renderer.alignCursor(_jdiff.rightEditor.renderer.getFirstVisibleRow(), 0.0);
            _jdiff.rightEditor.renderer.alignCursor(_jdiff.rightEditor.renderer.getFirstVisibleRow(), 0.0);
        }

        // if the editor is "null", that means there is no change to undo

        // set back to defaults - only allow one undo max
        _jdiff.lastMerge.range = null;
        _jdiff.lastMerge.editor = null;
        _jdiff.lastMerge.changeType = null;
        _jdiff.lastMerge.mergeMarkerID = null;
    }
}

export function exportLeft() {
    let stringResult;
    try {
        stringResult = JSON.stringify(exportJSON(JSON.parse(_jdiff.leftEditor.getValue())), null, 4);
        
        // presents the data in a downloaded .txt format
        let temp = document.createElement('a');
        temp.href = 'data:attachment/text,' + encodeURI(stringResult);
        temp.target = '_blank';
        temp.download = _jdiff.JSON_A_NAME;
        temp.click();
        // console.log(stringResult);
    } catch (e) {
        console.log("error parsing JSON");
    }
}

export function exportRight() {
    let stringResult;
    try {
        stringResult = JSON.stringify(exportJSON(JSON.parse(_jdiff.rightEditor.getValue())), null, 4);

        // presents the data in a downloaded .txt format
        let temp = document.createElement('a');
        temp.href = 'data:attachment/text,' + encodeURI(stringResult);
        temp.target = '_blank';
        temp.download = _jdiff.JSON_B_NAME;
        temp.click();
        // console.log(stringResult);
    } catch (e) {
        console.log("error parsing JSON");
    }
}