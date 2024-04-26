/**
 *
 * @param {string} tableID
 */
export const init = (tableID) => {
   registerListeners(tableID);
};

const registerListeners = (tableID) => {
   const table = document.getElementById(tableID);
   const headerCells = table.querySelectorAll('thead th');

   headerCells.forEach((cell, index) => {
      // Add listener for columns from index=3.
      const sortable = cell.getAttribute("data-sortable") || 'false';
      if (sortable == 'true') {
         cell.addEventListener('click', () => {
            sortTable(tableID, index);
         });
      }
   });
};

/**
 *
 * @param {string} tableID The id of the table which should be sorted.
 * @param {number} column The column by which should be sorted
 */
const sortTable = (tableID, column) => {
   const table = document.getElementById(tableID);
   const rows = Array.from(table.getElementsByTagName("tr"));
   rows.shift(); // Remove the header row from sorting
   const sortOrder = table.rows[0].cells[column].getAttribute("data-sort-order") || 'asc';

   rows.sort(function(a, b) {
      const textA = a.getElementsByTagName("td")[column].getAttribute('data-sort');
      const textB = b.getElementsByTagName("td")[column].getAttribute('data-sort');

      if (sortOrder === "desc") {
         if (!isNaN(textA) && !isNaN(textB)) {
            return Number(textA) - Number(textB);
         } else {
            return textA.localeCompare(textB);
         }
      } else {
         if (!isNaN(textA) && !isNaN(textB)) {
            return Number(textB) - Number(textA);
         } else {
            return textB.localeCompare(textA);
         }
      }
   });

   // Remove body of table to clean up the table.
   const tbody = table.getElementsByTagName("tbody")[0];

   // Remove all asc or desc in data-sort-order of each column so that only ONE column will be marked as sorted.
   for (let columnIndex = 0; columnIndex < table.rows[0].cells.length; columnIndex++) {
      const columnHeader = table.rows[0].cells[columnIndex];
      columnHeader.setAttribute("data-sort-order", "");
   }

   table.rows[0].cells[column].setAttribute("data-sort-order", sortOrder === 'asc' ? 'desc' : 'asc');
   tbody.innerHTML = "";

   // Insert sorted rows
   rows.forEach(function(row) {
      tbody.appendChild(row);
   });
};
