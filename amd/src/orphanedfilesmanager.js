// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Storage helper for the Moodle Tiny orphanedfiles plugin.
 *
 * @module     tiny_orphanedfiles/plugin
 * @copyright  2023 Andreas Siebel <andreas.siebel@schulportal.hessen.de>
 * @copyright  2023 Andreas Schenkel <andreas.schenkel@schulportal.hessen.de>
 * @author     2023 Andreas Siebel <andreas.siebel@schulportal.hessen.de>
 * @author     2023 Andreas Schenkel <andreas.schenkel@schulportal.hessen.de>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import * as Options from "./options";
import Templates from 'core/templates';
import {exception as displayException} from 'core/notification';
import {deleteDraftFiles, getAllDraftFiles} from "./repository";
//import {getShowReferencecount} from "./options";

/**
 * OrphanedfilesManager is created in main.js
 */
export default class OrphanedfilesManager {
    constructor(params, editor) {
        this.editor = editor;
        this.elementId = editor.id;
        this.editorContainer = editor.editorContainer;
        // Read from options.js
        this.draftItemId = params.draftItemId;
        this.userContextId = params.userContextId; // user context from moodle
        // Read websitesetting from options.js
        this.showReferenceCountEnabled = params.showReferenceCountEnabled;
        this.orphanedFilesCounterOnly = params.orphanedFilesCounterOnly;
        this.wwwRoot = params.wwwRoot;
        this.baseUrl = {};
        this.allFilesSet = new Set(); // files
        this.usedFilesSet = new Set(); // Set of file strings(!)
        this.orphanedFilesSet = new Set(); // files
        this.deletedFilesSet = new Set(); // files
        this.oldOrphanedFilesSet = new Set();
        this.changed = false;
    }

    /**
     * Creates the wrapper for the Orphaned files area.
     * The wrapper is a `div`-Element with id js-orphaned-wrapper-[elementid]
     * and class js-orphaned-wrapper
     */
    createOrphanedArea() {
        this.orphanedArea = document.createElement('div');
        this.orphanedArea.id = 'tiny-js-orphaned-wrapper-' + this.elementId;
        this.orphanedArea.className = 'tiny-orphaned-js-orphaned-wrapper';
        this.orphanedArea.className = 'tiny-orphaned';
        this.editorContainer.after(this.orphanedArea);

        this.headerDiv = document.createElement('div');
        this.headerDiv.id = `has-orphaned-files-${this.elementId}`;
        this.headerDiv.classList.add(`hidden`);
        this.headerDiv.innerHTML = '⟳ ... LOAD "orphaned files indicator", 8, 1';
        this.orphanedArea.appendChild(this.headerDiv);

        this.bodyDiv = document.createElement('div');
        this.bodyDiv.id = `orphaned-files-${this.elementId}`;
        // Template will be inserted into this DOM element.
        this.bodyDiv.classList.add(`orphaned-files-content`);
        this.bodyDiv.classList.add(`orphaned-files-content-${this.elementId}`);
        this.bodyDiv.classList.add(`hidden`);
        this.orphanedArea.appendChild(this.bodyDiv);

    }

