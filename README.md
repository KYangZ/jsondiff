# jsondiff
This is a JSON Diff Tool written for Q2 - Cloud Lending, Inc. by Kory Yang.

![What the JSON Diff Tool looks like](/demos/overview.png)

## Features
* Multiple Input Formats - supports .json and .txt files, or you can paste text into the page and run the diff directly.
* JSON Validation - the two editors have syntax highlighting and error messages for JSON, and will also parse uploaded files to ensure the inputs are valid.
* Color Coded Changes - additions are color coded as green, deletions as red, modifications as yellow, and merges are blue.
* Change Navigation - allows users to jump to the next / previous change using the up / down arrow keys.
* Merging Changes - allows merging of changes going in either direction, using the left / right arrow keys. Undoing merges is also supported.
* Ignoring Attributes - this tool allows you to ignore differences on specific JSON properties by name.
* Expanding Escaped JSON - this tool also allows you to view the difference in JSON that is in the form of an escaped string, by temporarily calling JSON.parse() on the escaped section
* Array Key Comparison - this tool also allows comparison of arrays of objects idependent of order, allowing one to essentially treat arrays of objects as sets.
* Export Left/Right - allows for downloading the current contents of the left or right editor as a text file.
* Smart Viewing Options - by default, the tool collapses all objects that are identical. There are also options to hide all identical lines, or to show all lines.
* Inline Editing - features an "editing mode" that allows the user to make changes to the existing file, and then rerun the diff.
* Reset All Changes - stores the original file, allowing you to discard all changes.

## Usage Guide
Prerequisites:
* Install and setup Node.js [ https://nodejs.org/en/download/ ]

#### Follow these steps to get started:
1. Clone jsondiff to create your local repo.
2. Open Command Prompt(or Terminal) and go to the project folder. Run "npm install".
3. Run "npm run start" when developing the application. This creates start the dev-server with live reloading. 
3. Run "npm run build" to generate a minified .js file that can be embedded in your projects.
Check package.json file > scripts section for other commands.

Read docs.md for documentation
