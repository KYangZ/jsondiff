// CONFIG.JS
export let config = {
    IGNORE_ATTR: {},
    EMBEDDED_JSON_ATTR: {},
    SORTING_KEYS: [],
    IGNORE_ARRAY_ORDER: false,
    FOLD_UNMARKED_SECTIONS: true,
    ONE_WAY_DIFF: false
}

export let CL_PORTAL_CONFIG = {
    ignore: ["Id", "url"],
    embed: ["clcommon__Actor_Definition__c", "clcommon__data__c", "clcommon__Branding__c", "clcommon__Content__c"],
    sortKeys: ["Name", "clcommon__Actor_name__c"],
    ignoreArrayOrder: false,
    collapseSimilar: true,
    oneWay: true
}

// the default JSON text inputs that are present when the site loads
const demo1 = {
    "How to Read Changes": {
        "Deletions": "are marked in RED",
        "Modifications": "are marked in YELLOW",
        "Same Attributes": "aren't marked at all"
    },
    "Merging": {
        "UP/DOWN ARROW KEYS": "Move from one change to another",
        "Merge Changes from Right to Left": "LEFT arrow key",
        "Merge Changes from Left to Right": "RIGHT arrow key",
        "Try it and you'll see": "that the merges are marked in BLUE"
    },
    "Settings (Left Sidebar)": {
        "Ignore": {
            "a": {
                "alt": 0,
                "apple": true,
                "anger": false
            },
            "b": 6,
        },
        "Expand": "{\"month\":\"7\",\"num\":2339,\"link\":\"\",\"year\":\"2020\",\"news\":\"\",\"safe_title\":\"Pods vs Bubbles\",\"transcript\":\"\",\"alt\":\"Canada's travel restrictions on the US are 99% about keeping out COVID and 1% about keeping out people who say 'pod.'\",\"img\":\"https://imgs.xkcd.com/comics/pods_vs_bubbles.png\",\"title\":\"Pods vs Bubbles\",\"day\":\"29\"}",
        "Keys": [
            {
                "ID": "A",
                "data": "this is the first element A"
            },
            {
                "ID": "B",
                "data": "this is the second element B"
            },
            {
                "ID": "C",
                "data": "this is the third element C"
            }
        ]
    }
};

const demo2 = {
    "How to Read Changes": {
        "Additions": "are marked in GREEN",
        "Modifications": "are marked as YELLOW",
        "Same Attributes": "aren't marked at all"
    },
    "Merging": {
        "UP/DOWN ARROW KEYS": "Or click on any highlighted area",
        "Merge Changes from Right to Left": "LEFT arrow key",
        "Merge Changes from Left to Right": "RIGHT arrow key",
        "Try it and you'll see": "that the changes are marked in BLUE"
    },
    "Settings (Left Sidebar)": {
        "Ignore": {
            "b": "6",
            "c": [
                "Bulbasaur",
                "Charmander",
                "Squirtle"
            ]
        },
        "Expand": "{\"month\":\"3\",\"num\":1024,\"link\":\"\",\"year\":\"2012\",\"news\":\"\",\"safe_title\":\"Error Code\",\"transcript\":\"[[A man sits at a computer, while another man takes a book off a shelf behind him.]]\\nMan #1: \\\"Error -41\\\"? That's helpful. It doesn't even say which program it's from!\\nMan #2: -41? I'll look it up...\\n\\n[[The second man looks at the book.]]\\nMan #2: It says -41 is: \\\"Sit by a lake.\\\" \\n\\n[[The two walk.]]\\n\\n[[The two sit down.]]\\n\\n[[A large, in-color painting of a lake with pond lilies.]]\\n\\n[[The two are still sitting.]]\\nMan #1: I don't know where you got that book, but I like it.\\nMan #2: Hasn't been wrong yet.\\n\\n{{Title text: It has a section on motherboard beep codes that lists, for each beep pattern, a song that syncs up well with it.}}\",\"alt\":\"It has a section on motherboard beep codes that lists, for each beep pattern, a song that syncs up well with it.\",\"img\":\"https://imgs.xkcd.com/comics/error_code.png\",\"title\":\"Error Code\",\"day\":\"2\"}",
        "Keys": [
            {
                "ID": "C",
                "data": "this is the third element C, which was changed"
            },
            {
                "ID": "A",
                "data": "this is the first element A"
            }
        ]
    }
};

export let Range = ace.require('ace/range').Range;

/**
 * Variables used across different files of the diff tool. Best left untouched, even though it is exposed.
 */
export let _jdiff = {
    leftEditor: {},
    rightEditor: {},
    lines: [],
    ranges: {},
    mergedRanges: {},
    mergeMarkerIDs: [],
    range: null,
    editor: null,
    changeType: null,
    mergeMarkerID: null,
    currentIndex: null,
    currentRange: null,
    currentLeft: null,
    currentRight: null,
    isValidJSON: true,
    enable: true,
    JSON_A: demo1,
    JSON_B: demo2,
    JSON_A_NAME: "File 1",
    JSON_B_NAME: "File 2",
    lastMerge: {
        range: null,
        editor: null,
        changeType: null,
        mergeMarkerID: null
    }
}