    updateAllFiles() {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await this.getAllDraftFilesInSubdirectories();
                this.allFilesSet = new Set([...result]); // generate set from resultArray
                resolve(result); // Erfolgreich aufgelöst
            } catch (error) {
                reject(error); // Bei einem Fehler abgelehnt
            }
        });
    }

    /**
     * Returns the used Files as array
     * Update used Files is called *after* UpdateAllFiles
     *
     * @returns {array}
     */
    updateUsedFiles() {
        return new Promise(async (resolve) => {
            const editorContent = this.editor.getContent();
            const baseUrl = `${this.wwwRoot}/draftfile.php/${this.userContextId}/user/draft/${this.draftItemId}/`;
            const pattern = new RegExp("[\"']" + baseUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') +
                "(?<filename>.+?)[\\?\"']", 'gm');
            //Get all used files in editor by searching editor content for filepatterns
            const _usedFilesSet = new Set([...editorContent.matchAll(pattern)].map((match) => '/' +
                decodeURIComponent(match.groups.filename)));
            let i = 1;
            // Get *files* from filename and filepath strings in editor (by filtering allFilesSet
            for (const file of this.allFilesSet) {
                file.className = 'file-' + i;
                // Add individual information about the file e.g. dimensions, formated last modified date, ...
                if (file.image_width && file.image_height ) {
                    file.dimensions = `${file.image_width}✕${file.image_height}`;
                } else {
                    file.dimensions = '';
                }
                const newDate = new Date(file.datemodified * 1000);
                const dateString = newDate.toLocaleString();
                file.datemodified_formated = dateString;

                if (_usedFilesSet.has(file.filepath + file.filename)) {
                    this.usedFilesSet.add(file);
                }
                i = i + 1;
            }
            resolve(); // Erfolgreich aufgelöst
        });
    }

    /**
     * Compares to allFiles and usedFiles to find all orphaned files
     *
     * @returns {*[]}
     */
    updateOrphanedFiles() {

        return new Promise((resolve) => {
            this.oldOrphanedFilesSet = this.orphanedFilesSet;
            this.orphanedFilesSet = new Set([...this.allFilesSet].filter(element => !this.usedFilesSet.has(element)));
            // ToDo: Compare the sets if there are changes and if update the rendering is needed.
            // console.log("oldOrphanedFilesSet" , this.oldOrphanedFilesSet);
            // console.log("orphanedFilesSet" , this.orphanedFilesSet);
            const setsareequal = this.orphanedFilesSet.size ===  this.oldOrphanedFilesSet.size;
            if (!setsareequal) {
                this.changed = true;
            } else {
                this.changed = false;
            }
            resolve();
        });
    }

    /**
     * Gets all draft files in editor context in a given directory and all
     * subdirectories.
     *
     * @returns {string[]} A list of files
     */
    async getAllDraftFilesInSubdirectories() {
        const draftItemId = Options.getDraftItemId(this.editor);
        const fileObject = await getAllDraftFiles(draftItemId);
        return JSON.parse(fileObject.files);
    }

    deleteSelectedFiles(files) {
        const draftItemId = Options.getDraftItemId(this.editor);
        // call deleteDraftFiles from repository.js
        deleteDraftFiles(draftItemId, files).then(() => {
            // Mark deleted files and render body.
            for (const file of files) {
                this.deletedFilesSet.add(this._get_file_identifier(file));
            }
            this.update();
        });
    }

    update() {
        this.updateAllFiles().then(() => {
            return this.updateUsedFiles();
        }).then(() => {
            return this.updateOrphanedFiles();
        }).then(() => {
            if (!this.changed) {
            } else {
                // Only render Body if orphaned files changed
                this.bodyDiv.classList.remove('hidden');
                this.renderBody();
            }
        });
        this.changed = false;
    }

    renderBody() {
        const numberoforphanedfiles = this.orphanedFilesSet.size;
        if (numberoforphanedfiles !== 0) {
            var orphanedfilescounteronly = this.orphanedFilesCounterOnly;
            if (orphanedfilescounteronly) {
                const context = {
                    // Data to be rendered
                    numberoforphanedfiles: numberoforphanedfiles,
                };
                Templates.renderForPromise('tiny_orphanedfiles/orphanedfilescounteronly', context).then(({html, js}) => {
                    Templates.replaceNodeContents(`.orphaned-files-content-${this.elementId}`, html, js);
                });
            } else {
                const websitesettings = Array();
                // Just for documentation purpose: We can access settings by two different ways.
                // We can access Options-Object or the data stored during construction.
                websitesettings['showreferencecountenabled'] = this.showReferenceCountEnabled;
                websitesettings['orphanedfilescounteronly'] = this.orphanedFilesCounterOnly;
                const context = {
                    // Data to be rendered
                    orphanedFiles: Array.from(this.orphanedFilesSet),
                    numberoforphanedfiles: numberoforphanedfiles,
                    websitesettings: websitesettings,
                };
                // Display Orphaned-Files-Table
                Templates.renderForPromise('tiny_orphanedfiles/orphanedfiles', context).then(({html, js}) => {
                    Templates.replaceNodeContents(`.orphaned-files-content-${this.elementId}`, html, js);
                }).then(() => {
                    // Add Listener to dynamic items in Orphaned-Files-Table e.g. Delete Buttons
                    return this.registerListener(Array.from(this.orphanedFilesSet));
                }).catch((error) => displayException(error));
            }
        } else {
            // In case of an undo the numberoforphanedfiles might get 0 during a table with orphand file is visible.
            // To be cheap in this case we do NOT remove the table but set table like in all other cases where
            // numberoforphanedfiles = 0 to hidden.
            this.bodyDiv.classList.add('hidden');
        }
        return null;
    }

    /**
     * Get the file identifier with the correct draftidemid tha is used by the editor.
     *
     * @param {array} file The file we need the unique fileidentifier from.
     * @returns {string}
     * @private
     */
    _get_file_identifier(file) {
        const draftItemId = Options.getDraftItemId(this.editor);
        return draftItemId + '-' + file['filepath'] + '-' + file['filename'];
    }

    /**
     * Add Listener to dynamic items in Orphaned-Files-Table e.g. Delete Buttons
     * @param {array} files The list of files which are display in Orphaned Files Table.
     */
    registerListener(files) {
        files.forEach((file) => {
            const deleteButton = document.querySelector(`#orphaned-files-${this.elementId} .orphaned-row.${file.className} span`);
            deleteButton.addEventListener("click", () => {
                this.deleteSelectedFiles([{'filepath': file.filepath, 'filename': file.filename}]);
            });
        });
        const deleteSelected = document.querySelector(`#orphaned-files-${this.elementId} button.deleteselected`);
        let selectedFiles = [];
        deleteSelected.addEventListener("click", () => {
            for (const file of files) {
                const select = document.querySelector(`#orphaned-files-${this.elementId} .orphaned-row.${file.className} input`);
                if (select.checked) {
                    selectedFiles.push([file]);
                }
            }
            this.deleteSelectedFiles(selectedFiles);
        });
    }

}
