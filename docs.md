<a name="module_jsondiff"></a>

## jsondiff
The global variable jsondiff becomes available when jsondiff.js is imported into your project. Then call jsondiff.init(elemID) to initialize the tool.


* [jsondiff](#module_jsondiff)
    * [._jdiff](#module_jsondiff._jdiff)
    * [.CL_PORTAL_CONFIG](#module_jsondiff.CL_PORTAL_CONFIG)
    * [.init(elemID)](#module_jsondiff.init)
    * [.setOptions(options)](#module_jsondiff.setOptions)
    * [.resetConfig()](#module_jsondiff.resetConfig)
    * [.setLeft(json, type, metadata, callback)](#module_jsondiff.setLeft) ⇒
    * [.setRight(json, type, metadata, callback)](#module_jsondiff.setRight) ⇒
    * [.discardChanges()](#module_jsondiff.discardChanges) ⇒
    * [.runDiff(json_string_a, json_string_b)](#module_jsondiff.runDiff) ⇒
    * [.rerunDiff()](#module_jsondiff.rerunDiff) ⇒
    * [.exportLeft(prettyPrint)](#module_jsondiff.exportLeft) ⇒
    * [.exportRight(prettyPrint)](#module_jsondiff.exportRight) ⇒
    * [.expandAll()](#module_jsondiff.expandAll)
    * [.foldUnmarkedSections()](#module_jsondiff.foldUnmarkedSections)
    * [.hideSameLines()](#module_jsondiff.hideSameLines)
    * [.setOneWayDiff(isOneWay)](#module_jsondiff.setOneWayDiff) ⇒
    * [.addIgnoredAttr(ignoreAttr)](#module_jsondiff.addIgnoredAttr) ⇒
    * [.addEmbeddedAttr(embedAttr)](#module_jsondiff.addEmbeddedAttr) ⇒
    * [.addSortingKeys(keyAttr)](#module_jsondiff.addSortingKeys) ⇒
    * [.removeIgnoredAttr(prop)](#module_jsondiff.removeIgnoredAttr) ⇒
    * [.removeEmbeddedAttr(prop)](#module_jsondiff.removeEmbeddedAttr) ⇒
    * [.removeSortingKey(prop)](#module_jsondiff.removeSortingKey) ⇒
    * [.getIgnoredAttr()](#module_jsondiff.getIgnoredAttr)
    * [.getEmbeddedAttr()](#module_jsondiff.getEmbeddedAttr)
    * [.getSortingKeys()](#module_jsondiff.getSortingKeys)
    * [.hideSidebar()](#module_jsondiff.hideSidebar)
    * [.showSidebar()](#module_jsondiff.showSidebar)
    * [.hideTopbar()](#module_jsondiff.hideTopbar)
    * [.showTopbar()](#module_jsondiff.showTopbar)
    * [.disableMerging()](#module_jsondiff.disableMerging)
    * [.enableMerging()](#module_jsondiff.enableMerging)

<a name="module_jsondiff._jdiff"></a>

### jsondiff.\_jdiff
Various internal variables used in the jsondiff tool. Any undocumented properties of _jdiff should be left untouched, to avoid undefined behavior.

**Kind**: static property of [<code>jsondiff</code>](#module_jsondiff)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| leftEditor | <code>Object</code> | The left editor in the diff tool. For usage details, check Ace Editor's documentation of Editor. |
| rightEditor | <code>Object</code> | The right editor in the diff tool. For usage details, check Ace Editor's documentation of Editor. |

<a name="module_jsondiff.CL_PORTAL_CONFIG"></a>

### jsondiff.CL\_PORTAL\_CONFIG
A preset configuration that can be passed in via jsondiff.setOptions(CL_PORTAL_CONFIG).

**Kind**: static property of [<code>jsondiff</code>](#module_jsondiff)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| ignore | <code>Array</code> | ["Id", "url"] |
| embed | <code>Array</code> | ["clcommon__Actor_Definition__c", "clcommon__data__c", "clcommon__Branding__c", "clcommon__Content__c"] |
| sortKeys | <code>Array</code> | ["Name", "clcommon__Actor_name__c"] |
| ignoreArrayOrder | <code>Boolean</code> | false |
| collapseSimilar | <code>Boolean</code> | true |
| oneWay | <code>Boolean</code> | true |

<a name="module_jsondiff.init"></a>

### jsondiff.init(elemID)
Initializes one instance of the json diff tool.
Attempting to call this function again (whether elemID is the same or not) results in undefined behavior.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  

| Param | Type | Description |
| --- | --- | --- |
| elemID | <code>String</code> | where the diff tool should be placed in a webpage, in the form of the ID of an html element. |

<a name="module_jsondiff.setOptions"></a>

### jsondiff.setOptions(options)
Allows the user to set up configurations by passing them in through an object.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | an object containing various properties that correspond to config settings (see the function body for names) |
| options.ignore | <code>Array</code> | an array of properties to add to config.IGNORE_ATTR |
| options.embed | <code>Array</code> | an array of properties to add to config.EMBEDDED_JSON_ATTR |
| options.sortKeys | <code>Array</code> | an array of properties to add to config.SORTING_KEYS |
| options.ignoreArrayOrder | <code>Boolean</code> | sets config.IGNORE_ARRAY_ORDER |
| options.oneWayDiff | <code>Boolean</code> | set config.ONE_WAY_DIFF |

<a name="module_jsondiff.resetConfig"></a>

### jsondiff.resetConfig()
Resets all configurations to their default values.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.setLeft"></a>

### jsondiff.setLeft(json, type, metadata, callback) ⇒
Sets the first file to run in the diff tool. Corresponds to the left editor on the interface.
Accepts JSON strings, JSON objects, or urls that lead to json data.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: returns true if the input JSON is valid JSON, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| json | <code>\*</code> | the input data. Can be either a string, a json object, or a url pointing to JSON data. |
| type | <code>String</code> | states the input format: "string", "json-object", or "url" |
| metadata | <code>Object</code> | optional - an object containing the author, name of the file, and date modified |
| metadata.fileName | <code>String</code> | optional - the name of the file |
| metadata.author | <code>String</code> | optional - the author of the file |
| metadata.date | <code>String</code> | optional - the date when the file was last modified |
| callback | <code>function</code> | optional - state a callback function to be executed once the url data is loaded. |

<a name="module_jsondiff.setRight"></a>

### jsondiff.setRight(json, type, metadata, callback) ⇒
Sets the second file to run in the diff tool. Corresponds to the right editor on the interface.
Accepts JSON strings, JSON objects, or urls that lead to json data.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: returns true if the input JSON is valid JSON, false otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| json | <code>\*</code> | the input data. Can be either a string, a json object, or a url pointing to JSON data. |
| type | <code>String</code> | states the input format: "string", "json-object", or "url" |
| metadata | <code>Object</code> | optional - an object containing the author, name of the file, and date modified |
| metadata.fileName | <code>String</code> | optional - the name of the file |
| metadata.author | <code>String</code> | optional - the author of the file |
| metadata.date | <code>String</code> | optional - the date when the file was last modified |
| callback | <code>function</code> | optional - state a callback function to be executed once the url data is loaded. |

<a name="module_jsondiff.discardChanges"></a>

### jsondiff.discardChanges() ⇒
Removes any both editors to their original state, removing any changes made.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: returns the result of the diff  
<a name="module_jsondiff.runDiff"></a>

### jsondiff.runDiff(json_string_a, json_string_b) ⇒
Runs the diff algorithm on the two current JSON inputs. 
Can optionally specify JSON string inputs instead of calling setLeft() and setRight() beforehand.
If your inputs are not Strings, use setLeft() and setRight() to set the inputs instead.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: returns the result of the diff, returns false if either JSON_A or JSON_B is invalid.  

| Param | Type | Description |
| --- | --- | --- |
| json_string_a | <code>String</code> | optional - a JSON string to be compared (not a JSON object) |
| json_string_b | <code>String</code> | optional - a JSON string to be compared (not a JSON object) |

<a name="module_jsondiff.rerunDiff"></a>

### jsondiff.rerunDiff() ⇒
Reruns the diff on the current contents of the text editors. 
Should be called after merging changes and/or editing the text directly.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the results of the diff, false if any of the JSON is invalid.  
<a name="module_jsondiff.exportLeft"></a>

### jsondiff.exportLeft(prettyPrint) ⇒
Exports the current contents of the left editor, including any changes made.
Output is minified by default, but can be pretty printed using the input prettyPrint.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the current contents of the left editor as a string. Returns false if the JSON is invalid.  

| Param | Type | Description |
| --- | --- | --- |
| prettyPrint | <code>Boolean</code> | optional parameter to pretty print the result. False by default. |

<a name="module_jsondiff.exportRight"></a>

### jsondiff.exportRight(prettyPrint) ⇒
Exports the current contents of the right editor, including any changes made.
Output is minified by default, but can be pretty printed using the input prettyPrint.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the current contents of the right editor as a string. Returns false if the JSON is invalid.  

| Param | Type | Description |
| --- | --- | --- |
| prettyPrint | <code>Boolean</code> | optional parameter to pretty print the result. False by default. |

<a name="module_jsondiff.expandAll"></a>

### jsondiff.expandAll()
Expands all folded segments of code in both editors.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.foldUnmarkedSections"></a>

### jsondiff.foldUnmarkedSections()
Folds all segments of code on both editors that do not contain changes, or segments where any changes have been ignored.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.hideSameLines"></a>

### jsondiff.hideSameLines()
Hides any lines without changes in both editors.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.setOneWayDiff"></a>

### jsondiff.setOneWayDiff(isOneWay) ⇒
Allows the user to enable / disable one-way-diffs.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: returns config.ONE_WAY_DIFF if successful, otherwise returns null.  

| Param | Type | Description |
| --- | --- | --- |
| isOneWay | <code>boolean</code> | true to enable, false to disable. |

<a name="module_jsondiff.addIgnoredAttr"></a>

### jsondiff.addIgnoredAttr(ignoreAttr) ⇒
Allows the user to add attributes by name so the diff tool can ignore changes on a specified set of keys.
Can input either a string to add one attribute, or an array of strings to insert multiple values.
Ignores non-Strings or array entries that are not strings.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the updated config.IGNORE_ATTR, false if ignoreAttr is not an Array or String  

| Param | Type | Description |
| --- | --- | --- |
| ignoreAttr | <code>Array</code> \| <code>String</code> | an array of Strings containing the names of multiple properties, or a single String corresponding to one property. |

<a name="module_jsondiff.addEmbeddedAttr"></a>

### jsondiff.addEmbeddedAttr(embedAttr) ⇒
Allows the user to add attributes to see the diffs on properties that contain escaped JSON strings.
Can input either a string to add one attribute, or an array of strings to insert multiple values.
Ignores non-Strings or array entries that are not strings.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the updated config.EMBED_JSON_ATTR, false if embedAttr is not an Array or String  

| Param | Type | Description |
| --- | --- | --- |
| embedAttr | <code>Array</code> \| <code>String</code> | an array of Strings containing the names of multiple properties, or a single String corresponding to one property. |

<a name="module_jsondiff.addSortingKeys"></a>

### jsondiff.addSortingKeys(keyAttr) ⇒
Allows the user to specify certain attributes as "keys" in order to ignore the order of arrays when performing a diff.
Because the property names are global, the underlying data structure is an array - the diff algorithm will attempt to check any array for these keys,
choosing the first key that is present in every element, prioritizing keys towards the start of the array.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the updated config.SORTING_KEYS, false if keyAttr is not an Array or String  

| Param | Type | Description |
| --- | --- | --- |
| keyAttr | <code>Array</code> \| <code>String</code> | an array of Strings containing the names of multiple properties, or a single String corresponding to one property. |

<a name="module_jsondiff.removeIgnoredAttr"></a>

### jsondiff.removeIgnoredAttr(prop) ⇒
Removes an element from the set of ignored property keys.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the updated config.IGNORE_ATTR, or false if the input was invalid.  

| Param | Type | Description |
| --- | --- | --- |
| prop | <code>String</code> | the property name to remove |

<a name="module_jsondiff.removeEmbeddedAttr"></a>

### jsondiff.removeEmbeddedAttr(prop) ⇒
Removes an element from the set of embedded JSON property keys.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the updated config.EMBEDDED_JSON_ATTR, or false if the input was invalid.  

| Param | Type | Description |
| --- | --- | --- |
| prop | <code>String</code> | the property name to remove |

<a name="module_jsondiff.removeSortingKey"></a>

### jsondiff.removeSortingKey(prop) ⇒
Removes an element from the array of sorting keys.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
**Returns**: the updated config.SORTING_KEYS, or false if the input was invalid.  

| Param | Type | Description |
| --- | --- | --- |
| prop | <code>String</code> | the property name to remove |

<a name="module_jsondiff.getIgnoredAttr"></a>

### jsondiff.getIgnoredAttr()
Getter function for ignored property keys.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.getEmbeddedAttr"></a>

### jsondiff.getEmbeddedAttr()
Getter function for properties to check for escaped JSON strings.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.getSortingKeys"></a>

### jsondiff.getSortingKeys()
Getter function for the array of sorting keys.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.hideSidebar"></a>

### jsondiff.hideSidebar()
Hides the left sidebar. Also see showSideBar().

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.showSidebar"></a>

### jsondiff.showSidebar()
Shows the left sidebar, if it was hidden by hideSideBar().

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.hideTopbar"></a>

### jsondiff.hideTopbar()
Hides the topbar. Also see showTopbar().

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.showTopbar"></a>

### jsondiff.showTopbar()
Shows the topbar, if it was hidden by hideTopbar().

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.disableMerging"></a>

### jsondiff.disableMerging()
Disables merging using the arrow keys. Can only be used while in diff mode (markers are showing)
This only works when called after jsondiff.runDiff(), because jsondiff.runDiff() adds event handlers for merging.

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
<a name="module_jsondiff.enableMerging"></a>

### jsondiff.enableMerging()
Enables merging using the arrow keys. Can only be used while in diff mode (markers are showing)

**Kind**: static method of [<code>jsondiff</code>](#module_jsondiff)  
