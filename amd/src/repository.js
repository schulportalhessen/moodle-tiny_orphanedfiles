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
 * Tiny orphanedfiles plugin for Moodle.
 *
 * @module     tiny_orphanedfiles/plugin
 * @copyright  2023 Andreas Siebel <andreas.siebel@schulportal.hessen.de>
 * @copyright  2023 Andreas Schenkel <andreas.schenkel@schulportal.hessen.de>
 * @author     2023 Andreas Siebel <andreas.siebel@schulportal.hessen.de>
 * @author     2023 Andreas Schenkel <andreas.schenkel@schulportal.hessen.de>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';

/**
 * Returns a list of all draftfiles.
 *
 * @param {int} draftItemId Draftitem-Id of editor
 * @returns {*}
 */
export const getAllDraftFiles = (draftItemId) => Ajax.call([{
    methodname: 'tiny_orphanedfiles_getalldraftfiles',
    // Args is an array, so we need a multiple_structure
    args: {
        draftItemId: draftItemId,
    }
}])[0];

/**
 * Deletes a list of files.
 *
 * @param {int} draftItemId Draftitem-Id of editor
 * @param {array} files a list of files with the structure [(filepath1, filename1), (filepath2, filename2)...
 * @returns {*}
 */
export const deleteDraftFiles = (draftItemId, files) => Ajax.call([{
    methodname: 'tiny_orphanedfiles_deletedraftfiles',
    // Args is an array, so we need a multiple_structure
    args: {
        draftItemId: draftItemId,
        files: files
    }
}])[0];